import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  IOPortOpenCodeClient,
  normalizeOpenCodeLoopbackOrigin,
  OpenCodeClientError,
  OpenCodeSseDecoder,
} from "./index";

describe("packaged OpenCode client", () => {
  it("pairs only with a password-protected loopback origin", async () => {
    assert.equal(
      normalizeOpenCodeLoopbackOrigin("http://localhost:4096/"),
      "http://localhost:4096",
    );
    assert.throws(
      () => normalizeOpenCodeLoopbackOrigin("https://example.com"),
      OpenCodeClientError,
    );
    assert.throws(
      () => new IOPortOpenCodeClient({ origin: "http://localhost:4096", password: "short" }),
      /at least 16/,
    );
    const client = new IOPortOpenCodeClient({
      origin: "http://127.0.0.1:4096",
      password: "a-strong-local-password",
      fetch: async (_input, init) => {
        assert.match(String(new Headers(init?.headers).get("Authorization")), /^Basic /);
        return Response.json({ version: "1.2.3" });
      },
    });
    const pairing = await client.pair();
    assert.equal(pairing.serverVersion, "1.2.3");
    assert.equal(pairing.credentialFingerprint.length, 12);
    assert.equal("password" in pairing, false);
  });

  it("bounds an abort-ignoring fetch and permits a separate later request", async () => {
    const calls: Array<{ url: string; signal: AbortSignal | null | undefined }> = [];
    const client = new IOPortOpenCodeClient({
      origin: "http://127.0.0.1:4096",
      password: "a-strong-local-password",
      requestTimeoutMs: 20,
      fetch: async (input, init) => {
        calls.push({ url: String(input), signal: init?.signal });
        if (calls.length === 1) return new Promise<Response>(() => {});
        return Response.json(true);
      },
    });
    await assert.rejects(client.abortSession("root"), /safety timeout/);
    assert.equal(calls.length, 1, "a timed-out mutation must not retry automatically");
    assert.equal(calls[0].signal?.aborted, true);
    assert.equal(await client.abortSession("root"), true);
    assert.equal(calls.length, 2);
    assert.notEqual(calls[0].signal, calls[1].signal);
    assert.equal(calls[1].signal?.aborted, false);
  });

  it(
    "cancels a response arriving after the deadline without replaying a prompt",
    { timeout: 1_000 },
    async () => {
      let deliver!: (value: Response) => void;
      let cancelled!: () => void;
      const cancellation = new Promise<void>((resolve) => {
        cancelled = resolve;
      });
      const calls: Array<{ url: string; body: string | null }> = [];
      const client = new IOPortOpenCodeClient({
        origin: "http://127.0.0.1:4096",
        password: "a-strong-local-password",
        requestTimeoutMs: 20,
        fetch: async (input, init) => {
          calls.push({
            url: String(input),
            body: typeof init?.body === "string" ? init.body : null,
          });
          return new Promise<Response>((resolve) => {
            deliver = resolve;
          });
        },
      });
      await assert.rejects(
        client.continuePrompt("original-session", "original prompt"),
        /safety timeout/,
      );
      const response = new Response(
        new ReadableStream<Uint8Array>({
          cancel() {
            cancelled();
          },
        }),
      );
      deliver(response);
      await cancellation;
      assert.deepEqual(calls, [
        {
          url: "http://127.0.0.1:4096/session/original-session/message",
          body: JSON.stringify({ parts: [{ type: "text", text: "original prompt" }] }),
        },
      ]);
      assert.equal(response.body?.locked, false);
    },
  );

  it("includes stalled body reads in the deadline and releases their reader", async () => {
    let cancelled = 0;
    const response = new Response(
      new ReadableStream<Uint8Array>({
        cancel() {
          cancelled += 1;
          // Even an underlying cancellation that never acknowledges must not
          // retain the caller or the response's reader lock.
          return new Promise<void>(() => {});
        },
      }),
    );
    const client = new IOPortOpenCodeClient({
      origin: "http://127.0.0.1:4096",
      password: "a-strong-local-password",
      requestTimeoutMs: 20,
      fetch: async () => response,
    });
    await assert.rejects(client.abortSession("root"), /safety timeout/);
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    assert.equal(cancelled, 1);
    assert.equal(response.body?.locked, false);
  });

  it("propagates caller cancellation even when fetch ignores abort", async () => {
    const controller = new AbortController();
    let signal: AbortSignal | null | undefined;
    let calls = 0;
    const client = new IOPortOpenCodeClient({
      origin: "http://127.0.0.1:4096",
      password: "a-strong-local-password",
      requestTimeoutMs: 500,
      fetch: async (_input, init) => {
        calls += 1;
        signal = init?.signal;
        return new Promise<Response>(() => {});
      },
    });
    const pending = client.continuePrompt("root", "Continue", controller.signal);
    const reason = new DOMException("Member cancelled", "AbortError");
    controller.abort(reason);
    await assert.rejects(pending, (error) => error === reason);
    assert.equal(signal?.aborted, true);
    await assert.rejects(
      client.continuePrompt("root", "Continue", controller.signal),
      (error) => error === reason,
    );
    assert.equal(calls, 1, "an already-aborted request must not reach fetch");
  });

  it("clears a completed request deadline instead of aborting its signal later", async () => {
    let signal: AbortSignal | null | undefined;
    const client = new IOPortOpenCodeClient({
      origin: "http://127.0.0.1:4096",
      password: "a-strong-local-password",
      requestTimeoutMs: 20,
      fetch: async (_input, init) => {
        signal = init?.signal;
        return Response.json(true);
      },
    });
    assert.equal(await client.abortSession("root"), true);
    await new Promise<void>((resolve) => setTimeout(resolve, 30));
    assert.equal(signal?.aborted, false);
  });

  it("decodes split SSE frames and rejects an unconfirmed permission reply", async () => {
    const decoder = new OpenCodeSseDecoder();
    assert.deepEqual(decoder.feed('id: evt_1\ndata: {"type":"session.'), []);
    assert.deepEqual(decoder.feed('status","properties":{"sessionID":"ses_1"}}\n\n'), [
      {
        id: "evt_1",
        type: "session.status",
        properties: { sessionID: "ses_1" },
      },
    ]);
    const client = new IOPortOpenCodeClient({
      origin: "http://127.0.0.1:4096",
      password: "a-strong-local-password",
      fetch: async () => Response.json(true),
    });
    await assert.rejects(
      client.replyPermission({
        request: {
          id: "permission-1",
          sessionId: "session-1",
          permission: "shell",
          patterns: [],
          metadata: {},
          risk: "high",
        },
        decision: "once",
        confirmationId: "another-permission",
      }),
      /not confirmed/,
    );
  });

  it("marks unknown permissions critical and rejects once without sending a reply", async () => {
    const writes: { response?: string }[] = [];
    const client = new IOPortOpenCodeClient({
      origin: "http://127.0.0.1:4096",
      password: "a-strong-local-password",
      fetch: async (_input, init) => {
        if (init?.method === "POST") {
          writes.push(JSON.parse(String(init.body)));
          return Response.json(true);
        }
        return Response.json([
          { id: "unknown-1", sessionID: "session-1", permission: "read.execute", patterns: [] },
          { id: "known-read", sessionID: "session-1", permission: "grep", patterns: [] },
          { id: "known-edit", sessionID: "session-1", permission: "apply_patch", patterns: [] },
          { id: "safety-guard", sessionID: "session-1", permission: "doom_loop", patterns: [] },
        ]);
      },
    });
    const permissions = await client.listPendingPermissions("session-1");
    assert.deepEqual(
      permissions.map(({ risk }) => risk),
      ["critical", "low", "high", "critical"],
    );
    await assert.rejects(
      client.replyPermission({
        request: { ...permissions[0], risk: "low" }, // caller cannot downgrade an unknown name
        decision: "once",
        confirmationId: permissions[0].id,
      }),
      /not eligible/,
    );
    await assert.rejects(
      client.replyPermission({
        request: permissions[3],
        decision: "once",
        confirmationId: permissions[3].id,
      }),
      /not eligible/,
    );
    assert.equal(writes.length, 0);
    await client.replyPermission({
      request: permissions[0],
      decision: "reject",
      confirmationId: permissions[0].id,
    });
    assert.deepEqual(writes, [{ response: "reject", remember: false }]);
    await client.replyPermission({
      request: permissions[1],
      decision: "once",
      confirmationId: permissions[1].id,
    });
    assert.equal(writes.at(-1)?.response, "once");
  });

  it("loads bounded task trees, full diffs and continued prompts", async () => {
    const client = new IOPortOpenCodeClient({
      origin: "http://127.0.0.1:4096",
      password: "a-strong-local-password",
      fetch: async (input) => {
        const url = String(input);
        if (url.endsWith("/session/root/message")) {
          return Response.json({ parts: [{ type: "text", text: "continued" }] });
        }
        if (url.endsWith("/session/status")) return Response.json({ root: { type: "idle" } });
        if (url.endsWith("/session/root/todo")) {
          return Response.json([{ id: "todo-1", content: "Check", status: "pending" }]);
        }
        if (url.endsWith("/session/root/children")) return Response.json([]);
        if (url.endsWith("/session/root/diff")) {
          return Response.json([
            { file: "src/a.ts", before: "old", after: "new", additions: 1, deletions: 1 },
          ]);
        }
        return Response.json({ id: "root", title: "Root" });
      },
    });
    const tree = await client.getTaskTree("root");
    assert.equal(tree.status, "idle");
    assert.equal(tree.todos[0].content, "Check");
    const diffs = await client.getFullDiffs("root");
    assert.equal(diffs[0].after, "new");
    const continued = await client.continuePrompt("root", "Continue safely");
    assert.equal(continued.content, "continued");
  });

  it("negotiates capabilities and requires positive mutation acknowledgements", async () => {
    const calls: Array<{ url: string; body: string | null }> = [];
    const client = new IOPortOpenCodeClient({
      origin: "http://127.0.0.1:4096",
      password: "a-strong-local-password",
      fetch: async (input, init) => {
        const url = String(input);
        calls.push({ url, body: typeof init?.body === "string" ? init.body : null });
        if (url.endsWith("/doc")) {
          return Response.json({
            openapi: "3.1.0",
            paths: {
              "/session": { get: {}, post: {} },
              "/global/event": { get: {} },
              "/session/{id}/message": { post: {} },
              "/session/{id}/children": { get: {} },
              "/session/{id}/todo": { get: {} },
              "/session/{id}/diff": { get: {} },
              "/session/{id}/permissions/{permissionID}": { post: {} },
              "/session/{id}/abort": { post: {} },
              "/session/{id}/fork": { post: {} },
              "/session/{id}/revert": { post: {} },
              "/session/{id}/unrevert": { post: {} },
              "/session/{id}/command": { post: {} },
            },
          });
        }
        if (url.endsWith("/session/root/fork")) {
          return Response.json({ id: "forked", parentID: "root", title: "Fork" });
        }
        if (url.includes("/session/root/message?limit=10")) {
          return Response.json([
            {
              info: { id: "message-1", role: "assistant", time: { created: 1_700_000_000_000 } },
              parts: [
                { id: "part-1", type: "text", text: "Done" },
                {
                  id: "part-2",
                  type: "tool",
                  tool: "shell",
                  state: { status: "completed", output: "tests passed" },
                },
              ],
            },
          ]);
        }
        return Response.json(true);
      },
    });

    const capabilities = await client.negotiateCapabilities();
    assert.equal(capabilities.openApiVersion, "3.1.0");
    assert.equal(capabilities.abort, true);
    assert.equal(capabilities.commands, true);
    assert.equal(await client.abortSession("root"), true);
    assert.deepEqual(await client.forkSession("root", "message-1"), {
      sessionId: "forked",
      parentSessionId: "root",
      title: "Fork",
    });
    const timeline = await client.getSessionTimeline("root", 10);
    assert.equal(timeline[0].parts[1].tool, "shell");
    assert.equal(timeline[0].parts[1].content, "tests passed");
    await client.revertSession("root", "message-1", "part-1");
    await client.restoreRevertedSession("root");
    assert.deepEqual(JSON.parse(calls.find((call) => call.url.endsWith("/fork"))?.body ?? "{}"), {
      messageID: "message-1",
    });
  });

  it("executes only an advertised command with an exact, one-time review", async () => {
    const calls: Array<{ url: string; body: string | null }> = [];
    const client = new IOPortOpenCodeClient({
      origin: "http://127.0.0.1:4096",
      password: "a-strong-local-password",
      fetch: async (input, init) => {
        const url = String(input);
        calls.push({ url, body: typeof init?.body === "string" ? init.body : null });
        if (url.endsWith("/session/root/command")) {
          return Response.json({
            info: { id: "message-1", role: "assistant" },
            parts: [{ type: "text", text: "Reviewed" }],
          });
        }
        if (url.endsWith("/command")) {
          return Response.json([
            {
              name: "review",
              description: "Review local changes",
              source: "command",
              agent: "plan",
              subtask: true,
            },
          ]);
        }
        if (url.endsWith("/agent")) {
          return Response.json([
            { name: "plan", description: "Read-only planner", mode: "primary" },
            { name: "hidden", hidden: true },
          ]);
        }
        return Response.json({});
      },
    });

    const review = await client.prepareReviewedCommand({
      sessionId: "root",
      command: "review",
      arguments: "branch",
      agent: "build",
    });
    assert.equal(review.agent, "plan");
    const result = await client.executeReviewedCommand({
      review,
      confirmationId: review.id,
    });
    assert.equal(result.content, "Reviewed");
    assert.deepEqual(
      JSON.parse(calls.find((call) => call.url.endsWith("/session/root/command"))?.body ?? "{}"),
      { command: "review", arguments: "branch", agent: "plan" },
    );
    await assert.rejects(
      client.executeReviewedCommand({ review, confirmationId: review.id }),
      /not confirmed/,
    );
    await assert.rejects(
      client.prepareReviewedCommand({
        sessionId: "root",
        command: "not-advertised",
        agent: "plan",
      }),
      /no longer in the daemon catalogue/,
    );
  });

  it("rejects a reviewed command when its exact fields are modified", async () => {
    const client = new IOPortOpenCodeClient({
      origin: "http://127.0.0.1:4096",
      password: "a-strong-local-password",
      fetch: async (input) =>
        String(input).endsWith("/command")
          ? Response.json([{ name: "review", agent: "plan" }])
          : Response.json([{ name: "plan" }]),
    });
    const review = await client.prepareReviewedCommand({
      sessionId: "root",
      command: "review",
    });
    await assert.rejects(
      client.executeReviewedCommand({
        review: { ...review, arguments: "changed after review" },
        confirmationId: review.id,
      }),
      /not confirmed/,
    );
  });

  it("fails closed when OpenCode does not acknowledge abort or revert", async () => {
    const client = new IOPortOpenCodeClient({
      origin: "http://127.0.0.1:4096",
      password: "a-strong-local-password",
      fetch: async () => Response.json(false),
    });
    await assert.rejects(client.abortSession("root"), /did not acknowledge/);
    await assert.rejects(client.revertSession("root", "message-1"), /did not acknowledge/);
    await assert.rejects(client.restoreRevertedSession("root"), /did not acknowledge/);
  });

  it("subscribes to the global SSE stream and scopes events to the requested session", async () => {
    const controller = new AbortController();
    const received: string[] = [];
    const client = new IOPortOpenCodeClient({
      origin: "http://127.0.0.1:4096",
      password: "a-strong-local-password",
      fetch: async (input, init) => {
        assert.equal(String(input), "http://127.0.0.1:4096/global/event");
        assert.equal(new Headers(init?.headers).get("Accept"), "text/event-stream");
        const payload =
          'data: {"type":"session.status","properties":{"sessionID":"another"}}\n\n' +
          'id: local-1\ndata: {"type":"session.idle","properties":{"sessionID":"root"}}\n\n';
        return new Response(payload, { headers: { "Content-Type": "text/event-stream" } });
      },
    });
    await client.subscribeSessionEvents({
      sessionId: "root",
      signal: controller.signal,
      onEvent: (event) => {
        received.push(event.type);
        controller.abort();
      },
    });
    assert.deepEqual(received, ["session.idle"]);
  });
});

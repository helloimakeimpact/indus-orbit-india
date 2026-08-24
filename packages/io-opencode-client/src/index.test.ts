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

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  inspectOpenCodeLocalSession,
  loadOpenCodeLocalBinding,
  normalizeOpenCodeOrigin,
  OpenCodeStoppedError,
  runOpenCodeSession,
  saveOpenCodeLocalBinding,
} from "./opencode";

describe("normalizeOpenCodeOrigin", () => {
  it("accepts only credential-free loopback root origins", () => {
    assert.equal(normalizeOpenCodeOrigin("http://127.0.0.1:4096/"), "http://127.0.0.1:4096");
    for (const value of [
      "https://127.0.0.1:4096",
      "http://user:pass@127.0.0.1:4096",
      "http://127.0.0.1:4096/session",
      "http://127.0.0.1:4096/?token=x",
      "http://example.com:4096",
    ]) {
      assert.throws(() => normalizeOpenCodeOrigin(value), /credential-free root HTTP origin/);
    }
  });
});

describe("local OpenCode continuity", { concurrency: false }, () => {
  it("stores only a validated device-local session binding", () => {
    const values = new Map<string, string>();
    const storage: Storage = {
      get length() {
        return values.size;
      },
      clear: () => values.clear(),
      getItem: (key: string) => values.get(key) ?? null,
      key: (index: number) => [...values.keys()][index] ?? null,
      removeItem: (key: string) => {
        values.delete(key);
      },
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
    };
    const binding = {
      durableSessionId: "018f7f5b-9c4c-4f1f-8b48-7b15108f1234",
      connectorOrigin: "http://127.0.0.1:4096/",
      sessionId: "local/session-one",
      serverVersion: "1.2.3",
      storedAt: "2026-08-21T00:00:00.000Z",
    };
    saveOpenCodeLocalBinding(storage, binding);
    assert.deepEqual(loadOpenCodeLocalBinding(storage, binding.durableSessionId), {
      ...binding,
      connectorOrigin: "http://127.0.0.1:4096",
    });
    assert.equal(loadOpenCodeLocalBinding(storage, "not-a-session"), null);
    assert.throws(
      () =>
        saveOpenCodeLocalBinding(storage, {
          ...binding,
          connectorOrigin: "https://remote.example",
        }),
      /binding is invalid/,
    );
  });

  it("reconnects to the exact local session and returns metadata only", async () => {
    const originalFetch = globalThis.fetch;
    const urls: string[] = [];
    globalThis.fetch = async (input) => {
      const url = String(input);
      urls.push(url);
      if (url.endsWith("/global/health")) return Response.json({ healthy: true, version: "2.0" });
      if (url.endsWith("/session/status")) {
        return Response.json({ "local/session-one": { type: "idle" } });
      }
      if (url.endsWith("/todo")) return Response.json([{ id: "todo-1" }]);
      if (url.endsWith("/diff")) return Response.json([{ file: "hidden locally" }]);
      return Response.json({ id: "local/session-one", title: "Local continuation" });
    };
    try {
      const result = await inspectOpenCodeLocalSession({
        binding: {
          durableSessionId: "018f7f5b-9c4c-4f1f-8b48-7b15108f1234",
          connectorOrigin: "http://127.0.0.1:4096",
          sessionId: "local/session-one",
          serverVersion: null,
          storedAt: "2026-08-21T00:00:00.000Z",
        },
        password: "",
      });
      assert.equal(result.status, "idle");
      assert.equal(result.todoCount, 1);
      assert.equal(result.changedFileCount, 1);
      assert.ok(urls.some((url) => url.includes("/session/local%2Fsession-one")));
      assert.equal("content" in result, false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe("runOpenCodeSession", { concurrency: false }, () => {
  it("validates responses and encodes the returned session identifier", async () => {
    const originalFetch = globalThis.fetch;
    const urls: string[] = [];
    const lifecycle: string[] = [];
    const metadata: string[] = [];
    globalThis.fetch = async (input) => {
      const url = String(input);
      urls.push(url);
      if (url.endsWith("/global/health")) return Response.json({ version: "1.2.3" });
      if (url.endsWith("/session")) return Response.json({ id: "session/one", title: "Local" });
      if (url.endsWith("/diff")) return Response.json([{ path: "src/app.ts" }]);
      return Response.json({ parts: [{ type: "text", text: "Completed" }] });
    };
    try {
      const result = await runOpenCodeSession({
        serverUrl: "http://localhost:4096",
        password: "",
        title: "I/O test",
        prompt: "Plan safely",
        onSessionCreated: async (session) => {
          lifecycle.push(`created:${session.sessionId}`);
        },
        onSessionSettled: async (session, state) => {
          lifecycle.push(`${state}:${session.sessionId}`);
        },
        onMetadataEvent: async (_session, event) => {
          metadata.push(event.type);
        },
      });
      assert.equal(urls[2], "http://localhost:4096/session/session%2Fone/message");
      assert.equal(result.connectorOrigin, "http://localhost:4096");
      assert.equal(result.content, "Completed");
      assert.equal(result.serverVersion, "1.2.3");
      assert.equal(result.changedFileCount, 1);
      assert.deepEqual(lifecycle, ["created:session/one", "completed:session/one"]);
      assert.deepEqual(metadata, ["runtime.connected", "prompt.accepted"]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("reports a failed durable lifecycle after local prompt rejection", async () => {
    const originalFetch = globalThis.fetch;
    const lifecycle: string[] = [];
    globalThis.fetch = async (input) => {
      const url = String(input);
      if (url.endsWith("/global/health")) return Response.json({ version: "1" });
      if (url.endsWith("/session")) return Response.json({ id: "session-failed" });
      if (url.endsWith("/abort")) return Response.json(true);
      return new Response("Rejected", { status: 500 });
    };
    try {
      await assert.rejects(
        runOpenCodeSession({
          serverUrl: "http://127.0.0.1:4096",
          password: "",
          title: "I/O test",
          prompt: "Plan safely",
          onSessionCreated: async () => {
            lifecycle.push("created");
          },
          onSessionSettled: async (_session, state) => {
            lifecycle.push(state);
          },
        }),
        /Rejected/,
      );
      assert.deepEqual(lifecycle, ["created", "failed"]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("reports a failed durable lifecycle when the prompt response is malformed", async () => {
    const originalFetch = globalThis.fetch;
    const lifecycle: string[] = [];
    globalThis.fetch = async (input) => {
      const url = String(input);
      if (url.endsWith("/global/health")) return Response.json({ version: "1" });
      if (url.endsWith("/session")) return Response.json({ id: "session-malformed" });
      if (url.endsWith("/abort")) return Response.json(true);
      return Response.json({ unexpected: true });
    };
    try {
      await assert.rejects(
        runOpenCodeSession({
          serverUrl: "http://127.0.0.1:4096",
          password: "",
          title: "I/O test",
          prompt: "Plan safely",
          onSessionCreated: async () => {
            lifecycle.push("created");
          },
          onSessionSettled: async (_session, state) => {
            lifecycle.push(state);
          },
        }),
        /invalid message payload/,
      );
      assert.deepEqual(lifecycle, ["created", "failed"]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("fails closed on an invalid session response", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input) =>
      String(input).endsWith("/global/health")
        ? Response.json({ version: "1" })
        : Response.json({ title: "Missing ID" });
    try {
      await assert.rejects(
        runOpenCodeSession({
          serverUrl: "http://127.0.0.1:4096",
          password: "",
          title: "I/O test",
          prompt: "Plan safely",
        }),
        /invalid session identifier/,
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("records a stopped lifecycle when the member cancels an in-flight prompt", async () => {
    const originalFetch = globalThis.fetch;
    const controller = new AbortController();
    const lifecycle: string[] = [];
    let abortCalled = false;
    let promptStarted!: () => void;
    const promptRequestStarted = new Promise<void>((resolve) => {
      promptStarted = resolve;
    });
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      if (url.endsWith("/global/health")) return Response.json({ version: "1" });
      if (url.endsWith("/session")) return Response.json({ id: "session-stopped" });
      if (url.endsWith("/abort")) {
        abortCalled = true;
        return Response.json(true);
      }
      promptStarted();
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () => reject(new DOMException("Stopped", "AbortError")),
          { once: true },
        );
      });
    };
    try {
      const run = runOpenCodeSession({
        serverUrl: "http://127.0.0.1:4096",
        password: "",
        title: "I/O test",
        prompt: "Plan safely",
        signal: controller.signal,
        onSessionCreated: async () => {
          lifecycle.push("created");
        },
        onSessionSettled: async (_session, state) => {
          lifecycle.push(state);
        },
      });
      await promptRequestStarted;
      controller.abort();
      await assert.rejects(run, OpenCodeStoppedError);
      assert.deepEqual(lifecycle, ["created", "stopped"]);
      assert.equal(abortCalled, true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("bounds local response size, input size, and request duration", async () => {
    const originalFetch = globalThis.fetch;
    let fetchCount = 0;
    globalThis.fetch = async (_input, init) => {
      fetchCount += 1;
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () => reject(new DOMException("Timed out", "AbortError")),
          { once: true },
        );
      });
    };
    try {
      await assert.rejects(
        runOpenCodeSession({
          serverUrl: "http://127.0.0.1:4096",
          password: "",
          title: "I/O test",
          prompt: "Plan safely",
          requestTimeoutMs: 5,
        }),
        /safety timeout/,
      );

      globalThis.fetch = async (_input, init) => {
        fetchCount += 1;
        return new Response(
          new ReadableStream({
            start(controller) {
              init?.signal?.addEventListener(
                "abort",
                () => controller.error(new DOMException("Timed out", "AbortError")),
                { once: true },
              );
            },
          }),
        );
      };
      await assert.rejects(
        runOpenCodeSession({
          serverUrl: "http://127.0.0.1:4096",
          password: "",
          title: "I/O test",
          prompt: "Plan safely",
          requestTimeoutMs: 5,
        }),
        /safety timeout/,
      );

      await assert.rejects(
        runOpenCodeSession({
          serverUrl: "http://127.0.0.1:4096",
          password: "",
          title: "I/O test",
          prompt: "x".repeat(24_001),
        }),
        /24,000 characters/,
      );
      assert.equal(fetchCount, 2);

      globalThis.fetch = async () =>
        new Response("{}", { headers: { "content-length": "1048577" } });
      await assert.rejects(
        runOpenCodeSession({
          serverUrl: "http://127.0.0.1:4096",
          password: "",
          title: "I/O test",
          prompt: "Plan safely",
        }),
        /1 MB safety limit/,
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

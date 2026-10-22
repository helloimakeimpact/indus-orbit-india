import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runEventDiscussionRequest, type EventDiscussionRequest } from "./event-discussion-request";
const owner = "97300000-0000-4000-8000-000000000001",
  other = "97300000-0000-4000-8000-000000000002",
  eventId = "97300000-0000-4000-8000-000000000011";
const request: EventDiscussionRequest = {
  name: "join_event_discussion",
  args: { _event_id: eventId, _expected_user_id: owner },
};
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
const code = (expected: string) => (cause: unknown) =>
  cause instanceof Error && (cause as Error & { code?: string }).code === expected;
describe("event discussion request boundary", () => {
  it("starts synchronously with an actual abort signal and accepts the current owner result", async () => {
    let started = false;
    const result = runEventDiscussionRequest(
      request,
      async (signal) => {
        started = true;
        assert.equal(signal.aborted, false);
        return "joined";
      },
      () => ({ owner, generation: 1 }),
      50,
    );
    assert.equal(started, true);
    assert.equal(await result, "joined");
  });
  it("does not send a stale account mutation or an anonymous request", async () => {
    let calls = 0;
    const start = async () => {
      calls += 1;
      return "unsafe";
    };
    await assert.rejects(
      runEventDiscussionRequest(request, start, () => ({ owner: other, generation: 1 }), 50),
      code("42501"),
    );
    await assert.rejects(
      runEventDiscussionRequest(
        { name: "list_my_community_chat_links" },
        start,
        () => ({ owner: null, generation: 1 }),
        50,
      ),
      code("42501"),
    );
    assert.equal(calls, 0);
  });
  it("rejects a late completion after an A-to-B-to-A transition", async () => {
    let account = { owner, generation: 1 };
    const pending = deferred<string>();
    const result = runEventDiscussionRequest(
      request,
      () => pending.promise,
      () => account,
      50,
    );
    account = { owner: other, generation: 2 };
    account = { owner, generation: 3 };
    pending.resolve("old membership");
    await assert.rejects(result, code("42501"));
  });
  it("aborts a hung RPC and releases the caller even when its transport ignores abort", async () => {
    let signal: AbortSignal | undefined;
    const pending = deferred<string>();
    await assert.rejects(
      runEventDiscussionRequest(
        request,
        (value) => {
          signal = value;
          return pending.promise;
        },
        () => ({ owner, generation: 1 }),
        10,
      ),
      code("NETWORK_TIMEOUT"),
    );
    assert.equal(signal?.aborted, true);
    pending.resolve("uncertain late commit");
    assert.equal(
      await runEventDiscussionRequest(
        request,
        async () => "explicit retry",
        () => ({ owner, generation: 1 }),
        50,
      ),
      "explicit retry",
    );
  });
  it("preserves an immediate authorization failure and rejects stale failures as an account change", async () => {
    const denied = Object.assign(new Error("Current membership revoked"), { code: "42501" });
    await assert.rejects(
      runEventDiscussionRequest(
        request,
        async () => {
          throw denied;
        },
        () => ({ owner, generation: 1 }),
        50,
      ),
      (cause) => cause === denied,
    );
    let account = { owner, generation: 1 };
    const pending = deferred<never>();
    const result = runEventDiscussionRequest(
      request,
      () => pending.promise,
      () => account,
      10,
    );
    account = { owner: other, generation: 2 };
    await assert.rejects(result, code("42501"));
  });
});

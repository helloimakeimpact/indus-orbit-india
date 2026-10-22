import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { boundedDirectMessageRequest } from "./direct-message-request";

const timedOut = (cause: unknown) =>
  cause instanceof Error && (cause as Error & { code?: string }).code === "NETWORK_TIMEOUT";

function pending<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

describe("bounded direct-message requests", () => {
  it("aborts a hung transport, settles the waiter, and allows a fresh retry", async () => {
    let firstSignal: AbortSignal | undefined;
    await assert.rejects(
      boundedDirectMessageRequest((signal) => {
        firstSignal = signal;
        return new Promise<never>((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(new Error("SDK aborted")), { once: true });
        });
      }, 15),
      timedOut,
    );
    assert.equal(firstSignal?.aborted, true);
    const result = await boundedDirectMessageRequest(async (signal) => {
      assert.notEqual(signal, firstSignal);
      assert.equal(signal.aborted, false);
      return "retry settled";
    }, 100);
    assert.equal(result, "retry settled");
  });

  it("settles even if the underlying Auth or fetch promise ignores abort", async () => {
    const late = pending<string>();
    let signal: AbortSignal | undefined;
    await assert.rejects(
      boundedDirectMessageRequest((value) => {
        signal = value;
        return late.promise;
      }, 15),
      timedOut,
    );
    assert.equal(signal?.aborted, true);
    // Late success is consumed without replacing the timeout or blocking retry.
    late.resolve("late identity");
    assert.equal(
      await boundedDirectMessageRequest(async () => "new identity", 100),
      "new identity",
    );
  });

  it("clears the timer after success rather than aborting a completed request", async () => {
    let signal: AbortSignal | undefined;
    const result = await boundedDirectMessageRequest(async (value) => {
      signal = value;
      return 42;
    }, 15);
    assert.equal(result, 42);
    // Let the original timeout window pass: completed requests must stay active.
    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.equal(signal?.aborted, false);
  });

  it("preserves an immediate transport failure and releases its timeout", async () => {
    const failure = Object.assign(new Error("Permission denied"), { code: "42501" });
    let signal: AbortSignal | undefined;
    await assert.rejects(
      boundedDirectMessageRequest((value) => {
        signal = value;
        throw failure;
      }, 15),
      (cause) => cause === failure,
    );
    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.equal(signal?.aborted, false);
  });
});

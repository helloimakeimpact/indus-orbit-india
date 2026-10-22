export const DIRECT_MESSAGE_RPC_TIMEOUT_MS = 20_000;
export const DIRECT_MESSAGE_SESSION_TIMEOUT_MS = 10_000;

/**
 * Bound the caller's wait even when a transport fails to settle after abort.
 * A timeout says nothing about whether a write committed: retry its original ID.
 */
export function boundedDirectMessageRequest<T>(
  start: (signal: AbortSignal) => PromiseLike<T>,
  timeoutMs = DIRECT_MESSAGE_RPC_TIMEOUT_MS,
): Promise<T> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return Promise.reject(new RangeError("A positive request timeout is required."));
  }
  return new Promise<T>((resolve, reject) => {
    const controller = new AbortController();
    let settled = false;
    const finish = (complete: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      complete();
    };
    const timer = setTimeout(() => {
      // Settle with our stable retryable code before abort listeners can turn
      // this into an authorization error or an unclassified SDK fetch error.
      finish(() =>
        reject(
          Object.assign(new Error("The conversation request timed out. Please try again."), {
            code: "NETWORK_TIMEOUT",
          }),
        ),
      );
      controller.abort();
    }, timeoutMs);
    try {
      // Starting synchronously preserves the account guard immediately before
      // the actual SDK builder is constructed and given its AbortSignal.
      Promise.resolve(start(controller.signal)).then(
        (value) => finish(() => resolve(value)),
        (error: unknown) => finish(() => reject(error)),
      );
    } catch (error) {
      finish(() => reject(error));
    }
  });
}

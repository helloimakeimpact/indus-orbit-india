import assert from "node:assert/strict";
import test from "node:test";
import {
  ExecutionAdapterError,
  IoExecutionAdapter,
  RouteGrantCodec,
  sha256Hex,
  type ExecuteRequest,
  type FetchImplementation,
  type RouteBinding,
} from "./index.ts";

const SECRET = "route-grant-secret-that-is-longer-than-thirty-two-bytes";
const BODY = '{"model":"gpt-test","messages":[{"role":"user","content":"hello"}]}';

function binding(overrides: Partial<RouteBinding> = {}): RouteBinding {
  return {
    requestId: "request-1",
    workspaceId: "workspace-1",
    policyVersion: "policy-7",
    providerId: "openai",
    endpoint: "https://api.openai.com/v1/chat/completions",
    model: "gpt-test",
    capabilities: ["streaming", "tools"],
    contentType: "application/json",
    requestBodySha256: sha256Hex(BODY),
    maxCostNanos: 1_000_000,
    ...overrides,
  };
}

function adapter(
  fetch: FetchImplementation,
  overrides: Partial<ConstructorParameters<typeof IoExecutionAdapter>[0]> = {},
) {
  return new IoExecutionAdapter({
    grantKeyId: "key-1",
    grantSecret: SECRET,
    allowedHostnames: ["api.openai.com"],
    resolveSecret: async () => ({ authorization: "Bearer provider-secret-value" }),
    fetch,
    clockSkewMs: 0,
    ...overrides,
  });
}

function executionRequest(instance: IoExecutionAdapter, overrides: Partial<ExecuteRequest> = {}) {
  const route = binding();
  return {
    grant: instance.issueGrant(route),
    requestId: route.requestId,
    workspaceId: route.workspaceId,
    policyVersion: route.policyVersion,
    providerId: route.providerId,
    endpoint: route.endpoint,
    model: route.model,
    capabilities: route.capabilities,
    contentType: route.contentType,
    maxCostNanos: route.maxCostNanos,
    body: BODY,
    ...overrides,
  } satisfies ExecuteRequest;
}

async function errorFrom(operation: Promise<unknown>) {
  try {
    await operation;
    assert.fail("Expected the operation to fail.");
  } catch (error) {
    assert.ok(error instanceof ExecutionAdapterError);
    return error;
  }
}

test("a valid grant binds the full route and injects server-only credentials", async () => {
  let observedAuthorization: string | null = null;
  const instance = adapter(async (input, init) => {
    assert.equal(String(input), "https://api.openai.com/v1/chat/completions");
    assert.equal(init?.method, "POST");
    assert.equal(init?.redirect, "error");
    observedAuthorization = new Headers(init?.headers).get("authorization");
    assert.equal(new TextDecoder().decode(init?.body as Uint8Array), BODY);
    return new Response('{"ok":true}', {
      headers: { "content-type": "application/json" },
    });
  });

  const result = await instance.execute(executionRequest(instance));
  assert.equal(observedAuthorization, "Bearer provider-secret-value");
  assert.equal(result.requestId, "request-1");
  assert.equal(new TextDecoder().decode(result.body), '{"ok":true}');
});

test("request bytes are snapshotted before asynchronous credential resolution", async () => {
  let release: (() => void) | undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let observedBody = "";
  const instance = adapter(
    async (_input, init) => {
      observedBody = new TextDecoder().decode(init?.body as ArrayBuffer);
      return new Response("ok");
    },
    {
      resolveSecret: async () => {
        await gate;
        return { authorization: "Bearer provider-secret-value" };
      },
    },
  );
  const mutableBody = new TextEncoder().encode(BODY);
  const execution = instance.execute(executionRequest(instance, { body: mutableBody }));
  mutableBody.fill(0);
  release?.();
  await execution;
  assert.equal(observedBody, BODY);
});

test("tampering with a grant or any bound route field is rejected", async () => {
  let called = 0;
  const instance = adapter(async () => {
    called += 1;
    return new Response("ok");
  });
  const request = executionRequest(instance);
  const tampered = `${request.grant.slice(0, -1)}${request.grant.endsWith("A") ? "B" : "A"}`;
  assert.equal(
    (await errorFrom(instance.execute({ ...request, grant: tampered }))).code,
    "invalid_grant",
  );
  assert.equal(
    (await errorFrom(instance.execute({ ...request, model: "another-model" }))).code,
    "binding_mismatch",
  );
  assert.equal(
    (await errorFrom(instance.execute({ ...request, body: '{"different":true}' }))).code,
    "binding_mismatch",
  );
  assert.equal(called, 0);
});

test("expired and overlong grants fail before execution", () => {
  let now = 1_000_000;
  const codec = new RouteGrantCodec({
    keyId: "key-1",
    secret: SECRET,
    maxTtlMs: 1_000,
    clockSkewMs: 0,
    now: () => now,
  });
  const token = codec.issue(binding(), 500);
  now += 500;
  assert.throws(
    () => codec.verify(token),
    (error: unknown) => {
      return error instanceof ExecutionAdapterError && error.code === "expired_grant";
    },
  );
  assert.throws(() => codec.issue(binding(), 1_001), /exceeds/);
});

test("exact-host HTTPS policy blocks SSRF-shaped endpoints before secret resolution", async () => {
  let resolved = 0;
  let fetched = 0;
  const instance = adapter(
    async () => {
      fetched += 1;
      return new Response("ok");
    },
    {
      resolveSecret: async () => {
        resolved += 1;
        return { authorization: "Bearer secret" };
      },
    },
  );

  const lookalikeEndpoint = "https://api.openai.com.evil.test/v1/chat/completions";
  const lookalikeRoute = binding({ endpoint: lookalikeEndpoint });
  assert.equal(
    (
      await errorFrom(
        instance.execute(
          executionRequest(instance, {
            endpoint: lookalikeEndpoint,
            grant: instance.issueGrant(lookalikeRoute),
          }),
        ),
      )
    ).code,
    "endpoint_not_allowed",
  );

  for (const endpoint of [
    "https://127.0.0.1/v1/chat/completions",
    "http://api.openai.com/v1/chat/completions",
    "https://user:pass@api.openai.com/v1/chat/completions",
    "https://api.openai.com:444/v1/chat/completions",
    "https://api.openai.com/v1/chat/completions?api_key=secret",
  ]) {
    const route = binding({ endpoint });
    assert.throws(
      () => instance.issueGrant(route),
      (error: unknown) => {
        return error instanceof ExecutionAdapterError && error.code === "endpoint_not_allowed";
      },
    );
  }
  assert.equal(resolved, 0);
  assert.equal(fetched, 0);
});

test("caller cancellation and timeout are distinct and redacted", async () => {
  const waitingFetch: FetchImplementation = async (_input, init) =>
    await new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () =>
        reject(new DOMException("secret-body", "AbortError")),
      );
    });
  const controller = new AbortController();
  const cancellationAdapter = adapter(waitingFetch, { timeoutMs: 5_000 });
  const cancellation = errorFrom(
    cancellationAdapter.execute(
      executionRequest(cancellationAdapter, { signal: controller.signal }),
    ),
  );
  controller.abort("private reason");
  const cancelled = await cancellation;
  assert.equal(cancelled.code, "cancelled");
  assert.equal(cancelled.retryable, false);
  assert.doesNotMatch(cancelled.message, /secret|private/u);

  const timeoutAdapter = adapter(waitingFetch, { timeoutMs: 5 });
  const timedOut = await errorFrom(timeoutAdapter.execute(executionRequest(timeoutAdapter)));
  assert.equal(timedOut.code, "timeout");
  assert.equal(timedOut.retryable, true);
});

test("provider client, rate-limit and server failures are classified without body or fallback hints", async () => {
  const privateBody = "provider-secret-error-body";
  for (const [status, code, classification, retryable] of [
    [400, "provider_client_error", "provider_client", false],
    [429, "provider_rate_limited", "provider_rate_limit", true],
    [503, "provider_server_error", "provider_server", true],
  ] as const) {
    const instance = adapter(async () => new Response(privateBody, { status }));
    const error = await errorFrom(instance.execute(executionRequest(instance)));
    assert.equal(error.code, code);
    assert.equal(error.classification, classification);
    assert.equal(error.retryable, retryable);
    assert.equal("fallback" in error, false);
    assert.doesNotMatch(JSON.stringify(error), /provider-secret|api\.openai/u);
  }
});

test("request and response byte limits fail closed", async () => {
  let calls = 0;
  const requestInstance = adapter(
    async () => {
      calls += 1;
      return new Response("ok");
    },
    { maxRequestBytes: 4 },
  );
  assert.equal(
    (await errorFrom(requestInstance.execute(executionRequest(requestInstance)))).code,
    "request_too_large",
  );
  assert.equal(calls, 0);

  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      controller.enqueue(new Uint8Array(8));
    },
    cancel() {
      cancelled = true;
    },
  });
  const responseInstance = adapter(async () => new Response(body), { maxResponseBytes: 10 });
  assert.equal(
    (await errorFrom(responseInstance.execute(executionRequest(responseInstance)))).code,
    "response_too_large",
  );
  assert.equal(cancelled, true);
});

test("the concurrency cap fails fast and releases capacity", async () => {
  let release: (() => void) | undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let calls = 0;
  const instance = adapter(
    async () => {
      calls += 1;
      await gate;
      return new Response("ok");
    },
    { maxConcurrency: 1 },
  );
  const first = instance.execute(executionRequest(instance));
  await new Promise((resolve) => setTimeout(resolve, 0));
  const saturated = await errorFrom(instance.execute(executionRequest(instance)));
  assert.equal(saturated.code, "concurrency_exhausted");
  assert.equal(saturated.retryable, true);
  release?.();
  await first;
  await instance.execute(executionRequest(instance));
  assert.equal(calls, 2);
});

test("secret resolver and transport failures never expose arbitrary details", async () => {
  const secretValue = "ultra-private-provider-key";
  const resolverInstance = adapter(async () => new Response("ok"), {
    resolveSecret: async () => {
      throw new Error(secretValue);
    },
  });
  const secretError = await errorFrom(resolverInstance.execute(executionRequest(resolverInstance)));
  assert.equal(secretError.code, "invalid_credential");
  assert.doesNotMatch(JSON.stringify(secretError), new RegExp(secretValue, "u"));

  const transportInstance = adapter(async () => {
    throw new Error(`${secretValue}:${BODY}`);
  });
  const transportError = await errorFrom(
    transportInstance.execute(executionRequest(transportInstance)),
  );
  assert.equal(transportError.code, "provider_transport_error");
  assert.doesNotMatch(JSON.stringify(transportError), /ultra-private|messages|hello/u);
});

test("credential headers cannot overwrite transport authority or framing", async () => {
  for (const name of ["host", "content-length", "cookie", "proxy-authorization"]) {
    const instance = adapter(async () => new Response("ok"), {
      resolveSecret: async () => ({ [name]: "private" }),
    });
    assert.equal(
      (await errorFrom(instance.execute(executionRequest(instance)))).code,
      "invalid_credential",
    );
  }
});

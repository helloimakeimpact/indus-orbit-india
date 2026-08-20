import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GatewayError } from "./errors.ts";
import { discoverProviderModel, sendProviderChat } from "./provider-adapter.ts";
import type { GatewayMessage, ProviderConnection } from "./types.ts";

const messages: GatewayMessage[] = [{ role: "user", content: "Reply with a short test." }];

function connection(overrides: Partial<ProviderConnection>): ProviderConnection {
  return {
    endpointId: "endpoint-test",
    providerId: "provider-test",
    providerKey: "openai",
    providerDisplayName: "Test provider",
    integrationStyle: "openai_compatible",
    modelId: "model-test",
    providerModelId: "model-test",
    modelDisplayName: "Test model",
    modelReleaseDate: "2026-07-01",
    modelDeprecationAt: null,
    autoRouteTier: "balanced",
    maxContextTokens: 100_000,
    capacitySourceId: "capacity-test",
    endpointKey: "endpoint-test",
    capacityMode: "direct_api",
    regionCode: null,
    residencyCountryCode: null,
    retentionClass: "unknown",
    baseUrl: "https://provider.example/v1",
    secretReference: "IO_PROVIDER_TEST_API_KEY",
    capabilityVersion: 1,
    priceVersion: 1,
    currencyCode: "USD",
    unitQuantity: 1_000_000,
    inputPriceNanos: 1,
    outputPriceNanos: 1,
    healthState: "unknown",
    circuitState: "closed",
    ...overrides,
  };
}

type CapturedRequest = {
  url: string;
  headers: Headers;
  body: Record<string, unknown>;
};

async function captureProviderRequests(
  run: (requests: CapturedRequest[]) => Promise<void>,
  responseFactory: () => Response = () =>
    new Response(
      JSON.stringify({
        choices: [{ message: { content: "Fixture response" } }],
        usage: { prompt_tokens: 10, completion_tokens: 2 },
        candidates: [{ content: { parts: [{ text: "Fixture response" }] } }],
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 2 },
      }),
      { status: 200, headers: { "Content-Type": "application/json", "x-request-id": "req-test" } },
    ),
): Promise<void> {
  const requests: CapturedRequest[] = [];
  const originalFetch = globalThis.fetch;
  const originalDeno = (globalThis as typeof globalThis & { Deno?: unknown }).Deno;

  (globalThis as typeof globalThis & { Deno: unknown }).Deno = {
    env: {
      get: (name: string) =>
        name === "IO_PROVIDER_TEST_API_KEY"
          ? "fixture-secret"
          : name === "IO_SAFETY_IDENTIFIER_SECRET"
            ? "fixture-safety-secret-with-more-than-32-characters"
            : undefined,
    },
  };
  globalThis.fetch = async (input, init) => {
    requests.push({
      url: String(input),
      headers: new Headers(init?.headers),
      body: init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {},
    });
    return responseFactory();
  };

  try {
    await run(requests);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalDeno === undefined) {
      delete (globalThis as typeof globalThis & { Deno?: unknown }).Deno;
    } else {
      (globalThis as typeof globalThis & { Deno: unknown }).Deno = originalDeno;
    }
  }
}

describe("sendProviderChat request contracts", { concurrency: false }, () => {
  it("uses the reviewed provider-specific completion and reasoning fields", async () => {
    await captureProviderRequests(async (requests) => {
      const cases = [
        {
          providerKey: "openai",
          expected: { max_completion_tokens: 1_024, reasoning_effort: "low" },
          absent: ["max_tokens", "thinking"],
        },
        {
          providerKey: "xai",
          expected: { max_tokens: 1_024, reasoning_effort: "low" },
          absent: ["max_completion_tokens", "thinking"],
        },
        {
          providerKey: "deepseek",
          expected: { max_tokens: 1_024, thinking: { type: "disabled" } },
          absent: ["max_completion_tokens", "reasoning_effort"],
        },
        {
          providerKey: "groq",
          expected: { max_completion_tokens: 1_024, reasoning_effort: "low" },
          absent: ["max_tokens", "thinking"],
        },
      ];

      for (const testCase of cases) {
        const result = await sendProviderChat(
          connection({ providerKey: testCase.providerKey }),
          messages,
        );
        const request = requests.at(-1)!;

        assert.equal(request.url, "https://provider.example/v1/chat/completions");
        assert.equal(request.headers.get("authorization"), "Bearer fixture-secret");
        assert.deepEqual(
          Object.fromEntries(Object.keys(testCase.expected).map((key) => [key, request.body[key]])),
          testCase.expected,
        );
        for (const key of testCase.absent) assert.equal(key in request.body, false);
        assert.equal(request.body.stream, false);
        if (testCase.providerKey === "openai") {
          assert.match(String(request.body.safety_identifier), /^io_[a-f0-9]{64}$/);
        } else {
          assert.equal("safety_identifier" in request.body, false);
        }
        assert.equal(result.content, "Fixture response");
        assert.equal(result.providerRequestId, "req-test");
      }
    });
  });

  it("uses the Gemini native endpoint and request structure", async () => {
    await captureProviderRequests(async (requests) => {
      await sendProviderChat(
        connection({
          providerKey: "gemini",
          integrationStyle: "native_adapter",
          providerModelId: "gemini-test",
          baseUrl: "https://generativelanguage.googleapis.com/v1beta",
        }),
        [{ role: "system", content: "Be concise." }, ...messages],
      );
      const request = requests[0];

      assert.equal(
        request.url,
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent",
      );
      assert.equal(request.headers.get("x-goog-api-key"), "fixture-secret");
      assert.deepEqual(request.body.systemInstruction, { parts: [{ text: "Be concise." }] });
      assert.deepEqual(request.body.generationConfig, { maxOutputTokens: 1_024 });
    });
  });

  it("discovers the exact configured model without exposing catalogue content", async () => {
    await captureProviderRequests(
      async (requests) => {
        const result = await discoverProviderModel(connection({ providerModelId: "model-test" }));
        assert.equal(requests[0].url, "https://provider.example/v1/models");
        assert.equal(requests[0].headers.get("authorization"), "Bearer fixture-secret");
        assert.deepEqual(result, { modelIdMatched: true, providerRequestId: "req-models" });
      },
      () =>
        Response.json(
          { object: "list", data: [{ id: "model-test", object: "model" }] },
          { headers: { "x-request-id": "req-models" } },
        ),
    );
  });

  it("rejects a successful response without assistant content", async () => {
    await captureProviderRequests(
      async () => {
        await assert.rejects(
          sendProviderChat(connection({}), messages),
          (error: unknown) =>
            error instanceof GatewayError &&
            error.code === "upstream_failure" &&
            /no usable assistant response/.test(error.message),
        );
      },
      () => Response.json({ choices: [] }),
    );
  });

  it("normalizes rate-limit and upstream failures without returning provider bodies", async () => {
    for (const [status, code] of [
      [429, "rate_limited"],
      [500, "upstream_failure"],
    ] as const) {
      await captureProviderRequests(
        async () => {
          await assert.rejects(
            sendProviderChat(connection({}), messages),
            (error: unknown) =>
              error instanceof GatewayError &&
              error.code === code &&
              error.upstreamStatus === status &&
              !error.message.includes("provider-secret-detail"),
          );
        },
        () => Response.json({ error: "provider-secret-detail" }, { status }),
      );
    }
  });

  it("rejects oversized or invalid successful provider responses", async () => {
    for (const responseFactory of [
      () =>
        new Response("{}", {
          status: 200,
          headers: { "content-length": String(2 * 1_024 * 1_024 + 1) },
        }),
      () => new Response("not-json", { status: 200 }),
    ]) {
      await captureProviderRequests(async () => {
        await assert.rejects(
          sendProviderChat(connection({}), messages),
          (error: unknown) =>
            error instanceof GatewayError &&
            error.code === "upstream_failure" &&
            (/safety limit/.test(error.message) || /invalid JSON/.test(error.message)),
        );
      }, responseFactory);
    }
  });
});

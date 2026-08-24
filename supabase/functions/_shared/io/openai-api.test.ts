import assert from "node:assert/strict";
import test from "node:test";
import { GatewayError } from "./errors.ts";
import {
  parseOpenAiChatRequest,
  parseOpenAiResponsesRequest,
  rejectBrowserApiKeyRequest,
  requireApiKeyAuthorization,
  requireClientIdempotencyKey,
  sha256Hex,
} from "./openai-api.ts";

test("rejects browser-origin API-key requests", () => {
  assert.doesNotThrow(() => rejectBrowserApiKeyRequest(null));
  assert.throws(
    () => rejectBrowserApiKeyRequest("https://indusorbit.com"),
    (error) => error instanceof GatewayError && error.code === "forbidden" && error.status === 403,
  );
});

test("parses the supported non-streaming OpenAI chat subset", () => {
  assert.deepEqual(
    parseOpenAiChatRequest({
      model: "io/latest-affordable",
      messages: [{ role: "user", content: "Hello" }],
      stream: false,
    }),
    {
      model: "io/latest-affordable",
      messages: [{ role: "user", content: "Hello" }],
      stream: false,
      includeUsage: false,
      inferenceOptions: {
        maxOutputTokens: undefined,
        tools: undefined,
        toolChoice: undefined,
        parallelToolCalls: true,
        responseFormat: undefined,
      },
    },
  );
});

test("accepts bounded tools, structured output, streaming, and HTTPS image input", () => {
  const parsed = parseOpenAiChatRequest({
    model: "io/latest-affordable",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "Read this" },
          { type: "image_url", image_url: { url: "https://example.com/image.png" } },
        ],
      },
    ],
    stream: true,
    stream_options: { include_usage: true },
    tools: [
      {
        type: "function",
        function: {
          name: "lookup",
          parameters: { type: "object", properties: {}, additionalProperties: false },
          strict: true,
        },
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "answer",
        schema: { type: "object", properties: {}, additionalProperties: false },
        strict: true,
      },
    },
  });
  assert.equal(parsed.stream, true);
  assert.equal(parsed.includeUsage, true);
  assert.equal(parsed.inferenceOptions.tools?.[0].function.name, "lookup");
  assert.equal(parsed.inferenceOptions.responseFormat?.type, "json_schema");
  assert.equal(Array.isArray(parsed.messages[0].content), true);
});

test("parses the stateless Responses API input and function-tool shape", () => {
  const parsed = parseOpenAiResponsesRequest({
    model: "io/latest-affordable",
    instructions: "Be concise",
    input: "Hello",
    store: false,
    tools: [
      {
        type: "function",
        name: "lookup",
        parameters: { type: "object", properties: {} },
      },
    ],
    text: { format: { type: "json_object" } },
  });
  assert.equal(parsed.messages[0].role, "system");
  assert.equal(parsed.messages[1].content, "Hello");
  assert.equal(parsed.inferenceOptions.tools?.[0].function.name, "lookup");
});

test("rejects unsupported or unsafe OpenAI fields instead of silently ignoring them", () => {
  assert.throws(
    () =>
      parseOpenAiChatRequest({
        model: "io/latest-affordable",
        messages: [{ role: "user", content: "Hello" }],
        temperature: 0.5,
      }),
    (error) => error instanceof GatewayError && error.code === "bad_request",
  );
  assert.throws(
    () =>
      parseOpenAiChatRequest({
        model: "io/latest-affordable",
        messages: [
          {
            role: "user",
            content: [{ type: "image_url", image_url: { url: "http://private.test/image.png" } }],
          },
        ],
      }),
    GatewayError,
  );
});

test("requires a correctly shaped test API key", () => {
  const key = `io_test_${"a".repeat(16)}.${"b".repeat(43)}`;
  assert.equal(requireApiKeyAuthorization(`Bearer ${key}`), key);
  assert.throws(() => requireApiKeyAuthorization("Bearer public-key"), GatewayError);
});

test("validates caller idempotency keys and hashes deterministically", async () => {
  assert.equal(requireClientIdempotencyKey("client-request-01"), "client-request-01");
  assert.throws(() => requireClientIdempotencyKey("short"), GatewayError);
  assert.equal((await sha256Hex("same")).length, 64);
  assert.equal(await sha256Hex("same"), await sha256Hex("same"));
});

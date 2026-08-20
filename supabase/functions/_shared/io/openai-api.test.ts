import assert from "node:assert/strict";
import test from "node:test";
import { GatewayError } from "./errors.ts";
import {
  parseOpenAiChatRequest,
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
    },
  );
});

test("rejects unsupported OpenAI fields instead of silently ignoring them", () => {
  assert.throws(
    () =>
      parseOpenAiChatRequest({
        model: "io/latest-affordable",
        messages: [{ role: "user", content: "Hello" }],
        tools: [],
      }),
    (error) => error instanceof GatewayError && error.code === "bad_request",
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

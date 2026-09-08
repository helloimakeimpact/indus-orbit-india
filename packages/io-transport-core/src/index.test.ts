import assert from "node:assert/strict";
import test from "node:test";
import {
  createTransportRegistry,
  decodeJsonSseFrame,
  normalizeFinishReason,
  normalizeTransportUsage,
  SseFrameDecoder,
  TransportDecodeError,
  type TransportDescriptor,
} from "./index.ts";

test("SSE frames survive chunk and CRLF boundaries", () => {
  const decoder = new SseFrameDecoder();
  assert.deepEqual(decoder.feed('event: response.output_text.delta\r\ndata: {"delta":"hel'), []);
  assert.deepEqual(decoder.feed('lo"}\r\n\r\ndata: [DONE]\n\n'), [
    {
      event: "response.output_text.delta",
      id: null,
      data: '{"delta":"hello"}',
      retry: null,
    },
    { event: null, id: null, data: "[DONE]", retry: null },
  ]);
});

test("SSE data lines join without accepting unrelated fields", () => {
  const decoder = new SseFrameDecoder();
  assert.deepEqual(
    decoder.feed('id: evt-1\ndata: {\ndata: "ok":true}\nretry: 1000\nignored: no\n\n'),
    [{ event: null, id: "evt-1", data: '{\n"ok":true}', retry: 1000 }],
  );
  assert.deepEqual(new SseFrameDecoder().feed("retry: 999999999999999999999\n\n"), []);
});

test("SSE decoder rejects oversized pending and complete frames", () => {
  const decoder = new SseFrameDecoder(16);
  assert.throws(() => decoder.feed(`data: ${"x".repeat(32)}`), TransportDecodeError);
  assert.throws(
    () => new SseFrameDecoder(16).feed(`data: ${"x".repeat(32)}\n\n`),
    TransportDecodeError,
  );
});

test("JSON SSE decoding distinguishes terminal and malformed frames", () => {
  assert.deepEqual(decodeJsonSseFrame({ event: null, id: null, retry: null, data: "[DONE]" }), {
    type: "done",
    event: null,
    id: null,
  });
  assert.deepEqual(
    decodeJsonSseFrame({ event: "message", id: "1", retry: null, data: '{"ok":true}' }),
    { type: "event", event: "message", id: "1", value: { ok: true } },
  );
  assert.throws(
    () => decodeJsonSseFrame({ event: null, id: null, retry: null, data: "{" }),
    TransportDecodeError,
  );
});

test("finish reasons normalize without turning unknown failures into success", () => {
  assert.equal(normalizeFinishReason("tool_use", "anthropic"), "tool_calls");
  assert.equal(normalizeFinishReason("MAX_TOKENS", "gemini"), "length");
  assert.equal(normalizeFinishReason("SAFETY", "gemini"), "content_filter");
  assert.equal(normalizeFinishReason("new_provider_reason", "openai_chat"), "unknown");
});

test("usage dimensions remain separate for exact downstream billing", () => {
  assert.deepEqual(
    normalizeTransportUsage(
      {
        input_tokens: 12,
        output_tokens: 5,
        cache_read_input_tokens: 7,
        cache_creation_input_tokens: 3,
      },
      "anthropic",
    ),
    {
      inputTokens: 12,
      outputTokens: 5,
      cachedInputTokens: 7,
      cacheCreationInputTokens: 3,
    },
  );
  assert.deepEqual(
    normalizeTransportUsage(
      {
        prompt_tokens: 20,
        completion_tokens: 8,
        total_tokens: 28,
        prompt_tokens_details: { cached_tokens: 11, cache_creation_tokens: 2 },
        completion_tokens_details: { reasoning_tokens: 4 },
      },
      "openai_responses",
    ),
    {
      inputTokens: 20,
      outputTokens: 8,
      totalTokens: 28,
      cachedInputTokens: 11,
      cacheCreationInputTokens: 2,
      reasoningTokens: 4,
    },
  );
});

function descriptor(id: string): TransportDescriptor {
  return {
    id,
    sourceFormat: "openai_chat",
    targetFormat: "anthropic",
    capabilities: {
      streaming: true,
      tools: true,
      structuredOutput: false,
      vision: false,
      audio: false,
    },
    provenance: {
      source: "9router_adapted",
      sourceRevision: "eb712ca821f0ba6bc41043fbd14494c5af5daba5",
      reviewedAt: "2026-09-08",
    },
    translateRequest: (input) => input,
    translateChunk: (input) => input,
    normalizeUsage: (input) => normalizeTransportUsage(input, "anthropic"),
  };
}

test("transport registry is an explicit duplicate-free allowlist", () => {
  const entry = descriptor("openai-chat.anthropic.v1");
  const registry = createTransportRegistry([entry]);
  assert.equal(registry.get(entry.id)?.id, entry.id);
  assert.equal(Object.isFrozen(registry.get(entry.id)?.capabilities), true);
  assert.equal(Object.isFrozen(registry.get(entry.id)?.provenance), true);
  assert.equal(registry.get("unreviewed"), null);
  assert.throws(() => createTransportRegistry([entry, entry]), /Duplicate transport descriptor/);
});

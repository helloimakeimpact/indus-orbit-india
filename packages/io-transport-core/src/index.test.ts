import assert from "node:assert/strict";
import test from "node:test";
import {
  AnthropicToOpenAiChatStreamTranslator,
  createTransportRegistry,
  decodeJsonSseFrame,
  normalizeFinishReason,
  normalizeTransportUsage,
  SseFrameDecoder,
  TransportDecodeError,
  TransportTranslationError,
  translateAnthropicMessageToOpenAiChat,
  translateOpenAiChatToAnthropic,
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

test("OpenAI Chat translates to Anthropic with explicit, inspectable losses", () => {
  const translated = translateOpenAiChatToAnthropic({
    model: "claude-example",
    max_completion_tokens: 256,
    messages: [
      { role: "developer", content: "Be precise." },
      {
        role: "user",
        name: "member",
        content: [
          { type: "text", text: "Inspect this." },
          { type: "image_url", image_url: { url: "https://example.test/private.png" } },
        ],
      },
      {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "call-1",
            type: "function",
            function: { name: "lookup", arguments: '{"id":"42"}' },
          },
        ],
      },
      { role: "tool", tool_call_id: "call-1", content: "Found" },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "lookup",
          description: "Find one record",
          parameters: { type: "object", properties: { id: { type: "string" } } },
        },
      },
    ],
    tool_choice: "required",
    parallel_tool_calls: false,
    response_format: { type: "json_schema", json_schema: { name: "answer" } },
  });

  assert.deepEqual(
    translated.losses.map((loss) => loss.code),
    [
      "developer_role_folded",
      "named_participant_omitted",
      "remote_image_omitted",
      "structured_output_not_native",
    ],
  );
  assert.deepEqual(translated.value, {
    model: "claude-example",
    max_tokens: 256,
    messages: [
      { role: "user", content: [{ type: "text", text: "Inspect this." }] },
      {
        role: "assistant",
        content: [{ type: "tool_use", id: "call-1", name: "lookup", input: { id: "42" } }],
      },
      {
        role: "user",
        content: [{ type: "tool_result", tool_use_id: "call-1", content: "Found" }],
      },
    ],
    system: [{ type: "text", text: "Be precise." }],
    tools: [
      {
        name: "lookup",
        description: "Find one record",
        input_schema: { type: "object", properties: { id: { type: "string" } } },
      },
    ],
    tool_choice: { type: "any", disable_parallel_tool_use: true },
  });
});

test("OpenAI Chat translator fails closed on invalid tool JSON", () => {
  assert.throws(
    () =>
      translateOpenAiChatToAnthropic({
        model: "claude-example",
        max_tokens: 32,
        messages: [
          { role: "user", content: "Run" },
          {
            role: "assistant",
            tool_calls: [
              {
                id: "call-1",
                type: "function",
                function: { name: "lookup", arguments: "{" },
              },
            ],
          },
        ],
      }),
    TransportTranslationError,
  );
});

test("Anthropic message translates to OpenAI Chat with usage dimensions", () => {
  const translated = translateAnthropicMessageToOpenAiChat({
    id: "msg-1",
    model: "claude-example",
    stop_reason: "tool_use",
    content: [
      { type: "thinking", thinking: "private" },
      { type: "text", text: "Checking" },
      { type: "tool_use", id: "call-1", name: "lookup", input: { id: "42" } },
    ],
    usage: {
      input_tokens: 10,
      output_tokens: 4,
      cache_read_input_tokens: 6,
      cache_creation_input_tokens: 2,
    },
  });
  assert.deepEqual(
    translated.losses.map((loss) => loss.code),
    ["reasoning_omitted"],
  );
  const output = translated.value as {
    choices: Array<{ message: Record<string, unknown>; finish_reason: string }>;
    usage: Record<string, unknown>;
  };
  assert.equal(output.choices[0]?.finish_reason, "tool_calls");
  assert.deepEqual(output.choices[0]?.message, {
    role: "assistant",
    content: "Checking",
    tool_calls: [
      {
        id: "call-1",
        type: "function",
        function: { name: "lookup", arguments: '{"id":"42"}' },
      },
    ],
  });
  assert.deepEqual(output.usage, {
    prompt_tokens: 18,
    completion_tokens: 4,
    total_tokens: 22,
    prompt_tokens_details: { cached_tokens: 6, cache_creation_tokens: 2 },
  });
});

test("Anthropic stream translates role, text, tools, usage and terminal events", () => {
  const translator = new AnthropicToOpenAiChatStreamTranslator();
  const outputs = [
    translator.feed({
      type: "event",
      event: "message_start",
      id: null,
      value: {
        type: "message_start",
        message: {
          id: "msg-1",
          model: "claude-example",
          usage: { input_tokens: 10, cache_read_input_tokens: 3 },
        },
      },
    }),
    translator.feed({
      type: "event",
      event: "content_block_delta",
      id: null,
      value: {
        type: "content_block_delta",
        index: 0,
        delta: { type: "text_delta", text: "Hi" },
      },
    }),
    translator.feed({
      type: "event",
      event: "content_block_start",
      id: null,
      value: {
        type: "content_block_start",
        index: 1,
        content_block: { type: "tool_use", id: "call-1", name: "lookup" },
      },
    }),
    translator.feed({
      type: "event",
      event: "content_block_delta",
      id: null,
      value: {
        type: "content_block_delta",
        index: 1,
        delta: { type: "input_json_delta", partial_json: '{"id":"42"}' },
      },
    }),
    translator.feed({
      type: "event",
      event: "message_delta",
      id: null,
      value: {
        type: "message_delta",
        delta: { stop_reason: "tool_use" },
        usage: { output_tokens: 4 },
      },
    }),
    translator.feed({
      type: "event",
      event: "message_stop",
      id: null,
      value: { type: "message_stop" },
    }),
  ].flatMap((result) => result.value);

  assert.equal(outputs.length, 6);
  assert.deepEqual(outputs.at(-1), { type: "done" });
  const terminal = outputs.at(-2) as { type: "chunk"; value: Record<string, unknown> };
  assert.deepEqual(terminal.value.usage, {
    prompt_tokens: 13,
    completion_tokens: 4,
    total_tokens: 17,
    prompt_tokens_details: { cached_tokens: 3 },
  });
});

test("Anthropic stream rejects content before message_start and data after stop", () => {
  assert.throws(
    () =>
      new AnthropicToOpenAiChatStreamTranslator().feed({
        type: "event",
        event: "content_block_delta",
        id: null,
        value: {
          type: "content_block_delta",
          index: 0,
          delta: { type: "text_delta", text: "x" },
        },
      }),
    TransportTranslationError,
  );
  const translator = new AnthropicToOpenAiChatStreamTranslator();
  translator.feed({
    type: "event",
    event: "message_start",
    id: null,
    value: {
      type: "message_start",
      message: { id: "msg-1", model: "claude-example", usage: { input_tokens: 1 } },
    },
  });
  translator.feed({
    type: "event",
    event: "message_stop",
    id: null,
    value: { type: "message_stop" },
  });
  assert.throws(
    () =>
      translator.feed({
        type: "event",
        event: "ping",
        id: null,
        value: { type: "ping" },
      }),
    TransportTranslationError,
  );
});

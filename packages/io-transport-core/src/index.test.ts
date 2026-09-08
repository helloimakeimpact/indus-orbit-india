import assert from "node:assert/strict";
import test from "node:test";
import {
  AnthropicToOpenAiChatStreamTranslator,
  assertBoundedTransportJson,
  createReviewedUnregisteredTransportDescriptors,
  createTransportRegistry,
  decodeJsonSseFrame,
  enforceTranslationLossPolicy,
  normalizeFinishReason,
  normalizeTransportUsage,
  OpenAiResponsesToChatStreamTranslator,
  SseFrameDecoder,
  TransportDecodeError,
  TransportTranslationError,
  translateAnthropicMessageToOpenAiChat,
  translateOpenAiChatToAnthropic,
  translateOpenAiChatToResponses,
  translateOpenAiResponseToChat,
  TRANSPORT_DESCRIPTOR_CONTRACT_VERSION,
  type TransportDescriptor,
  Utf8SseDecoder,
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

test("UTF-8 SSE decoding preserves multibyte content across every byte boundary", () => {
  const encoded = new TextEncoder().encode('data: {"delta":"नमस्ते 🌏"}\r\n\r\n');
  for (let split = 0; split <= encoded.length; split += 1) {
    const decoder = new Utf8SseDecoder();
    const frames = [
      ...decoder.feed(encoded.slice(0, split)),
      ...decoder.feed(encoded.slice(split)),
    ];
    assert.deepEqual(frames, [
      {
        event: null,
        id: null,
        data: '{"delta":"नमस्ते 🌏"}',
        retry: null,
      },
    ]);
    assert.deepEqual(decoder.flush(), []);
  }

  const incomplete = new Utf8SseDecoder();
  incomplete.feed(new Uint8Array([0xe2, 0x82]));
  assert.throws(() => incomplete.flush(), TransportDecodeError);
  assert.throws(() => incomplete.feed(new Uint8Array()), TransportDecodeError);
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
    contractVersion: TRANSPORT_DESCRIPTOR_CONTRACT_VERSION,
    id,
    implementationVersion: "1.0.0",
    registration: "approved",
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
    translateRequest: (input) => ({ value: input, losses: [] }),
    translateResponse: (input) => ({ value: input, losses: [] }),
    createStreamTranslator: () => ({
      feed: () => ({ value: [], losses: [] }),
    }),
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

test("reviewed versioned descriptors remain immutable and unregistered", () => {
  const first = createReviewedUnregisteredTransportDescriptors();
  const second = createReviewedUnregisteredTransportDescriptors();
  assert.notEqual(first, second);
  assert.deepEqual(
    first.map(({ id, contractVersion, implementationVersion, registration }) => ({
      id,
      contractVersion,
      implementationVersion,
      registration,
    })),
    [
      {
        id: "openai-chat.anthropic.v1",
        contractVersion: 1,
        implementationVersion: "1.0.0",
        registration: "unregistered",
      },
      {
        id: "openai-chat.openai-responses.v1",
        contractVersion: 1,
        implementationVersion: "1.0.0",
        registration: "unregistered",
      },
    ],
  );
  assert.equal(Object.isFrozen(first), true);
  assert.equal(
    first.every((entry) => Object.isFrozen(entry)),
    true,
  );
  assert.equal(
    first.every((entry) => Object.isFrozen(entry.capabilities)),
    true,
  );
  assert.equal(
    first.every((entry) => Object.isFrozen(entry.provenance)),
    true,
  );
  assert.throws(() => createTransportRegistry([...first]), /not approved for registration/);
});

test("transport registry rejects invalid descriptor versions and review metadata", () => {
  const invalidContract = {
    ...descriptor("openai-chat.anthropic.v2"),
    contractVersion: 2,
  } as unknown as TransportDescriptor;
  assert.throws(
    () => createTransportRegistry([invalidContract]),
    /Unsupported transport descriptor contract/,
  );

  const invalidImplementation = {
    ...descriptor("openai-chat.anthropic.v3"),
    implementationVersion: "latest",
  };
  assert.throws(
    () => createTransportRegistry([invalidImplementation]),
    /Invalid transport implementation version/,
  );

  const invalidReview = {
    ...descriptor("openai-chat.anthropic.v4"),
    provenance: { source: "indus_orbit" as const, reviewedAt: "tomorrow" },
  };
  assert.throws(() => createTransportRegistry([invalidReview]), /review date is invalid/);
});

test("bounded JSON validation rejects adversarial structure without recursion", async (t) => {
  await t.test("depth boundary", () => {
    const within = { one: { two: { three: "ok" } } };
    assert.doesNotThrow(() =>
      assertBoundedTransportJson(within, "test payload", { maximumDepth: 4 }),
    );
    assert.throws(
      () => assertBoundedTransportJson(within, "test payload", { maximumDepth: 2 }),
      /depth limit/,
    );
  });

  await t.test("node and container boundaries", () => {
    assert.doesNotThrow(() =>
      assertBoundedTransportJson([1, 2, 3], "test payload", {
        maximumNodes: 4,
        maximumContainerEntries: 3,
      }),
    );
    assert.throws(
      () =>
        assertBoundedTransportJson([1, 2, 3], "test payload", {
          maximumNodes: 3,
          maximumContainerEntries: 3,
        }),
      /node limit/,
    );
    assert.throws(
      () => assertBoundedTransportJson([1, 2], "test payload", { maximumContainerEntries: 1 }),
      /sparse or oversized array/,
    );
  });

  await t.test("UTF-8 byte boundary", () => {
    assert.doesNotThrow(() =>
      assertBoundedTransportJson("🌏", "test payload", { maximumStringBytes: 4 }),
    );
    assert.throws(
      () => assertBoundedTransportJson("🌏", "test payload", { maximumStringBytes: 3 }),
      /string-byte limit/,
    );
  });

  await t.test("cycles, aliases and sparse arrays", () => {
    const cycle: { self?: unknown } = {};
    cycle.self = cycle;
    assert.throws(() => assertBoundedTransportJson(cycle), /cyclic or repeated object/);
    const shared = { safe: true };
    assert.throws(
      () => assertBoundedTransportJson({ first: shared, second: shared }),
      /cyclic or repeated object/,
    );
    assert.throws(() => assertBoundedTransportJson(new Array(2)), /sparse or oversized array/);
  });

  await t.test("accessors, symbols, classes and non-finite numbers", () => {
    let getterRead = false;
    const accessor = Object.defineProperty({}, "secret", {
      enumerable: true,
      get() {
        getterRead = true;
        return "unsafe";
      },
    });
    assert.throws(() => assertBoundedTransportJson(accessor), /accessor property/);
    assert.equal(getterRead, false);
    assert.throws(
      () => assertBoundedTransportJson({ [Symbol("unsafe")]: true }),
      /symbol property/,
    );
    assert.throws(() => assertBoundedTransportJson(new Date()), /non-plain object/);
    assert.throws(() => assertBoundedTransportJson(Number.NaN), /non-finite number/);
  });
});

test("translation loss policy fails closed unless every loss is explicitly allowed", () => {
  const result = {
    value: { safe: true },
    losses: [
      {
        code: "named_participant_omitted" as const,
        path: "messages[0].name",
        detail: "No target field.",
      },
    ],
  };
  assert.throws(() => enforceTranslationLossPolicy(result), TransportTranslationError);
  assert.deepEqual(enforceTranslationLossPolicy(result, ["named_participant_omitted"]), {
    safe: true,
  });
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

test("request translators enforce nested JSON, container and UTF-8 input bounds", () => {
  let schema: Record<string, unknown> = { type: "string" };
  for (let depth = 0; depth < 70; depth += 1) schema = { nested: schema };
  assert.throws(
    () =>
      translateOpenAiChatToResponses({
        model: "provider-model",
        messages: [{ role: "user", content: "Inspect" }],
        response_format: {
          type: "json_schema",
          json_schema: { name: "too_deep", schema },
        },
      }),
    /JSON depth limit/,
  );

  assert.throws(
    () =>
      translateOpenAiChatToAnthropic({
        model: "provider-model",
        max_tokens: 32,
        messages: [
          {
            role: "user",
            content: Array.from({ length: 4_097 }, () => ({ type: "text", text: "x" })),
          },
        ],
      }),
    /sparse or oversized array/,
  );

  assert.throws(
    () =>
      translateOpenAiChatToResponses({
        model: "provider-model",
        messages: [{ role: "user", content: "🌏".repeat(262_145) }],
      }),
    /messages\[0\] text is invalid/,
  );
});

test("JSON SSE decoding rejects a deeply nested adversarial event", () => {
  const data = `${'{"nested":'.repeat(70)}null${"}".repeat(70)}`;
  assert.throws(
    () => decodeJsonSseFrame({ event: "message", id: null, retry: null, data }),
    TransportDecodeError,
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

test("OpenAI Chat translates to stateless Responses without dropping image input", () => {
  const translated = translateOpenAiChatToResponses({
    model: "io/latest-affordable",
    max_completion_tokens: 512,
    messages: [
      { role: "developer", content: "Return verified facts." },
      {
        role: "user",
        name: "member",
        content: [
          { type: "text", text: "Inspect this image." },
          {
            type: "image_url",
            image_url: { url: "https://example.test/image.png", detail: "high" },
          },
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
          strict: true,
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "lookup" } },
    parallel_tool_calls: false,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "answer",
        schema: { type: "object", properties: { result: { type: "string" } } },
        strict: true,
      },
    },
    stop: "END",
    stream: true,
  });

  assert.deepEqual(
    translated.losses.map((loss) => loss.code),
    ["named_participant_omitted", "stop_sequences_omitted"],
  );
  assert.deepEqual(translated.value, {
    model: "io/latest-affordable",
    input: [
      {
        type: "message",
        role: "developer",
        content: [{ type: "input_text", text: "Return verified facts." }],
      },
      {
        type: "message",
        role: "user",
        content: [
          { type: "input_text", text: "Inspect this image." },
          { type: "input_image", image_url: "https://example.test/image.png", detail: "high" },
        ],
      },
      {
        type: "function_call",
        call_id: "call-1",
        name: "lookup",
        arguments: '{"id":"42"}',
      },
      { type: "function_call_output", call_id: "call-1", output: "Found" },
    ],
    store: false,
    max_output_tokens: 512,
    tools: [
      {
        type: "function",
        name: "lookup",
        description: "Find one record",
        parameters: { type: "object", properties: { id: { type: "string" } } },
        strict: true,
      },
    ],
    tool_choice: { type: "function", name: "lookup" },
    parallel_tool_calls: false,
    text: {
      format: {
        type: "json_schema",
        name: "answer",
        schema: { type: "object", properties: { result: { type: "string" } } },
        strict: true,
      },
    },
    stream: true,
  });
});

test("completed Responses translate to Chat with tools, refusal and exact usage dimensions", () => {
  const translated = translateOpenAiResponseToChat({
    id: "resp-1",
    object: "response",
    created_at: 1_725_000_000,
    status: "completed",
    model: "provider-model",
    output: [
      {
        type: "message",
        id: "msg-1",
        role: "assistant",
        content: [
          { type: "output_text", text: "Checking", annotations: [], logprobs: [] },
          { type: "refusal", refusal: "Cannot disclose private reasoning." },
        ],
      },
      {
        type: "function_call",
        id: "fc-1",
        call_id: "call-1",
        name: "lookup",
        arguments: '{"id":"42"}',
      },
      { type: "reasoning", id: "rs-1", summary: [] },
    ],
    usage: {
      input_tokens: 14,
      input_tokens_details: { cached_tokens: 4, cache_write_tokens: 2 },
      output_tokens: 7,
      output_tokens_details: { reasoning_tokens: 3 },
      total_tokens: 21,
    },
  });
  assert.deepEqual(
    translated.losses.map((loss) => loss.code),
    [
      "item_identity_omitted",
      "item_identity_omitted",
      "item_identity_omitted",
      "reasoning_omitted",
    ],
  );
  assert.deepEqual(translated.value, {
    id: "resp-1",
    object: "chat.completion",
    created: 1_725_000_000,
    model: "provider-model",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: "Checking",
          refusal: "Cannot disclose private reasoning.",
          tool_calls: [
            {
              id: "call-1",
              type: "function",
              function: { name: "lookup", arguments: '{"id":"42"}' },
            },
          ],
        },
        finish_reason: "tool_calls",
      },
    ],
    usage: {
      prompt_tokens: 14,
      completion_tokens: 7,
      total_tokens: 21,
      prompt_tokens_details: { cached_tokens: 4, cache_creation_tokens: 2 },
      completion_tokens_details: { reasoning_tokens: 3 },
    },
  });
});

test("Responses stream translates ordered text, tools, usage and terminal events", () => {
  const translator = new OpenAiResponsesToChatStreamTranslator();
  const response = {
    id: "resp-1",
    model: "provider-model",
    created_at: 1_725_000_000,
    status: "in_progress",
  };
  const outputs = [
    translator.feed({
      type: "event",
      event: "response.created",
      id: null,
      value: { type: "response.created", response },
    }),
    translator.feed({
      type: "event",
      event: "response.output_text.delta",
      id: null,
      value: { type: "response.output_text.delta", delta: "Hi" },
    }),
    translator.feed({
      type: "event",
      event: "response.output_item.added",
      id: null,
      value: {
        type: "response.output_item.added",
        item: {
          type: "function_call",
          id: "fc-1",
          call_id: "call-1",
          name: "lookup",
        },
      },
    }),
    translator.feed({
      type: "event",
      event: "response.function_call_arguments.delta",
      id: null,
      value: {
        type: "response.function_call_arguments.delta",
        item_id: "fc-1",
        delta: '{"id":"42"}',
      },
    }),
    translator.feed({
      type: "event",
      event: "response.completed",
      id: null,
      value: {
        type: "response.completed",
        response: {
          ...response,
          status: "completed",
          usage: {
            input_tokens: 8,
            input_tokens_details: { cached_tokens: 3 },
            output_tokens: 5,
            output_tokens_details: { reasoning_tokens: 2 },
            total_tokens: 13,
          },
        },
      },
    }),
  ].flatMap((result) => result.value);

  assert.equal(outputs.length, 6);
  assert.deepEqual(outputs.at(-1), { type: "done" });
  const terminal = outputs.at(-2) as { type: "chunk"; value: Record<string, unknown> };
  assert.deepEqual(terminal.value.usage, {
    prompt_tokens: 8,
    completion_tokens: 5,
    total_tokens: 13,
    prompt_tokens_details: { cached_tokens: 3 },
    completion_tokens_details: { reasoning_tokens: 2 },
  });
});

test("Responses stream rejects missing creation, unknown tool order and provider failure", () => {
  assert.throws(
    () =>
      new OpenAiResponsesToChatStreamTranslator().feed({
        type: "event",
        event: "response.output_text.delta",
        id: null,
        value: { type: "response.output_text.delta", delta: "x" },
      }),
    TransportTranslationError,
  );

  const translator = new OpenAiResponsesToChatStreamTranslator();
  translator.feed({
    type: "event",
    event: "response.created",
    id: null,
    value: {
      type: "response.created",
      response: { id: "resp-1", model: "provider-model", status: "in_progress" },
    },
  });
  assert.throws(
    () =>
      translator.feed({
        type: "event",
        event: "response.function_call_arguments.delta",
        id: null,
        value: {
          type: "response.function_call_arguments.delta",
          item_id: "fc-missing",
          delta: "{}",
        },
      }),
    TransportTranslationError,
  );
  assert.throws(
    () =>
      translator.feed({
        type: "event",
        event: "response.failed",
        id: null,
        value: { type: "response.failed", response: { id: "resp-1" } },
      }),
    TransportTranslationError,
  );

  const inconsistent = new OpenAiResponsesToChatStreamTranslator();
  inconsistent.feed({
    type: "event",
    event: "response.created",
    id: null,
    value: {
      type: "response.created",
      response: { id: "resp-2", model: "provider-model", status: "in_progress" },
    },
  });
  assert.throws(
    () =>
      inconsistent.feed({
        type: "event",
        event: "response.completed",
        id: null,
        value: {
          type: "response.completed",
          response: { id: "resp-2", model: "provider-model", status: "incomplete" },
        },
      }),
    TransportTranslationError,
  );
});

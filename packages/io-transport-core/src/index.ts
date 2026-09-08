/**
 * Selected concepts are adapted from 9router's MIT-licensed translation and
 * stream helpers at commit eb712ca821f0ba6bc41043fbd14494c5af5daba5.
 * The implementation is intentionally rewritten around I/O's strict,
 * persistence-free transport contract. See THIRD_PARTY_NOTICES.md.
 */

const DEFAULT_MAX_SSE_FRAME_BYTES = 256 * 1_024;

export type TransportFormat = "openai_chat" | "openai_responses" | "anthropic" | "gemini";

export type TransportFinishReason = "stop" | "length" | "tool_calls" | "content_filter" | "unknown";

export type TransportUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  cachedInputTokens?: number;
  cacheCreationInputTokens?: number;
  reasoningTokens?: number;
};

export type TransportCapabilities = {
  streaming: boolean;
  tools: boolean;
  structuredOutput: boolean;
  vision: boolean;
  audio: boolean;
};

export type TransportProvenance = {
  source: "indus_orbit" | "9router_adapted";
  sourceRevision?: string;
  reviewedAt: string;
};

export type TransportDescriptor<Request = unknown, Chunk = unknown> = {
  id: string;
  sourceFormat: TransportFormat;
  targetFormat: TransportFormat;
  capabilities: TransportCapabilities;
  provenance: TransportProvenance;
  translateRequest(input: Request): unknown;
  translateChunk(input: Chunk): unknown;
  normalizeUsage(input: unknown): TransportUsage | null;
};

export type SseFrame = {
  event: string | null;
  id: string | null;
  data: string;
  retry: number | null;
};

export type JsonSseFrame =
  | { type: "event"; event: string | null; id: string | null; value: unknown }
  | { type: "done"; event: string | null; id: string | null };

export type TransportStreamOutput = { type: "chunk"; value: unknown } | { type: "done" };

export type TranslationLoss = {
  code:
    | "developer_role_folded"
    | "named_participant_omitted"
    | "remote_image_omitted"
    | "reasoning_omitted"
    | "structured_output_not_native"
    | "unknown_content_omitted";
  path: string;
  detail: string;
};

export type TranslationResult<T> = {
  value: T;
  losses: TranslationLoss[];
};

export class TransportDecodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TransportDecodeError";
  }
}

export class TransportTranslationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TransportTranslationError";
  }
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function tokenCount(value: unknown) {
  return Number.isSafeInteger(value) && (value as number) >= 0 ? (value as number) : undefined;
}

function firstTokenCount(row: Record<string, unknown>, names: string[]) {
  for (const name of names) {
    const value = tokenCount(row[name]);
    if (value !== undefined) return value;
  }
  return undefined;
}

function optionalUsage(usage: TransportUsage) {
  return Object.values(usage).some((value) => value !== undefined) ? usage : null;
}

export function normalizeTransportUsage(
  value: unknown,
  format: TransportFormat,
): TransportUsage | null {
  const usage = record(value);
  if (!usage) return null;

  if (format === "anthropic") {
    return optionalUsage({
      inputTokens: tokenCount(usage.input_tokens),
      outputTokens: tokenCount(usage.output_tokens),
      cachedInputTokens: tokenCount(usage.cache_read_input_tokens),
      cacheCreationInputTokens: tokenCount(usage.cache_creation_input_tokens),
    });
  }

  if (format === "gemini") {
    return optionalUsage({
      inputTokens: tokenCount(usage.promptTokenCount),
      outputTokens: tokenCount(usage.candidatesTokenCount),
      totalTokens: tokenCount(usage.totalTokenCount),
      cachedInputTokens: tokenCount(usage.cachedContentTokenCount),
      reasoningTokens: tokenCount(usage.thoughtsTokenCount),
    });
  }

  const inputDetails = record(usage.prompt_tokens_details ?? usage.input_tokens_details);
  const outputDetails = record(usage.completion_tokens_details ?? usage.output_tokens_details);
  return optionalUsage({
    inputTokens: firstTokenCount(usage, ["prompt_tokens", "input_tokens"]),
    outputTokens: firstTokenCount(usage, ["completion_tokens", "output_tokens"]),
    totalTokens: tokenCount(usage.total_tokens),
    cachedInputTokens: inputDetails
      ? firstTokenCount(inputDetails, ["cached_tokens", "cache_read_tokens"])
      : undefined,
    cacheCreationInputTokens: inputDetails
      ? firstTokenCount(inputDetails, ["cache_creation_tokens", "cache_write_tokens"])
      : undefined,
    reasoningTokens: outputDetails ? tokenCount(outputDetails.reasoning_tokens) : undefined,
  });
}

export function normalizeFinishReason(
  value: unknown,
  format: TransportFormat,
): TransportFinishReason {
  if (typeof value !== "string" || !value.trim()) return "unknown";
  const reason = value.trim();

  if (format === "anthropic") {
    if (reason === "end_turn" || reason === "stop_sequence" || reason === "pause_turn")
      return "stop";
    if (reason === "max_tokens") return "length";
    if (reason === "tool_use") return "tool_calls";
    if (reason === "refusal") return "content_filter";
    return "unknown";
  }

  if (format === "gemini") {
    const upper = reason.toUpperCase();
    if (upper === "STOP") return "stop";
    if (upper === "MAX_TOKENS") return "length";
    if (
      upper === "SAFETY" ||
      upper === "RECITATION" ||
      upper === "BLOCKLIST" ||
      upper === "PROHIBITED_CONTENT" ||
      upper === "SPII"
    ) {
      return "content_filter";
    }
    return "unknown";
  }

  if (reason === "stop") return "stop";
  if (reason === "length" || reason === "max_tokens") return "length";
  if (reason === "tool_calls" || reason === "tool_use") return "tool_calls";
  if (reason === "content_filter" || reason === "content-filter") return "content_filter";
  return "unknown";
}

function frameBoundary(buffer: string) {
  const matches = [buffer.indexOf("\n\n"), buffer.indexOf("\r\n\r\n"), buffer.indexOf("\r\r")]
    .filter((index) => index >= 0)
    .sort((left, right) => left - right);
  if (!matches.length) return null;
  const index = matches[0]!;
  const separatorLength = buffer.startsWith("\r\n\r\n", index) ? 4 : 2;
  return { index, separatorLength };
}

function decodeFrame(value: string): SseFrame | null {
  let event: string | null = null;
  let id: string | null = null;
  let retry: number | null = null;
  const data: string[] = [];

  for (const line of value.split(/\r\n|\r|\n/)) {
    if (!line || line.startsWith(":")) continue;
    const delimiter = line.indexOf(":");
    const field = delimiter < 0 ? line : line.slice(0, delimiter);
    const raw = delimiter < 0 ? "" : line.slice(delimiter + 1);
    const fieldValue = raw.startsWith(" ") ? raw.slice(1) : raw;
    if (field === "event") event = fieldValue || null;
    else if (field === "id" && !fieldValue.includes("\0")) id = fieldValue || null;
    else if (field === "data") data.push(fieldValue);
    else if (field === "retry" && /^\d+$/.test(fieldValue)) {
      const retryValue = Number(fieldValue);
      if (Number.isSafeInteger(retryValue)) retry = retryValue;
    }
  }

  if (!data.length && event === null && id === null && retry === null) return null;
  return { event, id, data: data.join("\n"), retry };
}

export class SseFrameDecoder {
  #buffer = "";
  readonly #maximumFrameBytes: number;

  constructor(maximumFrameBytes = DEFAULT_MAX_SSE_FRAME_BYTES) {
    if (!Number.isSafeInteger(maximumFrameBytes) || maximumFrameBytes < 1) {
      throw new TransportDecodeError("The SSE frame limit is invalid.");
    }
    this.#maximumFrameBytes = maximumFrameBytes;
  }

  feed(chunk: string) {
    this.#buffer += chunk;
    const frames: SseFrame[] = [];

    while (true) {
      const boundary = frameBoundary(this.#buffer);
      if (!boundary) break;
      const raw = this.#buffer.slice(0, boundary.index);
      this.#buffer = this.#buffer.slice(boundary.index + boundary.separatorLength);
      if (new TextEncoder().encode(raw).byteLength > this.#maximumFrameBytes) {
        this.#buffer = "";
        throw new TransportDecodeError("The provider SSE frame exceeded the safety limit.");
      }
      const decoded = decodeFrame(raw);
      if (decoded) frames.push(decoded);
    }

    if (new TextEncoder().encode(this.#buffer).byteLength > this.#maximumFrameBytes) {
      this.#buffer = "";
      throw new TransportDecodeError("The provider SSE frame exceeded the safety limit.");
    }
    return frames;
  }

  flush() {
    if (!this.#buffer) return [];
    const raw = this.#buffer;
    this.#buffer = "";
    if (new TextEncoder().encode(raw).byteLength > this.#maximumFrameBytes) {
      throw new TransportDecodeError("The provider SSE frame exceeded the safety limit.");
    }
    const frame = decodeFrame(raw);
    return frame ? [frame] : [];
  }
}

export function decodeJsonSseFrame(frame: SseFrame): JsonSseFrame {
  if (frame.data.trim() === "[DONE]") {
    return { type: "done", event: frame.event, id: frame.id };
  }
  try {
    return { type: "event", event: frame.event, id: frame.id, value: JSON.parse(frame.data) };
  } catch {
    throw new TransportDecodeError("The provider returned an invalid JSON SSE frame.");
  }
}

export function createTransportRegistry(descriptors: TransportDescriptor[]) {
  const registry = new Map<string, TransportDescriptor>();
  for (const descriptor of descriptors) {
    if (!/^[a-z0-9][a-z0-9._-]{2,127}$/.test(descriptor.id)) {
      throw new Error(`Invalid transport descriptor: ${descriptor.id}`);
    }
    if (registry.has(descriptor.id)) {
      throw new Error(`Duplicate transport descriptor: ${descriptor.id}`);
    }
    registry.set(
      descriptor.id,
      Object.freeze({
        ...descriptor,
        capabilities: Object.freeze({ ...descriptor.capabilities }),
        provenance: Object.freeze({ ...descriptor.provenance }),
      }),
    );
  }
  return Object.freeze({
    get(id: string) {
      return registry.get(id) ?? null;
    },
    list() {
      return Array.from(registry.values());
    },
  });
}

function boundedString(value: unknown, name: string, maximum = 1_048_576) {
  if (typeof value !== "string" || value.length > maximum) {
    throw new TransportTranslationError(`The ${name} is invalid.`);
  }
  return value;
}

function requiredString(value: unknown, name: string, maximum = 256) {
  const result = boundedString(value, name, maximum).trim();
  if (!result) throw new TransportTranslationError(`The ${name} is required.`);
  return result;
}

function positiveTokenLimit(value: unknown) {
  if (!Number.isSafeInteger(value) || (value as number) < 1 || (value as number) > 1_000_000) {
    throw new TransportTranslationError("A bounded max_tokens value is required.");
  }
  return value as number;
}

function openAiTextBlocks(
  content: unknown,
  path: string,
  losses: TranslationLoss[],
): Array<Record<string, unknown>> {
  if (typeof content === "string") return content ? [{ type: "text", text: content }] : [];
  if (!Array.isArray(content)) {
    if (content === null || content === undefined) return [];
    throw new TransportTranslationError(`The ${path} content is invalid.`);
  }

  return content.flatMap((value, index): Array<Record<string, unknown>> => {
    const part = record(value);
    if (!part) throw new TransportTranslationError(`The ${path} content part is invalid.`);
    if (part.type === "text" || part.type === "input_text") {
      return [{ type: "text", text: boundedString(part.text, `${path} text`) }];
    }
    if (part.type === "image_url" || part.type === "input_image") {
      const image = record(part.image_url);
      const urlValue = image?.url ?? part.image_url;
      const url = typeof urlValue === "string" ? urlValue : null;
      const match = url?.match(/^data:(image\/(?:jpeg|png|gif|webp));base64,([A-Za-z0-9+/=]+)$/);
      if (match) {
        return [
          {
            type: "image",
            source: { type: "base64", media_type: match[1], data: match[2] },
          },
        ];
      }
      losses.push({
        code: "remote_image_omitted",
        path: `${path}.content[${index}]`,
        detail: "Only explicit base64 image data is translated at this boundary.",
      });
      return [];
    }
    losses.push({
      code: "unknown_content_omitted",
      path: `${path}.content[${index}]`,
      detail: "The source content type has no reviewed Anthropic mapping.",
    });
    return [];
  });
}

function pushAnthropicMessage(
  messages: Array<Record<string, unknown>>,
  role: "user" | "assistant",
  blocks: Array<Record<string, unknown>>,
) {
  if (!blocks.length) return;
  const previous = messages.at(-1);
  if (previous?.role === role && Array.isArray(previous.content)) {
    previous.content = [...previous.content, ...blocks];
    return;
  }
  messages.push({ role, content: blocks });
}

function anthropicTools(value: unknown) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > 128) {
    throw new TransportTranslationError("The tools array is invalid.");
  }
  return value.map((item, index) => {
    const tool = record(item);
    const fn = tool ? record(tool.function) : null;
    if (!tool || tool.type !== "function" || !fn) {
      throw new TransportTranslationError(`The tools[${index}] definition is invalid.`);
    }
    const inputSchema = record(fn.parameters) ?? { type: "object", properties: {} };
    return {
      name: requiredString(fn.name, `tools[${index}] name`, 128),
      ...(typeof fn.description === "string"
        ? { description: boundedString(fn.description, `tools[${index}] description`, 8_192) }
        : {}),
      input_schema: inputSchema,
    };
  });
}

function anthropicToolChoice(value: unknown, parallel: unknown) {
  if (value === undefined && parallel === undefined) return undefined;
  let choice: Record<string, unknown>;
  if (value === "required") choice = { type: "any" };
  else if (value === "auto" || value === undefined) choice = { type: "auto" };
  else if (value === "none") return undefined;
  else {
    const object = record(value);
    const fn = object ? record(object.function) : null;
    choice = { type: "tool", name: requiredString(fn?.name, "tool choice name", 128) };
  }
  if (parallel === false) choice.disable_parallel_tool_use = true;
  return choice;
}

export function translateOpenAiChatToAnthropic(input: unknown): TranslationResult<unknown> {
  const source = record(input);
  if (!source) throw new TransportTranslationError("The OpenAI Chat request is invalid.");
  const model = requiredString(source.model, "model");
  if (!Array.isArray(source.messages) || !source.messages.length || source.messages.length > 512) {
    throw new TransportTranslationError("The messages array is invalid.");
  }

  const losses: TranslationLoss[] = [];
  const system: Array<Record<string, unknown>> = [];
  const messages: Array<Record<string, unknown>> = [];

  source.messages.forEach((value, index) => {
    const message = record(value);
    if (!message) throw new TransportTranslationError(`The messages[${index}] value is invalid.`);
    const role = requiredString(message.role, `messages[${index}] role`, 32);
    const path = `messages[${index}]`;
    if (typeof message.name === "string" && message.name.trim()) {
      losses.push({
        code: "named_participant_omitted",
        path: `${path}.name`,
        detail: "Anthropic Messages has no equivalent participant-name field.",
      });
    }
    if (role === "system" || role === "developer") {
      if (role === "developer") {
        losses.push({
          code: "developer_role_folded",
          path: `${path}.role`,
          detail: "The developer instruction is folded into the top-level system sequence.",
        });
      }
      system.push(...openAiTextBlocks(message.content, path, losses));
      return;
    }
    if (role === "tool") {
      const toolCallId = requiredString(message.tool_call_id, `${path} tool_call_id`, 256);
      const blocks = [
        {
          type: "tool_result",
          tool_use_id: toolCallId,
          content: boundedString(message.content ?? "", `${path} content`),
        },
      ];
      pushAnthropicMessage(messages, "user", blocks);
      return;
    }
    if (role !== "user" && role !== "assistant") {
      throw new TransportTranslationError(`The ${path} role is unsupported.`);
    }
    const blocks = openAiTextBlocks(message.content, path, losses);
    if (role === "assistant" && message.tool_calls !== undefined) {
      if (!Array.isArray(message.tool_calls) || message.tool_calls.length > 128) {
        throw new TransportTranslationError(`The ${path} tool calls are invalid.`);
      }
      message.tool_calls.forEach((callValue, callIndex) => {
        const call = record(callValue);
        const fn = call ? record(call.function) : null;
        if (!call || call.type !== "function" || !fn) {
          throw new TransportTranslationError(
            `The ${path}.tool_calls[${callIndex}] value is invalid.`,
          );
        }
        const argumentsText = boundedString(
          fn.arguments,
          `${path}.tool_calls[${callIndex}] arguments`,
        );
        let argumentsValue: unknown;
        try {
          argumentsValue = JSON.parse(argumentsText);
        } catch {
          throw new TransportTranslationError(
            `The ${path}.tool_calls[${callIndex}] arguments are not valid JSON.`,
          );
        }
        if (!record(argumentsValue)) {
          throw new TransportTranslationError(
            `The ${path}.tool_calls[${callIndex}] arguments must decode to an object.`,
          );
        }
        blocks.push({
          type: "tool_use",
          id: requiredString(call.id, `${path}.tool_calls[${callIndex}] id`, 256),
          name: requiredString(fn.name, `${path}.tool_calls[${callIndex}] name`, 128),
          input: argumentsValue,
        });
      });
    }
    pushAnthropicMessage(messages, role, blocks);
  });

  if (!messages.length) {
    throw new TransportTranslationError("The translated request has no user or assistant message.");
  }

  const tools = anthropicTools(source.tools);
  const toolChoice = anthropicToolChoice(source.tool_choice, source.parallel_tool_calls);
  const responseFormat = record(source.response_format);
  if (responseFormat && responseFormat.type !== "text") {
    losses.push({
      code: "structured_output_not_native",
      path: "response_format",
      detail: "The caller must enforce the schema or use a reviewed tool-based mapping.",
    });
  }
  const stop = source.stop;
  const stopSequences =
    typeof stop === "string"
      ? [stop]
      : Array.isArray(stop) && stop.every((entry) => typeof entry === "string")
        ? stop
        : undefined;
  if (stop !== undefined && stopSequences === undefined) {
    throw new TransportTranslationError("The stop sequence is invalid.");
  }

  return {
    value: {
      model,
      max_tokens: positiveTokenLimit(source.max_completion_tokens ?? source.max_tokens),
      messages,
      ...(system.length ? { system } : {}),
      ...(tools?.length && source.tool_choice !== "none" ? { tools } : {}),
      ...(toolChoice ? { tool_choice: toolChoice } : {}),
      ...(stopSequences?.length ? { stop_sequences: stopSequences } : {}),
      ...(typeof source.temperature === "number" ? { temperature: source.temperature } : {}),
      ...(typeof source.top_p === "number" ? { top_p: source.top_p } : {}),
      ...(source.stream === true ? { stream: true } : {}),
    },
    losses,
  };
}

export function translateAnthropicMessageToOpenAiChat(input: unknown): TranslationResult<unknown> {
  const source = record(input);
  if (!source || !Array.isArray(source.content)) {
    throw new TransportTranslationError("The Anthropic response is invalid.");
  }
  const losses: TranslationLoss[] = [];
  const text: string[] = [];
  const toolCalls: Array<Record<string, unknown>> = [];
  source.content.forEach((value, index) => {
    const block = record(value);
    if (!block) throw new TransportTranslationError(`The content[${index}] block is invalid.`);
    if (block.type === "text") {
      text.push(boundedString(block.text, `content[${index}] text`));
      return;
    }
    if (block.type === "tool_use") {
      const inputObject = record(block.input);
      if (!inputObject) {
        throw new TransportTranslationError(`The content[${index}] tool input is invalid.`);
      }
      toolCalls.push({
        id: requiredString(block.id, `content[${index}] tool id`, 256),
        type: "function",
        function: {
          name: requiredString(block.name, `content[${index}] tool name`, 128),
          arguments: JSON.stringify(inputObject),
        },
      });
      return;
    }
    if (block.type === "thinking" || block.type === "redacted_thinking") {
      losses.push({
        code: "reasoning_omitted",
        path: `content[${index}]`,
        detail: "Reasoning content is not exposed through the OpenAI Chat message.",
      });
      return;
    }
    losses.push({
      code: "unknown_content_omitted",
      path: `content[${index}]`,
      detail: "The Anthropic content block has no reviewed OpenAI Chat mapping.",
    });
  });

  const finishReason = normalizeFinishReason(source.stop_reason, "anthropic");
  const usage = normalizeTransportUsage(source.usage, "anthropic");
  const promptTokens = usage
    ? (usage.inputTokens ?? 0) +
      (usage.cachedInputTokens ?? 0) +
      (usage.cacheCreationInputTokens ?? 0)
    : undefined;
  return {
    value: {
      id: requiredString(source.id, "response id", 256),
      object: "chat.completion",
      model: requiredString(source.model, "response model", 256),
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: text.join(""),
            ...(toolCalls.length ? { tool_calls: toolCalls } : {}),
          },
          finish_reason: finishReason,
        },
      ],
      ...(usage
        ? {
            usage: {
              ...(promptTokens !== undefined ? { prompt_tokens: promptTokens } : {}),
              ...(usage.outputTokens !== undefined
                ? { completion_tokens: usage.outputTokens }
                : {}),
              ...(promptTokens !== undefined && usage.outputTokens !== undefined
                ? { total_tokens: promptTokens + usage.outputTokens }
                : {}),
              ...(usage.cachedInputTokens !== undefined ||
              usage.cacheCreationInputTokens !== undefined
                ? {
                    prompt_tokens_details: {
                      ...(usage.cachedInputTokens !== undefined
                        ? { cached_tokens: usage.cachedInputTokens }
                        : {}),
                      ...(usage.cacheCreationInputTokens !== undefined
                        ? { cache_creation_tokens: usage.cacheCreationInputTokens }
                        : {}),
                    },
                  }
                : {}),
            },
          }
        : {}),
    },
    losses,
  };
}

function openAiStreamUsage(usage: TransportUsage) {
  const promptTokens =
    (usage.inputTokens ?? 0) +
    (usage.cachedInputTokens ?? 0) +
    (usage.cacheCreationInputTokens ?? 0);
  const completionTokens = usage.outputTokens ?? 0;
  return {
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: promptTokens + completionTokens,
    ...(usage.cachedInputTokens !== undefined || usage.cacheCreationInputTokens !== undefined
      ? {
          prompt_tokens_details: {
            ...(usage.cachedInputTokens !== undefined
              ? { cached_tokens: usage.cachedInputTokens }
              : {}),
            ...(usage.cacheCreationInputTokens !== undefined
              ? { cache_creation_tokens: usage.cacheCreationInputTokens }
              : {}),
          },
        }
      : {}),
  };
}

function mergeTransportUsage(current: TransportUsage, update: TransportUsage) {
  return {
    ...current,
    ...(update.inputTokens !== undefined ? { inputTokens: update.inputTokens } : {}),
    ...(update.outputTokens !== undefined ? { outputTokens: update.outputTokens } : {}),
    ...(update.totalTokens !== undefined ? { totalTokens: update.totalTokens } : {}),
    ...(update.cachedInputTokens !== undefined
      ? { cachedInputTokens: update.cachedInputTokens }
      : {}),
    ...(update.cacheCreationInputTokens !== undefined
      ? { cacheCreationInputTokens: update.cacheCreationInputTokens }
      : {}),
    ...(update.reasoningTokens !== undefined ? { reasoningTokens: update.reasoningTokens } : {}),
  };
}

export class AnthropicToOpenAiChatStreamTranslator {
  #id: string | null = null;
  #model: string | null = null;
  #usage: TransportUsage = {};
  #stopped = false;

  #chunk(
    delta: Record<string, unknown>,
    finishReason: TransportFinishReason | null = null,
  ): { type: "chunk"; value: Record<string, unknown> } {
    if (!this.#id || !this.#model) {
      throw new TransportTranslationError("Anthropic stream content arrived before message_start.");
    }
    return {
      type: "chunk" as const,
      value: {
        id: this.#id,
        object: "chat.completion.chunk",
        model: this.#model,
        choices: [{ index: 0, delta, finish_reason: finishReason }],
      },
    };
  }

  feed(frame: JsonSseFrame): TranslationResult<TransportStreamOutput[]> {
    if (this.#stopped) {
      throw new TransportTranslationError(
        "Anthropic stream data arrived after its terminal event.",
      );
    }
    if (frame.type === "done") {
      this.#stopped = true;
      return { value: [{ type: "done" }], losses: [] };
    }
    const event = record(frame.value);
    if (!event) throw new TransportTranslationError("The Anthropic stream event is invalid.");
    const type = typeof event.type === "string" ? event.type : frame.event;
    const losses: TranslationLoss[] = [];

    if (type === "ping") return { value: [], losses };
    if (type === "error") {
      throw new TransportTranslationError("The Anthropic stream returned a provider error.");
    }
    if (type === "message_start") {
      const message = record(event.message);
      if (!message) throw new TransportTranslationError("The message_start event is invalid.");
      this.#id = requiredString(message.id, "stream response id", 256);
      this.#model = requiredString(message.model, "stream response model", 256);
      this.#usage = normalizeTransportUsage(message.usage, "anthropic") ?? {};
      return { value: [this.#chunk({ role: "assistant", content: "" })], losses };
    }
    if (type === "content_block_start") {
      const index = tokenCount(event.index);
      const block = record(event.content_block);
      if (index === undefined || !block) {
        throw new TransportTranslationError("The content_block_start event is invalid.");
      }
      if (block.type === "text") {
        const text = typeof block.text === "string" ? block.text : "";
        return { value: text ? [this.#chunk({ content: text })] : [], losses };
      }
      if (block.type === "tool_use") {
        return {
          value: [
            this.#chunk({
              tool_calls: [
                {
                  index,
                  id: requiredString(block.id, "stream tool id", 256),
                  type: "function",
                  function: {
                    name: requiredString(block.name, "stream tool name", 128),
                    arguments: "",
                  },
                },
              ],
            }),
          ],
          losses,
        };
      }
      if (block.type === "thinking" || block.type === "redacted_thinking") {
        losses.push({
          code: "reasoning_omitted",
          path: `content_block_start[${index}]`,
          detail: "Reasoning content is not exposed through the OpenAI Chat stream.",
        });
        return { value: [], losses };
      }
      losses.push({
        code: "unknown_content_omitted",
        path: `content_block_start[${index}]`,
        detail: "The Anthropic stream block has no reviewed OpenAI Chat mapping.",
      });
      return { value: [], losses };
    }
    if (type === "content_block_delta") {
      const index = tokenCount(event.index);
      const delta = record(event.delta);
      if (index === undefined || !delta) {
        throw new TransportTranslationError("The content_block_delta event is invalid.");
      }
      if (delta.type === "text_delta") {
        return {
          value: [this.#chunk({ content: boundedString(delta.text, "stream text delta") })],
          losses,
        };
      }
      if (delta.type === "input_json_delta") {
        return {
          value: [
            this.#chunk({
              tool_calls: [
                {
                  index,
                  function: {
                    arguments: boundedString(delta.partial_json, "stream tool argument delta"),
                  },
                },
              ],
            }),
          ],
          losses,
        };
      }
      if (delta.type === "thinking_delta" || delta.type === "signature_delta") {
        losses.push({
          code: "reasoning_omitted",
          path: `content_block_delta[${index}]`,
          detail: "Reasoning content is not exposed through the OpenAI Chat stream.",
        });
        return { value: [], losses };
      }
      losses.push({
        code: "unknown_content_omitted",
        path: `content_block_delta[${index}]`,
        detail: "The Anthropic stream delta has no reviewed OpenAI Chat mapping.",
      });
      return { value: [], losses };
    }
    if (type === "content_block_stop") return { value: [], losses };
    if (type === "message_delta") {
      const delta = record(event.delta);
      const usage = normalizeTransportUsage(event.usage, "anthropic");
      if (usage) this.#usage = mergeTransportUsage(this.#usage, usage);
      const reason = normalizeFinishReason(delta?.stop_reason, "anthropic");
      const chunk = this.#chunk({}, reason);
      chunk.value = { ...chunk.value, usage: openAiStreamUsage(this.#usage) };
      return { value: [chunk], losses };
    }
    if (type === "message_stop") {
      this.#stopped = true;
      return { value: [{ type: "done" }], losses };
    }

    losses.push({
      code: "unknown_content_omitted",
      path: "stream_event",
      detail: "The Anthropic stream event type has no reviewed OpenAI Chat mapping.",
    });
    return { value: [], losses };
  }
}

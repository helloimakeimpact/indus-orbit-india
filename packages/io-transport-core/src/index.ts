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

export class TransportDecodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TransportDecodeError";
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

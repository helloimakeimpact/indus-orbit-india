import { GatewayError } from "./errors.ts";
import type { GatewayMessage } from "./types.ts";
import { requireMessages } from "./validation.ts";

export type OpenAiChatRequest = {
  model: string;
  messages: GatewayMessage[];
};

function asRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new GatewayError("bad_request", 400, "Request body must be a JSON object.");
  }
  return value as Record<string, unknown>;
}

const unsupportedFields = [
  "audio",
  "frequency_penalty",
  "function_call",
  "functions",
  "logit_bias",
  "logprobs",
  "max_completion_tokens",
  "max_tokens",
  "modalities",
  "n",
  "parallel_tool_calls",
  "presence_penalty",
  "reasoning_effort",
  "response_format",
  "seed",
  "service_tier",
  "stop",
  "store",
  "stream_options",
  "temperature",
  "tool_choice",
  "tools",
  "top_logprobs",
  "top_p",
  "web_search_options",
] as const;

export function parseOpenAiChatRequest(value: unknown): OpenAiChatRequest {
  const body = asRecord(value);
  const unknown = Object.keys(body).find(
    (field) => field !== "model" && field !== "messages" && field !== "stream",
  );
  if (unknown && !unsupportedFields.includes(unknown as (typeof unsupportedFields)[number])) {
    throw new GatewayError(
      "bad_request",
      400,
      `The ${unknown} field is not recognized by this compatibility release.`,
    );
  }
  if (body.stream !== undefined && body.stream !== false) {
    throw new GatewayError(
      "bad_request",
      400,
      "Streaming is not available in this compatibility release. Set stream to false.",
    );
  }
  const unsupported = unsupportedFields.find((field) => body[field] !== undefined);
  if (unsupported) {
    throw new GatewayError(
      "bad_request",
      400,
      `The ${unsupported} field is not available in this compatibility release.`,
    );
  }
  if (typeof body.model !== "string" || !body.model.trim() || body.model.length > 200) {
    throw new GatewayError("bad_request", 400, "A valid model identifier is required.");
  }
  return { model: body.model.trim(), messages: requireMessages(body.messages) };
}

export function requireApiKeyAuthorization(value: string | null) {
  if (!value?.startsWith("Bearer ")) {
    throw new GatewayError("unauthorized", 401, "A Bearer I/O API key is required.");
  }
  const rawKey = value.slice(7);
  if (!/^io_test_[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]{43}$/.test(rawKey)) {
    throw new GatewayError("unauthorized", 401, "The I/O API key is invalid.");
  }
  return rawKey;
}

export function requireClientIdempotencyKey(value: string | null) {
  if (value === null) return crypto.randomUUID();
  if (!/^[A-Za-z0-9][A-Za-z0-9_.:-]{7,127}$/.test(value)) {
    throw new GatewayError(
      "bad_request",
      400,
      "Idempotency-Key must contain 8 to 128 safe characters.",
    );
  }
  return value;
}

export async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

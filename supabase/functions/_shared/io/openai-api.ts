import { GatewayError } from "./errors.ts";
import type {
  GatewayImageContentPart,
  GatewayInferenceOptions,
  GatewayMessage,
  GatewayResponseFormat,
  GatewayTextContentPart,
  GatewayToolCall,
  GatewayToolDefinition,
} from "./types.ts";

export type OpenAiChatRequest = {
  model: string;
  messages: GatewayMessage[];
  stream: boolean;
  includeUsage: boolean;
  inferenceOptions: GatewayInferenceOptions;
};

export type OpenAiResponsesRequest = OpenAiChatRequest & {
  instructions?: string;
};

const modelPattern = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/;
const functionNamePattern = /^[A-Za-z_][A-Za-z0-9_-]{0,63}$/;
const allowedChatFields = new Set([
  "model",
  "messages",
  "stream",
  "stream_options",
  "max_tokens",
  "max_completion_tokens",
  "tools",
  "tool_choice",
  "parallel_tool_calls",
  "response_format",
]);
const allowedResponsesFields = new Set([
  "model",
  "input",
  "instructions",
  "stream",
  "max_output_tokens",
  "tools",
  "tool_choice",
  "parallel_tool_calls",
  "text",
  "store",
]);

export function rejectBrowserApiKeyRequest(origin: string | null) {
  if (origin !== null) {
    throw new GatewayError(
      "forbidden",
      403,
      "I/O API keys are for server, CLI, and local-agent use only. Use the signed-in I/O web application from a browser.",
    );
  }
}

function asRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new GatewayError("bad_request", 400, "Request body must be a JSON object.");
  }
  return value as Record<string, unknown>;
}

function requireKnownFields(body: Record<string, unknown>, allowed: ReadonlySet<string>) {
  const unknown = Object.keys(body).find((field) => !allowed.has(field));
  if (unknown) {
    throw new GatewayError(
      "bad_request",
      400,
      `The ${unknown} field is not available in this I/O API release.`,
    );
  }
}

function requireModel(value: unknown) {
  if (typeof value !== "string" || !modelPattern.test(value.trim())) {
    throw new GatewayError("bad_request", 400, "A valid model identifier is required.");
  }
  return value.trim();
}

function readBoolean(value: unknown, fallback: boolean, field: string) {
  if (value === undefined) return fallback;
  if (typeof value !== "boolean") {
    throw new GatewayError("bad_request", 400, `The ${field} field must be a boolean.`);
  }
  return value;
}

function readOutputLimit(value: unknown) {
  if (value === undefined) return undefined;
  if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > 4_096) {
    throw new GatewayError(
      "bad_request",
      400,
      "The output token limit must be an integer from 1 to 4,096.",
    );
  }
  return value as number;
}

function readStreamOptions(stream: boolean, value: unknown) {
  if (value === undefined) return false;
  if (!stream) {
    throw new GatewayError("bad_request", 400, "stream_options requires stream to be true.");
  }
  const options = asRecord(value);
  requireKnownFields(options, new Set(["include_usage"]));
  return readBoolean(options.include_usage, false, "stream_options.include_usage");
}

function readImagePart(value: Record<string, unknown>): GatewayImageContentPart {
  const image = asRecord(value.image_url);
  requireKnownFields(image, new Set(["url", "detail"]));
  if (typeof image.url !== "string" || image.url.length > 2_048) {
    throw new GatewayError("bad_request", 400, "Image URLs must be at most 2,048 characters.");
  }
  let url: URL;
  try {
    url = new URL(image.url);
  } catch {
    throw new GatewayError("bad_request", 400, "Image URLs must be valid HTTPS URLs.");
  }
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new GatewayError("bad_request", 400, "Image URLs must be credential-free HTTPS URLs.");
  }
  const detail = image.detail;
  if (detail !== undefined && detail !== "auto" && detail !== "low" && detail !== "high") {
    throw new GatewayError("bad_request", 400, "Image detail must be auto, low, or high.");
  }
  return { type: "image_url", imageUrl: url.toString(), ...(detail ? { detail } : {}) };
}

function readMessageContent(value: unknown, role: GatewayMessage["role"]) {
  if (value === null && role === "assistant") return null;
  if (typeof value === "string") {
    const content = value.trim();
    if (!content || content.length > 8_000) {
      throw new GatewayError("bad_request", 400, "Message content must be 1 to 8,000 characters.");
    }
    return content;
  }
  if (!Array.isArray(value) || value.length < 1 || value.length > 16) {
    throw new GatewayError("bad_request", 400, "Message content must be text or 1 to 16 parts.");
  }
  const parts = value.map((raw): GatewayTextContentPart | GatewayImageContentPart => {
    const part = asRecord(raw);
    if (part.type === "text") {
      if (typeof part.text !== "string" || !part.text.trim() || part.text.length > 8_000) {
        throw new GatewayError("bad_request", 400, "Text parts must be 1 to 8,000 characters.");
      }
      return { type: "text", text: part.text.trim() };
    }
    if (part.type === "image_url" && role === "user") return readImagePart(part);
    throw new GatewayError("bad_request", 400, "Only text and user image_url parts are supported.");
  });
  if (parts.filter((part) => part.type === "image_url").length > 4) {
    throw new GatewayError("bad_request", 400, "At most four images are supported per message.");
  }
  return parts;
}

function readToolCalls(value: unknown): GatewayToolCall[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length < 1 || value.length > 16) {
    throw new GatewayError("bad_request", 400, "tool_calls must contain 1 to 16 calls.");
  }
  return value.map((raw) => {
    const call = asRecord(raw);
    const fn = asRecord(call.function);
    if (
      typeof call.id !== "string" ||
      !call.id ||
      call.id.length > 128 ||
      call.type !== "function" ||
      typeof fn.name !== "string" ||
      !functionNamePattern.test(fn.name) ||
      typeof fn.arguments !== "string" ||
      fn.arguments.length > 32_000
    ) {
      throw new GatewayError("bad_request", 400, "An assistant tool call is invalid.");
    }
    return {
      id: call.id,
      type: "function" as const,
      function: { name: fn.name, arguments: fn.arguments },
    };
  });
}

function readMessages(value: unknown): GatewayMessage[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 32) {
    throw new GatewayError("bad_request", 400, "Provide between 1 and 32 messages.");
  }
  const messages = value.map((raw): GatewayMessage => {
    const message = asRecord(raw);
    const role = message.role;
    if (role !== "system" && role !== "user" && role !== "assistant" && role !== "tool") {
      throw new GatewayError("bad_request", 400, "A message role is invalid.");
    }
    const content = readMessageContent(message.content, role);
    const name = message.name;
    if (name !== undefined && (typeof name !== "string" || !functionNamePattern.test(name))) {
      throw new GatewayError("bad_request", 400, "A message name is invalid.");
    }
    const toolCallId = message.tool_call_id;
    if (
      role === "tool" &&
      (typeof toolCallId !== "string" || !toolCallId || toolCallId.length > 128)
    ) {
      throw new GatewayError("bad_request", 400, "Tool messages require a tool_call_id.");
    }
    const toolCalls = role === "assistant" ? readToolCalls(message.tool_calls) : undefined;
    if (content === null && !toolCalls?.length) {
      throw new GatewayError("bad_request", 400, "Assistant messages need content or tool calls.");
    }
    return {
      role,
      content,
      ...(typeof name === "string" ? { name } : {}),
      ...(typeof toolCallId === "string" ? { toolCallId } : {}),
      ...(toolCalls ? { toolCalls } : {}),
    };
  });
  if (JSON.stringify(messages).length > 96_000) {
    throw new GatewayError("bad_request", 400, "The total message input is too large.");
  }
  return messages;
}

function readTools(value: unknown, responsesShape = false): GatewayToolDefinition[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > 32) {
    throw new GatewayError("bad_request", 400, "tools must contain at most 32 function tools.");
  }
  return value.map((raw) => {
    const tool = asRecord(raw);
    const fn = responsesShape ? tool : asRecord(tool.function);
    if (tool.type !== "function") {
      throw new GatewayError("bad_request", 400, "Only function tools are supported.");
    }
    const name = fn.name;
    const description = fn.description;
    const parameters = fn.parameters;
    const strict = fn.strict;
    if (
      typeof name !== "string" ||
      !functionNamePattern.test(name) ||
      (description !== undefined &&
        (typeof description !== "string" || description.length > 1_024)) ||
      !parameters ||
      typeof parameters !== "object" ||
      Array.isArray(parameters) ||
      JSON.stringify(parameters).length > 32_000 ||
      (strict !== undefined && typeof strict !== "boolean")
    ) {
      throw new GatewayError("bad_request", 400, "A function tool definition is invalid.");
    }
    return {
      type: "function" as const,
      function: {
        name,
        ...(typeof description === "string" ? { description } : {}),
        parameters: parameters as Record<string, unknown>,
        ...(typeof strict === "boolean" ? { strict } : {}),
      },
    };
  });
}

function readToolChoice(
  value: unknown,
  responsesShape = false,
): GatewayInferenceOptions["toolChoice"] {
  if (value === undefined) return undefined;
  if (value === "none" || value === "auto" || value === "required") return value;
  const choice = asRecord(value);
  const fn = responsesShape ? choice : asRecord(choice.function);
  if (
    choice.type !== "function" ||
    typeof fn.name !== "string" ||
    !functionNamePattern.test(fn.name)
  ) {
    throw new GatewayError("bad_request", 400, "tool_choice is invalid.");
  }
  return { type: "function", name: fn.name };
}

function readResponseFormat(
  value: unknown,
  responsesShape = false,
): GatewayResponseFormat | undefined {
  if (value === undefined) return undefined;
  const format = asRecord(value);
  if (format.type === "text") return { type: "text" };
  if (format.type === "json_object") return { type: "json_object" };
  if (format.type !== "json_schema") {
    throw new GatewayError("bad_request", 400, "The structured output format is invalid.");
  }
  const definition = responsesShape ? format : asRecord(format.json_schema);
  if (
    typeof definition.name !== "string" ||
    !functionNamePattern.test(definition.name) ||
    (definition.description !== undefined &&
      (typeof definition.description !== "string" || definition.description.length > 1_024)) ||
    !definition.schema ||
    typeof definition.schema !== "object" ||
    Array.isArray(definition.schema) ||
    JSON.stringify(definition.schema).length > 64_000 ||
    (definition.strict !== undefined && typeof definition.strict !== "boolean")
  ) {
    throw new GatewayError("bad_request", 400, "The JSON schema definition is invalid.");
  }
  return {
    type: "json_schema",
    jsonSchema: {
      name: definition.name,
      ...(typeof definition.description === "string"
        ? { description: definition.description }
        : {}),
      schema: definition.schema as Record<string, unknown>,
      strict: definition.strict !== false,
    },
  };
}

function commonInferenceOptions(input: {
  tools: unknown;
  toolChoice: unknown;
  parallelToolCalls: unknown;
  responseFormat: unknown;
  outputLimit: unknown;
  responsesShape?: boolean;
}): GatewayInferenceOptions {
  return {
    maxOutputTokens: readOutputLimit(input.outputLimit),
    tools: readTools(input.tools, input.responsesShape),
    toolChoice: readToolChoice(input.toolChoice, input.responsesShape),
    parallelToolCalls: readBoolean(input.parallelToolCalls, true, "parallel_tool_calls"),
    responseFormat: readResponseFormat(input.responseFormat, input.responsesShape),
  };
}

export function parseOpenAiChatRequest(value: unknown): OpenAiChatRequest {
  const body = asRecord(value);
  requireKnownFields(body, allowedChatFields);
  if (body.max_tokens !== undefined && body.max_completion_tokens !== undefined) {
    throw new GatewayError("bad_request", 400, "Use only one output token limit field.");
  }
  const stream = readBoolean(body.stream, false, "stream");
  return {
    model: requireModel(body.model),
    messages: readMessages(body.messages),
    stream,
    includeUsage: readStreamOptions(stream, body.stream_options),
    inferenceOptions: commonInferenceOptions({
      tools: body.tools,
      toolChoice: body.tool_choice,
      parallelToolCalls: body.parallel_tool_calls,
      responseFormat: body.response_format,
      outputLimit: body.max_completion_tokens ?? body.max_tokens,
    }),
  };
}

function readResponsesInput(value: unknown): GatewayMessage[] {
  if (typeof value === "string") return readMessages([{ role: "user", content: value }]);
  if (!Array.isArray(value)) {
    throw new GatewayError("bad_request", 400, "Responses input must be text or an input array.");
  }
  const chatMessages = value.map((raw) => {
    const item = asRecord(raw);
    if (item.type === "function_call_output") {
      return {
        role: "tool",
        tool_call_id: item.call_id,
        content: item.output,
      };
    }
    if (item.type !== undefined && item.type !== "message") {
      throw new GatewayError("bad_request", 400, "This Responses input item is not supported.");
    }
    const content = Array.isArray(item.content)
      ? item.content.map((rawPart) => {
          const part = asRecord(rawPart);
          if (part.type === "input_text" || part.type === "output_text") {
            return { type: "text", text: part.text };
          }
          if (part.type === "input_image") {
            return { type: "image_url", image_url: { url: part.image_url, detail: part.detail } };
          }
          throw new GatewayError(
            "bad_request",
            400,
            "This Responses content part is not supported.",
          );
        })
      : item.content;
    return { role: item.role, content };
  });
  return readMessages(chatMessages);
}

export function parseOpenAiResponsesRequest(value: unknown): OpenAiResponsesRequest {
  const body = asRecord(value);
  requireKnownFields(body, allowedResponsesFields);
  if (body.store !== undefined && body.store !== false) {
    throw new GatewayError(
      "bad_request",
      400,
      "I/O Responses are stateless and privacy-minimised; store must be false.",
    );
  }
  const stream = readBoolean(body.stream, false, "stream");
  const instructions = body.instructions;
  if (
    instructions !== undefined &&
    (typeof instructions !== "string" || !instructions.trim() || instructions.length > 8_000)
  ) {
    throw new GatewayError("bad_request", 400, "Responses instructions are invalid.");
  }
  const messages = readResponsesInput(body.input);
  if (typeof instructions === "string") {
    messages.unshift({ role: "system", content: instructions.trim() });
  }
  const text = body.text === undefined ? undefined : asRecord(body.text);
  if (text) requireKnownFields(text, new Set(["format"]));
  return {
    model: requireModel(body.model),
    messages,
    stream,
    includeUsage: stream,
    ...(typeof instructions === "string" ? { instructions: instructions.trim() } : {}),
    inferenceOptions: commonInferenceOptions({
      tools: body.tools,
      toolChoice: body.tool_choice,
      parallelToolCalls: body.parallel_tool_calls,
      responseFormat: text?.format,
      outputLimit: body.max_output_tokens,
      responsesShape: true,
    }),
  };
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

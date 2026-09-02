import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { GatewayError } from "./errors.ts";
import { gatewayContentText, toOpenAiCompatibleMessage } from "./message-content.ts";
import { selectProviderRoute, type RouteInput } from "./routing.ts";
import { assertStructuredOutput } from "./structured-output.ts";
import type {
  GatewayInferenceOptions,
  GatewayMessage,
  GatewayToolCall,
  PartnerResult,
  ProviderConnection,
} from "./types.ts";

const supportedTiers = new Set(["economy", "balanced", "premium"]);
const supportedHealthStates = new Set(["healthy", "degraded", "unavailable", "unknown"]);
const supportedCircuitStates = new Set(["closed", "open", "half_open"]);
const secretReferencePattern = /^IO_PROVIDER_[A-Z0-9_]+_API_KEY$/;
const defaultOutputTokenAllowance = 1_024;
const maximumOutputTokenAllowance = 4_096;
const maximumProviderResponseBytes = 2 * 1_024 * 1_024;

export type ProviderChatOptions = GatewayInferenceOptions & {
  safetySubject?: string;
  abortSignal?: AbortSignal;
};

function createProviderAbortBoundary(callerSignal: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController();
  let timedOut = false;
  const abortFromCaller = () => controller.abort(callerSignal?.reason);
  if (callerSignal?.aborted) abortFromCaller();
  else callerSignal?.addEventListener("abort", abortFromCaller, { once: true });
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort(new DOMException("Provider request timed out.", "TimeoutError"));
  }, timeoutMs);

  return {
    signal: controller.signal,
    timedOut: () => timedOut,
    cleanup() {
      clearTimeout(timeout);
      callerSignal?.removeEventListener("abort", abortFromCaller);
    },
  };
}

type RegistryRow = Record<string, unknown>;

function readPositiveInteger(name: string, fallback: number, maximum: number) {
  const value = Deno.env.get(name);
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > maximum) {
    throw new GatewayError("internal_error", 500, `The ${name} value is invalid.`);
  }
  return parsed;
}

function readAffordabilityMultiplier() {
  const value = Deno.env.get("IO_MODEL_SELECTION_AFFORDABILITY_MULTIPLIER");
  if (!value) return 1.35;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 10) {
    throw new GatewayError(
      "internal_error",
      500,
      "The IO_MODEL_SELECTION_AFFORDABILITY_MULTIPLIER value is invalid.",
    );
  }
  return parsed;
}

function readSelectionTier() {
  const tier = Deno.env.get("IO_MODEL_SELECTION_TIER") ?? "balanced";
  if (!supportedTiers.has(tier)) {
    throw new GatewayError("internal_error", 500, "The IO_MODEL_SELECTION_TIER value is invalid.");
  }
  return tier as ProviderConnection["autoRouteTier"];
}

function asRecord(value: unknown): RegistryRow | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as RegistryRow)
    : null;
}

function readString(row: RegistryRow, key: string): string | null {
  const value = row[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function readNumber(row: RegistryRow, key: string): number | null {
  const value = row[key];
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function readNullableString(row: RegistryRow, key: string): string | null {
  const value = row[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function readConnection(row: RegistryRow): ProviderConnection | null {
  const integrationStyle = readString(row, "integration_style");
  const autoRouteTier = readString(row, "auto_route_tier");
  const endpointBaseUrl = readString(row, "endpoint_base_url");
  const secretReference = readString(row, "secret_reference");
  const capacitySourceId = readString(row, "capacity_source_id");
  const modelReleaseDate = readString(row, "model_release_date");
  const unitQuantity = readNumber(row, "unit_quantity");
  const inputPriceNanos = readNumber(row, "input_price_nanos");
  const outputPriceNanos = readNumber(row, "output_price_nanos");
  const capabilityVersion = readNumber(row, "capability_version");
  const priceVersion = readNumber(row, "price_version");
  const maxContextTokens =
    row.max_context_tokens === null ? null : readNumber(row, "max_context_tokens");
  const healthState = readString(row, "health_state");
  const circuitState = readString(row, "circuit_state");

  if (
    (integrationStyle !== "openai_compatible" && integrationStyle !== "native_adapter") ||
    (autoRouteTier !== "economy" && autoRouteTier !== "balanced" && autoRouteTier !== "premium") ||
    !endpointBaseUrl ||
    !secretReference ||
    !secretReferencePattern.test(secretReference) ||
    !capacitySourceId ||
    !modelReleaseDate ||
    !unitQuantity ||
    inputPriceNanos === null ||
    outputPriceNanos === null ||
    capabilityVersion === null ||
    priceVersion === null ||
    maxContextTokens === undefined ||
    !healthState ||
    !supportedHealthStates.has(healthState) ||
    !circuitState ||
    !supportedCircuitStates.has(circuitState)
  ) {
    return null;
  }

  const requiredStrings = [
    "endpoint_id",
    "provider_id",
    "provider_key",
    "provider_display_name",
    "model_id",
    "provider_model_id",
    "model_display_name",
    "endpoint_key",
    "capacity_mode",
    "retention_class",
    "currency_code",
  ].map((key) => readString(row, key));
  if (requiredStrings.some((value) => value === null)) return null;

  try {
    const url = new URL(endpointBaseUrl);
    if (url.protocol !== "https:" || url.username || url.password) return null;
  } catch {
    return null;
  }

  return {
    endpointId: requiredStrings[0]!,
    providerId: requiredStrings[1]!,
    providerKey: requiredStrings[2]!,
    providerDisplayName: requiredStrings[3]!,
    integrationStyle,
    modelId: requiredStrings[4]!,
    providerModelId: requiredStrings[5]!,
    modelDisplayName: requiredStrings[6]!,
    modelReleaseDate,
    modelDeprecationAt: readNullableString(row, "model_deprecation_at"),
    autoRouteTier,
    maxContextTokens,
    capacitySourceId,
    endpointKey: requiredStrings[7]!,
    capacityMode: requiredStrings[8]!,
    regionCode: readNullableString(row, "region_code"),
    residencyCountryCode: readNullableString(row, "residency_country_code"),
    retentionClass: requiredStrings[9]!,
    baseUrl: endpointBaseUrl.replace(/\/$/, ""),
    secretReference,
    capabilityVersion,
    priceVersion,
    currencyCode: requiredStrings[10]!,
    unitQuantity,
    inputPriceNanos,
    outputPriceNanos,
    supportsStreaming: row.supports_streaming === true,
    supportsTools: row.supports_tools === true,
    supportsStructuredOutput: row.supports_structured_output === true,
    supportsVision: row.supports_vision === true,
    supportsAudio: row.supports_audio === true,
    supportsCancellation: row.supports_cancellation === true,
    healthState: healthState as ProviderConnection["healthState"],
    circuitState: circuitState as ProviderConnection["circuitState"],
  };
}

function resolveSecret(reference: string) {
  if (!secretReferencePattern.test(reference)) {
    throw new GatewayError("internal_error", 500, "The provider secret reference is invalid.");
  }
  const secret = Deno.env.get(reference);
  if (!secret) {
    throw new GatewayError(
      "not_configured",
      503,
      "An approved provider connection is not configured.",
    );
  }
  return secret;
}

export async function loadReadyProviderConnections(
  admin: SupabaseClient,
): Promise<ProviderConnection[]> {
  const { data, error } = await admin.rpc("io_get_routable_endpoint_connections_v2");
  if (error) throw error;

  return (Array.isArray(data) ? data : [])
    .map((value) => asRecord(value))
    .flatMap((row) => (row ? [readConnection(row)] : []))
    .flatMap((connection) => (connection ? [connection] : []));
}

export async function loadProbeableProviderConnections(
  admin: SupabaseClient,
): Promise<ProviderConnection[]> {
  const { data, error } = await admin.rpc("io_get_probeable_endpoint_connections");
  if (error) throw error;

  return (Array.isArray(data) ? data : [])
    .map((value) => asRecord(value))
    .flatMap((row) => (row ? [readConnection(row)] : []))
    .flatMap((connection) => (connection ? [connection] : []));
}

export async function loadConformanceProviderConnection(
  admin: SupabaseClient,
  runId: string,
): Promise<ProviderConnection> {
  const { data, error } = await admin.rpc("io_get_provider_conformance_connection", {
    _run_id: runId,
  });
  if (error) throw error;
  const first = Array.isArray(data) ? asRecord(data[0]) : asRecord(data);
  const connection = first ? readConnection(first) : null;
  if (!connection) {
    throw new GatewayError(
      "not_configured",
      503,
      "The approved provider conformance connection is unavailable.",
    );
  }
  return connection;
}

export async function resolveProviderRoute(
  admin: SupabaseClient,
  messages: GatewayMessage[],
  input: RouteInput,
): Promise<ReturnType<typeof selectProviderRoute>> {
  const registryConnections = await loadReadyProviderConnections(admin);
  return selectProviderRoute(registryConnections, messages, input, {
    tier: readSelectionTier(),
    freshnessDays: readPositiveInteger("IO_MODEL_SELECTION_FRESHNESS_DAYS", 180, 3_650),
    affordabilityMultiplier: readAffordabilityMultiplier(),
    outputTokenAllowance: input.outputTokenAllowance ?? defaultOutputTokenAllowance,
  });
}

function readContentPart(value: unknown): string | null {
  const part = asRecord(value);
  return part ? readString(part, "text") : null;
}

function readUsageValue(row: RegistryRow | null, key: string) {
  if (!row) return undefined;
  const value = readNumber(row, key);
  return value === null ? undefined : value;
}

function readOpenAiResult(body: unknown): PartnerResult {
  const root = asRecord(body);
  const choices = root?.choices;
  const firstChoice = Array.isArray(choices) ? asRecord(choices[0]) : null;
  const message = firstChoice ? asRecord(firstChoice.message) : null;
  const content = message && typeof message.content === "string" ? message.content : null;
  const toolCalls =
    message && Array.isArray(message.tool_calls)
      ? message.tool_calls.flatMap((value): GatewayToolCall[] => {
          const call = asRecord(value);
          const fn = call ? asRecord(call.function) : null;
          const id = call ? readString(call, "id") : null;
          const name = fn ? readString(fn, "name") : null;
          const args = fn && typeof fn.arguments === "string" ? fn.arguments : null;
          return id && name && args
            ? [{ id, type: "function", function: { name, arguments: args } }]
            : [];
        })
      : [];
  if (!content?.trim() && toolCalls.length === 0) {
    throw new GatewayError(
      "upstream_failure",
      502,
      "The provider returned no usable assistant response.",
    );
  }
  const usage = root ? asRecord(root.usage) : null;
  const finishReasonRaw = firstChoice ? readString(firstChoice, "finish_reason") : null;
  const finishReason =
    finishReasonRaw === "stop" ||
    finishReasonRaw === "length" ||
    finishReasonRaw === "tool_calls" ||
    finishReasonRaw === "content_filter"
      ? finishReasonRaw
      : "unknown";
  const promptDetails = usage ? asRecord(usage.prompt_tokens_details) : null;
  return {
    content: content ?? "",
    message: {
      role: "assistant",
      content,
      ...(toolCalls.length ? { toolCalls } : {}),
    },
    finishReason,
    usage: {
      inputTokens: readUsageValue(usage, "prompt_tokens"),
      outputTokens: readUsageValue(usage, "completion_tokens"),
      cachedInputTokens: readUsageValue(promptDetails, "cached_tokens"),
    },
  };
}

function readGeminiResult(body: unknown): PartnerResult {
  const root = asRecord(body);
  const candidates = root?.candidates;
  const firstCandidate = Array.isArray(candidates) ? asRecord(candidates[0]) : null;
  const content = firstCandidate ? asRecord(firstCandidate.content) : null;
  const parts = content?.parts;
  const text = Array.isArray(parts)
    ? parts
        .map(readContentPart)
        .filter((part): part is string => Boolean(part))
        .join("\n")
    : "";
  if (!text.trim()) {
    throw new GatewayError(
      "upstream_failure",
      502,
      "The provider returned no usable assistant response.",
    );
  }
  const usage = root ? asRecord(root.usageMetadata) : null;
  return {
    content: text,
    message: { role: "assistant", content: text },
    finishReason: "stop",
    usage: {
      inputTokens: readUsageValue(usage, "promptTokenCount"),
      outputTokens: readUsageValue(usage, "candidatesTokenCount"),
    },
  };
}

function providerRequestId(response: Response) {
  const id = response.headers.get("x-request-id") ?? response.headers.get("request-id");
  return id && id.length <= 256 ? id : undefined;
}

async function readProviderJson(response: Response): Promise<unknown> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maximumProviderResponseBytes) {
    throw new GatewayError(
      "upstream_failure",
      502,
      "The provider response exceeded the gateway safety limit.",
      response.status,
    );
  }
  if (!response.body) {
    throw new GatewayError(
      "upstream_failure",
      502,
      "The provider returned no response body.",
      response.status,
    );
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maximumProviderResponseBytes) {
      await reader.cancel();
      throw new GatewayError(
        "upstream_failure",
        502,
        "The provider response exceeded the gateway safety limit.",
        response.status,
      );
    }
    chunks.push(value);
  }

  const combined = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(combined));
  } catch {
    throw new GatewayError(
      "upstream_failure",
      502,
      "The provider returned invalid JSON.",
      response.status,
    );
  }
}

export async function discoverProviderModel(connection: ProviderConnection) {
  if (connection.integrationStyle !== "openai_compatible") {
    throw new GatewayError(
      "not_configured",
      503,
      "The current conformance discovery suite requires an OpenAI-compatible endpoint.",
    );
  }
  const apiKey = resolveSecret(connection.secretReference);
  let upstream: Response;
  try {
    upstream = await fetch(`${connection.baseUrl}/models`, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new GatewayError("upstream_failure", 502, "Provider model discovery could not connect.");
  }
  if (!upstream.ok) {
    throw new GatewayError(
      upstream.status === 429 ? "rate_limited" : "upstream_failure",
      upstream.status === 429 ? 429 : 502,
      "Provider model discovery did not complete.",
      upstream.status,
    );
  }
  const body = asRecord(await readProviderJson(upstream));
  const models = Array.isArray(body?.data) ? body.data : [];
  const modelIdMatched = models.some((value) => {
    const model = asRecord(value);
    return model && readString(model, "id") === connection.providerModelId;
  });
  return {
    modelIdMatched,
    providerRequestId: providerRequestId(upstream),
  };
}

export async function probeProviderConnection(connection: ProviderConnection) {
  if (connection.integrationStyle === "openai_compatible") {
    return discoverProviderModel(connection);
  }
  if (connection.integrationStyle !== "native_adapter" || connection.providerKey !== "gemini") {
    throw new GatewayError(
      "not_configured",
      503,
      "The configured provider does not have a reviewed discovery probe.",
    );
  }

  const apiKey = resolveSecret(connection.secretReference);
  let upstream: Response;
  try {
    upstream = await fetch(
      `${connection.baseUrl}/models/${encodeURIComponent(connection.providerModelId)}`,
      {
        method: "GET",
        headers: { "x-goog-api-key": apiKey, Accept: "application/json" },
        signal: AbortSignal.timeout(15_000),
      },
    );
  } catch {
    throw new GatewayError("upstream_failure", 502, "Provider model probe could not connect.");
  }
  if (!upstream.ok) {
    throw new GatewayError(
      upstream.status === 429 ? "rate_limited" : "upstream_failure",
      upstream.status === 429 ? 429 : 502,
      "Provider model probe did not complete.",
      upstream.status,
    );
  }
  const body = asRecord(await readProviderJson(upstream));
  const modelName = body ? readString(body, "name") : null;
  return {
    modelIdMatched:
      modelName === connection.providerModelId ||
      modelName === `models/${connection.providerModelId}`,
    providerRequestId: providerRequestId(upstream),
  };
}

function checkedOutputTokenLimit(value?: number) {
  const limit = value ?? defaultOutputTokenAllowance;
  if (!Number.isInteger(limit) || limit < 1 || limit > maximumOutputTokenAllowance) {
    throw new GatewayError("bad_request", 400, "The provider output limit is invalid.");
  }
  return limit;
}

async function createSafetyIdentifier(subject: string) {
  const secret = Deno.env.get("IO_SAFETY_IDENTIFIER_SECRET");
  if (!secret || secret.length < 32) {
    throw new GatewayError(
      "not_configured",
      503,
      "The OpenAI safety identifier secret is not configured.",
    );
  }
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`io-user:${subject}`),
  );
  return `io_${Array.from(new Uint8Array(signature), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("")}`;
}

function toGeminiRequest(messages: GatewayMessage[], maxOutputTokens: number) {
  const systemText = messages
    .filter((message) => message.role === "system")
    .map((message) => gatewayContentText(message.content))
    .join("\n\n");
  const contents = messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: gatewayContentText(message.content) }],
    }));
  if (!contents.length) {
    throw new GatewayError(
      "bad_request",
      400,
      "A provider request needs at least one user message.",
    );
  }
  return {
    ...(systemText ? { systemInstruction: { parts: [{ text: systemText }] } } : {}),
    contents,
    generationConfig: { maxOutputTokens },
  };
}

function toOpenAiCompatibleRequest(
  connection: ProviderConnection,
  messages: GatewayMessage[],
  maxOutputTokens: number,
  safetyIdentifier?: string,
  options: ProviderChatOptions = {},
) {
  const usesModernCompletionLimit =
    connection.providerKey === "openai" || connection.providerKey === "groq";
  const reasoningSettings =
    connection.providerKey === "deepseek"
      ? { thinking: { type: "disabled" } }
      : connection.providerKey === "openai" ||
          connection.providerKey === "xai" ||
          connection.providerKey === "groq"
        ? { reasoning_effort: "low" }
        : {};

  return {
    model: connection.providerModelId,
    messages: messages.map(toOpenAiCompatibleMessage),
    ...(usesModernCompletionLimit
      ? { max_completion_tokens: maxOutputTokens }
      : { max_tokens: maxOutputTokens }),
    ...(connection.providerKey === "openai" && safetyIdentifier
      ? { safety_identifier: safetyIdentifier }
      : {}),
    ...(options.tools?.length ? { tools: options.tools } : {}),
    ...(options.toolChoice
      ? {
          tool_choice:
            typeof options.toolChoice === "string"
              ? options.toolChoice
              : { type: "function", function: { name: options.toolChoice.name } },
        }
      : {}),
    ...(options.parallelToolCalls !== undefined
      ? { parallel_tool_calls: options.parallelToolCalls }
      : {}),
    ...(options.responseFormat && options.responseFormat.type !== "text"
      ? {
          response_format:
            options.responseFormat.type === "json_object"
              ? { type: "json_object" }
              : {
                  type: "json_schema",
                  json_schema: {
                    name: options.responseFormat.jsonSchema.name,
                    ...(options.responseFormat.jsonSchema.description
                      ? { description: options.responseFormat.jsonSchema.description }
                      : {}),
                    schema: options.responseFormat.jsonSchema.schema,
                    strict: options.responseFormat.jsonSchema.strict ?? true,
                  },
                },
        }
      : {}),
    ...reasoningSettings,
    stream: false,
  };
}

export async function sendProviderChat(
  connection: ProviderConnection,
  messages: GatewayMessage[],
  options: ProviderChatOptions = {},
): Promise<PartnerResult> {
  const apiKey = resolveSecret(connection.secretReference);
  const maxOutputTokens = checkedOutputTokenLimit(options.maxOutputTokens);
  const safetyIdentifier =
    connection.providerKey === "openai"
      ? await createSafetyIdentifier(options.safetySubject ?? "system")
      : undefined;
  const isGemini =
    connection.integrationStyle === "native_adapter" && connection.providerKey === "gemini";
  if (
    isGemini &&
    (options.tools?.length ||
      (options.responseFormat && options.responseFormat.type !== "text") ||
      messages.some((message) => Array.isArray(message.content)))
  ) {
    throw new GatewayError(
      "not_configured",
      503,
      "The selected native provider adapter does not support this advanced request yet.",
    );
  }
  const url = isGemini
    ? `${connection.baseUrl}/models/${encodeURIComponent(connection.providerModelId)}:generateContent`
    : `${connection.baseUrl}/chat/completions`;
  const headers = isGemini
    ? { "x-goog-api-key": apiKey, "Content-Type": "application/json" }
    : { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
  const body = isGemini
    ? toGeminiRequest(messages, maxOutputTokens)
    : toOpenAiCompatibleRequest(connection, messages, maxOutputTokens, safetyIdentifier, options);

  const abortBoundary = createProviderAbortBoundary(options.abortSignal, 45_000);
  try {
    const upstream = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: abortBoundary.signal,
    });
    if (!upstream.ok) {
      throw new GatewayError(
        upstream.status === 429 ? "rate_limited" : "upstream_failure",
        upstream.status === 429 ? 429 : 502,
        upstream.status === 429
          ? "The selected provider is currently rate limited."
          : "The provider did not accept this request.",
        upstream.status,
      );
    }

    const parsedBody = await readProviderJson(upstream);
    const result = isGemini ? readGeminiResult(parsedBody) : readOpenAiResult(parsedBody);
    if (
      options.responseFormat?.type === "json_schema" &&
      options.responseFormat.jsonSchema.strict &&
      result.message.content
    ) {
      assertStructuredOutput(result.message.content, options.responseFormat.jsonSchema.schema);
    }
    return { ...result, providerRequestId: providerRequestId(upstream) };
  } catch (error) {
    if (error instanceof GatewayError) throw error;
    if (options.abortSignal?.aborted) {
      throw new GatewayError(
        "request_cancelled",
        499,
        "The client cancelled the provider request.",
      );
    }
    throw new GatewayError(
      "upstream_failure",
      502,
      abortBoundary.timedOut()
        ? "The provider request timed out."
        : "The provider could not be reached.",
    );
  } finally {
    abortBoundary.cleanup();
  }
}

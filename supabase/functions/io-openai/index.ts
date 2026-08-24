import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { createGatewayAdminClient } from "../_shared/io/auth.ts";
import { asGatewayError, GatewayError } from "../_shared/io/errors.ts";
import {
  parseOpenAiChatRequest,
  parseOpenAiResponsesRequest,
  rejectBrowserApiKeyRequest,
  requireApiKeyAuthorization,
  requireClientIdempotencyKey,
  sha256Hex,
} from "../_shared/io/openai-api.ts";
import {
  chatCompletionBody,
  chatCompletionStream,
  responsesBody,
  responsesStream,
} from "../_shared/io/openai-output.ts";
import {
  getActiveCapacityEntitlements,
  getWorkspaceProviderPolicy,
  workspaceAllowsProvider,
} from "../_shared/io/policy.ts";
import { loadReadyProviderConnections } from "../_shared/io/provider-adapter.ts";
import { executePartnerRoute } from "../_shared/io/route-execution.ts";
import type {
  GatewayInferenceOptions,
  GatewayMessage,
  ProviderConnection,
  RouteStrategy,
} from "../_shared/io/types.ts";

type ApiKeyActor = {
  apiKeyId: string;
  workspaceId: string;
  actorUserId: string;
  remaining: number;
  limit: number;
  resetAt: string;
  dayRemaining: number;
  dayLimit: number;
  dayResetAt: string;
  monthRemaining: number;
  monthLimit: number;
  monthResetAt: string;
};

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function openAiError(error: GatewayError, headers: Record<string, string> = {}) {
  const type =
    error.code === "unauthorized"
      ? "authentication_error"
      : error.code === "rate_limited"
        ? "rate_limit_error"
        : error.status >= 500
          ? "api_error"
          : "invalid_request_error";
  return json({ error: { message: error.message, type, code: error.code } }, error.status, headers);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readWindow(value: Record<string, unknown> | null, key: "day" | "month") {
  const window = value ? asRecord(value[key]) : null;
  const limit = typeof window?.limit === "number" ? window.limit : 0;
  const remaining = typeof window?.remaining === "number" ? window.remaining : 0;
  const resetAt = typeof window?.resetAt === "string" ? window.resetAt : "";
  return { limit, remaining, resetAt };
}

async function authenticateApiKey(
  admin: SupabaseClient,
  request: Request,
  requiredScope: "models:read" | "inference:invoke",
): Promise<ApiKeyActor> {
  const rawKey = requireApiKeyAuthorization(request.headers.get("Authorization"));
  const { data, error } = await admin.rpc("io_consume_api_key_request", {
    _key_hash_hex: await sha256Hex(rawKey),
    _required_scope: requiredScope,
  });
  if (error) {
    throw new GatewayError("internal_error", 500, "I/O API key authentication failed.");
  }
  const result = asRecord(data);
  if (!result || result.authenticated !== true) {
    throw new GatewayError("unauthorized", 401, "The I/O API key is invalid or inactive.");
  }
  if (result.allowed !== true) {
    const retryAfter = typeof result.retryAfterSeconds === "number" ? result.retryAfterSeconds : 60;
    throw new GatewayError(
      "rate_limited",
      429,
      `The I/O API key rate limit was reached. Retry in ${retryAfter} seconds.`,
      retryAfter,
    );
  }
  const apiKeyId = typeof result.apiKeyId === "string" ? result.apiKeyId : null;
  const workspaceId = typeof result.workspaceId === "string" ? result.workspaceId : null;
  const actorUserId = typeof result.actorUserId === "string" ? result.actorUserId : null;
  const resetAt = typeof result.resetAt === "string" ? result.resetAt : null;
  if (!apiKeyId || !workspaceId || !actorUserId || !resetAt) {
    throw new GatewayError("internal_error", 500, "I/O API key authentication was incomplete.");
  }
  const requestLimits = asRecord(result.requestLimits);
  const day = readWindow(requestLimits, "day");
  const month = readWindow(requestLimits, "month");
  return {
    apiKeyId,
    workspaceId,
    actorUserId,
    remaining: typeof result.remaining === "number" ? result.remaining : 0,
    limit: typeof result.limit === "number" ? result.limit : 0,
    resetAt,
    dayRemaining: day.remaining,
    dayLimit: day.limit,
    dayResetAt: day.resetAt,
    monthRemaining: month.remaining,
    monthLimit: month.limit,
    monthResetAt: month.resetAt,
  };
}

function rateHeaders(actor: ApiKeyActor) {
  return {
    "x-ratelimit-limit-requests": String(actor.limit),
    "x-ratelimit-remaining-requests": String(actor.remaining),
    "x-ratelimit-reset-requests": actor.resetAt,
    "x-io-ratelimit-limit-requests-day": String(actor.dayLimit),
    "x-io-ratelimit-remaining-requests-day": String(actor.dayRemaining),
    "x-io-ratelimit-reset-requests-day": actor.dayResetAt,
    "x-io-ratelimit-limit-requests-month": String(actor.monthLimit),
    "x-io-ratelimit-remaining-requests-month": String(actor.monthRemaining),
    "x-io-ratelimit-reset-requests-month": actor.monthResetAt,
  };
}

async function entitledConnections(admin: SupabaseClient, workspaceId: string) {
  const entitlements = await getActiveCapacityEntitlements(admin, workspaceId);
  const providerPolicy = await getWorkspaceProviderPolicy(admin, workspaceId);
  const sourceIds = new Set(entitlements.map((entitlement) => entitlement.sourceId));
  return (await loadReadyProviderConnections(admin)).filter(
    (connection) =>
      sourceIds.has(connection.capacitySourceId) &&
      workspaceAllowsProvider(providerPolicy, connection),
  );
}

function publicModelId(connection: ProviderConnection) {
  return `${connection.providerKey}/${connection.providerModelId}`;
}

function resolveModel(
  connections: ProviderConnection[],
  model: string,
): {
  routeStrategy: RouteStrategy;
  requestedModelId?: string;
} {
  if (model === "io/latest-affordable") return { routeStrategy: "latest_affordable" };
  if (model === "io/lowest-cost") return { routeStrategy: "lowest_cost" };
  const connection = connections.find((candidate) => publicModelId(candidate) === model);
  if (!connection) {
    throw new GatewayError(
      "bad_request",
      400,
      `The model '${model}' is not available to this key.`,
    );
  }
  return { routeStrategy: "explicit_model", requestedModelId: connection.modelId };
}

async function parseJson(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new GatewayError("bad_request", 400, "Request body must be valid JSON.");
  }
}

function executionHeaders(
  actor: ApiKeyActor,
  result: Awaited<ReturnType<typeof executePartnerRoute>>,
) {
  if (result.replayed) return rateHeaders(actor);
  return {
    ...rateHeaders(actor),
    "x-io-request-id": result.requestId,
    "x-io-receipt-id": result.receiptId,
    "x-io-provider": result.route.providerKey,
    "x-io-capacity-source": result.capacitySource,
    "x-io-service-fee-bps": String(result.route.serviceFeeBasisPoints),
  };
}

async function executeApiInference(input: {
  admin: SupabaseClient;
  actor: ApiKeyActor;
  request: Request;
  model: string;
  messages: GatewayMessage[];
  inferenceOptions: GatewayInferenceOptions;
  protocol: "chat" | "responses";
}) {
  const connections = await entitledConnections(input.admin, input.actor.workspaceId);
  const modelRoute = resolveModel(connections, input.model);
  const clientIdempotencyKey = requireClientIdempotencyKey(
    input.request.headers.get("Idempotency-Key"),
  );
  const result = await executePartnerRoute(input.admin, {
    workspaceId: input.actor.workspaceId,
    actorUserId: input.actor.actorUserId,
    actorKind: "api_key",
    apiKeyId: input.actor.apiKeyId,
    idempotencyKey: `api_${await sha256Hex(
      `${input.actor.apiKeyId}:${input.protocol}:${clientIdempotencyKey}`,
    )}`,
    messages: input.messages,
    mode: "run",
    inferenceOptions: input.inferenceOptions,
    ...modelRoute,
  });
  if (result.replayed) {
    throw new GatewayError(
      "request_in_progress",
      409,
      result.state === "reserved"
        ? "This idempotent request is already in progress."
        : "This idempotent request was already finalized; use a new Idempotency-Key.",
    );
  }
  return result;
}

Deno.serve(async (request) => {
  const pathname = new URL(request.url).pathname.replace(/\/+$/, "");
  try {
    rejectBrowserApiKeyRequest(request.headers.get("Origin"));
    const admin = createGatewayAdminClient();
    if (request.method === "GET" && pathname.endsWith("/v1/models")) {
      const actor = await authenticateApiKey(admin, request, "models:read");
      const connections = await entitledConnections(admin, actor.workspaceId);
      const uniqueModels = new Map<string, ProviderConnection>();
      for (const connection of connections) {
        uniqueModels.set(publicModelId(connection), connection);
      }
      const created = Math.floor(Date.now() / 1000);
      return json(
        {
          object: "list",
          data: [
            ...(connections.length
              ? [
                  { id: "io/latest-affordable", object: "model", created, owned_by: "indus-orbit" },
                  { id: "io/lowest-cost", object: "model", created, owned_by: "indus-orbit" },
                ]
              : []),
            ...Array.from(uniqueModels, ([id, connection]) => ({
              id,
              object: "model",
              created: Math.floor(new Date(connection.modelReleaseDate).getTime() / 1000),
              owned_by: connection.providerKey,
            })),
          ],
        },
        200,
        rateHeaders(actor),
      );
    }

    if (request.method === "POST" && pathname.endsWith("/v1/chat/completions")) {
      const actor = await authenticateApiKey(admin, request, "inference:invoke");
      const body = parseOpenAiChatRequest(await parseJson(request));
      const result = await executeApiInference({
        admin,
        actor,
        request,
        model: body.model,
        messages: body.messages,
        inferenceOptions: body.inferenceOptions,
        protocol: "chat",
      });
      const headers = executionHeaders(actor, result);
      if (body.stream) return chatCompletionStream(result, body.model, body.includeUsage, headers);
      return json(chatCompletionBody(result, body.model), 200, headers);
    }

    if (request.method === "POST" && pathname.endsWith("/v1/responses")) {
      const actor = await authenticateApiKey(admin, request, "inference:invoke");
      const body = parseOpenAiResponsesRequest(await parseJson(request));
      const result = await executeApiInference({
        admin,
        actor,
        request,
        model: body.model,
        messages: body.messages,
        inferenceOptions: body.inferenceOptions,
        protocol: "responses",
      });
      const headers = executionHeaders(actor, result);
      if (body.stream) return responsesStream(result, body.model, headers);
      return json(responsesBody(result, body.model), 200, headers);
    }

    return openAiError(new GatewayError("bad_request", 404, "I/O API endpoint not found."));
  } catch (error) {
    const gatewayError = asGatewayError(error);
    console.error("io-openai failure", gatewayError.code, gatewayError.message);
    const retryHeaders =
      gatewayError.code === "rate_limited" && gatewayError.upstreamStatus
        ? { "Retry-After": String(gatewayError.upstreamStatus) }
        : {};
    return openAiError(gatewayError, retryHeaders);
  }
});

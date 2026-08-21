import { corsHeaders as supabaseCorsHeaders } from "npm:@supabase/supabase-js@2/cors";
import {
  authenticateGatewayActor,
  createGatewayClients,
  requireWorkspaceMembership,
} from "../_shared/io/auth.ts";
import { asGatewayError, GatewayError } from "../_shared/io/errors.ts";
import { calculateUsageChargeNanos, loadActiveServiceFeePolicy } from "../_shared/io/operations.ts";
import {
  getActiveCapacityEntitlements,
  getWorkspaceProviderPolicy,
  workspaceAllowsProvider,
} from "../_shared/io/policy.ts";
import {
  loadReadyProviderConnections,
  resolveProviderRoute,
} from "../_shared/io/provider-adapter.ts";
import { executePartnerRoute } from "../_shared/io/route-execution.ts";
import { parseGatewayRequest } from "../_shared/io/validation.ts";

const allowedOrigins = new Set([
  "https://indusorbit.com",
  "https://www.indusorbit.com",
  "http://127.0.0.1:5173",
  "http://localhost:5173",
  "http://127.0.0.1:5174",
  "http://localhost:5174",
]);

function corsHeaders(request: Request) {
  const origin = request.headers.get("origin");
  return {
    ...supabaseCorsHeaders,
    "Access-Control-Allow-Origin":
      origin && allowedOrigins.has(origin) ? origin : "https://indusorbit.com",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function json(request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), "Content-Type": "application/json" },
  });
}

async function parseRequestBody(request: Request) {
  try {
    return parseGatewayRequest(await request.json());
  } catch (error) {
    if (error instanceof GatewayError) throw error;
    throw new GatewayError("bad_request", 400, "Request body must be valid JSON.");
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(request) });
  if (request.method !== "POST") {
    return json(request, { ok: false, code: "bad_request", error: "Method not allowed." }, 405);
  }

  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization) {
      throw new GatewayError("unauthorized", 401, "Missing authorization.");
    }

    const body = await parseRequestBody(request);
    const { authClient, admin } = createGatewayClients(authorization);
    const actor = await authenticateGatewayActor(authClient);
    await requireWorkspaceMembership(admin, body.workspaceId, actor.id);

    const entitlements = await getActiveCapacityEntitlements(admin, body.workspaceId);
    const providerPolicy = await getWorkspaceProviderPolicy(admin, body.workspaceId);
    const entitledSourceIds = new Set(entitlements.map((entitlement) => entitlement.sourceId));
    const availableConnections = (await loadReadyProviderConnections(admin)).filter(
      (connection) =>
        entitledSourceIds.has(connection.capacitySourceId) &&
        workspaceAllowsProvider(providerPolicy, connection),
    );

    if (body.action === "status") {
      const readyConnectionCount = availableConnections.length;
      return json(request, {
        ok: true,
        partner: {
          configured: readyConnectionCount > 0,
          mode: "registry-selected",
          readyConnectionCount,
          modelSelection: "latest-affordable",
        },
        opencode: { mode: "local-direct", loopbackOnly: true },
      });
    }

    if (body.action === "catalog") {
      const connections = availableConnections;
      return json(request, {
        ok: true,
        routeStrategies: ["latest_affordable", "lowest_cost", "explicit_model"],
        models: connections.map((connection) => ({
          modelId: connection.modelId,
          providerKey: connection.providerKey,
          providerDisplayName: connection.providerDisplayName,
          providerModelId: connection.providerModelId,
          modelDisplayName: connection.modelDisplayName,
          tier: connection.autoRouteTier,
          capacityMode: connection.capacityMode,
          regionCode: connection.regionCode,
          residencyCountryCode: connection.residencyCountryCode,
          retentionClass: connection.retentionClass,
          currencyCode: connection.currencyCode,
          capabilityVersion: connection.capabilityVersion,
          priceVersion: connection.priceVersion,
        })),
      });
    }

    if (body.action === "preflight") {
      const selection = await resolveProviderRoute(admin, body.messages!, {
        strategy: body.routeStrategy,
        requestedModelId: body.requestedModelId,
        entitledCapacitySourceIds: entitledSourceIds,
        connectionFilter: (connection) => workspaceAllowsProvider(providerPolicy, connection),
      });
      const feePolicy = await loadActiveServiceFeePolicy(admin);
      const estimate = calculateUsageChargeNanos(
        selection.estimatedCostNanos,
        feePolicy.feeBasisPoints,
      );
      return json(request, {
        ok: true,
        strategy: selection.strategy,
        tier: selection.tier,
        candidateCount: selection.candidateCount,
        selected: {
          providerKey: selection.connection.providerKey,
          providerDisplayName: selection.connection.providerDisplayName,
          modelId: selection.connection.modelId,
          modelDisplayName: selection.connection.modelDisplayName,
          providerModelId: selection.connection.providerModelId,
          endpointKey: selection.connection.endpointKey,
          capacityMode: selection.connection.capacityMode,
          regionCode: selection.connection.regionCode,
          residencyCountryCode: selection.connection.residencyCountryCode,
          retentionClass: selection.connection.retentionClass,
          healthState: selection.connection.healthState,
          circuitState: selection.connection.circuitState,
          capabilityVersion: selection.connection.capabilityVersion,
          priceVersion: selection.connection.priceVersion,
          currencyCode: selection.connection.currencyCode,
        },
        estimate: {
          providerCostNanos: estimate.providerCostNanos,
          serviceFeeNanos: estimate.serviceFeeNanos,
          customerChargeNanos: estimate.customerChargeNanos,
          serviceFeeBasisPoints: estimate.feeBasisPoints,
        },
        candidates: selection.candidateSummary,
      });
    }

    const result = await executePartnerRoute(admin, {
      workspaceId: body.workspaceId,
      actorUserId: actor.id,
      actorKind: "user",
      idempotencyKey: body.idempotencyKey!,
      messages: body.messages!,
      mode: body.mode,
      routeStrategy: body.routeStrategy,
      requestedModelId: body.requestedModelId,
    });

    if (result.replayed) {
      return json(
        request,
        {
          ok: false,
          code: "idempotent_replay",
          error:
            result.state === "reserved"
              ? "This request is already in progress."
              : result.state === "expired"
                ? "The earlier reservation expired safely; retry with a new idempotency key."
                : "This request was already finalized; use its existing route receipt.",
          requestId: result.requestId,
          receiptId: result.receiptId,
          state: result.state,
        },
        409,
      );
    }

    return json(request, {
      ok: true,
      requestId: result.requestId,
      receiptId: result.receiptId,
      provider: result.provider,
      model: result.model,
      modelSelection: result.modelSelection,
      content: result.content,
      usage: result.usage,
      capacitySource: result.capacitySource,
      route: result.route,
    });
  } catch (error) {
    const gatewayError = asGatewayError(error);
    console.error("io-gateway failure", gatewayError.code, gatewayError.message);
    return json(
      request,
      { ok: false, code: gatewayError.code, error: gatewayError.message },
      gatewayError.status,
    );
  }
});

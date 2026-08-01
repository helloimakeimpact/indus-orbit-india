import { corsHeaders as supabaseCorsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { writeIoAuditEvent } from "../_shared/io/audit.ts";
import {
  authenticateGatewayActor,
  createGatewayClients,
  requireWorkspaceMembership,
} from "../_shared/io/auth.ts";
import { asGatewayError, GatewayError } from "../_shared/io/errors.ts";
import { getActiveCapacityEntitlements } from "../_shared/io/policy.ts";
import {
  loadReadyProviderConnections,
  resolveProviderRoute,
  sendProviderChat,
} from "../_shared/io/provider-adapter.ts";
import { writeRouteReceipt, type ProviderAttempt } from "../_shared/io/receipt.ts";
import type { PartnerResult, RouteSelection } from "../_shared/io/types.ts";
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

function requestId() {
  return crypto.randomUUID();
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
    const entitledSourceIds = new Set(entitlements.map((entitlement) => entitlement.sourceId));

    if (body.action === "status") {
      const readyConnectionCount = (await loadReadyProviderConnections(admin)).filter(
        (connection) => entitledSourceIds.has(connection.capacitySourceId),
      ).length;
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
      const connections = (await loadReadyProviderConnections(admin)).filter((connection) =>
        entitledSourceIds.has(connection.capacitySourceId),
      );
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

    if (body.action === "record_local_opencode") {
      await writeIoAuditEvent(admin, {
        workspaceId: body.workspaceId,
        actorKind: "user",
        actorUserId: actor.id,
        eventType: "io.terminal.opencode.completed",
        requestId: requestId(),
        payload: {
          connector: "opencode",
          connector_origin: body.connectorOrigin!,
          session_id: body.sessionId!,
        },
      });
      return json(request, { ok: true });
    }

    const id = requestId();
    const messages = body.messages!;
    const mode = body.mode ?? "plan";
    const selection = await resolveProviderRoute(admin, messages, {
      strategy: body.routeStrategy,
      requestedModelId: body.requestedModelId,
      entitledCapacitySourceIds: entitledSourceIds,
    });

    await writeIoAuditEvent(admin, {
      workspaceId: body.workspaceId,
      actorKind: "user",
      actorUserId: actor.id,
      eventType: "io.partner.requested",
      requestId: id,
      payload: {
        capacity_source_id: selection.connection.capacitySourceId,
        provider_key: selection.connection.providerKey,
        model: selection.connection.providerModelId,
        model_selection: selection.strategy,
        model_tier: selection.tier,
        model_release_date: selection.connection.modelReleaseDate,
        model_candidate_count: selection.candidateCount,
        estimated_cost_nanos: selection.estimatedCostNanos,
        price_currency: selection.connection.currencyCode,
        mode,
        message_count: messages.length,
        character_count: messages.reduce((sum, message) => sum + message.content.length, 0),
      },
    });

    const attempts: ProviderAttempt[] = [];
    let result: PartnerResult | null = null;
    let selectedRoute: RouteSelection | null = null;
    let lastError: GatewayError | null = null;

    for (const candidate of selection.routeCandidates) {
      const startedAt = new Date().toISOString();
      try {
        const candidateResult = await sendProviderChat(candidate.connection, messages);
        attempts.push({
          connection: candidate.connection,
          startedAt,
          completedAt: new Date().toISOString(),
          state: "completed",
          providerRequestId: candidateResult.providerRequestId,
          inputTokens: candidateResult.usage.inputTokens,
          outputTokens: candidateResult.usage.outputTokens,
        });
        result = candidateResult;
        selectedRoute = {
          ...selection,
          connection: candidate.connection,
          estimatedCostNanos: candidate.estimatedCostNanos,
        };
        break;
      } catch (error) {
        const gatewayError = asGatewayError(error);
        attempts.push({
          connection: candidate.connection,
          startedAt,
          completedAt: new Date().toISOString(),
          state: "failed",
          errorCode: gatewayError.code,
          upstreamStatus: gatewayError.upstreamStatus,
        });
        lastError = gatewayError;
        if (
          gatewayError.code !== "upstream_failure" &&
          gatewayError.code !== "rate_limited" &&
          gatewayError.code !== "not_configured"
        ) {
          break;
        }
      }
    }

    if (!result || !selectedRoute) {
      const failure =
        lastError ?? new GatewayError("upstream_failure", 502, "No provider route completed.");
      try {
        const receiptId = await writeRouteReceipt(admin, {
          workspaceId: body.workspaceId,
          requestId: id,
          actorUserId: actor.id,
          selection,
          resultState: "failed",
          attempts,
        });
        await writeIoAuditEvent(admin, {
          workspaceId: body.workspaceId,
          actorKind: "provider",
          eventType: "io.partner.failed",
          requestId: id,
          payload: {
            receipt_id: receiptId,
            attempted_count: attempts.length,
            code: failure.code,
            status: failure.status,
          },
        });
      } catch (receiptError) {
        console.error(
          "io-gateway failed receipt",
          receiptError instanceof Error ? receiptError.message : "unknown",
        );
      }
      throw failure;
    }

    const receiptId = await writeRouteReceipt(admin, {
      workspaceId: body.workspaceId,
      requestId: id,
      actorUserId: actor.id,
      selection: selectedRoute,
      resultState: "completed",
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      attempts,
    });
    await writeIoAuditEvent(admin, {
      workspaceId: body.workspaceId,
      actorKind: "provider",
      eventType: "io.partner.completed",
      requestId: id,
      payload: {
        receipt_id: receiptId,
        capacity_source_id: selectedRoute.connection.capacitySourceId,
        provider_key: selectedRoute.connection.providerKey,
        model: selectedRoute.connection.providerModelId,
        model_selection: selectedRoute.strategy,
        fallback_count: Math.max(0, attempts.length - 1),
        input_tokens: result.usage.inputTokens ?? null,
        output_tokens: result.usage.outputTokens ?? null,
      },
    });

    return json(request, {
      ok: true,
      requestId: id,
      receiptId,
      provider: selectedRoute.connection.providerDisplayName,
      model: selectedRoute.connection.providerModelId,
      modelSelection: selectedRoute.strategy,
      content: result.content,
      usage: result.usage,
      capacitySource:
        entitlements.find(
          (entitlement) => entitlement.sourceId === selectedRoute.connection.capacitySourceId,
        )?.sourceKey ?? "unknown",
      route: {
        providerKey: selectedRoute.connection.providerKey,
        modelId: selectedRoute.connection.modelId,
        endpointKey: selectedRoute.connection.endpointKey,
        capacityMode: selectedRoute.connection.capacityMode,
        regionCode: selectedRoute.connection.regionCode,
        residencyCountryCode: selectedRoute.connection.residencyCountryCode,
        retentionClass: selectedRoute.connection.retentionClass,
        estimatedCostNanos: selectedRoute.estimatedCostNanos,
        currencyCode: selectedRoute.connection.currencyCode,
        fallbackCount: Math.max(0, attempts.length - 1),
      },
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

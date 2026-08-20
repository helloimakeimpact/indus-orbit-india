import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { writeIoAuditEvent } from "./audit.ts";
import { asGatewayError, GatewayError } from "./errors.ts";
import {
  beginRouteRequest,
  calculateReservationNanos,
  calculateReservationMinor,
  calculateSettlement,
  fingerprintRouteRequest,
  loadActiveServiceFeePolicy,
  recordEndpointOutcome,
} from "./operations.ts";
import {
  getActiveCapacityEntitlements,
  getWorkspaceProviderPolicy,
  workspaceAllowsProvider,
} from "./policy.ts";
import { resolveProviderRoute, sendProviderChat } from "./provider-adapter.ts";
import { writeRouteReceipt, type ProviderAttempt } from "./receipt.ts";
import { selectRouteAttempts } from "./routing.ts";
import type {
  GatewayMessage,
  GatewayMode,
  PartnerResult,
  RouteSelection,
  RouteStrategy,
} from "./types.ts";

export type RouteExecutionInput = {
  workspaceId: string;
  actorUserId: string;
  actorKind: "user" | "api_key";
  apiKeyId?: string;
  idempotencyKey: string;
  messages: GatewayMessage[];
  mode?: GatewayMode;
  routeStrategy?: RouteStrategy;
  requestedModelId?: string;
};

export type RouteExecutionReplay = {
  replayed: true;
  requestId: string;
  receiptId: string | null;
  state: "reserved" | "completed" | "failed" | "expired";
};

export type RouteExecutionSuccess = {
  replayed: false;
  requestId: string;
  receiptId: string;
  provider: string;
  model: string;
  modelSelection: RouteStrategy;
  content: string;
  usage: PartnerResult["usage"];
  capacitySource: string;
  route: {
    providerKey: string;
    modelId: string;
    endpointKey: string;
    capacityMode: string;
    regionCode: string | null;
    residencyCountryCode: string | null;
    retentionClass: string;
    estimatedCostNanos: number;
    currencyCode: string;
    settledMinor: number;
    releasedMinor: number;
    providerCostNanos: number;
    serviceFeeNanos: number;
    customerChargeNanos: number;
    serviceFeeBasisPoints: number;
    costBasis: "provider_usage" | "route_estimate_missing_usage";
    fallbackCount: number;
  };
};

export async function executePartnerRoute(
  admin: SupabaseClient,
  input: RouteExecutionInput,
): Promise<RouteExecutionReplay | RouteExecutionSuccess> {
  const entitlements = await getActiveCapacityEntitlements(admin, input.workspaceId);
  const providerPolicy = await getWorkspaceProviderPolicy(admin, input.workspaceId);
  const serviceFeePolicy = await loadActiveServiceFeePolicy(admin);
  const entitledSourceIds = new Set(entitlements.map((entitlement) => entitlement.sourceId));
  const requestId = crypto.randomUUID();
  const mode = input.mode ?? "plan";
  const selection = await resolveProviderRoute(admin, input.messages, {
    strategy: input.routeStrategy,
    requestedModelId: input.requestedModelId,
    entitledCapacitySourceIds: entitledSourceIds,
    connectionFilter: (connection) => workspaceAllowsProvider(providerPolicy, connection),
  });
  const routeAttempts = selectRouteAttempts(
    selection.routeCandidates,
    Deno.env.get("IO_PROVIDER_MAX_ATTEMPTS"),
  );
  const reserveMinor = calculateReservationMinor(
    routeAttempts,
    input.messages,
    1_024,
    serviceFeePolicy.feeBasisPoints,
  );
  const reserveCustomerNanos = calculateReservationNanos(
    routeAttempts,
    input.messages,
    1_024,
    serviceFeePolicy.feeBasisPoints,
  ).customerChargeNanos;
  const fingerprint = await fingerprintRouteRequest({
    workspaceId: input.workspaceId,
    mode,
    messages: input.messages,
    routeStrategy: input.routeStrategy,
    requestedModelId: input.requestedModelId,
  });
  const reservation = await beginRouteRequest(admin, {
    workspaceId: input.workspaceId,
    actorUserId: input.actorUserId,
    idempotencyKey: input.idempotencyKey,
    requestFingerprint: fingerprint,
    requestId,
    endpointId: selection.connection.endpointId,
    currencyCode: selection.connection.currencyCode,
    reserveMinor,
    apiKeyId: input.apiKeyId,
    reserveCustomerNanos: input.apiKeyId ? reserveCustomerNanos : undefined,
  });

  if (reservation.replayed) {
    return {
      replayed: true,
      requestId: reservation.requestId,
      receiptId: reservation.receiptId,
      state: reservation.state,
    };
  }

  await writeIoAuditEvent(admin, {
    workspaceId: input.workspaceId,
    actorKind: input.actorKind,
    actorUserId: input.actorKind === "user" ? input.actorUserId : undefined,
    apiKeyId: input.actorKind === "api_key" ? input.apiKeyId : undefined,
    eventType: "io.partner.requested",
    requestId,
    payload: {
      capacity_source_id: selection.connection.capacitySourceId,
      provider_key: selection.connection.providerKey,
      model: selection.connection.providerModelId,
      model_selection: selection.strategy,
      model_tier: selection.tier,
      model_release_date: selection.connection.modelReleaseDate,
      model_candidate_count: selection.candidateCount,
      estimated_cost_nanos: selection.estimatedCostNanos,
      reserved_minor: reservation.reservedMinor,
      price_currency: selection.connection.currencyCode,
      mode,
      message_count: input.messages.length,
      character_count: input.messages.reduce((sum, message) => sum + message.content.length, 0),
    },
  });

  const attempts: ProviderAttempt[] = [];
  let result: PartnerResult | null = null;
  let selectedRoute: RouteSelection | null = null;
  let lastError: GatewayError | null = null;

  for (const candidate of routeAttempts) {
    const startedAt = new Date().toISOString();
    const startedAtMonotonic = performance.now();
    try {
      const candidateResult = await sendProviderChat(candidate.connection, input.messages, {
        safetySubject: input.actorUserId,
      });
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
      await recordEndpointOutcome(admin, {
        endpointId: candidate.connection.endpointId,
        succeeded: true,
        latencyMs: performance.now() - startedAtMonotonic,
      });
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
      await recordEndpointOutcome(admin, {
        endpointId: candidate.connection.endpointId,
        succeeded: false,
        latencyMs: performance.now() - startedAtMonotonic,
        errorCode: gatewayError.code,
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
    const finalization = await writeRouteReceipt(admin, {
      requestId,
      apiKeyId: input.apiKeyId,
      selection,
      resultState: "failed",
      customerChargeMinor: 0,
      providerCostNanos: 0,
      serviceFeeNanos: 0,
      customerChargeNanos: 0,
      serviceFeePolicyVersion: serviceFeePolicy.version,
      serviceFeeBasisPoints: serviceFeePolicy.feeBasisPoints,
      costBasis: "released_failure",
      attempts,
    });
    await writeIoAuditEvent(admin, {
      workspaceId: input.workspaceId,
      actorKind: "provider",
      eventType: "io.partner.failed",
      requestId,
      payload: {
        receipt_id: finalization.receiptId,
        attempted_count: attempts.length,
        released_minor: finalization.releasedMinor,
        currency: finalization.currencyCode,
        code: failure.code,
        status: failure.status,
      },
    });
    throw failure;
  }

  const settlement = calculateSettlement({
    selection: selectedRoute,
    inputTokens: result.usage.inputTokens,
    outputTokens: result.usage.outputTokens,
    feeBasisPoints: serviceFeePolicy.feeBasisPoints,
  });
  const finalization = await writeRouteReceipt(admin, {
    requestId,
    apiKeyId: input.apiKeyId,
    selection: selectedRoute,
    resultState: "completed",
    inputTokens: result.usage.inputTokens,
    outputTokens: result.usage.outputTokens,
    customerChargeMinor: settlement.customerChargeMinor,
    providerCostNanos: settlement.providerCostNanos,
    serviceFeeNanos: settlement.serviceFeeNanos,
    customerChargeNanos: settlement.customerChargeNanos,
    serviceFeePolicyVersion: serviceFeePolicy.version,
    serviceFeeBasisPoints: serviceFeePolicy.feeBasisPoints,
    costBasis: settlement.costBasis,
    attempts,
  });
  await writeIoAuditEvent(admin, {
    workspaceId: input.workspaceId,
    actorKind: "provider",
    eventType: "io.partner.completed",
    requestId,
    payload: {
      receipt_id: finalization.receiptId,
      capacity_source_id: selectedRoute.connection.capacitySourceId,
      provider_key: selectedRoute.connection.providerKey,
      model: selectedRoute.connection.providerModelId,
      model_selection: selectedRoute.strategy,
      fallback_count: Math.max(0, attempts.length - 1),
      input_tokens: result.usage.inputTokens ?? null,
      output_tokens: result.usage.outputTokens ?? null,
      settled_minor: finalization.settledMinor,
      provider_cost_nanos: settlement.providerCostNanos,
      service_fee_nanos: settlement.serviceFeeNanos,
      customer_charge_nanos: settlement.customerChargeNanos,
      service_fee_basis_points: serviceFeePolicy.feeBasisPoints,
      released_minor: finalization.releasedMinor,
      currency: finalization.currencyCode,
      cost_basis: settlement.costBasis,
    },
  });

  return {
    replayed: false,
    requestId,
    receiptId: finalization.receiptId,
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
      settledMinor: finalization.settledMinor,
      releasedMinor: finalization.releasedMinor,
      providerCostNanos: settlement.providerCostNanos,
      serviceFeeNanos: settlement.serviceFeeNanos,
      customerChargeNanos: settlement.customerChargeNanos,
      serviceFeeBasisPoints: serviceFeePolicy.feeBasisPoints,
      costBasis: settlement.costBasis,
      fallbackCount: Math.max(0, attempts.length - 1),
    },
  };
}

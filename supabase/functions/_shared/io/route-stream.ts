import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { writeIoAuditEvent } from "./audit.ts";
import { asGatewayError, GatewayError } from "./errors.ts";
import {
  beginRouteRequest,
  calculateReservationMinor,
  calculateReservationNanos,
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
import {
  resolveProviderRoute,
  sendProviderChatStream,
  type ProviderChatStreamEvent,
} from "./provider-adapter.ts";
import { writeRouteReceipt, type ProviderAttempt } from "./receipt.ts";
import { selectRouteAttempts } from "./routing.ts";
import { currentTransportEvidence } from "./transport-rollout.ts";
import type { PartnerResult, RouteSelection } from "./types.ts";
import type {
  RouteExecutionInput,
  RouteExecutionReplay,
  RouteExecutionSuccess,
} from "./route-execution.ts";

export type SettledRouteStreamEvent =
  | Exclude<ProviderChatStreamEvent, { type: "completed" }>
  | { type: "completed"; result: RouteExecutionSuccess };

export type RouteExecutionStream = {
  replayed: false;
  requestId: string;
  provider: string;
  model: string;
  modelSelection: RouteSelection["strategy"];
  capacitySource: string;
  serviceFeeBasisPoints: number;
  providerKey: string;
  events: ReadableStream<SettledRouteStreamEvent>;
};

type StreamContext = {
  requestId: string;
  selection: RouteSelection;
  selectedRoute: RouteSelection;
  serviceFeePolicy: { version: number; feeBasisPoints: number };
  entitlements: Awaited<ReturnType<typeof getActiveCapacityEntitlements>>;
  attempts: ProviderAttempt[];
};

async function finalizeFailure(
  admin: SupabaseClient,
  input: RouteExecutionInput,
  context: StreamContext,
  failure: GatewayError,
) {
  const transportEvidence = currentTransportEvidence(
    context.attempts.at(-1)?.connection ?? context.selectedRoute.connection,
  );
  const finalization = await writeRouteReceipt(admin, {
    requestId: context.requestId,
    apiKeyId: input.apiKeyId,
    selection: context.selectedRoute,
    resultState: "failed",
    customerChargeMinor: 0,
    providerCostNanos: 0,
    serviceFeeNanos: 0,
    customerChargeNanos: 0,
    serviceFeePolicyVersion: context.serviceFeePolicy.version,
    serviceFeeBasisPoints: context.serviceFeePolicy.feeBasisPoints,
    costBasis: "released_failure",
    transportEvidence,
    attempts: context.attempts,
  });
  await writeIoAuditEvent(admin, {
    workspaceId: input.workspaceId,
    actorKind: "provider",
    eventType: "io.partner.failed",
    requestId: context.requestId,
    payload: {
      receipt_id: finalization.receiptId,
      attempted_count: context.attempts.length,
      released_minor: finalization.releasedMinor,
      currency: finalization.currencyCode,
      code: failure.code,
      status: failure.status,
      streaming: true,
      execution_adapter_version: transportEvidence.executionAdapterVersion,
      translation_version: transportEvidence.translationVersion,
    },
  });
}

async function finalizeSuccess(
  admin: SupabaseClient,
  input: RouteExecutionInput,
  context: StreamContext,
  result: PartnerResult,
): Promise<RouteExecutionSuccess> {
  const settlement = calculateSettlement({
    selection: context.selectedRoute,
    inputTokens: result.usage.inputTokens,
    outputTokens: result.usage.outputTokens,
    feeBasisPoints: context.serviceFeePolicy.feeBasisPoints,
  });
  const finalization = await writeRouteReceipt(admin, {
    requestId: context.requestId,
    apiKeyId: input.apiKeyId,
    selection: context.selectedRoute,
    resultState: "completed",
    inputTokens: result.usage.inputTokens,
    outputTokens: result.usage.outputTokens,
    customerChargeMinor: settlement.customerChargeMinor,
    providerCostNanos: settlement.providerCostNanos,
    serviceFeeNanos: settlement.serviceFeeNanos,
    customerChargeNanos: settlement.customerChargeNanos,
    serviceFeePolicyVersion: context.serviceFeePolicy.version,
    serviceFeeBasisPoints: context.serviceFeePolicy.feeBasisPoints,
    costBasis: settlement.costBasis,
    transportEvidence: result.transportEvidence,
    attempts: context.attempts,
  });
  await writeIoAuditEvent(admin, {
    workspaceId: input.workspaceId,
    actorKind: "provider",
    eventType: "io.partner.completed",
    requestId: context.requestId,
    payload: {
      receipt_id: finalization.receiptId,
      capacity_source_id: context.selectedRoute.connection.capacitySourceId,
      provider_key: context.selectedRoute.connection.providerKey,
      model: context.selectedRoute.connection.providerModelId,
      model_selection: context.selectedRoute.strategy,
      fallback_count: Math.max(0, context.attempts.length - 1),
      input_tokens: result.usage.inputTokens ?? null,
      output_tokens: result.usage.outputTokens ?? null,
      settled_minor: finalization.settledMinor,
      provider_cost_nanos: settlement.providerCostNanos,
      service_fee_nanos: settlement.serviceFeeNanos,
      customer_charge_nanos: settlement.customerChargeNanos,
      service_fee_basis_points: context.serviceFeePolicy.feeBasisPoints,
      released_minor: finalization.releasedMinor,
      currency: finalization.currencyCode,
      cost_basis: settlement.costBasis,
      streaming: true,
      execution_adapter_version: result.transportEvidence.executionAdapterVersion,
      translation_version: result.transportEvidence.translationVersion,
    },
  });
  const connection = context.selectedRoute.connection;
  return {
    replayed: false,
    requestId: context.requestId,
    receiptId: finalization.receiptId,
    provider: connection.providerDisplayName,
    model: connection.providerModelId,
    modelSelection: context.selectedRoute.strategy,
    content: result.content,
    message: result.message,
    finishReason: result.finishReason,
    usage: result.usage,
    capacitySource:
      context.entitlements.find(
        (entitlement) => entitlement.sourceId === connection.capacitySourceId,
      )?.sourceKey ?? "unknown",
    route: {
      providerKey: connection.providerKey,
      modelId: connection.modelId,
      endpointKey: connection.endpointKey,
      capacityMode: connection.capacityMode,
      regionCode: connection.regionCode,
      residencyCountryCode: connection.residencyCountryCode,
      retentionClass: connection.retentionClass,
      estimatedCostNanos: context.selectedRoute.estimatedCostNanos,
      currencyCode: connection.currencyCode,
      settledMinor: finalization.settledMinor,
      releasedMinor: finalization.releasedMinor,
      providerCostNanos: settlement.providerCostNanos,
      serviceFeeNanos: settlement.serviceFeeNanos,
      customerChargeNanos: settlement.customerChargeNanos,
      serviceFeeBasisPoints: context.serviceFeePolicy.feeBasisPoints,
      costBasis: settlement.costBasis,
      fallbackCount: Math.max(0, context.attempts.length - 1),
      executionAdapterVersion: result.transportEvidence.executionAdapterVersion,
      translationVersion: result.transportEvidence.translationVersion,
    },
  };
}

export async function executePartnerRouteStream(
  admin: SupabaseClient,
  input: RouteExecutionInput,
): Promise<RouteExecutionReplay | RouteExecutionStream> {
  const entitlements = await getActiveCapacityEntitlements(admin, input.workspaceId);
  const providerPolicy = await getWorkspaceProviderPolicy(admin, input.workspaceId);
  const serviceFeePolicy = await loadActiveServiceFeePolicy(admin);
  const entitledSourceIds = new Set(entitlements.map((entitlement) => entitlement.sourceId));
  const requestId = crypto.randomUUID();
  const mode = input.mode ?? "plan";
  const selection = await resolveProviderRoute(admin, input.messages, {
    strategy: input.routeStrategy,
    requestedModelId: input.requestedModelId,
    outputTokenAllowance: input.inferenceOptions?.maxOutputTokens,
    entitledCapacitySourceIds: entitledSourceIds,
    connectionFilter: (connection) =>
      connection.supportsStreaming &&
      connection.integrationStyle === "openai_compatible" &&
      workspaceAllowsProvider(providerPolicy, connection) &&
      (!input.inferenceOptions?.tools?.length || connection.supportsTools) &&
      (!input.inferenceOptions?.responseFormat ||
        input.inferenceOptions.responseFormat.type === "text" ||
        connection.supportsStructuredOutput) &&
      (!input.messages.some(
        (message) =>
          Array.isArray(message.content) &&
          message.content.some((part) => part.type === "image_url"),
      ) ||
        connection.supportsVision),
  });
  const selectedTransportEvidence = currentTransportEvidence(selection.connection);
  const routeAttempts = selectRouteAttempts(
    selection.routeCandidates,
    Deno.env.get("IO_PROVIDER_MAX_ATTEMPTS"),
  );
  const reserveMinor = calculateReservationMinor(
    routeAttempts,
    input.messages,
    input.inferenceOptions?.maxOutputTokens ?? 1_024,
    serviceFeePolicy.feeBasisPoints,
  );
  const reserveCustomerNanos = calculateReservationNanos(
    routeAttempts,
    input.messages,
    input.inferenceOptions?.maxOutputTokens ?? 1_024,
    serviceFeePolicy.feeBasisPoints,
  ).customerChargeNanos;
  const fingerprint = await fingerprintRouteRequest({
    workspaceId: input.workspaceId,
    mode,
    messages: input.messages,
    routeStrategy: input.routeStrategy,
    requestedModelId: input.requestedModelId,
    inferenceOptions: input.inferenceOptions as Record<string, unknown> | undefined,
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
      character_count: input.messages.reduce(
        (sum, message) => sum + JSON.stringify(message.content).length,
        0,
      ),
      streaming: true,
      execution_adapter_version: selectedTransportEvidence.executionAdapterVersion,
      translation_version: selectedTransportEvidence.translationVersion,
    },
  });

  const attempts: ProviderAttempt[] = [];
  let selectedRoute: RouteSelection | null = null;
  let opened: Awaited<ReturnType<typeof sendProviderChatStream>> | null = null;
  let selectedStartedAt = "";
  let selectedStartedAtMonotonic = 0;
  let lastError: GatewayError | null = null;
  for (const candidate of routeAttempts) {
    const startedAt = new Date().toISOString();
    const startedAtMonotonic = performance.now();
    try {
      opened = await sendProviderChatStream(candidate.connection, input.messages, {
        safetySubject: input.actorUserId,
        abortSignal: input.abortSignal,
        ...input.inferenceOptions,
      });
      selectedRoute = {
        ...selection,
        connection: candidate.connection,
        estimatedCostNanos: candidate.estimatedCostNanos,
      };
      selectedStartedAt = startedAt;
      selectedStartedAtMonotonic = startedAtMonotonic;
      break;
    } catch (error) {
      const failure = asGatewayError(error);
      attempts.push({
        connection: candidate.connection,
        startedAt,
        completedAt: new Date().toISOString(),
        state: "failed",
        errorCode: failure.code,
        upstreamStatus: failure.upstreamStatus,
      });
      if (failure.code !== "request_cancelled") {
        await recordEndpointOutcome(admin, {
          endpointId: candidate.connection.endpointId,
          succeeded: false,
          latencyMs: performance.now() - startedAtMonotonic,
          errorCode: failure.code,
        });
      }
      lastError = failure;
      if (
        failure.code !== "upstream_failure" &&
        failure.code !== "rate_limited" &&
        failure.code !== "not_configured"
      ) {
        break;
      }
    }
  }
  if (!opened || !selectedRoute) {
    const failure =
      lastError ?? new GatewayError("upstream_failure", 502, "No provider stream opened.");
    const context: StreamContext = {
      requestId,
      selection,
      selectedRoute: selection,
      serviceFeePolicy,
      entitlements,
      attempts,
    };
    await finalizeFailure(admin, input, context, failure);
    throw failure;
  }

  const context: StreamContext = {
    requestId,
    selection,
    selectedRoute,
    serviceFeePolicy,
    entitlements,
    attempts,
  };
  const source = opened.events.getReader();
  let finalized = false;
  let providerCompleted = false;
  const failOnce = async (failure: GatewayError) => {
    if (finalized) return;
    finalized = true;
    if (!providerCompleted) {
      attempts.push({
        connection: selectedRoute!.connection,
        startedAt: selectedStartedAt,
        completedAt: new Date().toISOString(),
        state: "failed",
        errorCode: failure.code,
        upstreamStatus: failure.upstreamStatus,
        providerRequestId: opened?.providerRequestId,
      });
      if (failure.code !== "request_cancelled") {
        await recordEndpointOutcome(admin, {
          endpointId: selectedRoute!.connection.endpointId,
          succeeded: false,
          latencyMs: performance.now() - selectedStartedAtMonotonic,
          errorCode: failure.code,
        });
      }
    }
    await finalizeFailure(admin, input, context, failure);
  };
  const events = new ReadableStream<SettledRouteStreamEvent>({
    async pull(controller) {
      try {
        const next = await source.read();
        if (next.done) {
          throw new GatewayError(
            "upstream_failure",
            502,
            "The provider stream ended before settlement.",
          );
        }
        if (next.value.type !== "completed") {
          controller.enqueue(next.value);
          return;
        }
        const result = next.value.result;
        providerCompleted = true;
        attempts.push({
          connection: selectedRoute!.connection,
          startedAt: selectedStartedAt,
          completedAt: new Date().toISOString(),
          state: "completed",
          providerRequestId: result.providerRequestId ?? opened?.providerRequestId,
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
        });
        await recordEndpointOutcome(admin, {
          endpointId: selectedRoute!.connection.endpointId,
          succeeded: true,
          latencyMs: performance.now() - selectedStartedAtMonotonic,
        });
        const settled = await finalizeSuccess(admin, input, context, result);
        finalized = true;
        controller.enqueue({ type: "completed", result: settled });
        controller.close();
      } catch (error) {
        const failure = asGatewayError(error);
        try {
          await failOnce(failure);
        } finally {
          controller.error(failure);
        }
      }
    },
    async cancel(reason) {
      await source.cancel(reason).catch(() => undefined);
      await failOnce(
        new GatewayError("request_cancelled", 499, "The client cancelled the provider request."),
      );
    },
  });
  const connection = selectedRoute.connection;
  return {
    replayed: false,
    requestId,
    provider: connection.providerDisplayName,
    model: connection.providerModelId,
    modelSelection: selectedRoute.strategy,
    capacitySource:
      entitlements.find((entitlement) => entitlement.sourceId === connection.capacitySourceId)
        ?.sourceKey ?? "unknown",
    serviceFeeBasisPoints: serviceFeePolicy.feeBasisPoints,
    providerKey: connection.providerKey,
    events,
  };
}

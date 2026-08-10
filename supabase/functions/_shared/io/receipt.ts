import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import type { ProviderConnection, RouteSelection } from "./types.ts";

export type ProviderAttempt = {
  connection: ProviderConnection;
  startedAt: string;
  completedAt: string;
  state: "completed" | "failed";
  errorCode?: string;
  upstreamStatus?: number;
  providerRequestId?: string;
  inputTokens?: number;
  outputTokens?: number;
};

type RouteReceiptInput = {
  requestId: string;
  selection: RouteSelection | null;
  resultState: "completed" | "failed";
  inputTokens?: number;
  outputTokens?: number;
  actualCostMinor: number;
  costBasis: "provider_usage" | "route_estimate_missing_usage" | "released_failure";
  attempts: ProviderAttempt[];
};

export async function writeRouteReceipt(admin: SupabaseClient, input: RouteReceiptInput) {
  const selected = input.selection?.connection;
  const { data, error } = await admin.rpc("io_finalize_route_request", {
    _request_id: input.requestId,
    _result_state: input.resultState,
    _route_strategy: input.selection?.strategy ?? "latest_affordable",
    _selection: selected
      ? {
          provider_id: selected.providerId,
          model_id: selected.modelId,
          endpoint_id: selected.endpointId,
          capacity_source_id: selected.capacitySourceId,
          provider_key: selected.providerKey,
          model_key: selected.providerModelId,
          capacity_mode: selected.capacityMode,
          region_code: selected.regionCode,
          residency_country_code: selected.residencyCountryCode,
          retention_class: selected.retentionClass,
          capability_version: selected.capabilityVersion,
          price_version: selected.priceVersion,
        }
      : {},
    _attempts: input.attempts.map((attempt) => ({
      provider_id: attempt.connection.providerId,
      model_id: attempt.connection.modelId,
      endpoint_id: attempt.connection.endpointId,
      state: attempt.state,
      error_code: attempt.errorCode ?? null,
      upstream_status: attempt.upstreamStatus ?? null,
      provider_request_id: attempt.providerRequestId ?? null,
      started_at: attempt.startedAt,
      completed_at: attempt.completedAt,
      input_tokens: attempt.inputTokens ?? null,
      output_tokens: attempt.outputTokens ?? null,
    })),
    _candidate_count: input.selection?.candidateCount ?? 0,
    _fallback_count: Math.max(0, input.attempts.length - 1),
    _estimated_cost_nanos: input.selection?.estimatedCostNanos ?? 0,
    _currency_code: selected?.currencyCode ?? input.attempts[0]?.connection.currencyCode,
    _input_tokens: input.inputTokens ?? null,
    _output_tokens: input.outputTokens ?? null,
    _actual_cost_minor: input.actualCostMinor,
    _policy_snapshot: input.selection
      ? {
          strategy: input.selection.strategy,
          tier: input.selection.tier,
          price_currency: selected?.currencyCode,
          cost_basis: input.costBasis,
        }
      : { cost_basis: input.costBasis },
    _candidate_summary: input.selection?.candidateSummary ?? [],
  });
  if (error) throw error;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Route finalization returned no receipt.");
  }
  const receiptId = (data as Record<string, unknown>).receiptId;
  if (typeof receiptId !== "string" || !receiptId) {
    throw new Error("Route finalization returned an invalid receipt.");
  }
  return {
    receiptId,
    replayed: (data as Record<string, unknown>).replayed === true,
    settledMinor: Number((data as Record<string, unknown>).settledMinor ?? 0),
    releasedMinor: Number((data as Record<string, unknown>).releasedMinor ?? 0),
    currencyCode:
      typeof (data as Record<string, unknown>).currencyCode === "string"
        ? ((data as Record<string, unknown>).currencyCode as string)
        : (selected?.currencyCode ?? ""),
  };
}

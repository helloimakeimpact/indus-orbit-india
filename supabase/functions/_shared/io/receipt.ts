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
  workspaceId: string;
  requestId: string;
  actorUserId: string;
  selection: RouteSelection | null;
  resultState: "completed" | "failed";
  inputTokens?: number;
  outputTokens?: number;
  attempts: ProviderAttempt[];
};

export async function writeRouteReceipt(admin: SupabaseClient, input: RouteReceiptInput) {
  const selected = input.selection?.connection;
  const { data: receipt, error: receiptError } = await admin
    .from("io_route_receipts")
    .insert({
      workspace_id: input.workspaceId,
      request_id: input.requestId,
      actor_user_id: input.actorUserId,
      route_strategy: input.selection?.strategy ?? "latest_affordable",
      result_state: input.resultState,
      selected_provider_id: selected?.providerId ?? null,
      selected_model_id: selected?.modelId ?? null,
      selected_endpoint_id: selected?.endpointId ?? null,
      selected_capacity_source_id: selected?.capacitySourceId ?? null,
      selected_provider_key: selected?.providerKey ?? null,
      selected_model_key: selected?.providerModelId ?? null,
      selected_capacity_mode: selected?.capacityMode ?? null,
      selected_region_code: selected?.regionCode ?? null,
      selected_residency_country_code: selected?.residencyCountryCode ?? null,
      selected_retention_class: selected?.retentionClass ?? null,
      capability_version: selected?.capabilityVersion ?? null,
      price_version: selected?.priceVersion ?? null,
      candidate_count: input.selection?.candidateCount ?? 0,
      fallback_count: Math.max(0, input.attempts.length - 1),
      estimated_cost_nanos: input.selection?.estimatedCostNanos ?? null,
      input_tokens: input.inputTokens ?? null,
      output_tokens: input.outputTokens ?? null,
      policy_snapshot: input.selection
        ? {
            strategy: input.selection.strategy,
            tier: input.selection.tier,
            price_currency: selected?.currencyCode,
          }
        : {},
      candidate_summary: input.selection?.candidateSummary ?? [],
    })
    .select("id")
    .single();
  if (receiptError) throw receiptError;

  if (!input.attempts.length) return receipt.id as string;

  const { error: attemptError } = await admin.from("io_provider_attempts").insert(
    input.attempts.map((attempt, index) => ({
      receipt_id: receipt.id,
      attempt_index: index + 1,
      provider_id: attempt.connection.providerId,
      model_id: attempt.connection.modelId,
      endpoint_id: attempt.connection.endpointId,
      attempt_state: attempt.state,
      error_code: attempt.errorCode ?? null,
      upstream_status: attempt.upstreamStatus ?? null,
      provider_request_id: attempt.providerRequestId ?? null,
      started_at: attempt.startedAt,
      completed_at: attempt.completedAt,
      input_tokens: attempt.inputTokens ?? null,
      output_tokens: attempt.outputTokens ?? null,
    })),
  );
  if (attemptError) throw attemptError;
  return receipt.id as string;
}

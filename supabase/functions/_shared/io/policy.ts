import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { GatewayError } from "./errors.ts";
import type { ActiveCapacityEntitlement } from "./types.ts";

export type WorkspaceProviderPolicy = {
  allowChinaHosted: boolean;
  allowTrainingPossible: boolean;
};

export async function getWorkspaceProviderPolicy(
  admin: SupabaseClient,
  workspaceId: string,
): Promise<WorkspaceProviderPolicy> {
  const { data, error } = await admin.rpc("io_get_workspace_provider_policy", {
    _workspace_id: workspaceId,
  });
  if (error) throw error;
  const row =
    data !== null && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : null;
  return {
    allowChinaHosted: row?.allowChinaHosted === true,
    allowTrainingPossible: row?.allowTrainingPossible === true,
  };
}

export function workspaceAllowsProvider(
  policy: WorkspaceProviderPolicy,
  input: { residencyCountryCode: string | null },
) {
  if (input.residencyCountryCode !== "CN") return true;
  return policy.allowChinaHosted && policy.allowTrainingPossible;
}

type CapacitySourceRow = {
  id: string;
  source_key: string;
  display_name: string;
  status: string;
};

type GrantRow = {
  capacity_source_id: string;
  io_capacity_sources: CapacitySourceRow | CapacitySourceRow[] | null;
};

export async function getActiveCapacityEntitlements(
  admin: SupabaseClient,
  workspaceId: string,
): Promise<ActiveCapacityEntitlement[]> {
  const { data, error } = await admin
    .from("io_workspace_capacity_grants")
    .select("capacity_source_id, io_capacity_sources(id, source_key, display_name, status)")
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .order("priority", { ascending: true });

  if (error) throw error;

  const entitlements = ((data ?? []) as GrantRow[]).flatMap((grant) => {
    const source = grant.io_capacity_sources;
    if (!source || Array.isArray(source) || source.status !== "active") return [];
    return [
      {
        sourceId: source.id,
        sourceKey: source.source_key,
        displayName: source.display_name,
      },
    ];
  });

  if (!entitlements.length) {
    throw new GatewayError("forbidden", 403, "This workspace has no active capacity entitlement.");
  }

  return entitlements;
}

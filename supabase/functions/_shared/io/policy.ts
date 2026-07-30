import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { GatewayError } from "./errors.ts";
import type { PartnerEntitlement } from "./types.ts";

export async function requireActivePartnerEntitlement(
  admin: SupabaseClient,
  workspaceId: string,
): Promise<PartnerEntitlement> {
  const { data: capacitySource, error: sourceError } = await admin
    .from("io_capacity_sources")
    .select("id, source_key, display_name, status")
    .eq("source_key", "partner-gateway")
    .maybeSingle();

  if (sourceError) throw sourceError;
  if (!capacitySource || capacitySource.status !== "active") {
    throw new GatewayError(
      "not_configured",
      503,
      "No active partner capacity source is configured.",
    );
  }

  const { data: grant, error: grantError } = await admin
    .from("io_workspace_capacity_grants")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("capacity_source_id", capacitySource.id)
    .eq("status", "active")
    .maybeSingle();

  if (grantError) throw grantError;
  if (!grant) {
    throw new GatewayError("forbidden", 403, "This workspace has no active partner entitlement.");
  }

  return { sourceKey: capacitySource.source_key, displayName: capacitySource.display_name };
}

// Browser-facing I/O data access. Keep privileged work in Edge Functions or database RPCs.
import { supabase } from "@/integrations/supabase/client";

export type IoWorkspace = {
  id: string;
  name: string;
  slug: string;
  status: string;
};

export type IoCapacitySource = {
  id: string;
  displayName: string;
  operatorName: string;
  provenance: string;
  status: string;
  regionCode: string | null;
  country: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  grantKind: string;
  grantStatus: string;
  quotaAmount: number | null;
  quotaUnit: string | null;
};

export type IoAuditEvent = {
  id: number;
  eventType: string;
  occurredAt: string;
  payload: Record<string, unknown>;
};

export type PartnerRunResult = {
  requestId: string;
  provider: string;
  model: string;
  content: string;
  usage: { inputTokens?: number; outputTokens?: number } | null;
  capacitySource: string;
};

export async function getMyIoWorkspaces(): Promise<IoWorkspace[]> {
  const { data, error } = await supabase
    .from("io_workspaces")
    .select("id, name, slug, status")
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((workspace) => ({
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    status: workspace.status,
  }));
}

export async function createMyIoWorkspace(): Promise<IoWorkspace> {
  const { data: workspace, error } = await supabase.rpc("create_my_io_workspace");
  if (error) throw new Error(error.message);
  if (!workspace) throw new Error("I/O workspace creation returned no workspace.");

  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    status: workspace.status,
  };
}

export async function getIoCapacitySources(workspaceId: string): Promise<IoCapacitySource[]> {
  const { data, error } = await supabase
    .from("io_workspace_capacity_grants")
    .select(
      "grant_kind, status, quota_amount, quota_unit, io_capacity_sources(id, display_name, operator_name, provenance, status, region_code, data_residency_country, public_notes, public_capacity_metadata)",
    )
    .eq("workspace_id", workspaceId)
    .in("status", ["pending", "active", "exhausted"])
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).flatMap((grant) => {
    const source = grant.io_capacity_sources;
    if (!source || Array.isArray(source)) return [];
    return [
      {
        id: source.id,
        displayName: source.display_name,
        operatorName: source.operator_name,
        provenance: source.provenance,
        status: source.status,
        regionCode: source.region_code,
        country: source.data_residency_country,
        notes: source.public_notes,
        metadata:
          source.public_capacity_metadata &&
          typeof source.public_capacity_metadata === "object" &&
          !Array.isArray(source.public_capacity_metadata)
            ? source.public_capacity_metadata
            : {},
        grantKind: grant.grant_kind,
        grantStatus: grant.status,
        quotaAmount: grant.quota_amount,
        quotaUnit: grant.quota_unit,
      },
    ];
  });
}

export async function getIoAuditEvents(workspaceId: string): Promise<IoAuditEvent[]> {
  const { data, error } = await supabase
    .from("io_audit_events")
    .select("id, event_type, occurred_at, payload")
    .eq("workspace_id", workspaceId)
    .order("occurred_at", { ascending: false })
    .limit(8);

  if (error) throw new Error(error.message);

  return (data ?? []).map((event) => ({
    id: event.id,
    eventType: event.event_type,
    occurredAt: event.occurred_at,
    payload:
      event.payload && typeof event.payload === "object" && !Array.isArray(event.payload)
        ? event.payload
        : {},
  }));
}

export async function runPartnerRoute(input: {
  workspaceId: string;
  prompt: string;
  mode: "observe" | "plan" | "build" | "run";
}): Promise<PartnerRunResult> {
  const { data, error } = await supabase.functions.invoke("io-gateway", {
    body: {
      action: "partner_chat",
      workspace_id: input.workspaceId,
      mode: input.mode,
      messages: [{ role: "user", content: input.prompt }],
    },
  });

  if (error) throw new Error(error.message);
  if (!data?.ok) throw new Error(data?.error ?? "The partner route could not run.");
  return data as PartnerRunResult;
}

export async function recordLocalOpenCodeSession(input: {
  workspaceId: string;
  connectorOrigin: string;
  sessionId: string;
}): Promise<void> {
  const { error } = await supabase.functions.invoke("io-gateway", {
    body: {
      action: "record_local_opencode",
      workspace_id: input.workspaceId,
      connector_origin: input.connectorOrigin,
      session_id: input.sessionId,
    },
  });

  if (error) throw new Error(error.message);
}

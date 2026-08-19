import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

type AuditInput = {
  workspaceId: string;
  actorKind: "user" | "api_key" | "provider";
  actorUserId?: string;
  apiKeyId?: string;
  eventType: string;
  requestId?: string;
  payload: Record<string, unknown>;
};

export async function writeIoAuditEvent(admin: SupabaseClient, input: AuditInput) {
  const { error } = await admin.from("io_audit_events").insert({
    workspace_id: input.workspaceId,
    actor_kind: input.actorKind,
    actor_user_id: input.actorUserId,
    api_key_id: input.apiKeyId,
    event_type: input.eventType,
    request_id: input.requestId,
    payload: input.payload,
  });
  if (error) throw error;
}

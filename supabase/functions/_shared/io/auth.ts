import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { GatewayError } from "./errors.ts";
import type { GatewayActor } from "./types.ts";

export function createGatewayClients(authorization: string) {
  const projectUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!projectUrl || !anonKey || !serviceRoleKey) {
    throw new GatewayError(
      "internal_error",
      500,
      "The I/O gateway is missing Supabase runtime configuration.",
    );
  }

  return {
    authClient: createClient(projectUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    }),
    admin: createClient(projectUrl, serviceRoleKey, { auth: { persistSession: false } }),
  };
}

export function createGatewayAdminClient() {
  const projectUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!projectUrl || !serviceRoleKey) {
    throw new GatewayError(
      "internal_error",
      500,
      "The I/O gateway is missing Supabase runtime configuration.",
    );
  }
  return createClient(projectUrl, serviceRoleKey, { auth: { persistSession: false } });
}

export async function authenticateGatewayActor(authClient: SupabaseClient): Promise<GatewayActor> {
  const { data, error } = await authClient.auth.getUser();
  if (error || !data.user) {
    throw new GatewayError("unauthorized", 401, "Unauthorized.");
  }
  return { id: data.user.id };
}

export async function requireWorkspaceMembership(
  admin: SupabaseClient,
  workspaceId: string,
  actorId: string,
) {
  const { data, error } = await admin
    .from("io_workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", actorId)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new GatewayError("forbidden", 403, "You are not an active member of this workspace.");
  }
  return data.role;
}

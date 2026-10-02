import { supabase } from "@/integrations/supabase/client";
import { isMissingSchemaContract } from "@/integrations/supabase/schema-compat";

async function getRemainingForUser(userId: string): Promise<number> {
  const { data, error } = await supabase.rpc("vouch_remaining", { _user_id: userId });
  if (error) throw new Error(error.message);
  return (data as number) ?? 0;
}

async function getQuotaForUser(userId: string): Promise<number> {
  const { data, error } = await supabase.rpc("vouch_effective_quota", { _user_id: userId });
  if (error) throw new Error(error.message);
  return (data as number) ?? 0;
}

export async function getMyVouchStatus() {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const userId = userData.user.id;
  const [remaining, quota, settingsRes, codesRes, eventsRes, requestsRes] = await Promise.all([
    getRemainingForUser(userId),
    getQuotaForUser(userId),
    supabase
      .from("vouch_settings")
      .select("window_days, code_ttl_days, default_quota")
      .eq("id", "global")
      .maybeSingle(),
    supabase
      .from("vouch_codes")
      .select("id, issuer_id, created_at, expires_at, redeemed_at, redeemer_id, status")
      .eq("issuer_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("vouch_events")
      .select("*")
      .eq("issuer_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("vouch_requests")
      .select("*")
      .eq("requester_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return {
    remaining,
    quota,
    windowDays: settingsRes.data?.window_days ?? 28,
    codeTtlDays: settingsRes.data?.code_ttl_days ?? 14,
    codes: codesRes.data ?? [],
    events: eventsRes.data ?? [],
    myRequests: requestsRes.data ?? [],
  };
}

export async function issueCode() {
  const { data, error } = await supabase.rpc("issue_my_vouch_code");
  if (error)
    throw new Error(
      isMissingSchemaContract(error)
        ? "Vouch codes are temporarily unavailable. Please try again later."
        : error.message,
    );
  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data) ||
    typeof data.code !== "string" ||
    typeof data.expiresAt !== "string"
  )
    throw new Error("Vouch issuance returned an invalid result.");
  return { code: data.code, expiresAt: data.expiresAt };
}

export async function vouchDirectly(recipientId: string) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const { data, error } = await supabase.rpc("vouch_directly", { _recipient_id: recipientId });
  if (error) throw new Error(error.message);

  return data as { ok: boolean; alreadyVerified: boolean };
}

export async function redeemCode(code: string) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const { data, error } = await supabase.rpc("redeem_vouch_code", { _code: code });
  if (error) throw new Error(error.message);

  return data as { ok: boolean };
}

export async function requestVouch(message: string, targetVerifierId?: string | null) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  if (message.trim().length < 10) throw new Error("Please add a short message (10+ chars).");

  const { error } = await supabase.rpc("request_my_vouch", {
    _message: message.trim(),
    _target_verifier_id: targetVerifierId ?? (null as unknown as string),
    _client_request_id: crypto.randomUUID(),
  });
  if (error) throw new Error(error.message);

  return { ok: true };
}

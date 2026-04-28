import { supabase } from "@/integrations/supabase/client";

function generateCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 10; i++) {
    s += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return s;
}

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

async function isAdminCheck(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

async function assertCanIssue(userId: string) {
  const { data: susp } = await supabase
    .from("member_suspensions")
    .select("id")
    .eq("user_id", userId)
    .is("lifted_at", null)
    .maybeSingle();
  if (susp) throw new Error("Your account is suspended.");

  const admin = await isAdminCheck(userId);
  if (admin) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_verified")
    .eq("user_id", userId)
    .maybeSingle();
  if (!profile?.is_verified) {
    throw new Error("Only verified members can vouch.");
  }

  const remaining = await getRemainingForUser(userId);
  if (remaining <= 0) {
    throw new Error("You have used your vouch budget for this period.");
  }
}

export async function getMyVouchStatus() {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const userId = userData.user.id;
  const [remaining, quota, settingsRes, codesRes, eventsRes, requestsRes] = await Promise.all([
    getRemainingForUser(userId),
    getQuotaForUser(userId),
    supabase.from("vouch_settings").select("window_days, code_ttl_days, default_quota").eq("id", "global").maybeSingle(),
    supabase.from("vouch_codes").select("*").eq("issuer_id", userId).order("created_at", { ascending: false }).limit(20),
    supabase.from("vouch_events").select("*").eq("issuer_id", userId).order("created_at", { ascending: false }).limit(20),
    supabase.from("vouch_requests").select("*").eq("requester_id", userId).order("created_at", { ascending: false }).limit(20),
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
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const userId = userData.user.id;
  await assertCanIssue(userId);

  const { data: settings } = await supabase
    .from("vouch_settings")
    .select("code_ttl_days")
    .eq("id", "global")
    .maybeSingle();
  const ttl = settings?.code_ttl_days ?? 14;
  const expires = new Date(Date.now() + ttl * 24 * 60 * 60 * 1000).toISOString();

  let inserted: { id: string; code: string } | null = null;
  for (let i = 0; i < 5; i++) {
    const code = generateCode();
    const { data, error } = await supabase
      .from("vouch_codes")
      .insert({ issuer_id: userId, code, expires_at: expires })
      .select("id, code")
      .single();
    if (!error && data) { inserted = data; break; }
  }
  if (!inserted) throw new Error("Could not generate code, please retry.");

  await supabase.from("vouch_events").insert({
    issuer_id: userId,
    channel: "code",
    code_id: inserted.id,
  });

  await supabase.from("audit_log").insert({
    actor_id: userId,
    action: "vouch.code_issued",
    target_type: "vouch_code",
    target_id: inserted.id,
  });

  return { code: inserted.code, expiresAt: expires };
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

  const userId = userData.user.id;
  if (message.trim().length < 10) throw new Error("Please add a short message (10+ chars).");

  const { error } = await supabase.from("vouch_requests").insert({
    requester_id: userId,
    target_verifier_id: targetVerifierId ?? null,
    message: message.trim(),
  });
  if (error) throw new Error(error.message);

  await supabase.from("audit_log").insert({
    actor_id: userId,
    action: "vouch.request_created",
    target_type: "profile",
    target_id: targetVerifierId ?? null,
  });

  // Notify the target verifier if one was specified
  if (targetVerifierId) {
    await supabase.from("notifications").insert({
      user_id: targetVerifierId,
      type: "vouch_request",
      message: "Someone has requested a vouch from you.",
      link: "/app/vouch",
    });
  }

  return { ok: true };
}

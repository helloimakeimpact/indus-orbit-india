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

  const userId = userData.user.id;
  if (recipientId === userId) throw new Error("You cannot vouch for yourself.");
  await assertCanIssue(userId);

  const { data: recipient, error: rErr } = await supabase
    .from("profiles")
    .select("id, user_id, is_verified")
    .eq("user_id", recipientId)
    .maybeSingle();
  if (rErr || !recipient) throw new Error("Recipient not found.");

  if (!recipient.is_verified) {
    const { error } = await supabase
      .from("profiles")
      .update({ is_verified: true, verified_by: userId })
      .eq("id", recipient.id);
    if (error) throw new Error(error.message);
  }

  await supabase.from("vouch_events").insert({
    issuer_id: userId,
    recipient_id: recipientId,
    channel: "direct",
  });

  await supabase.from("audit_log").insert({
    actor_id: userId,
    action: "vouch.direct",
    target_type: "profile",
    target_id: recipientId,
  });

  // Notify the recipient
  await supabase.from("notifications").insert({
    user_id: recipientId,
    type: "vouch_direct",
    message: "You have been vouched for and verified!",
    link: "/app/profile",
  });

  return { ok: true, alreadyVerified: recipient.is_verified };
}

export async function redeemCode(code: string) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const userId = userData.user.id;
  const normalizedCode = code.trim().toUpperCase();
  if (normalizedCode.length < 6) throw new Error("Invalid code.");

  const { data: codeRow } = await supabase
    .from("vouch_codes")
    .select("*")
    .eq("code", normalizedCode)
    .maybeSingle();
  if (!codeRow) throw new Error("Code not found.");
  if (codeRow.status !== "active") throw new Error(`Code is ${codeRow.status}.`);
  if (new Date(codeRow.expires_at).getTime() < Date.now()) {
    await supabase.from("vouch_codes").update({ status: "expired" }).eq("id", codeRow.id);
    throw new Error("Code has expired.");
  }
  if (codeRow.issuer_id === userId) throw new Error("You cannot redeem your own code.");

  const { data: susp } = await supabase
    .from("member_suspensions")
    .select("id")
    .eq("user_id", userId)
    .is("lifted_at", null)
    .maybeSingle();
  if (susp) throw new Error("Your account is suspended.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, is_verified")
    .eq("user_id", userId)
    .maybeSingle();
  if (!profile) throw new Error("Profile not found. Complete onboarding first.");

  if (!profile.is_verified) {
    const { error } = await supabase
      .from("profiles")
      .update({ is_verified: true, verified_by: codeRow.issuer_id })
      .eq("id", profile.id);
    if (error) throw new Error(error.message);
  }

  await supabase
    .from("vouch_codes")
    .update({ status: "redeemed", redeemed_at: new Date().toISOString(), redeemer_id: userId })
    .eq("id", codeRow.id);

  await supabase
    .from("vouch_events")
    .update({ recipient_id: userId })
    .eq("code_id", codeRow.id);

  await supabase.from("audit_log").insert({
    actor_id: userId,
    action: "vouch.code_redeemed",
    target_type: "vouch_code",
    target_id: codeRow.id,
    metadata: { issuer_id: codeRow.issuer_id },
  });

  // Notify the issuer
  await supabase.from("notifications").insert({
    user_id: codeRow.issuer_id,
    type: "vouch_code_redeemed",
    message: "Someone successfully redeemed your vouch code.",
    link: "/app/vouch",
  });

  return { ok: true };
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

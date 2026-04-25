import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function generateCode(): string {
  // 10-char alphanumeric, avoiding confusable chars
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 10; i++) {
    s += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return s;
}

async function getRemainingForUser(userId: string): Promise<number> {
  const { data, error } = await supabaseAdmin.rpc("vouch_remaining", { _user_id: userId });
  if (error) throw new Error(error.message);
  return (data as number) ?? 0;
}

async function getQuotaForUser(userId: string): Promise<number> {
  const { data, error } = await supabaseAdmin.rpc("vouch_effective_quota", { _user_id: userId });
  if (error) throw new Error(error.message);
  return (data as number) ?? 0;
}

async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

async function assertCanIssue(userId: string) {
  // Suspended check
  const { data: susp } = await supabaseAdmin
    .from("member_suspensions")
    .select("id")
    .eq("user_id", userId)
    .is("lifted_at", null)
    .maybeSingle();
  if (susp) throw new Error("Your account is suspended.");

  const admin = await isAdmin(userId);
  if (admin) return; // unlimited

  // Must be verified to issue
  const { data: profile } = await supabaseAdmin
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

export const getMyVouchStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    const [remaining, quota, settingsRes, codesRes, eventsRes, requestsRes] = await Promise.all([
      getRemainingForUser(userId),
      getQuotaForUser(userId),
      supabaseAdmin.from("vouch_settings").select("window_days, code_ttl_days, default_quota").eq("id", "global").maybeSingle(),
      supabaseAdmin.from("vouch_codes").select("*").eq("issuer_id", userId).order("created_at", { ascending: false }).limit(20),
      supabaseAdmin.from("vouch_events").select("*").eq("issuer_id", userId).order("created_at", { ascending: false }).limit(20),
      supabaseAdmin.from("vouch_requests").select("*").eq("requester_id", userId).order("created_at", { ascending: false }).limit(20),
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
  });

export const issueCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    await assertCanIssue(userId);

    const { data: settings } = await supabaseAdmin
      .from("vouch_settings")
      .select("code_ttl_days")
      .eq("id", "global")
      .maybeSingle();
    const ttl = settings?.code_ttl_days ?? 14;
    const expires = new Date(Date.now() + ttl * 24 * 60 * 60 * 1000).toISOString();

    // Try a few times in case of (very unlikely) collision
    let code = "";
    let inserted: { id: string; code: string } | null = null;
    for (let i = 0; i < 5; i++) {
      code = generateCode();
      const { data, error } = await supabaseAdmin
        .from("vouch_codes")
        .insert({ issuer_id: userId, code, expires_at: expires })
        .select("id, code")
        .single();
      if (!error && data) { inserted = data; break; }
    }
    if (!inserted) throw new Error("Could not generate code, please retry.");

    // Ledger entry — counts against the 28-day window
    await supabaseAdmin.from("vouch_events").insert({
      issuer_id: userId,
      channel: "code",
      code_id: inserted.id,
    });

    // Audit log
    await supabaseAdmin.from("audit_log").insert({
      actor_id: userId,
      action: "vouch.code_issued",
      target_type: "vouch_code",
      target_id: inserted.id,
    });

    return { code: inserted.code, expiresAt: expires };
  });

export const vouchDirectly = createServerFn({ method: "POST" })
  .inputValidator((d: { recipientId: string }) => d)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    if (data.recipientId === userId) throw new Error("You cannot vouch for yourself.");
    await assertCanIssue(userId);

    const { data: recipient, error: rErr } = await supabaseAdmin
      .from("profiles")
      .select("id, user_id, is_verified")
      .eq("user_id", data.recipientId)
      .maybeSingle();
    if (rErr || !recipient) throw new Error("Recipient not found.");

    // Flip verification (no-op if already verified, but we still log + charge)
    if (!recipient.is_verified) {
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ is_verified: true, verified_by: userId })
        .eq("id", recipient.id);
      if (error) throw new Error(error.message);
    }

    await supabaseAdmin.from("vouch_events").insert({
      issuer_id: userId,
      recipient_id: data.recipientId,
      channel: "direct",
    });

    await supabaseAdmin.from("audit_log").insert({
      actor_id: userId,
      action: "vouch.direct",
      target_type: "profile",
      target_id: data.recipientId,
    });

    return { ok: true, alreadyVerified: recipient.is_verified };
  });

export const redeemCode = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string }) => d)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const code = data.code.trim().toUpperCase();
    if (code.length < 6) throw new Error("Invalid code.");

    const { data: codeRow } = await supabaseAdmin
      .from("vouch_codes")
      .select("*")
      .eq("code", code)
      .maybeSingle();
    if (!codeRow) throw new Error("Code not found.");
    if (codeRow.status !== "active") throw new Error(`Code is ${codeRow.status}.`);
    if (new Date(codeRow.expires_at).getTime() < Date.now()) {
      await supabaseAdmin.from("vouch_codes").update({ status: "expired" }).eq("id", codeRow.id);
      throw new Error("Code has expired.");
    }
    if (codeRow.issuer_id === userId) throw new Error("You cannot redeem your own code.");

    // Suspended redeemer?
    const { data: susp } = await supabaseAdmin
      .from("member_suspensions")
      .select("id")
      .eq("user_id", userId)
      .is("lifted_at", null)
      .maybeSingle();
    if (susp) throw new Error("Your account is suspended.");

    // Verify the redeemer
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, is_verified")
      .eq("user_id", userId)
      .maybeSingle();
    if (!profile) throw new Error("Profile not found. Complete onboarding first.");

    if (!profile.is_verified) {
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ is_verified: true, verified_by: codeRow.issuer_id })
        .eq("id", profile.id);
      if (error) throw new Error(error.message);
    }

    await supabaseAdmin
      .from("vouch_codes")
      .update({ status: "redeemed", redeemed_at: new Date().toISOString(), redeemer_id: userId })
      .eq("id", codeRow.id);

    // Backfill ledger event with recipient
    await supabaseAdmin
      .from("vouch_events")
      .update({ recipient_id: userId })
      .eq("code_id", codeRow.id);

    await supabaseAdmin.from("audit_log").insert({
      actor_id: userId,
      action: "vouch.code_redeemed",
      target_type: "vouch_code",
      target_id: codeRow.id,
      metadata: { issuer_id: codeRow.issuer_id },
    });

    return { ok: true };
  });

export const requestVouch = createServerFn({ method: "POST" })
  .inputValidator((d: { targetVerifierId?: string | null; message: string }) => d)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    if (data.message.trim().length < 10) throw new Error("Please add a short message (10+ chars).");

    const { error } = await supabaseAdmin.from("vouch_requests").insert({
      requester_id: userId,
      target_verifier_id: data.targetVerifierId ?? null,
      message: data.message.trim(),
    });
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("audit_log").insert({
      actor_id: userId,
      action: "vouch.request_created",
      target_type: "profile",
      target_id: data.targetVerifierId ?? null,
    });

    return { ok: true };
  });

import { createClient } from "npm:@supabase/supabase-js@2.103.3";
import { createGuestEventHandler } from "../_shared/events/guest-handler.ts";

const admin = () => {
  const url = Deno.env.get("SUPABASE_URL"),
    key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Guest service unavailable");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
};
Deno.serve(
  createGuestEventHandler({
    configuration: () => ({
      secret: Deno.env.get("TURNSTILE_SECRET_KEY")?.trim() ?? "",
      origins: (Deno.env.get("PUBLIC_FORM_ALLOWED_ORIGINS") ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      canonicalOrigin: Deno.env.get("EVENT_PUBLIC_ORIGIN")?.trim() ?? "",
      mailConfigured: Boolean(Deno.env.get("RESEND_API_KEY") && Deno.env.get("IO_EMAIL_FROM")),
    }),
    fetch,
    requestLink: async (eventId, email, name, tokenHash) => {
      const { data, error } = await admin().rpc("request_event_guest_link", {
        _event_id: eventId,
        _email: email,
        _name: name,
        _token_hash: tokenHash,
      });
      if (error) throw new Error("Guest request unavailable");
      return data === true;
    },
    receipt: async (eventId, tokenHash, action) => {
      const { data, error } = await admin().rpc("event_guest_receipt", {
        _event_id: eventId,
        _token_hash: tokenHash,
        _action: action,
      });
      if (error) throw new Error("Guest link unavailable");
      return data;
    },
    sendLink: async (email, url, key) => {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
          "Content-Type": "application/json",
          "Idempotency-Key": key,
        },
        body: JSON.stringify({
          from: Deno.env.get("IO_EMAIL_FROM"),
          to: [email],
          subject: "Your Indus Orbit event registration link",
          text: `Confirm your email and registration:\n\n${url}\n\nOpen this private link within 15 minutes, then choose Confirm registration. A place is allocated only when you confirm. Host approval or a waitlist may apply. After confirmation, keep this link to manage your registration. Do not share it.\n\nIf you did not request this, you can ignore this email.`,
        }),
        signal: AbortSignal.timeout(10000),
      });
      await response.body?.cancel();
      if (!response.ok) throw new Error("Guest email unavailable");
    },
  }),
);

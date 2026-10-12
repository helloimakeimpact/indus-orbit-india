import { createClient } from "npm:@supabase/supabase-js@2.111.0";
import { createEventEmailWorker } from "../_shared/events/email-worker.ts";

const keys: string[] = [];
try {
  const configured = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
  if (configured && typeof configured === "object" && !Array.isArray(configured)) {
    keys.push(
      ...Object.values(configured).filter(
        (v): v is string => typeof v === "string" && v.length > 0,
      ),
    );
  }
} catch {
  /* Configuration fails closed when no key is available. */
}
const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if (legacy) keys.push(legacy);
const url = Deno.env.get("SUPABASE_URL");
const admin =
  url && keys[0]
    ? createClient(url, keys[0], {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;
async function rpc(name: string, args: Record<string, unknown>) {
  if (!admin) throw new Error("backend_unavailable");
  const { data, error } = await admin.rpc(name, args);
  if (error) throw new Error("queue_unavailable");
  return data;
}
Deno.serve(
  createEventEmailWorker({
    authorized(request) {
      const key =
        request.headers.get("apikey") ??
        (request.headers.get("authorization")?.startsWith("Bearer ")
          ? request.headers.get("authorization")!.slice(7)
          : null);
      return !!key && keys.includes(key);
    },
    configuration: () => ({
      origin: Deno.env.get("EVENT_PUBLIC_ORIGIN") ?? "",
      from: Deno.env.get("IO_EMAIL_FROM") ?? "",
      resendKey: Deno.env.get("RESEND_API_KEY") ?? "",
      backendReady: !!admin,
    }),
    claim: () => rpc("claim_event_delivery_batch", { _limit: 10 }),
    ready: async (job) =>
      (await rpc("event_delivery_ready", { _id: job.id, _lease_token: job.lease_token })) === true,
    prepare: (job, payload) =>
      rpc("prepare_event_delivery", {
        _id: job.id,
        _lease_token: job.lease_token,
        _payload: payload,
      }),
    complete: async (job, outcome) => {
      await rpc("complete_event_delivery", {
        _id: job.id,
        _lease_token: job.lease_token,
        _succeeded: outcome.succeeded,
        _provider_message_id: outcome.providerMessageId ?? null,
        _error_code: outcome.errorCode ?? null,
      });
    },
    fetch,
  }),
);

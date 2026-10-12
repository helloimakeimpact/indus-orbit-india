import { createClient } from "npm:@supabase/supabase-js@2.111.0";
import { createEducationScanWorker } from "../_shared/attachments/education-scan-worker.ts";
const keys: string[] = [];
try {
  const values = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
  if (values && typeof values === "object" && !Array.isArray(values))
    keys.push(
      ...Object.values(values).filter((v): v is string => typeof v === "string" && v.length > 0),
    );
} catch {
  /* Missing configuration fails closed. */
}
const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if (legacy) keys.push(legacy);
const url = Deno.env.get("SUPABASE_URL");
const admin =
  url && keys[0]
    ? createClient(url, keys[0], { auth: { autoRefreshToken: false, persistSession: false } })
    : null;
async function rpc(name: string, args: Record<string, unknown>) {
  if (!admin) throw new Error("backend_unavailable");
  const { data, error } = await admin.rpc(name, args);
  if (error) throw new Error("queue_unavailable");
  return data;
}
Deno.serve(
  createEducationScanWorker({
    authorized(request) {
      const key =
        request.headers.get("apikey") ??
        (request.headers.get("authorization")?.startsWith("Bearer ")
          ? request.headers.get("authorization")!.slice(7)
          : null);
      return !!key && keys.includes(key);
    },
    configuration: () => ({
      url: Deno.env.get("ORBIT_ATTACHMENT_SCANNER_URL") ?? "",
      token: Deno.env.get("ORBIT_ATTACHMENT_SCANNER_TOKEN") ?? "",
      provider: Deno.env.get("ORBIT_ATTACHMENT_SCANNER_PROVIDER_KEY") ?? "",
      backendReady: !!admin,
    }),
    claim: () => rpc("claim_education_scan_batch", { _limit: 5 }),
    signedUrl: async (job) => {
      if (!admin) throw new Error("backend_unavailable");
      const { data, error } = await admin.storage
        .from("education")
        .createSignedUrl(job.storage_path, 5 * 60);
      if (error || !data?.signedUrl) throw new Error("scanner_unavailable");
      return data.signedUrl;
    },
    complete: async (job, result) => {
      await rpc("complete_education_scan", {
        _id: job.id,
        _lease_token: job.lease_token,
        _verdict: result.verdict,
        _sha256: result.sha256 ?? null,
        _provider_key: Deno.env.get("ORBIT_ATTACHMENT_SCANNER_PROVIDER_KEY") ?? null,
        _provider_event_id: result.providerEventId ?? null,
        _error_code: result.errorCode ?? null,
      });
    },
    fetch,
    now: Date.now,
  }),
);

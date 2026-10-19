import { createClient } from "npm:@supabase/supabase-js@2.111.0";
import { createPrivacyRetentionWorker } from "../_shared/privacy/retention-worker.ts";
import { privacyExecutionEnabled } from "../_shared/privacy/policy.ts";

const keys: string[] = [];
try {
  const values = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
  if (values && typeof values === "object" && !Array.isArray(values))
    keys.push(...Object.values(values).filter((v): v is string => typeof v === "string" && !!v));
} catch {
  /* Unconfigured service authentication fails closed. */
}
const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if (legacy) keys.push(legacy);
const url = Deno.env.get("SUPABASE_URL");
const admin =
  url && keys[0]
    ? createClient(url, keys[0], {
        auth: { autoRefreshToken: false, persistSession: false },
        global: {
          fetch: (input, init) =>
            fetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(20_000) }),
        },
      })
    : null;
async function rpc(name: string, args: Record<string, unknown> = {}) {
  if (!admin) throw new Error("backend_unavailable");
  const { data, error } = await admin.rpc(name, args).abortSignal(AbortSignal.timeout(20_000));
  if (error) throw new Error("backend_unavailable");
  return data;
}
Deno.serve(
  createPrivacyRetentionWorker({
    authorized(request) {
      const key =
        request.headers.get("apikey") ??
        request.headers.get("authorization")?.replace(/^Bearer /, "");
      return !!key && keys.includes(key);
    },
    enabled: () =>
      !!admin && privacyExecutionEnabled(Deno.env.get("PRIVACY_EXECUTION_ENVIRONMENT")),
    retain: () => rpc("run_privacy_retention_batch"),
    claim: () => rpc("claim_privacy_file_cleanup"),
    current: async (job) =>
      (await rpc("privacy_file_cleanup_current", {
        _object_id: job.object_id,
        _lease_token: job.lease_token,
      })) === true,
    remove: async (job) => {
      if (!admin) throw new Error("backend_unavailable");
      const { error } = await admin.storage.from(job.bucket_id).remove([job.storage_path]);
      if (error) throw new Error("storage_removal_failed");
    },
    complete: async (job, succeeded) =>
      (await rpc("complete_privacy_file_cleanup", {
        _object_id: job.object_id,
        _lease_token: job.lease_token,
        _succeeded: succeeded,
      })) === true,
  }),
);

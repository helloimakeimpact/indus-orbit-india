import { createClient } from "npm:@supabase/supabase-js@2.111.0";
import {
  createAccountExportWorker,
  type AccountExportJob,
} from "../_shared/privacy/export-worker.ts";
import { privacyExecutionEnabled } from "../_shared/privacy/policy.ts";

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
  if (error)
    throw new Error(error.code === "54000" ? "export_requires_assistance" : "backend_unavailable");
  return data;
}
const binding = (job: AccountExportJob) => ({
  _request_id: job.request_id,
  _lease_token: job.lease_token,
});
Deno.serve(
  createAccountExportWorker({
    authorized(request) {
      const key =
        request.headers.get("apikey") ??
        request.headers.get("authorization")?.replace(/^Bearer /, "");
      return !!key && keys.includes(key);
    },
    enabled: () =>
      !!admin && privacyExecutionEnabled(Deno.env.get("PRIVACY_EXECUTION_ENVIRONMENT")),
    claim: () => rpc("claim_account_export"),
    current: async (job) => (await rpc("account_export_current", binding(job))) === true,
    snapshot: (job) => rpc("build_account_export", binding(job)),
    upload: async (job, bytes) => {
      if (!admin) throw new Error("backend_unavailable");
      const { error } = await admin.storage
        .from("account-exports")
        .upload(job.artifact_path, bytes, {
          contentType: "application/json",
          upsert: false,
          cacheControl: "0",
        });
      if (error) throw new Error("artifact_upload_failed");
    },
    complete: async (job, sha256, size) =>
      (await rpc("complete_account_export", {
        ...binding(job),
        _sha256: sha256,
        _byte_size: size,
      })) === true,
    fail: async (job, code) =>
      (await rpc("fail_account_export", { ...binding(job), _error_code: code })) === true,
  }),
);

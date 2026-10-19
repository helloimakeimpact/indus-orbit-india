import { createClient } from "npm:@supabase/supabase-js@2.111.0";
import {
  createAccountDeletionWorker,
  type AccountDeletionJob,
} from "../_shared/privacy/deletion-worker.ts";
import { privacyExecutionEnabled } from "../_shared/privacy/policy.ts";
const keys: string[] = [];
try {
  const values = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
  if (values && typeof values === "object" && !Array.isArray(values))
    keys.push(...Object.values(values).filter((v): v is string => typeof v === "string" && !!v));
} catch {
  /* Service authentication fails closed. */
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
const binding = (job: AccountDeletionJob) => ({
  _request_id: job.request_id,
  _lease_token: job.lease_token,
});
Deno.serve(
  createAccountDeletionWorker({
    authorized(request) {
      const key =
        request.headers.get("apikey") ??
        request.headers.get("authorization")?.replace(/^Bearer /, "");
      return !!key && keys.includes(key);
    },
    enabled: () =>
      !!admin && privacyExecutionEnabled(Deno.env.get("PRIVACY_EXECUTION_ENVIRONMENT")),
    claim: () => rpc("claim_account_deletion"),
    current: async (job) => (await rpc("account_deletion_current", binding(job))) === true,
    banIdentity: async (job) => {
      if (!admin) throw new Error("backend_unavailable");
      const found = await admin.auth.admin.getUserById(job.requester_id);
      if (found.error || !found.data.user) throw new Error("identity_unconfirmed");
      // Null only known metadata keys; never log or persist their values here.
      const empty = (value: Record<string, unknown>) =>
        Object.fromEntries(Object.keys(value).map((key) => [key, null]));
      const changed = await admin.auth.admin.updateUserById(job.requester_id, {
        ban_duration: "876000h",
        user_metadata: empty(found.data.user.user_metadata ?? {}),
        app_metadata: empty(found.data.user.app_metadata ?? {}),
      });
      if (changed.error) throw new Error("identity_unconfirmed");
    },
    erase: (job) => rpc("erase_closed_account_data", binding(job)),
    advance: (job) => rpc("advance_account_deletion", binding(job)),
    identityRemoved: async (job) => (await rpc("account_identity_removed", binding(job))) === true,
    removeIdentity: async (job) => {
      if (!admin) throw new Error("backend_unavailable");
      const { error } = await admin.auth.admin.deleteUser(job.requester_id, true);
      if (error) throw new Error("identity_unconfirmed");
    },
    complete: async (job) => (await rpc("complete_account_deletion", binding(job))) === true,
    defer: async (job, failed) =>
      (await rpc("defer_account_deletion", { ...binding(job), _failed: failed })) === true,
  }),
);

import { PRIVACY_DEFAULTS, PRIVACY_POLICY_VERSION } from "./policy.ts";

export type AccountExportJob = {
  request_id: string;
  requester_id: string;
  lease_token: string;
  artifact_path: string;
  policy_version: string;
};
type Dependencies = {
  authorized: (request: Request) => boolean;
  enabled: () => boolean;
  claim: () => Promise<unknown>;
  current: (job: AccountExportJob) => Promise<boolean>;
  snapshot: (job: AccountExportJob) => Promise<unknown>;
  upload: (job: AccountExportJob, bytes: Uint8Array) => Promise<void>;
  complete: (job: AccountExportJob, sha256: string, size: number) => Promise<boolean>;
  fail: (job: AccountExportJob, code: string) => Promise<boolean>;
};
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
function jobFrom(value: unknown): AccountExportJob | null {
  if (value === null) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_claim");
  const j = value as AccountExportJob;
  if (
    !uuid.test(j.request_id) ||
    !uuid.test(j.requester_id) ||
    !uuid.test(j.lease_token) ||
    j.policy_version !== PRIVACY_POLICY_VERSION ||
    typeof j.artifact_path !== "string" ||
    !j.artifact_path.startsWith(`${j.requester_id}/${j.request_id}/`) ||
    !uuid.test(j.artifact_path.split("/")[2]?.replace(/\.json$/, "") ?? "") ||
    j.artifact_path.split("/").length !== 3 ||
    !j.artifact_path.endsWith(".json")
  )
    throw new Error("invalid_claim");
  return j;
}

export function createAccountExportWorker(deps: Dependencies) {
  return async (request: Request): Promise<Response> => {
    const reply = (status: number, code: string) =>
      Response.json(
        { ok: status === 200, code },
        {
          status,
          headers: { "Cache-Control": "no-store" },
        },
      );
    if (request.method !== "POST") return reply(405, "method_not_allowed");
    if (!deps.authorized(request)) return reply(401, "service_auth_required");
    if (!deps.enabled()) return reply(503, "privacy_execution_disabled");
    let job: AccountExportJob | null;
    try {
      job = jobFrom(await deps.claim());
    } catch {
      return reply(503, "queue_unavailable");
    }
    if (!job) return reply(200, "idle");
    let failure = "backend_unavailable";
    try {
      if (!(await deps.current(job))) return reply(200, "superseded");
      const snapshot = await deps.snapshot(job);
      const body = snapshot as Record<string, unknown> | null;
      if (
        !body ||
        body.format !== "indus-orbit-account-export" ||
        body.format_version !== 1 ||
        body.policy_version !== PRIVACY_POLICY_VERSION ||
        body.subject_user_id !== job.requester_id ||
        !body.datasets ||
        typeof body.datasets !== "object" ||
        Array.isArray(body.datasets)
      ) {
        throw new Error("invalid_snapshot");
      }
      const bytes = new TextEncoder().encode(JSON.stringify(snapshot));
      if (bytes.byteLength > PRIVACY_DEFAULTS.maximumExportBytes) {
        failure = "export_requires_assistance";
        throw new Error(failure);
      }
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      const sha256 = Array.from(new Uint8Array(digest), (b) =>
        b.toString(16).padStart(2, "0"),
      ).join("");
      if (!(await deps.current(job))) return reply(200, "superseded");
      failure = "artifact_upload_failed";
      await deps.upload(job, bytes);
      failure = "artifact_unconfirmed";
      return reply(
        200,
        (await deps.complete(job, sha256, bytes.byteLength)) ? "ready" : "superseded",
      );
    } catch (error) {
      if (error instanceof Error && error.message === "export_requires_assistance")
        failure = error.message;
      try {
        await deps.fail(job, failure);
      } catch {
        return reply(503, "acknowledgement_pending");
      }
      return reply(200, "retry_or_review_required");
    }
  };
}

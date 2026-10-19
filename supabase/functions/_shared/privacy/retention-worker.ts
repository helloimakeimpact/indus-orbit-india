type CleanupJob = {
  object_id: string;
  bucket_id: "education" | "account-exports" | "orbit-attachments";
  storage_path: string;
  lease_token: string;
};
type Dependencies = {
  authorized: (request: Request) => boolean;
  enabled: () => boolean;
  retain: () => Promise<unknown>;
  claim: () => Promise<unknown>;
  current: (job: CleanupJob) => Promise<boolean>;
  remove: (job: CleanupJob) => Promise<void>;
  complete: (job: CleanupJob, succeeded: boolean) => Promise<boolean>;
};
function parseJob(value: unknown): CleanupJob | null {
  if (value === null) return null;
  const j = value as CleanupJob | null;
  const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
  if (
    !j ||
    !uuid.test(j.object_id) ||
    !uuid.test(j.lease_token) ||
    !["education", "account-exports", "orbit-attachments"].includes(j.bucket_id) ||
    typeof j.storage_path !== "string" ||
    !j.storage_path ||
    j.storage_path.length > 1024 ||
    Array.from(j.storage_path).some(
      (character) => character.charCodeAt(0) < 32 || character === "\\",
    ) ||
    j.storage_path.split("/").some((part) => !part || part === "." || part === "..")
  )
    throw new Error("invalid_claim");
  return j;
}
export function createPrivacyRetentionWorker(deps: Dependencies) {
  return async (request: Request): Promise<Response> => {
    const reply = (
      status: number,
      code: string,
      counts = { removed: 0, failed: 0, superseded: 0 },
    ) =>
      Response.json(
        { ok: status === 200, code, ...counts },
        { status, headers: { "Cache-Control": "no-store" } },
      );
    if (request.method !== "POST") return reply(405, "method_not_allowed");
    if (!deps.authorized(request)) return reply(401, "service_auth_required");
    if (!deps.enabled()) return reply(503, "privacy_execution_disabled");
    try {
      await deps.retain();
    } catch {
      return reply(503, "retention_unavailable");
    }
    const counts = { removed: 0, failed: 0, superseded: 0 };
    for (let i = 0; i < 3; i++) {
      let job: CleanupJob | null;
      try {
        job = parseJob(await deps.claim());
      } catch {
        return reply(503, "queue_unavailable", counts);
      }
      if (!job) break;
      let removed = false;
      try {
        if (!(await deps.current(job))) {
          counts.superseded++;
          continue;
        }
        await deps.remove(job);
        removed = true;
      } catch {
        /* The queue receives a bounded code, never supplier output. */
      }
      try {
        if (!(await deps.complete(job, removed))) {
          counts.superseded++;
          continue;
        }
      } catch {
        return reply(503, "acknowledgement_pending", counts);
      }
      if (removed) counts.removed++;
      else counts.failed++;
    }
    return reply(200, "processed", counts);
  };
}

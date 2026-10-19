export type AccountDeletionJob = {
  request_id: string;
  requester_id: string;
  lease_token: string;
  phase: "frozen" | "files" | "auth";
};
type Dependencies = {
  authorized: (request: Request) => boolean;
  enabled: () => boolean;
  claim: () => Promise<unknown>;
  current: (job: AccountDeletionJob) => Promise<boolean>;
  banIdentity: (job: AccountDeletionJob) => Promise<void>;
  erase: (job: AccountDeletionJob) => Promise<unknown>;
  advance: (job: AccountDeletionJob) => Promise<unknown>;
  identityRemoved: (job: AccountDeletionJob) => Promise<boolean>;
  removeIdentity: (job: AccountDeletionJob) => Promise<void>;
  complete: (job: AccountDeletionJob) => Promise<boolean>;
  defer: (job: AccountDeletionJob, failed: boolean) => Promise<boolean>;
};
function parseJob(value: unknown): AccountDeletionJob | null {
  if (value === null) return null;
  const j = value as AccountDeletionJob | null;
  const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
  if (
    !j ||
    !uuid.test(j.request_id) ||
    !uuid.test(j.requester_id) ||
    !uuid.test(j.lease_token) ||
    !["frozen", "files", "auth"].includes(j.phase)
  )
    throw new Error("invalid_claim");
  return j;
}
function phaseFrom(value: unknown) {
  const phase = (value as { phase?: unknown } | null)?.phase;
  if (!["files", "auth", "superseded"].includes(phase as string)) throw new Error("invalid_phase");
  return phase;
}
export function createAccountDeletionWorker(deps: Dependencies) {
  return async (request: Request): Promise<Response> => {
    const reply = (status: number, code: string) =>
      Response.json(
        { ok: status === 200, code },
        { status, headers: { "Cache-Control": "no-store" } },
      );
    if (request.method !== "POST") return reply(405, "method_not_allowed");
    if (!deps.authorized(request)) return reply(401, "service_auth_required");
    if (!deps.enabled()) return reply(503, "privacy_execution_disabled");
    let job: AccountDeletionJob | null;
    try {
      job = parseJob(await deps.claim());
    } catch {
      return reply(503, "queue_unavailable");
    }
    if (!job) return reply(200, "idle_or_blocked");
    try {
      if (!(await deps.current(job))) return reply(200, "superseded");
      if (job.phase === "frozen") {
        await deps.banIdentity(job);
        if (!(await deps.current(job))) return reply(200, "superseded");
        phaseFrom(await deps.erase(job));
      }
      const phase = phaseFrom(await deps.advance(job));
      if (phase === "superseded") return reply(200, "superseded");
      if (phase === "files") {
        if (!(await deps.defer(job, false))) return reply(200, "superseded");
        return reply(200, "waiting_for_file_removal");
      }
      if (!(await deps.current(job))) return reply(200, "superseded");
      if (!(await deps.identityRemoved(job))) {
        await deps.removeIdentity(job);
      }
      return reply(200, (await deps.complete(job)) ? "completed" : "superseded");
    } catch {
      try {
        await deps.defer(job, true);
      } catch {
        return reply(503, "acknowledgement_pending");
      }
      return reply(200, "retry_or_review_required");
    }
  };
}

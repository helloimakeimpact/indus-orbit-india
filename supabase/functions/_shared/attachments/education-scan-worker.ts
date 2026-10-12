import { parseScannerVerdict, scannerErrorCode } from "./scanner-contract.ts";
export type EducationScanJob = {
  id: string;
  lease_token: string;
  storage_path: string;
  object_version: string | null;
  byte_size: number | null;
  content_type: string | null;
};
type Result = {
  verdict: "clean" | "blocked" | "failed";
  sha256?: string;
  providerEventId?: string;
  errorCode?: string;
};
type Dependencies = {
  authorized: (request: Request) => boolean;
  configuration: () => { url: string; token: string; provider: string; backendReady: boolean };
  claim: () => Promise<unknown>;
  signedUrl: (job: EducationScanJob) => Promise<string>;
  complete: (job: EducationScanJob, result: Result) => Promise<void>;
  fetch: typeof fetch;
  now: () => number;
};
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
function https(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}
export function createEducationScanWorker(deps: Dependencies) {
  return async (request: Request) => {
    const reply = (status: number, body: unknown) =>
      Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
    if (request.method !== "POST") return reply(405, { ok: false, code: "method_not_allowed" });
    if (!deps.authorized(request)) return reply(401, { ok: false, code: "service_auth_required" });
    const config = deps.configuration();
    if (
      !config.backendReady ||
      !https(config.url) ||
      !config.token ||
      !/^[a-z][a-z0-9_.-]{1,79}$/.test(config.provider)
    )
      return reply(503, { ok: false, code: "scanner_configuration_missing" });
    let jobs: EducationScanJob[];
    try {
      const value = await deps.claim();
      if (!Array.isArray(value) || value.length > 5) throw new Error("Invalid claim");
      jobs = value.map((row: unknown) => {
        const j = row as EducationScanJob | null;
        if (
          !j ||
          !uuid.test(j.id) ||
          !uuid.test(j.lease_token) ||
          typeof j.storage_path !== "string" ||
          j.storage_path.length > 1024 ||
          !/^(resources|lessons)\//.test(j.storage_path)
        )
          throw new Error("Invalid claim");
        return j;
      });
    } catch {
      return reply(503, { ok: false, code: "queue_unavailable" });
    }
    let clean = 0,
      blocked = 0,
      failed = 0,
      unacknowledged = 0;
    for (const job of jobs) {
      let result: Result;
      try {
        if (
          !Number.isSafeInteger(job.byte_size) ||
          job.byte_size! <= 0 ||
          job.byte_size! > 50 * 1024 * 1024
        )
          throw new Error("Scanner response invalid metadata");
        const downloadUrl = await deps.signedUrl(job);
        if (!https(downloadUrl)) throw new Error("Scanner response invalid URL");
        const response = await deps.fetch(config.url, {
          method: "POST",
          signal: AbortSignal.timeout(20_000),
          headers: {
            Authorization: `Bearer ${config.token}`,
            "Content-Type": "application/json",
            "Idempotency-Key": `education/${job.id}/${job.lease_token}`,
          },
          body: JSON.stringify({
            attachmentId: job.id,
            objectVersion: job.object_version,
            downloadUrl,
            fileName: job.storage_path.split("/").at(-1),
            contentType: job.content_type,
            byteSize: job.byte_size,
          }),
        });
        if (!response.ok) {
          await response.body?.cancel();
          throw new Error("Scanner HTTP failure");
        }
        const verdict = parseScannerVerdict(await response.json());
        const age = deps.now() - Date.parse(verdict.observedAt);
        if (age > 5 * 60_000 || age < -60_000 || verdict.eventId.length > 200)
          throw new Error("Scanner response stale");
        result = {
          verdict: verdict.verdict,
          sha256: verdict.sha256,
          providerEventId: verdict.eventId,
          ...(verdict.verdict === "failed" ? { errorCode: "scanner_unavailable" } : {}),
        };
      } catch (error) {
        result = { verdict: "failed", errorCode: scannerErrorCode(error) };
      }
      try {
        await deps.complete(job, result);
      } catch {
        unacknowledged++;
      }
      if (result.verdict === "clean") clean++;
      else if (result.verdict === "blocked") blocked++;
      else failed++;
    }
    return reply(200, {
      ok: failed === 0 && unacknowledged === 0,
      claimed: jobs.length,
      clean,
      blocked,
      failed,
      unacknowledged,
    });
  };
}

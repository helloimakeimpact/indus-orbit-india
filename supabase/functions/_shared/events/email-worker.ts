import { canonicalEventOrigin, renderEventEmail } from "./email-template.ts";

export type EventDeliveryJob = {
  id: string;
  lease_token: string;
  recipient_email: string;
  template_key: string;
  template_data: Record<string, unknown>;
};
type Outcome = { succeeded: boolean; providerMessageId?: string; errorCode?: string };
type Dependencies = {
  authorized: (request: Request) => boolean;
  configuration: () => { origin: string; from: string; resendKey: string; backendReady: boolean };
  claim: () => Promise<unknown>;
  ready: (job: EventDeliveryJob) => Promise<boolean>;
  prepare: (job: EventDeliveryJob, payload: Record<string, unknown>) => Promise<unknown>;
  complete: (job: EventDeliveryJob, outcome: Outcome) => Promise<void>;
  fetch: typeof fetch;
};
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
function parseJobs(value: unknown): EventDeliveryJob[] {
  if (!Array.isArray(value) || value.length > 20) throw new Error("Invalid claim");
  return value.map((job: unknown) => {
    const j = job as EventDeliveryJob | null;
    if (
      !j ||
      !uuid.test(j.id) ||
      !uuid.test(j.lease_token) ||
      typeof j.recipient_email !== "string" ||
      j.recipient_email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(j.recipient_email) ||
      j.template_key !== "event_transactional" ||
      !j.template_data ||
      typeof j.template_data !== "object" ||
      Array.isArray(j.template_data)
    )
      throw new Error("Invalid claim");
    return j;
  });
}
export function createEventEmailWorker(deps: Dependencies) {
  return async (request: Request): Promise<Response> => {
    const reply = (status: number, body: unknown) =>
      Response.json(body, {
        status,
        headers: { "Cache-Control": "no-store" },
      });
    if (request.method !== "POST") return reply(405, { ok: false, code: "method_not_allowed" });
    if (!deps.authorized(request)) return reply(401, { ok: false, code: "service_auth_required" });
    const config = deps.configuration();
    if (
      !config.backendReady ||
      !config.resendKey ||
      !config.from ||
      /[\r\n]/.test(config.from) ||
      !canonicalEventOrigin(config.origin)
    ) {
      return reply(503, { ok: false, code: "configuration_missing" });
    }
    let jobs: EventDeliveryJob[];
    try {
      jobs = parseJobs(await deps.claim());
    } catch {
      return reply(503, { ok: false, code: "queue_unavailable" });
    }
    let delivered = 0,
      failed = 0,
      suppressed = 0,
      unacknowledged = 0;
    for (const job of jobs) {
      let outcome: Outcome = { succeeded: false, errorCode: "delivery_unconfirmed" };
      try {
        // Fresh check immediately before the external request. An event can
        // still change during HTTP delivery; email is not an authorization grant.
        if (!(await deps.ready(job))) {
          suppressed++;
          continue;
        }
        let message;
        try {
          message = renderEventEmail(job.template_data, config.origin);
        } catch {
          outcome.errorCode = "invalid_template";
          throw new Error("invalid_template");
        }
        const prepared = await deps.prepare(job, {
          from: config.from,
          to: [job.recipient_email],
          ...message,
        });
        if (prepared === null) {
          suppressed++;
          continue;
        }
        const payload = prepared as Record<string, unknown> | null;
        if (
          !payload ||
          typeof payload !== "object" ||
          Array.isArray(payload) ||
          JSON.stringify(payload.to) !== JSON.stringify([job.recipient_email]) ||
          Object.keys(payload).some(
            (key) => !["from", "to", "subject", "text", "html"].includes(key),
          ) ||
          ["from", "subject", "text", "html"].some(
            (key) => typeof payload[key] !== "string" || !payload[key],
          )
        ) {
          throw new Error("delivery_unconfirmed");
        }
        let response: Response;
        try {
          response = await deps.fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${config.resendKey}`,
              "Content-Type": "application/json",
              "Idempotency-Key": `event/${job.id}`,
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(8000),
          });
        } catch {
          outcome.errorCode = "provider_unavailable";
          throw new Error("provider_unavailable");
        }
        if (!response.ok) {
          await response.body?.cancel();
          outcome.errorCode =
            response.status === 429 || response.status >= 500
              ? "provider_unavailable"
              : "provider_rejected";
          throw new Error(outcome.errorCode);
        }
        const value: unknown = await response.json();
        const id = value && typeof value === "object" && "id" in value ? value.id : null;
        if (typeof id !== "string" || !/^[a-zA-Z0-9_-]{1,120}$/.test(id))
          throw new Error("delivery_unconfirmed");
        outcome = { succeeded: true, providerMessageId: id };
      } catch {
        // Never log provider bodies, raw errors, names, email addresses or tokens.
      }
      try {
        await deps.complete(job, outcome);
      } catch {
        unacknowledged++;
      }
      if (outcome.succeeded) delivered++;
      else failed++;
    }
    return reply(200, {
      ok: failed === 0 && unacknowledged === 0,
      claimed: jobs.length,
      delivered,
      failed,
      suppressed,
      unacknowledged,
    });
  };
}

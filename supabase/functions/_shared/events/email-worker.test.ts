import test from "node:test";
import assert from "node:assert/strict";
import { createEventEmailWorker, type EventDeliveryJob } from "./email-worker.ts";
import { canonicalEventOrigin, renderEventEmail, eventKinds } from "./email-template.ts";

const data = {
  event_id: "93800000-0000-4000-8000-000000000001",
  title: "Gathering <together>",
  start_time: "2026-11-10T12:00:00Z",
  end_time: "2026-11-10T13:00:00Z",
  timezone: "Asia/Kolkata",
  kind: "registration",
  registration_status: "confirmed",
  guest: true,
  public_location: "Online",
};
const job: EventDeliveryJob = {
  id: "93900000-0000-4000-8000-000000000001",
  lease_token: "93900000-0000-4000-8000-000000000002",
  recipient_email: "guest@example.test",
  template_key: "event_transactional",
  template_data: data,
};
const request = () =>
  new Request("https://worker.test", { method: "POST", headers: { apikey: "internal" } });
function harness(
  options: {
    authorized?: boolean;
    ready?: boolean;
    fetch?: typeof fetch;
    completeFails?: boolean;
    claim?: unknown;
    configured?: boolean;
    prepare?: (payload: Record<string, unknown>) => Promise<unknown>;
  } = {},
) {
  const sends: RequestInit[] = [],
    outcomes: unknown[] = [];
  let claims = 0;
  const worker = createEventEmailWorker({
    authorized: () => options.authorized !== false,
    configuration: () => ({
      origin: "https://indusorbit.com",
      from: "Indus Orbit <events@indusorbit.com>",
      resendKey: options.configured === false ? "" : "secret",
      backendReady: true,
    }),
    claim: async () => {
      claims++;
      return options.claim ?? [job];
    },
    ready: async () => options.ready !== false,
    prepare: async (_job, payload) => (options.prepare ? options.prepare(payload) : payload),
    complete: async (_job, outcome) => {
      outcomes.push(outcome);
      if (options.completeFails) throw new Error("raw private failure");
    },
    fetch:
      options.fetch ??
      ((async (_url, init) => {
        sends.push(init!);
        return Response.json({ id: "synthetic-message" });
      }) as typeof fetch),
  });
  return { worker, sends, outcomes, claims: () => claims };
}
test("event templates handle every lifecycle and registration state without private credentials", () => {
  for (const kind of eventKinds)
    for (const status of ["confirmed", "pending", "waitlisted", "cancelled", "rejected"]) {
      const m = renderEventEmail(
        { ...data, kind, registration_status: status },
        "https://indusorbit.com",
      );
      assert.ok(m.subject && m.text.includes("Asia/Kolkata"));
      assert.ok(m.html.includes("Gathering &lt;together&gt;"));
      assert.ok(!m.html.includes("#guest="));
    }
});
test("template rejects foreign paths, invalid origins, identifiers, dates and timezones", () => {
  for (const origin of [
    "http://indusorbit.com",
    "https://indusorbit.com/path",
    "https://user@indusorbit.com",
    "https://indusorbit.com/",
  ])
    assert.equal(canonicalEventOrigin(origin), null);
  for (const bad of [
    { event_id: "../private" },
    { start_time: "invalid" },
    { timezone: "Unknown/Zone" },
    { kind: "marketing" },
    { registration_status: "unknown" },
  ])
    assert.throws(() => renderEventEmail({ ...data, ...bad }, "https://indusorbit.com"));
});
test("host titles are escaped and cannot inject email headers", () => {
  const m = renderEventEmail(
    { ...data, title: "Hello\r\nBcc: injected@example.test <script>" },
    "https://indusorbit.com",
  );
  assert.ok(!m.subject.includes("\n"));
  assert.ok(!m.html.includes("<script>"));
});
test("service authentication and configuration are checked before claiming recipients", async () => {
  for (const options of [{ authorized: false }, { configured: false }]) {
    const h = harness(options);
    const r = await h.worker(request());
    assert.equal(r.status, options.authorized === false ? 401 : 503);
    assert.equal(h.claims(), 0);
    assert.equal(h.sends.length, 0);
  }
});
test("obsolete jobs are suppressed before the provider call", async () => {
  const h = harness({ ready: false });
  const r = await h.worker(request());
  assert.equal((await r.json()).suppressed, 1);
  assert.equal(h.sends.length, 0);
  assert.equal(h.outcomes.length, 0);
});
test("delivery sends the immutable job id as provider idempotency key", async () => {
  const h = harness();
  const r = await h.worker(request());
  const body = await r.json();
  assert.equal(body.delivered, 1);
  assert.equal(
    (h.sends[0].headers as Record<string, string>)["Idempotency-Key"],
    `event/${job.id}`,
  );
  assert.deepEqual(h.outcomes, [{ succeeded: true, providerMessageId: "synthetic-message" }]);
  assert.equal(r.headers.get("cache-control"), "no-store");
  assert.ok(!JSON.stringify(body).includes(job.recipient_email));
});
test("provider bodies and thrown errors never reach durable errors or responses", async () => {
  for (const fetcher of [
    async () => new Response("private guest@example.test", { status: 500 }),
    async () => new Response("private guest@example.test", { status: 400 }),
    async () => {
      throw new Error("private guest@example.test");
    },
  ]) {
    const h = harness({ fetch: fetcher as typeof fetch });
    const body = await (await h.worker(request())).text();
    assert.ok(!body.includes("guest@example.test"));
    assert.ok(!JSON.stringify(h.outcomes).includes("guest@example.test"));
    assert.equal((h.outcomes[0] as { succeeded: boolean }).succeeded, false);
  }
});
test("malformed success is retried under the same idempotency identity", async () => {
  const h = harness({
    fetch: (async () => Response.json({ email: "private@example.test" })) as typeof fetch,
  });
  await h.worker(request());
  assert.deepEqual(h.outcomes, [{ succeeded: false, errorCode: "delivery_unconfirmed" }]);
});
test("acknowledgement failures remain observable without exposing database errors", async () => {
  const h = harness({ completeFails: true });
  const body = await (await h.worker(request())).json();
  assert.equal(body.unacknowledged, 1);
  assert.equal(body.ok, false);
  assert.ok(!JSON.stringify(body).includes("private failure"));
});
test("malformed claim data fails closed and does not send", async () => {
  const h = harness({ claim: [{ ...job, recipient_email: "invalid" }] });
  const r = await h.worker(request());
  assert.equal(r.status, 503);
  assert.equal(h.sends.length, 0);
});

test("retry sends the frozen provider payload across renderer and sender changes", async () => {
  const stored = {
    from: "original@indusorbit.com",
    to: [job.recipient_email],
    subject: "Original notice",
    text: "Original text",
    html: "<p>Original text</p>",
  };
  const h = harness({ prepare: async () => stored });
  await h.worker(request());
  assert.deepEqual(JSON.parse(h.sends[0].body as string), stored);
});

test("a change during preparation suppresses the provider request", async () => {
  const h = harness({ prepare: async () => null });
  const body = await (await h.worker(request())).json();
  assert.equal(body.suppressed, 1);
  assert.equal(h.sends.length, 0);
  assert.equal(h.outcomes.length, 0);
});

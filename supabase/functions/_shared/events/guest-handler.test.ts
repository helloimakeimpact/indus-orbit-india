import assert from "node:assert/strict";
import test from "node:test";
import { createGuestEventHandler, guestTokenHash } from "./guest-handler.ts";
const origin = "https://indusorbit.com",
  eventId = "99100000-0000-4000-8000-000000000001";
const body = {
  action: "request",
  eventId,
  name: " Builder ",
  email: "BUILDER@example.test",
  captchaToken: "single-use-token",
};
function fixture(
  options: {
    verification?: unknown;
    accepted?: boolean;
    mailFailure?: boolean;
    secret?: string;
    canonical?: string;
    mailConfigured?: boolean;
  } = {},
) {
  const requests: unknown[][] = [],
    emails: string[][] = [],
    receipts: unknown[][] = [];
  const handler = createGuestEventHandler({
    configuration: () => ({
      secret: options.secret ?? "server-secret",
      origins: [origin],
      canonicalOrigin: options.canonical ?? origin,
      mailConfigured: options.mailConfigured ?? true,
    }),
    fetch: async (url, init) => {
      assert.equal(url, "https://challenges.cloudflare.com/turnstile/v0/siteverify");
      assert.ok(init?.signal);
      return Response.json(
        options.verification ?? {
          success: true,
          action: "event_registration",
          hostname: "indusorbit.com",
        },
      );
    },
    requestLink: async (...args) => {
      requests.push(args);
      return options.accepted ?? true;
    },
    sendLink: async (...args) => {
      emails.push(args);
      if (options.mailFailure) throw new Error("PII provider body");
    },
    receipt: async (...args) => {
      receipts.push(args);
      return { status: "pending", id: "receipt", location: null, joinUrl: null };
    },
  });
  const submit = (value: unknown = body, from = origin) =>
    handler(
      new Request(origin, {
        method: "POST",
        headers: { origin: from, "Content-Type": "application/json" },
        body: JSON.stringify(value),
      }),
    );
  return { handler, submit, requests, emails, receipts };
}
test("guest mail contains a 256-bit fragment credential; only a hash is stored and no token is returned", async () => {
  const f = fixture();
  const response = await f.submit();
  assert.equal(response.status, 200);
  assert.equal(f.requests[0][1], "builder@example.test");
  assert.equal(f.requests[0][2], "Builder");
  const token = new URL(f.emails[0][1]).hash.slice(7);
  assert.match(token, /^[a-f0-9]{64}$/);
  assert.equal(f.requests[0][3], await guestTokenHash(token));
  assert.equal(f.emails[0][2], await guestTokenHash(token));
  assert.equal(new URL(f.emails[0][1]).origin, origin);
  assert.equal((await response.text()).includes(token), false);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});
test("denied or throttled guest request uses the same generic receipt and sends no email", async () => {
  const f = fixture({ accepted: false });
  assert.deepEqual(await (await f.submit()).json(), { ok: true, code: "check_email" });
  assert.equal(f.emails.length, 0);
});
for (const verification of [
  { success: true, action: "contact", hostname: "indusorbit.com" },
  { success: true, action: "event_registration", hostname: "attacker.test" },
  { success: "true" },
  null,
])
  test(`guest mail rejects an invalid challenge ${JSON.stringify(verification)}`, async () => {
    const f = fixture({ verification: verification ?? {} });
    assert.equal((await f.submit()).status, 403);
    assert.equal(f.requests.length, 0);
  });
test("guest links authorize receipt/confirm/cancel by hash without requiring a platform account", async () => {
  const f = fixture();
  for (const action of ["receipt", "confirm", "cancel"]) {
    const result = await f.submit({ action, eventId, token: "a".repeat(64) });
    assert.equal(result.status, 200);
    assert.equal(f.receipts.at(-1)?.[1], await guestTokenHash("a".repeat(64)));
  }
  assert.equal(f.requests.length, 0);
  assert.equal(f.emails.length, 0);
});
test("invalid actions, addresses, identifiers, tokens and oversized bodies cannot send email", async () => {
  const f = fixture();
  for (const value of [
    { ...body, action: "admin" },
    { ...body, eventId: "other" },
    { ...body, name: "x".repeat(121) },
    { ...body, email: "invalid" },
    { ...body, captchaToken: "" },
    { ...body, name: "x".repeat(21000) },
    { action: "confirm", eventId, token: "short" },
  ])
    assert.equal((await f.submit(value)).status, 400);
  assert.equal(f.requests.length, 0);
  assert.equal(f.emails.length, 0);
});
test("unapproved origins and methods cannot request or confirm a registration", async () => {
  const f = fixture();
  assert.equal((await f.submit(body, "https://attacker.test")).status, 403);
  assert.equal((await f.handler(new Request(origin, { headers: { origin } }))).status, 405);
  assert.equal(
    (await f.handler(new Request(origin, { method: "OPTIONS", headers: { origin } }))).status,
    204,
  );
  assert.equal(f.requests.length, 0);
});
test("missing mail config, bypass keys and unsafe canonical URLs fail closed", async () => {
  for (const options of [
    { secret: "" },
    { secret: "1x0000000000000000000000000000000AA" },
    { canonical: "https://attacker.test" },
    { canonical: `${origin}/redirect` },
    { mailConfigured: false },
  ])
    assert.equal((await fixture(options).submit()).status, 503);
});
test("provider failure is not reported as sent and its body is never exposed", async () => {
  const response = await fixture({ mailFailure: true }).submit();
  assert.equal(response.status, 503);
  assert.equal((await response.text()).includes("PII"), false);
});

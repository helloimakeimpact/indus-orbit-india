import assert from "node:assert/strict";
import test from "node:test";
import { createPublicFormHandler, type PublicSubmission } from "./handler.ts";

const origin = "https://indusorbit.com";
const body = {
  kind: "contact",
  name: "  Builder  ",
  email: "Builder@Example.com",
  role: "Founder",
  message: "Let's build.",
  captchaToken: "single-use-token",
};
function fixture(
  options: {
    result?: unknown;
    unavailable?: boolean;
    saveFailure?: boolean;
    configuration?: { secret: string; sitekey: string; origins: string[] };
  } = {},
) {
  const saved: PublicSubmission[] = [];
  const checks: RequestInit[] = [];
  const handler = createPublicFormHandler({
    configuration: () =>
      options.configuration ?? {
        secret: "server-only-secret",
        sitekey: "real-sitekey",
        origins: [origin],
      },
    fetch: async (url, init) => {
      assert.equal(url, "https://api.hcaptcha.com/siteverify");
      checks.push(init!);
      if (options.unavailable) throw new Error("offline");
      return Response.json(options.result ?? { success: true });
    },
    save: async (submission) => {
      if (options.saveFailure) throw new Error("private DB details");
      saved.push(submission);
    },
  });
  const submit = (
    value: unknown = body,
    headers = { origin, "content-type": "application/json" },
  ) =>
    handler(
      new Request("https://example.supabase.co/functions/v1/public-form-submit", {
        method: "POST",
        headers,
        body: JSON.stringify(value),
      }),
    );
  return { handler, submit, saved, checks };
}

test("only a server-verified token saves normalized fields, without token or arbitrary source", async () => {
  const f = fixture();
  const response = await f.submit({ ...body, source: "forged", admin: true });
  assert.equal(response.status, 200);
  assert.deepEqual(f.saved, [
    {
      kind: "contact",
      name: "Builder",
      email: "builder@example.com",
      role: "Founder",
      message: "Let's build.",
    },
  ]);
  const verification = f.checks[0];
  assert.equal(verification.method, "POST");
  assert.equal((verification.body as URLSearchParams).get("sitekey"), "real-sitekey");
  assert.equal((verification.body as URLSearchParams).get("secret"), "server-only-secret");
  assert.ok(verification.signal);
  assert.equal((await response.text()).includes("token"), false);
});
test("newsletter uses the same verification boundary", async () => {
  const f = fixture();
  assert.equal(
    (await f.submit({ kind: "newsletter", email: " Reader@example.com ", captchaToken: "token" }))
      .status,
    200,
  );
  assert.deepEqual(f.saved, [{ kind: "newsletter", email: "reader@example.com" }]);
});
for (const result of [
  { success: false, "error-codes": ["expired-input-response"] },
  { success: false, "error-codes": ["already-seen-response"] },
  { success: "true" },
  {},
]) {
  test(`rejected or malformed verification never writes: ${JSON.stringify(result)}`, async () => {
    const f = fixture({ result });
    assert.equal((await f.submit()).status, 403);
    assert.equal(f.saved.length, 0);
  });
}
test("missing token, invalid role/email and oversized fields fail before contacting hCaptcha", async () => {
  const f = fixture();
  for (const value of [
    { ...body, captchaToken: "" },
    { ...body, role: "admin" },
    { ...body, email: "not-email" },
    { ...body, name: "a".repeat(121) },
    { ...body, message: "a".repeat(5001) },
  ]) {
    assert.equal((await f.submit(value)).status, 400);
  }
  assert.equal(f.checks.length, 0);
  assert.equal(f.saved.length, 0);
});
test("oversized bodies are bounded even without a content-length header", async () => {
  const f = fixture();
  assert.equal((await f.submit({ ...body, message: "a".repeat(21000) })).status, 413);
  assert.equal(f.checks.length, 0);
});
test("unlisted and null origins cannot reach verification or storage", async () => {
  const f = fixture();
  for (const denied of ["https://indusorbit.com.attacker.test", "null", ""]) {
    const response = await f.submit(body, { origin: denied, "content-type": "application/json" });
    assert.equal(response.status, 403);
    assert.equal(response.headers.get("access-control-allow-origin"), null);
  }
  assert.equal(f.checks.length, 0);
});
test("preflight and disallowed methods do not verify or write", async () => {
  const f = fixture();
  assert.equal(
    (await f.handler(new Request(origin, { method: "OPTIONS", headers: { origin } }))).status,
    204,
  );
  assert.equal((await f.handler(new Request(origin, { headers: { origin } }))).status, 405);
  assert.equal(f.checks.length, 0);
});
test("missing production configuration and official bypass test keys are refused", async () => {
  for (const configuration of [
    { secret: "", sitekey: "real", origins: [origin] },
    { secret: "real", sitekey: "10000000-ffff-ffff-ffff-000000000001", origins: [origin] },
    { secret: "0x0000000000000000000000000000000000000000", sitekey: "real", origins: [origin] },
  ]) {
    const f = fixture({ configuration });
    assert.equal((await f.submit()).status, 503);
    assert.equal(f.checks.length, 0);
  }
});
test("verification outage and failed persistence return no success or private details", async () => {
  for (const options of [{ unavailable: true }, { saveFailure: true }]) {
    const f = fixture(options);
    const response = await f.submit();
    assert.equal(response.status, 503);
    assert.equal(f.saved.length, 0);
    assert.equal((await response.text()).includes("private DB"), false);
  }
});

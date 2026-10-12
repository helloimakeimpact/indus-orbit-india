import test from "node:test";
import assert from "node:assert/strict";
import { createEducationScanWorker, type EducationScanJob } from "./education-scan-worker.ts";
const now = Date.parse("2026-10-08T12:00:00Z");
const job: EducationScanJob = {
  id: "94900000-0000-4000-8000-000000000001",
  lease_token: "94900000-0000-4000-8000-000000000002",
  storage_path: "resources/94700000-0000-4000-8000-000000000001/document.pdf",
  object_version: "one",
  byte_size: 100,
  content_type: "application/pdf",
};
const verdict = {
  eventId: "synthetic-verdict",
  verdict: "clean",
  sha256: "a".repeat(64),
  threatCode: "",
  observedAt: new Date(now).toISOString(),
};
const request = () => new Request("https://worker.test", { method: "POST" });
function harness(
  options: {
    authorized?: boolean;
    configured?: boolean;
    job?: EducationScanJob;
    verdict?: unknown;
    fetch?: typeof fetch;
    completeFails?: boolean;
  } = {},
) {
  const results: unknown[] = [];
  let calls = 0,
    claims = 0;
  const worker = createEducationScanWorker({
    authorized: () => options.authorized !== false,
    configuration: () => ({
      url: "https://scanner.example.test/scan",
      token: options.configured === false ? "" : "token",
      provider: "scanner_test",
      backendReady: true,
    }),
    claim: async () => {
      claims++;
      return [options.job ?? job];
    },
    signedUrl: async () => "https://storage.example.test/private-signed-file",
    fetch:
      options.fetch ??
      ((async () => {
        calls++;
        return Response.json(options.verdict ?? verdict);
      }) as typeof fetch),
    complete: async (_job, result) => {
      results.push(result);
      if (options.completeFails) throw new Error("secret path");
    },
    now: () => now,
  });
  return { worker, results, calls: () => calls, claims: () => claims };
}
test("education scans require service authentication and configured supplier before claiming", async () => {
  for (const options of [{ authorized: false }, { configured: false }]) {
    const h = harness(options);
    const r = await h.worker(request());
    assert.equal(r.status, options.authorized === false ? 401 : 503);
    assert.equal(h.claims(), 0);
  }
});
test("clean verdicts carry bounded trusted evidence to the completion contract", async () => {
  const h = harness();
  const body = await (await h.worker(request())).json();
  assert.equal(body.clean, 1);
  assert.equal(body.ok, true);
  assert.deepEqual(h.results, [
    { verdict: "clean", sha256: "a".repeat(64), providerEventId: "synthetic-verdict" },
  ]);
  assert.ok(!JSON.stringify(body).includes("document.pdf"));
});
test("blocked verdicts never turn into clean results", async () => {
  const h = harness({ verdict: { ...verdict, verdict: "blocked", threatCode: "test.malware" } });
  const body = await (await h.worker(request())).json();
  assert.equal(body.blocked, 1);
  assert.equal((h.results[0] as { verdict: string }).verdict, "blocked");
});
test("stale future malformed and unbounded scanner verdicts fail closed", async () => {
  for (const value of [
    { ...verdict, observedAt: new Date(now - 3600_000).toISOString() },
    { ...verdict, observedAt: new Date(now + 3600_000).toISOString() },
    { ...verdict, sha256: "invalid" },
    { ...verdict, eventId: "a".repeat(201) },
  ]) {
    const h = harness({ verdict: value });
    await h.worker(request());
    assert.equal((h.results[0] as { verdict: string }).verdict, "failed");
  }
});
test("unknown empty and oversized files are not submitted", async () => {
  for (const size of [null, 0, 50 * 1024 * 1024 + 1]) {
    const h = harness({ job: { ...job, byte_size: size } });
    await h.worker(request());
    assert.equal(h.calls(), 0);
    assert.equal((h.results[0] as { verdict: string }).verdict, "failed");
  }
});
test("supplier errors are redacted and leave the object quarantined", async () => {
  const h = harness({
    fetch: (async () =>
      new Response("private-signed-file recipient@example.test", { status: 500 })) as typeof fetch,
  });
  const body = await (await h.worker(request())).json();
  assert.equal(body.failed, 1);
  assert.deepEqual(h.results, [{ verdict: "failed", errorCode: "scanner_http_failure" }]);
});
test("completion failures are visible but never expose private paths", async () => {
  const h = harness({ completeFails: true });
  const body = await (await h.worker(request())).json();
  assert.equal(body.unacknowledged, 1);
  assert.equal(body.ok, false);
  assert.ok(!JSON.stringify(body).includes("secret path"));
});

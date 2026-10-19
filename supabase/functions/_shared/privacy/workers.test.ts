import assert from "node:assert/strict";
import { test } from "node:test";
import { createAccountExportWorker, type AccountExportJob } from "./export-worker.ts";
import { createAccountDeletionWorker, type AccountDeletionJob } from "./deletion-worker.ts";
import { createPrivacyRetentionWorker } from "./retention-worker.ts";
import { PRIVACY_POLICY_VERSION } from "./policy.ts";

const subject = "a0000000-0000-4000-8000-000000000001";
const id = "a0000000-0000-4000-8000-000000000002";
const lease = "a0000000-0000-4000-8000-000000000003";
const job: AccountExportJob = {
  request_id: id,
  requester_id: subject,
  lease_token: lease,
  artifact_path: `${subject}/${id}/${lease}.json`,
  policy_version: PRIVACY_POLICY_VERSION,
};
const post = () => new Request("https://example.test/internal", { method: "POST" });
function exporting(overrides: Partial<Parameters<typeof createAccountExportWorker>[0]> = {}) {
  const calls: string[] = [];
  const handler = createAccountExportWorker({
    authorized: () => true,
    enabled: () => true,
    claim: async () => job,
    current: async () => true,
    snapshot: async () => ({
      format: "indus-orbit-account-export",
      format_version: 1,
      policy_version: PRIVACY_POLICY_VERSION,
      subject_user_id: subject,
      datasets: { profile: [{ name: "Private fixture" }] },
    }),
    upload: async () => {
      calls.push("upload");
    },
    complete: async (_job, digest, size) => {
      assert.match(digest, /^[a-f0-9]{64}$/);
      assert.ok(size > 0);
      calls.push("complete");
      return true;
    },
    fail: async (_job, code) => {
      calls.push(`fail:${code}`);
      return true;
    },
    ...overrides,
  });
  return { handler, calls };
}
test("export requires service authentication before any queue access", async () => {
  const { handler, calls } = exporting({
    authorized: () => false,
    claim: async () => {
      throw new Error("Must not claim");
    },
  });
  assert.equal((await handler(post())).status, 401);
  assert.deepEqual(calls, []);
});
test("unconfigured privacy execution cannot claim or upload", async () => {
  const { handler, calls } = exporting({
    enabled: () => false,
    claim: async () => {
      throw new Error("Must not claim");
    },
  });
  assert.equal((await handler(post())).status, 503);
  assert.deepEqual(calls, []);
});
test("export uploads before confirming readiness and returns no account data", async () => {
  const { handler, calls } = exporting();
  const response = await handler(post());
  assert.deepEqual(await response.json(), { ok: true, code: "ready" });
  assert.deepEqual(calls, ["upload", "complete"]);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});
test("foreign account snapshots never reach Storage", async () => {
  const { handler, calls } = exporting({
    snapshot: async () => ({
      format: "indus-orbit-account-export",
      format_version: 1,
      policy_version: PRIVACY_POLICY_VERSION,
      subject_user_id: id,
      datasets: {},
    }),
  });
  assert.equal((await (await handler(post())).json()).code, "retry_or_review_required");
  assert.deepEqual(calls, ["fail:backend_unavailable"]);
});
test("cancellation after snapshot prevents upload", async () => {
  let checks = 0;
  const { handler, calls } = exporting({ current: async () => ++checks === 1 });
  assert.equal((await (await handler(post())).json()).code, "superseded");
  assert.deepEqual(calls, []);
});
test("cancellation after upload cannot make an export ready", async () => {
  const { handler, calls } = exporting({ complete: async () => false });
  assert.equal((await (await handler(post())).json()).code, "superseded");
  assert.deepEqual(calls, ["upload"]);
});
test("oversized UTF-8 export is assisted rather than silently truncated", async () => {
  const { handler, calls } = exporting({
    snapshot: async () => ({
      format: "indus-orbit-account-export",
      format_version: 1,
      policy_version: PRIVACY_POLICY_VERSION,
      subject_user_id: subject,
      datasets: { body: "界".repeat(2_000_000) },
    }),
  });
  assert.equal((await (await handler(post())).json()).code, "retry_or_review_required");
  assert.deepEqual(calls, ["fail:export_requires_assistance"]);
});
test("foreign artifact paths and unknown policy versions are rejected", async () => {
  for (const invalid of [
    { ...job, artifact_path: `${id}/${id}/${lease}.json` },
    { ...job, policy_version: "unknown" },
  ]) {
    const { handler, calls } = exporting({ claim: async () => invalid });
    assert.equal((await handler(post())).status, 503);
    assert.deepEqual(calls, []);
  }
});
test("backend acknowledgement failure never exposes artifact details", async () => {
  const { handler } = exporting({
    upload: async () => {
      throw new Error("Secret storage URL and private file name");
    },
    fail: async () => {
      throw new Error("Database details");
    },
  });
  const response = await handler(post());
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { ok: false, code: "acknowledgement_pending" });
});

function retaining(overrides: Partial<Parameters<typeof createPrivacyRetentionWorker>[0]> = {}) {
  const calls: string[] = [];
  let claims = 0;
  const handler = createPrivacyRetentionWorker({
    authorized: () => true,
    enabled: () => true,
    retain: async () => ({}),
    claim: async () =>
      claims++ === 0
        ? {
            object_id: id,
            bucket_id: "education",
            storage_path: `resources/${subject}/orphan.pdf`,
            lease_token: lease,
          }
        : null,
    current: async () => true,
    remove: async () => {
      calls.push("remove");
    },
    complete: async (_j, succeeded) => {
      calls.push(`complete:${succeeded}`);
      return true;
    },
    ...overrides,
  });
  return { handler, calls };
}
test("cleanup rechecks current references and holds before the Storage API", async () => {
  const { handler, calls } = retaining({ current: async () => false });
  assert.deepEqual(await (await handler(post())).json(), {
    ok: true,
    code: "processed",
    removed: 0,
    failed: 0,
    superseded: 1,
  });
  assert.deepEqual(calls, []);
});
test("failed physical removal cannot be acknowledged as deleted", async () => {
  const { handler, calls } = retaining({
    remove: async () => {
      throw new Error("supplier secret");
    },
  });
  const response = await handler(post());
  assert.equal((await response.json()).failed, 1);
  assert.deepEqual(calls, ["complete:false"]);
});
test("cleanup rejects unknown buckets and traversing paths", async () => {
  for (const patch of [{ bucket_id: "credentials" }, { storage_path: "resources/../other.pdf" }]) {
    const { handler, calls } = retaining({
      claim: async () => ({
        object_id: id,
        bucket_id: "education",
        storage_path: "resource/file.pdf",
        lease_token: lease,
        ...patch,
      }),
    });
    assert.equal((await handler(post())).status, 503);
    assert.deepEqual(calls, []);
  }
});
test("cleanup response is bounded counts and never contains object paths", async () => {
  const { handler, calls } = retaining();
  assert.deepEqual(await (await handler(post())).json(), {
    ok: true,
    code: "processed",
    removed: 1,
    failed: 0,
    superseded: 0,
  });
  assert.deepEqual(calls, ["remove", "complete:true"]);
});

function deleting(overrides: Partial<Parameters<typeof createAccountDeletionWorker>[0]> = {}) {
  const calls: string[] = [];
  const claim: AccountDeletionJob = {
    request_id: id,
    requester_id: subject,
    lease_token: lease,
    phase: "frozen",
  };
  const handler = createAccountDeletionWorker({
    authorized: () => true,
    enabled: () => true,
    claim: async () => claim,
    current: async () => true,
    banIdentity: async () => {
      calls.push("ban");
    },
    erase: async () => {
      calls.push("erase");
      return { phase: "files" };
    },
    advance: async () => ({ phase: "files" }),
    identityRemoved: async () => false,
    removeIdentity: async () => {
      calls.push("auth");
    },
    complete: async () => {
      calls.push("complete");
      return true;
    },
    defer: async (_job, failed) => {
      calls.push(`defer:${failed}`);
      return true;
    },
    ...overrides,
  });
  return { handler, calls };
}
test("closure bans identity before erasure and waits for confirmed file removal", async () => {
  const { handler, calls } = deleting();
  assert.equal((await (await handler(post())).json()).code, "waiting_for_file_removal");
  assert.deepEqual(calls, ["ban", "erase", "defer:false"]);
});
test("failed identity ban prevents erasure and completion", async () => {
  const { handler, calls } = deleting({
    banIdentity: async () => {
      throw new Error("private Auth diagnostics");
    },
  });
  assert.equal((await (await handler(post())).json()).code, "retry_or_review_required");
  assert.deepEqual(calls, ["defer:true"]);
});
test("hold arriving after ban prevents database erasure", async () => {
  let checks = 0;
  const { handler, calls } = deleting({ current: async () => ++checks === 1 });
  assert.equal((await (await handler(post())).json()).code, "superseded");
  assert.deepEqual(calls, ["ban"]);
});
test("confirmed file phase precedes managed identity removal and completion", async () => {
  const { handler, calls } = deleting({ advance: async () => ({ phase: "auth" }) });
  assert.equal((await (await handler(post())).json()).code, "completed");
  assert.deepEqual(calls, ["ban", "erase", "auth", "complete"]);
});
test("retry after confirmed identity removal does not repeat the external operation", async () => {
  const { handler, calls } = deleting({
    claim: async () => ({
      request_id: id,
      requester_id: subject,
      lease_token: lease,
      phase: "auth",
    }),
    advance: async () => ({ phase: "auth" }),
    identityRemoved: async () => true,
  });
  assert.equal((await (await handler(post())).json()).code, "completed");
  assert.deepEqual(calls, ["complete"]);
});
test("unconfirmed Auth removal is never marked complete", async () => {
  const { handler, calls } = deleting({
    advance: async () => ({ phase: "auth" }),
    removeIdentity: async () => {
      throw new Error("Auth supplier response");
    },
  });
  assert.equal((await (await handler(post())).json()).code, "retry_or_review_required");
  assert.deepEqual(calls, ["ban", "erase", "defer:true"]);
});
test("deletion is disabled by default and accepts no browser-driven action", async () => {
  for (const patch of [{ authorized: () => false }, { enabled: () => false }]) {
    const { handler, calls } = deleting(patch);
    assert.ok((await handler(post())).status >= 400);
    assert.deepEqual(calls, []);
  }
});

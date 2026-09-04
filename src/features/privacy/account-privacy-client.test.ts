import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseAccountPrivacyRequests } from "./account-privacy-contract";

describe("account privacy request contract", () => {
  it("keeps only complete caller-bound request projections", () => {
    const requests = parseAccountPrivacyRequests([
      {
        request_id: "request-1",
        request_type: "export",
        request_state: "reviewing",
        member_note: "Please include my community history.",
        operator_note: null,
        version: 2,
        submitted_at: "2026-09-02T12:00:00.000Z",
        updated_at: "2026-09-02T12:05:00.000Z",
        artifact_expires_at: null,
      },
      { request_id: "request-2", request_type: "unknown", request_state: "ready" },
    ]);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].type, "export");
    assert.equal(requests[0].version, 2);
  });

  it("fails closed on unknown states and invalid timestamps", () => {
    assert.deepEqual(
      parseAccountPrivacyRequests([
        {
          request_id: "request-1",
          request_type: "deletion",
          request_state: "purged",
          version: 1,
          submitted_at: "not-a-date",
          updated_at: "not-a-date",
          artifact_expires_at: null,
        },
      ]),
      [],
    );
  });
});

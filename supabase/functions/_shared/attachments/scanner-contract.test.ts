import assert from "node:assert/strict";
import test from "node:test";
import { parseScannerVerdict, scannerErrorCode } from "./scanner-contract.ts";

test("scanner response accepts only a complete normalized verdict", () => {
  assert.equal(
    parseScannerVerdict({
      eventId: "event-123456",
      verdict: "clean",
      sha256: "a".repeat(64),
      threatCode: "",
      observedAt: "2026-08-30T20:00:00Z",
    }).verdict,
    "clean",
  );
  assert.throws(() => parseScannerVerdict({ verdict: "clean" }), /invalid/);
});

test("scanner failures become bounded operational codes", () => {
  assert.equal(scannerErrorCode(new Error("Provider HTTP 503")), "scanner_http_failure");
  assert.equal(scannerErrorCode(new Error("invalid response")), "scanner_invalid_response");
});

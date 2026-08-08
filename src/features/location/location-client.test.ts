import assert from "node:assert/strict";
import test from "node:test";
import { decodeLocationMutationResult } from "./location-contract";

test("decodes a successful location mutation", () => {
  assert.deepEqual(decodeLocationMutationResult({ ok: true, changed: false }), {
    ok: true,
    changed: false,
  });
});

test("rejects malformed location mutation responses", () => {
  assert.throws(() => decodeLocationMutationResult(null), /invalid response/);
  assert.throws(
    () => decodeLocationMutationResult({ ok: false, changed: true }),
    /invalid response/,
  );
});

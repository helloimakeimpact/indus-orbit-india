import assert from "node:assert/strict";
import test from "node:test";
import { isMissingSchemaContract } from "./schema-compat";

test("recognizes only missing schema contract errors", () => {
  assert.equal(isMissingSchemaContract({ code: "PGRST202", message: "missing RPC" }), true);
  assert.equal(isMissingSchemaContract({ code: "42703", message: "missing column" }), true);
  assert.equal(isMissingSchemaContract({ code: "42501", message: "permission denied" }), false);
  assert.equal(isMissingSchemaContract({ code: "40001", message: "refresh and retry" }), false);
  assert.equal(isMissingSchemaContract(null), false);
});

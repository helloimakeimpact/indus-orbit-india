import assert from "node:assert/strict";
import test from "node:test";
import { createSpaceSendRequestIds, isExistingSpaceAttachmentUpload } from "./space-send-recovery";

test("Orbit send recovery creates stable independent replay keys", () => {
  const values = ["message-request", "attachment-request"];
  const ids = createSpaceSendRequestIds(() => values.shift() ?? "unexpected");

  assert.deepEqual(ids, {
    messageClientRequestId: "message-request",
    attachmentClientRequestId: "attachment-request",
  });
});

test("Orbit attachment recovery ignores only an explicit object conflict", () => {
  assert.equal(isExistingSpaceAttachmentUpload({ statusCode: "409" }), true);
  assert.equal(isExistingSpaceAttachmentUpload({ status: 409 }), true);
  assert.equal(isExistingSpaceAttachmentUpload({ statusCode: "500" }), false);
  assert.equal(isExistingSpaceAttachmentUpload(new Error("already exists")), false);
});

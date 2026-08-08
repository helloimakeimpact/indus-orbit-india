import assert from "node:assert/strict";
import test from "node:test";
import { decodeProductAccess } from "./product-access.contract";

test("decodes a caller-bound product access row", () => {
  assert.deepEqual(
    decodeProductAccess([
      {
        io_access: true,
        community_access: false,
        community_status: "in_progress",
        community_current_step: "profile",
        community_version: 1,
        measurement_consent: false,
      },
    ]),
    {
      ioAccess: true,
      communityAccess: false,
      communityStatus: "in_progress",
      communityCurrentStep: "profile",
      communityVersion: 1,
      measurementConsent: false,
    },
  );
});

test("rejects malformed or unknown product access state", () => {
  assert.throws(() => decodeProductAccess([]), /invalid response/);
  assert.throws(
    () =>
      decodeProductAccess({
        io_access: true,
        community_access: true,
        community_status: "invited",
        community_current_step: "profile",
        community_version: 1,
        measurement_consent: false,
      }),
    /invalid response/,
  );
});

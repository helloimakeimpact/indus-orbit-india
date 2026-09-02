import assert from "node:assert/strict";
import test from "node:test";
import { parseOrbitSavedItems } from "./saved-state.ts";

test("saved-work parser keeps complete authorized projections only", () => {
  assert.deepEqual(
    parseOrbitSavedItems([
      {
        objectType: "space",
        objectId: "space-1",
        title: "Delhi Chapter",
        note: null,
        spaceId: "space-1",
        createdAt: "2026-08-30T00:00:00Z",
      },
      { objectType: "unknown", objectId: "bad" },
    ]),
    [
      {
        objectType: "space",
        objectId: "space-1",
        title: "Delhi Chapter",
        note: null,
        spaceId: "space-1",
        createdAt: "2026-08-30T00:00:00Z",
      },
    ],
  );
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  IO_WORKSPACE_VIEWS,
  IO_WORKSPACE_VIEW_META,
  parseIoWorkspaceView,
} from "./io-workspace-view";

test("accepts every supported I/O workspace view", () => {
  for (const view of IO_WORKSPACE_VIEWS) {
    assert.equal(parseIoWorkspaceView(view), view);
    assert.ok(IO_WORKSPACE_VIEW_META[view].title.length > 0);
    assert.ok(IO_WORKSPACE_VIEW_META[view].description.length > 0);
  }
});

test("invalid or missing workspace views fail safely to overview", () => {
  assert.equal(parseIoWorkspaceView(undefined), "overview");
  assert.equal(parseIoWorkspaceView(null), "overview");
  assert.equal(parseIoWorkspaceView("io-terminal"), "overview");
  assert.equal(parseIoWorkspaceView({ view: "terminal" }), "overview");
});

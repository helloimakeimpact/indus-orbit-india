import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyTerminalPermission,
  terminalCredentialLease,
  terminalPermissionPolicy,
} from "./terminal-policy.ts";

describe("I/O terminal mode policy", () => {
  it("classifies exact OpenCode permission families", () => {
    assert.equal(classifyTerminalPermission("edit"), "edit");
    assert.equal(classifyTerminalPermission("bash"), "shell");
    assert.equal(classifyTerminalPermission("external_directory"), "external_directory");
    assert.equal(classifyTerminalPermission("file.read"), "read");
  });

  it("keeps Observe read-only and Plan non-mutating", () => {
    assert.equal(
      terminalPermissionPolicy({ mode: "observe", permission: "file.read", risk: "low" }).allowed,
      true,
    );
    assert.equal(
      terminalPermissionPolicy({ mode: "observe", permission: "web", risk: "moderate" }).allowed,
      false,
    );
    assert.equal(
      terminalPermissionPolicy({ mode: "plan", permission: "edit", risk: "high" }).allowed,
      false,
    );
    assert.equal(
      terminalPermissionPolicy({ mode: "plan", permission: "task", risk: "moderate" }).allowed,
      true,
    );
  });

  it("allows reviewed Build edits without opening a shell", () => {
    assert.equal(
      terminalPermissionPolicy({ mode: "build", permission: "edit", risk: "high" }).allowed,
      true,
    );
    assert.equal(
      terminalPermissionPolicy({ mode: "build", permission: "shell", risk: "high" }).allowed,
      false,
    );
  });

  it("keeps critical and external-directory access blocked in Run", () => {
    assert.equal(
      terminalPermissionPolicy({ mode: "run", permission: "shell", risk: "high" }).allowed,
      true,
    );
    assert.equal(
      terminalPermissionPolicy({ mode: "run", permission: "external_directory", risk: "high" })
        .allowed,
      false,
    );
    assert.equal(
      terminalPermissionPolicy({ mode: "run", permission: "sudo", risk: "critical" }).allowed,
      false,
    );
  });

  it("expires the in-memory daemon credential after fifteen minutes", () => {
    const enteredAt = Date.parse("2026-08-27T12:00:00Z");
    assert.deepEqual(terminalCredentialLease(enteredAt, enteredAt + 14 * 60_000), {
      valid: true,
      expiresAt: enteredAt + 15 * 60_000,
      remainingMs: 60_000,
    });
    assert.equal(terminalCredentialLease(enteredAt, enteredAt + 15 * 60_000).valid, false);
    assert.equal(terminalCredentialLease(null, enteredAt).valid, false);
  });
});

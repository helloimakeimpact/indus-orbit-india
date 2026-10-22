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

  it("denies unknown, composite and safety-guard permissions in every mode", () => {
    for (const permission of [
      "unknown.mutate",
      "file.remove",
      "read.execute",
      "web-shell",
      "mcp_custom_tool",
      "doom_loop",
      "",
    ]) {
      assert.equal(classifyTerminalPermission(permission), "unknown");
      for (const mode of ["observe", "plan", "build", "run"] as const) {
        assert.equal(
          terminalPermissionPolicy({ mode, permission, risk: "low" }).allowed,
          false,
          `${mode} must not approve ${permission || "an empty permission"}`,
        );
      }
    }
  });

  it("retains reviewed official read, edit, web and shell aliases", () => {
    for (const permission of [
      "read",
      "file.read",
      "glob",
      "grep",
      "list",
      "lsp",
      "skill",
      "question",
    ]) {
      assert.equal(classifyTerminalPermission(permission), "read");
    }
    for (const permission of [
      "edit",
      "write",
      "patch",
      "apply_patch",
      "file.edit",
      "file.write",
      "file.patch",
    ]) {
      assert.equal(classifyTerminalPermission(permission), "edit");
      assert.equal(
        terminalPermissionPolicy({ mode: "observe", permission, risk: "high" }).allowed,
        false,
      );
      assert.equal(
        terminalPermissionPolicy({ mode: "build", permission, risk: "high" }).allowed,
        true,
      );
    }
    assert.equal(classifyTerminalPermission("webfetch"), "web");
    assert.equal(classifyTerminalPermission("websearch"), "web");
    assert.equal(classifyTerminalPermission("bash"), "shell");
    assert.equal(classifyTerminalPermission("shell"), "shell");
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

import {
  classifyOpenCodePermission,
  type OpenCodePermissionKind,
} from "../../../packages/io-opencode-client/src/index";

export type TerminalMode = "observe" | "plan" | "build" | "run";
export type TerminalPermissionKind = OpenCodePermissionKind;
export type TerminalPermissionRisk = "low" | "moderate" | "high" | "critical";
export const TERMINAL_CREDENTIAL_LEASE_MS = 15 * 60_000;

// A browser-side approval filter cannot constrain tools the daemon already
// allows. Re-enable only after a pinned runtime binds and verifies the full
// session policy, including child tasks, commands and forked sessions.
export const OPENCODE_EXECUTION_READINESS: Readonly<{ allowed: boolean; reason: string }> =
  Object.freeze({
    allowed: false,
    reason:
      "Local execution is paused while runtime permission enforcement is verified. You can inspect existing sessions and reject pending requests.",
  });

export const TERMINAL_MODE_POLICIES: Record<
  TerminalMode,
  { label: string; summary: string; allowedKinds: readonly TerminalPermissionKind[] }
> = {
  observe: {
    label: "Observe",
    summary:
      "Intended policy: read-only inspection, with changes, tools and network actions blocked.",
    allowedKinds: ["read"],
  },
  plan: {
    label: "Plan",
    summary: "Intended policy: read, research and task planning, with repository changes blocked.",
    allowedKinds: ["read", "web", "task"],
  },
  build: {
    label: "Build",
    summary:
      "Intended policy: reviewed reads, edits, research and tasks, with shell and external access blocked.",
    allowedKinds: ["read", "edit", "web", "task"],
  },
  run: {
    label: "Run",
    summary:
      "Intended policy: reviewed one-time local actions, with critical and external-directory access blocked.",
    allowedKinds: ["read", "edit", "shell", "network", "task", "web", "mcp"],
  },
};

export function classifyTerminalPermission(permission: string): TerminalPermissionKind {
  return classifyOpenCodePermission(permission).kind;
}

export function terminalPermissionPolicy(input: {
  mode: TerminalMode;
  permission: string;
  risk: TerminalPermissionRisk;
}) {
  const kind = classifyTerminalPermission(input.permission);
  const profile = TERMINAL_MODE_POLICIES[input.mode];
  if (kind === "unknown") {
    return {
      allowed: false,
      kind,
      reason: "This local permission is not recognized and remains blocked.",
    };
  }
  if (input.risk === "critical") {
    return {
      allowed: false,
      kind,
      reason: "Critical local actions require step-up authentication and remain blocked.",
    };
  }
  if (!profile.allowedKinds.includes(kind)) {
    return {
      allowed: false,
      kind,
      reason: `${profile.label} mode does not permit ${kind.replace("_", " ")} access.`,
    };
  }
  return {
    allowed: true,
    kind,
    reason: `${profile.label} mode permits one reviewed ${kind.replace("_", " ")} action.`,
  };
}

export function terminalCredentialLease(enteredAt: number | null, now = Date.now()) {
  if (enteredAt === null || !Number.isFinite(enteredAt) || enteredAt > now) {
    return { valid: false, expiresAt: null, remainingMs: 0 };
  }
  const expiresAt = enteredAt + TERMINAL_CREDENTIAL_LEASE_MS;
  return {
    valid: expiresAt > now,
    expiresAt,
    remainingMs: Math.max(0, expiresAt - now),
  };
}

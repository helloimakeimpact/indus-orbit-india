export type TerminalMode = "observe" | "plan" | "build" | "run";
export type TerminalPermissionKind =
  | "read"
  | "edit"
  | "shell"
  | "network"
  | "task"
  | "web"
  | "mcp"
  | "external_directory";
export type TerminalPermissionRisk = "low" | "moderate" | "high" | "critical";
export const TERMINAL_CREDENTIAL_LEASE_MS = 15 * 60_000;

export const TERMINAL_MODE_POLICIES: Record<
  TerminalMode,
  { label: string; summary: string; allowedKinds: readonly TerminalPermissionKind[] }
> = {
  observe: {
    label: "Observe",
    summary: "Read-only inspection. Changes, tools and network actions stay blocked.",
    allowedKinds: ["read"],
  },
  plan: {
    label: "Plan",
    summary: "Read, research and task planning only. Repository changes stay blocked.",
    allowedKinds: ["read", "web", "task"],
  },
  build: {
    label: "Build",
    summary: "Reviewed reads, edits, research and tasks. Shell and external access stay blocked.",
    allowedKinds: ["read", "edit", "web", "task"],
  },
  run: {
    label: "Run",
    summary:
      "Reviewed one-time local actions. Critical and external-directory access stay blocked.",
    allowedKinds: ["read", "edit", "shell", "network", "task", "web", "mcp"],
  },
};

export function classifyTerminalPermission(permission: string): TerminalPermissionKind {
  const value = permission.toLowerCase();
  if (value.includes("external")) return "external_directory";
  if (value.includes("shell") || value.includes("bash")) return "shell";
  if (value.includes("network")) return "network";
  if (value.includes("web")) return "web";
  if (value.includes("mcp")) return "mcp";
  if (value.includes("task")) return "task";
  if (value.includes("write") || value.includes("edit")) return "edit";
  return "read";
}

export function terminalPermissionPolicy(input: {
  mode: TerminalMode;
  permission: string;
  risk: TerminalPermissionRisk;
}) {
  const kind = classifyTerminalPermission(input.permission);
  const profile = TERMINAL_MODE_POLICIES[input.mode];
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

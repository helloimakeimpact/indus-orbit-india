export const IO_WORKSPACE_VIEWS = [
  "overview",
  "sessions",
  "terminal",
  "routes",
  "capacity",
  "evidence",
  "ledger",
  "safety",
] as const;

export type IoWorkspaceView = (typeof IO_WORKSPACE_VIEWS)[number];

export type IoWorkspaceViewMeta = {
  title: string;
  eyebrow: string;
  description: string;
};

const ioWorkspaceViewSet: ReadonlySet<string> = new Set(IO_WORKSPACE_VIEWS);

export const IO_WORKSPACE_VIEW_META: Record<IoWorkspaceView, IoWorkspaceViewMeta> = {
  overview: {
    title: "I/O workspace overview",
    eyebrow: "Control plane",
    description: "Manage workspace access and see the current I/O operating boundary.",
  },
  sessions: {
    title: "Start an I/O session",
    eyebrow: "Workspace sessions",
    description: "Choose local OpenCode or an entitled provider route before any work is sent.",
  },
  terminal: {
    title: "I/O Terminal",
    eyebrow: "Local execution",
    description: "Run through OpenCode on this device and retain only safe lifecycle metadata.",
  },
  routes: {
    title: "Model routes",
    eyebrow: "Provider intelligence",
    description: "Review the eligible model lane, policy evidence and estimate before dispatch.",
  },
  capacity: {
    title: "Capacity commons",
    eyebrow: "Entitlements",
    description: "See the partner, rented and donated sources this workspace may use.",
  },
  evidence: {
    title: "Route evidence",
    eyebrow: "Inspectable activity",
    description: "Inspect redacted provider receipts and the gateway or terminal activity trail.",
  },
  ledger: {
    title: "Usage ledger",
    eyebrow: "Stewardship",
    description:
      "Review provider, capacity, usage and estimated-cost facts without stored prompts.",
  },
  safety: {
    title: "Safety boundaries",
    eyebrow: "Stewardship",
    description:
      "Understand what stays local, what is recorded and how credentials remain isolated.",
  },
};

export function parseIoWorkspaceView(value: unknown): IoWorkspaceView {
  return typeof value === "string" && ioWorkspaceViewSet.has(value)
    ? (value as IoWorkspaceView)
    : "overview";
}

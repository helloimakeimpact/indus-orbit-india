export type ScannerVerdict = {
  eventId: string;
  verdict: "clean" | "blocked" | "failed";
  sha256: string;
  threatCode: string;
  observedAt: string;
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function parseScannerVerdict(value: unknown): ScannerVerdict {
  const row = record(value);
  const eventId = typeof row?.eventId === "string" ? row.eventId : "";
  const verdict = typeof row?.verdict === "string" ? row.verdict : "";
  const sha256 = typeof row?.sha256 === "string" ? row.sha256.toLowerCase() : "";
  const threatCode = typeof row?.threatCode === "string" ? row.threatCode : "";
  const observedAt = typeof row?.observedAt === "string" ? row.observedAt : "";
  if (
    eventId.length < 8 ||
    !new Set(["clean", "blocked", "failed"]).has(verdict) ||
    !/^[a-f0-9]{64}$/.test(sha256) ||
    (threatCode && !/^[a-z][a-z0-9_.-]{1,99}$/.test(threatCode)) ||
    !Number.isFinite(Date.parse(observedAt))
  ) {
    throw new Error("Scanner response is invalid");
  }
  return { eventId, verdict: verdict as ScannerVerdict["verdict"], sha256, threatCode, observedAt };
}

export function scannerErrorCode(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("timeout")) return "scanner_timeout";
  if (message.includes("HTTP")) return "scanner_http_failure";
  if (message.includes("response")) return "scanner_invalid_response";
  return "scanner_unavailable";
}

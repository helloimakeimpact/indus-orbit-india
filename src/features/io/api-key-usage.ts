export type IoApiKeyUsage = {
  apiKeyId: string;
  minuteRequestCount: number;
  dayRequestCount: number;
  monthRequestCount: number;
  dayReservedNanos: string;
  daySpentNanos: string;
  monthReservedNanos: string;
  monthSpentNanos: string;
  minuteResetAt: string;
  dayResetAt: string;
  monthResetAt: string;
};

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function integer(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function integerText(value: unknown) {
  if (typeof value === "string" && /^\d+$/.test(value)) return value;
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) {
    return String(value);
  }
  return null;
}

function text(value: unknown) {
  return typeof value === "string" && value ? value : null;
}

export function parseIoApiKeyUsageRows(value: unknown): IoApiKeyUsage[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    const row = record(candidate);
    if (!row) return [];
    const apiKeyId = text(row.api_key_id);
    const minuteRequestCount = integer(row.minute_request_count);
    const dayRequestCount = integer(row.day_request_count);
    const monthRequestCount = integer(row.month_request_count);
    const dayReservedNanos = integerText(row.day_reserved_nanos);
    const daySpentNanos = integerText(row.day_spent_nanos);
    const monthReservedNanos = integerText(row.month_reserved_nanos);
    const monthSpentNanos = integerText(row.month_spent_nanos);
    const minuteResetAt = text(row.minute_reset_at);
    const dayResetAt = text(row.day_reset_at);
    const monthResetAt = text(row.month_reset_at);
    if (
      !apiKeyId ||
      minuteRequestCount === null ||
      dayRequestCount === null ||
      monthRequestCount === null ||
      dayReservedNanos === null ||
      daySpentNanos === null ||
      monthReservedNanos === null ||
      monthSpentNanos === null ||
      !minuteResetAt ||
      !dayResetAt ||
      !monthResetAt
    ) {
      return [];
    }
    return [
      {
        apiKeyId,
        minuteRequestCount,
        dayRequestCount,
        monthRequestCount,
        dayReservedNanos,
        daySpentNanos,
        monthReservedNanos,
        monthSpentNanos,
        minuteResetAt,
        dayResetAt,
        monthResetAt,
      },
    ];
  });
}

export function apiKeyLifecycle(
  status: "active" | "revoked" | "expired",
  expiresAt: string | null,
  now = Date.now(),
) {
  if (status !== "active")
    return { effectiveStatus: status, daysRemaining: null, rotateSoon: false };
  if (!expiresAt) return { effectiveStatus: status, daysRemaining: null, rotateSoon: true };
  const expiry = Date.parse(expiresAt);
  if (!Number.isFinite(expiry)) {
    return { effectiveStatus: "expired" as const, daysRemaining: 0, rotateSoon: true };
  }
  const daysRemaining = Math.max(0, Math.ceil((expiry - now) / 86_400_000));
  return {
    effectiveStatus: expiry <= now ? ("expired" as const) : status,
    daysRemaining,
    rotateSoon: expiry <= now || daysRemaining <= 7,
  };
}

export function usagePercent(used: number | string, limit: number | string) {
  const exactInteger = (value: number | string) => {
    if (typeof value === "number") {
      return Number.isSafeInteger(value) && value >= 0 ? BigInt(value) : null;
    }
    return /^\d+$/.test(value) ? BigInt(value) : null;
  };
  const usedValue = exactInteger(used);
  const limitValue = exactInteger(limit);
  if (usedValue === null || limitValue === null || limitValue === 0n) return 0;
  const basisPoints = (usedValue * 10_000n) / limitValue;
  return Number(basisPoints > 10_000n ? 10_000n : basisPoints) / 100;
}

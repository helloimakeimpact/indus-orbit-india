import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { GatewayError } from "./errors.ts";
import type { GatewayMessage, ProviderConnection, RouteSelection } from "./types.ts";

type JsonRecord = Record<string, unknown>;

export type RouteReservation = {
  requestId: string;
  reservationId: string | null;
  replayed: boolean;
  state: "reserved" | "completed" | "failed" | "expired";
  receiptId: string | null;
  reservedMinor: number;
  currencyCode: string;
};

function asRecord(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function readString(value: JsonRecord, key: string): string | null {
  const candidate = value[key];
  return typeof candidate === "string" && candidate ? candidate : null;
}

function readSafeInteger(value: JsonRecord, key: string, fallback = 0): number {
  const candidate = value[key];
  const parsed = typeof candidate === "number" ? candidate : Number(candidate);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function currencyMinorDigits(currencyCode: string) {
  try {
    const digits = new Intl.NumberFormat("en", {
      style: "currency",
      currency: currencyCode,
    }).resolvedOptions().maximumFractionDigits;
    if (Number.isInteger(digits) && digits >= 0 && digits <= 3) return digits;
  } catch {
    // Registry validation owns the ISO code; this fallback keeps settlement fail-closed.
  }
  throw new GatewayError(
    "not_configured",
    503,
    "The route currency has no reviewed minor-unit rule.",
  );
}

function divideRoundUp(numerator: bigint, denominator: bigint) {
  return (numerator + denominator - 1n) / denominator;
}

function safeNumber(value: bigint, label: string) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new GatewayError("internal_error", 500, `${label} exceeds the supported safe range.`);
  }
  return parsed;
}

export function nanosToMinorUnits(costNanos: number, currencyCode: string) {
  if (!Number.isSafeInteger(costNanos) || costNanos < 0) {
    throw new GatewayError("internal_error", 500, "The provider cost is outside the safe range.");
  }
  const scale = 10n ** BigInt(currencyMinorDigits(currencyCode));
  return safeNumber(divideRoundUp(BigInt(costNanos) * scale, 1_000_000_000n), "Minor-unit cost");
}

export function calculateCostNanos(
  connection: ProviderConnection,
  inputTokens: number,
  outputTokens: number,
) {
  if (
    !Number.isSafeInteger(inputTokens) ||
    inputTokens < 0 ||
    !Number.isSafeInteger(outputTokens) ||
    outputTokens < 0
  ) {
    throw new GatewayError("internal_error", 500, "Provider token usage is invalid.");
  }
  const quantity = BigInt(connection.unitQuantity);
  const numerator =
    BigInt(inputTokens) * BigInt(connection.inputPriceNanos) +
    BigInt(outputTokens) * BigInt(connection.outputPriceNanos);
  return safeNumber(divideRoundUp(numerator, quantity), "Provider cost");
}

export function conservativeInputTokenBound(messages: GatewayMessage[]) {
  const contentBytes = messages.reduce(
    (total, message) => total + new TextEncoder().encode(message.content).byteLength,
    0,
  );
  return contentBytes + messages.length * 16 + 128;
}

export function calculateReservationMinor(
  attempts: Array<{ connection: ProviderConnection }>,
  messages: GatewayMessage[],
  outputTokenLimit = 1_024,
) {
  const inputTokenBound = conservativeInputTokenBound(messages);
  return Math.max(
    ...attempts.map(({ connection }) =>
      nanosToMinorUnits(
        calculateCostNanos(connection, inputTokenBound, outputTokenLimit),
        connection.currencyCode,
      ),
    ),
  );
}

export function calculateSettlement(input: {
  selection: RouteSelection;
  inputTokens?: number;
  outputTokens?: number;
}) {
  const completeUsage = input.inputTokens !== undefined && input.outputTokens !== undefined;
  const costNanos = completeUsage
    ? calculateCostNanos(input.selection.connection, input.inputTokens!, input.outputTokens!)
    : input.selection.estimatedCostNanos;
  return {
    actualCostMinor: nanosToMinorUnits(costNanos, input.selection.connection.currencyCode),
    costBasis: completeUsage ? "provider_usage" : "route_estimate_missing_usage",
  } as const;
}

export async function fingerprintRouteRequest(input: {
  workspaceId: string;
  mode: string;
  messages: GatewayMessage[];
  routeStrategy?: string;
  requestedModelId?: string;
}) {
  const canonical = JSON.stringify({
    workspaceId: input.workspaceId,
    mode: input.mode,
    messages: input.messages,
    routeStrategy: input.routeStrategy ?? "latest_affordable",
    requestedModelId: input.requestedModelId ?? null,
  });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function mapOperationalError(error: { message?: string } | null): never {
  const message = error?.message ?? "I/O operations could not complete the request.";
  if (message.includes("Workspace budget would be exceeded")) {
    throw new GatewayError("budget_exceeded", 402, "This route would exceed the workspace budget.");
  }
  if (message.includes("No active workspace budget")) {
    throw new GatewayError(
      "not_configured",
      503,
      "No active workspace budget is configured for this currency.",
    );
  }
  if (message.includes("different request")) {
    throw new GatewayError(
      "idempotency_conflict",
      409,
      "This idempotency key belongs to a different request.",
    );
  }
  if (message.includes("circuit is open")) {
    throw new GatewayError(
      "not_configured",
      503,
      "The selected provider route is temporarily unavailable.",
    );
  }
  throw new GatewayError("internal_error", 500, "I/O operations could not complete the request.");
}

export async function beginRouteRequest(
  admin: SupabaseClient,
  input: {
    workspaceId: string;
    actorUserId: string;
    idempotencyKey: string;
    requestFingerprint: string;
    requestId: string;
    endpointId: string;
    currencyCode: string;
    reserveMinor: number;
  },
): Promise<RouteReservation> {
  const { data, error } = await admin.rpc("io_begin_route_request", {
    _workspace_id: input.workspaceId,
    _actor_user_id: input.actorUserId,
    _idempotency_key: input.idempotencyKey,
    _request_fingerprint: input.requestFingerprint,
    _request_id: input.requestId,
    _endpoint_id: input.endpointId,
    _currency_code: input.currencyCode,
    _reserve_minor: input.reserveMinor,
  });
  if (error) mapOperationalError(error);
  const result = asRecord(data);
  const requestId = result ? readString(result, "requestId") : null;
  const state = result ? readString(result, "state") : null;
  if (
    !result ||
    !requestId ||
    !state ||
    !["reserved", "completed", "failed", "expired"].includes(state)
  ) {
    throw new GatewayError(
      "internal_error",
      500,
      "The budget reservation returned an invalid result.",
    );
  }
  return {
    requestId,
    reservationId: readString(result, "reservationId"),
    replayed: result.replayed === true,
    state: state as RouteReservation["state"],
    receiptId: readString(result, "receiptId"),
    reservedMinor: readSafeInteger(result, "reservedMinor"),
    currencyCode: readString(result, "currencyCode") ?? input.currencyCode,
  };
}

export async function recordEndpointOutcome(
  admin: SupabaseClient,
  input: { endpointId: string; succeeded: boolean; latencyMs: number; errorCode?: string },
) {
  const { error } = await admin.rpc("io_record_endpoint_outcome", {
    _endpoint_id: input.endpointId,
    _succeeded: input.succeeded,
    _latency_ms: Math.max(0, Math.round(input.latencyMs)),
    _error_code: input.errorCode ?? null,
  });
  if (error) console.error("io-gateway health evidence failed", error.message);
}

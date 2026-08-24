import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { GatewayError } from "./errors.ts";
import { gatewayMessageBytes } from "./message-content.ts";
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

export type ServiceFeePolicy = {
  version: number;
  feeBasisPoints: number;
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

export function calculateUsageChargeNanos(providerCostNanos: number, feeBasisPoints: number) {
  if (!Number.isSafeInteger(providerCostNanos) || providerCostNanos < 0) {
    throw new GatewayError("internal_error", 500, "The provider cost is outside the safe range.");
  }
  if (!Number.isInteger(feeBasisPoints) || feeBasisPoints < 0 || feeBasisPoints > 10_000) {
    throw new GatewayError("internal_error", 500, "The I/O service fee policy is invalid.");
  }
  const serviceFeeNanos = safeNumber(
    divideRoundUp(BigInt(providerCostNanos) * BigInt(feeBasisPoints), 10_000n),
    "I/O service fee",
  );
  return {
    providerCostNanos,
    serviceFeeNanos,
    customerChargeNanos: safeNumber(
      BigInt(providerCostNanos) + BigInt(serviceFeeNanos),
      "Customer usage charge",
    ),
    feeBasisPoints,
  };
}

export async function loadActiveServiceFeePolicy(admin: SupabaseClient): Promise<ServiceFeePolicy> {
  const { data, error } = await admin.rpc("io_get_active_service_fee_policy");
  if (error) {
    throw new GatewayError("not_configured", 503, "The I/O service fee is not configured.");
  }
  const result = asRecord(data);
  const version = result ? readSafeInteger(result, "version") : 0;
  const feeBasisPoints = result ? readSafeInteger(result, "feeBasisPoints", -1) : -1;
  if (version < 1 || feeBasisPoints < 0 || feeBasisPoints > 10_000) {
    throw new GatewayError("internal_error", 500, "The I/O service fee policy is invalid.");
  }
  return { version, feeBasisPoints };
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
  const contentBytes = messages.reduce((total, message) => total + gatewayMessageBytes(message), 0);
  return contentBytes + messages.length * 16 + 128;
}

export function calculateReservationMinor(
  attempts: Array<{ connection: ProviderConnection }>,
  messages: GatewayMessage[],
  outputTokenLimit = 1_024,
  feeBasisPoints = 0,
) {
  const reservation = calculateReservationNanos(
    attempts,
    messages,
    outputTokenLimit,
    feeBasisPoints,
  );
  return nanosToMinorUnits(reservation.customerChargeNanos, reservation.currencyCode);
}

export function calculateReservationNanos(
  attempts: Array<{ connection: ProviderConnection }>,
  messages: GatewayMessage[],
  outputTokenLimit = 1_024,
  feeBasisPoints = 0,
) {
  if (attempts.length === 0) {
    throw new GatewayError("not_configured", 503, "No provider attempt is available to reserve.");
  }
  const currencyCode = attempts[0].connection.currencyCode;
  if (attempts.some(({ connection }) => connection.currencyCode !== currencyCode)) {
    throw new GatewayError(
      "not_configured",
      503,
      "Cross-currency fallback requires an approved FX snapshot.",
    );
  }
  const inputTokenBound = conservativeInputTokenBound(messages);
  const totalWorstCaseNanos = attempts.reduce(
    (total, { connection }) =>
      total +
      BigInt(
        calculateUsageChargeNanos(
          calculateCostNanos(connection, inputTokenBound, outputTokenLimit),
          feeBasisPoints,
        ).customerChargeNanos,
      ),
    0n,
  );
  return {
    customerChargeNanos: safeNumber(totalWorstCaseNanos, "Worst-case attempt reservation"),
    currencyCode,
  };
}

export function calculateSettlement(input: {
  selection: RouteSelection;
  inputTokens?: number;
  outputTokens?: number;
  feeBasisPoints?: number;
}) {
  const completeUsage = input.inputTokens !== undefined && input.outputTokens !== undefined;
  const costNanos = completeUsage
    ? calculateCostNanos(input.selection.connection, input.inputTokens!, input.outputTokens!)
    : input.selection.estimatedCostNanos;
  const charge = calculateUsageChargeNanos(costNanos, input.feeBasisPoints ?? 0);
  return {
    ...charge,
    customerChargeMinor: nanosToMinorUnits(
      charge.customerChargeNanos,
      input.selection.connection.currencyCode,
    ),
    costBasis: completeUsage ? "provider_usage" : "route_estimate_missing_usage",
  } as const;
}

export async function fingerprintRouteRequest(input: {
  workspaceId: string;
  mode: string;
  messages: GatewayMessage[];
  routeStrategy?: string;
  requestedModelId?: string;
  inferenceOptions?: Record<string, unknown>;
}) {
  const canonical = JSON.stringify({
    workspaceId: input.workspaceId,
    mode: input.mode,
    messages: input.messages,
    routeStrategy: input.routeStrategy ?? "latest_affordable",
    requestedModelId: input.requestedModelId ?? null,
    inferenceOptions: input.inferenceOptions ?? null,
  });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function mapOperationalError(error: { message?: string } | null): never {
  const message = error?.message ?? "I/O operations could not complete the request.";
  if (message.includes("Workspace budget would be exceeded")) {
    throw new GatewayError("budget_exceeded", 402, "This route would exceed the workspace budget.");
  }
  if (message.includes("API key daily spend limit would be exceeded")) {
    throw new GatewayError(
      "budget_exceeded",
      402,
      "This route would exceed the API key daily spend limit.",
    );
  }
  if (message.includes("API key monthly spend limit would be exceeded")) {
    throw new GatewayError(
      "budget_exceeded",
      402,
      "This route would exceed the API key monthly spend limit.",
    );
  }
  if (message.includes("API key spend currency does not match")) {
    throw new GatewayError(
      "not_configured",
      503,
      "This API key is not configured for the selected route currency.",
    );
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
    apiKeyId?: string;
    reserveCustomerNanos?: number;
  },
): Promise<RouteReservation> {
  if (input.apiKeyId && input.reserveCustomerNanos === undefined) {
    throw new GatewayError("internal_error", 500, "The API key spend reservation is missing.");
  }
  const rpcName = input.apiKeyId ? "io_begin_api_key_route_request" : "io_begin_route_request";
  const { data, error } = await admin.rpc(rpcName, {
    _workspace_id: input.workspaceId,
    _actor_user_id: input.actorUserId,
    _idempotency_key: input.idempotencyKey,
    _request_fingerprint: input.requestFingerprint,
    _request_id: input.requestId,
    _endpoint_id: input.endpointId,
    _currency_code: input.currencyCode,
    _reserve_minor: input.reserveMinor,
    ...(input.apiKeyId
      ? {
          _api_key_id: input.apiKeyId,
          _reserve_customer_nanos: input.reserveCustomerNanos,
        }
      : {}),
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

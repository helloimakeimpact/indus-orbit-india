import { GatewayError } from "./errors.ts";
import { gatewayMessageWeight } from "./message-content.ts";
import type { GatewayMessage, ProviderConnection, RouteSelection, RouteStrategy } from "./types.ts";

export type RouteInput = {
  strategy?: RouteStrategy;
  requestedModelId?: string;
  entitledCapacitySourceIds: ReadonlySet<string>;
  connectionFilter?: (connection: ProviderConnection) => boolean;
  outputTokenAllowance?: number;
};

export type RoutingSettings = {
  tier: ProviderConnection["autoRouteTier"];
  freshnessDays: number;
  affordabilityMultiplier: number;
  outputTokenAllowance: number;
};

export function selectRouteAttempts<T>(candidates: T[], configuredLimit?: string): T[] {
  const value = configuredLimit?.trim();
  const limit = value ? Number(value) : 1;
  if (!Number.isInteger(limit) || limit < 1 || limit > 3) {
    throw new GatewayError(
      "internal_error",
      500,
      "The IO_PROVIDER_MAX_ATTEMPTS value must be an integer from 1 to 3.",
    );
  }
  return candidates.slice(0, limit);
}

function dateMillis(date: string) {
  const timestamp = Date.parse(`${date}T00:00:00.000Z`);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function isDeprecated(connection: ProviderConnection, now: number) {
  if (!connection.modelDeprecationAt) return false;
  const timestamp = Date.parse(connection.modelDeprecationAt);
  return Number.isFinite(timestamp) && timestamp <= now;
}

function estimateInputTokens(messages: GatewayMessage[]) {
  return Math.max(
    1,
    Math.ceil(messages.reduce((total, message) => total + gatewayMessageWeight(message), 0) / 4),
  );
}

function estimateCostNanos(
  connection: ProviderConnection,
  inputTokens: number,
  outputTokenAllowance: number,
) {
  const estimated =
    (inputTokens * connection.inputPriceNanos) / connection.unitQuantity +
    (outputTokenAllowance * connection.outputPriceNanos) / connection.unitQuantity;
  return Number.isSafeInteger(Math.ceil(estimated)) ? Math.ceil(estimated) : null;
}

function requireComparableCurrency(connections: ProviderConnection[]) {
  const currencies = new Set(connections.map((connection) => connection.currencyCode));
  if (currencies.size > 1) {
    throw new GatewayError(
      "not_configured",
      503,
      "Automatic routing needs reviewed FX data before comparing provider currencies.",
    );
  }
}

export function selectProviderRoute(
  registryConnections: ProviderConnection[],
  messages: GatewayMessage[],
  input: RouteInput,
  settings: RoutingSettings,
  now = Date.now(),
): RouteSelection {
  const strategy = input.strategy ?? "latest_affordable";
  const inputTokens = estimateInputTokens(messages);
  const requiredContext = inputTokens + settings.outputTokenAllowance;
  const eligible = registryConnections.filter((connection) => {
    if (!input.entitledCapacitySourceIds.has(connection.capacitySourceId)) return false;
    if (input.connectionFilter && !input.connectionFilter(connection)) return false;
    if (isDeprecated(connection, now)) return false;
    if (dateMillis(connection.modelReleaseDate) === null) return false;
    if (connection.maxContextTokens !== null && connection.maxContextTokens < requiredContext)
      return false;
    if (strategy === "explicit_model") return connection.modelId === input.requestedModelId;
    return connection.autoRouteTier === settings.tier;
  });

  if (!eligible.length) {
    throw new GatewayError(
      "not_configured",
      503,
      "No reviewed, entitled provider route is available for this request.",
    );
  }

  requireComparableCurrency(eligible);
  const candidates = eligible.flatMap((connection) => {
    const estimatedCostNanos = estimateCostNanos(
      connection,
      inputTokens,
      settings.outputTokenAllowance,
    );
    return estimatedCostNanos === null ? [] : [{ connection, estimatedCostNanos }];
  });
  if (!candidates.length) {
    throw new GatewayError(
      "not_configured",
      503,
      "No eligible provider route has a usable current price card.",
    );
  }

  const newestRelease = Math.max(
    ...candidates.map((candidate) => dateMillis(candidate.connection.modelReleaseDate)!),
  );
  const freshCandidates = candidates.filter(
    (candidate) =>
      dateMillis(candidate.connection.modelReleaseDate)! >=
      newestRelease - settings.freshnessDays * 86_400_000,
  );
  const affordableCost = Math.min(
    ...freshCandidates.map((candidate) => candidate.estimatedCostNanos),
  );
  const affordableCandidates = freshCandidates.filter(
    (candidate) =>
      candidate.estimatedCostNanos <= affordableCost * settings.affordabilityMultiplier,
  );

  const sorted = [...(strategy === "latest_affordable" ? affordableCandidates : candidates)].sort(
    (left, right) => {
      if (strategy === "lowest_cost") {
        const costDifference = left.estimatedCostNanos - right.estimatedCostNanos;
        if (costDifference !== 0) return costDifference;
      } else {
        const releaseDifference =
          dateMillis(right.connection.modelReleaseDate)! -
          dateMillis(left.connection.modelReleaseDate)!;
        if (releaseDifference !== 0) return releaseDifference;
        const costDifference = left.estimatedCostNanos - right.estimatedCostNanos;
        if (costDifference !== 0) return costDifference;
      }
      return `${left.connection.providerKey}:${left.connection.providerModelId}:${left.connection.endpointKey}`.localeCompare(
        `${right.connection.providerKey}:${right.connection.providerModelId}:${right.connection.endpointKey}`,
      );
    },
  );
  const selected = sorted[0];
  return {
    connection: selected.connection,
    strategy,
    tier: selected.connection.autoRouteTier,
    estimatedCostNanos: selected.estimatedCostNanos,
    candidateCount: candidates.length,
    candidateSummary: candidates.map((candidate) => ({
      providerKey: candidate.connection.providerKey,
      modelId: candidate.connection.providerModelId,
      endpointKey: candidate.connection.endpointKey,
      estimatedCostNanos: candidate.estimatedCostNanos,
      currencyCode: candidate.connection.currencyCode,
    })),
    routeCandidates: sorted,
  };
}

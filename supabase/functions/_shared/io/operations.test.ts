import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateCostNanos,
  calculateReservationMinor,
  calculateSettlement,
  conservativeInputTokenBound,
  fingerprintRouteRequest,
  nanosToMinorUnits,
} from "./operations.ts";
import type { ProviderConnection, RouteSelection } from "./types.ts";

function connection(overrides: Partial<ProviderConnection> = {}): ProviderConnection {
  return {
    endpointId: "endpoint-test",
    providerId: "provider-test",
    providerKey: "provider-test",
    providerDisplayName: "Provider test",
    integrationStyle: "openai_compatible",
    modelId: "model-test",
    providerModelId: "model-test",
    modelDisplayName: "Model test",
    modelReleaseDate: "2026-07-01",
    modelDeprecationAt: null,
    autoRouteTier: "balanced",
    maxContextTokens: 100_000,
    capacitySourceId: "source-test",
    endpointKey: "endpoint-test",
    capacityMode: "direct_api",
    regionCode: null,
    residencyCountryCode: null,
    retentionClass: "contractual_no_training",
    baseUrl: "https://provider.example/v1",
    secretReference: "IO_PROVIDER_TEST_API_KEY",
    capabilityVersion: 1,
    priceVersion: 1,
    currencyCode: "USD",
    unitQuantity: 1_000,
    inputPriceNanos: 2_000_000,
    outputPriceNanos: 8_000_000,
    healthState: "healthy",
    circuitState: "closed",
    ...overrides,
  };
}

function selection(candidate: ProviderConnection): RouteSelection {
  return {
    connection: candidate,
    strategy: "latest_affordable",
    tier: "balanced",
    estimatedCostNanos: 20_000_000,
    candidateCount: 1,
    candidateSummary: [],
    routeCandidates: [{ connection: candidate, estimatedCostNanos: 20_000_000 }],
  };
}

describe("I/O operational calculations", () => {
  it("uses integer arithmetic and rounds provider nanos upward", () => {
    assert.equal(calculateCostNanos(connection(), 1_000, 500), 6_000_000);
    assert.equal(nanosToMinorUnits(6_000_000, "USD"), 1);
    assert.equal(nanosToMinorUnits(1_000_000_000, "JPY"), 1);
  });

  it("reserves the total worst-case cost across every allowed attempt", () => {
    const messages = [{ role: "user" as const, content: "hello" }];
    assert.equal(conservativeInputTokenBound(messages), 149);
    assert.equal(
      calculateReservationMinor(
        [
          { connection: connection() },
          { connection: connection({ outputPriceNanos: 80_000_000 }) },
        ],
        messages,
      ),
      10,
    );
    assert.throws(() => calculateReservationMinor([], messages), /No provider attempt/);
  });

  it("settles from complete provider usage and labels missing usage estimates", () => {
    const candidate = connection();
    assert.deepEqual(
      calculateSettlement({
        selection: selection(candidate),
        inputTokens: 1_000,
        outputTokens: 500,
      }),
      { actualCostMinor: 1, costBasis: "provider_usage" },
    );
    assert.deepEqual(calculateSettlement({ selection: selection(candidate) }), {
      actualCostMinor: 2,
      costBasis: "route_estimate_missing_usage",
    });
  });

  it("fingerprints canonical route intent without exposing prompt data", async () => {
    const input = {
      workspaceId: "workspace-test",
      mode: "plan",
      messages: [{ role: "user" as const, content: "private prompt" }],
    };
    const first = await fingerprintRouteRequest(input);
    const second = await fingerprintRouteRequest(input);
    assert.match(first, /^[a-f0-9]{64}$/);
    assert.equal(first, second);
    assert.equal(first.includes("private prompt"), false);
  });
});

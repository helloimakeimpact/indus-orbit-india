import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GatewayError } from "./errors.ts";
import { workspaceAllowsProvider } from "./policy.ts";
import { selectProviderRoute, selectRouteAttempts } from "./routing.ts";
import type { ProviderConnection } from "./types.ts";

const settings = {
  tier: "balanced" as const,
  freshnessDays: 365,
  affordabilityMultiplier: 1.35,
  outputTokenAllowance: 100,
};
const now = Date.parse("2026-08-01T00:00:00.000Z");

function connection(overrides: Partial<ProviderConnection>): ProviderConnection {
  return {
    endpointId: "endpoint-default",
    providerId: "provider-default",
    providerKey: "provider-default",
    providerDisplayName: "Provider default",
    integrationStyle: "openai_compatible",
    modelId: "model-default",
    providerModelId: "model-default",
    modelDisplayName: "Model default",
    modelReleaseDate: "2026-06-01",
    modelDeprecationAt: null,
    autoRouteTier: "balanced",
    maxContextTokens: 100_000,
    capacitySourceId: "source-a",
    endpointKey: "endpoint-default",
    capacityMode: "partner",
    regionCode: "IN",
    residencyCountryCode: "IN",
    retentionClass: "no-training",
    baseUrl: "https://provider.example/v1",
    secretReference: "IO_PROVIDER_TEST_API_KEY",
    capabilityVersion: 1,
    priceVersion: 1,
    currencyCode: "USD",
    unitQuantity: 1,
    inputPriceNanos: 1,
    outputPriceNanos: 10,
    healthState: "unknown",
    circuitState: "closed",
    ...overrides,
  };
}

const olderCheaper = connection({
  endpointId: "endpoint-old",
  providerId: "provider-old",
  providerKey: "provider-old",
  modelId: "model-old",
  providerModelId: "model-old",
  modelReleaseDate: "2026-04-01",
});
const newerAffordable = connection({
  endpointId: "endpoint-new",
  providerId: "provider-new",
  providerKey: "provider-new",
  modelId: "model-new",
  providerModelId: "model-new",
  modelReleaseDate: "2026-07-01",
  inputPriceNanos: 2,
});
const messages = [{ role: "user" as const, content: "Plan the I/O Port rollout." }];

describe("selectProviderRoute", () => {
  it("chooses the newest reviewed model that remains within the affordability band", () => {
    const selection = selectProviderRoute(
      [olderCheaper, newerAffordable],
      messages,
      { entitledCapacitySourceIds: new Set(["source-a"]) },
      settings,
      now,
    );

    assert.equal(selection.strategy, "latest_affordable");
    assert.equal(selection.connection.modelId, "model-new");
    assert.equal(selection.candidateCount, 2);
  });

  it("chooses the least costly entitled model when lowest-cost is requested", () => {
    const selection = selectProviderRoute(
      [olderCheaper, newerAffordable],
      messages,
      { strategy: "lowest_cost", entitledCapacitySourceIds: new Set(["source-a"]) },
      settings,
      now,
    );

    assert.equal(selection.connection.modelId, "model-old");
  });

  it("does not substitute another model for an explicit approved selection", () => {
    const selection = selectProviderRoute(
      [olderCheaper, newerAffordable],
      messages,
      {
        strategy: "explicit_model",
        requestedModelId: "model-old",
        entitledCapacitySourceIds: new Set(["source-a"]),
      },
      settings,
      now,
    );

    assert.equal(selection.connection.modelId, "model-old");
    assert.equal(selection.candidateCount, 1);
  });

  it("fails closed instead of comparing currencies without approved FX data", () => {
    const inrCandidate = connection({
      endpointId: "endpoint-inr",
      providerId: "provider-inr",
      providerKey: "provider-inr",
      modelId: "model-inr",
      providerModelId: "model-inr",
      currencyCode: "INR",
    });

    assert.throws(
      () =>
        selectProviderRoute(
          [olderCheaper, inrCandidate],
          messages,
          { entitledCapacitySourceIds: new Set(["source-a"]) },
          settings,
          now,
        ),
      (error: unknown) =>
        error instanceof GatewayError &&
        error.code === "not_configured" &&
        /reviewed FX data/.test(error.message),
    );
  });

  it("excludes unentitled, deprecated and undersized candidates", () => {
    const selection = selectProviderRoute(
      [
        olderCheaper,
        connection({ modelId: "unentitled", capacitySourceId: "source-b" }),
        connection({ modelId: "deprecated", modelDeprecationAt: "2026-07-01T00:00:00Z" }),
        connection({ modelId: "small", maxContextTokens: 1 }),
      ],
      messages,
      { entitledCapacitySourceIds: new Set(["source-a"]) },
      settings,
      now,
    );
    assert.equal(selection.candidateCount, 1);
    assert.equal(selection.connection.modelId, "model-old");
  });

  it("uses a deterministic provider key tie-break", () => {
    const alpha = connection({ providerKey: "alpha", providerModelId: "same", modelId: "alpha" });
    const beta = connection({ providerKey: "beta", providerModelId: "same", modelId: "beta" });
    const selection = selectProviderRoute(
      [beta, alpha],
      messages,
      { entitledCapacitySourceIds: new Set(["source-a"]) },
      settings,
      now,
    );
    assert.equal(selection.connection.providerKey, "alpha");
  });
});

describe("selectRouteAttempts", () => {
  it("defaults to one provider attempt", () => {
    assert.deepEqual(selectRouteAttempts(["a", "b"]), ["a"]);
  });

  it("requires an explicit bounded setting for fallback", () => {
    assert.deepEqual(selectRouteAttempts(["a", "b", "c"], "2"), ["a", "b"]);
    assert.throws(() => selectRouteAttempts(["a"], "4"), /integer from 1 to 3/);
  });
});

describe("workspace provider residency policy", () => {
  it("keeps CN routes excluded until both disclosures are accepted", () => {
    const cnRoute = { residencyCountryCode: "CN" };
    assert.equal(
      workspaceAllowsProvider({ allowChinaHosted: false, allowTrainingPossible: false }, cnRoute),
      false,
    );
    assert.equal(
      workspaceAllowsProvider({ allowChinaHosted: true, allowTrainingPossible: false }, cnRoute),
      false,
    );
    assert.equal(
      workspaceAllowsProvider({ allowChinaHosted: true, allowTrainingPossible: true }, cnRoute),
      true,
    );
    assert.equal(
      workspaceAllowsProvider(
        { allowChinaHosted: false, allowTrainingPossible: false },
        { residencyCountryCode: "IN" },
      ),
      true,
    );
  });
});

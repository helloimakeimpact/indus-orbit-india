import assert from "node:assert/strict";
import test from "node:test";
import {
  compareNonBillableFixtureShadow,
  currentTransportEvidence,
  fixtureShadowFlag,
} from "./transport-rollout.ts";

const baseline = {
  content: "fixture output",
  message: { role: "assistant" as const, content: "fixture output" },
  finishReason: "stop" as const,
  usage: { inputTokens: 2, outputTokens: 3 },
};

test("current transport evidence is explicit for every released adapter style", () => {
  assert.deepEqual(
    currentTransportEvidence({ integrationStyle: "openai_compatible", providerKey: "openai" }),
    {
      executionAdapterVersion: "edge-direct.v1",
      translationVersion: "openai-compatible-pass-through.v1",
    },
  );
  assert.deepEqual(
    currentTransportEvidence({ integrationStyle: "native_adapter", providerKey: "gemini" }),
    {
      executionAdapterVersion: "edge-direct.v1",
      translationVersion: "gemini-native.v1",
    },
  );
  assert.throws(
    () => currentTransportEvidence({ integrationStyle: "native_adapter", providerKey: "other" }),
    /reviewed transport evidence/u,
  );
});

test("fixture shadow flags are absent by default and exact-provider/capability scoped", () => {
  assert.deepEqual(fixtureShadowFlag(undefined, "openai", "openai-chat.anthropic.v1"), {
    enabled: false,
    reason: "configuration_absent",
    configurationVersion: null,
  });
  const configuration = JSON.stringify({
    version: 1,
    mode: "fixture_shadow",
    providers: { openai: ["openai-chat.anthropic.v1"] },
  });
  assert.equal(
    fixtureShadowFlag(configuration, "openai", "openai-chat.anthropic.v1").enabled,
    true,
  );
  assert.equal(
    fixtureShadowFlag(configuration, "openai", "openai-chat.openai-responses.v1").reason,
    "capability_disabled",
  );
  assert.equal(
    fixtureShadowFlag(configuration, "deepseek", "openai-chat.anthropic.v1").reason,
    "provider_disabled",
  );
  assert.throws(
    () =>
      fixtureShadowFlag(
        JSON.stringify({
          version: 1,
          mode: "fixture_shadow",
          providers: { "*": ["openai-chat.anthropic.v1"] },
        }),
        "openai",
        "openai-chat.anthropic.v1",
      ),
    /configuration is invalid/u,
  );
});

test("fixture comparison is content-free and cannot accept a billable/provider result", () => {
  const configuration = JSON.stringify({
    version: 1,
    mode: "fixture_shadow",
    providers: { openai: ["openai-chat.anthropic.v1"] },
  });
  const compared = compareNonBillableFixtureShadow({
    rawConfiguration: configuration,
    billingClass: "non_billable_fixture",
    fixtureId: "fixture:anthropic-tools",
    providerKey: "openai",
    capability: "openai-chat.anthropic.v1",
    baseline,
    candidate: { ...baseline, finishReason: "length" },
  });
  assert.equal(compared.state, "compared");
  assert.equal(compared.matched, false);
  assert.equal(compared.dimensions?.finishReason, false);
  assert.equal(JSON.stringify(compared).includes("fixture output"), false);

  assert.throws(
    () =>
      compareNonBillableFixtureShadow({
        rawConfiguration: configuration,
        billingClass: "billable" as "non_billable_fixture",
        fixtureId: "fixture:anthropic-tools",
        providerKey: "openai",
        capability: "openai-chat.anthropic.v1",
        baseline,
        candidate: baseline,
      }),
    /requires local non-billable evidence/u,
  );
  assert.throws(
    () =>
      compareNonBillableFixtureShadow({
        rawConfiguration: configuration,
        billingClass: "non_billable_fixture",
        fixtureId: "fixture:anthropic-tools",
        providerKey: "openai",
        capability: "openai-chat.anthropic.v1",
        baseline: { ...baseline, providerRequestId: "upstream-id" } as typeof baseline,
        candidate: baseline,
      }),
    /requires local non-billable evidence/u,
  );
});

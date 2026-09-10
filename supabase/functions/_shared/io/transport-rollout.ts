import { GatewayError } from "./errors.ts";
import type { PartnerResult, ProviderConnection, TransportExecutionEvidence } from "./types.ts";

export const EDGE_DIRECT_EXECUTION_ADAPTER_VERSION = "edge-direct.v1" as const;
export const OPENAI_COMPATIBLE_TRANSLATION_VERSION = "openai-compatible-pass-through.v1" as const;
export const GEMINI_NATIVE_TRANSLATION_VERSION = "gemini-native.v1" as const;

export type CandidateTranslationCapability =
  | "openai-chat.anthropic.v1"
  | "openai-chat.openai-responses.v1";

export type FixtureShadowFlag = {
  enabled: boolean;
  reason: "configuration_absent" | "provider_disabled" | "capability_disabled" | "enabled";
  configurationVersion: 1 | null;
};

export type FixtureShadowComparison = {
  state: "skipped" | "compared";
  reason?: Exclude<FixtureShadowFlag["reason"], "enabled">;
  fixtureId: string;
  providerKey: string;
  capability: CandidateTranslationCapability;
  executionAdapterVersion: string;
  translationVersion: CandidateTranslationCapability;
  matched?: boolean;
  dimensions?: {
    content: boolean;
    messageContent: boolean;
    finishReason: boolean;
    toolCalls: boolean;
    usage: boolean;
  };
};

type FixtureComparableResult = Pick<
  PartnerResult,
  "content" | "finishReason" | "message" | "usage"
>;

const maximumFlagBytes = 16 * 1_024;
const providerKeyPattern = /^[a-z0-9][a-z0-9_-]{1,63}$/;
const fixtureIdPattern = /^fixture:[a-z0-9][a-z0-9._-]{1,127}$/;
const versionPattern = /^[a-z0-9][a-z0-9._-]{2,127}\.v[1-9][0-9]*$/;
const candidateCapabilities = new Set<CandidateTranslationCapability>([
  "openai-chat.anthropic.v1",
  "openai-chat.openai-responses.v1",
]);

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function configurationError(): never {
  throw new GatewayError(
    "internal_error",
    500,
    "The fixture-shadow transport configuration is invalid.",
  );
}

function parseFixtureShadowConfiguration(raw: string) {
  if (new TextEncoder().encode(raw).byteLength > maximumFlagBytes) configurationError();
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    configurationError();
  }
  const root = record(decoded);
  const providers = record(root?.providers);
  if (
    !root ||
    root.version !== 1 ||
    root.mode !== "fixture_shadow" ||
    !providers ||
    Object.keys(root).some((key) => !["version", "mode", "providers"].includes(key)) ||
    Object.keys(providers).length > 64
  ) {
    configurationError();
  }

  const parsed = new Map<string, ReadonlySet<CandidateTranslationCapability>>();
  for (const [providerKey, rawCapabilities] of Object.entries(providers)) {
    if (
      !providerKeyPattern.test(providerKey) ||
      !Array.isArray(rawCapabilities) ||
      rawCapabilities.length > candidateCapabilities.size
    ) {
      configurationError();
    }
    const capabilities = new Set<CandidateTranslationCapability>();
    for (const value of rawCapabilities) {
      if (typeof value !== "string" || !candidateCapabilities.has(value as never)) {
        configurationError();
      }
      capabilities.add(value as CandidateTranslationCapability);
    }
    if (capabilities.size !== rawCapabilities.length) configurationError();
    parsed.set(providerKey, capabilities);
  }
  return parsed;
}

export function currentTransportEvidence(
  connection: Pick<ProviderConnection, "integrationStyle" | "providerKey">,
): TransportExecutionEvidence {
  if (connection.integrationStyle === "openai_compatible") {
    return {
      executionAdapterVersion: EDGE_DIRECT_EXECUTION_ADAPTER_VERSION,
      translationVersion: OPENAI_COMPATIBLE_TRANSLATION_VERSION,
    };
  }
  if (connection.integrationStyle === "native_adapter" && connection.providerKey === "gemini") {
    return {
      executionAdapterVersion: EDGE_DIRECT_EXECUTION_ADAPTER_VERSION,
      translationVersion: GEMINI_NATIVE_TRANSLATION_VERSION,
    };
  }
  throw new GatewayError(
    "not_configured",
    503,
    "The selected provider has no reviewed transport evidence version.",
  );
}

export function assertTransportExecutionEvidence(
  evidence: TransportExecutionEvidence,
): TransportExecutionEvidence {
  if (
    !versionPattern.test(evidence.executionAdapterVersion) ||
    !versionPattern.test(evidence.translationVersion)
  ) {
    throw new GatewayError("internal_error", 500, "The route transport evidence is invalid.");
  }
  return evidence;
}

export function fixtureShadowFlag(
  rawConfiguration: string | undefined,
  providerKey: string,
  capability: CandidateTranslationCapability,
): FixtureShadowFlag {
  if (!rawConfiguration?.trim()) {
    return { enabled: false, reason: "configuration_absent", configurationVersion: null };
  }
  if (!providerKeyPattern.test(providerKey) || !candidateCapabilities.has(capability)) {
    configurationError();
  }
  const providers = parseFixtureShadowConfiguration(rawConfiguration);
  const capabilities = providers.get(providerKey);
  if (!capabilities) {
    return { enabled: false, reason: "provider_disabled", configurationVersion: 1 };
  }
  if (!capabilities.has(capability)) {
    return { enabled: false, reason: "capability_disabled", configurationVersion: 1 };
  }
  return { enabled: true, reason: "enabled", configurationVersion: 1 };
}

function stableToolCalls(result: FixtureComparableResult) {
  return JSON.stringify(
    (result.message.toolCalls ?? []).map((call) => ({
      id: call.id,
      type: call.type,
      name: call.function.name,
      arguments: call.function.arguments,
    })),
  );
}

function stableUsage(result: FixtureComparableResult) {
  return JSON.stringify({
    inputTokens: result.usage.inputTokens ?? null,
    outputTokens: result.usage.outputTokens ?? null,
    cachedInputTokens: result.usage.cachedInputTokens ?? null,
  });
}

/**
 * Compares already-materialized local fixture results. This function accepts
 * no URL, credential, fetch callback or billable cost and therefore cannot
 * dispatch shadow traffic. It returns shape/equality facts, never content.
 */
export function compareNonBillableFixtureShadow(input: {
  rawConfiguration?: string;
  billingClass: "non_billable_fixture";
  fixtureId: string;
  providerKey: string;
  capability: CandidateTranslationCapability;
  baseline: FixtureComparableResult;
  candidate: FixtureComparableResult;
}): FixtureShadowComparison {
  if (
    input.billingClass !== "non_billable_fixture" ||
    !fixtureIdPattern.test(input.fixtureId) ||
    "providerRequestId" in input.baseline ||
    "providerRequestId" in input.candidate
  ) {
    throw new GatewayError(
      "internal_error",
      500,
      "Fixture-shadow comparison requires local non-billable evidence.",
    );
  }
  const evidence = assertTransportExecutionEvidence({
    executionAdapterVersion: EDGE_DIRECT_EXECUTION_ADAPTER_VERSION,
    translationVersion: input.capability,
  });
  const flag = fixtureShadowFlag(input.rawConfiguration, input.providerKey, input.capability);
  const base = {
    fixtureId: input.fixtureId,
    providerKey: input.providerKey,
    capability: input.capability,
    executionAdapterVersion: evidence.executionAdapterVersion,
    translationVersion: input.capability,
  };
  if (!flag.enabled) {
    return { state: "skipped", reason: flag.reason, ...base };
  }

  const dimensions = {
    content: input.baseline.content === input.candidate.content,
    messageContent: input.baseline.message.content === input.candidate.message.content,
    finishReason: input.baseline.finishReason === input.candidate.finishReason,
    toolCalls: stableToolCalls(input.baseline) === stableToolCalls(input.candidate),
    usage: stableUsage(input.baseline) === stableUsage(input.candidate),
  };
  return {
    state: "compared",
    ...base,
    matched: Object.values(dimensions).every(Boolean),
    dimensions,
  };
}

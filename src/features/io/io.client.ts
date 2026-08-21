// Browser-facing I/O data access. Keep privileged work in Edge Functions or database RPCs.
import { supabase } from "@/integrations/supabase/client";

export type IoWorkspace = {
  id: string;
  name: string;
  slug: string;
  status: string;
};

export type IoCapacitySource = {
  id: string;
  displayName: string;
  operatorName: string;
  provenance: string;
  status: string;
  regionCode: string | null;
  country: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  grantKind: string;
  grantStatus: string;
  quotaAmount: number | null;
  quotaUnit: string | null;
};

export type IoAuditEvent = {
  id: number;
  eventType: string;
  occurredAt: string;
  payload: Record<string, unknown>;
};

export type IoRouteReceipt = {
  id: string;
  requestId: string;
  resultState: "completed" | "failed";
  routeStrategy: string;
  providerKey: string | null;
  modelKey: string | null;
  capacityMode: string | null;
  regionCode: string | null;
  residencyCountryCode: string | null;
  retentionClass: string | null;
  currencyCode: string | null;
  candidateCount: number;
  fallbackCount: number;
  estimatedCostNanos: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  createdAt: string;
  completedAt: string;
  attemptCount: number;
  failedAttemptCount: number;
};

export type PartnerRunResult = {
  requestId: string;
  receiptId: string;
  provider: string;
  model: string;
  modelSelection: IoRouteStrategy;
  content: string;
  usage: { inputTokens?: number; outputTokens?: number } | null;
  capacitySource: string;
  route: IoRouteDisclosure;
};

export type IoBudgetStatus = {
  budgetLimitId: string;
  currencyCode: string;
  hardLimitMinor: number;
  reservedMinor: number;
  spentMinor: number;
  remainingMinor: number;
  periodStart: string;
  periodEnd: string;
};

export type IoTerminalSession = {
  id: string;
  title: string;
  mode: "observe" | "plan" | "build" | "run";
  state: "running" | "completed" | "failed" | "stopped" | "archived";
  runtimeVersion: string | null;
  lastEventSequence: number;
  startedAt: string;
  completedAt: string | null;
};

export type IoTerminalEvent = {
  id: number;
  sequence: number;
  type:
    | "session.created"
    | "runtime.connected"
    | "runtime.disconnected"
    | "prompt.accepted"
    | "approval.requested"
    | "approval.approved"
    | "approval.rejected"
    | "approval.expired"
    | "session.completed"
    | "session.failed"
    | "session.stopped"
    | "session.archived";
  contentClassification: "metadata_only" | "redacted_summary";
  syncPolicy: "cloud_metadata" | "explicit_share";
  occurredAt: string;
};

export type IoRouteStrategy = "latest_affordable" | "lowest_cost" | "explicit_model";

export type IoRoutableModel = {
  modelId: string;
  providerKey: string;
  providerDisplayName: string;
  providerModelId: string;
  modelDisplayName: string;
  tier: "economy" | "balanced" | "premium";
  capacityMode: string;
  regionCode: string | null;
  residencyCountryCode: string | null;
  retentionClass: string;
  currencyCode: string;
  capabilityVersion: number;
  priceVersion: number;
};

export type IoRouteCatalog = {
  routeStrategies: IoRouteStrategy[];
  models: IoRoutableModel[];
};

export type IoRoutePreflight = {
  strategy: IoRouteStrategy;
  tier: "economy" | "balanced" | "premium";
  candidateCount: number;
  selected: {
    providerKey: string;
    providerDisplayName: string;
    modelId: string;
    modelDisplayName: string;
    providerModelId: string;
    endpointKey: string;
    capacityMode: string;
    regionCode: string | null;
    residencyCountryCode: string | null;
    retentionClass: string;
    healthState: "healthy" | "degraded" | "unknown";
    circuitState: "closed" | "half_open";
    capabilityVersion: number;
    priceVersion: number;
    currencyCode: string;
  };
  estimate: {
    providerCostNanos: number;
    serviceFeeNanos: number;
    customerChargeNanos: number;
    serviceFeeBasisPoints: number;
  };
  candidates: Array<{
    providerKey: string;
    modelId: string;
    endpointKey: string;
    estimatedCostNanos: number;
    currencyCode: string;
  }>;
};

export type IoRouteDisclosure = {
  providerKey: string;
  modelId: string;
  endpointKey: string;
  capacityMode: string;
  regionCode: string | null;
  residencyCountryCode: string | null;
  retentionClass: string;
  estimatedCostNanos: number;
  currencyCode: string;
  settledMinor: number;
  releasedMinor: number;
  providerCostNanos: number;
  serviceFeeNanos: number;
  customerChargeNanos: number;
  serviceFeeBasisPoints: number;
  costBasis: "provider_usage" | "route_estimate_missing_usage";
  fallbackCount: number;
};

export type IoApiKeyMetadata = {
  id: string;
  name: string;
  keyPrefix: string;
  lastFour: string;
  scopes: string[];
  status: "active" | "revoked" | "expired";
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  limitPolicyVersion: number;
  requestsPerMinute: number;
  requestsPerDay: number;
  requestsPerMonth: number;
  spendCurrencyCode: string;
  spendPerDayNanos: number;
  spendPerMonthNanos: number;
};

export type IoCreatedApiKey = IoApiKeyMetadata & { rawKey: string };

export type IoWorkspaceProviderPolicy = {
  workspaceId: string;
  allowChinaHosted: boolean;
  allowTrainingPossible: boolean;
  acknowledgedAt: string | null;
  updatedAt: string | null;
};

type UnknownRecord = Record<string, unknown>;

const routeStrategies: ReadonlySet<IoRouteStrategy> = new Set([
  "latest_affordable",
  "lowest_cost",
  "explicit_model",
]);

function asRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function readString(value: UnknownRecord, key: string): string | null {
  const candidate = value[key];
  return typeof candidate === "string" && candidate.trim() ? candidate : null;
}

function readNullableString(value: UnknownRecord, key: string): string | null {
  return value[key] === null ? null : readString(value, key);
}

function readNonNegativeInteger(value: UnknownRecord, key: string): number | null {
  const candidate = value[key];
  return typeof candidate === "number" && Number.isSafeInteger(candidate) && candidate >= 0
    ? candidate
    : null;
}

function readNonNegativeIntegerString(value: UnknownRecord, key: string): number | null {
  const candidate = value[key];
  if (typeof candidate !== "string" || !/^\d+$/.test(candidate)) return null;
  const parsed = Number(candidate);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function responseError(value: unknown, fallback: string) {
  const response = asRecord(value);
  return response ? (readString(response, "error") ?? fallback) : fallback;
}

function parseRouteStrategy(value: unknown): IoRouteStrategy | null {
  return typeof value === "string" && routeStrategies.has(value as IoRouteStrategy)
    ? (value as IoRouteStrategy)
    : null;
}

function parseRoutableModel(value: unknown): IoRoutableModel | null {
  const model = asRecord(value);
  if (!model) return null;

  const tier = readString(model, "tier");
  if (tier !== "economy" && tier !== "balanced" && tier !== "premium") return null;

  const required = [
    "modelId",
    "providerKey",
    "providerDisplayName",
    "providerModelId",
    "modelDisplayName",
    "capacityMode",
    "retentionClass",
    "currencyCode",
  ].map((key) => readString(model, key));
  const capabilityVersion = readNonNegativeInteger(model, "capabilityVersion");
  const priceVersion = readNonNegativeInteger(model, "priceVersion");
  if (required.some((item) => !item) || capabilityVersion === null || priceVersion === null)
    return null;

  const regionCode = readNullableString(model, "regionCode");
  const residencyCountryCode = readNullableString(model, "residencyCountryCode");
  if (regionCode === null && model.regionCode !== null) return null;
  if (residencyCountryCode === null && model.residencyCountryCode !== null) return null;

  return {
    modelId: required[0]!,
    providerKey: required[1]!,
    providerDisplayName: required[2]!,
    providerModelId: required[3]!,
    modelDisplayName: required[4]!,
    tier,
    capacityMode: required[5]!,
    regionCode,
    residencyCountryCode,
    retentionClass: required[6]!,
    currencyCode: required[7]!,
    capabilityVersion,
    priceVersion,
  };
}

function parseRouteDisclosure(value: unknown): IoRouteDisclosure | null {
  const route = asRecord(value);
  if (!route) return null;
  const required = [
    "providerKey",
    "modelId",
    "endpointKey",
    "capacityMode",
    "retentionClass",
    "currencyCode",
  ].map((key) => readString(route, key));
  const estimatedCostNanos = readNonNegativeInteger(route, "estimatedCostNanos");
  const fallbackCount = readNonNegativeInteger(route, "fallbackCount");
  const settledMinor = readNonNegativeInteger(route, "settledMinor");
  const releasedMinor = readNonNegativeInteger(route, "releasedMinor");
  const providerCostNanos = readNonNegativeInteger(route, "providerCostNanos");
  const serviceFeeNanos = readNonNegativeInteger(route, "serviceFeeNanos");
  const customerChargeNanos = readNonNegativeInteger(route, "customerChargeNanos");
  const serviceFeeBasisPoints = readNonNegativeInteger(route, "serviceFeeBasisPoints");
  const costBasis = readString(route, "costBasis");
  const regionCode = readNullableString(route, "regionCode");
  const residencyCountryCode = readNullableString(route, "residencyCountryCode");
  if (
    required.some((item) => !item) ||
    estimatedCostNanos === null ||
    fallbackCount === null ||
    settledMinor === null ||
    releasedMinor === null ||
    providerCostNanos === null ||
    serviceFeeNanos === null ||
    customerChargeNanos === null ||
    serviceFeeBasisPoints === null ||
    serviceFeeBasisPoints > 10_000 ||
    customerChargeNanos !== providerCostNanos + serviceFeeNanos ||
    (costBasis !== "provider_usage" && costBasis !== "route_estimate_missing_usage") ||
    (regionCode === null && route.regionCode !== null) ||
    (residencyCountryCode === null && route.residencyCountryCode !== null)
  ) {
    return null;
  }
  return {
    providerKey: required[0]!,
    modelId: required[1]!,
    endpointKey: required[2]!,
    capacityMode: required[3]!,
    regionCode,
    residencyCountryCode,
    retentionClass: required[4]!,
    currencyCode: required[5]!,
    estimatedCostNanos,
    settledMinor,
    releasedMinor,
    providerCostNanos,
    serviceFeeNanos,
    customerChargeNanos,
    serviceFeeBasisPoints,
    costBasis,
    fallbackCount,
  };
}

function parsePartnerRunResult(value: unknown): PartnerRunResult {
  const response = asRecord(value);
  if (!response || response.ok !== true) {
    throw new Error(responseError(value, "The partner route could not run."));
  }

  const required = ["requestId", "receiptId", "provider", "model", "content", "capacitySource"].map(
    (key) => readString(response, key),
  );
  const modelSelection = parseRouteStrategy(response.modelSelection);
  const route = parseRouteDisclosure(response.route);
  if (required.some((item) => !item) || !modelSelection || !route) {
    throw new Error("The I/O gateway returned an incomplete route receipt.");
  }

  const usageRecord = response.usage === null ? null : asRecord(response.usage);
  const inputTokens = usageRecord
    ? (readNonNegativeInteger(usageRecord, "inputTokens") ?? undefined)
    : undefined;
  const outputTokens = usageRecord
    ? (readNonNegativeInteger(usageRecord, "outputTokens") ?? undefined)
    : undefined;
  if (response.usage !== null && !usageRecord) {
    throw new Error("The I/O gateway returned an invalid usage receipt.");
  }

  return {
    requestId: required[0]!,
    receiptId: required[1]!,
    provider: required[2]!,
    model: required[3]!,
    modelSelection,
    content: required[4]!,
    usage: usageRecord ? { inputTokens, outputTokens } : null,
    capacitySource: required[5]!,
    route,
  };
}

function parseRouteCatalog(value: unknown): IoRouteCatalog {
  const response = asRecord(value);
  if (!response || response.ok !== true) {
    throw new Error(responseError(value, "The provider catalogue could not load."));
  }
  const rawStrategies = Array.isArray(response.routeStrategies) ? response.routeStrategies : [];
  const parsedStrategies = rawStrategies
    .map(parseRouteStrategy)
    .filter((strategy): strategy is IoRouteStrategy => strategy !== null);
  const rawModels = Array.isArray(response.models) ? response.models : [];
  const models = rawModels
    .map(parseRoutableModel)
    .filter((model): model is IoRoutableModel => model !== null);

  return {
    routeStrategies: [...new Set(parsedStrategies)],
    models: [...new Map(models.map((model) => [model.modelId, model])).values()],
  };
}

function parseRoutePreflight(value: unknown): IoRoutePreflight {
  const response = asRecord(value);
  const selected = response ? asRecord(response.selected) : null;
  const estimate = response ? asRecord(response.estimate) : null;
  const strategy = response ? parseRouteStrategy(response.strategy) : null;
  const tier = response ? readString(response, "tier") : null;
  const candidateCount = response ? readNonNegativeInteger(response, "candidateCount") : null;
  if (
    !response ||
    response.ok !== true ||
    !selected ||
    !estimate ||
    !strategy ||
    (tier !== "economy" && tier !== "balanced" && tier !== "premium") ||
    candidateCount === null ||
    candidateCount < 1
  ) {
    throw new Error(responseError(value, "The route preflight could not complete."));
  }

  const requiredSelected = [
    "providerKey",
    "providerDisplayName",
    "modelId",
    "modelDisplayName",
    "providerModelId",
    "endpointKey",
    "capacityMode",
    "retentionClass",
    "healthState",
    "circuitState",
    "currencyCode",
  ].map((key) => readString(selected, key));
  const capabilityVersion = readNonNegativeInteger(selected, "capabilityVersion");
  const priceVersion = readNonNegativeInteger(selected, "priceVersion");
  const regionCode = readNullableString(selected, "regionCode");
  const residencyCountryCode = readNullableString(selected, "residencyCountryCode");
  const providerCostNanos = readNonNegativeInteger(estimate, "providerCostNanos");
  const serviceFeeNanos = readNonNegativeInteger(estimate, "serviceFeeNanos");
  const customerChargeNanos = readNonNegativeInteger(estimate, "customerChargeNanos");
  const serviceFeeBasisPoints = readNonNegativeInteger(estimate, "serviceFeeBasisPoints");
  const healthState = requiredSelected[8];
  const circuitState = requiredSelected[9];
  if (
    requiredSelected.some((item) => !item) ||
    capabilityVersion === null ||
    capabilityVersion < 1 ||
    priceVersion === null ||
    priceVersion < 1 ||
    (regionCode === null && selected.regionCode !== null) ||
    (residencyCountryCode === null && selected.residencyCountryCode !== null) ||
    (healthState !== "healthy" && healthState !== "degraded" && healthState !== "unknown") ||
    (circuitState !== "closed" && circuitState !== "half_open") ||
    providerCostNanos === null ||
    serviceFeeNanos === null ||
    customerChargeNanos === null ||
    customerChargeNanos !== providerCostNanos + serviceFeeNanos ||
    serviceFeeBasisPoints === null ||
    serviceFeeBasisPoints > 10_000
  ) {
    throw new Error("The I/O gateway returned an invalid preflight contract.");
  }

  const rawCandidates = Array.isArray(response.candidates) ? response.candidates : [];
  const candidates = rawCandidates.flatMap((value) => {
    const candidate = asRecord(value);
    if (!candidate) return [];
    const providerKey = readString(candidate, "providerKey");
    const modelId = readString(candidate, "modelId");
    const endpointKey = readString(candidate, "endpointKey");
    const estimatedCostNanos = readNonNegativeInteger(candidate, "estimatedCostNanos");
    const currencyCode = readString(candidate, "currencyCode");
    return providerKey && modelId && endpointKey && estimatedCostNanos !== null && currencyCode
      ? [{ providerKey, modelId, endpointKey, estimatedCostNanos, currencyCode }]
      : [];
  });
  if (candidates.length !== candidateCount) {
    throw new Error("The I/O gateway returned incomplete candidate evidence.");
  }

  return {
    strategy,
    tier,
    candidateCount,
    selected: {
      providerKey: requiredSelected[0]!,
      providerDisplayName: requiredSelected[1]!,
      modelId: requiredSelected[2]!,
      modelDisplayName: requiredSelected[3]!,
      providerModelId: requiredSelected[4]!,
      endpointKey: requiredSelected[5]!,
      capacityMode: requiredSelected[6]!,
      regionCode,
      residencyCountryCode,
      retentionClass: requiredSelected[7]!,
      healthState,
      circuitState,
      capabilityVersion,
      priceVersion,
      currencyCode: requiredSelected[10]!,
    },
    estimate: {
      providerCostNanos,
      serviceFeeNanos,
      customerChargeNanos,
      serviceFeeBasisPoints,
    },
    candidates,
  };
}

export async function getMyIoWorkspaces(): Promise<IoWorkspace[]> {
  const { data, error } = await supabase
    .from("io_workspaces")
    .select("id, name, slug, status")
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((workspace) => ({
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    status: workspace.status,
  }));
}

export async function createMyIoWorkspace(): Promise<IoWorkspace> {
  const { data: workspace, error } = await supabase.rpc("create_my_io_workspace");
  if (error) throw new Error(error.message);
  if (!workspace) throw new Error("I/O workspace creation returned no workspace.");

  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    status: workspace.status,
  };
}

export async function getIoCapacitySources(workspaceId: string): Promise<IoCapacitySource[]> {
  const { data, error } = await supabase
    .from("io_workspace_capacity_grants")
    .select(
      "grant_kind, status, quota_amount, quota_unit, io_capacity_sources(id, display_name, operator_name, provenance, status, region_code, data_residency_country, public_notes, public_capacity_metadata)",
    )
    .eq("workspace_id", workspaceId)
    .in("status", ["pending", "active", "exhausted"])
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).flatMap((grant) => {
    const source = grant.io_capacity_sources;
    if (!source || Array.isArray(source)) return [];
    return [
      {
        id: source.id,
        displayName: source.display_name,
        operatorName: source.operator_name,
        provenance: source.provenance,
        status: source.status,
        regionCode: source.region_code,
        country: source.data_residency_country,
        notes: source.public_notes,
        metadata:
          source.public_capacity_metadata &&
          typeof source.public_capacity_metadata === "object" &&
          !Array.isArray(source.public_capacity_metadata)
            ? source.public_capacity_metadata
            : {},
        grantKind: grant.grant_kind,
        grantStatus: grant.status,
        quotaAmount: grant.quota_amount,
        quotaUnit: grant.quota_unit,
      },
    ];
  });
}

export async function listMyIoApiKeys(workspaceId: string): Promise<IoApiKeyMetadata[]> {
  const { data, error } = await supabase
    .from("io_api_key_metadata")
    .select(
      "id, name, key_prefix, last_four, scopes, status, expires_at, last_used_at, created_at, limit_policy_version, requests_per_minute, requests_per_day, requests_per_month, spend_currency_code, spend_per_day_nanos, spend_per_month_nanos",
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).flatMap((value) => {
    if (
      !value.id ||
      !value.name ||
      !value.key_prefix ||
      !value.last_four ||
      !value.scopes ||
      !value.created_at ||
      !value.limit_policy_version ||
      !value.requests_per_minute ||
      !value.requests_per_day ||
      !value.requests_per_month ||
      !value.spend_currency_code ||
      value.spend_per_day_nanos === null ||
      value.spend_per_month_nanos === null ||
      !["active", "revoked", "expired"].includes(value.status ?? "")
    ) {
      return [];
    }
    return [
      {
        id: value.id,
        name: value.name,
        keyPrefix: value.key_prefix,
        lastFour: value.last_four,
        scopes: value.scopes,
        status: value.status as IoApiKeyMetadata["status"],
        expiresAt: value.expires_at,
        lastUsedAt: value.last_used_at,
        createdAt: value.created_at,
        limitPolicyVersion: value.limit_policy_version,
        requestsPerMinute: value.requests_per_minute,
        requestsPerDay: value.requests_per_day,
        requestsPerMonth: value.requests_per_month,
        spendCurrencyCode: value.spend_currency_code,
        spendPerDayNanos: value.spend_per_day_nanos,
        spendPerMonthNanos: value.spend_per_month_nanos,
      },
    ];
  });
}

export async function createMyIoTestApiKey(
  workspaceId: string,
  name: string,
): Promise<IoCreatedApiKey> {
  const { data, error } = await supabase.rpc("create_my_io_test_api_key", {
    _workspace_id: workspaceId,
    _name: name,
  });
  if (error) throw new Error(error.message);
  const key = asRecord(data);
  if (!key) throw new Error("API key creation returned no key.");
  const id = readString(key, "id");
  const keyName = readString(key, "name");
  const keyPrefix = readString(key, "keyPrefix");
  const lastFour = readString(key, "lastFour");
  const status = readString(key, "status");
  const expiresAt = readString(key, "expiresAt");
  const createdAt = readString(key, "createdAt");
  const rawKey = readString(key, "rawKey");
  const limitPolicyVersion = readNonNegativeInteger(key, "limitPolicyVersion");
  const requestsPerMinute = readNonNegativeInteger(key, "requestsPerMinute");
  const requestsPerDay = readNonNegativeInteger(key, "requestsPerDay");
  const requestsPerMonth = readNonNegativeInteger(key, "requestsPerMonth");
  const spendCurrencyCode = readString(key, "spendCurrencyCode");
  const spendPerDayNanos = readNonNegativeIntegerString(key, "spendPerDayNanos");
  const spendPerMonthNanos = readNonNegativeIntegerString(key, "spendPerMonthNanos");
  const scopes = Array.isArray(key.scopes)
    ? key.scopes.filter((scope): scope is string => typeof scope === "string")
    : [];
  if (
    !id ||
    !keyName ||
    !keyPrefix ||
    !lastFour ||
    status !== "active" ||
    !expiresAt ||
    !createdAt ||
    !rawKey ||
    limitPolicyVersion === null ||
    limitPolicyVersion < 1 ||
    requestsPerMinute === null ||
    requestsPerDay === null ||
    requestsPerMonth === null ||
    !spendCurrencyCode ||
    spendPerDayNanos === null ||
    spendPerMonthNanos === null ||
    scopes.length === 0
  ) {
    throw new Error("API key creation returned an invalid result.");
  }
  return {
    id,
    name: keyName,
    keyPrefix,
    lastFour,
    scopes,
    status,
    expiresAt,
    lastUsedAt: null,
    createdAt,
    rawKey,
    limitPolicyVersion,
    requestsPerMinute,
    requestsPerDay,
    requestsPerMonth,
    spendCurrencyCode,
    spendPerDayNanos,
    spendPerMonthNanos,
  };
}

function parseWorkspaceProviderPolicy(value: unknown): IoWorkspaceProviderPolicy {
  const policy = asRecord(value);
  const workspaceId = policy ? readString(policy, "workspaceId") : null;
  if (!policy || !workspaceId) throw new Error("The workspace provider policy is invalid.");
  return {
    workspaceId,
    allowChinaHosted: policy.allowChinaHosted === true,
    allowTrainingPossible: policy.allowTrainingPossible === true,
    acknowledgedAt: readNullableString(policy, "acknowledgedAt"),
    updatedAt: readNullableString(policy, "updatedAt"),
  };
}

export async function getMyIoWorkspaceProviderPolicy(
  workspaceId: string,
): Promise<IoWorkspaceProviderPolicy> {
  const { data, error } = await supabase.rpc("get_my_io_workspace_provider_policy", {
    _workspace_id: workspaceId,
  });
  if (error) throw new Error(error.message);
  return parseWorkspaceProviderPolicy(data);
}

export async function setMyIoWorkspaceProviderPolicy(
  workspaceId: string,
  allowChinaHosted: boolean,
): Promise<IoWorkspaceProviderPolicy> {
  const { data, error } = await supabase.rpc("set_my_io_workspace_provider_policy", {
    _workspace_id: workspaceId,
    _allow_china_hosted: allowChinaHosted,
    _allow_training_possible: allowChinaHosted,
  });
  if (error) throw new Error(error.message);
  return parseWorkspaceProviderPolicy(data);
}

export async function revokeMyIoApiKey(keyId: string) {
  const { data, error } = await supabase.rpc("revoke_my_io_api_key", { _key_id: keyId });
  if (error) throw new Error(error.message);
  const result = asRecord(data);
  if (!result || readString(result, "id") !== keyId || readString(result, "status") !== "revoked") {
    throw new Error("API key revocation returned an invalid result.");
  }
}

export async function getIoAuditEvents(workspaceId: string): Promise<IoAuditEvent[]> {
  const { data, error } = await supabase
    .from("io_audit_events")
    .select("id, event_type, occurred_at, payload")
    .eq("workspace_id", workspaceId)
    .order("occurred_at", { ascending: false })
    .limit(8);

  if (error) throw new Error(error.message);

  return (data ?? []).map((event) => ({
    id: event.id,
    eventType: event.event_type,
    occurredAt: event.occurred_at,
    payload:
      event.payload && typeof event.payload === "object" && !Array.isArray(event.payload)
        ? event.payload
        : {},
  }));
}

export async function getIoRouteReceipts(workspaceId: string): Promise<IoRouteReceipt[]> {
  const { data, error } = await supabase
    .from("io_route_receipts")
    .select(
      "id, request_id, result_state, route_strategy, selected_provider_key, selected_model_key, selected_capacity_mode, selected_region_code, selected_residency_country_code, selected_retention_class, selected_currency_code, candidate_count, fallback_count, estimated_cost_nanos, input_tokens, output_tokens, created_at, completed_at, io_provider_attempts(attempt_state)",
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(12);

  if (error) throw new Error(error.message);

  return (data ?? []).flatMap((receipt) => {
    if (receipt.result_state !== "completed" && receipt.result_state !== "failed") return [];
    const attempts = receipt.io_provider_attempts ?? [];
    return [
      {
        id: receipt.id,
        requestId: receipt.request_id,
        resultState: receipt.result_state,
        routeStrategy: receipt.route_strategy,
        providerKey: receipt.selected_provider_key,
        modelKey: receipt.selected_model_key,
        capacityMode: receipt.selected_capacity_mode,
        regionCode: receipt.selected_region_code,
        residencyCountryCode: receipt.selected_residency_country_code,
        retentionClass: receipt.selected_retention_class,
        currencyCode: receipt.selected_currency_code,
        candidateCount: receipt.candidate_count,
        fallbackCount: receipt.fallback_count,
        estimatedCostNanos: receipt.estimated_cost_nanos,
        inputTokens: receipt.input_tokens,
        outputTokens: receipt.output_tokens,
        createdAt: receipt.created_at,
        completedAt: receipt.completed_at,
        attemptCount: attempts.length,
        failedAttemptCount: attempts.filter((attempt) => attempt.attempt_state === "failed").length,
      },
    ];
  });
}

export async function runPartnerRoute(input: {
  workspaceId: string;
  prompt: string;
  mode: "observe" | "plan" | "build" | "run";
  routeStrategy: IoRouteStrategy;
  requestedModelId?: string;
  idempotencyKey?: string;
}): Promise<PartnerRunResult> {
  const { data, error } = await supabase.functions.invoke("io-gateway", {
    body: {
      action: "partner_chat",
      workspace_id: input.workspaceId,
      idempotency_key: input.idempotencyKey ?? crypto.randomUUID(),
      mode: input.mode,
      messages: [{ role: "user", content: input.prompt }],
      route_strategy: input.routeStrategy,
      ...(input.routeStrategy === "explicit_model"
        ? { requested_model_id: input.requestedModelId }
        : {}),
    },
  });

  if (error) throw new Error(error.message);
  return parsePartnerRunResult(data);
}

export async function preflightPartnerRoute(input: {
  workspaceId: string;
  prompt: string;
  mode: "observe" | "plan" | "build" | "run";
  routeStrategy: IoRouteStrategy;
  requestedModelId?: string;
}): Promise<IoRoutePreflight> {
  const { data, error } = await supabase.functions.invoke("io-gateway", {
    body: {
      action: "preflight",
      workspace_id: input.workspaceId,
      mode: input.mode,
      messages: [{ role: "user", content: input.prompt }],
      route_strategy: input.routeStrategy,
      ...(input.routeStrategy === "explicit_model"
        ? { requested_model_id: input.requestedModelId }
        : {}),
    },
  });
  if (error) throw new Error(error.message);
  return parseRoutePreflight(data);
}

export async function getMyIoBudgetStatus(workspaceId: string): Promise<IoBudgetStatus[]> {
  const { data, error } = await supabase.rpc("get_my_io_budget_status", {
    _workspace_id: workspaceId,
  });
  if (error) throw new Error(error.message);
  if (!Array.isArray(data)) throw new Error("The I/O budget projection is invalid.");

  return data.flatMap((value) => {
    const budget = asRecord(value);
    if (!budget) return [];
    const budgetLimitId = readString(budget, "budgetLimitId");
    const currencyCode = readString(budget, "currencyCode");
    const periodStart = readString(budget, "periodStart");
    const periodEnd = readString(budget, "periodEnd");
    const hardLimitMinor = readNonNegativeIntegerString(budget, "hardLimitMinor");
    const reservedMinor = readNonNegativeIntegerString(budget, "reservedMinor");
    const spentMinor = readNonNegativeIntegerString(budget, "spentMinor");
    const remainingMinor = readNonNegativeIntegerString(budget, "remainingMinor");
    if (
      !budgetLimitId ||
      !currencyCode ||
      !periodStart ||
      !periodEnd ||
      hardLimitMinor === null ||
      reservedMinor === null ||
      spentMinor === null ||
      remainingMinor === null
    ) {
      return [];
    }
    return [
      {
        budgetLimitId,
        currencyCode,
        hardLimitMinor,
        reservedMinor,
        spentMinor,
        remainingMinor,
        periodStart,
        periodEnd,
      },
    ];
  });
}

function parseTerminalSession(value: unknown, idKey = "id"): IoTerminalSession | null {
  const session = asRecord(value);
  if (!session) return null;
  const id = readString(session, idKey);
  const title = readString(session, "title");
  const mode = readString(session, "mode");
  const state = readString(session, "state");
  const startedAt = readString(session, "started_at");
  const lastEventSequence = readNonNegativeInteger(session, "last_event_sequence");
  if (
    !id ||
    !title ||
    !startedAt ||
    !["observe", "plan", "build", "run"].includes(mode ?? "") ||
    !["running", "completed", "failed", "stopped", "archived"].includes(state ?? "") ||
    lastEventSequence === null
  ) {
    return null;
  }
  return {
    id,
    title,
    mode: mode as IoTerminalSession["mode"],
    state: state as IoTerminalSession["state"],
    runtimeVersion: readNullableString(session, "runtime_version"),
    lastEventSequence,
    startedAt,
    completedAt: readNullableString(session, "completed_at"),
  };
}

const terminalEventTypes: ReadonlySet<IoTerminalEvent["type"]> = new Set([
  "session.created",
  "runtime.connected",
  "runtime.disconnected",
  "prompt.accepted",
  "approval.requested",
  "approval.approved",
  "approval.rejected",
  "approval.expired",
  "session.completed",
  "session.failed",
  "session.stopped",
  "session.archived",
]);

function parseTerminalEvent(value: unknown): IoTerminalEvent | null {
  const event = asRecord(value);
  if (!event) return null;
  const id = readNonNegativeInteger(event, "event_id");
  const sequence = readNonNegativeInteger(event, "sequence");
  const type = readString(event, "event_type");
  const contentClassification = readString(event, "content_classification");
  const syncPolicy = readString(event, "sync_policy");
  const occurredAt = readString(event, "occurred_at");
  if (
    id === null ||
    sequence === null ||
    sequence < 1 ||
    !type ||
    !terminalEventTypes.has(type as IoTerminalEvent["type"]) ||
    (contentClassification !== "metadata_only" && contentClassification !== "redacted_summary") ||
    (syncPolicy !== "cloud_metadata" && syncPolicy !== "explicit_share") ||
    !occurredAt
  ) {
    return null;
  }
  return {
    id,
    sequence,
    type: type as IoTerminalEvent["type"],
    contentClassification,
    syncPolicy,
    occurredAt,
  };
}

export async function createMyIoTerminalSession(input: {
  workspaceId: string;
  title: string;
  mode: IoTerminalSession["mode"];
  connectorOrigin: string;
  runtimeReference: string;
  runtimeVersion: string | null;
}): Promise<IoTerminalSession> {
  const { data, error } = await supabase.rpc("create_my_io_terminal_session", {
    _workspace_id: input.workspaceId,
    _title: input.title,
    _mode: input.mode,
    _connector_origin: input.connectorOrigin,
    _runtime_reference: input.runtimeReference,
    _runtime_version: input.runtimeVersion ?? undefined,
  });
  if (error) throw new Error(error.message);
  const session = parseTerminalSession(data);
  if (!session) throw new Error("The terminal session record is invalid.");
  return session;
}

export async function completeMyIoTerminalSession(
  sessionId: string,
  state: "completed" | "failed" | "stopped",
): Promise<IoTerminalSession> {
  const { data, error } = await supabase.rpc("complete_my_io_terminal_session", {
    _session_id: sessionId,
    _state: state,
  });
  if (error) throw new Error(error.message);
  const session = parseTerminalSession(data);
  if (!session) throw new Error("The terminal session completion record is invalid.");
  return session;
}

export async function appendMyIoTerminalEvent(input: {
  sessionId: string;
  type: "runtime.connected" | "runtime.disconnected" | "prompt.accepted";
  eventKey?: string;
  payload?: { runtimeVersionKnown: boolean } | { reasonCode: string } | Record<string, never>;
}) {
  const { data, error } = await supabase.rpc("append_my_io_terminal_event", {
    _session_id: input.sessionId,
    _event_type: input.type,
    _event_key: input.eventKey ?? crypto.randomUUID(),
    _payload: input.payload ?? {},
  });
  if (error) throw new Error(error.message);
  const event = Array.isArray(data) ? data[0] : data;
  const record = asRecord(event);
  const sequence = record ? readNonNegativeInteger(record, "sequence") : null;
  const eventType = record ? readString(record, "event_type") : null;
  if (sequence === null || sequence < 1 || eventType !== input.type) {
    throw new Error("The terminal event record is invalid.");
  }
  return { sequence, replayed: record?.replayed === true };
}

export async function listMyIoTerminalEvents(sessionId: string): Promise<IoTerminalEvent[]> {
  const { data, error } = await supabase.rpc("list_my_io_terminal_events", {
    _session_id: sessionId,
  });
  if (error) throw new Error(error.message);
  return (data ?? []).flatMap((value) => {
    const parsed = parseTerminalEvent(value);
    return parsed ? [parsed] : [];
  });
}

export async function listMyIoTerminalSessions(workspaceId: string): Promise<IoTerminalSession[]> {
  const { data, error } = await supabase.rpc("list_my_io_terminal_sessions", {
    _workspace_id: workspaceId,
  });
  if (error) throw new Error(error.message);
  return (data ?? []).flatMap((value) => {
    const parsed = parseTerminalSession(value, "session_id");
    return parsed ? [parsed] : [];
  });
}

export async function getIoRouteCatalog(workspaceId: string): Promise<IoRouteCatalog> {
  const { data, error } = await supabase.functions.invoke("io-gateway", {
    body: { action: "catalog", workspace_id: workspaceId },
  });

  if (error) throw new Error(error.message);
  return parseRouteCatalog(data);
}

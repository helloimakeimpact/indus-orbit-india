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
  providerCostNanos: string | null;
  serviceFeeNanos: string | null;
  customerChargeNanos: string | null;
  creditAppliedNanos: string;
  amountDueNanos: string;
  serviceFeeBasisPoints: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  createdAt: string;
  completedAt: string;
  attemptCount: number;
  failedAttemptCount: number;
};

export type IoUsageHistoryCursor = { createdAt: string; id: string };

export type IoUsageHistoryPage = {
  items: IoRouteReceipt[];
  hasMore: boolean;
  nextCursor: IoUsageHistoryCursor | null;
};

export type IoCreditBalance = {
  accountId: string;
  currencyCode: string;
  status: "active" | "frozen" | "closed";
  balanceNanos: string;
};

export type IoUnbilledSummary = {
  currencyCode: string;
  customerChargeNanos: string;
  creditAppliedNanos: string;
  amountDueNanos: string;
  usageCount: number;
};

export type IoBillingSummary = {
  credits: IoCreditBalance[];
  unbilled: IoUnbilledSummary[];
  invoiceCounts: { draft: number; issued: number; paid: number };
};

export type IoCreditEntry = {
  id: string;
  currencyCode: string;
  kind: string;
  amountNanos: string;
  reason: string;
  postedAt: string;
};

export type IoInvoice = {
  id: string;
  invoiceNumber: string;
  currencyCode: string;
  periodStart: string;
  periodEnd: string;
  state: "draft" | "issued" | "paid" | "void";
  providerCostNanos: string;
  serviceFeeNanos: string;
  subtotalNanos: string;
  creditAppliedNanos: string;
  taxNanos: string;
  totalNanos: string;
  amountDueNanos: string;
  taxStatus: "not_assessed" | "not_applicable" | "assessed";
  createdAt: string;
  issuedAt: string | null;
  dueAt: string | null;
  lineCount: number;
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

export type IoTerminalApproval = {
  requestId: string;
  state: "pending" | "approved" | "rejected" | "expired";
  expiresAt: string | null;
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

function readExactIntegerString(
  value: UnknownRecord,
  key: string,
  options: { nullable?: boolean; signed?: boolean } = {},
): string | null {
  const candidate = value[key];
  if (candidate === null && options.nullable) return null;
  if (typeof candidate !== "string") return null;
  const pattern = options.signed ? /^-?\d+$/ : /^\d+$/;
  return pattern.test(candidate) ? candidate : null;
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

function parseUsageReceipt(value: unknown): IoRouteReceipt | null {
  const receipt = asRecord(value);
  if (!receipt) return null;
  const resultState = readString(receipt, "resultState");
  const id = readString(receipt, "id");
  const requestId = readString(receipt, "requestId");
  const routeStrategy = readString(receipt, "routeStrategy");
  const createdAt = readString(receipt, "createdAt");
  const completedAt = readString(receipt, "completedAt");
  const candidateCount = readNonNegativeInteger(receipt, "candidateCount");
  const fallbackCount = readNonNegativeInteger(receipt, "fallbackCount");
  const attemptCount = readNonNegativeInteger(receipt, "attemptCount");
  const failedAttemptCount = readNonNegativeInteger(receipt, "failedAttemptCount");
  const creditAppliedNanos = readExactIntegerString(receipt, "creditAppliedNanos");
  const amountDueNanos = readExactIntegerString(receipt, "amountDueNanos");
  if (
    !id ||
    !requestId ||
    (resultState !== "completed" && resultState !== "failed") ||
    !routeStrategy ||
    !createdAt ||
    !completedAt ||
    candidateCount === null ||
    fallbackCount === null ||
    attemptCount === null ||
    failedAttemptCount === null ||
    creditAppliedNanos === null ||
    amountDueNanos === null
  ) {
    return null;
  }
  const estimatedCostNanos = receipt.estimatedCostNanos;
  const inputTokens = receipt.inputTokens;
  const outputTokens = receipt.outputTokens;
  const serviceFeeBasisPoints = receipt.serviceFeeBasisPoints;
  return {
    id,
    requestId,
    resultState,
    routeStrategy,
    providerKey: readNullableString(receipt, "providerKey"),
    modelKey: readNullableString(receipt, "modelKey"),
    capacityMode: readNullableString(receipt, "capacityMode"),
    regionCode: readNullableString(receipt, "regionCode"),
    residencyCountryCode: readNullableString(receipt, "residencyCountryCode"),
    retentionClass: readNullableString(receipt, "retentionClass"),
    currencyCode: readNullableString(receipt, "currencyCode"),
    candidateCount,
    fallbackCount,
    estimatedCostNanos:
      estimatedCostNanos === null
        ? null
        : typeof estimatedCostNanos === "number" &&
            Number.isSafeInteger(estimatedCostNanos) &&
            estimatedCostNanos >= 0
          ? estimatedCostNanos
          : null,
    providerCostNanos: readExactIntegerString(receipt, "providerCostNanos", { nullable: true }),
    serviceFeeNanos: readExactIntegerString(receipt, "serviceFeeNanos", { nullable: true }),
    customerChargeNanos: readExactIntegerString(receipt, "customerChargeNanos", {
      nullable: true,
    }),
    creditAppliedNanos,
    amountDueNanos,
    serviceFeeBasisPoints:
      serviceFeeBasisPoints === null
        ? null
        : typeof serviceFeeBasisPoints === "number" &&
            Number.isInteger(serviceFeeBasisPoints) &&
            serviceFeeBasisPoints >= 0
          ? serviceFeeBasisPoints
          : null,
    inputTokens:
      inputTokens === null
        ? null
        : typeof inputTokens === "number" && Number.isInteger(inputTokens) && inputTokens >= 0
          ? inputTokens
          : null,
    outputTokens:
      outputTokens === null
        ? null
        : typeof outputTokens === "number" && Number.isInteger(outputTokens) && outputTokens >= 0
          ? outputTokens
          : null,
    createdAt,
    completedAt,
    attemptCount,
    failedAttemptCount,
  };
}

export async function listMyIoUsageHistory(input: {
  workspaceId: string;
  limit?: number;
  cursor?: IoUsageHistoryCursor | null;
  resultState?: "completed" | "failed" | null;
  providerKey?: string | null;
  modelKey?: string | null;
  from?: string | null;
  to?: string | null;
}): Promise<IoUsageHistoryPage> {
  const { data, error } = await supabase.rpc("list_my_io_usage_history", {
    _workspace_id: input.workspaceId,
    _limit: input.limit ?? 25,
    _before_created_at: input.cursor?.createdAt,
    _before_id: input.cursor?.id,
    _result_state: input.resultState ?? undefined,
    _provider_key: input.providerKey ?? undefined,
    _model_key: input.modelKey ?? undefined,
    _from: input.from ?? undefined,
    _to: input.to ?? undefined,
  });
  if (error) throw new Error(error.message);
  const page = asRecord(data);
  if (!page || !Array.isArray(page.items) || typeof page.hasMore !== "boolean") {
    throw new Error("The I/O usage history is invalid.");
  }
  const items = page.items.map(parseUsageReceipt);
  if (items.some((item) => item === null)) {
    throw new Error("The I/O usage history contains an invalid receipt.");
  }
  const rawCursor = page.nextCursor === null ? null : asRecord(page.nextCursor);
  const nextCursor = rawCursor
    ? { createdAt: readString(rawCursor, "createdAt"), id: readString(rawCursor, "id") }
    : null;
  if (rawCursor && (!nextCursor?.createdAt || !nextCursor.id)) {
    throw new Error("The I/O usage cursor is invalid.");
  }
  return {
    items: items as IoRouteReceipt[],
    hasMore: page.hasMore,
    nextCursor: nextCursor as IoUsageHistoryCursor | null,
  };
}

export async function getIoRouteReceipts(workspaceId: string): Promise<IoRouteReceipt[]> {
  return (await listMyIoUsageHistory({ workspaceId, limit: 25 })).items;
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

export async function getMyIoBillingSummary(workspaceId: string): Promise<IoBillingSummary> {
  const { data, error } = await supabase.rpc("get_my_io_billing_summary", {
    _workspace_id: workspaceId,
  });
  if (error) throw new Error(error.message);
  const summary = asRecord(data);
  const counts = summary ? asRecord(summary.invoiceCounts) : null;
  if (!summary || !counts || !Array.isArray(summary.credits) || !Array.isArray(summary.unbilled)) {
    throw new Error("The I/O billing summary is invalid.");
  }
  const credits = summary.credits.flatMap((value): IoCreditBalance[] => {
    const credit = asRecord(value);
    if (!credit) return [];
    const accountId = readString(credit, "accountId");
    const currencyCode = readString(credit, "currencyCode");
    const status = readString(credit, "status");
    const balanceNanos = readExactIntegerString(credit, "balanceNanos");
    return accountId &&
      currencyCode &&
      balanceNanos !== null &&
      (status === "active" || status === "frozen" || status === "closed")
      ? [{ accountId, currencyCode, status, balanceNanos }]
      : [];
  });
  const unbilled = summary.unbilled.flatMap((value): IoUnbilledSummary[] => {
    const row = asRecord(value);
    if (!row) return [];
    const currencyCode = readString(row, "currencyCode");
    const customerChargeNanos = readExactIntegerString(row, "customerChargeNanos");
    const creditAppliedNanos = readExactIntegerString(row, "creditAppliedNanos");
    const amountDueNanos = readExactIntegerString(row, "amountDueNanos");
    const usageCount = readNonNegativeInteger(row, "usageCount");
    return currencyCode &&
      customerChargeNanos !== null &&
      creditAppliedNanos !== null &&
      amountDueNanos !== null &&
      usageCount !== null
      ? [{ currencyCode, customerChargeNanos, creditAppliedNanos, amountDueNanos, usageCount }]
      : [];
  });
  const draft = readNonNegativeInteger(counts, "draft");
  const issued = readNonNegativeInteger(counts, "issued");
  const paid = readNonNegativeInteger(counts, "paid");
  if (draft === null || issued === null || paid === null) {
    throw new Error("The I/O invoice counts are invalid.");
  }
  return { credits, unbilled, invoiceCounts: { draft, issued, paid } };
}

export async function listMyIoCreditEntries(workspaceId: string): Promise<IoCreditEntry[]> {
  const { data, error } = await supabase.rpc("list_my_io_credit_entries", {
    _workspace_id: workspaceId,
    _limit: 25,
  });
  if (error) throw new Error(error.message);
  if (!Array.isArray(data)) throw new Error("The I/O credit history is invalid.");
  return data.flatMap((value): IoCreditEntry[] => {
    const entry = asRecord(value);
    if (!entry) return [];
    const id = readString(entry, "id");
    const currencyCode = readString(entry, "currencyCode");
    const kind = readString(entry, "kind");
    const amountNanos = readExactIntegerString(entry, "amountNanos", { signed: true });
    const reason = readString(entry, "reason");
    const postedAt = readString(entry, "postedAt");
    return id && currencyCode && kind && amountNanos && reason && postedAt
      ? [{ id, currencyCode, kind, amountNanos, reason, postedAt }]
      : [];
  });
}

export async function listMyIoInvoices(workspaceId: string): Promise<IoInvoice[]> {
  const { data, error } = await supabase.rpc("list_my_io_invoices", {
    _workspace_id: workspaceId,
    _limit: 25,
  });
  if (error) throw new Error(error.message);
  if (!Array.isArray(data)) throw new Error("The I/O invoice history is invalid.");
  return data.flatMap((value): IoInvoice[] => {
    const invoice = asRecord(value);
    if (!invoice) return [];
    const id = readString(invoice, "id");
    const invoiceNumber = readString(invoice, "invoiceNumber");
    const currencyCode = readString(invoice, "currencyCode");
    const periodStart = readString(invoice, "periodStart");
    const periodEnd = readString(invoice, "periodEnd");
    const state = readString(invoice, "state");
    const taxStatus = readString(invoice, "taxStatus");
    const createdAt = readString(invoice, "createdAt");
    const lineCount = readNonNegativeInteger(invoice, "lineCount");
    const providerCostNanos = readExactIntegerString(invoice, "providerCostNanos");
    const serviceFeeNanos = readExactIntegerString(invoice, "serviceFeeNanos");
    const subtotalNanos = readExactIntegerString(invoice, "subtotalNanos");
    const creditAppliedNanos = readExactIntegerString(invoice, "creditAppliedNanos");
    const taxNanos = readExactIntegerString(invoice, "taxNanos");
    const totalNanos = readExactIntegerString(invoice, "totalNanos");
    const amountDueNanos = readExactIntegerString(invoice, "amountDueNanos");
    if (
      !id ||
      !invoiceNumber ||
      !currencyCode ||
      !periodStart ||
      !periodEnd ||
      !createdAt ||
      lineCount === null ||
      !["draft", "issued", "paid", "void"].includes(state ?? "") ||
      !["not_assessed", "not_applicable", "assessed"].includes(taxStatus ?? "") ||
      providerCostNanos === null ||
      serviceFeeNanos === null ||
      subtotalNanos === null ||
      creditAppliedNanos === null ||
      taxNanos === null ||
      totalNanos === null ||
      amountDueNanos === null
    ) {
      return [];
    }
    return [
      {
        id,
        invoiceNumber,
        currencyCode,
        periodStart,
        periodEnd,
        state: state as IoInvoice["state"],
        providerCostNanos,
        serviceFeeNanos,
        subtotalNanos,
        creditAppliedNanos,
        taxNanos,
        totalNanos,
        amountDueNanos,
        taxStatus: taxStatus as IoInvoice["taxStatus"],
        createdAt,
        issuedAt: readNullableString(invoice, "issuedAt"),
        dueAt: readNullableString(invoice, "dueAt"),
        lineCount,
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

export async function requestMyIoTerminalApproval(input: {
  sessionId: string;
  permissionKind:
    | "read"
    | "edit"
    | "shell"
    | "network"
    | "task"
    | "web"
    | "mcp"
    | "external_directory";
  riskClass: "low" | "moderate" | "high" | "critical";
  reason: string;
  expiresAt: string;
}): Promise<IoTerminalApproval> {
  const { data, error } = await supabase.rpc("request_my_io_terminal_approval", {
    _session_id: input.sessionId,
    _permission_kind: input.permissionKind,
    _risk_class: input.riskClass,
    _decision_scope: "once",
    _reason: input.reason,
    _expires_at: input.expiresAt,
  });
  if (error) throw new Error(error.message);
  const result = asRecord(data);
  const requestId = result ? readString(result, "requestId") : null;
  const state = result ? readString(result, "state") : null;
  if (!requestId || state !== "pending") {
    throw new Error("The terminal approval request is invalid.");
  }
  return {
    requestId,
    state,
    expiresAt: result ? readNullableString(result, "expiresAt") : null,
  };
}

export async function decideMyIoTerminalApproval(
  requestId: string,
  decision: "approved" | "rejected",
  reason: string,
): Promise<IoTerminalApproval> {
  const { data, error } = await supabase.rpc("decide_my_io_terminal_approval", {
    _request_id: requestId,
    _decision: decision,
    _reason: reason,
  });
  if (error) throw new Error(error.message);
  const result = asRecord(data);
  const returnedRequestId = result ? readString(result, "requestId") : null;
  const state = result ? readString(result, "state") : null;
  if (
    returnedRequestId !== requestId ||
    !["approved", "rejected", "expired"].includes(state ?? "")
  ) {
    throw new Error("The terminal approval decision is invalid.");
  }
  return {
    requestId,
    state: state as IoTerminalApproval["state"],
    expiresAt: null,
  };
}

export async function getIoRouteCatalog(workspaceId: string): Promise<IoRouteCatalog> {
  const { data, error } = await supabase.functions.invoke("io-gateway", {
    body: { action: "catalog", workspace_id: workspaceId },
  });

  if (error) throw new Error(error.message);
  return parseRouteCatalog(data);
}

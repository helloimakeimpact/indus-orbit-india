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
  fallbackCount: number;
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
  const regionCode = readNullableString(route, "regionCode");
  const residencyCountryCode = readNullableString(route, "residencyCountryCode");
  if (
    required.some((item) => !item) ||
    estimatedCostNanos === null ||
    fallbackCount === null ||
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
}): Promise<PartnerRunResult> {
  const { data, error } = await supabase.functions.invoke("io-gateway", {
    body: {
      action: "partner_chat",
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
  return parsePartnerRunResult(data);
}

export async function getIoRouteCatalog(workspaceId: string): Promise<IoRouteCatalog> {
  const { data, error } = await supabase.functions.invoke("io-gateway", {
    body: { action: "catalog", workspace_id: workspaceId },
  });

  if (error) throw new Error(error.message);
  return parseRouteCatalog(data);
}

export async function recordLocalOpenCodeSession(input: {
  workspaceId: string;
  connectorOrigin: string;
  sessionId: string;
}): Promise<void> {
  const { error } = await supabase.functions.invoke("io-gateway", {
    body: {
      action: "record_local_opencode",
      workspace_id: input.workspaceId,
      connector_origin: input.connectorOrigin,
      session_id: input.sessionId,
    },
  });

  if (error) throw new Error(error.message);
}

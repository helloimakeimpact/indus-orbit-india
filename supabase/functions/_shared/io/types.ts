export type GatewayAction = "partner_chat" | "catalog" | "status";
export type GatewayMode = "observe" | "plan" | "build" | "run";
export type RouteStrategy = "latest_affordable" | "lowest_cost" | "explicit_model";

export type GatewayMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type GatewayRequest = {
  action: GatewayAction;
  workspaceId: string;
  idempotencyKey?: string;
  mode?: GatewayMode;
  messages?: GatewayMessage[];
  routeStrategy?: RouteStrategy;
  requestedModelId?: string;
};

export type GatewayActor = {
  id: string;
};

export type ProviderConnection = {
  endpointId: string;
  providerId: string;
  providerKey: string;
  providerDisplayName: string;
  integrationStyle: "openai_compatible" | "native_adapter";
  modelId: string;
  providerModelId: string;
  modelDisplayName: string;
  modelReleaseDate: string;
  modelDeprecationAt: string | null;
  autoRouteTier: "economy" | "balanced" | "premium";
  maxContextTokens: number | null;
  capacitySourceId: string;
  endpointKey: string;
  capacityMode: string;
  regionCode: string | null;
  residencyCountryCode: string | null;
  retentionClass: string;
  baseUrl: string;
  secretReference: string;
  capabilityVersion: number;
  priceVersion: number;
  currencyCode: string;
  unitQuantity: number;
  inputPriceNanos: number;
  outputPriceNanos: number;
  healthState: "healthy" | "degraded" | "unavailable" | "unknown";
  circuitState: "closed" | "open" | "half_open";
};

export type RouteSelection = {
  connection: ProviderConnection;
  strategy: RouteStrategy;
  tier: "economy" | "balanced" | "premium";
  estimatedCostNanos: number;
  candidateCount: number;
  candidateSummary: Array<{
    providerKey: string;
    modelId: string;
    endpointKey: string;
    estimatedCostNanos: number;
    currencyCode: string;
  }>;
  routeCandidates: Array<{
    connection: ProviderConnection;
    estimatedCostNanos: number;
  }>;
};

export type PartnerResult = {
  content: string;
  usage: {
    inputTokens?: number;
    outputTokens?: number;
  };
  providerRequestId?: string;
};

export type ActiveCapacityEntitlement = {
  sourceId: string;
  sourceKey: string;
  displayName: string;
};

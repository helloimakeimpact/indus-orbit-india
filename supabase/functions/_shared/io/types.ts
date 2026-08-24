export type GatewayAction = "partner_chat" | "preflight" | "catalog" | "status";
export type GatewayMode = "observe" | "plan" | "build" | "run";
export type RouteStrategy = "latest_affordable" | "lowest_cost" | "explicit_model";

export type GatewayTextContentPart = {
  type: "text";
  text: string;
};

export type GatewayImageContentPart = {
  type: "image_url";
  imageUrl: string;
  detail?: "auto" | "low" | "high";
};

export type GatewayMessageContent =
  | string
  | Array<GatewayTextContentPart | GatewayImageContentPart>;

export type GatewayToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type GatewayMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: GatewayMessageContent | null;
  name?: string;
  toolCallId?: string;
  toolCalls?: GatewayToolCall[];
};

export type GatewayToolDefinition = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters: Record<string, unknown>;
    strict?: boolean;
  };
};

export type GatewayResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | {
      type: "json_schema";
      jsonSchema: {
        name: string;
        description?: string;
        schema: Record<string, unknown>;
        strict?: boolean;
      };
    };

export type GatewayInferenceOptions = {
  maxOutputTokens?: number;
  tools?: GatewayToolDefinition[];
  toolChoice?: "none" | "auto" | "required" | { type: "function"; name: string };
  parallelToolCalls?: boolean;
  responseFormat?: GatewayResponseFormat;
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
  supportsStreaming: boolean;
  supportsTools: boolean;
  supportsStructuredOutput: boolean;
  supportsVision: boolean;
  supportsAudio: boolean;
  supportsCancellation: boolean;
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
  message: {
    role: "assistant";
    content: string | null;
    toolCalls?: GatewayToolCall[];
  };
  finishReason: "stop" | "length" | "tool_calls" | "content_filter" | "unknown";
  usage: {
    inputTokens?: number;
    outputTokens?: number;
    cachedInputTokens?: number;
  };
  providerRequestId?: string;
};

export type ActiveCapacityEntitlement = {
  sourceId: string;
  sourceKey: string;
  displayName: string;
};

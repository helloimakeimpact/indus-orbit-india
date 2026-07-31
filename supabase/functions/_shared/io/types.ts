export type GatewayAction = "partner_chat" | "record_local_opencode" | "status";
export type GatewayMode = "observe" | "plan" | "build" | "run";

export type GatewayMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type GatewayRequest = {
  action: GatewayAction;
  workspaceId: string;
  mode?: GatewayMode;
  messages?: GatewayMessage[];
  connectorOrigin?: string;
  sessionId?: string;
};

export type GatewayActor = {
  id: string;
};

export type PartnerConfig = {
  baseUrl: string;
  apiKey: string;
  providerKey: string;
  selection: {
    tier: "economy" | "balanced" | "premium";
    freshnessDays: number;
    affordabilityMultiplier: number;
  };
};

export type PartnerModelSelection = {
  model: string;
  strategy: "latest_affordable";
  tier: "economy" | "balanced" | "premium";
  releasedAt: string;
  candidateCount: number;
};

export type PartnerResult = {
  content: string;
  usage: {
    inputTokens?: number;
    outputTokens?: number;
  };
};

export type PartnerEntitlement = {
  sourceKey: string;
  displayName: string;
};

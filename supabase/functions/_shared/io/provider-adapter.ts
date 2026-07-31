import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { GatewayError } from "./errors.ts";
import type {
  GatewayMessage,
  PartnerConfig,
  PartnerModelSelection,
  PartnerResult,
} from "./types.ts";

const supportedTiers = new Set(["economy", "balanced", "premium"]);

function readPositiveInteger(name: string, fallback: number, maximum: number) {
  const value = Deno.env.get(name);
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > maximum) {
    throw new GatewayError("internal_error", 500, `The ${name} value is invalid.`);
  }
  return parsed;
}

function readAffordabilityMultiplier() {
  const value = Deno.env.get("IO_MODEL_SELECTION_AFFORDABILITY_MULTIPLIER");
  if (!value) return 1.35;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 10) {
    throw new GatewayError(
      "internal_error",
      500,
      "The IO_MODEL_SELECTION_AFFORDABILITY_MULTIPLIER value is invalid.",
    );
  }
  return parsed;
}

function readSelectionTier() {
  const tier = Deno.env.get("IO_MODEL_SELECTION_TIER") ?? "balanced";
  if (!supportedTiers.has(tier)) {
    throw new GatewayError("internal_error", 500, "The IO_MODEL_SELECTION_TIER value is invalid.");
  }
  return tier as PartnerConfig["selection"]["tier"];
}

export function readPartnerConfig(): PartnerConfig | null {
  const baseUrl = Deno.env.get("IO_PARTNER_BASE_URL");
  const apiKey = Deno.env.get("IO_PARTNER_API_KEY");
  const providerKey = Deno.env.get("IO_PARTNER_PROVIDER_KEY");
  if (!baseUrl || !apiKey || !providerKey) return null;

  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new GatewayError("internal_error", 500, "The partner route is misconfigured.");
  }

  if (url.protocol !== "https:" || url.username || url.password) {
    throw new GatewayError("internal_error", 500, "The partner route is misconfigured.");
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(providerKey)) {
    throw new GatewayError("internal_error", 500, "The partner route is misconfigured.");
  }

  return {
    baseUrl: url.toString().replace(/\/$/, ""),
    apiKey,
    providerKey,
    selection: {
      tier: readSelectionTier(),
      freshnessDays: readPositiveInteger("IO_MODEL_SELECTION_FRESHNESS_DAYS", 180, 3_650),
      affordabilityMultiplier: readAffordabilityMultiplier(),
    },
  };
}

type RegistryModel = {
  id: string;
  provider_model_id: string;
  released_at: string | null;
  deprecation_at: string | null;
};

type RegistryEndpoint = { id: string; model_id: string };

type RegistryCapability = { endpoint_id: string; version: number; supports_chat: boolean };

type RegistryPrice = {
  endpoint_id: string;
  effective_from: string;
  unit_quantity: number;
  input_price_nanos: number | null;
  output_price_nanos: number | null;
};

type SelectionCandidate = {
  model: RegistryModel;
  estimatedCostNanos: number;
};

function numberOrNull(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function estimatedChatCostNanos(price: RegistryPrice, inputTokens: number) {
  const unitQuantity = numberOrNull(price.unit_quantity);
  const inputPrice = numberOrNull(price.input_price_nanos);
  const outputPrice = numberOrNull(price.output_price_nanos);
  if (!unitQuantity || inputPrice === null || outputPrice === null) return null;

  // The gateway currently caps output at 1,024 tokens. This is only a routing
  // estimate, not a member charge or final usage receipt.
  return (inputTokens * inputPrice) / unitQuantity + (1_024 * outputPrice) / unitQuantity;
}

function releasedAtMillis(model: RegistryModel) {
  if (!model.released_at) return null;
  const timestamp = Date.parse(`${model.released_at}T00:00:00.000Z`);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function isDeprecated(model: RegistryModel, now: number) {
  if (!model.deprecation_at) return false;
  const timestamp = Date.parse(model.deprecation_at);
  return Number.isFinite(timestamp) && timestamp <= now;
}

export async function resolveLatestAffordableModel(
  admin: SupabaseClient,
  config: PartnerConfig,
  messages: GatewayMessage[],
): Promise<PartnerModelSelection> {
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const { data: provider, error: providerError } = await admin
    .from("io_providers")
    .select("id")
    .eq("provider_key", config.providerKey)
    .eq("lifecycle_state", "active")
    .eq("catalogue_visibility", "listed")
    .maybeSingle();

  if (providerError) throw providerError;
  if (!provider) {
    throw new GatewayError(
      "not_configured",
      503,
      "The configured provider is not active in the I/O registry.",
    );
  }

  const { data: modelRows, error: modelError } = await admin
    .from("io_models")
    .select("id, provider_model_id, released_at, deprecation_at")
    .eq("provider_id", provider.id)
    .eq("listing_state", "listed")
    .eq("auto_route_tier", config.selection.tier);
  if (modelError) throw modelError;

  const models = ((modelRows ?? []) as RegistryModel[]).filter(
    (model) => releasedAtMillis(model) !== null && !isDeprecated(model, now),
  );
  if (!models.length) {
    throw new GatewayError(
      "not_configured",
      503,
      "No current reviewed models are available for this I/O routing tier.",
    );
  }

  const { data: endpointRows, error: endpointError } = await admin
    .from("io_model_endpoints")
    .select("id, model_id")
    .eq("provider_id", provider.id)
    .eq("routing_state", "active")
    .eq("member_visible", true)
    .in(
      "model_id",
      models.map((model) => model.id),
    );
  if (endpointError) throw endpointError;

  const endpoints = (endpointRows ?? []) as RegistryEndpoint[];
  if (!endpoints.length) {
    throw new GatewayError("not_configured", 503, "No active model endpoint is available.");
  }

  const endpointIds = endpoints.map((endpoint) => endpoint.id);
  const { data: capabilityRows, error: capabilityError } = await admin
    .from("io_endpoint_capability_versions")
    .select("endpoint_id, version, supports_chat")
    .eq("verification_state", "verified")
    .in("endpoint_id", endpointIds)
    .order("version", { ascending: false });
  if (capabilityError) throw capabilityError;

  const latestCapabilities = new Map<string, RegistryCapability>();
  for (const capability of (capabilityRows ?? []) as RegistryCapability[]) {
    if (!latestCapabilities.has(capability.endpoint_id)) {
      latestCapabilities.set(capability.endpoint_id, capability);
    }
  }

  const { data: priceRows, error: priceError } = await admin
    .from("io_endpoint_pricing_versions")
    .select("endpoint_id, effective_from, unit_quantity, input_price_nanos, output_price_nanos")
    .eq("publication_state", "published")
    .eq("member_visible", true)
    .lte("effective_from", nowIso)
    .or(`effective_until.is.null,effective_until.gt.${nowIso}`)
    .in("endpoint_id", endpointIds)
    .order("effective_from", { ascending: false });
  if (priceError) throw priceError;

  const currentPrices = new Map<string, RegistryPrice>();
  for (const price of (priceRows ?? []) as RegistryPrice[]) {
    if (!currentPrices.has(price.endpoint_id)) currentPrices.set(price.endpoint_id, price);
  }

  const modelsById = new Map(models.map((model) => [model.id, model]));
  const estimatedInputTokens = Math.max(
    1,
    Math.ceil(messages.reduce((total, message) => total + message.content.length, 0) / 4),
  );
  const candidates: SelectionCandidate[] = [];

  for (const endpoint of endpoints) {
    const capability = latestCapabilities.get(endpoint.id);
    const price = currentPrices.get(endpoint.id);
    const model = modelsById.get(endpoint.model_id);
    if (!capability?.supports_chat || !price || !model) continue;

    const estimatedCostNanos = estimatedChatCostNanos(price, estimatedInputTokens);
    if (estimatedCostNanos === null) continue;
    candidates.push({ model, estimatedCostNanos });
  }

  if (!candidates.length) {
    throw new GatewayError(
      "not_configured",
      503,
      "No verified and currently priced chat model is available for automatic routing.",
    );
  }

  const newestRelease = Math.max(
    ...candidates.map((candidate) => releasedAtMillis(candidate.model)!),
  );
  const freshnessCutoff = newestRelease - config.selection.freshnessDays * 86_400_000;
  const currentCandidates = candidates.filter(
    (candidate) => releasedAtMillis(candidate.model)! >= freshnessCutoff,
  );
  const mostAffordable = Math.min(
    ...currentCandidates.map((candidate) => candidate.estimatedCostNanos),
  );
  const affordableCandidates = currentCandidates.filter(
    (candidate) =>
      candidate.estimatedCostNanos <= mostAffordable * config.selection.affordabilityMultiplier,
  );

  affordableCandidates.sort((left, right) => {
    const releaseDifference = releasedAtMillis(right.model)! - releasedAtMillis(left.model)!;
    if (releaseDifference !== 0) return releaseDifference;
    const costDifference = left.estimatedCostNanos - right.estimatedCostNanos;
    if (costDifference !== 0) return costDifference;
    return left.model.provider_model_id.localeCompare(right.model.provider_model_id);
  });

  const selected = affordableCandidates[0];
  return {
    model: selected.model.provider_model_id,
    strategy: "latest_affordable",
    tier: config.selection.tier,
    releasedAt: selected.model.released_at!,
    candidateCount: candidates.length,
  };
}

export async function sendOpenAiCompatibleChat(
  config: PartnerConfig,
  model: string,
  messages: GatewayMessage[],
): Promise<PartnerResult> {
  let upstream: Response;
  try {
    upstream = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, max_tokens: 1_024, stream: false }),
      signal: AbortSignal.timeout(45_000),
    });
  } catch {
    throw new GatewayError("upstream_failure", 502, "The provider could not be reached.");
  }

  const body = await upstream.json().catch(() => null);
  if (!upstream.ok) {
    throw new GatewayError("upstream_failure", 502, "The provider did not accept this request.");
  }

  const content = body?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new GatewayError(
      "upstream_failure",
      502,
      "The provider returned no usable assistant response.",
    );
  }

  const usage = body?.usage;
  return {
    content,
    usage: {
      inputTokens: typeof usage?.prompt_tokens === "number" ? usage.prompt_tokens : undefined,
      outputTokens:
        typeof usage?.completion_tokens === "number" ? usage.completion_tokens : undefined,
    },
  };
}

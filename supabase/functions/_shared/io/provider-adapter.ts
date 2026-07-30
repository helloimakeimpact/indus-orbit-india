import { GatewayError } from "./errors.ts";
import type { GatewayMessage, PartnerConfig, PartnerResult } from "./types.ts";

export function readPartnerConfig(): PartnerConfig | null {
  const baseUrl = Deno.env.get("IO_PARTNER_BASE_URL");
  const apiKey = Deno.env.get("IO_PARTNER_API_KEY");
  const model = Deno.env.get("IO_PARTNER_DEFAULT_MODEL");
  if (!baseUrl || !apiKey || !model) return null;

  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new GatewayError("internal_error", 500, "The partner route is misconfigured.");
  }

  if (url.protocol !== "https:" || url.username || url.password) {
    throw new GatewayError("internal_error", 500, "The partner route is misconfigured.");
  }

  return { baseUrl: url.toString().replace(/\/$/, ""), apiKey, model };
}

export async function sendOpenAiCompatibleChat(
  config: PartnerConfig,
  messages: GatewayMessage[],
): Promise<PartnerResult> {
  let upstream: Response;
  try {
    upstream = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: config.model, messages, max_tokens: 1_024, stream: false }),
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

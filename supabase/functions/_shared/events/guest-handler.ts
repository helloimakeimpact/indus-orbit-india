import { boundedBody } from "../public-forms/handler.ts";

type Configuration = {
  secret: string;
  origins: string[];
  canonicalOrigin: string;
  mailConfigured: boolean;
};
type Dependencies = {
  configuration: () => Configuration;
  fetch: typeof fetch;
  requestLink: (
    eventId: string,
    email: string,
    name: string,
    tokenHash: string,
  ) => Promise<boolean>;
  receipt: (
    eventId: string,
    tokenHash: string,
    action: "receipt" | "confirm" | "cancel",
  ) => Promise<unknown>;
  sendLink: (email: string, url: string, idempotencyKey: string) => Promise<void>;
};
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const hex = (bytes: Uint8Array) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
export async function guestTokenHash(token: string) {
  return hex(
    new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))),
  );
}
export function createGuestEventHandler(dependencies: Dependencies) {
  return async (request: Request): Promise<Response> => {
    const config = dependencies.configuration();
    const origin = request.headers.get("origin") ?? "";
    const allowed = origin !== "" && origin !== "null" && config.origins.includes(origin);
    const headers = {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      Vary: "Origin",
      ...(allowed ? { "Access-Control-Allow-Origin": origin } : {}),
      "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    };
    const reply = (status: number, code: string, registration?: unknown) =>
      new Response(
        JSON.stringify({ ok: status === 200, code, ...(registration ? { registration } : {}) }),
        { status, headers },
      );
    if (!allowed) return reply(403, "origin_not_allowed");
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.method !== "POST") return reply(405, "method_not_allowed");
    if (
      request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json"
    )
      return reply(415, "invalid_content_type");
    let body: Record<string, unknown>;
    try {
      const value = await boundedBody(request);
      if (!value || typeof value !== "object" || Array.isArray(value))
        return reply(400, "invalid_request");
      body = value;
    } catch {
      return reply(400, "invalid_request");
    }
    if (typeof body.eventId !== "string" || !uuid.test(body.eventId))
      return reply(400, "invalid_request");
    if (body.action === "receipt" || body.action === "confirm" || body.action === "cancel") {
      if (typeof body.token !== "string" || !/^[a-f0-9]{64}$/.test(body.token))
        return reply(400, "invalid_link");
      try {
        const registration = await dependencies.receipt(
          body.eventId,
          await guestTokenHash(body.token),
          body.action,
        );
        return reply(200, "registration", registration);
      } catch {
        return reply(403, "link_unavailable");
      }
    }
    if (body.action !== "request") return reply(400, "invalid_request");
    const text = (key: string) => (typeof body[key] === "string" ? body[key].trim() : "");
    const email = text("email").toLowerCase(),
      name = text("name"),
      captchaToken = text("captchaToken");
    if (
      !name ||
      name.length > 120 ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !captchaToken ||
      captchaToken.length > 2048
    )
      return reply(400, "invalid_request");
    let canonical: URL;
    try {
      canonical = new URL(config.canonicalOrigin);
      if (
        canonical.protocol !== "https:" ||
        canonical.origin !== config.canonicalOrigin ||
        !config.origins.includes(canonical.origin)
      )
        return reply(503, "unavailable");
    } catch {
      return reply(503, "unavailable");
    }
    if (!config.mailConfigured || !config.secret || /^[123]x0{20,}/.test(config.secret))
      return reply(503, "unavailable");
    try {
      const response = await dependencies.fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ secret: config.secret, response: captchaToken }),
          signal: AbortSignal.timeout(8000),
        },
      );
      if (!response.ok) return reply(503, "verification_unavailable");
      const result = await response.json();
      if (
        result?.success !== true ||
        result.action !== "event_registration" ||
        result.hostname !== new URL(origin).hostname
      )
        return reply(403, "verification_failed");
    } catch {
      return reply(503, "verification_unavailable");
    }
    try {
      const token = hex(crypto.getRandomValues(new Uint8Array(32)));
      const hash = await guestTokenHash(token);
      if (await dependencies.requestLink(body.eventId, email, name, hash)) {
        // A fragment is never sent in the page request or Referer header.
        const url = `${canonical.origin}/events/${body.eventId}#guest=${token}`;
        await dependencies.sendLink(email, url, hash);
      }
      // Same response for restricted/closed events, throttling and duplicate emails.
      return reply(200, "check_email");
    } catch {
      return reply(503, "request_unavailable");
    }
  };
}

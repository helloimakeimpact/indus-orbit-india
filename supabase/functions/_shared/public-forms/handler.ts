export type PublicSubmission =
  | { kind: "newsletter"; email: string }
  | { kind: "contact"; email: string; name: string; role: string; message: string };

type Configuration = { secret: string; sitekey: string; origins: string[] };
type Dependencies = {
  configuration: () => Configuration;
  fetch: typeof fetch;
  save: (submission: PublicSubmission) => Promise<void>;
};

const MAX_BODY_BYTES = 20 * 1024;
const roles = new Set([
  "Youth",
  "Founder",
  "Expert",
  "Investor",
  "Diaspora",
  "Partner / Org",
  "Researcher",
]);

function parseSubmission(value: unknown): { submission: PublicSubmission; token: string } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  const text = (key: string) => (typeof body[key] === "string" ? body[key].trim() : "");
  const email = text("email").toLowerCase();
  const token = text("captchaToken");
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254 ||
    !token ||
    token.length > 8192
  )
    return null;
  if (body.kind === "newsletter") return { submission: { kind: "newsletter", email }, token };
  const name = text("name");
  const message = text("message");
  const role = text("role");
  if (
    body.kind !== "contact" ||
    !name ||
    name.length > 120 ||
    !message ||
    message.length > 5000 ||
    !roles.has(role)
  )
    return null;
  return { submission: { kind: "contact", email, name, role, message }, token };
}

async function boundedBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("invalid_body");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new Error("body_too_large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const joined = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(joined));
}

export function createPublicFormHandler(dependencies: Dependencies) {
  return async (request: Request): Promise<Response> => {
    const config = dependencies.configuration();
    const origin = request.headers.get("origin") ?? "";
    const allowed = config.origins.includes(origin) && origin !== "null" && origin !== "";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      Vary: "Origin",
      ...(allowed ? { "Access-Control-Allow-Origin": origin } : {}),
      "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    };
    const reply = (status: number, code: string) =>
      new Response(JSON.stringify({ ok: status === 200, code }), { status, headers });
    if (!allowed) return reply(403, "origin_not_allowed");
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.method !== "POST") return reply(405, "method_not_allowed");
    // Public test keys deliberately provide no protection. Never accept them in this endpoint.
    if (
      !config.secret ||
      !config.sitekey ||
      /^0x0+$/.test(config.secret) ||
      /^[123]0000000-ffff-ffff-ffff-00000000000[123]$/.test(config.sitekey)
    )
      return reply(503, "unavailable");
    if (
      request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json"
    )
      return reply(415, "invalid_content_type");
    let parsed: ReturnType<typeof parseSubmission>;
    try {
      parsed = parseSubmission(await boundedBody(request));
    } catch (error) {
      return reply(
        error instanceof Error && error.message === "body_too_large" ? 413 : 400,
        "invalid_submission",
      );
    }
    if (!parsed) return reply(400, "invalid_submission");

    let verification: unknown;
    try {
      const response = await dependencies.fetch("https://api.hcaptcha.com/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: config.secret,
          sitekey: config.sitekey,
          response: parsed.token,
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) return reply(503, "verification_unavailable");
      verification = await response.json();
    } catch {
      return reply(503, "verification_unavailable");
    }
    if (
      !verification ||
      typeof verification !== "object" ||
      (verification as { success?: unknown }).success !== true
    )
      return reply(403, "verification_failed");
    try {
      await dependencies.save(parsed.submission);
      return reply(200, "received");
    } catch {
      return reply(503, "submission_unavailable");
    }
  };
}

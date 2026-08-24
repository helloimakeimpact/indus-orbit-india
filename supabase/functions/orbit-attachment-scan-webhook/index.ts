import { createGatewayAdminClient } from "../_shared/io/auth.ts";

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function equalHex(left: string, right: string) {
  if (left.length !== right.length) return false;
  let different = 0;
  for (let index = 0; index < left.length; index += 1) {
    different |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return different === 0;
}

async function hmacHex(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const secret = Deno.env.get("ORBIT_ATTACHMENT_SCANNER_WEBHOOK_SECRET")?.trim();
  if (!secret) return new Response("Scanner webhook is not configured", { status: 503 });
  const rawBody = await request.text();
  const received = request.headers.get("x-io-signature")?.trim().toLowerCase() ?? "";
  const expected = await hmacHex(secret, rawBody);
  if (!received || !equalHex(received, expected)) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    const body = record(JSON.parse(rawBody));
    const attachmentId = typeof body?.attachmentId === "string" ? body.attachmentId : "";
    const providerKey = typeof body?.providerKey === "string" ? body.providerKey : "";
    const providerEventId = typeof body?.providerEventId === "string" ? body.providerEventId : "";
    const verdict = typeof body?.verdict === "string" ? body.verdict : "";
    const contentSha256 =
      typeof body?.contentSha256 === "string" ? body.contentSha256.toLowerCase() : "";
    const threatCode = typeof body?.threatCode === "string" ? body.threatCode : "";
    const observedAt = typeof body?.observedAt === "string" ? body.observedAt : "";
    if (
      !/^[a-f0-9-]{36}$/i.test(attachmentId) ||
      !/^[a-z][a-z0-9_.-]{1,79}$/.test(providerKey) ||
      providerEventId.length < 8 ||
      !new Set(["clean", "blocked", "failed"]).has(verdict) ||
      !/^[a-f0-9]{64}$/.test(contentSha256) ||
      !Number.isFinite(Date.parse(observedAt))
    ) {
      return new Response("Scanner event shape is invalid", { status: 400 });
    }
    const admin = createGatewayAdminClient();
    const { error } = await admin.rpc("record_conversation_attachment_scan", {
      _attachment_id: attachmentId,
      _provider_key: providerKey,
      _provider_event_id: providerEventId,
      _verdict: verdict,
      _content_sha256: contentSha256,
      _threat_code: threatCode,
      _observed_at: observedAt,
    });
    if (error) throw error;
    return new Response("ok", { status: 200 });
  } catch (error) {
    console.error(
      "orbit-attachment-scan-webhook failure",
      error instanceof Error ? error.message : "unknown",
    );
    return new Response("Scanner webhook processing failed", { status: 500 });
  }
});

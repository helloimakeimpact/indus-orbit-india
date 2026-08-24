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

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const secret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET")?.trim();
  if (!secret) return new Response("Webhook is not configured", { status: 503 });
  const rawBody = await request.text();
  const receivedSignature = request.headers.get("x-razorpay-signature")?.trim().toLowerCase() ?? "";
  const expectedSignature = await hmacHex(secret, rawBody);
  if (!receivedSignature || !equalHex(receivedSignature, expectedSignature)) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const payload = record(JSON.parse(rawBody));
    const eventType = typeof payload?.event === "string" ? payload.event : "";
    const supported = new Set([
      "payment.authorized",
      "payment.captured",
      "payment.failed",
      "refund.created",
      "refund.processed",
      "refund.failed",
      "payment.dispute.created",
    ]);
    if (!supported.has(eventType)) return new Response("ok", { status: 200 });
    const eventId = request.headers.get("x-razorpay-event-id")?.trim() ?? "";
    if (eventId.length < 8 || eventId.length > 200) {
      return new Response("Event ID required", { status: 400 });
    }
    const eventPayload = record(payload?.payload);
    const payment = record(record(eventPayload?.payment)?.entity);
    const refund = record(record(eventPayload?.refund)?.entity);
    const entity = refund ?? payment;
    const orderId =
      typeof payment?.order_id === "string"
        ? payment.order_id
        : typeof entity?.order_id === "string"
          ? entity.order_id
          : "";
    const paymentId =
      typeof payment?.id === "string"
        ? payment.id
        : typeof refund?.payment_id === "string"
          ? refund.payment_id
          : "";
    const refundId = typeof refund?.id === "string" ? refund.id : "";
    const amountMinor = typeof entity?.amount === "number" ? entity.amount : null;
    const currencyCode = typeof entity?.currency === "string" ? entity.currency : "";
    const createdAt =
      typeof entity?.created_at === "number" ? entity.created_at : Date.now() / 1000;
    if (!orderId || !Number.isSafeInteger(amountMinor) || amountMinor! < 0) {
      return new Response("Event shape is invalid", { status: 400 });
    }
    const admin = createGatewayAdminClient();
    const { error } = await admin.rpc("record_io_payment_provider_event", {
      _provider_key: "razorpay",
      _provider_event_id: eventId,
      _event_type: eventType,
      _external_order_id: orderId,
      _external_payment_id: paymentId,
      _external_refund_id: refundId,
      _amount_minor: amountMinor,
      _currency_code: currencyCode,
      _payload_sha256: await sha256Hex(rawBody),
      _occurred_at: new Date(createdAt * 1000).toISOString(),
    });
    if (error) throw error;
    return new Response("ok", { status: 200 });
  } catch (error) {
    console.error("io-payment-webhook failure", error instanceof Error ? error.message : "unknown");
    return new Response("Webhook processing failed", { status: 500 });
  }
});

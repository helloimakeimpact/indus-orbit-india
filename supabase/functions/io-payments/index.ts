import { corsHeaders as supabaseCorsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { authenticateGatewayActor, createGatewayClients } from "../_shared/io/auth.ts";

const allowedOrigins = new Set([
  "https://indusorbit.com",
  "https://www.indusorbit.com",
  "https://admin.indusorbit.com",
  "http://127.0.0.1:5173",
  "http://localhost:5173",
  "http://127.0.0.1:5174",
  "http://localhost:5174",
]);

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function corsHeaders(request: Request) {
  const origin = request.headers.get("origin");
  return {
    ...supabaseCorsHeaders,
    "Access-Control-Allow-Origin":
      origin && allowedOrigins.has(origin) ? origin : "https://indusorbit.com",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function json(request: Request, body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: corsHeaders(request),
  });
}

function requiredString(body: JsonRecord, key: string, pattern?: RegExp) {
  const value = typeof body[key] === "string" ? body[key].trim() : "";
  if (!value || (pattern && !pattern.test(value))) {
    throw new Error(`${key} is invalid.`);
  }
  return value;
}

function razorpayCredentials() {
  const keyId = Deno.env.get("RAZORPAY_KEY_ID")?.trim();
  const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET")?.trim();
  if (!keyId || !keySecret) {
    throw new Error("The approved Razorpay runtime credentials are not configured.");
  }
  return { keyId, authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}` };
}

async function razorpayRequest(path: string, authorization: string, body: JsonRecord) {
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    method: "POST",
    headers: { Authorization: authorization, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  const payload = record(await response.json().catch(() => null));
  if (!response.ok) {
    const providerError = record(payload?.error);
    const code = typeof providerError?.code === "string" ? providerError.code : "provider_rejected";
    throw new Error(`Razorpay rejected the operation (${code}).`);
  }
  return payload;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(request) });
  }
  if (request.method !== "POST") {
    return json(request, { ok: false, error: "Method not allowed." }, 405);
  }

  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization) return json(request, { ok: false, error: "Unauthorized." }, 401);
    const clients = createGatewayClients(authorization);
    await authenticateGatewayActor(clients.authClient);
    const body = record(await request.json());
    if (!body) throw new Error("A JSON object is required.");
    const action = requiredString(body, "action");
    const credentials = razorpayCredentials();

    if (action === "create_checkout") {
      const invoiceId = requiredString(body, "invoiceId", /^[a-f0-9-]{36}$/i);
      const clientRequestId = requiredString(body, "clientRequestId", /^[a-f0-9-]{36}$/i);
      const { data, error } = await clients.authClient.rpc("create_my_io_payment_intent", {
        _invoice_id: invoiceId,
        _client_request_id: clientRequestId,
      });
      if (error) throw error;
      const intent = record(data);
      const paymentIntentId =
        typeof intent?.paymentIntentId === "string" ? intent.paymentIntentId : "";
      if (!paymentIntentId || intent?.provider !== "razorpay") {
        throw new Error("The payment intent did not select an approved processor.");
      }

      const { data: stored, error: storedError } = await clients.admin
        .from("io_payment_intents")
        .select("external_order_id,amount_minor,currency_code")
        .eq("id", paymentIntentId)
        .single();
      if (storedError) throw storedError;
      let orderId = stored.external_order_id;
      if (!orderId) {
        const order = await razorpayRequest("/orders", credentials.authorization, {
          amount: stored.amount_minor,
          currency: stored.currency_code,
          receipt: `io_${paymentIntentId.replaceAll("-", "").slice(0, 32)}`,
          notes: { payment_intent_id: paymentIntentId },
        });
        orderId = typeof order?.id === "string" ? order.id : "";
        if (!orderId) throw new Error("Razorpay returned no order identifier.");
        const { error: recordError } = await clients.admin.rpc("record_io_payment_order", {
          _payment_intent_id: paymentIntentId,
          _external_order_id: orderId,
        });
        if (recordError) throw recordError;
      }
      return json(request, {
        ok: true,
        provider: "razorpay",
        keyId: credentials.keyId,
        orderId,
        paymentIntentId,
        amountMinor: stored.amount_minor,
        currencyCode: stored.currency_code,
      });
    }

    if (action === "refund") {
      const paymentIntentId = requiredString(body, "paymentIntentId", /^[a-f0-9-]{36}$/i);
      const clientRequestId = requiredString(body, "clientRequestId", /^[a-f0-9-]{36}$/i);
      const amountNanos = requiredString(body, "amountNanos", /^[1-9][0-9]{0,18}$/);
      const reason = requiredString(body, "reason");
      if (reason.length < 8 || reason.length > 500) {
        throw new Error("A refund reason between 8 and 500 characters is required.");
      }
      const { data, error } = await clients.authClient.rpc("admin_io_request_refund", {
        _payment_intent_id: paymentIntentId,
        _amount_nanos: amountNanos,
        _reason: reason,
        _client_request_id: clientRequestId,
      });
      if (error) throw error;
      const refund = record(data);
      const refundId = typeof refund?.refundId === "string" ? refund.refundId : "";
      const externalPaymentId =
        typeof refund?.externalPaymentId === "string" ? refund.externalPaymentId : "";
      const amountMinor = typeof refund?.amountMinor === "number" ? refund.amountMinor : Number.NaN;
      if (!refundId || !externalPaymentId || !Number.isSafeInteger(amountMinor)) {
        throw new Error("The refund command returned an invalid settlement request.");
      }
      const { data: stored, error: storedError } = await clients.admin
        .from("io_refunds")
        .select("external_refund_id")
        .eq("id", refundId)
        .single();
      if (storedError) throw storedError;
      let externalRefundId = stored.external_refund_id;
      if (!externalRefundId) {
        const providerRefund = await razorpayRequest(
          `/payments/${encodeURIComponent(externalPaymentId)}/refund`,
          credentials.authorization,
          { amount: amountMinor, notes: { io_refund_id: refundId } },
        );
        externalRefundId = typeof providerRefund?.id === "string" ? providerRefund.id : "";
        if (!externalRefundId) throw new Error("Razorpay returned no refund identifier.");
        const { error: recordError } = await clients.admin.rpc("record_io_refund_submission", {
          _refund_id: refundId,
          _external_refund_id: externalRefundId,
        });
        if (recordError) throw recordError;
      }
      return json(request, {
        ok: true,
        provider: "razorpay",
        refundId,
        externalRefundId,
        state: externalRefundId ? "submitted" : refund?.state,
      });
    }

    return json(request, { ok: false, error: "Unsupported payment action." }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payment operation failed.";
    console.error("io-payments failure", message);
    return json(request, { ok: false, error: message }, 400);
  }
});

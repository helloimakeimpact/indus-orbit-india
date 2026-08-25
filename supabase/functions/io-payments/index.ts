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

type RazorpayEnvironment = "test" | "live";

type RazorpayCredentials = {
  environment: RazorpayEnvironment;
  keyId: string;
  keySecret: string;
  authorization: string;
};

function razorpayCredentials(environment: RazorpayEnvironment): RazorpayCredentials {
  const prefix = environment === "live" ? "RAZORPAY_LIVE" : "RAZORPAY_TEST";
  const legacyEnvironment = Deno.env.get("RAZORPAY_ENVIRONMENT")?.trim().toLowerCase();
  const keyId =
    Deno.env.get(`${prefix}_KEY_ID`)?.trim() ||
    (legacyEnvironment === environment ? Deno.env.get("RAZORPAY_KEY_ID")?.trim() : undefined);
  const keySecret =
    Deno.env.get(`${prefix}_KEY_SECRET`)?.trim() ||
    (legacyEnvironment === environment ? Deno.env.get("RAZORPAY_KEY_SECRET")?.trim() : undefined);
  if (!keyId || !keySecret) {
    throw new Error(`The approved Razorpay ${environment} credentials are not configured.`);
  }
  if (!keyId.startsWith(`rzp_${environment}_`)) {
    throw new Error(`The Razorpay key does not match the ${environment} environment.`);
  }
  return {
    environment,
    keyId,
    keySecret,
    authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`,
  };
}

async function razorpayRequest(
  method: "GET" | "POST",
  path: string,
  credentials: RazorpayCredentials,
  body?: JsonRecord,
  idempotencyKey?: string,
) {
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    method,
    headers: {
      Authorization: credentials.authorization,
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "X-Refund-Idempotency": idempotencyKey } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
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

function paymentEnvironment(value: unknown): RazorpayEnvironment {
  if (value !== "test" && value !== "live") {
    throw new Error("The payment intent has no valid processor environment.");
  }
  return value;
}

function orderReceipt(paymentIntentId: string) {
  return `io_${paymentIntentId.replaceAll("-", "").slice(0, 32)}`;
}

function validateOrder(
  value: JsonRecord | null,
  expected: { amountMinor: number; currencyCode: string; receipt: string },
) {
  const id = typeof value?.id === "string" ? value.id : "";
  const amount = typeof value?.amount === "number" ? value.amount : Number.NaN;
  const currency = typeof value?.currency === "string" ? value.currency.toUpperCase() : "";
  const receipt = typeof value?.receipt === "string" ? value.receipt : "";
  if (
    !/^order_[A-Za-z0-9]+$/.test(id) ||
    amount !== expected.amountMinor ||
    currency !== expected.currencyCode ||
    receipt !== expected.receipt
  ) {
    throw new Error("Razorpay returned order evidence that does not match the invoice.");
  }
  return id;
}

async function recoverOrder(
  credentials: RazorpayCredentials,
  expected: { amountMinor: number; currencyCode: string; receipt: string },
) {
  const payload = await razorpayRequest(
    "GET",
    `/orders?receipt=${encodeURIComponent(expected.receipt)}&count=10`,
    credentials,
  );
  const items = Array.isArray(payload?.items) ? payload.items.map(record).filter(Boolean) : [];
  if (items.length !== 1) {
    throw new Error("The payment order could not be recovered unambiguously.");
  }
  return validateOrder(items[0], expected);
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
        .select("external_order_id,provider_receipt,amount_minor,currency_code,environment")
        .eq("id", paymentIntentId)
        .single();
      if (storedError) throw storedError;
      const environment = paymentEnvironment(stored.environment);
      const credentials = razorpayCredentials(environment);
      const receipt = stored.provider_receipt || orderReceipt(paymentIntentId);
      let orderId = stored.external_order_id;
      if (!orderId) {
        const expected = {
          amountMinor: stored.amount_minor,
          currencyCode: stored.currency_code,
          receipt,
        };
        try {
          const order = await razorpayRequest("POST", "/orders", credentials, {
            amount: stored.amount_minor,
            currency: stored.currency_code,
            receipt,
            notes: { payment_intent_id: paymentIntentId },
          });
          orderId = validateOrder(order, expected);
        } catch (createError) {
          try {
            orderId = await recoverOrder(credentials, expected);
          } catch {
            throw createError;
          }
        }
        const { error: recordError } = await clients.admin.rpc("record_io_payment_order", {
          _payment_intent_id: paymentIntentId,
          _external_order_id: orderId,
          _provider_receipt: receipt,
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
        environment,
      });
    }

    if (action === "verify_checkout") {
      const paymentIntentId = requiredString(body, "paymentIntentId", /^[a-f0-9-]{36}$/i);
      const checkoutOrderId = requiredString(body, "orderId", /^order_[A-Za-z0-9]+$/);
      const checkoutPaymentId = requiredString(body, "paymentId", /^pay_[A-Za-z0-9]+$/);
      const checkoutSignature = requiredString(body, "signature", /^[a-f0-9]{64}$/i).toLowerCase();
      const { data, error } = await clients.authClient.rpc(
        "get_my_io_payment_verification_context",
        { _payment_intent_id: paymentIntentId },
      );
      if (error) throw error;
      const context = record(data);
      const storedOrderId = typeof context?.orderId === "string" ? context.orderId : "";
      if (
        context?.provider !== "razorpay" ||
        storedOrderId !== checkoutOrderId ||
        context?.paymentIntentId !== paymentIntentId
      ) {
        throw new Error("Checkout does not match the server payment order.");
      }
      const environment = paymentEnvironment(context.environment);
      const credentials = razorpayCredentials(environment);
      const expectedSignature = await hmacHex(
        credentials.keySecret,
        `${storedOrderId}|${checkoutPaymentId}`,
      );
      if (!equalHex(checkoutSignature, expectedSignature)) {
        throw new Error("Checkout signature verification failed.");
      }
      const { error: recordError } = await clients.admin.rpc("record_io_checkout_verification", {
        _payment_intent_id: paymentIntentId,
        _external_order_id: storedOrderId,
        _checkout_payment_id: checkoutPaymentId,
        _signature_sha256: await sha256Hex(checkoutSignature),
      });
      if (recordError) throw recordError;
      return json(request, {
        ok: true,
        paymentIntentId,
        state: context.state,
        settlementPending: context.state !== "captured",
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
      const environment = paymentEnvironment(refund?.environment);
      if (!refundId || !externalPaymentId || !Number.isSafeInteger(amountMinor)) {
        throw new Error("The refund command returned an invalid settlement request.");
      }
      const credentials = razorpayCredentials(environment);
      const { data: stored, error: storedError } = await clients.admin
        .from("io_refunds")
        .select("external_refund_id,state,currency_code,amount_minor")
        .eq("id", refundId)
        .single();
      if (storedError) throw storedError;
      let externalRefundId = stored.external_refund_id;
      let refundState = stored.state;
      if (!externalRefundId) {
        const providerRefund = await razorpayRequest(
          "POST",
          `/payments/${encodeURIComponent(externalPaymentId)}/refund`,
          credentials,
          { amount: amountMinor, notes: { io_refund_id: refundId } },
          `io_refund_${refundId.replaceAll("-", "")}`,
        );
        externalRefundId = typeof providerRefund?.id === "string" ? providerRefund.id : "";
        const returnedPaymentId =
          typeof providerRefund?.payment_id === "string" ? providerRefund.payment_id : "";
        const returnedAmount =
          typeof providerRefund?.amount === "number" ? providerRefund.amount : Number.NaN;
        const returnedCurrency =
          typeof providerRefund?.currency === "string" ? providerRefund.currency.toUpperCase() : "";
        if (
          !/^rfnd_[A-Za-z0-9]+$/.test(externalRefundId) ||
          returnedPaymentId !== externalPaymentId ||
          returnedAmount !== amountMinor ||
          returnedCurrency !== stored.currency_code
        ) {
          throw new Error("Razorpay returned refund evidence that does not match the request.");
        }
        const { data: submission, error: recordError } = await clients.admin.rpc(
          "record_io_refund_submission",
          {
            _refund_id: refundId,
            _external_refund_id: externalRefundId,
          },
        );
        if (recordError) throw recordError;
        const submissionEvidence = record(submission);
        refundState =
          typeof submissionEvidence?.state === "string" ? submissionEvidence.state : "submitted";
      }
      return json(request, {
        ok: true,
        provider: "razorpay",
        refundId,
        externalRefundId,
        state: externalRefundId ? refundState : refund?.state,
        environment,
      });
    }

    return json(request, { ok: false, error: "Unsupported payment action." }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payment operation failed.";
    console.error("io-payments failure", message);
    return json(request, { ok: false, error: message }, 400);
  }
});

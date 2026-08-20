import { corsHeaders as supabaseCorsHeaders } from "npm:@supabase/supabase-js@2/cors";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { authenticateGatewayActor, createGatewayClients } from "../_shared/io/auth.ts";
import { asGatewayError, GatewayError } from "../_shared/io/errors.ts";
import { calculateCostNanos, conservativeInputTokenBound } from "../_shared/io/operations.ts";
import {
  discoverProviderModel,
  loadConformanceProviderConnection,
  sendProviderChat,
} from "../_shared/io/provider-adapter.ts";
import type { GatewayMessage } from "../_shared/io/types.ts";

const allowedOrigins = new Set([
  "https://admin.indusorbit.com",
  "https://indusorbit.com",
  "https://www.indusorbit.com",
  "http://127.0.0.1:5174",
  "http://localhost:5174",
]);
const conformanceMessages: GatewayMessage[] = [
  { role: "system", content: "Return only the requested test token." },
  { role: "user", content: "Reply with exactly OK" },
];
const conformanceOutputTokens = 8;

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function corsHeaders(request: Request) {
  const origin = request.headers.get("origin");
  return {
    ...supabaseCorsHeaders,
    "Access-Control-Allow-Origin":
      origin && allowedOrigins.has(origin) ? origin : "https://admin.indusorbit.com",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function json(request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), "Content-Type": "application/json" },
  });
}

async function sha256Hex(value: unknown) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(value)),
  );
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function parseRequest(value: unknown) {
  const body = asRecord(value);
  const endpointId = typeof body?.endpointId === "string" ? body.endpointId : "";
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  const maxProviderCostNanos =
    typeof body?.maxProviderCostNanos === "number" ? body.maxProviderCostNanos : 10_000_000;
  if (!/^[a-f0-9-]{36}$/i.test(endpointId)) {
    throw new GatewayError("bad_request", 400, "A valid endpoint ID is required.");
  }
  if (reason.length < 8 || reason.length > 500) {
    throw new GatewayError(
      "bad_request",
      400,
      "A conformance reason between 8 and 500 characters is required.",
    );
  }
  if (
    !Number.isSafeInteger(maxProviderCostNanos) ||
    maxProviderCostNanos < 1 ||
    maxProviderCostNanos > 10_000_000
  ) {
    throw new GatewayError(
      "bad_request",
      400,
      "The provider cost cap must be no more than USD 0.01 for this suite.",
    );
  }
  return {
    endpointId,
    reason,
    maxProviderCostNanos,
    acknowledgeExternalProcessing: body?.acknowledgeExternalProcessing === true,
  };
}

async function finishConformance(
  admin: SupabaseClient,
  input: {
    runId: string;
    state: "passed" | "failed" | "cancelled";
    providerCostNanos: number;
    discoveryState: "passed" | "failed" | "unsupported";
    summary: JsonRecord;
    evidenceSha256: string;
  },
) {
  const { data, error } = await admin.rpc("io_finish_provider_conformance", {
    _run_id: input.runId,
    _run_state: input.state,
    _provider_cost_nanos: input.providerCostNanos,
    _discovery_state: input.discoveryState,
    _result_summary: input.summary,
    _evidence_sha256: input.evidenceSha256,
  });
  if (error) throw error;
  return asRecord(data);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(request) });
  if (request.method !== "POST") {
    return json(request, { ok: false, code: "bad_request", error: "Method not allowed." }, 405);
  }

  let runId: string | null = null;
  let admin: SupabaseClient | null = null;
  let discoveryState: "passed" | "failed" | "unsupported" = "failed";
  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization) throw new GatewayError("unauthorized", 401, "Missing authorization.");
    const input = parseRequest(await request.json());
    const clients = createGatewayClients(authorization);
    admin = clients.admin;
    await authenticateGatewayActor(clients.authClient);

    const { data: approvalData, error: approvalError } = await clients.authClient.rpc(
      "admin_io_begin_provider_conformance",
      {
        _endpoint_id: input.endpointId,
        _max_provider_cost_nanos: input.maxProviderCostNanos,
        _acknowledge_external_processing: input.acknowledgeExternalProcessing,
        _reason: input.reason,
      },
    );
    if (approvalError) throw approvalError;
    const approval = asRecord(approvalData);
    runId = typeof approval?.runId === "string" ? approval.runId : null;
    const suiteVersion = typeof approval?.suiteVersion === "string" ? approval.suiteVersion : null;
    if (!runId || !suiteVersion) {
      throw new GatewayError("internal_error", 500, "Conformance approval returned no run.");
    }

    const connection = await loadConformanceProviderConnection(admin, runId);
    const conservativeCostNanos = calculateCostNanos(
      connection,
      conservativeInputTokenBound(conformanceMessages),
      conformanceOutputTokens,
    );
    if (conservativeCostNanos > input.maxProviderCostNanos) {
      throw new GatewayError(
        "budget_exceeded",
        402,
        "The bounded conformance request would exceed its approved cost.",
      );
    }

    const discovery = await discoverProviderModel(connection);
    discoveryState = "passed";
    const startedAt = performance.now();
    const result = await sendProviderChat(connection, conformanceMessages, {
      maxOutputTokens: conformanceOutputTokens,
      safetySubject: `conformance:${runId}`,
    });
    const latencyMs = Math.max(0, Math.round(performance.now() - startedAt));
    const usageReported =
      result.usage.inputTokens !== undefined && result.usage.outputTokens !== undefined;
    const providerCostNanos = usageReported
      ? calculateCostNanos(connection, result.usage.inputTokens!, result.usage.outputTokens!)
      : conservativeCostNanos;
    const chatPassed = /^OK[.!]?$/i.test(result.content.trim());
    const summary = {
      suiteVersion,
      discoveryPassed: true,
      chatPassed,
      responseShapePassed: Boolean(result.content.trim()),
      usageReported,
      providerRequestIdPresent: Boolean(result.providerRequestId || discovery.providerRequestId),
      latencyMs,
      modelIdMatched: discovery.modelIdMatched,
      costWithinApproval: providerCostNanos <= input.maxProviderCostNanos,
      ...(!chatPassed
        ? { errorCode: "unexpected_test_token" }
        : !usageReported
          ? { errorCode: "usage_missing" }
          : !discovery.modelIdMatched
            ? { errorCode: "model_not_listed" }
            : {}),
    };
    const passed =
      chatPassed &&
      usageReported &&
      discovery.modelIdMatched &&
      providerCostNanos <= input.maxProviderCostNanos;
    const evidenceSha256 = await sha256Hex({
      runId,
      endpointId: connection.endpointId,
      providerKey: connection.providerKey,
      providerModelId: connection.providerModelId,
      providerCostNanos,
      summary,
    });
    const final = await finishConformance(admin, {
      runId,
      state: passed ? "passed" : "failed",
      providerCostNanos,
      discoveryState,
      summary,
      evidenceSha256,
    });
    return json(request, {
      ok: true,
      runId,
      state: final?.state ?? (passed ? "passed" : "failed"),
      providerKey: connection.providerKey,
      model: connection.providerModelId,
      providerCostNanos: String(providerCostNanos),
      discoveryPassed: true,
      chatPassed,
      usageReported,
      modelIdMatched: discovery.modelIdMatched,
      evidenceSha256,
    });
  } catch (error) {
    const gatewayError = asGatewayError(error);
    if (runId && admin) {
      const summary = {
        suiteVersion: "io-chat-v1",
        discoveryPassed: discoveryState === "passed",
        chatPassed: false,
        responseShapePassed: false,
        usageReported: false,
        providerRequestIdPresent: false,
        latencyMs: 0,
        modelIdMatched: false,
        costWithinApproval: true,
        errorCode: gatewayError.code,
      };
      const evidenceSha256 = await sha256Hex({ runId, summary });
      try {
        await finishConformance(admin, {
          runId,
          state: "failed",
          providerCostNanos: 0,
          discoveryState,
          summary,
          evidenceSha256,
        });
      } catch {
        console.error("io-provider-conformance finalization failed", runId);
      }
    }
    console.error("io-provider-conformance failure", gatewayError.code);
    return json(
      request,
      { ok: false, code: gatewayError.code, error: gatewayError.message, runId },
      gatewayError.status,
    );
  }
});

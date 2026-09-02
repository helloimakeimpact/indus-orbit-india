import { createGatewayAdminClient } from "../_shared/io/auth.ts";
import { GatewayError } from "../_shared/io/errors.ts";
import { recordEndpointProbe } from "../_shared/io/operations.ts";
import {
  loadProbeableProviderConnections,
  probeProviderConnection,
} from "../_shared/io/provider-adapter.ts";

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function serviceKeys() {
  const values: string[] = [];
  const configured = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (configured) {
    try {
      values.push(
        ...Object.values(JSON.parse(configured) as Record<string, unknown>).filter(
          (value): value is string => typeof value === "string",
        ),
      );
    } catch {
      console.error("SUPABASE_SECRET_KEYS is not valid JSON");
    }
  }
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) values.push(legacy);
  return values;
}

function suppliedKey(request: Request) {
  const apiKey = request.headers.get("apikey");
  if (apiKey) return apiKey;
  const authorization = request.headers.get("authorization");
  return authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
}

function probeErrorCode(error: unknown) {
  if (error instanceof GatewayError) {
    if (error.code === "not_configured") return "configuration_missing";
    if (error.code === "rate_limited") return "provider_rate_limited";
    if (error.upstreamStatus === 401 || error.upstreamStatus === 403)
      return "authentication_failed";
    if (error.upstreamStatus && error.upstreamStatus >= 500) return "provider_unavailable";
  }
  if (error instanceof DOMException && error.name === "TimeoutError") return "provider_timeout";
  return "provider_probe_failed";
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);
  const callerKey = suppliedKey(request);
  if (!callerKey || !serviceKeys().includes(callerKey))
    return json({ ok: false, error: "Service authentication required" }, 401);

  const admin = createGatewayAdminClient();
  let connections;
  try {
    connections = (await loadProbeableProviderConnections(admin)).slice(0, 20);
  } catch (error) {
    console.error("I/O health probe target load failed", error);
    return json({ ok: false, error: "Probe target load failed" }, 500);
  }

  let healthy = 0;
  let failed = 0;
  let recordingFailed = 0;
  for (const connection of connections) {
    const startedAt = performance.now();
    let succeeded = false;
    let errorCode: string | undefined;
    try {
      const result = await probeProviderConnection(connection);
      succeeded = result.modelIdMatched;
      if (!succeeded) errorCode = "model_not_listed";
    } catch (error) {
      errorCode = probeErrorCode(error);
    }
    const latencyMs = Math.max(0, Math.round(performance.now() - startedAt));
    try {
      await recordEndpointProbe(admin, {
        endpointId: connection.endpointId,
        succeeded,
        latencyMs,
        errorCode,
      });
      if (succeeded) healthy += 1;
      else failed += 1;
    } catch (error) {
      console.error("I/O health probe evidence failed", error);
      recordingFailed += 1;
    }
  }

  return json({
    ok: recordingFailed === 0,
    probed: connections.length,
    healthy,
    failed,
    recordingFailed,
  });
});

import { corsHeaders as supabaseCorsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { writeIoAuditEvent } from "../_shared/io/audit.ts";
import {
  authenticateGatewayActor,
  createGatewayClients,
  requireWorkspaceMembership,
} from "../_shared/io/auth.ts";
import { asGatewayError, GatewayError } from "../_shared/io/errors.ts";
import { requireActivePartnerEntitlement } from "../_shared/io/policy.ts";
import {
  readPartnerConfig,
  resolveLatestAffordableModel,
  sendOpenAiCompatibleChat,
} from "../_shared/io/provider-adapter.ts";
import type { PartnerResult } from "../_shared/io/types.ts";
import { parseGatewayRequest } from "../_shared/io/validation.ts";

const allowedOrigins = new Set([
  "https://indusorbit.com",
  "https://www.indusorbit.com",
  "http://127.0.0.1:5173",
  "http://localhost:5173",
  "http://127.0.0.1:5174",
  "http://localhost:5174",
]);

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
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), "Content-Type": "application/json" },
  });
}

async function parseRequestBody(request: Request) {
  try {
    return parseGatewayRequest(await request.json());
  } catch (error) {
    if (error instanceof GatewayError) throw error;
    throw new GatewayError("bad_request", 400, "Request body must be valid JSON.");
  }
}

function requestId() {
  return crypto.randomUUID();
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(request) });
  if (request.method !== "POST") {
    return json(request, { ok: false, code: "bad_request", error: "Method not allowed." }, 405);
  }

  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization) {
      throw new GatewayError("unauthorized", 401, "Missing authorization.");
    }

    const body = await parseRequestBody(request);
    const { authClient, admin } = createGatewayClients(authorization);
    const actor = await authenticateGatewayActor(authClient);
    await requireWorkspaceMembership(admin, body.workspaceId, actor.id);

    if (body.action === "status") {
      const configured = Boolean(readPartnerConfig());
      return json(request, {
        ok: true,
        partner: {
          configured,
          mode: configured ? "registry-selected" : "needs-server-secret",
          modelSelection: configured ? "latest-affordable" : null,
        },
        opencode: { mode: "local-direct", loopbackOnly: true },
      });
    }

    if (body.action === "record_local_opencode") {
      await writeIoAuditEvent(admin, {
        workspaceId: body.workspaceId,
        actorKind: "user",
        actorUserId: actor.id,
        eventType: "io.terminal.opencode.completed",
        requestId: requestId(),
        payload: {
          connector: "opencode",
          connector_origin: body.connectorOrigin!,
          session_id: body.sessionId!,
        },
      });
      return json(request, { ok: true });
    }

    const config = readPartnerConfig();
    if (!config) {
      throw new GatewayError(
        "not_configured",
        503,
        "Partner routing is awaiting secure provider configuration.",
      );
    }

    const entitlement = await requireActivePartnerEntitlement(admin, body.workspaceId);
    const id = requestId();
    const messages = body.messages!;
    const mode = body.mode ?? "plan";
    const selectedModel = await resolveLatestAffordableModel(admin, config, messages);

    await writeIoAuditEvent(admin, {
      workspaceId: body.workspaceId,
      actorKind: "user",
      actorUserId: actor.id,
      eventType: "io.partner.requested",
      requestId: id,
      payload: {
        capacity_source: entitlement.sourceKey,
        model: selectedModel.model,
        model_selection: selectedModel.strategy,
        model_tier: selectedModel.tier,
        model_release_date: selectedModel.releasedAt,
        model_candidate_count: selectedModel.candidateCount,
        mode,
        message_count: messages.length,
        character_count: messages.reduce((sum, message) => sum + message.content.length, 0),
      },
    });

    let result: PartnerResult;
    try {
      result = await sendOpenAiCompatibleChat(config, selectedModel.model, messages);
    } catch (error) {
      const gatewayError = asGatewayError(error);
      try {
        await writeIoAuditEvent(admin, {
          workspaceId: body.workspaceId,
          actorKind: "provider",
          eventType: "io.partner.failed",
          requestId: id,
          payload: {
            capacity_source: entitlement.sourceKey,
            model: selectedModel.model,
            model_selection: selectedModel.strategy,
            status: gatewayError.status,
            code: gatewayError.code,
          },
        });
      } catch (auditError) {
        console.error(
          "io-gateway failure audit",
          auditError instanceof Error ? auditError.message : "unknown",
        );
      }
      throw gatewayError;
    }

    await writeIoAuditEvent(admin, {
      workspaceId: body.workspaceId,
      actorKind: "provider",
      eventType: "io.partner.completed",
      requestId: id,
      payload: {
        capacity_source: entitlement.sourceKey,
        model: selectedModel.model,
        model_selection: selectedModel.strategy,
        input_tokens: result.usage.inputTokens ?? null,
        output_tokens: result.usage.outputTokens ?? null,
      },
    });

    return json(request, {
      ok: true,
      requestId: id,
      provider: entitlement.displayName,
      model: selectedModel.model,
      modelSelection: selectedModel.strategy,
      content: result.content,
      usage: result.usage,
      capacitySource: entitlement.sourceKey,
    });
  } catch (error) {
    const gatewayError = asGatewayError(error);
    console.error("io-gateway failure", gatewayError.code, gatewayError.message);
    return json(
      request,
      { ok: false, code: gatewayError.code, error: gatewayError.message },
      gatewayError.status,
    );
  }
});

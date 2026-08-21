import { GatewayError } from "./errors.ts";
import type {
  GatewayAction,
  GatewayMessage,
  GatewayMode,
  GatewayRequest,
  RouteStrategy,
} from "./types.ts";

const actions = new Set<GatewayAction>(["partner_chat", "preflight", "catalog", "status"]);
const modes = new Set<GatewayMode>(["observe", "plan", "build", "run"]);
const routeStrategies = new Set<RouteStrategy>([
  "latest_affordable",
  "lowest_cost",
  "explicit_model",
]);
const messageRoles = new Set<GatewayMessage["role"]>(["system", "user", "assistant"]);
const workspaceIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const idempotencyKeyPattern = /^[A-Za-z0-9][A-Za-z0-9_.:-]{7,127}$/;

function asRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new GatewayError("bad_request", 400, "Request body must be an object.");
  }
  return value as Record<string, unknown>;
}

function requireWorkspaceId(value: unknown) {
  if (typeof value !== "string" || !workspaceIdPattern.test(value)) {
    throw new GatewayError("bad_request", 400, "A valid I/O workspace ID is required.");
  }
  return value;
}

function readMode(value: unknown): GatewayMode | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !modes.has(value as GatewayMode)) {
    throw new GatewayError("bad_request", 400, "Mode must be observe, plan, build, or run.");
  }
  return value as GatewayMode;
}

function readRouteStrategy(value: unknown): RouteStrategy | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !routeStrategies.has(value as RouteStrategy)) {
    throw new GatewayError(
      "bad_request",
      400,
      "Route strategy must be latest_affordable, lowest_cost, or explicit_model.",
    );
  }
  return value as RouteStrategy;
}

function readRequestedModelId(value: unknown) {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !workspaceIdPattern.test(value)) {
    throw new GatewayError("bad_request", 400, "Requested model ID must be a UUID.");
  }
  return value;
}

export function requireIdempotencyKey(value: unknown) {
  if (typeof value !== "string" || !idempotencyKeyPattern.test(value)) {
    throw new GatewayError(
      "bad_request",
      400,
      "A valid idempotency key between 8 and 128 characters is required.",
    );
  }
  return value;
}

export function requireMessages(value: unknown): GatewayMessage[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 24) {
    throw new GatewayError("bad_request", 400, "Provide between 1 and 24 messages.");
  }

  const messages = value.map((message) => {
    const candidate = asRecord(message);
    if (
      typeof candidate.role !== "string" ||
      !messageRoles.has(candidate.role as GatewayMessage["role"]) ||
      typeof candidate.content !== "string" ||
      !candidate.content.trim() ||
      candidate.content.length > 8_000
    ) {
      throw new GatewayError(
        "bad_request",
        400,
        "Messages must have a supported role and non-empty content up to 8,000 characters.",
      );
    }

    return {
      role: candidate.role as GatewayMessage["role"],
      content: candidate.content.trim(),
    };
  });

  if (messages.reduce((sum, message) => sum + message.content.length, 0) > 24_000) {
    throw new GatewayError(
      "bad_request",
      400,
      "The total input exceeds the 24,000 character limit.",
    );
  }

  return messages;
}

export function parseGatewayRequest(value: unknown): GatewayRequest {
  const body = asRecord(value);
  if (typeof body.action !== "string" || !actions.has(body.action as GatewayAction)) {
    throw new GatewayError("bad_request", 400, "A supported gateway action is required.");
  }

  const action = body.action as GatewayAction;
  const request: GatewayRequest = {
    action,
    workspaceId: requireWorkspaceId(body.workspace_id),
    mode: readMode(body.mode),
    routeStrategy: readRouteStrategy(body.route_strategy),
    requestedModelId: readRequestedModelId(body.requested_model_id),
  };

  if (action === "partner_chat" || action === "preflight") {
    if (action === "partner_chat") {
      request.idempotencyKey = requireIdempotencyKey(body.idempotency_key);
    }
    request.messages = requireMessages(body.messages);
    if (request.routeStrategy === "explicit_model" && !request.requestedModelId) {
      throw new GatewayError(
        "bad_request",
        400,
        "An explicit model route requires a requested model ID.",
      );
    }
    if (request.requestedModelId && request.routeStrategy !== "explicit_model") {
      throw new GatewayError(
        "bad_request",
        400,
        "A requested model ID requires the explicit_model route strategy.",
      );
    }
  }
  return request;
}

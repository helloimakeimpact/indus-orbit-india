import { GatewayError } from "./errors.ts";
import type {
  GatewayAction,
  GatewayMessage,
  GatewayMode,
  GatewayRequest,
  RouteStrategy,
} from "./types.ts";

const actions = new Set<GatewayAction>([
  "partner_chat",
  "catalog",
  "record_local_opencode",
  "status",
]);
const modes = new Set<GatewayMode>(["observe", "plan", "build", "run"]);
const routeStrategies = new Set<RouteStrategy>([
  "latest_affordable",
  "lowest_cost",
  "explicit_model",
]);
const messageRoles = new Set<GatewayMessage["role"]>(["system", "user", "assistant"]);
const workspaceIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

export function requireLocalOpenCodeOrigin(value: unknown) {
  if (typeof value !== "string") {
    throw new GatewayError("bad_request", 400, "A local OpenCode connector URL is required.");
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new GatewayError("bad_request", 400, "A valid local OpenCode connector URL is required.");
  }

  const localHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
  if (
    url.protocol !== "http:" ||
    !localHosts.has(url.hostname) ||
    url.username ||
    url.password ||
    (url.pathname !== "/" && url.pathname !== "") ||
    url.search ||
    url.hash
  ) {
    throw new GatewayError(
      "bad_request",
      400,
      "Only a credential-free loopback connector is allowed.",
    );
  }

  return url.origin;
}

export function requireSessionId(value: unknown) {
  if (typeof value !== "string" || !value.trim() || value.length > 512) {
    throw new GatewayError("bad_request", 400, "A local OpenCode session ID is required.");
  }
  return value.trim();
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

  if (action === "partner_chat") {
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
  if (action === "record_local_opencode") {
    request.connectorOrigin = requireLocalOpenCodeOrigin(body.connector_origin);
    request.sessionId = requireSessionId(body.session_id);
  }

  return request;
}

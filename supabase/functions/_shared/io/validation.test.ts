import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GatewayError } from "./errors.ts";
import { parseGatewayRequest, requireMessages } from "./validation.ts";

const workspaceId = "018f7f5b-9c4c-4f1f-8b48-7b15108f1234";

describe("gateway request validation", () => {
  it("accepts a bounded partner request", () => {
    const result = parseGatewayRequest({
      action: "partner_chat",
      workspace_id: workspaceId,
      idempotency_key: "request:test-1234",
      mode: "plan",
      messages: [{ role: "user", content: "  Plan safely.  " }],
    });
    assert.equal(result.messages?.[0].content, "Plan safely.");

    const preflight = parseGatewayRequest({
      action: "preflight",
      workspace_id: workspaceId,
      mode: "plan",
      messages: [{ role: "user", content: "Explain the route." }],
      route_strategy: "lowest_cost",
    });
    assert.equal(preflight.action, "preflight");
    assert.equal(preflight.idempotencyKey, undefined);
    assert.equal(preflight.messages?.[0].content, "Explain the route.");
  });

  it("rejects malformed actions, workspaces, modes and explicit routes", () => {
    for (const body of [
      { action: "unknown", workspace_id: workspaceId },
      { action: "status", workspace_id: "not-a-uuid" },
      { action: "status", workspace_id: workspaceId, mode: "unsafe" },
      {
        action: "partner_chat",
        workspace_id: workspaceId,
        idempotency_key: "request:test-1234",
        route_strategy: "explicit_model",
        messages: [{ role: "user", content: "x" }],
      },
    ]) {
      assert.throws(
        () => parseGatewayRequest(body),
        (error: unknown) => error instanceof GatewayError && error.code === "bad_request",
      );
    }

    assert.throws(
      () =>
        parseGatewayRequest({
          action: "partner_chat",
          workspace_id: workspaceId,
          messages: [{ role: "user", content: "x" }],
        }),
      /idempotency key/,
    );
  });

  it("enforces message count, per-message and total limits", () => {
    assert.throws(() => requireMessages([]), /between 1 and 24/);
    assert.throws(
      () => requireMessages([{ role: "user", content: "x".repeat(8_001) }]),
      /up to 8,000/,
    );
    assert.throws(
      () =>
        requireMessages([
          { role: "user", content: "x".repeat(8_000) },
          { role: "user", content: "x".repeat(8_000) },
          { role: "user", content: "x".repeat(8_000) },
          { role: "user", content: "x" },
        ]),
      /24,000 character/,
    );
  });
});

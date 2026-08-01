import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GatewayError } from "./errors.ts";
import { parseGatewayRequest, requireLocalOpenCodeOrigin, requireMessages } from "./validation.ts";

const workspaceId = "018f7f5b-9c4c-4f1f-8b48-7b15108f1234";

describe("gateway request validation", () => {
  it("accepts a bounded partner request", () => {
    const result = parseGatewayRequest({
      action: "partner_chat",
      workspace_id: workspaceId,
      mode: "plan",
      messages: [{ role: "user", content: "  Plan safely.  " }],
    });
    assert.equal(result.messages?.[0].content, "Plan safely.");
  });

  it("rejects malformed actions, workspaces, modes and explicit routes", () => {
    for (const body of [
      { action: "unknown", workspace_id: workspaceId },
      { action: "status", workspace_id: "not-a-uuid" },
      { action: "status", workspace_id: workspaceId, mode: "unsafe" },
      {
        action: "partner_chat",
        workspace_id: workspaceId,
        route_strategy: "explicit_model",
        messages: [{ role: "user", content: "x" }],
      },
    ]) {
      assert.throws(
        () => parseGatewayRequest(body),
        (error: unknown) => error instanceof GatewayError && error.code === "bad_request",
      );
    }
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

  it("accepts only credential-free loopback root origins", () => {
    assert.equal(requireLocalOpenCodeOrigin("http://[::1]:4096/"), "http://[::1]:4096");
    for (const value of [
      "https://localhost:4096",
      "http://user@localhost:4096",
      "http://localhost:4096/session",
      "http://localhost:4096/?secret=x",
      "http://example.com:4096",
    ]) {
      assert.throws(() => requireLocalOpenCodeOrigin(value), /credential-free loopback/);
    }
  });
});

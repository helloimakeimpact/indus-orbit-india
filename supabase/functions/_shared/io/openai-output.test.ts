import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { RouteExecutionSuccess } from "./route-execution.ts";
import type { RouteExecutionStream, SettledRouteStreamEvent } from "./route-stream.ts";
import {
  chatCompletionLiveStream,
  chatCompletionStream,
  responsesLiveStream,
  responsesStream,
} from "./openai-output.ts";

const result: RouteExecutionSuccess = {
  replayed: false,
  requestId: "00000000-0000-4000-8000-000000000001",
  receiptId: "receipt-test",
  provider: "Fixture provider",
  model: "fixture-model",
  modelSelection: "latest_affordable",
  content: "Fixture response",
  message: {
    role: "assistant",
    content: "Fixture response",
    toolCalls: [
      {
        id: "call_test",
        type: "function",
        function: { name: "lookup", arguments: '{"id":"test"}' },
      },
    ],
  },
  finishReason: "tool_calls",
  usage: { inputTokens: 10, outputTokens: 4, cachedInputTokens: 2 },
  capacitySource: "partner",
  route: {
    providerKey: "fixture",
    modelId: "model-test",
    endpointKey: "endpoint-test",
    capacityMode: "direct_api",
    regionCode: null,
    residencyCountryCode: null,
    retentionClass: "default",
    estimatedCostNanos: 10,
    currencyCode: "USD",
    settledMinor: 1,
    releasedMinor: 0,
    providerCostNanos: 10,
    serviceFeeNanos: 1,
    customerChargeNanos: 11,
    serviceFeeBasisPoints: 550,
    costBasis: "provider_usage",
    fallbackCount: 0,
  },
};

async function body(response: Response) {
  assert.equal(response.headers.get("content-type"), "text/event-stream; charset=utf-8");
  return response.text();
}

function liveRoute(): RouteExecutionStream {
  const events: SettledRouteStreamEvent[] = [
    { type: "content_delta", delta: "Fixture " },
    { type: "content_delta", delta: "response" },
    { type: "tool_call_delta", index: 0, id: "call_test", name: "lookup" },
    { type: "tool_call_delta", index: 0, arguments: '{"id":"test"}' },
    { type: "completed", result },
  ];
  return {
    replayed: false,
    requestId: result.requestId,
    provider: result.provider,
    model: result.model,
    modelSelection: result.modelSelection,
    capacitySource: result.capacitySource,
    serviceFeeBasisPoints: 550,
    providerKey: "fixture",
    events: new ReadableStream({
      start(controller) {
        for (const event of events) controller.enqueue(event);
        controller.close();
      },
    }),
  };
}

describe("OpenAI-compatible stream output", () => {
  it("emits chat usage followed by the terminal sentinel", async () => {
    const stream = await body(chatCompletionStream(result, "io/latest-affordable", true, {}));
    assert.match(stream, /"role":"assistant"/);
    assert.match(stream, /"tool_calls"/);
    assert.match(stream, /"prompt_tokens":10/);
    assert.ok(stream.endsWith("data: [DONE]\n\n"));
  });

  it("emits the ordered Responses lifecycle and terminal usage", async () => {
    const stream = await body(responsesStream(result, "io/latest-affordable", {}));
    const expected = [
      "response.created",
      "response.in_progress",
      "response.output_item.added",
      "response.content_part.added",
      "response.output_text.delta",
      "response.output_text.done",
      "response.content_part.done",
      "response.output_item.done",
      "response.function_call_arguments.delta",
      "response.function_call_arguments.done",
      "response.completed",
    ];
    let cursor = -1;
    for (const event of expected) {
      const next = stream.indexOf(`event: ${event}`, cursor + 1);
      assert.ok(next > cursor, `${event} must follow the preceding lifecycle event`);
      cursor = next;
    }
    assert.match(stream, /"input_tokens":10/);
    assert.match(stream, /"output_tokens":4/);
  });

  it("forwards live Chat deltas before settlement and usage", async () => {
    const stream = await body(
      chatCompletionLiveStream(liveRoute(), "io/latest-affordable", true, {}),
    );
    assert.ok(stream.indexOf('"content":"Fixture "') < stream.indexOf('"content":"response"'));
    assert.ok(stream.indexOf('"content":"response"') < stream.indexOf('"prompt_tokens":10'));
    assert.ok(stream.endsWith("data: [DONE]\n\n"));
  });

  it("forwards live Responses deltas through the completed receipt boundary", async () => {
    const stream = await body(responsesLiveStream(liveRoute(), "io/latest-affordable", {}));
    assert.ok(
      stream.indexOf("event: response.output_text.delta") <
        stream.indexOf("event: response.output_text.done"),
    );
    assert.ok(
      stream.indexOf("event: response.function_call_arguments.delta") <
        stream.indexOf("event: response.function_call_arguments.done"),
    );
    assert.ok(stream.indexOf('"delta":"Fixture "') < stream.indexOf("event: response.completed"));
    assert.match(stream, /"status":"completed"/);
  });
});

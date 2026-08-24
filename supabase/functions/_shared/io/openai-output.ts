import type { RouteExecutionSuccess } from "./route-execution.ts";

type OutputHeaders = Record<string, string>;

function usage(result: RouteExecutionSuccess) {
  const promptTokens = result.usage.inputTokens ?? 0;
  const completionTokens = result.usage.outputTokens ?? 0;
  return {
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: promptTokens + completionTokens,
    ...(result.usage.cachedInputTokens !== undefined
      ? { prompt_tokens_details: { cached_tokens: result.usage.cachedInputTokens } }
      : {}),
  };
}

function chunks(value: string, size = 96) {
  const result: string[] = [];
  for (let index = 0; index < value.length; index += size)
    result.push(value.slice(index, index + size));
  return result;
}

function eventStream(frames: string[], headers: OutputHeaders) {
  const encoder = new TextEncoder();
  let index = 0;
  return new Response(
    new ReadableStream<Uint8Array>({
      pull(controller) {
        const frame = frames[index++];
        if (frame === undefined) {
          controller.close();
          return;
        }
        controller.enqueue(encoder.encode(frame));
      },
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
        ...headers,
      },
    },
  );
}

export function chatCompletionBody(result: RouteExecutionSuccess, requestedModel: string) {
  return {
    id: `chatcmpl-${result.requestId.replaceAll("-", "")}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1_000),
    model: requestedModel,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: result.message.content,
          ...(result.message.toolCalls?.length
            ? {
                tool_calls: result.message.toolCalls.map((call) => ({
                  id: call.id,
                  type: call.type,
                  function: call.function,
                })),
              }
            : {}),
        },
        finish_reason: result.finishReason,
      },
    ],
    usage: usage(result),
  };
}

export function chatCompletionStream(
  result: RouteExecutionSuccess,
  requestedModel: string,
  includeUsage: boolean,
  headers: OutputHeaders,
) {
  const id = `chatcmpl-${result.requestId.replaceAll("-", "")}`;
  const created = Math.floor(Date.now() / 1_000);
  const frame = (body: unknown) => `data: ${JSON.stringify(body)}\n\n`;
  const frames = [
    frame({
      id,
      object: "chat.completion.chunk",
      created,
      model: requestedModel,
      choices: [{ index: 0, delta: { role: "assistant" }, finish_reason: null }],
    }),
    ...chunks(result.message.content ?? "").map((content) =>
      frame({
        id,
        object: "chat.completion.chunk",
        created,
        model: requestedModel,
        choices: [{ index: 0, delta: { content }, finish_reason: null }],
      }),
    ),
    ...(result.message.toolCalls ?? []).map((call, index) =>
      frame({
        id,
        object: "chat.completion.chunk",
        created,
        model: requestedModel,
        choices: [
          {
            index: 0,
            delta: {
              tool_calls: [
                {
                  index,
                  id: call.id,
                  type: call.type,
                  function: call.function,
                },
              ],
            },
            finish_reason: null,
          },
        ],
      }),
    ),
    frame({
      id,
      object: "chat.completion.chunk",
      created,
      model: requestedModel,
      choices: [{ index: 0, delta: {}, finish_reason: result.finishReason }],
    }),
    ...(includeUsage
      ? [
          frame({
            id,
            object: "chat.completion.chunk",
            created,
            model: requestedModel,
            choices: [],
            usage: usage(result),
          }),
        ]
      : []),
    "data: [DONE]\n\n",
  ];
  return eventStream(frames, headers);
}

function responsesOutput(result: RouteExecutionSuccess) {
  return [
    ...(result.message.content
      ? [
          {
            type: "message",
            id: `msg_${result.requestId.replaceAll("-", "")}`,
            status: "completed",
            role: "assistant",
            content: [
              { type: "output_text", text: result.message.content, annotations: [], logprobs: [] },
            ],
          },
        ]
      : []),
    ...(result.message.toolCalls ?? []).map((call) => ({
      type: "function_call",
      id: `fc_${call.id}`,
      call_id: call.id,
      name: call.function.name,
      arguments: call.function.arguments,
      status: "completed",
    })),
  ];
}

export function responsesBody(result: RouteExecutionSuccess, requestedModel: string) {
  const inputTokens = result.usage.inputTokens ?? 0;
  const outputTokens = result.usage.outputTokens ?? 0;
  return {
    id: `resp_${result.requestId.replaceAll("-", "")}`,
    object: "response",
    created_at: Math.floor(Date.now() / 1_000),
    status: "completed",
    model: requestedModel,
    output: responsesOutput(result),
    parallel_tool_calls: true,
    store: false,
    usage: {
      input_tokens: inputTokens,
      input_tokens_details: { cached_tokens: result.usage.cachedInputTokens ?? 0 },
      output_tokens: outputTokens,
      output_tokens_details: { reasoning_tokens: 0 },
      total_tokens: inputTokens + outputTokens,
    },
  };
}

export function responsesStream(
  result: RouteExecutionSuccess,
  requestedModel: string,
  headers: OutputHeaders,
) {
  const response = responsesBody(result, requestedModel);
  const sequence = { value: 0 };
  const frame = (type: string, body: Record<string, unknown>) => {
    const event = { type, sequence_number: sequence.value++, ...body };
    return `event: ${type}\ndata: ${JSON.stringify(event)}\n\n`;
  };
  const output = response.output;
  const messageIndex = output.findIndex((item) => item.type === "message");
  const frames = [
    frame("response.created", { response: { ...response, status: "in_progress", output: [] } }),
    ...(messageIndex >= 0
      ? [
          frame("response.output_item.added", {
            output_index: messageIndex,
            item: { ...output[messageIndex], status: "in_progress", content: [] },
          }),
          ...chunks(result.message.content ?? "").map((delta) =>
            frame("response.output_text.delta", {
              item_id: output[messageIndex].id,
              output_index: messageIndex,
              content_index: 0,
              delta,
            }),
          ),
          frame("response.output_text.done", {
            item_id: output[messageIndex].id,
            output_index: messageIndex,
            content_index: 0,
            text: result.message.content ?? "",
          }),
          frame("response.output_item.done", {
            output_index: messageIndex,
            item: output[messageIndex],
          }),
        ]
      : []),
    ...output.flatMap((item, outputIndex) =>
      item.type === "function_call"
        ? [
            frame("response.output_item.added", {
              output_index: outputIndex,
              item: { ...item, status: "in_progress", arguments: "" },
            }),
            frame("response.function_call_arguments.delta", {
              item_id: item.id,
              output_index: outputIndex,
              delta: item.arguments,
            }),
            frame("response.function_call_arguments.done", {
              item_id: item.id,
              output_index: outputIndex,
              arguments: item.arguments,
            }),
            frame("response.output_item.done", { output_index: outputIndex, item }),
          ]
        : [],
    ),
    frame("response.completed", { response }),
  ];
  return eventStream(frames, headers);
}

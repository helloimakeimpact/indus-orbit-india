import type { RouteExecutionSuccess } from "./route-execution.ts";
import type { RouteExecutionStream, SettledRouteStreamEvent } from "./route-stream.ts";

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

function streamingResponse(
  source: ReadableStream<SettledRouteStreamEvent>,
  initialFrames: string[],
  map: (event: SettledRouteStreamEvent) => { frames: string[]; terminal?: boolean },
  headers: OutputHeaders,
) {
  const encoder = new TextEncoder();
  const reader = source.getReader();
  const pending = [...initialFrames];
  let terminal = false;
  return new Response(
    new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          if (pending.length === 0 && !terminal) {
            const next = await reader.read();
            if (next.done) throw new Error("The settled route stream ended unexpectedly.");
            const mapped = map(next.value);
            pending.push(...mapped.frames);
            terminal = mapped.terminal === true;
          }
          const frame = pending.shift();
          if (frame !== undefined) controller.enqueue(encoder.encode(frame));
          if (terminal && pending.length === 0) controller.close();
        } catch (error) {
          await reader.cancel(error).catch(() => undefined);
          controller.error(error);
        }
      },
      async cancel(reason) {
        await reader.cancel(reason).catch(() => undefined);
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

export function chatCompletionLiveStream(
  route: RouteExecutionStream,
  requestedModel: string,
  includeUsage: boolean,
  headers: OutputHeaders,
) {
  const id = `chatcmpl-${route.requestId.replaceAll("-", "")}`;
  const created = Math.floor(Date.now() / 1_000);
  const frame = (body: unknown) => `data: ${JSON.stringify(body)}\n\n`;
  return streamingResponse(
    route.events,
    [
      frame({
        id,
        object: "chat.completion.chunk",
        created,
        model: requestedModel,
        choices: [{ index: 0, delta: { role: "assistant" }, finish_reason: null }],
      }),
    ],
    (event) => {
      if (event.type === "content_delta") {
        return {
          frames: [
            frame({
              id,
              object: "chat.completion.chunk",
              created,
              model: requestedModel,
              choices: [{ index: 0, delta: { content: event.delta }, finish_reason: null }],
            }),
          ],
        };
      }
      if (event.type === "tool_call_delta") {
        return {
          frames: [
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
                        index: event.index,
                        ...(event.id ? { id: event.id, type: "function" } : {}),
                        ...(event.name || event.arguments
                          ? {
                              function: {
                                ...(event.name ? { name: event.name } : {}),
                                ...(event.arguments ? { arguments: event.arguments } : {}),
                              },
                            }
                          : {}),
                      },
                    ],
                  },
                  finish_reason: null,
                },
              ],
            }),
          ],
        };
      }
      const result = event.result;
      return {
        terminal: true,
        frames: [
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
        ],
      };
    },
    headers,
  );
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
  const inProgressResponse = { ...response, status: "in_progress", output: [] };
  const frames = [
    frame("response.created", { response: inProgressResponse }),
    frame("response.in_progress", { response: inProgressResponse }),
    ...(messageIndex >= 0
      ? [
          frame("response.output_item.added", {
            output_index: messageIndex,
            item: { ...output[messageIndex], status: "in_progress", content: [] },
          }),
          frame("response.content_part.added", {
            item_id: output[messageIndex].id,
            output_index: messageIndex,
            content_index: 0,
            part: { type: "output_text", text: "", annotations: [], logprobs: [] },
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
          frame("response.content_part.done", {
            item_id: output[messageIndex].id,
            output_index: messageIndex,
            content_index: 0,
            part: output[messageIndex].content[0],
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

export function responsesLiveStream(
  route: RouteExecutionStream,
  requestedModel: string,
  headers: OutputHeaders,
) {
  const responseId = `resp_${route.requestId.replaceAll("-", "")}`;
  const messageId = `msg_${route.requestId.replaceAll("-", "")}`;
  const sequence = { value: 0 };
  const frame = (type: string, body: Record<string, unknown>) => {
    const event = { type, sequence_number: sequence.value++, ...body };
    return `event: ${type}\ndata: ${JSON.stringify(event)}\n\n`;
  };
  const shell = {
    id: responseId,
    object: "response",
    created_at: Math.floor(Date.now() / 1_000),
    status: "in_progress",
    model: requestedModel,
    output: [],
    parallel_tool_calls: true,
    store: false,
  };
  let messageStarted = false;
  let toolFirst = false;
  const toolState = new Map<
    number,
    { id: string; name: string; arguments: string; started: boolean }
  >();
  const toolOutputIndex = (index: number) => (messageStarted ? index + 1 : index);
  return streamingResponse(
    route.events,
    [
      frame("response.created", { response: shell }),
      frame("response.in_progress", { response: shell }),
    ],
    (event) => {
      if (event.type === "content_delta") {
        if (toolFirst) throw new Error("Mixed provider stream output order is unsupported.");
        const frames: string[] = [];
        if (!messageStarted) {
          messageStarted = true;
          frames.push(
            frame("response.output_item.added", {
              output_index: 0,
              item: {
                type: "message",
                id: messageId,
                status: "in_progress",
                role: "assistant",
                content: [],
              },
            }),
            frame("response.content_part.added", {
              item_id: messageId,
              output_index: 0,
              content_index: 0,
              part: { type: "output_text", text: "", annotations: [], logprobs: [] },
            }),
          );
        }
        frames.push(
          frame("response.output_text.delta", {
            item_id: messageId,
            output_index: 0,
            content_index: 0,
            delta: event.delta,
          }),
        );
        return { frames };
      }
      if (event.type === "tool_call_delta") {
        if (!messageStarted) toolFirst = true;
        const current = toolState.get(event.index) ?? {
          id: "",
          name: "",
          arguments: "",
          started: false,
        };
        current.id += event.id ?? "";
        current.name += event.name ?? "";
        current.arguments += event.arguments ?? "";
        const frames: string[] = [];
        if (!current.started && current.id && current.name) {
          current.started = true;
          frames.push(
            frame("response.output_item.added", {
              output_index: toolOutputIndex(event.index),
              item: {
                type: "function_call",
                id: `fc_${current.id}`,
                call_id: current.id,
                name: current.name,
                arguments: "",
                status: "in_progress",
              },
            }),
          );
        }
        if (current.started && event.arguments) {
          frames.push(
            frame("response.function_call_arguments.delta", {
              item_id: `fc_${current.id}`,
              output_index: toolOutputIndex(event.index),
              delta: event.arguments,
            }),
          );
        }
        toolState.set(event.index, current);
        return { frames };
      }
      const result = event.result;
      const response = responsesBody(result, requestedModel);
      const frames: string[] = [];
      const message = response.output.find((item) => item.type === "message");
      if (messageStarted && message?.type === "message") {
        frames.push(
          frame("response.output_text.done", {
            item_id: messageId,
            output_index: 0,
            content_index: 0,
            text: result.message.content ?? "",
          }),
          frame("response.content_part.done", {
            item_id: messageId,
            output_index: 0,
            content_index: 0,
            part: message.content[0],
          }),
          frame("response.output_item.done", { output_index: 0, item: message }),
        );
      }
      for (const [index, call] of (result.message.toolCalls ?? []).entries()) {
        const state = toolState.get(index);
        const outputIndex = messageStarted ? index + 1 : index;
        const item = response.output.find(
          (candidate) => candidate.type === "function_call" && candidate.call_id === call.id,
        );
        if (!item || item.type !== "function_call") continue;
        if (!state?.started) {
          frames.push(
            frame("response.output_item.added", {
              output_index: outputIndex,
              item: { ...item, status: "in_progress", arguments: "" },
            }),
          );
        }
        frames.push(
          frame("response.function_call_arguments.done", {
            item_id: item.id,
            output_index: outputIndex,
            arguments: call.function.arguments,
          }),
          frame("response.output_item.done", { output_index: outputIndex, item }),
        );
      }
      frames.push(frame("response.completed", { response }));
      return { frames, terminal: true };
    },
    headers,
  );
}

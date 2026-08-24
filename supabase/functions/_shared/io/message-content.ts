import type { GatewayMessage, GatewayMessageContent } from "./types.ts";

export function gatewayContentText(content: GatewayMessageContent | null) {
  if (content === null) return "";
  if (typeof content === "string") return content;
  return content
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n");
}

export function gatewayMessageWeight(message: GatewayMessage) {
  const text = gatewayContentText(message.content);
  const mediaWeight = Array.isArray(message.content)
    ? message.content.filter((part) => part.type === "image_url").length * 1_024
    : 0;
  const toolWeight = JSON.stringify(message.toolCalls ?? []).length;
  return text.length + mediaWeight + toolWeight + (message.name?.length ?? 0);
}

export function gatewayMessageBytes(message: GatewayMessage) {
  if (typeof message.content === "string" && !message.toolCalls?.length) {
    return new TextEncoder().encode(message.content).byteLength;
  }
  return new TextEncoder().encode(JSON.stringify(message)).byteLength;
}

export function toOpenAiCompatibleMessage(message: GatewayMessage) {
  return {
    role: message.role,
    content: Array.isArray(message.content)
      ? message.content.map((part) =>
          part.type === "text"
            ? { type: "text", text: part.text }
            : {
                type: "image_url",
                image_url: { url: part.imageUrl, ...(part.detail ? { detail: part.detail } : {}) },
              },
        )
      : message.content,
    ...(message.name ? { name: message.name } : {}),
    ...(message.toolCallId ? { tool_call_id: message.toolCallId } : {}),
    ...(message.toolCalls ? { tool_calls: message.toolCalls } : {}),
  };
}

export type OpenCodeRunResult = {
  connectorOrigin: string;
  sessionId: string;
  title: string;
  content: string;
  serverVersion: string | null;
};

export type OpenCodeSessionReference = {
  connectorOrigin: string;
  sessionId: string;
  title: string;
  serverVersion: string | null;
};

export type OpenCodeMetadataEvent =
  | {
      type: "runtime.connected";
      payload: { runtimeVersionKnown: boolean };
    }
  | {
      type: "prompt.accepted";
      payload: Record<string, never>;
    };

type OpenCodeMessagePart = {
  type?: string;
  text?: string;
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

export function normalizeOpenCodeOrigin(value: string) {
  const url = new URL(value.trim() || "http://127.0.0.1:4096");
  const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  if (
    url.protocol !== "http:" ||
    !localHosts.has(url.hostname) ||
    url.username ||
    url.password ||
    (url.pathname !== "/" && url.pathname !== "") ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "For safety, I/O Terminal accepts only a credential-free root HTTP origin on this device.",
    );
  }
  return url.origin;
}

function headers(password: string) {
  const result: Record<string, string> = { "Content-Type": "application/json" };
  if (password) result.Authorization = `Basic ${btoa(`opencode:${password}`)}`;
  return result;
}

async function parseResponse(response: Response) {
  if (response.ok) {
    const value: unknown = await response.json().catch(() => null);
    if (!asRecord(value)) throw new Error("OpenCode returned an invalid JSON object.");
    return value;
  }
  const detail = await response.text();
  throw new Error(detail || `OpenCode returned ${response.status}.`);
}

export async function runOpenCodeSession(input: {
  serverUrl: string;
  password: string;
  title: string;
  prompt: string;
  onSessionCreated?: (session: OpenCodeSessionReference) => Promise<void>;
  onSessionSettled?: (
    session: OpenCodeSessionReference,
    state: "completed" | "failed",
  ) => Promise<void>;
  onMetadataEvent?: (
    session: OpenCodeSessionReference,
    event: OpenCodeMetadataEvent,
  ) => Promise<void>;
}): Promise<OpenCodeRunResult> {
  const baseUrl = normalizeOpenCodeOrigin(input.serverUrl);
  const healthResponse = await fetch(`${baseUrl}/global/health`, {
    headers: headers(input.password),
  });
  const health = await parseResponse(healthResponse);
  const healthRecord = asRecord(health)!;

  const sessionResponse = await fetch(`${baseUrl}/session`, {
    method: "POST",
    headers: headers(input.password),
    body: JSON.stringify({ title: input.title }),
  });
  const session = await parseResponse(sessionResponse);
  const sessionRecord = asRecord(session)!;
  const sessionId = sessionRecord.id;
  if (typeof sessionId !== "string" || !sessionId.trim() || sessionId.length > 512) {
    throw new Error("OpenCode returned an invalid session identifier.");
  }
  const reference: OpenCodeSessionReference = {
    connectorOrigin: baseUrl,
    sessionId,
    title: typeof sessionRecord.title === "string" ? sessionRecord.title : input.title,
    serverVersion: typeof healthRecord.version === "string" ? healthRecord.version : null,
  };
  await input.onSessionCreated?.(reference);
  await input.onMetadataEvent?.(reference, {
    type: "runtime.connected",
    payload: { runtimeVersionKnown: reference.serverVersion !== null },
  });

  let content: string;
  try {
    const promptResponse = await fetch(
      `${baseUrl}/session/${encodeURIComponent(sessionId)}/message`,
      {
        method: "POST",
        headers: headers(input.password),
        body: JSON.stringify({ parts: [{ type: "text", text: input.prompt }] }),
      },
    );
    const message = await parseResponse(promptResponse);
    const messageRecord = asRecord(message)!;
    if (!Array.isArray(messageRecord.parts)) {
      throw new Error("OpenCode returned an invalid message payload.");
    }
    content = messageRecord.parts
      .filter(
        (part): part is OpenCodeMessagePart =>
          Boolean(asRecord(part)) &&
          (part as OpenCodeMessagePart).type === "text" &&
          typeof (part as OpenCodeMessagePart).text === "string",
      )
      .map((part) => part.text!.trim())
      .filter(Boolean)
      .join("\n\n");
    await input.onMetadataEvent?.(reference, {
      type: "prompt.accepted",
      payload: {},
    });
  } catch (error) {
    await input.onSessionSettled?.(reference, "failed");
    throw error;
  }
  await input.onSessionSettled?.(reference, "completed");

  return {
    ...reference,
    content:
      content || "OpenCode completed the request. Open its session to inspect the full tool trail.",
  };
}

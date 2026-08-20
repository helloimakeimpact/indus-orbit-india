export type OpenCodeRunResult = {
  connectorOrigin: string;
  sessionId: string;
  title: string;
  content: string;
  serverVersion: string | null;
  changedFileCount: number | null;
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

const DEFAULT_REQUEST_TIMEOUT_MS = 45_000;
const MAX_RESPONSE_BYTES = 1_048_576;
const MAX_PROMPT_CHARACTERS = 24_000;

export class OpenCodeStoppedError extends Error {
  constructor() {
    super("The local OpenCode request was stopped.");
    this.name = "OpenCodeStoppedError";
  }
}

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

async function readBoundedText(response: Response) {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
    throw new Error("OpenCode returned a response larger than the 1 MB safety limit.");
  }
  if (!response.body) return "";

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error("OpenCode returned a response larger than the 1 MB safety limit.");
    }
    chunks.push(value);
  }

  const combined = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(combined);
}

async function requestOpenCode(
  url: string,
  init: RequestInit,
  signal: AbortSignal | undefined,
  timeoutMs: number,
) {
  const controller = new AbortController();
  let timedOut = false;
  const timeout = globalThis.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const stop = () => controller.abort();
  signal?.addEventListener("abort", stop, { once: true });

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    return await parseResponse(response);
  } catch (error) {
    if (signal?.aborted) throw new OpenCodeStoppedError();
    if (timedOut) {
      throw new Error("OpenCode did not respond within the local safety timeout.", {
        cause: error,
      });
    }
    throw error;
  } finally {
    globalThis.clearTimeout(timeout);
    signal?.removeEventListener("abort", stop);
  }
}

async function bestEffortAbortSession(
  baseUrl: string,
  password: string,
  sessionId: string,
  timeoutMs: number,
) {
  try {
    await requestOpenCode(
      `${baseUrl}/session/${encodeURIComponent(sessionId)}/abort`,
      { method: "POST", headers: headers(password) },
      undefined,
      Math.min(timeoutMs, 5_000),
    );
  } catch {
    // The original request error remains authoritative. A disconnected local
    // daemon must not hide the reason the member already sees.
  }
}

async function readChangedFileCount(
  baseUrl: string,
  password: string,
  sessionId: string,
  timeoutMs: number,
) {
  try {
    const value = await requestOpenCode(
      `${baseUrl}/session/${encodeURIComponent(sessionId)}/diff`,
      { headers: headers(password) },
      undefined,
      Math.min(timeoutMs, 5_000),
    );
    return Array.isArray(value) ? value.length : null;
  } catch {
    return null;
  }
}

async function parseResponse(response: Response) {
  const text = await readBoundedText(response);
  if (response.ok) {
    let value: unknown;
    try {
      value = JSON.parse(text);
    } catch (error) {
      throw new Error("OpenCode returned invalid JSON.", { cause: error });
    }
    if (value === null || (typeof value !== "object" && typeof value !== "boolean")) {
      throw new Error("OpenCode returned an invalid JSON response.");
    }
    return value;
  }
  const detail = text.trim().slice(0, 500);
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
    state: "completed" | "failed" | "stopped",
  ) => Promise<void>;
  onMetadataEvent?: (
    session: OpenCodeSessionReference,
    event: OpenCodeMetadataEvent,
  ) => Promise<void>;
  signal?: AbortSignal;
  requestTimeoutMs?: number;
}): Promise<OpenCodeRunResult> {
  const title = input.title.trim();
  const prompt = input.prompt.trim();
  if (!title || title.length > 120) {
    throw new Error("OpenCode session titles must be between 1 and 120 characters.");
  }
  if (!prompt || prompt.length > MAX_PROMPT_CHARACTERS) {
    throw new Error("OpenCode prompts must be between 1 and 24,000 characters.");
  }
  if (input.password.length > 1_024) {
    throw new Error("The local OpenCode password is too long.");
  }
  if (input.signal?.aborted) throw new OpenCodeStoppedError();
  const timeoutMs = input.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120_000) {
    throw new Error("The OpenCode request timeout is invalid.");
  }

  const baseUrl = normalizeOpenCodeOrigin(input.serverUrl);
  const health = await requestOpenCode(
    `${baseUrl}/global/health`,
    { headers: headers(input.password) },
    input.signal,
    timeoutMs,
  );
  const healthRecord = asRecord(health)!;

  const session = await requestOpenCode(
    `${baseUrl}/session`,
    {
      method: "POST",
      headers: headers(input.password),
      body: JSON.stringify({ title }),
    },
    input.signal,
    timeoutMs,
  );
  const sessionRecord = asRecord(session)!;
  const sessionId = sessionRecord.id;
  if (typeof sessionId !== "string" || !sessionId.trim() || sessionId.length > 512) {
    throw new Error("OpenCode returned an invalid session identifier.");
  }
  const reference: OpenCodeSessionReference = {
    connectorOrigin: baseUrl,
    sessionId,
    title:
      typeof sessionRecord.title === "string" && sessionRecord.title.trim().length <= 120
        ? sessionRecord.title.trim()
        : title,
    serverVersion:
      typeof healthRecord.version === "string" && healthRecord.version.length <= 120
        ? healthRecord.version
        : null,
  };
  await input.onSessionCreated?.(reference);
  await input.onMetadataEvent?.(reference, {
    type: "runtime.connected",
    payload: { runtimeVersionKnown: reference.serverVersion !== null },
  });

  let content: string;
  let changedFileCount: number | null = null;
  try {
    const message = await requestOpenCode(
      `${baseUrl}/session/${encodeURIComponent(sessionId)}/message`,
      {
        method: "POST",
        headers: headers(input.password),
        body: JSON.stringify({ parts: [{ type: "text", text: prompt }] }),
      },
      input.signal,
      timeoutMs,
    );
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
    changedFileCount = await readChangedFileCount(baseUrl, input.password, sessionId, timeoutMs);
  } catch (error) {
    await bestEffortAbortSession(baseUrl, input.password, sessionId, timeoutMs);
    await input.onSessionSettled?.(
      reference,
      error instanceof OpenCodeStoppedError ? "stopped" : "failed",
    );
    throw error;
  }
  await input.onSessionSettled?.(reference, "completed");

  return {
    ...reference,
    changedFileCount,
    content:
      content || "OpenCode completed the request. Open its session to inspect the full tool trail.",
  };
}

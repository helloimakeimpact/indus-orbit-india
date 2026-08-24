const MAX_JSON_BYTES = 2 * 1_024 * 1_024;
const MAX_SSE_FRAME_BYTES = 256 * 1_024;
const MAX_DIFF_BYTES = 4 * 1_024 * 1_024;
const MAX_PROMPT_CHARACTERS = 24_000;

type JsonRecord = Record<string, unknown>;

export type OpenCodePairing = {
  origin: string;
  serverVersion: string | null;
  credentialFingerprint: string;
  pairedAt: string;
};

export type OpenCodeEvent = {
  id: string | null;
  type: string;
  properties: JsonRecord;
};

export type OpenCodeTodo = {
  id: string;
  content: string;
  status: string;
  priority: string | null;
};

export type OpenCodeTaskNode = {
  sessionId: string;
  title: string | null;
  parentSessionId: string | null;
  status: string;
  todos: OpenCodeTodo[];
  children: OpenCodeTaskNode[];
};

export type OpenCodeFileDiff = {
  file: string;
  status: string | null;
  additions: number | null;
  deletions: number | null;
  before: string;
  after: string;
};

export type OpenCodePermission = {
  id: string;
  sessionId: string;
  permission: string;
  patterns: string[];
  metadata: JsonRecord;
  risk: "low" | "moderate" | "high" | "critical";
};

export type OpenCodePromptResult = {
  sessionId: string;
  content: string;
  raw: JsonRecord;
};

export class OpenCodeClientError extends Error {
  constructor(
    message: string,
    readonly status: number | null = null,
  ) {
    super(message);
    this.name = "OpenCodeClientError";
  }
}

function asRecord(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function safeString(value: unknown, maximum: number) {
  return typeof value === "string" && value.length <= maximum ? value : null;
}

function safeInteger(value: unknown) {
  return Number.isSafeInteger(value) && (value as number) >= 0 ? (value as number) : null;
}

export function normalizeOpenCodeLoopbackOrigin(value: string) {
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
    throw new OpenCodeClientError(
      "I/O pairs only with a credential-free HTTP root origin on this device.",
    );
  }
  return url.origin;
}

function basicAuthorization(password: string) {
  if (!password || password.length < 16 || password.length > 1_024) {
    throw new OpenCodeClientError("Use an OpenCode server password of at least 16 characters.");
  }
  const bytes = new TextEncoder().encode(`opencode:${password}`);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `Basic ${btoa(binary)}`;
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function readBoundedText(response: Response, maximum = MAX_JSON_BYTES) {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maximum) {
    throw new OpenCodeClientError("OpenCode returned a response above the local safety limit.");
  }
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let bytes = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > maximum) {
      await reader.cancel();
      throw new OpenCodeClientError("OpenCode returned a response above the local safety limit.");
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

function parseJson(text: string, status: number) {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new OpenCodeClientError(
      status >= 400 ? `OpenCode returned ${status}.` : "OpenCode returned invalid JSON.",
      status,
    );
  }
}

function eventFrom(value: unknown, id: string | null): OpenCodeEvent | null {
  const event = asRecord(value);
  const type = event ? safeString(event.type, 128) : null;
  const properties = event ? asRecord(event.properties) : null;
  if (!type || !properties) return null;
  return { id, type, properties };
}

export class OpenCodeSseDecoder {
  #buffer = "";
  #bytes = 0;

  feed(chunk: string) {
    this.#buffer += chunk.replaceAll("\r\n", "\n");
    this.#bytes += new TextEncoder().encode(chunk).byteLength;
    if (this.#bytes > MAX_SSE_FRAME_BYTES && !this.#buffer.includes("\n\n")) {
      throw new OpenCodeClientError("OpenCode emitted an oversized SSE frame.");
    }
    const events: OpenCodeEvent[] = [];
    let boundary = this.#buffer.indexOf("\n\n");
    while (boundary >= 0) {
      const frame = this.#buffer.slice(0, boundary);
      this.#buffer = this.#buffer.slice(boundary + 2);
      this.#bytes = new TextEncoder().encode(this.#buffer).byteLength;
      const lines = frame.split("\n");
      const id =
        lines
          .find((line) => line.startsWith("id:"))
          ?.slice(3)
          .trim() ?? null;
      const data = lines
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");
      if (data && data !== "[DONE]") {
        const parsed = eventFrom(parseJson(data, 200), id);
        if (parsed) events.push(parsed);
      }
      boundary = this.#buffer.indexOf("\n\n");
    }
    return events;
  }
}

function permissionRisk(permission: string): OpenCodePermission["risk"] {
  const normalized = permission.toLowerCase();
  if (/delete|sudo|production|credential|secret/.test(normalized)) return "critical";
  if (/shell|bash|network|external|write|edit/.test(normalized)) return "high";
  if (/web|task|mcp/.test(normalized)) return "moderate";
  return "low";
}

export class IOPortOpenCodeClient {
  readonly origin: string;
  readonly #authorization: string;
  readonly #fetch: typeof fetch;

  constructor(input: { origin: string; password: string; fetch?: typeof fetch }) {
    this.origin = normalizeOpenCodeLoopbackOrigin(input.origin);
    this.#authorization = basicAuthorization(input.password);
    this.#fetch = input.fetch ?? globalThis.fetch.bind(globalThis);
  }

  #headers(json = true) {
    return {
      Authorization: this.#authorization,
      Accept: "application/json",
      ...(json ? { "Content-Type": "application/json" } : {}),
    };
  }

  async #request(path: string, init: RequestInit = {}) {
    const response = await this.#fetch(`${this.origin}${path}`, {
      ...init,
      headers: { ...this.#headers(init.body !== undefined), ...(init.headers ?? {}) },
    });
    const text = await readBoundedText(response);
    if (!response.ok) {
      const detail = text.trim().slice(0, 500);
      throw new OpenCodeClientError(
        detail || `OpenCode returned ${response.status}.`,
        response.status,
      );
    }
    return parseJson(text, response.status);
  }

  async pair(): Promise<OpenCodePairing> {
    const health = asRecord(await this.#request("/global/health"));
    if (!health) throw new OpenCodeClientError("OpenCode health response is invalid.");
    const fingerprint = await sha256(this.#authorization);
    return {
      origin: this.origin,
      serverVersion: safeString(health.version, 120),
      credentialFingerprint: fingerprint.slice(0, 12),
      pairedAt: new Date().toISOString(),
    };
  }

  async continuePrompt(sessionId: string, prompt: string, signal?: AbortSignal) {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt || cleanPrompt.length > MAX_PROMPT_CHARACTERS) {
      throw new OpenCodeClientError("Prompts must be between 1 and 24,000 characters.");
    }
    const value = asRecord(
      await this.#request(`/session/${encodeURIComponent(sessionId)}/message`, {
        method: "POST",
        body: JSON.stringify({ parts: [{ type: "text", text: cleanPrompt }] }),
        signal,
      }),
    );
    if (!value || !Array.isArray(value.parts)) {
      throw new OpenCodeClientError("OpenCode returned an invalid continued-prompt result.");
    }
    const content = value.parts
      .flatMap((raw) => {
        const part = asRecord(raw);
        return part?.type === "text" && typeof part.text === "string" ? [part.text] : [];
      })
      .join("\n\n")
      .trim();
    return { sessionId, content, raw: value } satisfies OpenCodePromptResult;
  }

  async #sessionSummary(sessionId: string) {
    const [sessionValue, statusValue, todoValue] = await Promise.all([
      this.#request(`/session/${encodeURIComponent(sessionId)}`),
      this.#request("/session/status"),
      this.#request(`/session/${encodeURIComponent(sessionId)}/todo`),
    ]);
    const session = asRecord(sessionValue);
    const statuses = asRecord(statusValue);
    const status = statuses ? asRecord(statuses[sessionId]) : null;
    if (!session || session.id !== sessionId) {
      throw new OpenCodeClientError("OpenCode returned a different local session.");
    }
    const todos = Array.isArray(todoValue)
      ? todoValue.flatMap((raw): OpenCodeTodo[] => {
          const todo = asRecord(raw);
          if (!todo) return [];
          const id = safeString(todo.id, 256);
          const content = safeString(todo.content, 4_000);
          const todoStatus = safeString(todo.status, 64);
          return id && content && todoStatus
            ? [
                {
                  id,
                  content,
                  status: todoStatus,
                  priority: safeString(todo.priority, 64),
                },
              ]
            : [];
        })
      : [];
    return {
      session,
      status: safeString(status?.type, 64) ?? "unknown",
      todos,
    };
  }

  async getTaskTree(rootSessionId: string, maximumDepth = 4): Promise<OpenCodeTaskNode> {
    if (!Number.isInteger(maximumDepth) || maximumDepth < 0 || maximumDepth > 6) {
      throw new OpenCodeClientError("Task-tree depth must be between 0 and 6.");
    }
    let nodeCount = 0;
    const visit = async (sessionId: string, depth: number): Promise<OpenCodeTaskNode> => {
      nodeCount += 1;
      if (nodeCount > 64) throw new OpenCodeClientError("OpenCode task tree exceeds 64 sessions.");
      const [{ session, status, todos }, childValue] = await Promise.all([
        this.#sessionSummary(sessionId),
        depth < maximumDepth
          ? this.#request(`/session/${encodeURIComponent(sessionId)}/children`)
          : Promise.resolve([]),
      ]);
      const childIds = Array.isArray(childValue)
        ? childValue.flatMap((raw) => {
            const child = asRecord(raw);
            const id = child ? safeString(child.id, 512) : null;
            return id ? [id] : [];
          })
        : [];
      return {
        sessionId,
        title: safeString(session.title, 160),
        parentSessionId: safeString(session.parentID, 512),
        status,
        todos,
        children: await Promise.all(childIds.map((id) => visit(id, depth + 1))),
      };
    };
    return visit(rootSessionId, 0);
  }

  async getFullDiffs(sessionId: string): Promise<OpenCodeFileDiff[]> {
    const value = await this.#request(`/session/${encodeURIComponent(sessionId)}/diff`);
    if (!Array.isArray(value) || value.length > 128) {
      throw new OpenCodeClientError("OpenCode returned an invalid or oversized diff list.");
    }
    let totalBytes = 0;
    return value.map((raw) => {
      const diff = asRecord(raw);
      if (!diff) throw new OpenCodeClientError("OpenCode returned an invalid file diff.");
      const file = safeString(diff.file ?? diff.path, 4_096);
      const before = safeString(diff.before, 2 * 1_024 * 1_024);
      const after = safeString(diff.after, 2 * 1_024 * 1_024);
      if (!file || before === null || after === null) {
        throw new OpenCodeClientError("OpenCode returned an invalid file diff.");
      }
      totalBytes += new TextEncoder().encode(before + after).byteLength;
      if (totalBytes > MAX_DIFF_BYTES) {
        throw new OpenCodeClientError("OpenCode diffs exceed the 4 MB local review limit.");
      }
      return {
        file,
        status: safeString(diff.status, 64),
        additions: safeInteger(diff.additions),
        deletions: safeInteger(diff.deletions),
        before,
        after,
      };
    });
  }

  async listPendingPermissions(sessionId: string): Promise<OpenCodePermission[]> {
    const value = await this.#request("/permission");
    const rows = Array.isArray(value) ? value : Object.values(asRecord(value) ?? {});
    return rows.flatMap((raw): OpenCodePermission[] => {
      const permission = asRecord(raw);
      if (!permission) return [];
      const id = safeString(permission.id ?? permission.requestID, 256);
      const requestSessionId = safeString(permission.sessionID ?? permission.sessionId, 512);
      const permissionName = safeString(permission.permission, 256);
      if (!id || requestSessionId !== sessionId || !permissionName) return [];
      const patterns = Array.isArray(permission.patterns)
        ? permission.patterns.flatMap((value) => {
            const pattern = safeString(value, 1_024);
            return pattern ? [pattern] : [];
          })
        : [];
      return [
        {
          id,
          sessionId: requestSessionId,
          permission: permissionName,
          patterns,
          metadata: asRecord(permission.metadata) ?? {},
          risk: permissionRisk(permissionName),
        },
      ];
    });
  }

  async replyPermission(input: {
    request: OpenCodePermission;
    decision: "once" | "reject";
    confirmationId: string;
  }) {
    if (input.confirmationId !== input.request.id) {
      throw new OpenCodeClientError(
        "The permission reply was not confirmed for this exact request.",
      );
    }
    const body = JSON.stringify({
      response: input.decision === "reject" ? "reject" : "once",
      remember: false,
    });
    try {
      await this.#request(
        `/session/${encodeURIComponent(input.request.sessionId)}/permissions/${encodeURIComponent(input.request.id)}`,
        { method: "POST", body },
      );
    } catch (error) {
      if (!(error instanceof OpenCodeClientError) || error.status !== 404) throw error;
      await this.#request(`/permission/${encodeURIComponent(input.request.id)}/reply`, {
        method: "POST",
        body: JSON.stringify({ reply: input.decision === "reject" ? "reject" : "once" }),
      });
    }
  }

  async subscribeSessionEvents(input: {
    sessionId: string;
    onEvent: (event: OpenCodeEvent) => void | Promise<void>;
    signal: AbortSignal;
    maximumReconnects?: number;
  }) {
    const maximumReconnects = input.maximumReconnects ?? 5;
    let reconnects = 0;
    let lastEventId: string | null = null;
    while (!input.signal.aborted) {
      const response: Response = await this.#fetch(`${this.origin}/global/event`, {
        headers: {
          ...this.#headers(false),
          Accept: "text/event-stream",
          ...(lastEventId ? { "Last-Event-ID": lastEventId } : {}),
        },
        signal: input.signal,
      });
      if (!response.ok || !response.body) {
        throw new OpenCodeClientError(
          `OpenCode event stream returned ${response.status}.`,
          response.status,
        );
      }
      const decoder = new OpenCodeSseDecoder();
      const textDecoder = new TextDecoder();
      const reader: ReadableStreamDefaultReader<Uint8Array> = response.body.getReader();
      while (!input.signal.aborted) {
        const result: ReadableStreamReadResult<Uint8Array> = await reader.read();
        const { done, value } = result;
        if (done) break;
        for (const event of decoder.feed(textDecoder.decode(value, { stream: true }))) {
          const eventSessionId = safeString(
            event.properties.sessionID ?? event.properties.sessionId,
            512,
          );
          if (eventSessionId && eventSessionId !== input.sessionId) continue;
          if (event.id) lastEventId = event.id;
          await input.onEvent(event);
        }
      }
      if (input.signal.aborted) return;
      reconnects += 1;
      if (reconnects > maximumReconnects) {
        throw new OpenCodeClientError("OpenCode event stream exceeded its reconnect budget.");
      }
      await new Promise<void>((resolve, reject) => {
        const timeout = globalThis.setTimeout(resolve, Math.min(4_000, 250 * 2 ** reconnects));
        input.signal.addEventListener(
          "abort",
          () => {
            globalThis.clearTimeout(timeout);
            reject(new DOMException("Stopped", "AbortError"));
          },
          { once: true },
        );
      });
    }
  }
}

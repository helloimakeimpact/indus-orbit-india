export type OpenCodeRunResult = {
  sessionId: string;
  title: string;
  content: string;
  serverVersion: string | null;
};

type OpenCodeMessagePart = {
  type?: string;
  text?: string;
};

function localServerUrl(value: string) {
  const url = new URL(value.trim() || "http://127.0.0.1:4096");
  const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  if (url.protocol !== "http:" || !localHosts.has(url.hostname)) {
    throw new Error(
      "For safety, I/O Terminal can only connect to an OpenCode server on this device.",
    );
  }
  url.pathname = url.pathname.replace(/\/$/, "");
  return url.toString().replace(/\/$/, "");
}

function headers(password: string) {
  const result: Record<string, string> = { "Content-Type": "application/json" };
  if (password) result.Authorization = `Basic ${btoa(`opencode:${password}`)}`;
  return result;
}

async function parseResponse(response: Response) {
  if (response.ok) return response.json();
  const detail = await response.text();
  throw new Error(detail || `OpenCode returned ${response.status}.`);
}

export async function runOpenCodeSession(input: {
  serverUrl: string;
  password: string;
  title: string;
  prompt: string;
}): Promise<OpenCodeRunResult> {
  const baseUrl = localServerUrl(input.serverUrl);
  const healthResponse = await fetch(`${baseUrl}/global/health`, {
    headers: headers(input.password),
  });
  const health = await parseResponse(healthResponse);

  const sessionResponse = await fetch(`${baseUrl}/session`, {
    method: "POST",
    headers: headers(input.password),
    body: JSON.stringify({ title: input.title }),
  });
  const session = await parseResponse(sessionResponse);

  const promptResponse = await fetch(`${baseUrl}/session/${session.id}/message`, {
    method: "POST",
    headers: headers(input.password),
    body: JSON.stringify({ parts: [{ type: "text", text: input.prompt }] }),
  });
  const message = await parseResponse(promptResponse);
  const content = (message.parts ?? [])
    .filter((part: OpenCodeMessagePart) => part.type === "text" && part.text)
    .map((part: OpenCodeMessagePart) => part.text)
    .join("\n\n");

  return {
    sessionId: session.id,
    title: session.title ?? input.title,
    content:
      content || "OpenCode completed the request. Open its session to inspect the full tool trail.",
    serverVersion: typeof health.version === "string" ? health.version : null,
  };
}

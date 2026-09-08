import { createHash, createHmac, timingSafeEqual, type BinaryLike } from "node:crypto";
import { isIP } from "node:net";

const TOKEN_PREFIX = "io.rg.v1";
const MAX_TOKEN_BYTES = 16 * 1_024;
const MAX_IDENTIFIER_CHARACTERS = 512;
const MAX_MODEL_CHARACTERS = 512;
const MAX_CAPABILITIES = 64;
const MAX_CREDENTIAL_HEADERS = 16;
const MAX_HEADER_VALUE_CHARACTERS = 8 * 1_024;
const SAFE_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:/-]*$/;
const SAFE_HEADER_NAME = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
const FORBIDDEN_CREDENTIAL_HEADERS = new Set([
  "connection",
  "content-length",
  "content-type",
  "cookie",
  "host",
  "origin",
  "proxy-authorization",
  "referer",
  "transfer-encoding",
]);

export type RouteBinding = {
  requestId: string;
  workspaceId: string;
  policyVersion: string;
  providerId: string;
  endpoint: string;
  model: string;
  capabilities: readonly string[];
  contentType: string;
  requestBodySha256: string;
  maxCostNanos: number;
};

export type RouteGrantClaims = RouteBinding & {
  version: 1;
  issuedAt: number;
  expiresAt: number;
};

export type ExecutionErrorCode =
  | "invalid_grant"
  | "expired_grant"
  | "binding_mismatch"
  | "endpoint_not_allowed"
  | "invalid_credential"
  | "request_too_large"
  | "response_too_large"
  | "concurrency_exhausted"
  | "cancelled"
  | "timeout"
  | "provider_client_error"
  | "provider_rate_limited"
  | "provider_server_error"
  | "provider_transport_error";

export type ExecutionErrorClassification =
  | "authorization"
  | "policy"
  | "limit"
  | "cancelled"
  | "provider_client"
  | "provider_rate_limit"
  | "provider_server"
  | "transport";

const ERROR_MESSAGES: Record<ExecutionErrorCode, string> = {
  invalid_grant: "The route grant is invalid.",
  expired_grant: "The route grant is not active.",
  binding_mismatch: "The request does not match its route grant.",
  endpoint_not_allowed: "The provider endpoint is not allowed.",
  invalid_credential: "The provider credential is unavailable.",
  request_too_large: "The provider request exceeds the execution limit.",
  response_too_large: "The provider response exceeds the execution limit.",
  concurrency_exhausted: "The execution concurrency limit is reached.",
  cancelled: "The provider request was cancelled.",
  timeout: "The provider request exceeded the execution time limit.",
  provider_client_error: "The provider rejected the request.",
  provider_rate_limited: "The provider rate limit was reached.",
  provider_server_error: "The provider is temporarily unavailable.",
  provider_transport_error: "The provider could not be reached.",
};

export class ExecutionAdapterError extends Error {
  readonly code: ExecutionErrorCode;
  readonly classification: ExecutionErrorClassification;
  readonly status: number | null;
  readonly retryable: boolean;

  constructor(
    code: ExecutionErrorCode,
    classification: ExecutionErrorClassification,
    options: { status?: number; retryable?: boolean } = {},
  ) {
    super(ERROR_MESSAGES[code]);
    this.name = "ExecutionAdapterError";
    this.code = code;
    this.classification = classification;
    this.status = options.status ?? null;
    this.retryable = options.retryable ?? false;
  }
}

export type CredentialHeaders = Readonly<Record<string, string>>;

export type SecretResolver = (context: {
  providerId: string;
  workspaceId: string;
  endpointHostname: string;
  signal: AbortSignal;
}) => Promise<CredentialHeaders>;

export type FetchImplementation = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export type ExecutionAdapterOptions = {
  grantKeyId: string;
  grantSecret: BinaryLike;
  allowedHostnames: readonly string[];
  resolveSecret: SecretResolver;
  fetch: FetchImplementation;
  maxGrantTtlMs?: number;
  clockSkewMs?: number;
  maxRequestBytes?: number;
  maxResponseBytes?: number;
  timeoutMs?: number;
  maxConcurrency?: number;
  now?: () => number;
};

export type ExecuteRequest = Omit<RouteBinding, "requestBodySha256"> & {
  grant: string;
  body: string | Uint8Array;
  signal?: AbortSignal;
};

export type ExecuteResponse = {
  requestId: string;
  providerId: string;
  status: number;
  contentType: string | null;
  body: Uint8Array;
};

function assertPositiveInteger(value: number, name: string) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${name} must be a positive safe integer.`);
  }
  return value;
}

function normalizeIdentifier(value: string, name: string, maximum = MAX_IDENTIFIER_CHARACTERS) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maximum ||
    !SAFE_IDENTIFIER.test(value)
  ) {
    throw new ExecutionAdapterError("invalid_grant", "authorization");
  }
  return value;
}

function normalizeCapabilities(values: readonly string[]) {
  if (!Array.isArray(values) || values.length > MAX_CAPABILITIES) {
    throw new ExecutionAdapterError("invalid_grant", "authorization");
  }
  const normalized = values.map((value) => normalizeIdentifier(value, "capability", 128)).sort();
  if (new Set(normalized).size !== normalized.length) {
    throw new ExecutionAdapterError("invalid_grant", "authorization");
  }
  return normalized;
}

function normalizeContentType(value: string) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 256 ||
    /[\r\n]/u.test(value)
  ) {
    throw new ExecutionAdapterError("invalid_grant", "authorization");
  }
  return value.toLowerCase();
}

function normalizeEndpoint(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ExecutionAdapterError("endpoint_not_allowed", "policy");
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    url.search ||
    url.hash ||
    !url.hostname ||
    isIP(url.hostname) !== 0
  ) {
    throw new ExecutionAdapterError("endpoint_not_allowed", "policy");
  }
  return url.href;
}

function normalizeBinding(binding: RouteBinding): RouteBinding {
  const maxCostNanos = binding.maxCostNanos;
  if (!Number.isSafeInteger(maxCostNanos) || maxCostNanos < 0) {
    throw new ExecutionAdapterError("invalid_grant", "authorization");
  }
  if (!/^[a-f0-9]{64}$/u.test(binding.requestBodySha256)) {
    throw new ExecutionAdapterError("invalid_grant", "authorization");
  }
  return {
    requestId: normalizeIdentifier(binding.requestId, "request identifier"),
    workspaceId: normalizeIdentifier(binding.workspaceId, "workspace identifier"),
    policyVersion: normalizeIdentifier(binding.policyVersion, "policy version"),
    providerId: normalizeIdentifier(binding.providerId, "provider identifier"),
    endpoint: normalizeEndpoint(binding.endpoint),
    model: normalizeIdentifier(binding.model, "model", MAX_MODEL_CHARACTERS),
    capabilities: normalizeCapabilities(binding.capabilities),
    contentType: normalizeContentType(binding.contentType),
    requestBodySha256: binding.requestBodySha256,
    maxCostNanos,
  };
}

function encodeBase64Url(value: Uint8Array | string) {
  return Buffer.from(value).toString("base64url");
}

function decodeBase64Url(value: string) {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) {
    throw new ExecutionAdapterError("invalid_grant", "authorization");
  }
  const decoded = Buffer.from(value, "base64url");
  if (encodeBase64Url(decoded) !== value) {
    throw new ExecutionAdapterError("invalid_grant", "authorization");
  }
  return decoded;
}

function stableClaimsJson(claims: RouteGrantClaims) {
  return JSON.stringify({
    version: claims.version,
    requestId: claims.requestId,
    workspaceId: claims.workspaceId,
    policyVersion: claims.policyVersion,
    providerId: claims.providerId,
    endpoint: claims.endpoint,
    model: claims.model,
    capabilities: claims.capabilities,
    contentType: claims.contentType,
    requestBodySha256: claims.requestBodySha256,
    maxCostNanos: claims.maxCostNanos,
    issuedAt: claims.issuedAt,
    expiresAt: claims.expiresAt,
  });
}

function parseClaims(value: unknown): RouteGrantClaims {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new ExecutionAdapterError("invalid_grant", "authorization");
  }
  const candidate = value as Partial<RouteGrantClaims>;
  if (
    candidate.version !== 1 ||
    !Number.isSafeInteger(candidate.issuedAt) ||
    !Number.isSafeInteger(candidate.expiresAt)
  ) {
    throw new ExecutionAdapterError("invalid_grant", "authorization");
  }
  const binding = normalizeBinding(candidate as RouteBinding);
  return {
    version: 1,
    ...binding,
    issuedAt: candidate.issuedAt as number,
    expiresAt: candidate.expiresAt as number,
  };
}

function bodyBytes(body: string | Uint8Array) {
  return typeof body === "string" ? new TextEncoder().encode(body) : body;
}

export function sha256Hex(body: string | Uint8Array) {
  return createHash("sha256").update(bodyBytes(body)).digest("hex");
}

export class RouteGrantCodec {
  readonly #keyId: string;
  readonly #secret: BinaryLike;
  readonly #maximumTtlMs: number;
  readonly #clockSkewMs: number;
  readonly #now: () => number;

  constructor(options: {
    keyId: string;
    secret: BinaryLike;
    maxTtlMs?: number;
    clockSkewMs?: number;
    now?: () => number;
  }) {
    if (!/^[A-Za-z0-9_-]{1,128}$/u.test(options.keyId)) {
      throw new TypeError("The route grant key identifier is invalid.");
    }
    this.#keyId = options.keyId;
    if (Buffer.byteLength(options.secret) < 32) {
      throw new TypeError("The route grant secret must contain at least 32 bytes.");
    }
    this.#secret = options.secret;
    this.#maximumTtlMs = assertPositiveInteger(options.maxTtlMs ?? 120_000, "maxTtlMs");
    this.#clockSkewMs = options.clockSkewMs ?? 5_000;
    if (!Number.isSafeInteger(this.#clockSkewMs) || this.#clockSkewMs < 0) {
      throw new TypeError("clockSkewMs must be a non-negative safe integer.");
    }
    this.#now = options.now ?? Date.now;
  }

  issue(binding: RouteBinding, ttlMs = 60_000) {
    const safeTtl = assertPositiveInteger(ttlMs, "ttlMs");
    if (safeTtl > this.#maximumTtlMs) {
      throw new TypeError("ttlMs exceeds the configured route grant maximum.");
    }
    const issuedAt = this.#now();
    const claims: RouteGrantClaims = {
      version: 1,
      ...normalizeBinding(binding),
      issuedAt,
      expiresAt: issuedAt + safeTtl,
    };
    const payload = encodeBase64Url(stableClaimsJson(claims));
    const signingInput = `${TOKEN_PREFIX}.${this.#keyId}.${payload}`;
    const signature = createHmac("sha256", this.#secret).update(signingInput).digest();
    return `${signingInput}.${encodeBase64Url(signature)}`;
  }

  verify(token: string) {
    if (typeof token !== "string" || Buffer.byteLength(token) > MAX_TOKEN_BYTES) {
      throw new ExecutionAdapterError("invalid_grant", "authorization");
    }
    const parts = token.split(".");
    if (parts.length !== 6 || parts.slice(0, 3).join(".") !== TOKEN_PREFIX) {
      throw new ExecutionAdapterError("invalid_grant", "authorization");
    }
    const [, , , keyId, payload, signatureValue] = parts;
    if (keyId !== this.#keyId) {
      throw new ExecutionAdapterError("invalid_grant", "authorization");
    }
    const signature = decodeBase64Url(signatureValue);
    const expected = createHmac("sha256", this.#secret)
      .update(`${TOKEN_PREFIX}.${keyId}.${payload}`)
      .digest();
    if (signature.length !== expected.length || !timingSafeEqual(signature, expected)) {
      throw new ExecutionAdapterError("invalid_grant", "authorization");
    }
    let decoded: unknown;
    try {
      decoded = JSON.parse(decodeBase64Url(payload).toString("utf8"));
    } catch {
      throw new ExecutionAdapterError("invalid_grant", "authorization");
    }
    const claims = parseClaims(decoded);
    const now = this.#now();
    if (
      claims.expiresAt <= claims.issuedAt ||
      claims.expiresAt - claims.issuedAt > this.#maximumTtlMs ||
      claims.issuedAt > now + this.#clockSkewMs
    ) {
      throw new ExecutionAdapterError("invalid_grant", "authorization");
    }
    if (claims.expiresAt <= now - this.#clockSkewMs) {
      throw new ExecutionAdapterError("expired_grant", "authorization");
    }
    return Object.freeze({ ...claims, capabilities: Object.freeze([...claims.capabilities]) });
  }
}

function bindingMatches(claims: RouteGrantClaims, binding: RouteBinding) {
  return (
    stableClaimsJson({
      version: 1,
      ...binding,
      issuedAt: claims.issuedAt,
      expiresAt: claims.expiresAt,
    }) === stableClaimsJson(claims)
  );
}

function normalizeAllowedHostnames(values: readonly string[]) {
  const normalized = new Set<string>();
  for (const value of values) {
    if (typeof value !== "string" || value.length === 0 || value.includes(":")) {
      throw new TypeError("Each allowed provider hostname must be an exact DNS hostname.");
    }
    const hostname = value.toLowerCase().replace(/\.$/u, "");
    if (hostname === "localhost" || isIP(hostname) !== 0 || !/^[a-z0-9.-]+$/u.test(hostname)) {
      throw new TypeError("Each allowed provider hostname must be an exact DNS hostname.");
    }
    normalized.add(hostname);
  }
  if (normalized.size === 0) throw new TypeError("At least one provider hostname is required.");
  return normalized;
}

function validateCredentialHeaders(headers: CredentialHeaders) {
  const entries = Object.entries(headers);
  if (entries.length === 0 || entries.length > MAX_CREDENTIAL_HEADERS) {
    throw new ExecutionAdapterError("invalid_credential", "authorization");
  }
  const result = new Headers();
  for (const [name, value] of entries) {
    const lowerName = name.toLowerCase();
    if (
      !SAFE_HEADER_NAME.test(name) ||
      FORBIDDEN_CREDENTIAL_HEADERS.has(lowerName) ||
      lowerName.startsWith("proxy-") ||
      typeof value !== "string" ||
      value.length === 0 ||
      value.length > MAX_HEADER_VALUE_CHARACTERS ||
      /[\r\n]/u.test(value)
    ) {
      throw new ExecutionAdapterError("invalid_credential", "authorization");
    }
    result.set(name, value);
  }
  return result;
}

function waitWithSignal<T>(promise: Promise<T>, signal: AbortSignal) {
  if (signal.aborted) return Promise.reject(new DOMException("Aborted", "AbortError"));
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new DOMException("Aborted", "AbortError"));
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", onAbort));
  });
}

async function readBoundedResponse(response: Response, maximum: number, signal: AbortSignal) {
  const declared = response.headers.get("content-length");
  if (declared !== null) {
    const count = Number(declared);
    if (!Number.isSafeInteger(count) || count < 0 || count > maximum) {
      await response.body?.cancel().catch(() => undefined);
      throw new ExecutionAdapterError("response_too_large", "limit");
    }
  }
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { value, done } = await waitWithSignal(reader.read(), signal);
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maximum) {
        await reader.cancel().catch(() => undefined);
        throw new ExecutionAdapterError("response_too_large", "limit");
      }
      chunks.push(value);
    }
  } catch (error) {
    void reader.cancel().catch(() => undefined);
    throw error;
  }
  const result = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

function classifyProviderStatus(status: number) {
  if (status === 429) {
    return new ExecutionAdapterError("provider_rate_limited", "provider_rate_limit", {
      status,
      retryable: true,
    });
  }
  if (status >= 400 && status < 500) {
    return new ExecutionAdapterError("provider_client_error", "provider_client", { status });
  }
  return new ExecutionAdapterError("provider_server_error", "provider_server", {
    status,
    retryable: true,
  });
}

export class IoExecutionAdapter {
  readonly #grants: RouteGrantCodec;
  readonly #allowedHostnames: ReadonlySet<string>;
  readonly #resolveSecret: SecretResolver;
  readonly #fetch: FetchImplementation;
  readonly #maxRequestBytes: number;
  readonly #maxResponseBytes: number;
  readonly #timeoutMs: number;
  readonly #maxConcurrency: number;
  #active = 0;

  constructor(options: ExecutionAdapterOptions) {
    this.#grants = new RouteGrantCodec({
      keyId: options.grantKeyId,
      secret: options.grantSecret,
      maxTtlMs: options.maxGrantTtlMs,
      clockSkewMs: options.clockSkewMs,
      now: options.now,
    });
    this.#allowedHostnames = normalizeAllowedHostnames(options.allowedHostnames);
    this.#resolveSecret = options.resolveSecret;
    this.#fetch = options.fetch;
    this.#maxRequestBytes = assertPositiveInteger(
      options.maxRequestBytes ?? 2 * 1_024 * 1_024,
      "maxRequestBytes",
    );
    this.#maxResponseBytes = assertPositiveInteger(
      options.maxResponseBytes ?? 16 * 1_024 * 1_024,
      "maxResponseBytes",
    );
    this.#timeoutMs = assertPositiveInteger(options.timeoutMs ?? 60_000, "timeoutMs");
    this.#maxConcurrency = assertPositiveInteger(options.maxConcurrency ?? 32, "maxConcurrency");
  }

  issueGrant(binding: RouteBinding, ttlMs?: number) {
    return this.#grants.issue(binding, ttlMs);
  }

  verifyGrant(token: string) {
    return this.#grants.verify(token);
  }

  async execute(request: ExecuteRequest): Promise<ExecuteResponse> {
    if (this.#active >= this.#maxConcurrency) {
      throw new ExecutionAdapterError("concurrency_exhausted", "limit", { retryable: true });
    }
    this.#active += 1;
    try {
      if (request.signal?.aborted) {
        throw new ExecutionAdapterError("cancelled", "cancelled");
      }
      const body = Uint8Array.from(bodyBytes(request.body));
      if (body.byteLength > this.#maxRequestBytes) {
        throw new ExecutionAdapterError("request_too_large", "limit");
      }
      const suppliedBinding = normalizeBinding({
        requestId: request.requestId,
        workspaceId: request.workspaceId,
        policyVersion: request.policyVersion,
        providerId: request.providerId,
        endpoint: request.endpoint,
        model: request.model,
        capabilities: request.capabilities,
        contentType: request.contentType,
        requestBodySha256: sha256Hex(body),
        maxCostNanos: request.maxCostNanos,
      });
      const claims = this.#grants.verify(request.grant);
      if (!bindingMatches(claims, suppliedBinding)) {
        throw new ExecutionAdapterError("binding_mismatch", "authorization");
      }
      const endpoint = new URL(claims.endpoint);
      if (!this.#allowedHostnames.has(endpoint.hostname.toLowerCase())) {
        throw new ExecutionAdapterError("endpoint_not_allowed", "policy");
      }

      const controller = new AbortController();
      let abortReason: "caller" | "timeout" | null = null;
      const onAbort = () => {
        abortReason = "caller";
        controller.abort();
      };
      request.signal?.addEventListener("abort", onAbort, { once: true });
      if (request.signal?.aborted) onAbort();
      const timer = setTimeout(() => {
        abortReason = "timeout";
        controller.abort();
      }, this.#timeoutMs);
      timer.unref?.();

      try {
        let credentialHeaders: Headers;
        try {
          const resolved = await waitWithSignal(
            this.#resolveSecret({
              providerId: claims.providerId,
              workspaceId: claims.workspaceId,
              endpointHostname: endpoint.hostname,
              signal: controller.signal,
            }),
            controller.signal,
          );
          credentialHeaders = validateCredentialHeaders(resolved);
        } catch (error) {
          if (controller.signal.aborted) throw error;
          if (error instanceof ExecutionAdapterError) throw error;
          throw new ExecutionAdapterError("invalid_credential", "authorization");
        }
        credentialHeaders.set("content-type", claims.contentType);
        credentialHeaders.set("accept", "application/json, text/event-stream");

        const response = await this.#fetch(endpoint, {
          method: "POST",
          headers: credentialHeaders,
          body: Uint8Array.from(body).buffer,
          redirect: "error",
          signal: controller.signal,
        });
        if (!response.ok) {
          await response.body?.cancel().catch(() => undefined);
          throw classifyProviderStatus(response.status);
        }
        const responseBody = await readBoundedResponse(
          response,
          this.#maxResponseBytes,
          controller.signal,
        );
        return {
          requestId: claims.requestId,
          providerId: claims.providerId,
          status: response.status,
          contentType: response.headers.get("content-type"),
          body: responseBody,
        };
      } catch (error) {
        if (error instanceof ExecutionAdapterError) throw error;
        if (abortReason === "caller" || request.signal?.aborted) {
          throw new ExecutionAdapterError("cancelled", "cancelled");
        }
        if (abortReason === "timeout") {
          throw new ExecutionAdapterError("timeout", "transport", { retryable: true });
        }
        throw new ExecutionAdapterError("provider_transport_error", "transport", {
          retryable: true,
        });
      } finally {
        clearTimeout(timer);
        request.signal?.removeEventListener("abort", onAbort);
      }
    } finally {
      this.#active -= 1;
    }
  }
}

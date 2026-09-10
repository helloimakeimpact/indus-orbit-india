import { createHash, createHmac, randomUUID, timingSafeEqual, type BinaryLike } from "node:crypto";
import { isIP } from "node:net";

const ROUTE_GRANT_PREFIX = "io.rg.v1";
const SERVICE_ASSERTION_PREFIX = "io.sa.v1";
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
  grantId: string;
  issuedAt: number;
  expiresAt: number;
};

export type ServiceAssertionClaims = {
  version: 1;
  serviceId: string;
  requestId: string;
  workspaceId: string;
  routeGrantSha256: string;
  issuedAt: number;
  expiresAt: number;
};

export type ReplayConsumeResult = "consumed" | "replayed" | "capacity_exhausted";

export type OneUseReplayStore = {
  consume(input: {
    key: string;
    expiresAt: number;
    now: number;
    signal: AbortSignal;
  }): Promise<ReplayConsumeResult>;
};

export type ExecutionErrorCode =
  | "invalid_grant"
  | "expired_grant"
  | "binding_mismatch"
  | "invalid_service_assertion"
  | "expired_service_assertion"
  | "service_binding_mismatch"
  | "unauthorized_service"
  | "replayed_grant"
  | "replay_store_exhausted"
  | "replay_store_unavailable"
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
  invalid_service_assertion: "The workload assertion is invalid.",
  expired_service_assertion: "The workload assertion is not active.",
  service_binding_mismatch: "The workload assertion does not match the request.",
  unauthorized_service: "The workload is not authorized to execute provider routes.",
  replayed_grant: "The route grant has already been consumed.",
  replay_store_exhausted: "The route replay boundary is at capacity.",
  replay_store_unavailable: "The route replay boundary is unavailable.",
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
  serviceAuthKeyId: string;
  serviceAuthSecret: BinaryLike;
  allowedServiceIds: readonly string[];
  replayStore: OneUseReplayStore;
  allowedHostnames: readonly string[];
  resolveSecret: SecretResolver;
  fetch: FetchImplementation;
  maxGrantTtlMs?: number;
  maxServiceAssertionTtlMs?: number;
  clockSkewMs?: number;
  maxRequestBytes?: number;
  maxResponseBytes?: number;
  timeoutMs?: number;
  maxConcurrency?: number;
  now?: () => number;
};

export type ExecuteRequest = Omit<RouteBinding, "requestBodySha256"> & {
  grant: string;
  serviceAssertion: string;
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

export type ExecuteStreamResponse = Omit<ExecuteResponse, "body"> & {
  body: ReadableStream<Uint8Array>;
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
    grantId: claims.grantId,
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
    typeof candidate.grantId !== "string" ||
    !Number.isSafeInteger(candidate.issuedAt) ||
    !Number.isSafeInteger(candidate.expiresAt)
  ) {
    throw new ExecutionAdapterError("invalid_grant", "authorization");
  }
  const binding = normalizeBinding(candidate as RouteBinding);
  return {
    version: 1,
    grantId: normalizeIdentifier(candidate.grantId, "grant identifier", 128),
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

function assertKeyId(value: string, name: string) {
  if (!/^[A-Za-z0-9_-]{1,128}$/u.test(value)) {
    throw new TypeError(`${name} is invalid.`);
  }
  return value;
}

function assertSecretLength(value: BinaryLike, name: string) {
  if (Buffer.byteLength(value) < 32) {
    throw new TypeError(`${name} must contain at least 32 bytes.`);
  }
  return value;
}

function signToken(prefix: string, keyId: string, secret: BinaryLike, payloadJson: string) {
  const payload = encodeBase64Url(payloadJson);
  const signingInput = `${prefix}.${keyId}.${payload}`;
  const signature = createHmac("sha256", secret).update(signingInput).digest();
  return `${signingInput}.${encodeBase64Url(signature)}`;
}

function verifyTokenSignature(
  token: string,
  prefix: string,
  keyId: string,
  secret: BinaryLike,
  invalidCode: "invalid_grant" | "invalid_service_assertion",
) {
  const fail = () => new ExecutionAdapterError(invalidCode, "authorization");
  if (typeof token !== "string" || Buffer.byteLength(token) > MAX_TOKEN_BYTES) throw fail();
  const parts = token.split(".");
  if (parts.length !== 6 || parts.slice(0, 3).join(".") !== prefix) throw fail();
  const [, , , tokenKeyId, payload, signatureValue] = parts;
  if (tokenKeyId !== keyId) throw fail();
  let signature: Buffer;
  let payloadBytes: Buffer;
  try {
    signature = decodeBase64Url(signatureValue);
    payloadBytes = decodeBase64Url(payload);
  } catch {
    throw fail();
  }
  const expected = createHmac("sha256", secret)
    .update(`${prefix}.${tokenKeyId}.${payload}`)
    .digest();
  if (signature.length !== expected.length || !timingSafeEqual(signature, expected)) throw fail();
  try {
    return JSON.parse(payloadBytes.toString("utf8")) as unknown;
  } catch {
    throw fail();
  }
}

export class InMemoryOneUseReplayStore implements OneUseReplayStore {
  readonly #maximumEntries: number;
  readonly #entries = new Map<string, number>();

  constructor(maximumEntries = 10_000) {
    this.#maximumEntries = assertPositiveInteger(maximumEntries, "maximumEntries");
  }

  async consume(input: {
    key: string;
    expiresAt: number;
    now: number;
    signal: AbortSignal;
  }): Promise<ReplayConsumeResult> {
    if (input.signal.aborted) throw new DOMException("Aborted", "AbortError");
    if (!/^[a-f0-9]{64}$/u.test(input.key)) {
      throw new TypeError("Replay keys must be SHA-256 digests.");
    }
    for (const [key, expiresAt] of this.#entries) {
      if (expiresAt <= input.now) this.#entries.delete(key);
    }
    if (this.#entries.has(input.key)) return "replayed";
    if (this.#entries.size >= this.#maximumEntries) return "capacity_exhausted";
    this.#entries.set(input.key, input.expiresAt);
    return "consumed";
  }
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
    this.#keyId = assertKeyId(options.keyId, "The route grant key identifier");
    this.#secret = assertSecretLength(options.secret, "The route grant secret");
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
      grantId: randomUUID(),
      ...normalizeBinding(binding),
      issuedAt,
      expiresAt: issuedAt + safeTtl,
    };
    return signToken(ROUTE_GRANT_PREFIX, this.#keyId, this.#secret, stableClaimsJson(claims));
  }

  verify(token: string) {
    const decoded = verifyTokenSignature(
      token,
      ROUTE_GRANT_PREFIX,
      this.#keyId,
      this.#secret,
      "invalid_grant",
    );
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

function stableServiceAssertionJson(claims: ServiceAssertionClaims) {
  return JSON.stringify({
    version: claims.version,
    serviceId: claims.serviceId,
    requestId: claims.requestId,
    workspaceId: claims.workspaceId,
    routeGrantSha256: claims.routeGrantSha256,
    issuedAt: claims.issuedAt,
    expiresAt: claims.expiresAt,
  });
}

function parseServiceAssertion(value: unknown): ServiceAssertionClaims {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new ExecutionAdapterError("invalid_service_assertion", "authorization");
  }
  const candidate = value as Partial<ServiceAssertionClaims>;
  if (
    candidate.version !== 1 ||
    !Number.isSafeInteger(candidate.issuedAt) ||
    !Number.isSafeInteger(candidate.expiresAt) ||
    typeof candidate.routeGrantSha256 !== "string" ||
    !/^[a-f0-9]{64}$/u.test(candidate.routeGrantSha256)
  ) {
    throw new ExecutionAdapterError("invalid_service_assertion", "authorization");
  }
  return {
    version: 1,
    serviceId: normalizeIdentifier(candidate.serviceId as string, "service identifier", 128),
    requestId: normalizeIdentifier(candidate.requestId as string, "request identifier"),
    workspaceId: normalizeIdentifier(candidate.workspaceId as string, "workspace identifier"),
    routeGrantSha256: candidate.routeGrantSha256,
    issuedAt: candidate.issuedAt as number,
    expiresAt: candidate.expiresAt as number,
  };
}

export class ServiceAssertionCodec {
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
    this.#keyId = assertKeyId(options.keyId, "The workload assertion key identifier");
    this.#secret = assertSecretLength(options.secret, "The workload assertion secret");
    this.#maximumTtlMs = assertPositiveInteger(options.maxTtlMs ?? 30_000, "maxTtlMs");
    this.#clockSkewMs = options.clockSkewMs ?? 2_000;
    if (!Number.isSafeInteger(this.#clockSkewMs) || this.#clockSkewMs < 0) {
      throw new TypeError("clockSkewMs must be a non-negative safe integer.");
    }
    this.#now = options.now ?? Date.now;
  }

  issue(
    binding: Omit<ServiceAssertionClaims, "version" | "issuedAt" | "expiresAt">,
    ttlMs = 15_000,
  ) {
    const safeTtl = assertPositiveInteger(ttlMs, "ttlMs");
    if (safeTtl > this.#maximumTtlMs) {
      throw new TypeError("ttlMs exceeds the configured workload assertion maximum.");
    }
    const issuedAt = this.#now();
    const claims = parseServiceAssertion({
      version: 1,
      serviceId: binding.serviceId,
      requestId: binding.requestId,
      workspaceId: binding.workspaceId,
      routeGrantSha256: binding.routeGrantSha256,
      issuedAt,
      expiresAt: issuedAt + safeTtl,
    });
    return signToken(
      SERVICE_ASSERTION_PREFIX,
      this.#keyId,
      this.#secret,
      stableServiceAssertionJson(claims),
    );
  }

  verify(token: string) {
    const claims = parseServiceAssertion(
      verifyTokenSignature(
        token,
        SERVICE_ASSERTION_PREFIX,
        this.#keyId,
        this.#secret,
        "invalid_service_assertion",
      ),
    );
    const now = this.#now();
    if (
      claims.expiresAt <= claims.issuedAt ||
      claims.expiresAt - claims.issuedAt > this.#maximumTtlMs ||
      claims.issuedAt > now + this.#clockSkewMs
    ) {
      throw new ExecutionAdapterError("invalid_service_assertion", "authorization");
    }
    if (claims.expiresAt <= now - this.#clockSkewMs) {
      throw new ExecutionAdapterError("expired_service_assertion", "authorization");
    }
    return Object.freeze(claims);
  }
}

function bindingMatches(claims: RouteGrantClaims, binding: RouteBinding) {
  return (
    stableClaimsJson({
      version: 1,
      grantId: claims.grantId,
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
    const cleanup = () => signal.removeEventListener("abort", onAbort);
    const onAbort = () => {
      cleanup();
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        cleanup();
        resolve(value);
      },
      (error: unknown) => {
        cleanup();
        reject(error);
      },
    );
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

type ExecutionLifecycle = {
  signal: AbortSignal;
  finish: () => void;
  abortByConsumer: () => void;
  mapError: (error: unknown) => ExecutionAdapterError;
};

type StartedExecution = {
  claims: RouteGrantClaims;
  response: Response;
  lifecycle: ExecutionLifecycle;
};

function validateDeclaredResponseLength(response: Response, maximum: number) {
  const declared = response.headers.get("content-length");
  if (declared === null) return;
  const count = Number(declared);
  if (!Number.isSafeInteger(count) || count < 0 || count > maximum) {
    void response.body?.cancel().catch(() => undefined);
    throw new ExecutionAdapterError("response_too_large", "limit");
  }
}

function createBoundedStream(response: Response, maximum: number, lifecycle: ExecutionLifecycle) {
  if (!response.body) {
    lifecycle.finish();
    return new ReadableStream<Uint8Array>({
      start(controller) {
        controller.close();
      },
    });
  }

  const reader = response.body.getReader();
  let bytes = 0;
  let settled = false;
  let onAbort: (() => void) | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      onAbort = () => {
        if (settled) return;
        settled = true;
        void reader.cancel().catch(() => undefined);
        controller.error(lifecycle.mapError(new DOMException("Aborted", "AbortError")));
        lifecycle.finish();
      };
      lifecycle.signal.addEventListener("abort", onAbort, { once: true });
      if (lifecycle.signal.aborted) onAbort();
    },
    async pull(controller) {
      if (settled) return;
      try {
        const { value, done } = await waitWithSignal(reader.read(), lifecycle.signal);
        if (done) {
          settled = true;
          if (onAbort) lifecycle.signal.removeEventListener("abort", onAbort);
          controller.close();
          lifecycle.finish();
          return;
        }
        bytes += value.byteLength;
        if (bytes > maximum) {
          throw new ExecutionAdapterError("response_too_large", "limit");
        }
        controller.enqueue(value);
      } catch (error) {
        if (settled) return;
        settled = true;
        if (onAbort) lifecycle.signal.removeEventListener("abort", onAbort);
        void reader.cancel().catch(() => undefined);
        controller.error(lifecycle.mapError(error));
        lifecycle.finish();
      }
    },
    async cancel() {
      if (settled) return;
      settled = true;
      if (onAbort) lifecycle.signal.removeEventListener("abort", onAbort);
      lifecycle.abortByConsumer();
      await reader.cancel().catch(() => undefined);
      lifecycle.finish();
    },
  });
  return stream;
}

export class IoExecutionAdapter {
  readonly #grants: RouteGrantCodec;
  readonly #serviceAssertions: ServiceAssertionCodec;
  readonly #allowedHostnames: ReadonlySet<string>;
  readonly #allowedServiceIds: ReadonlySet<string>;
  readonly #replayStore: OneUseReplayStore;
  readonly #resolveSecret: SecretResolver;
  readonly #fetch: FetchImplementation;
  readonly #maxRequestBytes: number;
  readonly #maxResponseBytes: number;
  readonly #timeoutMs: number;
  readonly #maxConcurrency: number;
  readonly #now: () => number;
  #active = 0;

  constructor(options: ExecutionAdapterOptions) {
    this.#grants = new RouteGrantCodec({
      keyId: options.grantKeyId,
      secret: options.grantSecret,
      maxTtlMs: options.maxGrantTtlMs,
      clockSkewMs: options.clockSkewMs,
      now: options.now,
    });
    this.#serviceAssertions = new ServiceAssertionCodec({
      keyId: options.serviceAuthKeyId,
      secret: options.serviceAuthSecret,
      maxTtlMs: options.maxServiceAssertionTtlMs,
      clockSkewMs: options.clockSkewMs,
      now: options.now,
    });
    this.#allowedHostnames = normalizeAllowedHostnames(options.allowedHostnames);
    this.#allowedServiceIds = new Set(
      options.allowedServiceIds.map((value) =>
        normalizeIdentifier(value, "service identifier", 128),
      ),
    );
    if (this.#allowedServiceIds.size === 0) {
      throw new TypeError("At least one workload service identifier is required.");
    }
    this.#replayStore = options.replayStore;
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
    this.#now = options.now ?? Date.now;
  }

  issueGrant(binding: RouteBinding, ttlMs?: number) {
    return this.#grants.issue(binding, ttlMs);
  }

  verifyGrant(token: string) {
    return this.#grants.verify(token);
  }

  issueServiceAssertion(
    input: {
      serviceId: string;
      requestId: string;
      workspaceId: string;
      routeGrant: string;
    },
    ttlMs?: number,
  ) {
    return this.#serviceAssertions.issue(
      {
        serviceId: input.serviceId,
        requestId: input.requestId,
        workspaceId: input.workspaceId,
        routeGrantSha256: sha256Hex(input.routeGrant),
      },
      ttlMs,
    );
  }

  verifyServiceAssertion(token: string) {
    return this.#serviceAssertions.verify(token);
  }

  #createLifecycle(requestSignal: AbortSignal | undefined): ExecutionLifecycle {
    const controller = new AbortController();
    let abortReason: "caller" | "consumer" | "timeout" | null = null;
    let finished = false;
    const onCallerAbort = () => {
      abortReason = "caller";
      controller.abort();
    };
    requestSignal?.addEventListener("abort", onCallerAbort, { once: true });
    if (requestSignal?.aborted) onCallerAbort();
    const timer = setTimeout(() => {
      abortReason = "timeout";
      controller.abort();
    }, this.#timeoutMs);
    timer.unref?.();

    return {
      signal: controller.signal,
      abortByConsumer: () => {
        if (!abortReason) abortReason = "consumer";
        controller.abort();
      },
      finish: () => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        requestSignal?.removeEventListener("abort", onCallerAbort);
        this.#active -= 1;
      },
      mapError: (error: unknown) => {
        if (error instanceof ExecutionAdapterError) return error;
        if (abortReason === "caller" || abortReason === "consumer" || requestSignal?.aborted) {
          return new ExecutionAdapterError("cancelled", "cancelled");
        }
        if (abortReason === "timeout") {
          return new ExecutionAdapterError("timeout", "transport", { retryable: true });
        }
        return new ExecutionAdapterError("provider_transport_error", "transport", {
          retryable: true,
        });
      },
    };
  }

  async #start(request: ExecuteRequest): Promise<StartedExecution> {
    if (this.#active >= this.#maxConcurrency) {
      throw new ExecutionAdapterError("concurrency_exhausted", "limit", { retryable: true });
    }
    this.#active += 1;
    const lifecycle = this.#createLifecycle(request.signal);
    try {
      const workload = this.#serviceAssertions.verify(request.serviceAssertion);
      if (!this.#allowedServiceIds.has(workload.serviceId)) {
        throw new ExecutionAdapterError("unauthorized_service", "authorization");
      }
      if (
        workload.requestId !== request.requestId ||
        workload.workspaceId !== request.workspaceId ||
        workload.routeGrantSha256 !== sha256Hex(request.grant)
      ) {
        throw new ExecutionAdapterError("service_binding_mismatch", "authorization");
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

      let replayResult: ReplayConsumeResult;
      try {
        replayResult = await waitWithSignal(
          this.#replayStore.consume({
            key: sha256Hex(request.grant),
            expiresAt: claims.expiresAt,
            now: this.#now(),
            signal: lifecycle.signal,
          }),
          lifecycle.signal,
        );
      } catch (error) {
        if (lifecycle.signal.aborted) throw error;
        throw new ExecutionAdapterError("replay_store_unavailable", "transport", {
          retryable: true,
        });
      }
      if (replayResult === "replayed") {
        throw new ExecutionAdapterError("replayed_grant", "authorization");
      }
      if (replayResult === "capacity_exhausted") {
        throw new ExecutionAdapterError("replay_store_exhausted", "limit", { retryable: true });
      }
      if (replayResult !== "consumed") {
        throw new ExecutionAdapterError("replay_store_unavailable", "transport", {
          retryable: true,
        });
      }

      let credentialHeaders: Headers;
      try {
        const resolved = await waitWithSignal(
          this.#resolveSecret({
            providerId: claims.providerId,
            workspaceId: claims.workspaceId,
            endpointHostname: endpoint.hostname,
            signal: lifecycle.signal,
          }),
          lifecycle.signal,
        );
        credentialHeaders = validateCredentialHeaders(resolved);
      } catch (error) {
        if (lifecycle.signal.aborted) throw error;
        if (error instanceof ExecutionAdapterError) throw error;
        throw new ExecutionAdapterError("invalid_credential", "authorization");
      }
      credentialHeaders.set("content-type", claims.contentType);
      credentialHeaders.set("accept", "application/json, text/event-stream");

      const response = await waitWithSignal(
        this.#fetch(endpoint, {
          method: "POST",
          headers: credentialHeaders,
          body: Uint8Array.from(body).buffer,
          redirect: "error",
          signal: lifecycle.signal,
        }),
        lifecycle.signal,
      );
      if (!response.ok) {
        void response.body?.cancel().catch(() => undefined);
        throw classifyProviderStatus(response.status);
      }
      validateDeclaredResponseLength(response, this.#maxResponseBytes);
      return { claims, response, lifecycle };
    } catch (error) {
      const safeError = lifecycle.mapError(error);
      lifecycle.finish();
      throw safeError;
    }
  }

  async executeStream(request: ExecuteRequest): Promise<ExecuteStreamResponse> {
    const { claims, response, lifecycle } = await this.#start(request);
    return {
      requestId: claims.requestId,
      providerId: claims.providerId,
      status: response.status,
      contentType: response.headers.get("content-type"),
      body: createBoundedStream(response, this.#maxResponseBytes, lifecycle),
    };
  }

  async execute(request: ExecuteRequest): Promise<ExecuteResponse> {
    const streamed = await this.executeStream(request);
    const reader = streamed.body.getReader();
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      chunks.push(value);
      bytes += value.byteLength;
    }
    const body = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return { ...streamed, body };
  }
}

export class GatewayError extends Error {
  constructor(
    readonly code:
      | "bad_request"
      | "unauthorized"
      | "forbidden"
      | "not_configured"
      | "upstream_failure"
      | "internal_error",
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function asGatewayError(error: unknown) {
  if (error instanceof GatewayError) return error;
  return new GatewayError("internal_error", 500, "I/O gateway could not complete the request.");
}

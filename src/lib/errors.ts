/** Convert an unknown thrown value into a safe, user-facing error message. */
export function getErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
) {
  return error instanceof Error && error.message ? error.message : fallback;
}

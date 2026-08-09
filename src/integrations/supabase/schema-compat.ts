type SupabaseErrorLike = {
  code?: string | null;
  message?: string | null;
};

const MISSING_SCHEMA_CODES = new Set([
  "42703", // undefined_column
  "42883", // undefined_function
  "42P01", // undefined_table
  "PGRST202", // function missing from the PostgREST schema cache
  "PGRST204", // column missing from the PostgREST schema cache
  "PGRST205", // relation missing from the PostgREST schema cache
]);

/**
 * Allows an expand/migrate/contract deployment: the frontend can ship before
 * the additive database migration, but never falls back for authorization,
 * validation, concurrency, or other operational errors.
 */
export function isMissingSchemaContract(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const candidate = error as SupabaseErrorLike;
  if (candidate.code && MISSING_SCHEMA_CODES.has(candidate.code)) return true;

  const message = candidate.message?.toLowerCase() ?? "";
  return (
    message.includes("could not find the function") ||
    message.includes("could not find the table") ||
    message.includes("does not exist")
  );
}

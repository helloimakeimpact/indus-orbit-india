export type LocationMutationResult = {
  ok: boolean;
  changed: boolean;
};

export function decodeLocationMutationResult(value: unknown): LocationMutationResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("The location service returned an invalid response.");
  }

  const candidate = value as Partial<LocationMutationResult>;
  if (candidate.ok !== true || typeof candidate.changed !== "boolean") {
    throw new Error("The location service returned an invalid response.");
  }

  return { ok: true, changed: candidate.changed };
}

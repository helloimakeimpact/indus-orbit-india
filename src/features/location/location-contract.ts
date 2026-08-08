export type LocationMutationResult = {
  ok: boolean;
  changed: boolean;
};

export type LocationPreferences = {
  countryCode: string | null;
  legacyCountryLabel: string | null;
  regionLabel: string | null;
  cityLabel: string | null;
  timezoneName: string | null;
  legacyTimezoneLabel: string | null;
  useForScheduling: boolean;
  useForRecommendations: boolean;
  source: "legacy_unconfirmed" | "member" | null;
  consentVersion: string | null;
  consentedAt: string | null;
  shareAudience: "members" | "public" | null;
  sharePrecision: "country" | "region" | "city" | null;
};

function nullableString(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== "string")
    throw new Error("The location service returned invalid preferences.");
  return value;
}

export function decodeLocationPreferences(value: unknown): LocationPreferences {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("The location service returned invalid preferences.");
  }

  const row = value as Record<string, unknown>;
  const source = nullableString(row.source);
  const shareAudience = nullableString(row.shareAudience);
  const sharePrecision = nullableString(row.sharePrecision);

  if (
    (source !== null && source !== "legacy_unconfirmed" && source !== "member") ||
    (shareAudience !== null && shareAudience !== "members" && shareAudience !== "public") ||
    (sharePrecision !== null &&
      sharePrecision !== "country" &&
      sharePrecision !== "region" &&
      sharePrecision !== "city") ||
    typeof row.useForScheduling !== "boolean" ||
    typeof row.useForRecommendations !== "boolean"
  ) {
    throw new Error("The location service returned invalid preferences.");
  }

  return {
    countryCode: nullableString(row.countryCode),
    legacyCountryLabel: nullableString(row.legacyCountryLabel),
    regionLabel: nullableString(row.regionLabel),
    cityLabel: nullableString(row.cityLabel),
    timezoneName: nullableString(row.timezoneName),
    legacyTimezoneLabel: nullableString(row.legacyTimezoneLabel),
    useForScheduling: row.useForScheduling,
    useForRecommendations: row.useForRecommendations,
    source,
    consentVersion: nullableString(row.consentVersion),
    consentedAt: nullableString(row.consentedAt),
    shareAudience,
    sharePrecision,
  };
}

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

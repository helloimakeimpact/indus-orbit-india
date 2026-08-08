export type CommunityOnboardingStatus = "not_started" | "in_progress" | "paused" | "completed";

export type ProductAccess = {
  ioAccess: boolean;
  communityAccess: boolean;
  communityStatus: CommunityOnboardingStatus;
  communityCurrentStep: string;
  communityVersion: number;
  measurementConsent: boolean;
};

type ProductAccessRow = {
  io_access: boolean;
  community_access: boolean;
  community_status: string;
  community_current_step: string;
  community_version: number;
  measurement_consent: boolean;
};

const communityStatuses = new Set<CommunityOnboardingStatus>([
  "not_started",
  "in_progress",
  "paused",
  "completed",
]);

export function decodeProductAccess(value: unknown): ProductAccess {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    throw new Error("The product-access service returned an invalid response.");
  }

  const candidate = row as Partial<ProductAccessRow>;
  if (
    typeof candidate.io_access !== "boolean" ||
    typeof candidate.community_access !== "boolean" ||
    typeof candidate.community_status !== "string" ||
    !communityStatuses.has(candidate.community_status as CommunityOnboardingStatus) ||
    typeof candidate.community_current_step !== "string" ||
    typeof candidate.community_version !== "number" ||
    !Number.isSafeInteger(candidate.community_version) ||
    candidate.community_version < 0 ||
    typeof candidate.measurement_consent !== "boolean"
  ) {
    throw new Error("The product-access service returned an invalid response.");
  }

  return {
    ioAccess: candidate.io_access,
    communityAccess: candidate.community_access,
    communityStatus: candidate.community_status as CommunityOnboardingStatus,
    communityCurrentStep: candidate.community_current_step,
    communityVersion: candidate.community_version,
    measurementConsent: candidate.measurement_consent,
  };
}

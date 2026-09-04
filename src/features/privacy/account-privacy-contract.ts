export type AccountPrivacyRequestType = "export" | "deletion";
export type AccountPrivacyRequestState =
  | "submitted"
  | "reviewing"
  | "blocked"
  | "ready"
  | "completed"
  | "rejected"
  | "cancelled"
  | "expired";

export type AccountPrivacyRequest = {
  id: string;
  type: AccountPrivacyRequestType;
  state: AccountPrivacyRequestState;
  memberNote: string | null;
  operatorNote: string | null;
  version: number;
  submittedAt: string;
  updatedAt: string;
  artifactExpiresAt: string | null;
};

const requestTypes = new Set<AccountPrivacyRequestType>(["export", "deletion"]);
const requestStates = new Set<AccountPrivacyRequestState>([
  "submitted",
  "reviewing",
  "blocked",
  "ready",
  "completed",
  "rejected",
  "cancelled",
  "expired",
]);

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function optionalText(value: unknown, maximum: number) {
  return typeof value === "string" && value.length <= maximum ? value : null;
}

export function parseAccountPrivacyRequests(value: unknown): AccountPrivacyRequest[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate): AccountPrivacyRequest[] => {
    const row = record(candidate);
    if (!row) return [];
    const id = row.request_id;
    const type = row.request_type;
    const state = row.request_state;
    const version = row.version;
    const submittedAt = row.submitted_at;
    const updatedAt = row.updated_at;
    const artifactExpiresAt = row.artifact_expires_at;
    if (
      typeof id !== "string" ||
      !id ||
      typeof type !== "string" ||
      !requestTypes.has(type as AccountPrivacyRequestType) ||
      typeof state !== "string" ||
      !requestStates.has(state as AccountPrivacyRequestState) ||
      !Number.isInteger(version) ||
      (version as number) < 1 ||
      typeof submittedAt !== "string" ||
      !Number.isFinite(Date.parse(submittedAt)) ||
      typeof updatedAt !== "string" ||
      !Number.isFinite(Date.parse(updatedAt)) ||
      (artifactExpiresAt !== null &&
        (typeof artifactExpiresAt !== "string" || !Number.isFinite(Date.parse(artifactExpiresAt))))
    ) {
      return [];
    }
    return [
      {
        id,
        type: type as AccountPrivacyRequestType,
        state: state as AccountPrivacyRequestState,
        memberNote: optionalText(row.member_note, 500),
        operatorNote: optionalText(row.operator_note, 1_000),
        version: version as number,
        submittedAt,
        updatedAt,
        artifactExpiresAt,
      },
    ];
  });
}

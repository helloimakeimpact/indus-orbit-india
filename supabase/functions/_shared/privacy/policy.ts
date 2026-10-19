/** Owner-delegated product defaults, 15 October 2026. These are not statutory
 * retention periods. Legal floors/holds take precedence in the database. */
export const PRIVACY_POLICY_VERSION = "2026-10-15.1";
export const PRIVACY_DEFAULTS = Object.freeze({
  exportLifetimeDays: 7,
  exportLinkSeconds: 300,
  deletionCoolingDays: 7,
  requestTargetDays: 30,
  guestRetentionDays: 90,
  emailPayloadDays: 30,
  securityEvidenceDays: 365,
  orphanFileDays: 30,
  maximumExportBytes: 5 * 1024 * 1024,
});

export function privacyExecutionEnabled(value: string | undefined) {
  return value === "staging" || value === "production";
}

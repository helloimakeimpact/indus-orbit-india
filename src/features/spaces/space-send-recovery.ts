export type SpaceSendRequestIds = {
  messageClientRequestId: string;
  attachmentClientRequestId: string;
};

export function createSpaceSendRequestIds(
  createId: () => string = () => crypto.randomUUID(),
): SpaceSendRequestIds {
  return {
    messageClientRequestId: createId(),
    attachmentClientRequestId: createId(),
  };
}

export function isExistingSpaceAttachmentUpload(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { status?: number | string; statusCode?: number | string };
  return String(candidate.statusCode ?? candidate.status ?? "") === "409";
}

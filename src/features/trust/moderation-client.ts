import { supabase } from "@/integrations/supabase/client";

export type MyModerationNotice = {
  id: string;
  targetType: string;
  targetId: string;
  actionType: string;
  reason: string;
  appealDeadline: string;
  reversedAt: string | null;
  createdAt: string;
  appeal: {
    id: string;
    status: "submitted" | "reviewing" | "upheld" | "overturned" | "withdrawn";
    submittedAt: string;
    decidedAt: string | null;
    decisionNote: string | null;
  } | null;
};

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function requiredString(value: JsonRecord, key: string) {
  return typeof value[key] === "string" && value[key].trim() ? value[key] : null;
}

function nullableString(value: JsonRecord, key: string) {
  return value[key] === null ? null : typeof value[key] === "string" ? value[key] : null;
}

export async function listMyModerationNotices(): Promise<MyModerationNotice[]> {
  const { data, error } = await supabase.rpc("list_my_moderation_notices", {
    _limit: 50,
  });
  if (error) throw new Error(error.message);
  if (!Array.isArray(data)) throw new Error("The moderation notice history is invalid.");
  return data.flatMap((value): MyModerationNotice[] => {
    const notice = record(value);
    if (!notice) return [];
    const id = requiredString(notice, "id");
    const targetType = requiredString(notice, "targetType");
    const targetId = requiredString(notice, "targetId");
    const actionType = requiredString(notice, "actionType");
    const reason = requiredString(notice, "reason");
    const appealDeadline = requiredString(notice, "appealDeadline");
    const createdAt = requiredString(notice, "createdAt");
    if (
      !id ||
      !targetType ||
      !targetId ||
      !actionType ||
      !reason ||
      !appealDeadline ||
      !createdAt
    ) {
      return [];
    }
    const rawAppeal = record(notice.appeal);
    let appeal: MyModerationNotice["appeal"] = null;
    if (rawAppeal) {
      const appealId = requiredString(rawAppeal, "id");
      const status = requiredString(rawAppeal, "status");
      const submittedAt = requiredString(rawAppeal, "submittedAt");
      if (
        appealId &&
        submittedAt &&
        status &&
        ["submitted", "reviewing", "upheld", "overturned", "withdrawn"].includes(status)
      ) {
        appeal = {
          id: appealId,
          status: status as NonNullable<MyModerationNotice["appeal"]>["status"],
          submittedAt,
          decidedAt: nullableString(rawAppeal, "decidedAt"),
          decisionNote: nullableString(rawAppeal, "decisionNote"),
        };
      }
    }
    return [
      {
        id,
        targetType,
        targetId,
        actionType,
        reason,
        appealDeadline,
        reversedAt: nullableString(notice, "reversedAt"),
        createdAt,
        appeal,
      },
    ];
  });
}

export async function submitMyModerationAppeal(noticeId: string, reason: string) {
  const { data, error } = await supabase.rpc("submit_my_moderation_appeal", {
    _notice_id: noticeId,
    _reason: reason,
    _client_request_id: crypto.randomUUID(),
  });
  if (error) throw new Error(error.message);
  const result = record(data);
  if (!result || result.ok !== true || !requiredString(result, "appealId")) {
    throw new Error("The appeal submission returned invalid evidence.");
  }
}

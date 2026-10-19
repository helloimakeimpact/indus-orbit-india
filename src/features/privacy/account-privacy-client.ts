import { resolveBrowserSupabaseConfig } from "@/integrations/supabase/runtime-config";
import { supabase } from "@/integrations/supabase/client";
import {
  parseAccountPrivacyRequests,
  parseAccountExportDownload,
  type AccountPrivacyRequestType,
} from "./account-privacy-contract";

export type {
  AccountPrivacyRequest,
  AccountPrivacyRequestState,
  AccountPrivacyRequestType,
} from "./account-privacy-contract";

export async function listMyAccountPrivacyRequests() {
  const { data, error } = await supabase.rpc("list_my_account_privacy_requests", { _limit: 20 });
  if (error) throw new Error(error.message);
  return parseAccountPrivacyRequests(data);
}

export async function requestMyAccountPrivacyAction(input: {
  expectedUserId: string;
  type: AccountPrivacyRequestType;
  memberNote?: string;
  confirmationText?: string;
}) {
  const { error } = await supabase.rpc("request_my_account_privacy_action_v2", {
    _expected_user_id: input.expectedUserId,
    _request_type: input.type,
    _member_note: input.memberNote?.trim() || undefined,
    _confirmation_text: input.confirmationText?.trim() || undefined,
    _client_request_id: crypto.randomUUID(),
  });
  if (error) throw new Error(error.message);
}

export async function cancelMyAccountPrivacyRequest(request: { id: string; version: number }) {
  const { error } = await supabase.rpc("cancel_my_account_privacy_request", {
    _request_id: request.id,
    _expected_version: request.version,
  });
  if (error) throw new Error(error.message);
}

async function assertCurrentAccount(expectedUserId: string) {
  const { data, error } = await supabase.auth.getSession();
  if (error || data.session?.user.id !== expectedUserId) {
    throw new Error("Your account changed. Reopen settings before downloading your export.");
  }
}

export async function getMyAccountExportDownload(userId: string, requestId: string) {
  await assertCurrentAccount(userId);
  const { data, error } = await supabase.rpc("get_my_account_export", { _request_id: requestId });
  if (error)
    throw new Error("Your export is unavailable or expired. Refresh your request history.");
  const artifact = parseAccountExportDownload(data, userId, requestId);
  await assertCurrentAccount(userId);
  const result = await supabase.storage
    .from(artifact.bucket)
    .createSignedUrl(artifact.path, artifact.expiresIn, {
      download: "indus-orbit-account-export.json",
    });
  if (result.error || !result.data?.signedUrl)
    throw new Error("Your download could not be prepared. Please try again.");
  await assertCurrentAccount(userId);
  const url = new URL(result.data.signedUrl);
  const configured = new URL(resolveBrowserSupabaseConfig(import.meta.env).url);
  if (
    url.origin !== configured.origin ||
    (url.protocol !== "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
  ) {
    throw new Error("Your download could not be verified. Please contact support.");
  }
  return url.href;
}

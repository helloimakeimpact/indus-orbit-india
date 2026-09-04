import { supabase } from "@/integrations/supabase/client";
import {
  parseAccountPrivacyRequests,
  type AccountPrivacyRequestType,
} from "./account-privacy-contract";

export type {
  AccountPrivacyRequest,
  AccountPrivacyRequestState,
  AccountPrivacyRequestType,
} from "./account-privacy-contract";

export async function listMyAccountPrivacyRequests() {
  const { data, error } = await supabase.rpc(
    "list_my_account_privacy_requests" as never,
    { _limit: 20 } as never,
  );
  if (error) throw new Error(error.message);
  return parseAccountPrivacyRequests(data);
}

export async function requestMyAccountPrivacyAction(input: {
  type: AccountPrivacyRequestType;
  memberNote?: string;
  confirmationText?: string;
}) {
  const { error } = await supabase.rpc(
    "request_my_account_privacy_action" as never,
    {
      _request_type: input.type,
      _member_note: input.memberNote?.trim() || null,
      _confirmation_text: input.confirmationText?.trim() || null,
      _client_request_id: crypto.randomUUID(),
    } as never,
  );
  if (error) throw new Error(error.message);
}

export async function cancelMyAccountPrivacyRequest(request: { id: string; version: number }) {
  const { error } = await supabase.rpc(
    "cancel_my_account_privacy_request" as never,
    {
      _request_id: request.id,
      _expected_version: request.version,
    } as never,
  );
  if (error) throw new Error(error.message);
}

import { supabase } from "@/integrations/supabase/client";
import { decodeRegistration, type Registration } from "./event-client";
export type GuestReceipt = Registration & { needsConfirmation: boolean };
const storageKey = (eventId: string) => `indus-event-guest:${eventId}`;
export function takeGuestLink(eventId: string): string | null {
  const match = /^#guest=([a-f0-9]{64})$/.exec(window.location.hash);
  if (match) {
    window.history.replaceState(
      window.history.state,
      "",
      window.location.pathname + window.location.search,
    );
    try {
      window.sessionStorage.setItem(storageKey(eventId), match[1]);
    } catch {
      /* A private link still works without browser storage. */
    }
    return match[1];
  }
  try {
    const token = window.sessionStorage.getItem(storageKey(eventId));
    return token && /^[a-f0-9]{64}$/.test(token) ? token : null;
  } catch {
    return null;
  }
}
export function forgetGuestLink(eventId: string) {
  try {
    window.sessionStorage.removeItem(storageKey(eventId));
  } catch {
    /* Storage may be disabled. */
  }
}
async function invoke(body: Record<string, string>) {
  const { data, error } = await supabase.functions.invoke("event-guest-session", { body });
  if (error || !data?.ok)
    throw new Error(
      body.action === "request"
        ? "We couldn’t send the email. Please try again."
        : "This private link is unavailable. Request a new email link, or try again.",
    );
  return data;
}
export async function requestGuestLink(
  eventId: string,
  name: string,
  email: string,
  captchaToken: string,
) {
  await invoke({ eventId, action: "request", name, email, captchaToken });
}
export async function getGuestReceipt(
  eventId: string,
  token: string,
  action: "receipt" | "confirm" | "cancel" = "receipt",
): Promise<GuestReceipt> {
  const result = await invoke({ eventId, token, action });
  return {
    ...decodeRegistration(result.registration),
    needsConfirmation: result.registration?.needsConfirmation === true,
  };
}

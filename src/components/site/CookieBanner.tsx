import { useSyncExternalStore } from "react";

const KEY = "indus-orbit-cookie-ack";
const COOKIE_EVENT = "indus-orbit:cookie-ack-change";

function subscribeToCookiePreference(notify: () => void) {
  window.addEventListener("storage", notify);
  window.addEventListener(COOKIE_EVENT, notify);

  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener(COOKIE_EVENT, notify);
  };
}

function shouldShowCookieBanner() {
  try {
    return !window.localStorage.getItem(KEY);
  } catch {
    return false;
  }
}

function saveCookiePreference(value: "accept" | "dismiss") {
  try {
    window.localStorage.setItem(KEY, value);
  } catch {
    // Local storage may be unavailable in private or restricted browser contexts.
  }
  window.dispatchEvent(new Event(COOKIE_EVENT));
}

export function CookieBanner() {
  const visible = useSyncExternalStore(
    subscribeToCookiePreference,
    shouldShowCookieBanner,
    () => false,
  );

  if (!visible) return null;
  return (
    <div className="fixed bottom-3 right-3 z-50 flex max-w-sm items-center gap-2 rounded-full glass-card px-3 py-1.5 shadow-lg">
      <span aria-hidden className="text-[11px]">
        🍪
      </span>
      <p className="text-[11px] text-foreground/75">
        <span className="underline decoration-foreground/30 underline-offset-2">A few cookies</span>
        , so things grow and flow just right.
      </p>
      <button
        onClick={() => {
          saveCookiePreference("dismiss");
        }}
        className="rounded-full px-2 py-0.5 text-[11px] font-medium text-foreground/60 hover:bg-foreground/5"
      >
        Decline
      </button>
      <span className="text-foreground/30 text-[11px]">/</span>
      <button
        onClick={() => {
          saveCookiePreference("accept");
        }}
        className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-[var(--indigo-night)] hover:bg-foreground/5"
      >
        Accept
      </button>
    </div>
  );
}

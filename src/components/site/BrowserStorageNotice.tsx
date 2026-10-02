import { useSyncExternalStore } from "react";

// Older accept/dismiss values were acknowledgements, not consent controls.
const KEY = "indus-orbit-cookie-ack";
const CHANGE_EVENT = "indus-orbit:cookie-ack-change";
let acknowledgedThisVisit = false;

function subscribe(notify: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY || event.key === null) notify();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, notify);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, notify);
  };
}

function isVisible() {
  try {
    const value = window.localStorage.getItem(KEY);
    if (value === "accept" || value === "dismiss" || value === "acknowledged") return false;
  } catch {
    // A notice must still work when persistent browser storage is unavailable.
  }
  return !acknowledgedThisVisit;
}

function acknowledge() {
  acknowledgedThisVisit = true;
  try {
    window.localStorage.setItem(KEY, "acknowledged");
  } catch {
    // Keep the acknowledgement for this visit without promising persistence.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function BrowserStorageNotice() {
  const visible = useSyncExternalStore(subscribe, isVisible, () => false);
  if (!visible) return null;
  return (
    <section aria-labelledby="browser-storage-title" className="mx-auto mt-16 max-w-6xl px-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 max-w-2xl">
          <h2 id="browser-storage-title" className="text-sm font-semibold">
            On this device
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-foreground/75">
            Sign-in sessions and interface preferences are stored in your browser. You can clear
            them in your browser settings.
          </p>
        </div>
        <button
          type="button"
          onClick={acknowledge}
          className="min-h-11 shrink-0 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Got it
        </button>
      </div>
    </section>
  );
}

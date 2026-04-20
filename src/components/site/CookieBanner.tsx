import { useEffect, useState } from "react";

const KEY = "indus-orbit-cookie-ack";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setVisible(true);
    } catch {
      /* noop */
    }
  }, []);
  if (!visible) return null;
  return (
    <div className="fixed bottom-3 right-3 z-50 flex max-w-sm items-center gap-2 rounded-full glass-card px-3 py-1.5 shadow-lg">
      <span aria-hidden className="text-[11px]">🍪</span>
      <p className="text-[11px] text-foreground/75">
        <span className="underline decoration-foreground/30 underline-offset-2">A few cookies</span>, so things grow and flow just right.
      </p>
      <button
        onClick={() => {
          try { localStorage.setItem(KEY, "dismiss"); } catch { /* noop */ }
          setVisible(false);
        }}
        className="rounded-full px-2 py-0.5 text-[11px] font-medium text-foreground/60 hover:bg-foreground/5"
      >
        Decline
      </button>
      <span className="text-foreground/30 text-[11px]">/</span>
      <button
        onClick={() => {
          try { localStorage.setItem(KEY, "accept"); } catch { /* noop */ }
          setVisible(false);
        }}
        className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-[var(--indigo-night)] hover:bg-foreground/5"
      >
        Accept
      </button>
    </div>
  );
}

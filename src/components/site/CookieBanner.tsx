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
    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-2xl rounded-2xl glass-card p-4 shadow-xl md:flex md:items-center md:gap-4">
      <p className="text-sm text-foreground/80">
        A few cookies, so things grow and flow just right. We use them to
        understand how the site is used.
      </p>
      <div className="mt-3 flex justify-end gap-2 md:mt-0">
        <button
          onClick={() => {
            try { localStorage.setItem(KEY, "dismiss"); } catch { /* noop */ }
            setVisible(false);
          }}
          className="rounded-full px-3 py-1.5 text-xs font-medium text-foreground/70 hover:bg-foreground/5"
        >
          Dismiss
        </button>
        <button
          onClick={() => {
            try { localStorage.setItem(KEY, "accept"); } catch { /* noop */ }
            setVisible(false);
          }}
          className="rounded-full bg-[var(--indigo-night)] px-4 py-1.5 text-xs font-semibold text-[var(--parchment)]"
        >
          Sounds good
        </button>
      </div>
    </div>
  );
}

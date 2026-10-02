import { useEffect, useRef, useState } from "react";

type CaptchaApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: CaptchaApi;
    indusOrbitCaptchaReady?: () => void;
  }
}
let loading: Promise<CaptchaApi> | undefined;

function loadCaptcha(): Promise<CaptchaApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const finish = () => {
      clearTimeout(timer);
      delete window.indusOrbitCaptchaReady;
    };
    const failed = () => {
      finish();
      script.remove();
      loading = undefined;
      reject(new Error("Verification could not load"));
    };
    const timer = window.setTimeout(failed, 15000);
    window.indusOrbitCaptchaReady = () => {
      if (!window.turnstile) return failed();
      finish();
      resolve(window.turnstile);
    };
    script.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=indusOrbitCaptchaReady";
    script.async = true;
    script.onerror = failed;
    document.head.appendChild(script);
  });
  return loading;
}

export function HumanVerification({
  onToken,
  resetKey,
  enabled,
  action,
}: {
  onToken: (token: string) => void;
  resetKey: number;
  enabled: boolean;
  action: "contact" | "newsletter" | "event_registration";
}) {
  const sitekey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim();
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  useEffect(() => {
    if (!enabled || !sitekey) return;
    let cancelled = false;
    void loadCaptcha()
      .then((api) => {
        if (cancelled || !container.current) return;
        widget.current = api.render(container.current, {
          sitekey,
          size: "compact",
          action,
          appearance: "interaction-only",
          "response-field": false,
          callback: (token: string) => {
            onToken(token);
            setError(false);
          },
          "expired-callback": () => onToken(""),
          "error-callback": () => {
            onToken("");
            setError(true);
          },
        });
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
      if (widget.current !== null) window.turnstile?.remove(widget.current);
      widget.current = null;
    };
  }, [enabled, sitekey, onToken, action, retry]);
  useEffect(() => {
    if (widget.current !== null) window.turnstile?.reset(widget.current);
  }, [resetKey]);
  if (!sitekey)
    return (
      <p role="status" className="text-sm">
        This form is temporarily unavailable. Please try again later.
      </p>
    );
  return (
    <div className="space-y-2">
      <p role="status" className="text-xs leading-5">
        {enabled
          ? "Spam protection runs automatically."
          : "Spam protection starts when you fill in this form."}
      </p>
      <div ref={container} />
      {error && (
        <p role="alert" className="text-sm">
          Verification is unavailable.{" "}
          <button
            type="button"
            onClick={() => {
              setError(false);
              onToken("");
              setRetry((value) => value + 1);
            }}
            className="min-h-11 underline underline-offset-4"
          >
            Try again
          </button>
        </p>
      )}
      <p className="text-xs leading-5">
        Protected by Cloudflare Turnstile. Its{" "}
        <a
          href="https://www.cloudflare.com/privacypolicy/"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2"
        >
          Privacy Policy
        </a>{" "}
        and{" "}
        <a
          href="https://www.cloudflare.com/website-terms/"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2"
        >
          Terms
        </a>{" "}
        apply.
      </p>
    </div>
  );
}

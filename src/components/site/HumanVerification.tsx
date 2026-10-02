import { useEffect, useRef, useState } from "react";

type CaptchaApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    hcaptcha?: CaptchaApi;
    indusOrbitCaptchaReady?: () => void;
  }
}
let loading: Promise<CaptchaApi> | undefined;

function loadCaptcha(): Promise<CaptchaApi> {
  if (window.hcaptcha) return Promise.resolve(window.hcaptcha);
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
      if (!window.hcaptcha) return failed();
      finish();
      resolve(window.hcaptcha);
    };
    script.src = "https://js.hcaptcha.com/1/api.js?render=explicit&onload=indusOrbitCaptchaReady";
    script.async = true;
    script.onerror = failed;
    document.head.appendChild(script);
  });
  return loading;
}

export function HumanVerification({
  onToken,
  resetKey,
}: {
  onToken: (token: string) => void;
  resetKey: number;
}) {
  const sitekey = import.meta.env.VITE_HCAPTCHA_SITE_KEY?.trim();
  const [active, setActive] = useState(false);
  const [error, setError] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  useEffect(() => {
    if (!active || !sitekey) return;
    let cancelled = false;
    void loadCaptcha()
      .then((api) => {
        if (cancelled || !container.current) return;
        widget.current = api.render(container.current, {
          sitekey,
          size: "compact",
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
      if (widget.current !== null) window.hcaptcha?.remove(widget.current);
      widget.current = null;
    };
  }, [active, sitekey, onToken]);
  useEffect(() => {
    if (widget.current !== null) window.hcaptcha?.reset(widget.current);
  }, [resetKey]);
  if (!sitekey)
    return (
      <p role="status" className="text-sm">
        This form is temporarily unavailable. Please try again later.
      </p>
    );
  return (
    <div className="space-y-2">
      {!active && (
        <button
          type="button"
          onClick={() => setActive(true)}
          className="min-h-11 rounded-xl border border-current/30 px-4 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Verify you’re human
        </button>
      )}
      <div ref={container} />
      {error && (
        <p role="alert" className="text-sm">
          Verification could not load.{" "}
          <button
            type="button"
            onClick={() => {
              setError(false);
              setActive(false);
            }}
            className="min-h-11 underline underline-offset-4"
          >
            Try again
          </button>
        </p>
      )}
      <p className="text-xs leading-5">
        This form uses hCaptcha. Its{" "}
        <a
          href="https://www.hcaptcha.com/privacy"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2"
        >
          Privacy Policy
        </a>{" "}
        and{" "}
        <a
          href="https://www.hcaptcha.com/terms"
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

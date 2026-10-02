import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { HumanVerification } from "@/components/site/HumanVerification";
import { submitPublicForm } from "@/lib/public-form-submit";
import footerBand from "@/assets/footer-band.jpg";
import logo from "@/assets/indus-orbit-logo.png";

const platformLinks = [
  { to: "/skills", label: "Skills" },
  { to: "/models", label: "Models" },
  { to: "/members", label: "Members" },
] as const;

const companyLinks = [
  { to: "/what-is-indus-orbit", label: "What is Indus Orbit?" },
  { to: "/our-work", label: "Our Work" },
  { to: "/about", label: "About" },
  { to: "/writing", label: "Writing" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteFooter() {
  const [email, setEmail] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaReset, setCaptchaReset] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  return (
    <footer className="relative mt-24">
      <div
        className="h-56 w-full bg-cover bg-center md:h-72"
        style={{ backgroundImage: `url(${footerBand})` }}
        aria-hidden
      />
      <div className="bg-[var(--indigo-night)] text-[var(--parchment)]">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-12">
          <div className="min-w-0 md:col-span-5">
            <div className="flex items-center gap-2">
              <img src={logo} alt="" width={32} height={32} className="h-8 w-8 invert" />
              <span className="font-display text-2xl font-semibold">Indus Orbit</span>
            </div>
            <p className="mt-4 max-w-md text-sm text-[var(--parchment)]/75">
              The general intelligence company of India — building tools and networks that connect
              youth, experts, founders, investors and the diaspora into one orbit.
            </p>
            <div className="mt-6 mb-2 flex flex-wrap gap-3">
              <Link
                to="/what-is-indus-orbit"
                className="inline-flex items-center gap-2 rounded-full border border-[var(--parchment)]/40 px-4 py-2 text-sm font-medium text-[var(--parchment)] transition hover:bg-[var(--parchment)]/10"
              >
                The model
              </Link>
              <Link
                to="/our-work"
                className="inline-flex items-center gap-2 rounded-full border border-[var(--saffron)]/60 bg-[var(--saffron)]/10 px-4 py-2 text-sm font-medium text-[var(--saffron)] transition hover:bg-[var(--saffron)] hover:text-[var(--indigo-night)]"
              >
                Our work
              </Link>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (submitting) return;
                if (!captchaToken) {
                  toast.error("Please complete human verification.");
                  return;
                }
                setSubmitting(true);
                try {
                  await submitPublicForm({ kind: "newsletter", email, captchaToken });
                  toast.success("Your subscription request has been received.");
                  setEmail("");
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Please try again later.");
                } finally {
                  setSubmitting(false);
                  setCaptchaToken("");
                  setCaptchaReset((value) => value + 1);
                }
              }}
              className="mt-6 flex flex-col gap-2 max-w-md"
            >
              <div className="flex items-center gap-2 rounded-full bg-white/10 p-1.5 backdrop-blur">
                <input
                  type="email"
                  aria-label="Email address for newsletter subscription"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  maxLength={254}
                  className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-[var(--parchment)] placeholder:text-[var(--parchment)]/50 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={submitting || !captchaToken}
                  className="min-h-11 rounded-full bg-[var(--saffron)] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--indigo-night)] disabled:opacity-60"
                >
                  {submitting ? "Sending…" : "Subscribe"}
                </button>
              </div>
              <HumanVerification onToken={setCaptchaToken} resetKey={captchaReset} />
            </form>
          </div>

          <div className="md:col-span-2">
            <h4 className="font-display text-sm uppercase tracking-wider text-[var(--parchment)]/60">
              Platform
            </h4>
            <ul className="mt-4 space-y-2 text-sm">
              {platformLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-[var(--parchment)]/80 transition hover:text-[var(--saffron)]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-2">
            <h4 className="font-display text-sm uppercase tracking-wider text-[var(--parchment)]/60">
              Company
            </h4>
            <ul className="mt-4 space-y-2 text-sm">
              {companyLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-[var(--parchment)]/80 transition hover:text-[var(--saffron)]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-3">
            <h4 className="font-display text-sm uppercase tracking-wider text-[var(--parchment)]/60">
              Based in
            </h4>
            <ul className="mt-4 space-y-2 text-sm text-[var(--parchment)]/80">
              <li>Delhi · NCR</li>
              <li>Bengaluru</li>
              <li>Mumbai (soon)</li>
            </ul>
            <div className="mt-6 flex gap-3 text-xs uppercase tracking-wider text-[var(--parchment)]/60">
              <Link to="/contact" className="hover:text-[var(--saffron)]">
                Get in touch
              </Link>
              <a href="mailto:hello@indusorbit.com" className="hover:text-[var(--saffron)]">
                Email
              </a>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-5 text-xs text-[var(--parchment)]/60 md:flex-row md:items-center md:justify-between">
            <span>© {new Date().getFullYear()} Indus Orbit. Rooted in India.</span>
            <span>Connection · Synergy · Society</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

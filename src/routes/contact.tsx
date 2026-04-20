import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { SiteShell } from "@/components/site/SiteShell";
import contactImg from "@/assets/contact-rooftop.jpg";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Get in touch — Indus Orbit" },
      {
        name: "description",
        content:
          "If Indus Orbit resonates with you — as a builder, expert, investor or partner — we'd love to talk.",
      },
      { property: "og:title", content: "Get in touch — Indus Orbit" },
      {
        property: "og:description",
        content:
          "Reach out to Indus Orbit. Tell us who you are and what you'd like to build.",
      },
      { property: "og:image", content: contactImg },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: contactImg },
    ],
  }),
  component: ContactPage,
});

type Role = "Youth" | "Expert" | "Investor" | "Partner";

function ContactPage() {
  const [role, setRole] = useState<Role>("Youth");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      (e.target as HTMLFormElement).reset();
      toast.success("Thanks — we'll be in touch soon.", {
        description: "Your message has reached the orbit.",
      });
    }, 600);
  };

  return (
    <SiteShell navTone="dark">
      <section className="relative h-[55svh] min-h-[420px] w-full overflow-hidden">
        <img
          src={contactImg}
          alt="Pixel-art Indian rooftop at night with paper lanterns and two people talking"
          width={1600}
          height={900}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--indigo-night)]/40 to-[var(--indigo-night)]/85" />
        <div className="absolute inset-0 flex items-end px-6 pb-14">
          <div className="mx-auto w-full max-w-6xl">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--saffron)]">
              Get in touch
            </p>
            <h1 className="mt-3 max-w-3xl font-display text-4xl font-medium leading-tight text-[var(--parchment)] md:text-6xl">
              If this resonates with you, let's talk.
            </h1>
          </div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto grid max-w-5xl gap-12 md:grid-cols-[1fr_1.2fr]">
          <div>
            <h2 className="font-display text-2xl font-medium md:text-3xl">
              Reach the orbit.
            </h2>
            <p className="mt-4 text-foreground/70">
              We read everything. Tell us who you are, what you're working on,
              and how we might move together.
            </p>
            <dl className="mt-8 space-y-5 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wider text-foreground/50">Email</dt>
                <dd className="mt-1 font-medium">hello@indusorbit.com</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-foreground/50">Cities</dt>
                <dd className="mt-1 font-medium">Delhi · Bengaluru</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-foreground/50">Social</dt>
                <dd className="mt-1 flex gap-3 font-medium">
                  <a className="hover:text-[var(--saffron)]" href="#">Twitter</a>
                  <a className="hover:text-[var(--saffron)]" href="#">LinkedIn</a>
                </dd>
              </div>
            </dl>
          </div>

          <form
            onSubmit={onSubmit}
            className="rounded-3xl border border-border bg-card p-6 shadow-sm md:p-8"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Your name" name="name" placeholder="Aarav Sharma" required />
              <Field label="Email" name="email" type="email" placeholder="you@domain.com" required />
            </div>

            <div className="mt-5">
              <label className="text-xs font-semibold uppercase tracking-wider text-foreground/60">
                I am a…
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {(["Youth", "Expert", "Investor", "Partner"] as Role[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={cn(
                      "rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition",
                      role === r
                        ? "border-[var(--indigo-night)] bg-[var(--indigo-night)] text-[var(--parchment)]"
                        : "border-border bg-background text-foreground/70 hover:bg-foreground/5",
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <input type="hidden" name="role" value={role} />
            </div>

            <div className="mt-5">
              <label className="text-xs font-semibold uppercase tracking-wider text-foreground/60">
                Message
              </label>
              <textarea
                name="message"
                required
                rows={5}
                placeholder="Tell us what you're building or what you'd like to bring."
                className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm focus:border-[var(--saffron)] focus:outline-none focus:ring-2 focus:ring-[var(--saffron)]/30"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-6 inline-flex items-center justify-center rounded-full bg-[var(--indigo-night)] px-6 py-3 text-sm font-semibold text-[var(--parchment)] hover:bg-[var(--saffron)] hover:text-[var(--indigo-night)] transition disabled:opacity-60"
            >
              {submitting ? "Sending…" : "Send to the orbit"}
            </button>
          </form>
        </div>
      </section>
    </SiteShell>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wider text-foreground/60">
        {label}
      </label>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm focus:border-[var(--saffron)] focus:outline-none focus:ring-2 focus:ring-[var(--saffron)]/30"
      />
    </div>
  );
}

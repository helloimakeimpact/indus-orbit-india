import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteShell } from "@/components/site/SiteShell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/writing")({
  head: () => ({
    meta: [
      { title: "Writing — Indus Orbit" },
      {
        name: "description",
        content:
          "Announcements, research notes and vision essays from the team at Indus Orbit.",
      },
      { property: "og:title", content: "Writing — Indus Orbit" },
      {
        property: "og:description",
        content:
          "Notes from a general intelligence company built for India.",
      },
    ],
  }),
  component: WritingPage,
});

type Tag = "All" | "Announcements" | "Research" | "Vision";

const posts: Array<{ title: string; excerpt: string; author: string; tag: Exclude<Tag, "All"> }> = [
  {
    title: "Announcing Indus Orbit",
    excerpt:
      "Why we are building a general intelligence company designed around India's people, industries and ambitions.",
    author: "The Orbit",
    tag: "Announcements",
  },
  {
    title: "An orbit, not a pyramid",
    excerpt:
      "Most ecosystems are drawn as pyramids with a few founders at the top. India looks more like an orbit — and that changes what we build.",
    author: "Founders",
    tag: "Vision",
  },
  {
    title: "What Indian SMBs actually want from agents",
    excerpt:
      "Field notes from twelve cities and forty businesses on where AI is genuinely useful — and where it is in the way.",
    author: "Orbit Research",
    tag: "Research",
  },
  {
    title: "The diaspora as an engine, not an audience",
    excerpt:
      "How NRIs can move from cheering India on to actively compounding it — and the rails we are building to make that easier.",
    author: "Orbit Bridge",
    tag: "Vision",
  },
  {
    title: "Vernacular first, English second",
    excerpt:
      "Why the next billion users will not switch to English to use AI — and what that demands from the runtime.",
    author: "Orbit Build",
    tag: "Research",
  },
  {
    title: "We are hiring across product, research and partnerships",
    excerpt:
      "A small, deliberate team in Delhi and Bengaluru. If you care about India and intelligence, we'd love to hear from you.",
    author: "The Orbit",
    tag: "Announcements",
  },
];

function WritingPage() {
  const [active, setActive] = useState<Tag>("All");
  const tags: Tag[] = ["All", "Announcements", "Research", "Vision"];
  const filtered = active === "All" ? posts : posts.filter((p) => p.tag === active);

  return (
    <SiteShell>
      <section className="px-6 pb-12 pt-36 md:pt-44">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--saffron)]">
            Writing
          </p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-medium leading-tight md:text-6xl">
            Notes from the orbit.
          </h1>
          <p className="mt-5 max-w-2xl text-foreground/70">
            Announcements, research and essays on intelligence, India, and the
            networks we are building between the two.
          </p>

          <div className="mt-10 flex flex-wrap gap-2">
            {tags.map((t) => (
              <button
                key={t}
                onClick={() => setActive(t)}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition",
                  active === t
                    ? "border-[var(--indigo-night)] bg-[var(--indigo-night)] text-[var(--parchment)]"
                    : "border-border bg-card text-foreground/70 hover:bg-foreground/5",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <article
                key={p.title}
                className="group flex flex-col overflow-hidden rounded-3xl border border-border bg-card transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="aspect-[16/10] w-full bg-gradient-to-br from-[var(--saffron)]/70 via-[var(--gold)]/60 to-[var(--indigo-night)]" />
                <div className="flex flex-1 flex-col p-6">
                  <span className="inline-flex w-fit rounded-full bg-foreground/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-foreground/60">
                    {p.tag}
                  </span>
                  <h3 className="mt-4 font-display text-xl font-medium leading-tight">
                    {p.title}
                  </h3>
                  <p className="mt-3 text-sm text-foreground/70">{p.excerpt}</p>
                  <p className="mt-6 text-xs uppercase tracking-wider text-foreground/50">
                    {p.author}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

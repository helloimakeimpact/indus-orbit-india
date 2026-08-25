import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { SiteShell } from "@/components/site/SiteShell";
import { cn } from "@/lib/utils";
import { getPublishedStories } from "@/server/society.functions";
import { ArrowRight, Clock, Mail } from "lucide-react";
import { posts, tagImage, slugify, type Post, type Tag } from "@/data/writing-posts";
import { canonical, siteUrl } from "@/lib/seo";

export const Route = createFileRoute("/writing/")({
  head: () => ({
    links: canonical("/writing"),
    meta: [
      { property: "og:url", content: siteUrl("/writing") },
      { title: "Writing — Indus Orbit" },
      {
        name: "description",
        content: "Announcements, research notes and vision essays from the team at Indus Orbit.",
      },
      { property: "og:title", content: "Writing — Indus Orbit" },
      {
        property: "og:description",
        content: "Notes from the general intelligence company of India.",
      },
    ],
  }),
  component: WritingPage,
});

type PublishedStory = Awaited<ReturnType<typeof getPublishedStories>>[number];

function WritingPage() {
  const [active, setActive] = useState<Tag>("All");
  const [memberStories, setMemberStories] = useState<PublishedStory[]>([]);
  const [storyError, setStoryError] = useState<string | null>(null);
  const tags: Tag[] = [
    "All",
    "Announcements",
    "Vision",
    "Research",
    "Playbooks",
    "Bharat",
    "Community",
  ];

  useEffect(() => {
    getPublishedStories()
      .then((stories) => {
        setStoryError(null);
        setMemberStories(stories);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Could not load community writing";
        setStoryError(message);
        toast.error(message);
      });
  }, []);

  const dynamicPosts: Post[] = memberStories.map((s) => ({
    slug: slugify(s.title),
    title: s.title,
    excerpt: `${s.content.substring(0, 140)}${s.content.length > 140 ? "…" : ""}`,
    author: s.profiles?.display_name || "Member",
    tag: "Community",
    date: s.published_at
      ? new Date(s.published_at).toLocaleDateString("en-US", {
          month: "short",
          day: "2-digit",
          year: "numeric",
        })
      : "",
    readMin: Math.max(3, Math.round((s.content?.length ?? 600) / 900)),
    gradient: "from-[var(--saffron)]/40 via-[var(--indigo-night)]/50 to-[var(--monsoon)]/80",
    body: [s.content],
  }));

  const allPosts = [...posts, ...dynamicPosts];
  const filtered = active === "All" ? allPosts : allPosts.filter((p) => p.tag === active);
  const featured = filtered[0];
  const rest = filtered.slice(1);

  return (
    <SiteShell>
      {/* HERO */}
      <section className="px-6 pb-10 pt-36 md:pt-44">
        <div className="mx-auto w-full max-w-7xl">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--saffron)]">
            The Orbit Journal
          </p>
          <h1 className="mt-4 max-w-4xl font-display text-5xl font-light leading-[1.02] tracking-tight md:text-7xl">
            Writing from a general intelligence
            <span className="text-[var(--saffron)]"> company for India.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-foreground/70">
            Announcements, research and essays on intelligence, India, and the networks we're
            building between the two. New pieces most weeks.
          </p>

          {/* Newsletter card */}
          <div className="mt-10 flex flex-col items-start gap-4 rounded-3xl border border-border bg-card p-6 shadow-sm md:flex-row md:items-center md:justify-between md:p-7">
            <div className="flex items-center gap-4">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--indigo-night)] text-[var(--parchment)]">
                <Mail className="h-5 w-5" />
              </span>
              <div>
                <p className="font-display text-lg font-medium">Get the Orbit dispatch</p>
                <p className="text-sm text-foreground/60">
                  One considered read on India + intelligence, most Sundays.
                </p>
              </div>
            </div>
            <a
              href="#subscribe"
              className="inline-flex items-center gap-2 rounded-full bg-[var(--indigo-night)] px-5 py-3 text-sm font-semibold text-[var(--parchment)] transition hover:bg-[var(--saffron)] hover:text-[var(--indigo-night)]"
            >
              Subscribe <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          {/* Filter chips */}
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
          {storyError && (
            <p className="mt-6 text-sm text-destructive">
              Could not load community writing: {storyError}
            </p>
          )}
        </div>
      </section>

      {/* FEATURED */}
      {featured && (
        <section className="px-6 pb-16">
          <div className="mx-auto w-full max-w-7xl">
            <Link
              to="/writing/$slug"
              params={{ slug: featured.slug }}
              className="group grid overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition hover:shadow-xl md:grid-cols-5"
            >
              <div
                className={cn(
                  "relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-br md:col-span-3 md:aspect-auto",
                  featured.gradient,
                )}
              >
                <img
                  src={tagImage[featured.tag]}
                  alt=""
                  loading="lazy"
                  width={1280}
                  height={800}
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <span className="absolute left-5 top-5 inline-flex items-center rounded-full bg-[var(--parchment)]/95 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--indigo-night)]">
                  Featured · {featured.tag}
                </span>
              </div>
              <div className="flex flex-col justify-center gap-4 p-8 md:col-span-2 md:p-10">
                <div className="flex items-center gap-3 text-[11px] uppercase tracking-wider text-foreground/55">
                  <span>{featured.date}</span>
                  <span aria-hidden>·</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {featured.readMin} min read
                  </span>
                </div>
                <h2 className="font-display text-3xl font-light leading-tight md:text-4xl">
                  {featured.title}
                </h2>
                <p className="text-foreground/70">{featured.excerpt}</p>
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs uppercase tracking-wider text-foreground/50">
                    {featured.author}
                  </p>
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--indigo-night)] transition group-hover:gap-3">
                    Read essay <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* GRID */}
      <section className="px-6 pb-24">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-8 flex items-end justify-between">
            <h2 className="font-display text-2xl font-medium md:text-3xl">More from the orbit</h2>
            <p className="text-xs uppercase tracking-wider text-foreground/50">
              {rest.length} {rest.length === 1 ? "piece" : "pieces"}
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {rest.map((p) => (
              <Link
                key={p.slug}
                to="/writing/$slug"
                params={{ slug: p.slug }}
                className="group flex flex-col overflow-hidden rounded-3xl border border-border bg-card transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div
                  className={cn(
                    "relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-br",
                    p.gradient,
                  )}
                >
                  <img
                    src={tagImage[p.tag]}
                    alt=""
                    loading="lazy"
                    width={1280}
                    height={800}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="relative p-4">
                    <span className="inline-flex items-center rounded-full bg-[var(--parchment)]/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--indigo-night)]">
                      {p.tag}
                    </span>
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-foreground/50">
                    <span>{p.date}</span>
                    {p.readMin ? (
                      <>
                        <span aria-hidden>·</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {p.readMin} min
                        </span>
                      </>
                    ) : null}
                  </div>
                  <h3 className="mt-3 font-display text-xl font-medium leading-tight">{p.title}</h3>
                  <p className="mt-3 text-sm text-foreground/70">{p.excerpt}</p>
                  <div className="mt-6 flex items-center justify-between">
                    <p className="text-xs uppercase tracking-wider text-foreground/50">
                      {p.author}
                    </p>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--indigo-night)] opacity-0 transition group-hover:opacity-100">
                      Read <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          {rest.length === 0 && (
            <p className="text-center text-sm text-foreground/60">
              Nothing here yet in this category. Try another tag above.
            </p>
          )}
        </div>
      </section>
    </SiteShell>
  );
}

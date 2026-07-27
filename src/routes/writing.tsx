import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { SiteShell } from "@/components/site/SiteShell";
import { cn } from "@/lib/utils";
import { getPublishedStories } from "@/server/society.functions";
import { ArrowRight, Clock, Mail } from "lucide-react";
import { posts, tagImage, slugify, type Post, type Tag } from "@/data/writing-posts";

export const Route = createFileRoute("/writing")({
  head: () => ({
    meta: [
      { title: "Writing — Indus Orbit" },
      {
        name: "description",
        content: "Announcements, research notes and vision essays from the team at Indus Orbit.",
      },
      { property: "og:title", content: "Writing — Indus Orbit" },
      {
        property: "og:description",
        content: "Notes from a general intelligence company built for India.",
      },
    ],
  }),
  component: WritingPage,
});
  {
    title: "Announcing Indus Orbit",
    excerpt:
      "Why we are building a general intelligence company designed around India's people, industries and ambitions — and what an 'orbit' really means.",
    author: "The Orbit",
    tag: "Announcements",
    date: "Jul 22, 2026",
    readMin: 6,
    gradient: "from-[var(--saffron)]/80 via-[var(--gold)]/70 to-[var(--indigo-night)]",
  },
  {
    title: "An orbit, not a pyramid",
    excerpt:
      "Most ecosystems are drawn as pyramids with a few founders at the top. India looks more like an orbit — and that changes what we build.",
    author: "Founders",
    tag: "Vision",
    date: "Jul 14, 2026",
    readMin: 8,
    gradient: "from-[var(--indigo-night)] via-[var(--indigo-night)]/80 to-[var(--saffron)]/70",
  },
  {
    title: "What Indian SMBs actually want from agents",
    excerpt:
      "Field notes from twelve cities and forty businesses on where AI is genuinely useful — and where it is quietly in the way.",
    author: "Orbit Research",
    tag: "Research",
    date: "Jul 03, 2026",
    readMin: 12,
    gradient: "from-[var(--monsoon)]/80 via-[var(--indigo-night)]/90 to-[var(--indigo-night)]",
  },
  {
    title: "The diaspora as an engine, not an audience",
    excerpt:
      "How NRIs can move from cheering India on to actively compounding it — and the rails we are building to make that easier.",
    author: "Orbit Bridge",
    tag: "Vision",
    date: "Jun 21, 2026",
    readMin: 7,
    gradient: "from-[var(--gold)]/80 via-[var(--saffron)]/70 to-[var(--indigo-night)]/90",
  },
  {
    title: "Vernacular first, English second",
    excerpt:
      "Why the next billion users will not switch to English to use AI — and what that demands from the runtime, not just the interface.",
    author: "Orbit Build",
    tag: "Research",
    date: "Jun 09, 2026",
    readMin: 9,
    gradient: "from-[var(--indigo-night)]/90 via-[var(--monsoon)]/60 to-[var(--gold)]/50",
  },
  {
    title: "Build the loop, not the agent",
    excerpt:
      "A short playbook on why the durable unit of AI product work in India is the feedback loop — and how to design one that compounds.",
    author: "Orbit Build",
    tag: "Playbooks",
    date: "May 30, 2026",
    readMin: 10,
    gradient: "from-[var(--saffron)]/60 via-[var(--gold)]/50 to-[var(--indigo-night)]",
  },
  {
    title: "Kirana-scale AI: five patterns that actually stick",
    excerpt:
      "From WhatsApp catalogues to voice-first inventory, the shapes of AI that Indian shopkeepers keep using after the novelty wears off.",
    author: "Orbit Research",
    tag: "Bharat",
    date: "May 18, 2026",
    readMin: 11,
    gradient: "from-[var(--monsoon)]/70 via-[var(--saffron)]/60 to-[var(--indigo-night)]/80",
  },
  {
    title: "The Tier-2 founder is the story of this decade",
    excerpt:
      "Why the most interesting Indian companies of the next ten years will be built in Indore, Jaipur, Coimbatore and Bhubaneswar — and how we're wiring them in.",
    author: "Founders",
    tag: "Bharat",
    date: "May 05, 2026",
    readMin: 7,
    gradient: "from-[var(--gold)]/70 via-[var(--saffron)]/60 to-[var(--indigo-night)]/85",
  },
  {
    title: "The Model Observatory: why we built it",
    excerpt:
      "Charts of intelligence, speed, latency and price for every frontier model — indexed in USD and INR, made for builders who actually pay the bill.",
    author: "The Orbit",
    tag: "Announcements",
    date: "Apr 24, 2026",
    readMin: 5,
    gradient: "from-[var(--indigo-night)]/95 via-[var(--monsoon)]/60 to-[var(--saffron)]/50",
  },
  {
    title: "Trust travels through relationships",
    excerpt:
      "Why an Indian intelligence stack has to route through people, not just APIs — and what that means for how we design the Members directory.",
    author: "The Orbit",
    tag: "Vision",
    date: "Apr 11, 2026",
    readMin: 8,
    gradient: "from-[var(--saffron)]/70 via-[var(--indigo-night)]/80 to-[var(--indigo-night)]",
  },
  {
    title: "A playbook for shipping in a language you don't speak",
    excerpt:
      "Notes from six builders shipping vernacular products they can't natively read — the rituals, guardrails and native partners that make it work.",
    author: "Orbit Build",
    tag: "Playbooks",
    date: "Mar 28, 2026",
    readMin: 9,
    gradient: "from-[var(--indigo-night)]/85 via-[var(--gold)]/50 to-[var(--saffron)]/60",
  },
  {
    title: "We are hiring across product, research and partnerships",
    excerpt:
      "A small, deliberate team in Delhi and Bengaluru. If you care about India and intelligence, we'd love to hear from you.",
    author: "The Orbit",
    tag: "Announcements",
    date: "Mar 15, 2026",
    readMin: 3,
    gradient: "from-[var(--saffron)]/60 via-[var(--indigo-night)]/80 to-[var(--indigo-night)]",
  },
  {
    title: "The context window is the new office",
    excerpt:
      "Adapted for India: as models grow long-memory, the real design surface is not the prompt — it is what your team, tools and customers persistently share with the model.",
    author: "Orbit Build",
    tag: "Vision",
    date: "Mar 02, 2026",
    readMin: 8,
    gradient: "from-[var(--indigo-night)]/90 via-[var(--saffron)]/60 to-[var(--gold)]/50",
  },
  {
    title: "Evals are the new PRDs",
    excerpt:
      "A working note on why Indian AI teams should ship an evaluation set before a spec — and how to build one out of real WhatsApp conversations, call recordings and CRM notes.",
    author: "Orbit Research",
    tag: "Playbooks",
    date: "Feb 18, 2026",
    readMin: 9,
    gradient: "from-[var(--monsoon)]/70 via-[var(--indigo-night)]/85 to-[var(--saffron)]/60",
  },
  {
    title: "Small models, big Bharat",
    excerpt:
      "The frontier is loud, but a lot of India's compounding will happen on 3B–8B open models fine-tuned on local voice, forms and receipts. What that unlocks — and what it costs.",
    author: "Orbit Research",
    tag: "Research",
    date: "Feb 04, 2026",
    readMin: 11,
    gradient: "from-[var(--gold)]/70 via-[var(--saffron)]/60 to-[var(--indigo-night)]/85",
  },
  {
    title: "From prompt engineering to system engineering",
    excerpt:
      "Prompts are a UI. Systems are the product. A field guide for Indian teams graduating past clever prompts into retrieval, tools, memory and guardrails.",
    author: "Orbit Build",
    tag: "Playbooks",
    date: "Jan 22, 2026",
    readMin: 10,
    gradient: "from-[var(--indigo-night)]/90 via-[var(--monsoon)]/60 to-[var(--saffron)]/60",
  },
  {
    title: "The agent is not the moat — the workflow is",
    excerpt:
      "A response to the agent-everything hype, from the vantage point of Indian services businesses where the real leverage is codifying the workflow, not personifying it.",
    author: "Founders",
    tag: "Vision",
    date: "Jan 10, 2026",
    readMin: 7,
    gradient: "from-[var(--saffron)]/70 via-[var(--indigo-night)]/85 to-[var(--indigo-night)]",
  },
  {
    title: "How Indian teams should think about GPU spend in 2026",
    excerpt:
      "A pragmatic breakdown of when to rent, when to reserve, when to burst on Lovable AI Gateway, and when to walk away from a workload. In USD and INR.",
    author: "Orbit Build",
    tag: "Research",
    date: "Dec 20, 2025",
    readMin: 12,
    gradient: "from-[var(--indigo-night)]/95 via-[var(--gold)]/50 to-[var(--saffron)]/60",
  },
  {
    title: "The founder archetypes of Indus Orbit",
    excerpt:
      "Six recurring shapes of India-first founders we keep meeting — the diaspora returner, the tier-2 operator, the ex-services builder — and what each one needs from the orbit.",
    author: "The Orbit",
    tag: "Community",
    date: "Dec 06, 2025",
    readMin: 8,
    gradient: "from-[var(--saffron)]/60 via-[var(--indigo-night)]/85 to-[var(--monsoon)]/70",
  },
];

function WritingPage() {
  const [active, setActive] = useState<Tag>("All");
  const [memberStories, setMemberStories] = useState<any[]>([]);
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
    title: s.title,
    excerpt: `${s.content.substring(0, 140)}${s.content.length > 140 ? "…" : ""}`,
    author: s.profiles?.display_name || "Member",
    tag: "Community",
    date: s.published_at
      ? new Date(s.published_at).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
      : "",
    readMin: Math.max(3, Math.round((s.content?.length ?? 600) / 900)),
    gradient: "from-[var(--saffron)]/40 via-[var(--indigo-night)]/50 to-[var(--monsoon)]/80",
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
            Announcements, research and essays on intelligence, India, and the
            networks we're building between the two. New pieces most weeks.
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
            <article className="group grid overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition hover:shadow-xl md:grid-cols-5">
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
            </article>
          </div>
        </section>
      )}

      {/* GRID */}
      <section className="px-6 pb-24">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-8 flex items-end justify-between">
            <h2 className="font-display text-2xl font-medium md:text-3xl">
              More from the orbit
            </h2>
            <p className="text-xs uppercase tracking-wider text-foreground/50">
              {rest.length} {rest.length === 1 ? "piece" : "pieces"}
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {rest.map((p) => (
              <article
                key={p.title}
                className="group flex flex-col overflow-hidden rounded-3xl border border-border bg-card transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className={cn("relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-br", p.gradient)}>
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
                  <h3 className="mt-3 font-display text-xl font-medium leading-tight">
                    {p.title}
                  </h3>
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
              </article>
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

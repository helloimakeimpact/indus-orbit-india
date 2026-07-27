import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { ArrowLeft, Clock, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { findPostBySlug, posts, tagImage } from "@/data/writing-posts";

export const Route = createFileRoute("/writing/$slug")({
  head: ({ params }) => {
    const post = findPostBySlug(params.slug);
    const title = post ? `${post.title} — Indus Orbit` : "Essay — Indus Orbit";
    const description = post?.excerpt ?? "Writing from Indus Orbit.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
      ],
    };
  },
  component: PostPage,
});

function PostPage() {
  const { slug } = Route.useParams();
  const post = findPostBySlug(slug);

  if (!post) {
    return (
      <SiteShell>
        <section className="px-6 pb-24 pt-40">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--saffron)]">
              404
            </p>
            <h1 className="mt-4 font-display text-4xl font-light">Essay not found</h1>
            <p className="mt-4 text-foreground/70">
              We couldn't find this piece. It may have moved into the dispatch archive.
            </p>
            <Link
              to="/writing"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-[var(--indigo-night)] px-5 py-3 text-sm font-semibold text-[var(--parchment)]"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Writing
            </Link>
          </div>
        </section>
      </SiteShell>
    );
  }

  const related = posts
    .filter((p) => p.tag === post.tag && p.slug !== post.slug)
    .slice(0, 3);

  return (
    <SiteShell>
      {/* HERO */}
      <section className="px-6 pb-10 pt-36 md:pt-44">
        <div className="mx-auto w-full max-w-3xl">
          <Link
            to="/writing"
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60 transition hover:text-[var(--indigo-night)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> The Orbit Journal
          </Link>
          <div className="mt-6 flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-wider text-foreground/55">
            <span className="rounded-full bg-[var(--indigo-night)] px-2.5 py-1 text-[10px] font-semibold text-[var(--parchment)]">
              {post.tag}
            </span>
            <span>{post.date}</span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" /> {post.readMin} min read
            </span>
            <span aria-hidden>·</span>
            <span>{post.author}</span>
          </div>
          <h1 className="mt-6 font-display text-4xl font-light leading-[1.05] tracking-tight md:text-6xl">
            {post.title}
          </h1>
          <p className="mt-6 text-lg text-foreground/70">{post.excerpt}</p>
        </div>
      </section>

      {/* COVER */}
      <section className="px-6 pb-12">
        <div className="mx-auto w-full max-w-5xl">
          <div
            className={cn(
              "relative aspect-[16/8] w-full overflow-hidden rounded-3xl border border-border bg-gradient-to-br",
              post.gradient,
            )}
          >
            <img
              src={tagImage[post.tag]}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* BODY */}
      <section className="px-6 pb-20">
        <article className="mx-auto w-full max-w-3xl space-y-6 text-lg leading-relaxed text-foreground/80">
          {post.body.map((para, i) => (
            <p key={i} className="whitespace-pre-wrap">
              {para}
            </p>
          ))}
        </article>
      </section>

      {/* SUBSCRIBE */}
      <section className="px-6 pb-20">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-start gap-4 rounded-3xl border border-border bg-card p-6 shadow-sm md:flex-row md:items-center md:justify-between md:p-7">
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
          <Link
            to="/writing"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--indigo-night)] px-5 py-3 text-sm font-semibold text-[var(--parchment)] transition hover:bg-[var(--saffron)] hover:text-[var(--indigo-night)]"
          >
            Subscribe
          </Link>
        </div>
      </section>

      {/* RELATED */}
      {related.length > 0 && (
        <section className="px-6 pb-24">
          <div className="mx-auto w-full max-w-5xl">
            <h2 className="mb-6 font-display text-2xl font-medium">More in {post.tag}</h2>
            <div className="grid gap-6 md:grid-cols-3">
              {related.map((p) => (
                <Link
                  key={p.slug}
                  to="/writing/$slug"
                  params={{ slug: p.slug }}
                  className="group flex flex-col overflow-hidden rounded-3xl border border-border bg-card transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className={cn("relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-br", p.gradient)}>
                    <img
                      src={tagImage[p.tag]}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  </div>
                  <div className="p-5">
                    <p className="text-[11px] uppercase tracking-wider text-foreground/50">
                      {p.date}
                    </p>
                    <h3 className="mt-2 font-display text-lg font-medium leading-tight">
                      {p.title}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </SiteShell>
  );
}

// keep import to avoid unused warning if bundler is strict
void notFound;
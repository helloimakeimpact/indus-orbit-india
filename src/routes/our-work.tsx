import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import workImg from "@/assets/work-citylights.jpg";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/our-work")({
  head: () => ({
    meta: [
      { title: "Our Work — Indus Orbit" },
      {
        name: "description",
        content:
          "Initiatives and products from Indus Orbit — youth × mentor matchmaking, agent toolkits for Indian SMBs, and bridges between India and the diaspora.",
      },
      { property: "og:title", content: "Our Work — Indus Orbit" },
      {
        property: "og:description",
        content:
          "Tools and networks we are building to lift India together.",
      },
      { property: "og:image", content: workImg },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: workImg },
    ],
  }),
  component: WorkPage,
});

const items = [
  {
    tag: "Network",
    title: "Youth × Mentor matchmaking",
    author: "Orbit Labs",
    body: "An AI-assisted way to pair first-generation builders with the right industry veteran — by craft, geography and stage, not just résumé.",
    gradient: "from-[var(--indigo-night)] via-[var(--indigo-night)]/80 to-[var(--saffron)]/70",
  },
  {
    tag: "Product",
    title: "Agent toolkit for Indian SMBs",
    author: "Orbit Build",
    body: "A set of agentic tools that let small Indian businesses run sales, ops and support workflows in their own language and on their own infra.",
    gradient: "from-[var(--monsoon)]/80 via-[var(--indigo-night)]/90 to-[var(--indigo-night)]",
  },
  {
    tag: "Bridge",
    title: "NRI ↔ India bridge program",
    author: "Orbit Bridge",
    body: "A working group connecting NRIs with vetted Indian founders, opportunities and giving missions — making the diaspora a real engine, not a sentiment.",
    gradient: "from-[var(--gold)]/80 via-[var(--saffron)]/70 to-[var(--indigo-night)]/90",
  },
  {
    tag: "Research",
    title: "How India actually adopts AI",
    author: "Orbit Research",
    body: "An ongoing study of how AI tools are entering Indian classrooms, kirana stores, clinics and panchayats — and what to build next.",
    gradient: "from-[var(--indigo-night)]/90 via-[var(--monsoon)]/60 to-[var(--gold)]/50",
  },
  {
    tag: "Network",
    title: "Industry expert circles",
    author: "Orbit Labs",
    body: "Small, invite-only circles of senior operators across BFSI, manufacturing, retail and health — giving back time and judgement to the next generation.",
    gradient: "from-[var(--saffron)]/60 via-[var(--indigo-night)]/80 to-[var(--indigo-night)]",
  },
  {
    tag: "Product",
    title: "Vernacular agent runtime",
    author: "Orbit Build",
    body: "A runtime for agents that speak, listen and act in Indian languages first — built around the textures of how Indians actually communicate.",
    gradient: "from-[var(--saffron)]/70 via-[var(--gold)]/60 to-[var(--indigo-night)]",
  },
];

function WorkPage() {
  return (
    <SiteShell navTone="dark">
      <section className="relative h-[55svh] min-h-[420px] w-full overflow-hidden">
        <img
          src={workImg}
          alt="Pixel-art aerial view of an Indian metropolis lit at night"
          width={1600}
          height={900}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--indigo-night)]/40 to-[var(--indigo-night)]/85" />
        <div className="absolute inset-0 flex items-end px-6 pb-14">
          <div className="mx-auto w-full max-w-6xl">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--saffron)]">
              Our Work
            </p>
            <h1 className="mt-3 max-w-3xl font-display text-4xl font-medium leading-tight text-[var(--parchment)] md:text-6xl">
              Tools, networks and research, all moving in the same orbit.
            </h1>
          </div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
            {items.map((it) => (
              <article
                key={it.title}
                className="group flex flex-col overflow-hidden rounded-3xl border border-border bg-card transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className={cn("aspect-[4/3] w-full bg-gradient-to-br", it.gradient)} />
                <div className="flex flex-1 flex-col p-6">
                  <span className="inline-flex w-fit rounded-full bg-foreground/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-foreground/60">
                    {it.tag}
                  </span>
                  <h3 className="mt-4 font-display text-2xl font-medium leading-tight">
                    {it.title}
                  </h3>
                  <p className="mt-3 text-sm text-foreground/70">{it.body}</p>
                  <p className="mt-6 text-xs uppercase tracking-wider text-foreground/50">
                    {it.author}
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

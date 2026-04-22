import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { Segment } from "@/components/auth/segments";

type ModuleCard = {
  title: string;
  desc: string;
  to: string;
  search?: { segment?: Segment };
};

const MODULES: Record<Segment, ModuleCard[]> = {
  youth: [
    { title: "Find a mentor", desc: "Browse experts who pledge time each month.", to: "/app/directory", search: { segment: "expert" } },
    { title: "Meet founders", desc: "See who's building right now.", to: "/app/directory", search: { segment: "founder" } },
  ],
  founder: [
    { title: "Find investors", desc: "Angels, funds and family offices in the orbit.", to: "/app/directory", search: { segment: "investor" } },
    { title: "Find experts", desc: "Senior operators offering judgement and access.", to: "/app/directory", search: { segment: "expert" } },
  ],
  expert: [
    { title: "Founders looking for help", desc: "Match your hours to someone building.", to: "/app/directory", search: { segment: "founder" } },
    { title: "Researchers in your field", desc: "Open collaborations across the orbit.", to: "/app/directory", search: { segment: "researcher" } },
  ],
  investor: [
    { title: "New founders", desc: "Latest builders to enter the orbit.", to: "/app/directory", search: { segment: "founder" } },
    { title: "Co-investors", desc: "Other investors active in India.", to: "/app/directory", search: { segment: "investor" } },
  ],
  diaspora: [
    { title: "Founders to back", desc: "Indian builders shipping right now.", to: "/app/directory", search: { segment: "founder" } },
    { title: "Partner orgs", desc: "Universities, accelerators and NGOs to plug into.", to: "/app/directory", search: { segment: "partner" } },
  ],
  partner: [
    { title: "Founders in the orbit", desc: "Programmes, pilots and partnerships.", to: "/app/directory", search: { segment: "founder" } },
    { title: "Researchers", desc: "Academic and policy collaborators.", to: "/app/directory", search: { segment: "researcher" } },
  ],
  researcher: [
    { title: "Other researchers", desc: "Find collaborators across labs.", to: "/app/directory", search: { segment: "researcher" } },
    { title: "Founders & operators", desc: "Take research into the field.", to: "/app/directory", search: { segment: "founder" } },
  ],
};

export function SegmentHomeModules({ segment }: { segment: Segment }) {
  const cards = MODULES[segment] ?? [];
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {cards.map((c) => (
        <Link
          key={c.title}
          to={c.to}
          search={c.search}
          className="group rounded-3xl border border-border bg-card p-6 transition hover:border-[var(--saffron)] hover:shadow-md"
        >
          <h3 className="font-display text-lg font-semibold text-foreground">{c.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{c.desc}</p>
          <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[var(--indigo-night)] transition-all group-hover:gap-2">
            Open <ArrowRight className="h-4 w-4" />
          </div>
        </Link>
      ))}
    </div>
  );
}

import {
  ChevronDown,
  CircleGauge,
  Cpu,
  DatabaseZap,
  FileSearch,
  Gauge,
  HeartHandshake,
  IndianRupee,
  Menu,
  MessageSquareText,
  Network,
  PanelRightClose,
  PanelRightOpen,
  RadioTower,
  Route,
  ShieldCheck,
  TerminalSquare,
  X,
} from "lucide-react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { IoWorkspaceView } from "@/features/io/io-workspace-view";
import { IoWorkspaceViewContext } from "@/features/io/io-workspace-view-context";
import { cn } from "@/lib/utils";

type IoNavItem = {
  label: string;
  icon: typeof CircleGauge;
  view: IoWorkspaceView;
  count?: string;
};

type IoNavGroup = {
  label: string;
  items: IoNavItem[];
};

const navGroups: IoNavGroup[] = [
  {
    label: "Workspace",
    items: [
      { label: "Overview", icon: CircleGauge, view: "overview" },
      { label: "Sessions", icon: MessageSquareText, view: "sessions" },
      { label: "Terminal", icon: TerminalSquare, view: "terminal" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { label: "Model routes", icon: Route, view: "routes" },
      { label: "Capacity", icon: Cpu, view: "capacity" },
      { label: "Evidence", icon: FileSearch, view: "evidence" },
    ],
  },
  {
    label: "Stewardship",
    items: [
      { label: "Usage ledger", icon: IndianRupee, view: "ledger" },
      { label: "Safety", icon: ShieldCheck, view: "safety" },
    ],
  },
];

const evidenceGuideItems = [
  {
    time: "LIVE",
    title: "Route receipts",
    detail: "Provider, model, capacity, fallback, usage and cost facts are recorded after a route.",
    icon: Route,
    tone: "bg-sky-100 text-sky-800",
  },
  {
    time: "LIVE",
    title: "Capacity entitlements",
    detail: "Only workspace grants and their public provenance are visible to members.",
    icon: RadioTower,
    tone: "bg-sky-100 text-sky-800",
  },
  {
    time: "LIVE",
    title: "Safe terminal audit",
    detail:
      "Local session identifiers can be recorded; passwords, prompts and output stay private.",
    icon: FileSearch,
    tone: "bg-violet-100 text-violet-800",
  },
  {
    time: "POLICY",
    title: "Sponsored capacity",
    detail: "Sponsor identity, public terms, eligibility and quota are explicit before activation.",
    icon: HeartHandshake,
    tone: "bg-amber-100 text-amber-900",
  },
];

type IoWorkspaceShellProps = {
  children: ReactNode;
};

export function IoWorkspaceShell({ children }: IoWorkspaceShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const { view: activeView } = useSearch({ from: "/io" });
  const navigate = useNavigate({ from: "/io" });

  function selectView(view: IoWorkspaceView) {
    setMobileNavOpen(false);
    if (view === activeView) return;
    void navigate({ to: "/io", search: { view } });
  }

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1280px)");
    const updateInspector = () => setInspectorOpen(mediaQuery.matches);
    const animationFrame = window.requestAnimationFrame(updateInspector);

    mediaQuery.addEventListener("change", updateInspector);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      mediaQuery.removeEventListener("change", updateInspector);
    };
  }, []);

  return (
    <IoWorkspaceViewContext.Provider value={activeView}>
      <div className="app-ui mx-auto min-h-[calc(100vh-5.25rem)] max-w-[112rem] overflow-hidden rounded-2xl border border-border/80 bg-card/70 text-foreground shadow-[var(--app-shadow-strong)]">
        <header className="flex min-h-14 items-center gap-2 border-b border-border/70 bg-card/80 px-3 sm:px-4">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label={mobileNavOpen ? "Close I/O navigation" : "Open I/O navigation"}
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen((value) => !value)}
          >
            {mobileNavOpen ? <X /> : <Menu />}
          </Button>

          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--indigo-night)] text-[var(--parchment)] shadow-sm">
              <TerminalSquare className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold text-[var(--indigo-night)]">
                  I/O Port
                </p>
                <Badge className="border-[var(--saffron)]/35 bg-[var(--saffron)]/12 text-[10px] text-[var(--indigo-night)] hover:bg-[var(--saffron)]/12">
                  BETA
                </Badge>
              </div>
              <p className="hidden truncate text-[11px] text-muted-foreground sm:block">
                India-rooted model access, terminal work and shared capacity
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-2 lg:flex">
            <div className="flex items-center gap-1.5 rounded-full border border-border/70 bg-background/50 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              Authenticated workspace evidence
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={inspectorOpen ? "Hide activity inspector" : "Show activity inspector"}
            aria-pressed={inspectorOpen}
            onClick={() => setInspectorOpen((value) => !value)}
          >
            {inspectorOpen ? <PanelRightClose /> : <PanelRightOpen />}
          </Button>
        </header>

        <div
          className={cn(
            "relative grid min-h-[calc(100vh-8.85rem)] md:grid-cols-[13rem_minmax(0,1fr)]",
            inspectorOpen
              ? "xl:grid-cols-[14rem_minmax(0,1fr)_19rem]"
              : "xl:grid-cols-[14rem_minmax(0,1fr)]",
          )}
        >
          <IoContextNav
            className={cn(
              "absolute inset-y-0 left-0 z-20 w-[17rem] shadow-2xl transition-transform md:static md:z-auto md:w-auto md:translate-x-0 md:shadow-none",
              mobileNavOpen ? "translate-x-0" : "-translate-x-full",
            )}
            activeView={activeView}
            onSelect={selectView}
          />

          {mobileNavOpen ? (
            <button
              type="button"
              className="absolute inset-0 z-10 bg-[var(--indigo-night)]/25 backdrop-blur-[2px] md:hidden"
              aria-label="Close I/O navigation"
              onClick={() => setMobileNavOpen(false)}
            />
          ) : null}

          <section aria-label="I/O Port working surface" className="min-w-0 bg-background/50">
            {children}
          </section>

          <IoActivityInspector
            className={cn(
              "fixed inset-y-0 right-0 z-50 w-[min(21rem,90vw)] shadow-2xl transition-transform xl:static xl:z-auto xl:w-auto xl:shadow-none",
              inspectorOpen ? "translate-x-0" : "translate-x-full xl:hidden",
            )}
            onClose={() => setInspectorOpen(false)}
          />

          {inspectorOpen ? (
            <button
              type="button"
              className="fixed inset-0 z-40 bg-[var(--indigo-night)]/25 backdrop-blur-[2px] xl:hidden"
              aria-label="Close activity inspector"
              onClick={() => setInspectorOpen(false)}
            />
          ) : null}
        </div>
      </div>
    </IoWorkspaceViewContext.Provider>
  );
}

export function IoContextNav({
  activeView,
  className,
  onSelect,
}: {
  activeView: IoWorkspaceView;
  className?: string;
  onSelect: (view: IoWorkspaceView) => void;
}) {
  return (
    <aside className={cn("flex min-h-0 flex-col border-r border-border/70 bg-card/95", className)}>
      <div className="border-b border-border/60 p-3">
        <div className="flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-left">
          <span>
            <span className="block text-xs font-semibold text-[var(--indigo-night)]">
              I/O workspace
            </span>
            <span className="block text-[10px] text-muted-foreground">
              Live data is scoped to the signed-in member
            </span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <nav aria-label="I/O Port sections" className="space-y-5 p-3">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = item.view === activeView;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      aria-current={active ? "page" : undefined}
                      onClick={() => onSelect(item.view)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-medium transition",
                        active
                          ? "bg-[var(--indigo-night)] text-[var(--parchment)] shadow-sm"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {item.count ? (
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
                          {item.count}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="rounded-xl border border-[var(--saffron)]/20 bg-[var(--saffron)]/8 p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--indigo-night)]">
              <HeartHandshake className="h-3.5 w-3.5 text-[var(--saffron)]" />
              People-powered capacity
            </div>
            <p className="mt-1.5 text-[10px] leading-4 text-muted-foreground">
              Partner, rented and donated compute share one transparent availability layer.
            </p>
          </div>
        </nav>
      </ScrollArea>

      <div className="border-t border-border/60 p-3">
        <div className="flex items-center gap-2 rounded-xl bg-muted/35 p-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--indigo-night)] text-[var(--parchment)]">
            <Network className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-semibold">Commons network</p>
            <p className="truncate text-[9px] text-muted-foreground">Workspace-scoped</p>
          </div>
          <Badge variant="outline" className="text-[8px] font-semibold">
            RLS
          </Badge>
        </div>
      </div>
    </aside>
  );
}

export function IoActivityInspector({
  className,
  onClose,
}: {
  className?: string;
  onClose?: () => void;
}) {
  return (
    <aside className={cn("min-h-0 border-l border-border/70 bg-card/95", className)}>
      <div className="flex h-14 items-center justify-between border-b border-border/60 px-4">
        <div>
          <p className="text-xs font-semibold text-[var(--indigo-night)]">Evidence & activity</p>
          <p className="text-[10px] text-muted-foreground">What the live workspace records</p>
        </div>
        <Button type="button" variant="ghost" size="icon" className="xl:hidden" onClick={onClose}>
          <X />
          <span className="sr-only">Close activity inspector</span>
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-12.4rem)] min-h-[26rem]">
        <div className="space-y-5 p-4">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Evidence guide
              </p>
              <Badge variant="outline" className="text-[9px] font-semibold">
                LIVE
              </Badge>
            </div>
            <div className="space-y-3">
              {evidenceGuideItems.map((item) => {
                const Icon = item.icon;
                return (
                  <article key={`${item.time}-${item.title}`} className="flex gap-2.5">
                    <span
                      className={cn(
                        "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                        item.tone,
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 border-b border-border/45 pb-3">
                      <p className="text-[11px] font-semibold leading-4 text-foreground">
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-[10px] leading-4 text-muted-foreground">
                        {item.detail}
                      </p>
                      <p className="mt-1 text-[9px] font-medium text-muted-foreground/75">
                        {item.time}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="rounded-xl border border-border/70 bg-background/50 p-3">
            <div className="flex items-center gap-2">
              <Gauge className="h-3.5 w-3.5 text-[var(--saffron)]" />
              <p className="text-[11px] font-semibold text-[var(--indigo-night)]">Route evidence</p>
            </div>
            <p className="mt-2 text-[10px] leading-4 text-muted-foreground">
              Provider readiness is fail-closed. Member receipts expose route facts without exposing
              credentials, prompts, generated content or raw upstream errors.
            </p>
          </section>

          <section className="rounded-xl bg-[var(--indigo-night)] p-3 text-[var(--parchment)]">
            <div className="flex items-center gap-2">
              <DatabaseZap className="h-3.5 w-3.5 text-[var(--saffron)]" />
              <p className="text-[11px] font-semibold">Inspectable by design</p>
            </div>
            <p className="mt-2 text-[10px] leading-4 text-[var(--parchment)]/70">
              Every completed provider route records model, capacity, policy version, usage and an
              estimated cost. Provider billing remains the settlement source of truth.
            </p>
          </section>
        </div>
      </ScrollArea>
    </aside>
  );
}

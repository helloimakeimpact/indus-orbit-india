import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  CloudCog,
  FileCheck2,
  Globe2,
  HandHeart,
  IndianRupee,
  Lightbulb,
  LoaderCircle,
  Orbit,
  PlugZap,
  RadioTower,
  Route,
  Send,
  Server,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  UsersRound,
  Workflow,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { runOpenCodeSession, type OpenCodeRunResult } from "@/features/io/opencode";
import {
  createMyIoWorkspace,
  getIoAuditEvents,
  getIoCapacitySources,
  getIoRouteCatalog,
  getMyIoWorkspaces,
  recordLocalOpenCodeSession,
  runPartnerRoute,
  type IoAuditEvent,
  type IoCapacitySource,
  type IoRouteCatalog,
  type IoRouteStrategy,
  type IoWorkspace,
  type PartnerRunResult,
} from "@/features/io/io.client";

type SessionMode = "observe" | "plan" | "build" | "run";
type ExecutionPath = "partner" | "terminal";

const routeSignals = [
  { label: "India residency", value: "Preferred", icon: Globe2 },
  { label: "Evidence mode", value: "Required", icon: FileCheck2 },
  { label: "Budget guard", value: "Workspace policy", icon: IndianRupee },
  { label: "Data policy", value: "Visible before run", icon: ShieldCheck },
];

export function IoOverview() {
  const [workspace, setWorkspace] = useState<IoWorkspace | null>(null);
  const [workspaces, setWorkspaces] = useState<IoWorkspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const selectedWorkspaceIdRef = useRef<string | null>(null);
  const workspaceLoadSequence = useRef(0);
  const [sources, setSources] = useState<IoCapacitySource[]>([]);
  const [events, setEvents] = useState<IoAuditEvent[]>([]);
  const [routeCatalog, setRouteCatalog] = useState<IoRouteCatalog | null>(null);
  const [routeCatalogError, setRouteCatalogError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState<SessionMode>("plan");
  const [path, setPath] = useState<ExecutionPath>("terminal");
  const [routeStrategy, setRouteStrategy] = useState<IoRouteStrategy>("latest_affordable");
  const [requestedModelId, setRequestedModelId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [openCodeUrl, setOpenCodeUrl] = useState("http://127.0.0.1:4096");
  const [openCodePassword, setOpenCodePassword] = useState("");
  const [partnerResult, setPartnerResult] = useState<PartnerRunResult | null>(null);
  const [terminalResult, setTerminalResult] = useState<OpenCodeRunResult | null>(null);

  const loadWorkspace = useCallback(async (requestedWorkspaceId?: string) => {
    const loadSequence = ++workspaceLoadSequence.current;
    const preferredWorkspaceId = requestedWorkspaceId ?? selectedWorkspaceIdRef.current;
    setLoading(true);
    try {
      const availableWorkspaces = await getMyIoWorkspaces();
      if (loadSequence !== workspaceLoadSequence.current) return;
      setWorkspaces(availableWorkspaces);
      const nextWorkspace =
        availableWorkspaces.find((candidate) => candidate.id === preferredWorkspaceId) ??
        availableWorkspaces[0] ??
        null;
      setWorkspace(nextWorkspace);
      setSelectedWorkspaceId(nextWorkspace?.id ?? null);
      selectedWorkspaceIdRef.current = nextWorkspace?.id ?? null;
      if (!nextWorkspace) {
        setSources([]);
        setEvents([]);
        setRouteCatalog(null);
        setRouteCatalogError(null);
        setRequestedModelId("");
        return;
      }
      setCatalogLoading(true);
      const [sourcesResult, eventsResult, catalogResult] = await Promise.allSettled([
        getIoCapacitySources(nextWorkspace.id),
        getIoAuditEvents(nextWorkspace.id),
        getIoRouteCatalog(nextWorkspace.id),
      ]);
      if (loadSequence !== workspaceLoadSequence.current) return;
      if (sourcesResult.status === "rejected") throw sourcesResult.reason;
      if (eventsResult.status === "rejected") throw eventsResult.reason;
      setSources(sourcesResult.value);
      setEvents(eventsResult.value);
      if (catalogResult.status === "fulfilled") {
        setRouteCatalog(catalogResult.value);
        setRouteCatalogError(null);
        setRequestedModelId((currentModelId) =>
          catalogResult.value.models.some((model) => model.modelId === currentModelId)
            ? currentModelId
            : (catalogResult.value.models[0]?.modelId ?? ""),
        );
      } else {
        setRouteCatalog(null);
        setRouteCatalogError(
          catalogResult.reason instanceof Error
            ? catalogResult.reason.message
            : "The provider catalogue is not available.",
        );
        setRequestedModelId("");
      }
    } catch (error) {
      if (loadSequence === workspaceLoadSequence.current) {
        toast.error(error instanceof Error ? error.message : "Could not load I/O Port.");
      }
    } finally {
      if (loadSequence === workspaceLoadSequence.current) {
        setLoading(false);
        setCatalogLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => loadWorkspace());

    return () => {
      workspaceLoadSequence.current += 1;
    };
  }, [loadWorkspace]);

  function selectWorkspace(workspaceId: string) {
    setSelectedWorkspaceId(workspaceId);
    selectedWorkspaceIdRef.current = workspaceId;
    void loadWorkspace(workspaceId);
  }

  async function createWorkspace() {
    setCreating(true);
    try {
      const created = await createMyIoWorkspace();
      setSelectedWorkspaceId(created.id);
      selectedWorkspaceIdRef.current = created.id;
      setWorkspace(created);
      toast.success("Your I/O workspace is ready.");
      await loadWorkspace(created.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the workspace.");
    } finally {
      setCreating(false);
    }
  }

  async function runSession() {
    if (!workspace || !prompt.trim()) return;
    setRunning(true);
    setPartnerResult(null);
    setTerminalResult(null);

    try {
      if (path === "partner") {
        const result = await runPartnerRoute({
          workspaceId: workspace.id,
          prompt: prompt.trim(),
          mode,
          routeStrategy,
          requestedModelId: routeStrategy === "explicit_model" ? requestedModelId : undefined,
        });
        setPartnerResult(result);
        toast.success(`Routed through ${result.provider}.`);
      } else {
        const result = await runOpenCodeSession({
          serverUrl: openCodeUrl,
          password: openCodePassword,
          title: `I/O ${mode} session`,
          prompt: prompt.trim(),
        });
        setTerminalResult(result);
        void recordLocalOpenCodeSession({
          workspaceId: workspace.id,
          connectorOrigin: openCodeUrl,
          sessionId: result.sessionId,
        }).then(() => loadWorkspace(workspace.id));
        toast.success("OpenCode session completed on this device.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The session could not run.");
    } finally {
      setRunning(false);
    }
  }

  const readySources = sources.filter((source) => source.status === "active");
  const hasRoutableModels = Boolean(routeCatalog?.models.length);
  const canRunPartner =
    hasRoutableModels &&
    !catalogLoading &&
    (routeStrategy !== "explicit_model" || Boolean(requestedModelId));

  return (
    <div className="min-w-0 space-y-4 p-3 sm:p-4 lg:p-5">
      <section className="overflow-hidden rounded-2xl bg-[var(--indigo-night)] text-[var(--parchment)] shadow-[var(--app-shadow)]">
        <div className="relative p-4 sm:p-5">
          <div
            className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full border border-[var(--saffron)]/20"
            aria-hidden="true"
          />
          <div className="relative flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--saffron)] text-[var(--indigo-night)]">
                  <TerminalSquare className="h-4 w-4" />
                </span>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--saffron)]">
                  I/O workspace
                </p>
                <Badge className="border-white/15 bg-white/8 text-[9px] text-[var(--parchment)] hover:bg-white/8">
                  DEMO CONTROL PLANE
                </Badge>
              </div>
              <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">
                Intelligence, routed with purpose.
              </h1>
              <p className="mt-2 max-w-xl text-xs leading-5 text-[var(--parchment)]/68 sm:text-sm sm:leading-6">
                One accountable surface for partner intelligence and local agent work—each run makes
                its capacity source, policy boundary and result legible.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 xl:w-[22rem]">
              <HeroMetric value={String(readySources.length)} label="ready sources" />
              <HeroMetric value="2" label="execution paths" />
              <HeroMetric value={workspace ? "linked" : "setup"} label="workspace" />
            </div>
          </div>
        </div>
      </section>

      {!loading && !workspace ? (
        <section className="app-glass rounded-2xl p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="app-workspace-kicker">First orbit</p>
              <h2 className="mt-1 text-lg font-semibold text-[var(--indigo-night)]">
                Create your I/O workspace
              </h2>
              <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
                This creates your member-owned boundary for routes, terminal audits, policies and
                future keys. It does not create a model account or send any request.
              </p>
            </div>
            <Button type="button" disabled={creating} onClick={createWorkspace}>
              {creating ? <LoaderCircle className="animate-spin" /> : <Sparkles />}
              Create workspace
            </Button>
          </div>
        </section>
      ) : null}

      <section className="app-glass rounded-2xl p-3 sm:p-4">
        <div className="flex flex-col gap-3 border-b border-border/60 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[var(--saffron)]" />
              <h2 className="text-base font-semibold text-[var(--indigo-night)]">
                Start a session
              </h2>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Select the execution boundary before any work is sent.
            </p>
          </div>

          <div className="app-filter-row" aria-label="Session mode">
            {(["observe", "plan", "build", "run"] as const).map((item) => (
              <button
                key={item}
                type="button"
                className="app-chip capitalize"
                data-active={mode === item}
                aria-pressed={mode === item}
                onClick={() => setMode(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {workspace ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/65 bg-background/40 px-3 py-2">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-muted-foreground">
                Active I/O workspace
              </p>
              <p className="truncate text-xs font-semibold text-[var(--indigo-night)]">
                {workspace.name}
              </p>
            </div>
            {workspaces.length > 1 ? (
              <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="sr-only">Choose active I/O workspace</span>
                <select
                  value={workspace.id}
                  disabled={loading || running}
                  onChange={(event) => selectWorkspace(event.target.value)}
                  className="h-8 max-w-52 rounded-lg border border-border/70 bg-background px-2 text-xs font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-[var(--saffron)]"
                >
                  {workspaces.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <Badge variant="outline" className="text-[9px]">
                PERSONAL CONTEXT
              </Badge>
            )}
          </div>
        ) : null}

        <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_15rem]">
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <PathButton
                active={path === "terminal"}
                icon={<TerminalSquare className="h-4 w-4" />}
                title="I/O Terminal · this device"
                detail="OpenCode session, tools, Git and permissions stay local."
                onClick={() => setPath("terminal")}
              />
              <PathButton
                active={path === "partner"}
                icon={<CloudCog className="h-4 w-4" />}
                title="Provider partnership"
                detail="Server-gated model route with a recorded capacity source."
                onClick={() => setPath("partner")}
              />
            </div>

            {path === "terminal" ? (
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_11rem]">
                <Input
                  value={openCodeUrl}
                  onChange={(event) => setOpenCodeUrl(event.target.value)}
                  aria-label="OpenCode server URL"
                  placeholder="http://127.0.0.1:4096"
                />
                <Input
                  type="password"
                  value={openCodePassword}
                  onChange={(event) => setOpenCodePassword(event.target.value)}
                  aria-label="OpenCode server password"
                  placeholder="Password (if set)"
                />
              </div>
            ) : (
              <div className="space-y-2 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sky-950">
                <p className="text-[11px] leading-4">
                  Partner calls are routed only through the I/O gateway. Browser code never receives
                  a provider credential. A configured partner source and entitlement are required.
                </p>
                <div className="flex flex-wrap gap-1.5" aria-label="Partner routing strategy">
                  {(
                    [
                      ["latest_affordable", "Latest + affordable"],
                      ["lowest_cost", "Lowest cost"],
                      ["explicit_model", "Choose a model"],
                    ] as const
                  ).map(([strategy, label]) => (
                    <button
                      key={strategy}
                      type="button"
                      className="app-chip text-[10px]"
                      data-active={routeStrategy === strategy}
                      aria-pressed={routeStrategy === strategy}
                      disabled={
                        routeCatalog ? !routeCatalog.routeStrategies.includes(strategy) : false
                      }
                      onClick={() => setRouteStrategy(strategy)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {routeStrategy === "explicit_model" ? (
                  <label className="block text-[10px] font-semibold">
                    Model approved for this workspace
                    <select
                      value={requestedModelId}
                      disabled={!hasRoutableModels || catalogLoading}
                      onChange={(event) => setRequestedModelId(event.target.value)}
                      className="mt-1.5 h-9 w-full rounded-lg border border-sky-200 bg-background px-2 text-xs font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-[var(--saffron)]"
                    >
                      {!hasRoutableModels ? (
                        <option value="">No eligible provider models</option>
                      ) : null}
                      {routeCatalog?.models.map((model) => (
                        <option key={model.modelId} value={model.modelId}>
                          {model.providerDisplayName} · {model.modelDisplayName} ({model.tier})
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                {catalogLoading ? (
                  <p className="text-[10px] text-sky-900/70">Checking approved routes…</p>
                ) : !hasRoutableModels ? (
                  <p className="text-[10px] leading-4 text-sky-900/75">
                    No approved route is available for this workspace yet. It will appear after a
                    verified endpoint, price card, active capacity grant and server secret are in
                    place.
                  </p>
                ) : (
                  <p className="text-[10px] text-sky-900/75">
                    {routeCatalog?.models.length} reviewed model
                    {routeCatalog?.models.length === 1 ? "" : "s"} available. Selection evidence is
                    recorded without prompts or response text.
                  </p>
                )}
                {routeCatalogError ? (
                  <p className="text-[10px] leading-4 text-amber-900">
                    Catalogue status: {routeCatalogError}
                  </p>
                ) : null}
              </div>
            )}

            <div className="relative">
              <Textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Describe what you want to understand, plan, build or run…"
                aria-label="Session prompt"
                className="min-h-28 resize-none rounded-xl border-border/70 pb-12 text-sm"
              />
              <div className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  {path === "terminal" ? (
                    <PlugZap className="h-3.5 w-3.5" />
                  ) : (
                    <Route className="h-3.5 w-3.5" />
                  )}
                  {path === "terminal" ? "Local OpenCode only" : "Gateway policy check"}
                </div>
                <Button
                  type="button"
                  size="sm"
                  disabled={
                    !workspace ||
                    !prompt.trim() ||
                    running ||
                    (path === "partner" && !canRunPartner)
                  }
                  onClick={runSession}
                >
                  {running ? <LoaderCircle className="animate-spin" /> : <Send />}
                  {path === "terminal" ? "Run local" : "Route request"}
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-background/45 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-muted-foreground">
              Route intent
            </p>
            <div className="mt-2 space-y-2">
              {routeSignals.map((signal) => {
                const Icon = signal.icon;
                return (
                  <div key={signal.label} className="flex items-center gap-2 text-[10px]">
                    <Icon className="h-3.5 w-3.5 text-[var(--saffron)]" />
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">
                      {signal.label}
                    </span>
                    <span className="font-semibold text-foreground">{signal.value}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <RunResult partner={partnerResult} terminal={terminalResult} />
      </section>

      <section>
        <div className="mb-2.5 flex flex-wrap items-end justify-between gap-2 px-0.5">
          <div>
            <p className="app-workspace-kicker">Capacity commons</p>
            <h2 className="mt-1 text-lg font-semibold text-[var(--indigo-night)]">
              Sources your workspace is entitled to use
            </h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={loading}
            onClick={() => void loadWorkspace()}
          >
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-3 lg:grid-cols-3">
            {[0, 1, 2].map((index) => (
              <div key={index} className="h-40 animate-pulse rounded-2xl bg-muted/50" />
            ))}
          </div>
        ) : sources.length ? (
          <div className="grid gap-3 lg:grid-cols-3">
            {sources.map((source) => (
              <CapacityCard key={source.id} source={source} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card/60 p-5 text-sm text-muted-foreground">
            No capacity is assigned to this workspace yet. Local OpenCode remains available on your
            own device; partner and sponsored pools need an approved workspace grant.
          </div>
        )}
      </section>

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.45fr)_minmax(17rem,0.55fr)]">
        <section className="app-glass overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
            <div>
              <p className="app-workspace-kicker">Inspectable activity</p>
              <h2 className="mt-1 text-base font-semibold text-[var(--indigo-night)]">
                Gateway and terminal trail
              </h2>
            </div>
            <Badge variant="outline" className="text-[9px]">
              NO PROMPTS STORED
            </Badge>
          </div>

          {events.length ? (
            <div className="divide-y divide-border/55">
              {events.map((event) => (
                <article key={event.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--indigo-night)]/7 text-[var(--indigo-night)]">
                    {event.eventType.includes("partner") ? (
                      <RadioTower className="h-4 w-4" />
                    ) : (
                      <TerminalSquare className="h-4 w-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-foreground">
                      {humanizeEvent(event.eventType)}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                      {event.payload.model
                        ? String(event.payload.model)
                        : "No prompt or response body retained"}
                    </p>
                  </div>
                  <p className="text-[9px] text-muted-foreground">
                    {new Date(event.occurredAt).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <div className="flex min-h-40 flex-col items-center justify-center p-6 text-center">
              <Workflow className="h-7 w-7 text-muted-foreground/35" />
              <p className="mt-2 text-sm font-medium text-muted-foreground">No I/O activity yet</p>
              <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
                Run through a partner or local terminal to establish the first inspectable trail.
              </p>
            </div>
          )}
        </section>

        <section className="app-glass rounded-2xl p-4">
          <div className="flex items-center gap-2">
            <UsersRound className="h-4 w-4 text-[var(--saffron)]" />
            <div>
              <p className="app-workspace-kicker">Orbit context</p>
              <h2 className="mt-1 text-base font-semibold text-[var(--indigo-night)]">
                Work stays connected
              </h2>
            </div>
          </div>
          <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
            Attach the work to people, missions and skills without creating a separate community
            silo.
          </p>

          <div className="mt-3 space-y-2">
            <OrbitLink
              to="/app/directory"
              icon={<UsersRound className="h-4 w-4" />}
              label="Find people"
              detail="Invite expertise into a session"
            />
            <OrbitLink
              to="/app/missions"
              icon={<Orbit className="h-4 w-4" />}
              label="Attach a mission"
              detail="Keep outcomes in public context"
            />
            <OrbitLink
              to="/app/skills"
              icon={<Lightbulb className="h-4 w-4" />}
              label="Map skills"
              detail="Learn from work, not only claims"
            />
          </div>

          <div className="mt-3 flex items-start gap-2 rounded-xl bg-[var(--saffron)]/10 p-3">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[var(--saffron)]" />
            <p className="text-[10px] leading-4 text-[var(--indigo-night)]/80">
              Partner credentials are server secrets. OpenCode passwords remain in this page only
              and are never written to Supabase.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function PathButton({
  active,
  icon,
  title,
  detail,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-xl border p-3 text-left transition",
        active
          ? "border-[var(--saffron)]/60 bg-[var(--saffron)]/10 shadow-sm"
          : "border-border/70 bg-background/40 hover:border-[var(--saffron)]/35",
      )}
    >
      <span className="flex items-center gap-2 text-xs font-semibold text-[var(--indigo-night)]">
        {icon}
        {title}
      </span>
      <span className="mt-1 block text-[10px] leading-4 text-muted-foreground">{detail}</span>
    </button>
  );
}

function CapacityCard({ source }: { source: IoCapacitySource }) {
  const icon =
    source.provenance === "partner_provider" ? (
      <CloudCog className="h-4 w-4" />
    ) : source.provenance.includes("donated") || source.provenance.includes("sponsored") ? (
      <HandHeart className="h-4 w-4" />
    ) : (
      <Server className="h-4 w-4" />
    );
  const tone =
    source.provenance === "partner_provider"
      ? "bg-sky-100 text-sky-900"
      : source.provenance.includes("donated") || source.provenance.includes("sponsored")
        ? "bg-amber-100 text-amber-950"
        : "bg-emerald-100 text-emerald-900";

  return (
    <article className="app-glass rounded-2xl p-3.5">
      <div className="flex items-start justify-between gap-3">
        <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", tone)}>
          {icon}
        </span>
        <Badge variant="outline" className="text-[9px] capitalize">
          {source.status}
        </Badge>
      </div>
      <h3 className="mt-3 text-sm font-semibold text-[var(--indigo-night)]">
        {source.displayName}
      </h3>
      <p className="mt-1 text-[10px] font-medium text-muted-foreground">{source.operatorName}</p>
      <p className="mt-2 min-h-10 text-[11px] leading-4 text-muted-foreground">
        {source.notes ?? "No public source note has been supplied yet."}
      </p>
      <div className="mt-3 flex items-center justify-between border-t border-border/55 pt-2.5 text-[10px]">
        <span className="font-semibold capitalize text-foreground">
          {source.grantKind.replace(/_/g, " ")}
        </span>
        <span className="text-muted-foreground">{formatQuota(source)}</span>
      </div>
    </article>
  );
}

function RunResult({
  partner,
  terminal,
}: {
  partner: PartnerRunResult | null;
  terminal: OpenCodeRunResult | null;
}) {
  const result = partner ?? terminal;
  if (!result) return null;
  const source = partner
    ? `${partner.provider} · ${partner.model}`
    : `OpenCode · ${terminal?.serverVersion ?? "local server"}`;
  return (
    <section className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/65 p-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-950">
        <CheckCircle2 className="h-4 w-4" />
        Run completed through {source}
      </div>
      <p className="mt-2 max-h-44 overflow-y-auto whitespace-pre-wrap text-xs leading-5 text-emerald-950/85">
        {partner?.content ?? terminal?.content}
      </p>
      {partner ? (
        <div className="mt-3 grid gap-2 border-t border-emerald-200/80 pt-2.5 text-[10px] text-emerald-950/80 sm:grid-cols-2 lg:grid-cols-4">
          <RouteFact label="Receipt" value={partner.receiptId} />
          <RouteFact
            label="Selection"
            value={
              partner.modelSelection === "latest_affordable"
                ? "Latest + affordable"
                : partner.modelSelection === "lowest_cost"
                  ? "Lowest cost"
                  : "Chosen model"
            }
          />
          <RouteFact
            label="Capacity"
            value={`${partner.route.capacityMode}${partner.route.regionCode ? ` · ${partner.route.regionCode}` : ""}`}
          />
          <RouteFact label="Fallbacks" value={String(partner.route.fallbackCount)} />
        </div>
      ) : null}
    </section>
  );
}

function RouteFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="font-semibold uppercase tracking-[0.1em] text-emerald-900/65">{label}</p>
      <p className="mt-0.5 truncate font-medium text-emerald-950" title={value}>
        {value}
      </p>
    </div>
  );
}

function HeroMetric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.06] p-2.5 backdrop-blur-sm">
      <p className="text-base font-semibold text-[var(--saffron)] sm:text-lg">{value}</p>
      <p className="mt-0.5 text-[9px] leading-3 text-[var(--parchment)]/60">{label}</p>
    </div>
  );
}

function OrbitLink({
  to,
  icon,
  label,
  detail,
}: {
  to: "/app/directory" | "/app/missions" | "/app/skills";
  icon: ReactNode;
  label: string;
  detail: string;
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-2.5 rounded-xl border border-border/65 bg-background/40 p-2.5 transition hover:border-[var(--saffron)]/40 hover:bg-[var(--saffron)]/7"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--indigo-night)] text-[var(--parchment)]">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold text-foreground">{label}</span>
        <span className="block truncate text-[9px] text-muted-foreground">{detail}</span>
      </span>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition group-hover:translate-x-0.5" />
    </Link>
  );
}

function formatQuota(source: IoCapacitySource) {
  if (source.quotaAmount == null || !source.quotaUnit) return source.country ?? "Policy controlled";
  return `${source.quotaAmount.toLocaleString()} ${source.quotaUnit.replace(/_/g, " ")}`;
}

function humanizeEvent(value: string) {
  return value
    .replace(/^io\./, "")
    .replace(/[._-]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

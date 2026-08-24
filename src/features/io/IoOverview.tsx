import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  CloudCog,
  Copy,
  FileCheck2,
  Globe2,
  HandHeart,
  IndianRupee,
  KeyRound,
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
  Square,
  TerminalSquare,
  Trash2,
  UsersRound,
  Workflow,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { IO_WORKSPACE_VIEW_META } from "@/features/io/io-workspace-view";
import { useIoWorkspaceView } from "@/features/io/io-workspace-view-context";
import {
  inspectOpenCodeLocalSession,
  loadOpenCodeLocalBinding,
  OpenCodeStoppedError,
  runOpenCodeSession,
  saveOpenCodeLocalBinding,
  type OpenCodeReconnectSummary,
  type OpenCodeRunResult,
} from "@/features/io/opencode";
import {
  createMyIoWorkspace,
  createMyIoTestApiKey,
  createMyIoTerminalSession,
  completeMyIoTerminalSession,
  appendMyIoTerminalEvent,
  getIoAuditEvents,
  getMyIoBudgetStatus,
  getMyIoWorkspaceProviderPolicy,
  getIoCapacitySources,
  getIoRouteReceipts,
  getIoRouteCatalog,
  getMyIoWorkspaces,
  listMyIoApiKeys,
  listMyIoTerminalSessions,
  listMyIoTerminalEvents,
  preflightPartnerRoute,
  runPartnerRoute,
  setMyIoWorkspaceProviderPolicy,
  revokeMyIoApiKey,
  type IoApiKeyMetadata,
  type IoAuditEvent,
  type IoCapacitySource,
  type IoBudgetStatus,
  type IoRouteCatalog,
  type IoRoutePreflight,
  type IoRouteReceipt,
  type IoRouteStrategy,
  type IoTerminalSession,
  type IoTerminalEvent,
  type IoWorkspace,
  type IoWorkspaceProviderPolicy,
  type PartnerRunResult,
} from "@/features/io/io.client";

type SessionMode = "observe" | "plan" | "build" | "run";
type ExecutionPath = "partner" | "terminal";

export function IoOverview() {
  const activeView = useIoWorkspaceView();
  const [workspace, setWorkspace] = useState<IoWorkspace | null>(null);
  const [workspaces, setWorkspaces] = useState<IoWorkspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const selectedWorkspaceIdRef = useRef<string | null>(null);
  const workspaceLoadSequence = useRef(0);
  const terminalAbortController = useRef<AbortController | null>(null);
  const terminalTimelineLoadSequence = useRef(0);
  const [sources, setSources] = useState<IoCapacitySource[]>([]);
  const [events, setEvents] = useState<IoAuditEvent[]>([]);
  const [receipts, setReceipts] = useState<IoRouteReceipt[]>([]);
  const [budgets, setBudgets] = useState<IoBudgetStatus[]>([]);
  const [apiKeys, setApiKeys] = useState<IoApiKeyMetadata[]>([]);
  const [apiKeyName, setApiKeyName] = useState("My development key");
  const [newRawApiKey, setNewRawApiKey] = useState<string | null>(null);
  const [apiKeyBusy, setApiKeyBusy] = useState<string | null>(null);
  const [routeCatalog, setRouteCatalog] = useState<IoRouteCatalog | null>(null);
  const [providerPolicy, setProviderPolicy] = useState<IoWorkspaceProviderPolicy | null>(null);
  const [providerPolicyBusy, setProviderPolicyBusy] = useState(false);
  const [terminalSessions, setTerminalSessions] = useState<IoTerminalSession[]>([]);
  const [terminalTimeline, setTerminalTimeline] = useState<IoTerminalEvent[]>([]);
  const [selectedTerminalSessionId, setSelectedTerminalSessionId] = useState<string | null>(null);
  const [terminalTimelineLoading, setTerminalTimelineLoading] = useState(false);
  const [terminalReconnectBusy, setTerminalReconnectBusy] = useState<string | null>(null);
  const [terminalReconnect, setTerminalReconnect] = useState<{
    durableSessionId: string;
    summary: OpenCodeReconnectSummary;
  } | null>(null);
  const [routeCatalogError, setRouteCatalogError] = useState<string | null>(null);
  const [routePreflight, setRoutePreflight] = useState<IoRoutePreflight | null>(null);
  const [preflightLoading, setPreflightLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState<SessionMode>("plan");
  const [path, setPath] = useState<ExecutionPath>(activeView === "routes" ? "partner" : "terminal");
  const [routeStrategy, setRouteStrategy] = useState<IoRouteStrategy>("latest_affordable");
  const [requestedModelId, setRequestedModelId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [openCodeUrl, setOpenCodeUrl] = useState("http://127.0.0.1:4096");
  const [openCodePassword, setOpenCodePassword] = useState("");
  const [partnerResult, setPartnerResult] = useState<PartnerRunResult | null>(null);
  const [terminalResult, setTerminalResult] = useState<OpenCodeRunResult | null>(null);
  const executionPath: ExecutionPath =
    activeView === "routes" ? "partner" : activeView === "terminal" ? "terminal" : path;

  useEffect(
    () => () => {
      terminalAbortController.current?.abort();
    },
    [],
  );

  useEffect(() => {
    const sessionId = selectedTerminalSessionId;
    if (!sessionId) return;
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    void (async () => {
      await supabase.realtime.setAuth();
      if (!active) return;
      channel = supabase
        .channel(`io-terminal:${sessionId}`, { config: { private: true } })
        .on("broadcast", { event: "*" }, () => {
          const loadSequence = ++terminalTimelineLoadSequence.current;
          void listMyIoTerminalEvents(sessionId)
            .then((timeline) => {
              if (
                active &&
                selectedTerminalSessionId === sessionId &&
                loadSequence === terminalTimelineLoadSequence.current
              ) {
                setTerminalTimeline(timeline);
              }
            })
            .catch(() => {
              // The next manual refresh remains available; never expose Realtime internals.
            });
        })
        .subscribe();
    })();

    return () => {
      active = false;
      terminalTimelineLoadSequence.current += 1;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [selectedTerminalSessionId]);

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
        setReceipts([]);
        setBudgets([]);
        setApiKeys([]);
        setNewRawApiKey(null);
        setRouteCatalog(null);
        setProviderPolicy(null);
        setTerminalSessions([]);
        setTerminalTimeline([]);
        setSelectedTerminalSessionId(null);
        setRouteCatalogError(null);
        setRequestedModelId("");
        return;
      }
      setCatalogLoading(true);
      const [
        sourcesResult,
        eventsResult,
        receiptsResult,
        budgetResult,
        apiKeysResult,
        terminalSessionsResult,
        providerPolicyResult,
        catalogResult,
      ] = await Promise.allSettled([
        getIoCapacitySources(nextWorkspace.id),
        getIoAuditEvents(nextWorkspace.id),
        getIoRouteReceipts(nextWorkspace.id),
        getMyIoBudgetStatus(nextWorkspace.id),
        listMyIoApiKeys(nextWorkspace.id),
        listMyIoTerminalSessions(nextWorkspace.id),
        getMyIoWorkspaceProviderPolicy(nextWorkspace.id),
        getIoRouteCatalog(nextWorkspace.id),
      ]);
      if (loadSequence !== workspaceLoadSequence.current) return;
      if (sourcesResult.status === "rejected") throw sourcesResult.reason;
      if (eventsResult.status === "rejected") throw eventsResult.reason;
      if (receiptsResult.status === "rejected") throw receiptsResult.reason;
      if (budgetResult.status === "rejected") throw budgetResult.reason;
      if (apiKeysResult.status === "rejected") throw apiKeysResult.reason;
      if (terminalSessionsResult.status === "rejected") throw terminalSessionsResult.reason;
      if (providerPolicyResult.status === "rejected") throw providerPolicyResult.reason;
      setSources(sourcesResult.value);
      setEvents(eventsResult.value);
      setReceipts(receiptsResult.value);
      setBudgets(budgetResult.value);
      setApiKeys(apiKeysResult.value);
      setNewRawApiKey(null);
      setTerminalSessions(terminalSessionsResult.value);
      setProviderPolicy(providerPolicyResult.value);
      setRoutePreflight(null);
      setTerminalTimeline([]);
      setSelectedTerminalSessionId(null);
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

  async function toggleTerminalTimeline(sessionId: string) {
    if (selectedTerminalSessionId === sessionId) {
      setSelectedTerminalSessionId(null);
      setTerminalTimeline([]);
      return;
    }
    setSelectedTerminalSessionId(sessionId);
    setTerminalTimelineLoading(true);
    const loadSequence = ++terminalTimelineLoadSequence.current;
    try {
      const timeline = await listMyIoTerminalEvents(sessionId);
      if (loadSequence === terminalTimelineLoadSequence.current) {
        setTerminalTimeline(timeline);
      }
    } catch (error) {
      if (loadSequence === terminalTimelineLoadSequence.current) {
        setTerminalTimeline([]);
        toast.error(error instanceof Error ? error.message : "Could not load terminal metadata.");
      }
    } finally {
      if (loadSequence === terminalTimelineLoadSequence.current) {
        setTerminalTimelineLoading(false);
      }
    }
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

  async function createApiKey() {
    if (!workspace || apiKeyName.trim().length < 2) return;
    setApiKeyBusy("create");
    try {
      const created = await createMyIoTestApiKey(workspace.id, apiKeyName.trim());
      setApiKeys((current) => [created, ...current.filter((key) => key.id !== created.id)]);
      setNewRawApiKey(created.rawKey);
      toast.success("Test API key created. Copy it now; it will not be shown again.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the API key.");
    } finally {
      setApiKeyBusy(null);
    }
  }

  async function revokeApiKey(keyId: string) {
    setApiKeyBusy(keyId);
    try {
      await revokeMyIoApiKey(keyId);
      setApiKeys((current) =>
        current.map((key) =>
          key.id === keyId
            ? { ...key, status: "revoked" as const, lastUsedAt: key.lastUsedAt }
            : key,
        ),
      );
      toast.success("API key revoked.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not revoke the API key.");
    } finally {
      setApiKeyBusy(null);
    }
  }

  async function toggleChinaHostedRoute() {
    if (!workspace || providerPolicyBusy) return;
    const next = !providerPolicy?.allowChinaHosted;
    setProviderPolicyBusy(true);
    try {
      const updated = await setMyIoWorkspaceProviderPolicy(workspace.id, next);
      setProviderPolicy(updated);
      toast.success(
        next
          ? "China-hosted provider routes are allowed for this workspace."
          : "China-hosted provider routes are blocked for this workspace.",
      );
      await loadWorkspace(workspace.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update provider policy.");
    } finally {
      setProviderPolicyBusy(false);
    }
  }

  async function copyApiValue(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied.`);
    } catch {
      toast.error(`Could not copy ${label.toLowerCase()}.`);
    }
  }

  async function runSession() {
    if (!workspace || !prompt.trim()) return;
    setRunning(true);
    setPartnerResult(null);
    setTerminalResult(null);

    const localAbortController = executionPath === "terminal" ? new AbortController() : null;
    if (localAbortController) terminalAbortController.current = localAbortController;

    try {
      if (executionPath === "partner") {
        const result = await runPartnerRoute({
          workspaceId: workspace.id,
          prompt: prompt.trim(),
          mode,
          routeStrategy,
          requestedModelId: routeStrategy === "explicit_model" ? requestedModelId : undefined,
        });
        setPartnerResult(result);
        await loadWorkspace(workspace.id);
        toast.success(`Routed through ${result.provider}.`);
      } else {
        let durableSessionId: string | null = null;
        let durableMetadataFailed = false;
        let localBindingFailed = false;
        const result = await runOpenCodeSession({
          serverUrl: openCodeUrl,
          password: openCodePassword,
          title: `I/O ${mode} session`,
          prompt: prompt.trim(),
          signal: localAbortController?.signal,
          onSessionCreated: async (session) => {
            try {
              const durable = await createMyIoTerminalSession({
                workspaceId: workspace.id,
                title: `I/O ${mode} session`,
                mode,
                connectorOrigin: session.connectorOrigin,
                runtimeReference: session.sessionId,
                runtimeVersion: session.serverVersion,
              });
              durableSessionId = durable.id;
              if (typeof window !== "undefined") {
                try {
                  saveOpenCodeLocalBinding(window.localStorage, {
                    durableSessionId: durable.id,
                    connectorOrigin: session.connectorOrigin,
                    sessionId: session.sessionId,
                    serverVersion: session.serverVersion,
                    storedAt: new Date().toISOString(),
                  });
                } catch {
                  localBindingFailed = true;
                }
              }
            } catch {
              durableMetadataFailed = true;
            }
          },
          onMetadataEvent: async (_session, event) => {
            if (!durableSessionId) return;
            try {
              await appendMyIoTerminalEvent({
                sessionId: durableSessionId,
                type: event.type,
                payload: event.payload,
              });
            } catch {
              durableMetadataFailed = true;
            }
          },
          onSessionSettled: async (_session, state) => {
            if (!durableSessionId) return;
            try {
              await completeMyIoTerminalSession(durableSessionId, state);
            } catch {
              durableMetadataFailed = true;
            }
          },
        });
        setTerminalResult(result);
        await loadWorkspace(workspace.id);
        if (!durableMetadataFailed && !localBindingFailed) {
          toast.success("OpenCode session completed and its durable safe metadata was recorded.");
        } else if (!durableMetadataFailed) {
          toast.warning(
            "OpenCode completed, but this browser could not retain its local-only reconnect binding.",
          );
        } else {
          toast.warning(
            "OpenCode completed locally, but its durable metadata could not be fully recorded.",
          );
        }
      }
    } catch (error) {
      if (error instanceof OpenCodeStoppedError) {
        toast.info("The local OpenCode request was stopped. Its safe lifecycle was recorded.");
      } else {
        toast.error(error instanceof Error ? error.message : "The session could not run.");
      }
    } finally {
      if (terminalAbortController.current === localAbortController) {
        terminalAbortController.current = null;
      }
      setRunning(false);
    }
  }

  async function explainPartnerRoute() {
    if (!workspace || !prompt.trim() || !canRunPartner || preflightLoading) return;
    setPreflightLoading(true);
    setRoutePreflight(null);
    try {
      const result = await preflightPartnerRoute({
        workspaceId: workspace.id,
        prompt: prompt.trim(),
        mode,
        routeStrategy,
        requestedModelId: routeStrategy === "explicit_model" ? requestedModelId : undefined,
      });
      setRoutePreflight(result);
      toast.success("Route checked without sending a provider request.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The route preflight could not run.");
    } finally {
      setPreflightLoading(false);
    }
  }

  function stopTerminalSession() {
    terminalAbortController.current?.abort();
  }

  async function reconnectLocalTerminal(session: IoTerminalSession) {
    if (typeof window === "undefined" || terminalReconnectBusy) return;
    const binding = loadOpenCodeLocalBinding(window.localStorage, session.id);
    if (!binding) {
      toast.info(
        "This browser has no local binding for that run. Reconnect is available only on the device that created it.",
      );
      return;
    }
    setTerminalReconnectBusy(session.id);
    try {
      const summary = await inspectOpenCodeLocalSession({
        binding,
        password: openCodePassword,
      });
      setTerminalReconnect({ durableSessionId: session.id, summary });
      toast.success("Reconnected to the exact local OpenCode session.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Local OpenCode reconnect failed.");
    } finally {
      setTerminalReconnectBusy(null);
    }
  }

  const readySources = sources.filter((source) => source.status === "active");
  const hasRoutableModels = Boolean(routeCatalog?.models.length);
  const canRunPartner =
    hasRoutableModels &&
    budgets.length > 0 &&
    !catalogLoading &&
    (routeStrategy !== "explicit_model" || Boolean(requestedModelId));
  const routeSignals = [
    { label: "Registry evidence", value: "Enforced", icon: FileCheck2 },
    {
      label: "Budget reservation",
      value: budgets.length ? "Hard limit" : "Needs operator limit",
      icon: IndianRupee,
    },
    { label: "Endpoint health", value: "Circuit protected", icon: Globe2 },
    { label: "Retention evidence", value: "Receipt bound", icon: ShieldCheck },
  ];
  const ioApiBaseUrl =
    import.meta.env.VITE_IO_API_BASE_URL?.trim().replace(/\/$/, "") ||
    `${(import.meta.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "")}/functions/v1/io-openai/v1`;
  const viewMeta = IO_WORKSPACE_VIEW_META[activeView];
  const sessionView =
    activeView === "sessions" || activeView === "terminal" || activeView === "routes";
  const sessionHeading =
    activeView === "terminal"
      ? "Run on this device"
      : activeView === "routes"
        ? "Prepare a provider route"
        : "Start a session";
  const sessionDescription =
    activeView === "terminal"
      ? "Connect to a local OpenCode server; prompts, output, code and passwords stay on this device."
      : activeView === "routes"
        ? "Review eligibility, residency, capacity and price evidence before any provider call."
        : "Select the execution boundary before any work is sent.";

  return (
    <div className="min-w-0 space-y-4 p-3 sm:p-4 lg:p-5">
      {activeView === "overview" ? (
        <section
          id="io-overview"
          className="overflow-hidden rounded-2xl bg-[var(--indigo-night)] text-[var(--parchment)] shadow-[var(--app-shadow)]"
        >
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
                  One accountable surface for partner intelligence and local agent work—each run
                  makes its capacity source, policy boundary and result legible.
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
      ) : (
        <section className="app-glass rounded-2xl px-4 py-4 sm:px-5" aria-live="polite">
          <p className="app-workspace-kicker">{viewMeta.eyebrow}</p>
          <h1 className="mt-1 text-xl font-semibold text-[var(--indigo-night)]">
            {viewMeta.title}
          </h1>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">
            {viewMeta.description}
          </p>
        </section>
      )}

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

      {sessionView ? (
        <section id="io-sessions" className="app-glass rounded-2xl p-3 sm:p-4">
          <div className="flex flex-col gap-3 border-b border-border/60 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[var(--saffron)]" />
                <h2 className="text-base font-semibold text-[var(--indigo-night)]">
                  {sessionHeading}
                </h2>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">{sessionDescription}</p>
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
              <div
                id="io-terminal"
                className={cn("grid gap-2", activeView === "sessions" && "sm:grid-cols-2")}
              >
                {activeView !== "routes" ? (
                  <PathButton
                    active={executionPath === "terminal"}
                    icon={<TerminalSquare className="h-4 w-4" />}
                    title="I/O Terminal · this device"
                    detail="OpenCode session, tools, Git and permissions stay local."
                    disabled={running}
                    onClick={() => setPath("terminal")}
                  />
                ) : null}
                {activeView !== "terminal" ? (
                  <PathButton
                    active={executionPath === "partner"}
                    icon={<CloudCog className="h-4 w-4" />}
                    title="Provider partnership"
                    detail="Server-gated model route with a recorded capacity source."
                    disabled={running}
                    onClick={() => setPath("partner")}
                  />
                ) : null}
              </div>

              {executionPath === "terminal" ? (
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
                <div
                  id="io-model-routes"
                  className="scroll-mt-24 space-y-2 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sky-950"
                >
                  <p className="text-[11px] leading-4">
                    Partner calls are routed only through the I/O gateway. Browser code never
                    receives a provider credential. A configured partner source and entitlement are
                    required.
                  </p>
                  <div className="flex flex-col gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2 text-amber-950 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-[10px] leading-4">
                      <strong>China-hosted lane:</strong> DeepSeek may process and store data in
                      China, and verified API zero-retention/no-training controls are not yet
                      recorded. It is excluded unless this workspace explicitly accepts both
                      conditions.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant={providerPolicy?.allowChinaHosted ? "default" : "outline"}
                      className="shrink-0 text-[10px]"
                      disabled={!workspace || providerPolicyBusy}
                      onClick={() => void toggleChinaHostedRoute()}
                    >
                      {providerPolicyBusy ? <LoaderCircle className="animate-spin" /> : <Globe2 />}
                      {providerPolicy?.allowChinaHosted ? "Allowed · turn off" : "Review + allow"}
                    </Button>
                  </div>
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
                        onClick={() => {
                          setRouteStrategy(strategy);
                          setRoutePreflight(null);
                        }}
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
                        onChange={(event) => {
                          setRequestedModelId(event.target.value);
                          setRoutePreflight(null);
                        }}
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
                      {routeCatalog?.models.length === 1 ? "" : "s"} available. Selection evidence
                      is recorded without prompts or response text.
                    </p>
                  )}
                  {routeCatalogError ? (
                    <p className="text-[10px] leading-4 text-amber-900">
                      Catalogue status: {routeCatalogError}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!canRunPartner || !prompt.trim() || preflightLoading || running}
                      onClick={() => void explainPartnerRoute()}
                    >
                      {preflightLoading ? (
                        <LoaderCircle className="animate-spin" />
                      ) : (
                        <FileCheck2 />
                      )}
                      Explain route first
                    </Button>
                    <p className="text-[10px] text-sky-900/70">
                      No provider request, token usage or charge is created by preflight.
                    </p>
                  </div>
                  {routePreflight ? (
                    <div className="grid gap-2 rounded-lg border border-sky-200 bg-white/70 p-2.5 sm:grid-cols-2">
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-sky-900/60">
                          Selected route
                        </p>
                        <p className="mt-1 text-xs font-semibold">
                          {routePreflight.selected.providerDisplayName} ·{" "}
                          {routePreflight.selected.modelDisplayName}
                        </p>
                        <p className="mt-1 text-[10px] text-sky-900/70">
                          {routePreflight.candidateCount} eligible candidate
                          {routePreflight.candidateCount === 1 ? "" : "s"} · capability v
                          {routePreflight.selected.capabilityVersion} · price v
                          {routePreflight.selected.priceVersion}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-sky-900/60">
                          Conservative estimate
                        </p>
                        <p className="mt-1 text-xs font-semibold">
                          {formatNanos(
                            routePreflight.estimate.customerChargeNanos,
                            routePreflight.selected.currencyCode,
                          )}
                        </p>
                        <p className="mt-1 text-[10px] text-sky-900/70">
                          Provider{" "}
                          {formatNanos(
                            routePreflight.estimate.providerCostNanos,
                            routePreflight.selected.currencyCode,
                          )}{" "}
                          + {routePreflight.estimate.serviceFeeBasisPoints / 100}% I/O fee ·{" "}
                          {routePreflight.selected.residencyCountryCode ?? "residency not claimed"}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              <div className="relative">
                <Textarea
                  value={prompt}
                  onChange={(event) => {
                    setPrompt(event.target.value);
                    setRoutePreflight(null);
                  }}
                  placeholder="Describe what you want to understand, plan, build or run…"
                  aria-label="Session prompt"
                  className="min-h-28 resize-none rounded-xl border-border/70 pb-12 text-sm"
                />
                <div className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    {executionPath === "terminal" ? (
                      <PlugZap className="h-3.5 w-3.5" />
                    ) : (
                      <Route className="h-3.5 w-3.5" />
                    )}
                    {executionPath === "terminal"
                      ? "Local OpenCode only"
                      : "Entitlement + reviewed registry checks"}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={
                      running
                        ? executionPath !== "terminal"
                        : !workspace ||
                          !prompt.trim() ||
                          prompt.trim().length > 24_000 ||
                          (executionPath === "partner" && !canRunPartner)
                    }
                    onClick={
                      running && executionPath === "terminal" ? stopTerminalSession : runSession
                    }
                  >
                    {running ? (
                      executionPath === "terminal" ? (
                        <Square />
                      ) : (
                        <LoaderCircle className="animate-spin" />
                      )
                    ) : (
                      <Send />
                    )}
                    {running
                      ? executionPath === "terminal"
                        ? "Stop local"
                        : "Routing…"
                      : executionPath === "terminal"
                        ? "Run local"
                        : "Route request"}
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
              {budgets.length ? (
                <div className="mt-3 border-t border-border/60 pt-2.5">
                  {budgets.map((budget) => (
                    <div key={budget.budgetLimitId} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-[10px]">
                        <span className="text-muted-foreground">Available this period</span>
                        <span className="font-semibold text-foreground">
                          {formatMinor(budget.remainingMinor, budget.currencyCode)}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-[var(--saffron)]"
                          style={{
                            width: `${Math.min(100, ((budget.spentMinor + budget.reservedMinor) / Math.max(1, budget.hardLimitMinor)) * 100)}%`,
                          }}
                        />
                      </div>
                      <p className="text-[9px] text-muted-foreground">
                        {formatMinor(budget.spentMinor, budget.currencyCode)} settled ·{" "}
                        {formatMinor(budget.reservedMinor, budget.currencyCode)} reserved
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 border-t border-border/60 pt-2.5 text-[9px] leading-4 text-amber-800">
                  Partner calls stay blocked until an operator assigns a workspace budget.
                </p>
              )}
            </div>
          </div>

          <RunResult partner={partnerResult} terminal={terminalResult} />
        </section>
      ) : null}

      {activeView === "overview" ? (
        <section id="io-api-keys" className="app-glass overflow-hidden rounded-2xl">
          <div className="flex flex-col gap-3 border-b border-border/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-[var(--saffron)]" />
                <h2 className="text-base font-semibold text-[var(--indigo-night)]">I/O API keys</h2>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                OpenAI-compatible, workspace-scoped test access for servers, CLIs and local agents.
                Provider secrets never leave I/O.
              </p>
            </div>
            <Badge variant="outline" className="w-fit text-[9px]">
              {apiKeys.filter((key) => key.status === "active").length} ACTIVE
            </Badge>
          </div>

          <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                <Input
                  value={apiKeyName}
                  maxLength={120}
                  disabled={!workspace || apiKeyBusy !== null}
                  className="disabled:opacity-70"
                  onChange={(event) => setApiKeyName(event.target.value)}
                  aria-label="New API key name"
                  placeholder="My development key"
                />
                <Button
                  type="button"
                  disabled={!workspace || apiKeyBusy !== null || apiKeyName.trim().length < 2}
                  onClick={() => void createApiKey()}
                >
                  {apiKeyBusy === "create" ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <KeyRound />
                  )}
                  Create 30-day test key
                </Button>
              </div>
              <p className="text-[10px] leading-4 text-muted-foreground">
                Workspace owners and admins can create keys. New keys receive model-list and
                inference scopes and expire after 30 days. The beta policy enforces 20
                requests/minute, 200/day, 2,000/month, plus USD 1/day and USD 10/month
                customer-charge ceilings. Do not put an I/O key in browser JavaScript; use the
                signed-in I/O web workspace instead.
              </p>

              {newRawApiKey ? (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-950">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em]">
                    Copy now · shown once
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <code className="min-w-0 flex-1 overflow-x-auto rounded-lg bg-white/70 px-2 py-2 text-[10px]">
                      {newRawApiKey}
                    </code>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      aria-label="Copy new API key"
                      onClick={() => void copyApiValue(newRawApiKey, "API key")}
                    >
                      <Copy />
                    </Button>
                  </div>
                  <button
                    type="button"
                    className="mt-2 text-[10px] font-semibold underline underline-offset-2"
                    onClick={() => setNewRawApiKey(null)}
                  >
                    I have stored it securely
                  </button>
                </div>
              ) : null}

              <div className="divide-y divide-border/55 rounded-xl border border-border/65">
                {apiKeys.length ? (
                  apiKeys.map((key) => (
                    <article
                      key={key.id}
                      className="grid gap-2 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-foreground">{key.name}</p>
                        <p className="mt-1 truncate font-mono text-[9px] text-muted-foreground">
                          {key.keyPrefix}…{key.lastFour} · expires{" "}
                          {key.expiresAt ? new Date(key.expiresAt).toLocaleDateString() : "never"}
                        </p>
                        <p className="mt-1 text-[9px] text-muted-foreground">
                          {key.requestsPerMinute}/min · {key.requestsPerDay}/day ·{" "}
                          {key.requestsPerMonth}/month ·{" "}
                          {formatNanos(key.spendPerDayNanos, key.spendCurrencyCode)}
                          /day · {formatNanos(key.spendPerMonthNanos, key.spendCurrencyCode)}/month
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "w-fit text-[9px] uppercase",
                          key.status === "active"
                            ? "border-emerald-300 text-emerald-800"
                            : "border-border text-muted-foreground",
                        )}
                      >
                        {key.status}
                      </Badge>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 w-fit px-2 text-[10px] text-destructive"
                        disabled={key.status !== "active" || apiKeyBusy !== null}
                        onClick={() => void revokeApiKey(key.id)}
                      >
                        {apiKeyBusy === key.id ? (
                          <LoaderCircle className="animate-spin" />
                        ) : (
                          <Trash2 />
                        )}
                        Revoke
                      </Button>
                    </article>
                  ))
                ) : (
                  <p className="px-3 py-4 text-[11px] text-muted-foreground">
                    No API keys exist for this workspace.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border/65 bg-[var(--indigo-night)] p-3 text-[var(--parchment)]">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--saffron)]">
                OpenAI-compatible base URL
              </p>
              <div className="mt-2 flex items-center gap-2">
                <code className="min-w-0 flex-1 overflow-x-auto text-[10px]">{ioApiBaseUrl}</code>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                  aria-label="Copy I/O API base URL"
                  onClick={() => void copyApiValue(ioApiBaseUrl, "Base URL")}
                >
                  <Copy />
                </Button>
              </div>
              <div className="mt-3 space-y-1.5 text-[10px] leading-4 text-[var(--parchment)]/70">
                <p>GET /models lists only routes entitled to this workspace.</p>
                <p>POST /chat/completions supports non-streaming text chat.</p>
                <p>
                  Default model: io/latest-affordable. Cost, fallback and capacity evidence remain
                  receipted.
                </p>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {activeView === "sessions" || activeView === "terminal" ? (
        <section className="app-glass overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
            <div>
              <p className="app-workspace-kicker">Local terminal continuity</p>
              <h2 className="mt-1 text-base font-semibold text-[var(--indigo-night)]">
                Durable session metadata
              </h2>
            </div>
            <Badge variant="outline" className="text-[9px]">
              CONTENT STAYS LOCAL
            </Badge>
          </div>
          {terminalSessions.length ? (
            <div className="divide-y divide-border/55">
              {terminalSessions.map((session) => (
                <article
                  key={session.id}
                  className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-foreground">
                      {session.title}
                    </p>
                    <p className="mt-1 text-[9px] text-muted-foreground">
                      {new Date(session.startedAt).toLocaleString()} · OpenCode{" "}
                      {session.runtimeVersion ?? "version unknown"}
                    </p>
                  </div>
                  <Badge variant="outline" className="w-fit text-[9px] capitalize">
                    {session.mode}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={cn(
                      "w-fit text-[9px] capitalize",
                      session.state === "completed"
                        ? "border-emerald-300 text-emerald-800"
                        : session.state === "running"
                          ? "border-sky-300 text-sky-800"
                          : "border-amber-300 text-amber-800",
                    )}
                  >
                    {session.state}
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[10px]"
                    disabled={terminalReconnectBusy !== null}
                    onClick={() => void reconnectLocalTerminal(session)}
                  >
                    {terminalReconnectBusy === session.id ? (
                      <LoaderCircle className="animate-spin" />
                    ) : (
                      <PlugZap />
                    )}
                    Reconnect local
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[10px]"
                    aria-expanded={selectedTerminalSessionId === session.id}
                    onClick={() => void toggleTerminalTimeline(session.id)}
                  >
                    {selectedTerminalSessionId === session.id ? "Hide timeline" : "Timeline"}
                  </Button>
                  {terminalReconnect?.durableSessionId === session.id ? (
                    <div className="sm:col-span-5 grid gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] text-emerald-950 sm:grid-cols-3">
                      <span>
                        Local status: <strong>{terminalReconnect.summary.status}</strong>
                      </span>
                      <span>
                        Tasks: <strong>{terminalReconnect.summary.todoCount}</strong>
                      </span>
                      <span>
                        Changed files: <strong>{terminalReconnect.summary.changedFileCount}</strong>
                      </span>
                    </div>
                  ) : null}
                  {selectedTerminalSessionId === session.id ? (
                    <div className="sm:col-span-5 rounded-lg border border-border/60 bg-muted/25 px-3 py-2">
                      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                        Safe metadata timeline · private live resume · content remains local
                      </p>
                      {terminalTimelineLoading ? (
                        <p className="mt-1 text-[10px] text-muted-foreground">Loading timeline…</p>
                      ) : terminalTimeline.length ? (
                        <ol className="mt-1.5 space-y-1.5">
                          {terminalTimeline
                            .slice()
                            .reverse()
                            .map((event) => (
                              <li
                                key={event.id}
                                className="flex flex-wrap items-center justify-between gap-1 text-[10px]"
                              >
                                <span className="font-medium text-foreground">
                                  {event.sequence}. {event.type.replace(".", " ")}
                                </span>
                                <span className="text-muted-foreground">
                                  {new Date(event.occurredAt).toLocaleString()} ·{" "}
                                  {event.contentClassification.replace("_", " ")}
                                </span>
                              </li>
                            ))}
                        </ol>
                      ) : (
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          No cloud timeline events were recorded for this session.
                        </p>
                      )}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <p className="p-5 text-xs leading-5 text-muted-foreground">
              No durable local terminal sessions yet. New runs store only lifecycle metadata and
              hashes—not prompts, responses, code, paths, shell output or passwords.
            </p>
          )}
        </section>
      ) : null}

      {activeView === "capacity" ? (
        <section id="io-capacity">
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
              No capacity is assigned to this workspace yet. Local OpenCode remains available on
              your own device; partner and sponsored pools need an approved workspace grant.
            </div>
          )}
        </section>
      ) : null}

      {activeView === "evidence" || activeView === "ledger" ? (
        <section id="io-evidence" className="app-glass overflow-hidden rounded-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
            <div>
              <p className="app-workspace-kicker">Route evidence</p>
              <h2 className="mt-1 text-base font-semibold text-[var(--indigo-night)]">
                Provider receipts and usage ledger
              </h2>
            </div>
            <Badge variant="outline" className="text-[9px]">
              REDACTED BY DESIGN
            </Badge>
          </div>
          <div id="io-usage-ledger">
            {loading ? (
              <div className="h-32 animate-pulse bg-muted/30" />
            ) : receipts.length ? (
              <div className="divide-y divide-border/55">
                {receipts.map((receipt) => (
                  <RouteReceiptRow key={receipt.id} receipt={receipt} />
                ))}
              </div>
            ) : (
              <div className="flex min-h-36 flex-col items-center justify-center p-6 text-center">
                <FileCheck2 className="h-7 w-7 text-muted-foreground/35" />
                <p className="mt-2 text-sm font-medium text-muted-foreground">
                  No provider route receipts yet
                </p>
                <p className="mt-1 max-w-md text-xs leading-5 text-muted-foreground">
                  Successful and failed partner routes will record model, capacity, fallback, token
                  and estimated-cost facts. Prompt and response bodies are never stored here.
                </p>
              </div>
            )}
          </div>
        </section>
      ) : null}

      {activeView === "evidence" || activeView === "safety" ? (
        <div
          className={cn(
            "grid gap-4",
            activeView === "evidence" && "2xl:grid-cols-[minmax(0,1.45fr)_minmax(17rem,0.55fr)]",
          )}
        >
          {activeView === "evidence" ? (
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
                  <p className="mt-2 text-sm font-medium text-muted-foreground">
                    No I/O activity yet
                  </p>
                  <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
                    Run through a partner or local terminal to establish the first inspectable
                    trail.
                  </p>
                </div>
              )}
            </section>
          ) : null}

          <section className="app-glass rounded-2xl p-4">
            <div className="flex items-center gap-2">
              <UsersRound className="h-4 w-4 text-[var(--saffron)]" />
              <div>
                <p className="app-workspace-kicker">
                  {activeView === "safety" ? "Safety boundary" : "Orbit context"}
                </p>
                <h2 className="mt-1 text-base font-semibold text-[var(--indigo-night)]">
                  {activeView === "safety"
                    ? "Credentials and content stay controlled"
                    : "Work stays connected"}
                </h2>
              </div>
            </div>
            <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
              {activeView === "safety"
                ? "I/O records the minimum evidence required for accountability without turning private work into community content."
                : "Attach the work to people, missions and skills without creating a separate community silo."}
            </p>

            {activeView === "evidence" ? (
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
            ) : null}

            <div
              id="io-safety"
              className="mt-3 flex items-start gap-2 rounded-xl bg-[var(--saffron)]/10 p-3"
            >
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[var(--saffron)]" />
              <p className="text-[10px] leading-4 text-[var(--indigo-night)]/80">
                Partner credentials are server secrets. OpenCode passwords remain in this page only
                and are never written to Supabase.
              </p>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function PathButton({
  active,
  icon,
  title,
  detail,
  disabled,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  title: string;
  detail: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60",
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

function RouteReceiptRow({ receipt }: { receipt: IoRouteReceipt }) {
  const routeLabel = [receipt.providerKey, receipt.modelKey].filter(Boolean).join(" · ");
  const location = receipt.residencyCountryCode ?? receipt.regionCode ?? "Not declared";
  return (
    <article className="grid gap-3 px-4 py-3 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(7rem,0.6fr))] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              "text-[9px] capitalize",
              receipt.resultState === "completed"
                ? "border-emerald-300 text-emerald-800"
                : "border-red-300 text-red-800",
            )}
          >
            {receipt.resultState}
          </Badge>
          <p className="truncate text-xs font-semibold text-foreground">
            {routeLabel || "No route selected"}
          </p>
        </div>
        <p className="mt-1 truncate font-mono text-[9px] text-muted-foreground" title={receipt.id}>
          Receipt {receipt.id}
        </p>
        <p className="mt-1 text-[9px] text-muted-foreground">
          {new Date(receipt.createdAt).toLocaleString()} · {humanizeEvent(receipt.routeStrategy)}
        </p>
      </div>
      <ReceiptFact
        label="Capacity"
        value={`${receipt.capacityMode ?? "Not selected"} · ${location}`}
      />
      <ReceiptFact
        label="Attempts"
        value={`${receipt.attemptCount} total · ${receipt.failedAttemptCount} failed · ${receipt.fallbackCount} fallbacks`}
      />
      <ReceiptFact
        label="Usage / estimate"
        value={`${formatTokens(receipt.inputTokens, receipt.outputTokens)} · ${formatNanos(receipt.estimatedCostNanos, receipt.currencyCode)}`}
      />
    </article>
  );
}

function ReceiptFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 truncate text-[10px] font-medium text-foreground" title={value}>
        {value}
      </p>
    </div>
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
        <div className="mt-3 grid gap-2 border-t border-emerald-200/80 pt-2.5 text-[10px] text-emerald-950/80 sm:grid-cols-2 lg:grid-cols-7">
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
          <RouteFact
            label="Provider cost"
            value={`${formatNanos(partner.route.providerCostNanos, partner.route.currencyCode)} · ${partner.route.costBasis === "provider_usage" ? "metered" : "estimated"}`}
          />
          <RouteFact
            label={`I/O fee · ${partner.route.serviceFeeBasisPoints / 100}%`}
            value={formatNanos(partner.route.serviceFeeNanos, partner.route.currencyCode)}
          />
          <RouteFact
            label="Customer charge"
            value={formatMinor(partner.route.settledMinor, partner.route.currencyCode)}
          />
        </div>
      ) : terminal ? (
        <div className="mt-3 grid gap-2 border-t border-emerald-200/80 pt-2.5 text-[10px] text-emerald-950/80 sm:grid-cols-2">
          <RouteFact label="Local session" value={terminal.sessionId} />
          <RouteFact
            label="Changed files"
            value={
              terminal.changedFileCount === null
                ? "Not reported by this OpenCode version"
                : String(terminal.changedFileCount)
            }
          />
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

function formatTokens(inputTokens: number | null, outputTokens: number | null) {
  if (inputTokens == null && outputTokens == null) return "Tokens unavailable";
  return `${(inputTokens ?? 0).toLocaleString()} in / ${(outputTokens ?? 0).toLocaleString()} out`;
}

function formatNanos(nanos: number | null, currencyCode: string | null) {
  if (nanos == null || !currencyCode) return "Estimate unavailable";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 6,
  }).format(nanos / 1_000_000_000);
}

function formatMinor(minor: number, currencyCode: string) {
  const formatter = new Intl.NumberFormat(undefined, { style: "currency", currency: currencyCode });
  const digits = formatter.resolvedOptions().maximumFractionDigits ?? 2;
  return formatter.format(minor / 10 ** digits);
}

function humanizeEvent(value: string) {
  return value
    .replace(/^io\./, "")
    .replace(/[._-]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

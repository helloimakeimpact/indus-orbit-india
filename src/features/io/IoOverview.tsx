import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  CloudCog,
  Copy,
  FileCheck2,
  FileDown,
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
  WalletCards,
  Workflow,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  IOPortOpenCodeClient,
  type OpenCodeFileDiff,
  type OpenCodeCapabilities,
  type OpenCodeEvent,
  type OpenCodePairing,
  type OpenCodePermission,
  type OpenCodeTaskNode,
  type OpenCodeTimelineEntry,
} from "../../../packages/io-opencode-client/src/index";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { IO_WORKSPACE_VIEW_META } from "@/features/io/io-workspace-view";
import { useIoWorkspaceView } from "@/features/io/io-workspace-view-context";
import { apiKeyLifecycle, usagePercent } from "@/features/io/api-key-usage";
import {
  TERMINAL_MODE_POLICIES,
  terminalCredentialLease,
  terminalPermissionPolicy,
  type TerminalMode,
} from "@/features/io/terminal-policy";
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
  decideMyIoTerminalApproval,
  appendMyIoTerminalEvent,
  getIoAuditEvents,
  getMyIoBillingSummary,
  getMyIoBillingProfile,
  getMyIoInvoiceDocument,
  getMyIoBudgetStatus,
  getMyIoWorkspaceProviderPolicy,
  getIoCapacitySources,
  getIoRouteCatalog,
  getMyIoWorkspaces,
  listMyIoApiKeys,
  listMyIoApiKeyUsage,
  listMyIoCreditEntries,
  listMyIoInvoices,
  createMyIoPaymentCheckout,
  verifyMyIoPaymentCheckout,
  listMyIoTerminalSessions,
  listMyIoTerminalEvents,
  listMyIoUsageHistory,
  preflightPartnerRoute,
  requestMyIoTerminalApproval,
  runPartnerRoute,
  setMyIoWorkspaceProviderPolicy,
  upsertMyIoBillingProfile,
  revokeMyIoApiKey,
  type IoApiKeyMetadata,
  type IoApiKeyUsage,
  type IoAuditEvent,
  type IoCapacitySource,
  type IoBudgetStatus,
  type IoBillingSummary,
  type IoBillingProfile,
  type IoRouteCatalog,
  type IoRoutePreflight,
  type IoRouteReceipt,
  type IoRouteStrategy,
  type IoTerminalSession,
  type IoTerminalEvent,
  type IoCreditEntry,
  type IoInvoice,
  type IoUsageHistoryCursor,
  type IoWorkspace,
  type IoWorkspaceProviderPolicy,
  type PartnerRunResult,
} from "@/features/io/io.client";

type SessionMode = TerminalMode;
type ExecutionPath = "partner" | "terminal";

type TerminalInspection = {
  durableSessionId: string;
  pairing: OpenCodePairing;
  taskTree: OpenCodeTaskNode;
  diffs: OpenCodeFileDiff[];
  permissions: OpenCodePermission[];
  capabilities: OpenCodeCapabilities | null;
  timeline: OpenCodeTimelineEntry[];
};

type TerminalLiveEvent = {
  durableSessionId: string;
  state: "connecting" | "live" | "offline";
  type: string | null;
  receivedAt: string | null;
};

type BillingProfileDraft = {
  legalName: string;
  billingEmail: string;
  customerType: IoBillingProfile["customerType"];
  countryCode: string;
  stateCode: string;
  postalCode: string;
  addressLine1: string;
  addressLine2: string;
  gstin: string;
  taxRegistrationName: string;
};

const emptyBillingProfileDraft: BillingProfileDraft = {
  legalName: "",
  billingEmail: "",
  customerType: "business",
  countryCode: "IN",
  stateCode: "",
  postalCode: "",
  addressLine1: "",
  addressLine2: "",
  gstin: "",
  taxRegistrationName: "",
};

type RazorpayInstance = { open: () => void };
type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayInstance;
type RazorpayCheckoutResult = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

async function loadRazorpayCheckout() {
  if (window.Razorpay) return window.Razorpay;
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-io-payment-provider="razorpay"]',
    );
    if (existing) {
      if (existing.dataset.ioPaymentState === "loaded") {
        resolve();
        return;
      }
      if (existing.dataset.ioPaymentState === "failed") {
        reject(new Error("Payment checkout could not load."));
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Payment checkout could not load.")),
        {
          once: true,
        },
      );
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.dataset.ioPaymentProvider = "razorpay";
    script.onload = () => {
      script.dataset.ioPaymentState = "loaded";
      resolve();
    };
    script.onerror = () => {
      script.dataset.ioPaymentState = "failed";
      reject(new Error("Payment checkout could not load."));
    };
    document.head.append(script);
  });
  if (!window.Razorpay) throw new Error("Payment checkout is unavailable.");
  return window.Razorpay;
}

function invoiceSnapshotText(snapshot: Record<string, unknown>, key: string) {
  const value = snapshot[key];
  if (typeof value === "string" && value.trim()) return value;
  if (Array.isArray(value)) {
    const parts = value.filter(
      (part): part is string => typeof part === "string" && Boolean(part.trim()),
    );
    return parts.join(", ");
  }
  if (value && typeof value === "object") {
    const parts = Object.values(value as Record<string, unknown>).flatMap((part) =>
      typeof part === "string" && part.trim() ? [part.trim()] : [],
    );
    if (parts.length) return parts.join(", ");
  }
  return "—";
}

function invoiceSnapshotRecord(snapshot: Record<string, unknown>, key: string) {
  const value = snapshot[key];
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function invoiceSnapshotNanos(snapshot: Record<string, unknown>, key: string) {
  const value = snapshot[key];
  return typeof value === "string" && /^-?\d+$/.test(value) ? value : "0";
}

function basisPointsLabel(snapshot: Record<string, unknown>, key: string) {
  const value = snapshot[key];
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? `${(value / 100).toFixed(2)}%`
    : "0.00%";
}

function approvalExpiryFromNow(durationMs: number) {
  return new Date(Date.now() + durationMs).toISOString();
}

async function loadOpenCodeAdvisory(client: IOPortOpenCodeClient, sessionId: string) {
  const [capabilities, timeline] = await Promise.allSettled([
    client.negotiateCapabilities(),
    client.getSessionTimeline(sessionId),
  ]);
  return {
    capabilities: capabilities.status === "fulfilled" ? capabilities.value : null,
    timeline: timeline.status === "fulfilled" ? timeline.value : [],
  };
}

export function IoOverview() {
  const activeView = useIoWorkspaceView();
  const [workspace, setWorkspace] = useState<IoWorkspace | null>(null);
  const [workspaces, setWorkspaces] = useState<IoWorkspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const selectedWorkspaceIdRef = useRef<string | null>(null);
  const workspaceLoadSequence = useRef(0);
  const terminalAbortController = useRef<AbortController | null>(null);
  const terminalEventController = useRef<AbortController | null>(null);
  const terminalInspectionRefreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const terminalTimelineLoadSequence = useRef(0);
  const [sources, setSources] = useState<IoCapacitySource[]>([]);
  const [events, setEvents] = useState<IoAuditEvent[]>([]);
  const [receipts, setReceipts] = useState<IoRouteReceipt[]>([]);
  const [usageCursor, setUsageCursor] = useState<IoUsageHistoryCursor | null>(null);
  const [usageHasMore, setUsageHasMore] = useState(false);
  const [usageHistoryBusy, setUsageHistoryBusy] = useState(false);
  const [usageStateFilter, setUsageStateFilter] = useState<"all" | "completed" | "failed">("all");
  const [usageProviderFilter, setUsageProviderFilter] = useState("");
  const [usageModelFilter, setUsageModelFilter] = useState("");
  const [budgets, setBudgets] = useState<IoBudgetStatus[]>([]);
  const [billingSummary, setBillingSummary] = useState<IoBillingSummary | null>(null);
  const [billingProfile, setBillingProfile] = useState<IoBillingProfile | null>(null);
  const [billingProfileDraft, setBillingProfileDraft] =
    useState<BillingProfileDraft>(emptyBillingProfileDraft);
  const [billingProfileAccess, setBillingProfileAccess] = useState<"available" | "restricted">(
    "available",
  );
  const [billingProfileBusy, setBillingProfileBusy] = useState(false);
  const [paymentBusy, setPaymentBusy] = useState<string | null>(null);
  const [invoiceDocumentBusy, setInvoiceDocumentBusy] = useState<string | null>(null);
  const [creditEntries, setCreditEntries] = useState<IoCreditEntry[]>([]);
  const [invoices, setInvoices] = useState<IoInvoice[]>([]);
  const [apiKeys, setApiKeys] = useState<IoApiKeyMetadata[]>([]);
  const [apiKeyUsage, setApiKeyUsage] = useState<Record<string, IoApiKeyUsage>>({});
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
  const [terminalInspection, setTerminalInspection] = useState<TerminalInspection | null>(null);
  const [terminalLiveEvent, setTerminalLiveEvent] = useState<TerminalLiveEvent | null>(null);
  const [terminalContinuePrompt, setTerminalContinuePrompt] = useState("");
  const [terminalContinueBusy, setTerminalContinueBusy] = useState(false);
  const [terminalPermissionBusy, setTerminalPermissionBusy] = useState<string | null>(null);
  const [terminalForkBusy, setTerminalForkBusy] = useState(false);
  const [terminalRevertBusy, setTerminalRevertBusy] = useState<string | null>(null);
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
  const [openCodeCredentialEnteredAt, setOpenCodeCredentialEnteredAt] = useState<number | null>(
    null,
  );
  const [partnerResult, setPartnerResult] = useState<PartnerRunResult | null>(null);
  const [terminalResult, setTerminalResult] = useState<OpenCodeRunResult | null>(null);
  const executionPath: ExecutionPath =
    activeView === "routes" ? "partner" : activeView === "terminal" ? "terminal" : path;

  useEffect(
    () => () => {
      terminalAbortController.current?.abort();
      terminalEventController.current?.abort();
      if (terminalInspectionRefreshTimer.current) {
        globalThis.clearTimeout(terminalInspectionRefreshTimer.current);
      }
    },
    [],
  );

  useEffect(() => {
    const lease = terminalCredentialLease(openCodeCredentialEnteredAt);
    if (lease.expiresAt === null) return;
    const timer = globalThis.setTimeout(
      () => {
        setOpenCodePassword("");
        setOpenCodeCredentialEnteredAt(null);
        toast.info("Local OpenCode credential expired from this tab. Re-enter it to continue.");
      },
      Math.max(0, lease.remainingMs),
    );
    return () => globalThis.clearTimeout(timer);
  }, [openCodeCredentialEnteredAt]);

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
        setUsageCursor(null);
        setUsageHasMore(false);
        setBudgets([]);
        setBillingSummary(null);
        setBillingProfile(null);
        setBillingProfileDraft(emptyBillingProfileDraft);
        setBillingProfileAccess("available");
        setCreditEntries([]);
        setInvoices([]);
        setApiKeys([]);
        setApiKeyUsage({});
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
        apiKeyUsageResult,
        terminalSessionsResult,
        providerPolicyResult,
        catalogResult,
        billingResult,
        billingProfileResult,
        creditEntriesResult,
        invoicesResult,
      ] = await Promise.allSettled([
        getIoCapacitySources(nextWorkspace.id),
        getIoAuditEvents(nextWorkspace.id),
        listMyIoUsageHistory({ workspaceId: nextWorkspace.id, limit: 25 }),
        getMyIoBudgetStatus(nextWorkspace.id),
        listMyIoApiKeys(nextWorkspace.id),
        listMyIoApiKeyUsage(nextWorkspace.id),
        listMyIoTerminalSessions(nextWorkspace.id),
        getMyIoWorkspaceProviderPolicy(nextWorkspace.id),
        getIoRouteCatalog(nextWorkspace.id),
        getMyIoBillingSummary(nextWorkspace.id),
        getMyIoBillingProfile(nextWorkspace.id),
        listMyIoCreditEntries(nextWorkspace.id),
        listMyIoInvoices(nextWorkspace.id),
      ]);
      if (loadSequence !== workspaceLoadSequence.current) return;
      if (sourcesResult.status === "rejected") throw sourcesResult.reason;
      if (eventsResult.status === "rejected") throw eventsResult.reason;
      if (receiptsResult.status === "rejected") throw receiptsResult.reason;
      if (budgetResult.status === "rejected") throw budgetResult.reason;
      if (apiKeysResult.status === "rejected") throw apiKeysResult.reason;
      if (apiKeyUsageResult.status === "rejected") throw apiKeyUsageResult.reason;
      if (terminalSessionsResult.status === "rejected") throw terminalSessionsResult.reason;
      if (providerPolicyResult.status === "rejected") throw providerPolicyResult.reason;
      if (billingResult.status === "rejected") throw billingResult.reason;
      if (creditEntriesResult.status === "rejected") throw creditEntriesResult.reason;
      if (invoicesResult.status === "rejected") throw invoicesResult.reason;
      setSources(sourcesResult.value);
      setEvents(eventsResult.value);
      setReceipts(receiptsResult.value.items);
      setUsageCursor(receiptsResult.value.nextCursor);
      setUsageHasMore(receiptsResult.value.hasMore);
      setUsageStateFilter("all");
      setUsageProviderFilter("");
      setUsageModelFilter("");
      setBudgets(budgetResult.value);
      setBillingSummary(billingResult.value);
      if (billingProfileResult.status === "fulfilled") {
        const profile = billingProfileResult.value;
        setBillingProfile(profile);
        setBillingProfileAccess("available");
        setBillingProfileDraft(
          profile
            ? {
                legalName: profile.legalName,
                billingEmail: profile.billingEmail,
                customerType: profile.customerType,
                countryCode: profile.countryCode,
                stateCode: profile.stateCode ?? "",
                postalCode: profile.postalCode ?? "",
                addressLine1: profile.addressLines[0] ?? "",
                addressLine2: profile.addressLines[1] ?? "",
                gstin: profile.gstin ?? "",
                taxRegistrationName: profile.taxRegistrationName ?? "",
              }
            : emptyBillingProfileDraft,
        );
      } else {
        setBillingProfile(null);
        setBillingProfileDraft(emptyBillingProfileDraft);
        setBillingProfileAccess("restricted");
      }
      setCreditEntries(creditEntriesResult.value);
      setInvoices(invoicesResult.value);
      setApiKeys(apiKeysResult.value);
      setApiKeyUsage(
        Object.fromEntries(apiKeyUsageResult.value.map((usage) => [usage.apiKeyId, usage])),
      );
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

  async function refreshUsageHistory(append = false) {
    if (!workspace || usageHistoryBusy) return;
    setUsageHistoryBusy(true);
    try {
      const page = await listMyIoUsageHistory({
        workspaceId: workspace.id,
        limit: 25,
        cursor: append ? usageCursor : null,
        resultState: usageStateFilter === "all" ? null : usageStateFilter,
        providerKey: usageProviderFilter.trim() || null,
        modelKey: usageModelFilter.trim() || null,
      });
      setReceipts((current) =>
        append
          ? [
              ...current,
              ...page.items.filter(
                (candidate) => !current.some((receipt) => receipt.id === candidate.id),
              ),
            ]
          : page.items,
      );
      setUsageCursor(page.nextCursor);
      setUsageHasMore(page.hasMore);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load usage history.");
    } finally {
      setUsageHistoryBusy(false);
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

  async function saveBillingProfile() {
    if (!workspace || billingProfileBusy || billingProfileAccess !== "available") return;
    const addressLines = [
      billingProfileDraft.addressLine1.trim(),
      billingProfileDraft.addressLine2.trim(),
    ].filter(Boolean);
    if (
      billingProfileDraft.legalName.trim().length < 2 ||
      !billingProfileDraft.billingEmail.includes("@") ||
      billingProfileDraft.countryCode.trim().length !== 2 ||
      addressLines.length === 0
    ) {
      toast.error("Add a legal name, billing email, two-letter country code and billing address.");
      return;
    }
    setBillingProfileBusy(true);
    try {
      await upsertMyIoBillingProfile({
        workspaceId: workspace.id,
        legalName: billingProfileDraft.legalName.trim(),
        billingEmail: billingProfileDraft.billingEmail.trim(),
        customerType: billingProfileDraft.customerType,
        countryCode: billingProfileDraft.countryCode.trim().toUpperCase(),
        stateCode: billingProfileDraft.stateCode.trim().toUpperCase(),
        postalCode: billingProfileDraft.postalCode.trim(),
        addressLines,
        gstin: billingProfileDraft.gstin.trim().toUpperCase(),
        taxRegistrationName: billingProfileDraft.taxRegistrationName.trim(),
        expectedVersion: billingProfile?.version ?? 0,
      });
      toast.success("Billing identity saved. An operator must verify it before issuance.");
      await loadWorkspace(workspace.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save billing identity.");
    } finally {
      setBillingProfileBusy(false);
    }
  }

  async function payInvoice(invoice: IoInvoice) {
    if (!workspace || paymentBusy) return;
    setPaymentBusy(invoice.id);
    try {
      const checkout = await createMyIoPaymentCheckout(invoice.id);
      const Razorpay = await loadRazorpayCheckout();
      const instance = new Razorpay({
        key: checkout.keyId,
        order_id: checkout.orderId,
        amount: checkout.amountMinor,
        currency: checkout.currencyCode,
        name: "Indus Orbit I/O Port",
        description: `Invoice ${invoice.invoiceNumber}`,
        prefill: billingProfile?.billingEmail
          ? { email: billingProfile.billingEmail, name: billingProfile.legalName }
          : undefined,
        notes: { payment_intent_id: checkout.paymentIntentId },
        theme: { color: "#ff9c24" },
        handler: (result: RazorpayCheckoutResult) => {
          void (async () => {
            try {
              const verification = await verifyMyIoPaymentCheckout({
                paymentIntentId: checkout.paymentIntentId,
                orderId: result.razorpay_order_id,
                paymentId: result.razorpay_payment_id,
                signature: result.razorpay_signature,
              });
              toast.success(
                verification.settlementPending
                  ? "Checkout verified. Final settlement follows the signed Razorpay webhook."
                  : "Payment verified and settled.",
              );
              await loadWorkspace(workspace.id);
            } catch (error) {
              toast.error(
                error instanceof Error
                  ? error.message
                  : "Payment returned, but server verification failed.",
              );
            } finally {
              setPaymentBusy(null);
            }
          })();
        },
        modal: {
          ondismiss: () => setPaymentBusy(null),
        },
      });
      instance.open();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open secure checkout.");
      setPaymentBusy(null);
    }
  }

  async function downloadInvoice(invoice: IoInvoice) {
    if (invoiceDocumentBusy || invoice.state === "draft") return;
    setInvoiceDocumentBusy(invoice.id);
    try {
      const evidence = await getMyIoInvoiceDocument(invoice.id);
      const tax = invoiceSnapshotRecord(evidence.seller, "tax");
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      const left = 48;
      const right = 547;
      let y = 54;
      const money = (nanos: string) => formatExactNanos(nanos, evidence.currencyCode);
      const line = (label: string, value: string, size = 10) => {
        pdf.setFontSize(size);
        pdf.setTextColor(28, 36, 73);
        pdf.text(label, left, y);
        pdf.text(value, right, y, { align: "right" });
        y += size + 8;
      };
      pdf.setFillColor(21, 27, 67);
      pdf.rect(0, 0, 595, 92, "F");
      pdf.setTextColor(255, 250, 238);
      pdf.setFontSize(20);
      pdf.text("INDUS ORBIT · I/O PORT", left, 42);
      pdf.setFontSize(11);
      pdf.text(evidence.state === "void" ? "VOID TAX INVOICE" : "TAX INVOICE", left, 66);
      pdf.text(evidence.invoiceNumber, right, 42, { align: "right" });
      pdf.text(`Issued ${new Date(evidence.issuedAt).toLocaleDateString()}`, right, 66, {
        align: "right",
      });
      y = 124;
      pdf.setFontSize(9);
      pdf.setTextColor(92, 96, 112);
      pdf.text("SUPPLIER", left, y);
      pdf.text("BILL TO", 300, y);
      y += 18;
      pdf.setFontSize(11);
      pdf.setTextColor(28, 36, 73);
      pdf.text(invoiceSnapshotText(evidence.seller, "legalName"), left, y);
      pdf.text(invoiceSnapshotText(evidence.buyer, "legalName"), 300, y);
      y += 17;
      pdf.setFontSize(9);
      const sellerAddress = invoiceSnapshotText(evidence.seller, "address");
      const buyerAddress = invoiceSnapshotText(evidence.buyer, "addressLines");
      pdf.text(pdf.splitTextToSize(sellerAddress, 220), left, y);
      pdf.text(pdf.splitTextToSize(buyerAddress, 220), 300, y);
      y += 42;
      pdf.text(`GSTIN: ${invoiceSnapshotText(evidence.seller, "gstin")}`, left, y);
      pdf.text(`GSTIN: ${invoiceSnapshotText(evidence.buyer, "gstin")}`, 300, y);
      y += 18;
      pdf.text(`SAC: ${invoiceSnapshotText(evidence.seller, "serviceAccountingCode")}`, left, y);
      pdf.text(`Place/state: ${invoiceSnapshotText(evidence.buyer, "stateCode")}`, 300, y);
      y += 28;
      pdf.setDrawColor(222, 217, 204);
      pdf.line(left, y, right, y);
      y += 24;
      line(
        "Service period",
        `${new Date(evidence.periodStart).toLocaleDateString()} – ${new Date(evidence.periodEnd).toLocaleDateString()}`,
      );
      line("Provider usage", money(evidence.providerCostNanos));
      line("I/O service fee", money(evidence.serviceFeeNanos));
      line("Subtotal", money(evidence.subtotalNanos));
      line("Credits applied", `− ${money(evidence.creditAppliedNanos)}`);
      if (evidence.fx && evidence.sourceCurrencyCode) {
        const sourceMoney = (nanos: string) =>
          formatExactNanos(nanos, evidence.sourceCurrencyCode!);
        line(
          `FX source · ${evidence.sourceCurrencyCode}`,
          sourceMoney(evidence.fx.sourceAmountDueNanos),
        );
        line(
          "Approved FX snapshot",
          `${evidence.fx.numerator}/${evidence.fx.denominator} ${evidence.currencyCode} per ${evidence.sourceCurrencyCode}`,
        );
      }
      if (invoiceSnapshotNanos(tax, "cgstNanos") !== "0") {
        line(
          `CGST · ${basisPointsLabel(tax, "cgstBasisPoints")}`,
          money(invoiceSnapshotNanos(tax, "cgstNanos")),
        );
      }
      if (invoiceSnapshotNanos(tax, "sgstNanos") !== "0") {
        line(
          `SGST · ${basisPointsLabel(tax, "sgstBasisPoints")}`,
          money(invoiceSnapshotNanos(tax, "sgstNanos")),
        );
      }
      if (invoiceSnapshotNanos(tax, "igstNanos") !== "0") {
        line(
          `IGST · ${basisPointsLabel(tax, "igstBasisPoints")}`,
          money(invoiceSnapshotNanos(tax, "igstNanos")),
        );
      }
      if (evidence.taxNanos === "0") {
        line(
          `Tax · ${evidence.supplyKind?.replaceAll("_", " ") ?? evidence.taxStatus}`,
          money(evidence.taxNanos),
        );
      }
      line("Rounding", money(evidence.roundingNanos));
      pdf.setDrawColor(255, 156, 36);
      pdf.line(left, y, right, y);
      y += 24;
      line("Invoice total", money(evidence.totalNanos), 12);
      line("Amount due", money(evidence.amountDueNanos), 12);
      line("Paid", money(evidence.paidNanos));
      line("Refunded", money(evidence.refundedNanos));
      y += 12;
      pdf.setFontSize(9);
      pdf.setTextColor(92, 96, 112);
      pdf.text(
        `Payment status: ${evidence.paymentState.replaceAll("_", " ")} · Due ${new Date(evidence.dueAt).toLocaleDateString()}`,
        left,
        y,
      );
      y += 28;
      pdf.setFontSize(10);
      pdf.setTextColor(28, 36, 73);
      pdf.text("Usage lines", left, y);
      y += 18;
      for (const item of evidence.lines) {
        if (y > 780) {
          pdf.addPage();
          y = 54;
        }
        pdf.setFontSize(8);
        pdf.text(`${item.providerKey} · ${item.modelKey}`, left, y);
        pdf.text(money(item.amountDueNanos), right, y, { align: "right" });
        y += 13;
        pdf.setTextColor(92, 96, 112);
        pdf.text(
          `${new Date(item.usageRecordedAt).toLocaleString()} · ${item.inputTokens ?? "—"} input · ${item.outputTokens ?? "—"} output tokens`,
          left,
          y,
        );
        pdf.setTextColor(28, 36, 73);
        y += 18;
      }
      if (evidence.state === "void" && evidence.voidReason) {
        y += 8;
        pdf.setTextColor(169, 52, 52);
        pdf.text(`VOID: ${evidence.voidReason}`, left, y);
      }
      pdf.save(`${evidence.invoiceNumber}.pdf`);
      toast.success("Invoice PDF generated from its immutable issued snapshot.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate the invoice.");
    } finally {
      setInvoiceDocumentBusy(null);
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
              setTerminalSessions((current) => [
                durable,
                ...current.filter((candidate) => candidate.id !== durable.id),
              ]);
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
              try {
                const client = new IOPortOpenCodeClient({
                  origin: session.connectorOrigin,
                  password: openCodePassword,
                });
                const [pairing, taskTree, diffs, permissions] = await Promise.all([
                  client.pair(),
                  client.getTaskTree(session.sessionId),
                  client.getFullDiffs(session.sessionId),
                  client.listPendingPermissions(session.sessionId),
                ]);
                const advisory = await loadOpenCodeAdvisory(client, session.sessionId);
                setTerminalInspection({
                  durableSessionId: durable.id,
                  pairing,
                  taskTree,
                  diffs,
                  permissions,
                  ...advisory,
                });
                startLocalEventStream({
                  client,
                  durableSessionId: durable.id,
                  localSessionId: session.sessionId,
                });
              } catch {
                // The local run remains available. Reconnect can rebuild this advisory snapshot.
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

  function startLocalEventStream(input: {
    client: IOPortOpenCodeClient;
    durableSessionId: string;
    localSessionId: string;
  }) {
    terminalEventController.current?.abort();
    if (terminalInspectionRefreshTimer.current) {
      globalThis.clearTimeout(terminalInspectionRefreshTimer.current);
    }
    const controller = new AbortController();
    terminalEventController.current = controller;
    setTerminalLiveEvent({
      durableSessionId: input.durableSessionId,
      state: "connecting",
      type: null,
      receivedAt: null,
    });

    const reconcile = () => {
      if (terminalInspectionRefreshTimer.current) {
        globalThis.clearTimeout(terminalInspectionRefreshTimer.current);
      }
      terminalInspectionRefreshTimer.current = globalThis.setTimeout(() => {
        void Promise.all([
          input.client.getTaskTree(input.localSessionId),
          input.client.getFullDiffs(input.localSessionId),
          input.client.listPendingPermissions(input.localSessionId),
          input.client.getSessionTimeline(input.localSessionId),
        ])
          .then(([taskTree, diffs, permissions, timeline]) => {
            if (!controller.signal.aborted) {
              setTerminalInspection((current) =>
                current?.durableSessionId === input.durableSessionId
                  ? { ...current, taskTree, diffs, permissions, timeline }
                  : current,
              );
            }
          })
          .catch(() => {
            // SSE is advisory. Explicit reconnect remains the authoritative REST recovery path.
          });
      }, 250);
    };

    void input.client
      .subscribeSessionEvents({
        sessionId: input.localSessionId,
        signal: controller.signal,
        onEvent: (event: OpenCodeEvent) => {
          setTerminalLiveEvent({
            durableSessionId: input.durableSessionId,
            state: "live",
            type: event.type,
            receivedAt: new Date().toISOString(),
          });
          reconcile();
        },
      })
      .then(() => {
        if (!controller.signal.aborted) {
          setTerminalLiveEvent((current) =>
            current?.durableSessionId === input.durableSessionId
              ? { ...current, state: "offline" }
              : current,
          );
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setTerminalLiveEvent((current) =>
            current?.durableSessionId === input.durableSessionId
              ? { ...current, state: "offline" }
              : current,
          );
        }
      });
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
      const client = new IOPortOpenCodeClient({
        origin: binding.connectorOrigin,
        password: openCodePassword,
      });
      const [summary, pairing, taskTree, diffs, permissions] = await Promise.all([
        inspectOpenCodeLocalSession({ binding, password: openCodePassword }),
        client.pair(),
        client.getTaskTree(binding.sessionId),
        client.getFullDiffs(binding.sessionId),
        client.listPendingPermissions(binding.sessionId),
      ]);
      const advisory = await loadOpenCodeAdvisory(client, binding.sessionId);
      setTerminalReconnect({ durableSessionId: session.id, summary });
      setTerminalInspection({
        durableSessionId: session.id,
        pairing,
        taskTree,
        diffs,
        permissions,
        ...advisory,
      });
      startLocalEventStream({
        client,
        durableSessionId: session.id,
        localSessionId: binding.sessionId,
      });
      toast.success("Reconnected to the exact local OpenCode session.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Local OpenCode reconnect failed.");
    } finally {
      setTerminalReconnectBusy(null);
    }
  }

  async function continueLocalTerminal(session: IoTerminalSession) {
    if (
      typeof window === "undefined" ||
      !workspace ||
      terminalContinueBusy ||
      !terminalContinuePrompt.trim()
    ) {
      return;
    }
    const binding = loadOpenCodeLocalBinding(window.localStorage, session.id);
    if (!binding) {
      toast.error("This browser has no local binding for that OpenCode session.");
      return;
    }
    setTerminalContinueBusy(true);
    let continuationId: string | null = null;
    try {
      const client = new IOPortOpenCodeClient({
        origin: binding.connectorOrigin,
        password: openCodePassword,
      });
      const pairing = await client.pair();
      const durable = await createMyIoTerminalSession({
        workspaceId: workspace.id,
        title: `Continuation · ${session.title}`.slice(0, 160),
        mode: session.mode,
        connectorOrigin: binding.connectorOrigin,
        runtimeReference: binding.sessionId,
        runtimeVersion: pairing.serverVersion,
      });
      continuationId = durable.id;
      saveOpenCodeLocalBinding(window.localStorage, {
        durableSessionId: durable.id,
        connectorOrigin: binding.connectorOrigin,
        sessionId: binding.sessionId,
        serverVersion: pairing.serverVersion,
        storedAt: new Date().toISOString(),
      });
      const result = await client.continuePrompt(binding.sessionId, terminalContinuePrompt);
      await appendMyIoTerminalEvent({
        sessionId: durable.id,
        type: "prompt.accepted",
        payload: {},
      });
      await completeMyIoTerminalSession(durable.id, "completed");
      const [taskTree, diffs, permissions] = await Promise.all([
        client.getTaskTree(binding.sessionId),
        client.getFullDiffs(binding.sessionId),
        client.listPendingPermissions(binding.sessionId),
      ]);
      const advisory = await loadOpenCodeAdvisory(client, binding.sessionId);
      setTerminalResult({
        connectorOrigin: binding.connectorOrigin,
        sessionId: binding.sessionId,
        title: durable.title,
        content: result.content || "OpenCode accepted the continued prompt.",
        serverVersion: pairing.serverVersion,
        changedFileCount: diffs.length,
      });
      setTerminalInspection({
        durableSessionId: session.id,
        pairing,
        taskTree,
        diffs,
        permissions,
        ...advisory,
      });
      setTerminalContinuePrompt("");
      await loadWorkspace(workspace.id);
      toast.success("Continued the exact local OpenCode session and recorded safe metadata.");
    } catch (error) {
      if (continuationId) {
        await completeMyIoTerminalSession(continuationId, "failed").catch(() => undefined);
      }
      toast.error(error instanceof Error ? error.message : "Could not continue the local session.");
    } finally {
      setTerminalContinueBusy(false);
    }
  }

  async function answerLocalPermission(
    session: IoTerminalSession,
    permission: OpenCodePermission,
    decision: "once" | "reject",
  ) {
    if (typeof window === "undefined" || terminalPermissionBusy) return;
    const policy = terminalPermissionPolicy({
      mode: session.mode,
      permission: permission.permission,
      risk: permission.risk,
    });
    if (decision === "once" && !policy.allowed) {
      toast.error(policy.reason);
      return;
    }
    const binding = loadOpenCodeLocalBinding(window.localStorage, session.id);
    if (!binding) {
      toast.error("This browser has no local binding for that OpenCode session.");
      return;
    }
    setTerminalPermissionBusy(permission.id);
    try {
      const expiresInMs = permission.risk === "critical" ? 4 * 60_000 : 15 * 60_000;
      const cloudRequest = await requestMyIoTerminalApproval({
        sessionId: session.id,
        permissionKind: policy.kind,
        riskClass: permission.risk,
        reason: policy.reason,
        expiresAt: approvalExpiryFromNow(expiresInMs),
      });
      await decideMyIoTerminalApproval(
        cloudRequest.requestId,
        decision === "once" ? "approved" : "rejected",
        decision === "once"
          ? "Member approved this exact request once."
          : "Member rejected this exact request.",
      );
      const client = new IOPortOpenCodeClient({
        origin: binding.connectorOrigin,
        password: openCodePassword,
      });
      await client.replyPermission({
        request: permission,
        decision,
        confirmationId: permission.id,
      });
      const permissions = await client.listPendingPermissions(binding.sessionId);
      setTerminalInspection((current) =>
        current?.durableSessionId === session.id ? { ...current, permissions } : current,
      );
      toast.success(decision === "once" ? "Approved once." : "Permission rejected.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not decide the permission.");
    } finally {
      setTerminalPermissionBusy(null);
    }
  }

  async function forkLocalTerminal(session: IoTerminalSession, messageId?: string) {
    if (typeof window === "undefined" || !workspace || terminalForkBusy) return;
    const binding = loadOpenCodeLocalBinding(window.localStorage, session.id);
    if (!binding) {
      toast.error("This browser has no local binding for that OpenCode session.");
      return;
    }
    if (terminalInspection?.capabilities?.fork !== true) {
      toast.error("This OpenCode daemon has not advertised session-fork support.");
      return;
    }
    setTerminalForkBusy(true);
    try {
      const client = new IOPortOpenCodeClient({
        origin: binding.connectorOrigin,
        password: openCodePassword,
      });
      const [pairing, fork] = await Promise.all([
        client.pair(),
        client.forkSession(binding.sessionId, messageId),
      ]);
      const durable = await createMyIoTerminalSession({
        workspaceId: workspace.id,
        title: `Fork · ${session.title}`.slice(0, 160),
        mode: session.mode,
        connectorOrigin: binding.connectorOrigin,
        runtimeReference: fork.sessionId,
        runtimeVersion: pairing.serverVersion,
      });
      saveOpenCodeLocalBinding(window.localStorage, {
        durableSessionId: durable.id,
        connectorOrigin: binding.connectorOrigin,
        sessionId: fork.sessionId,
        serverVersion: pairing.serverVersion,
        storedAt: new Date().toISOString(),
      });
      await appendMyIoTerminalEvent({
        sessionId: durable.id,
        type: "runtime.connected",
        payload: { runtimeVersionKnown: pairing.serverVersion !== null },
      });
      const [taskTree, diffs, permissions, advisory] = await Promise.all([
        client.getTaskTree(fork.sessionId),
        client.getFullDiffs(fork.sessionId),
        client.listPendingPermissions(fork.sessionId),
        loadOpenCodeAdvisory(client, fork.sessionId),
      ]);
      setTerminalSessions((current) => [
        durable,
        ...current.filter((candidate) => candidate.id !== durable.id),
      ]);
      setTerminalInspection({
        durableSessionId: durable.id,
        pairing,
        taskTree,
        diffs,
        permissions,
        ...advisory,
      });
      setSelectedTerminalSessionId(durable.id);
      startLocalEventStream({
        client,
        durableSessionId: durable.id,
        localSessionId: fork.sessionId,
      });
      toast.success("Forked the local session. Continue it independently when ready.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not fork the local session.");
    } finally {
      setTerminalForkBusy(false);
    }
  }

  async function revertLocalTerminal(session: IoTerminalSession, messageId: string) {
    if (typeof window === "undefined" || terminalRevertBusy) return;
    const binding = loadOpenCodeLocalBinding(window.localStorage, session.id);
    if (!binding) {
      toast.error("This browser has no local binding for that OpenCode session.");
      return;
    }
    if (terminalInspection?.capabilities?.revert !== true) {
      toast.error("This OpenCode daemon has not advertised checkpoint/revert support.");
      return;
    }
    if (
      !window.confirm("Revert this local OpenCode session to this message? Local files may change.")
    ) {
      return;
    }
    setTerminalRevertBusy(messageId);
    try {
      const client = new IOPortOpenCodeClient({
        origin: binding.connectorOrigin,
        password: openCodePassword,
      });
      await client.revertSession(binding.sessionId, messageId);
      const [diffs, timeline] = await Promise.all([
        client.getFullDiffs(binding.sessionId),
        client.getSessionTimeline(binding.sessionId),
      ]);
      setTerminalInspection((current) =>
        current?.durableSessionId === session.id ? { ...current, diffs, timeline } : current,
      );
      toast.success("Local session reverted to the selected checkpoint.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not revert the local session.");
    } finally {
      setTerminalRevertBusy(null);
    }
  }

  async function restoreLocalTerminal(session: IoTerminalSession) {
    if (typeof window === "undefined" || terminalRevertBusy) return;
    const binding = loadOpenCodeLocalBinding(window.localStorage, session.id);
    if (!binding) {
      toast.error("This browser has no local binding for that OpenCode session.");
      return;
    }
    setTerminalRevertBusy("restore");
    try {
      const client = new IOPortOpenCodeClient({
        origin: binding.connectorOrigin,
        password: openCodePassword,
      });
      await client.restoreRevertedSession(binding.sessionId);
      const [diffs, timeline] = await Promise.all([
        client.getFullDiffs(binding.sessionId),
        client.getSessionTimeline(binding.sessionId),
      ]);
      setTerminalInspection((current) =>
        current?.durableSessionId === session.id ? { ...current, diffs, timeline } : current,
      );
      toast.success("Restored the complete local OpenCode session.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not restore the local session.");
    } finally {
      setTerminalRevertBusy(null);
    }
  }

  const readySources = sources.filter((source) => source.status === "active");
  const hasRoutableModels = Boolean(routeCatalog?.models.length);
  const canRunPartner =
    hasRoutableModels &&
    budgets.length > 0 &&
    !catalogLoading &&
    (routeStrategy !== "explicit_model" || Boolean(requestedModelId));
  const openCodeCredentialLease = terminalCredentialLease(openCodeCredentialEnteredAt);
  const canRunTerminal =
    openCodeCredentialLease.valid &&
    openCodePassword.length >= 16 &&
    openCodePassword.length <= 1_024;
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
  const ioApiExamples = [
    {
      label: "curl",
      code: `curl ${ioApiBaseUrl}/chat/completions \\
  -H "Authorization: Bearer $IO_API_KEY" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: $(uuidgen)" \\
  -d '{"model":"io/latest-affordable","messages":[{"role":"user","content":"Hello from I/O"}],"stream":true}'`,
    },
    {
      label: "OpenAI JavaScript SDK",
      code: `import OpenAI from "openai";

const io = new OpenAI({
  apiKey: process.env.IO_API_KEY,
  baseURL: "${ioApiBaseUrl}",
});

const response = await io.responses.create({
  model: "io/latest-affordable",
  input: "Hello from I/O",
  store: false,
});`,
    },
    {
      label: "OpenAI Python SDK",
      code: `import os
from openai import OpenAI

io = OpenAI(
    api_key=os.environ["IO_API_KEY"],
    base_url="${ioApiBaseUrl}",
)

response = io.responses.create(
    model="io/latest-affordable",
    input="Hello from I/O",
    store=False,
)`,
    },
    {
      label: "OpenCode",
      code: `export IO_API_KEY="store-this-in-your-shell-secret-manager"
opencode auth login

# Provider base URL: ${ioApiBaseUrl}
# Model: io/latest-affordable
# API key: read from IO_API_KEY; never commit it or put it in browser JavaScript.`,
    },
  ];
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
              {(Object.keys(TERMINAL_MODE_POLICIES) as SessionMode[]).map((item) => (
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
          <p className="mt-2 text-[10px] text-muted-foreground" role="status">
            <strong>{TERMINAL_MODE_POLICIES[mode].label} policy:</strong>{" "}
            {TERMINAL_MODE_POLICIES[mode].summary}
          </p>

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
                <div className="space-y-1.5">
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_14rem]">
                    <Input
                      value={openCodeUrl}
                      onChange={(event) => setOpenCodeUrl(event.target.value)}
                      aria-label="OpenCode server URL"
                      placeholder="http://127.0.0.1:4096"
                    />
                    <Input
                      type="password"
                      value={openCodePassword}
                      onChange={(event) => {
                        const value = event.target.value;
                        setOpenCodePassword(value);
                        setOpenCodeCredentialEnteredAt(value ? Date.now() : null);
                      }}
                      aria-label="OpenCode server password"
                      placeholder="16+ character password"
                      minLength={16}
                      maxLength={1_024}
                      autoComplete="off"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Use the same 16+ character <code>OPENCODE_SERVER_PASSWORD</code>. It remains in
                    this tab's memory for at most 15 minutes, is never saved by I/O, and can pair
                    only to this device.
                  </p>
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
                          (executionPath === "terminal" && !canRunTerminal) ||
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
                  apiKeys.map((key) => {
                    const usage = apiKeyUsage[key.id];
                    const lifecycle = apiKeyLifecycle(key.status, key.expiresAt);
                    const dailyCharge =
                      BigInt(usage?.daySpentNanos ?? "0") + BigInt(usage?.dayReservedNanos ?? "0");
                    return (
                      <article key={key.id} className="space-y-2 px-3 py-3">
                        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-foreground">
                              {key.name}
                            </p>
                            <p className="mt-1 truncate font-mono text-[9px] text-muted-foreground">
                              {key.keyPrefix}…{key.lastFour} · expires{" "}
                              {key.expiresAt
                                ? new Date(key.expiresAt).toLocaleDateString()
                                : "never"}
                            </p>
                            <p className="mt-1 text-[9px] text-muted-foreground">
                              Last used{" "}
                              {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : "never"}
                              {lifecycle.rotateSoon && lifecycle.daysRemaining !== null
                                ? ` · rotate within ${lifecycle.daysRemaining} day${lifecycle.daysRemaining === 1 ? "" : "s"}`
                                : ""}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn(
                              "w-fit text-[9px] uppercase",
                              lifecycle.effectiveStatus === "active" && !lifecycle.rotateSoon
                                ? "border-emerald-300 text-emerald-800"
                                : lifecycle.rotateSoon
                                  ? "border-amber-300 text-amber-800"
                                  : "border-border text-muted-foreground",
                            )}
                          >
                            {lifecycle.rotateSoon && lifecycle.effectiveStatus === "active"
                              ? "rotate soon"
                              : lifecycle.effectiveStatus}
                          </Badge>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 w-fit px-2 text-[10px] text-destructive"
                            disabled={lifecycle.effectiveStatus !== "active" || apiKeyBusy !== null}
                            onClick={() => void revokeApiKey(key.id)}
                          >
                            {apiKeyBusy === key.id ? (
                              <LoaderCircle className="animate-spin" />
                            ) : (
                              <Trash2 />
                            )}
                            Revoke
                          </Button>
                        </div>
                        <div className="grid gap-2 text-[9px] text-muted-foreground sm:grid-cols-2">
                          <div>
                            <div className="flex justify-between gap-2">
                              <span>Requests today</span>
                              <span>
                                {usage?.dayRequestCount ?? 0}/{key.requestsPerDay}
                              </span>
                            </div>
                            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-[var(--saffron)]"
                                style={{
                                  width: `${usagePercent(usage?.dayRequestCount ?? 0, key.requestsPerDay)}%`,
                                }}
                              />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between gap-2">
                              <span>Charge today · spent + reserved</span>
                              <span>
                                {formatExactNanos(dailyCharge.toString(), key.spendCurrencyCode)} /{" "}
                                {formatNanos(key.spendPerDayNanos, key.spendCurrencyCode)}
                              </span>
                            </div>
                            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-[var(--indigo-night)]"
                                style={{
                                  width: `${usagePercent(dailyCharge.toString(), key.spendPerDayNanos)}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                        <p className="text-[9px] text-muted-foreground">
                          Current minute {usage?.minuteRequestCount ?? 0}/{key.requestsPerMinute} ·
                          month {usage?.monthRequestCount ?? 0}/{key.requestsPerMonth} · month
                          charge{" "}
                          {formatExactNanos(usage?.monthSpentNanos ?? "0", key.spendCurrencyCode)}
                          {usage && BigInt(usage.monthReservedNanos) > 0n
                            ? ` + ${formatExactNanos(usage.monthReservedNanos, key.spendCurrencyCode)} reserved`
                            : ""}
                        </p>
                      </article>
                    );
                  })
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
                <p>POST /chat/completions supports JSON or SSE text and function-tool responses.</p>
                <p>POST /responses supports the stateless store:false Responses subset.</p>
                <p>
                  Default model: io/latest-affordable. Cost, fallback and capacity evidence remain
                  receipted.
                </p>
              </div>
              <div className="mt-4 border-t border-white/10 pt-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--saffron)]">
                  Server and local-agent quickstarts
                </p>
                <div className="mt-2 space-y-2">
                  {ioApiExamples.map((example) => (
                    <details
                      key={example.label}
                      className="rounded-lg border border-white/10 bg-white/5"
                    >
                      <summary className="cursor-pointer px-3 py-2 text-[10px] font-semibold text-[var(--parchment)]">
                        {example.label}
                      </summary>
                      <div className="border-t border-white/10 p-2">
                        <div className="flex items-start gap-2">
                          <pre className="min-w-0 flex-1 overflow-x-auto whitespace-pre p-1 font-mono text-[9px] leading-4 text-[var(--parchment)]/75">
                            {example.code}
                          </pre>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="h-7 w-7 shrink-0 border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                            aria-label={`Copy ${example.label} quickstart`}
                            onClick={() =>
                              void copyApiValue(example.code, `${example.label} quickstart`)
                            }
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </details>
                  ))}
                </div>
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
                    disabled={terminalReconnectBusy !== null || !canRunTerminal}
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
                  {terminalInspection?.durableSessionId === session.id ? (
                    <div className="sm:col-span-5 space-y-3 rounded-xl border border-border/65 bg-background/85 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--saffron-deep)]">
                            Secure local pairing
                          </p>
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            {terminalInspection.pairing.origin} · OpenCode{" "}
                            {terminalInspection.pairing.serverVersion ?? "version unknown"} ·
                            credential fingerprint{" "}
                            {terminalInspection.pairing.credentialFingerprint}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[9px]">
                          SECRET IN MEMORY ONLY
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                        <div className="text-[10px] text-muted-foreground">
                          {terminalInspection.capabilities ? (
                            <>
                              OpenAPI{" "}
                              {terminalInspection.capabilities.openApiVersion ?? "version unknown"}
                              {" · "}
                              {
                                Object.values(terminalInspection.capabilities).filter(
                                  (value) => value === true,
                                ).length
                              }{" "}
                              verified capabilities
                            </>
                          ) : (
                            "Capability document unavailable; advanced mutations remain blocked."
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 text-[10px]"
                            disabled={
                              terminalForkBusy ||
                              !canRunTerminal ||
                              terminalInspection.capabilities?.fork !== true
                            }
                            onClick={() => void forkLocalTerminal(session)}
                          >
                            {terminalForkBusy ? (
                              <LoaderCircle className="animate-spin" />
                            ) : (
                              <Workflow />
                            )}
                            Fork locally
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 text-[10px]"
                            disabled={
                              terminalRevertBusy !== null ||
                              !canRunTerminal ||
                              terminalInspection.capabilities?.revert !== true
                            }
                            onClick={() => void restoreLocalTerminal(session)}
                          >
                            Restore all
                          </Button>
                        </div>
                      </div>

                      {terminalLiveEvent?.durableSessionId === session.id ? (
                        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-[10px] text-sky-950">
                          <span
                            aria-hidden="true"
                            className={cn(
                              "h-2 w-2 rounded-full",
                              terminalLiveEvent.state === "live"
                                ? "bg-emerald-500"
                                : terminalLiveEvent.state === "connecting"
                                  ? "animate-pulse bg-sky-500"
                                  : "bg-amber-500",
                            )}
                          />
                          <strong className="capitalize">SSE {terminalLiveEvent.state}</strong>
                          {terminalLiveEvent.type ? (
                            <span className="text-sky-900/75">
                              Last event: {terminalLiveEvent.type}
                              {terminalLiveEvent.receivedAt
                                ? ` · ${new Date(terminalLiveEvent.receivedAt).toLocaleTimeString()}`
                                : ""}
                            </span>
                          ) : (
                            <span className="text-sky-900/75">
                              REST snapshot loaded; waiting for local events.
                            </span>
                          )}
                        </div>
                      ) : null}

                      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                        <Input
                          value={terminalContinuePrompt}
                          onChange={(event) => setTerminalContinuePrompt(event.target.value)}
                          maxLength={24_000}
                          placeholder="Continue this exact local session…"
                          aria-label="Continued OpenCode prompt"
                        />
                        <Button
                          type="button"
                          size="sm"
                          disabled={
                            terminalContinueBusy ||
                            !terminalContinuePrompt.trim() ||
                            !canRunTerminal
                          }
                          onClick={() => void continueLocalTerminal(session)}
                        >
                          {terminalContinueBusy ? (
                            <LoaderCircle className="animate-spin" />
                          ) : (
                            <Send />
                          )}
                          Continue locally
                        </Button>
                      </div>

                      <div className="grid gap-3 lg:grid-cols-2">
                        <div className="rounded-lg border border-border/60 p-3">
                          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                            Task tree
                          </p>
                          <OpenCodeTaskTreeView node={terminalInspection.taskTree} />
                        </div>
                        <div className="rounded-lg border border-border/60 p-3">
                          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                            Permission gate
                          </p>
                          {terminalInspection.permissions.length ? (
                            <div className="mt-2 space-y-2">
                              {terminalInspection.permissions.map((permission) => (
                                <PermissionDecisionCard
                                  key={permission.id}
                                  mode={session.mode}
                                  permission={permission}
                                  busy={terminalPermissionBusy !== null}
                                  canRun={canRunTerminal}
                                  onDecision={(decision) =>
                                    void answerLocalPermission(session, permission, decision)
                                  }
                                />
                              ))}
                            </div>
                          ) : (
                            <p className="mt-2 text-[10px] text-muted-foreground">
                              No local permission requests are pending. I/O never records a blanket
                              approval.
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="rounded-lg border border-border/60 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                            Local message, tool and command trail
                          </p>
                          <Badge variant="outline" className="text-[9px]">
                            {terminalInspection.timeline.length} MESSAGES
                          </Badge>
                        </div>
                        {terminalInspection.timeline.length ? (
                          <ol className="mt-2 space-y-2">
                            {terminalInspection.timeline.map((entry) => (
                              <li
                                key={entry.messageId}
                                className="rounded-lg border border-border/55 bg-muted/15 p-2.5"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px]">
                                  <span className="font-semibold capitalize">{entry.role}</span>
                                  <span className="text-muted-foreground">
                                    {entry.createdAt
                                      ? new Date(entry.createdAt).toLocaleString()
                                      : "Time unavailable"}
                                  </span>
                                </div>
                                <div className="mt-2 space-y-1.5">
                                  {entry.parts.map((part, partIndex) => (
                                    <details
                                      key={part.id ?? `${entry.messageId}-${partIndex}`}
                                      className="rounded border border-border/50 bg-background/75"
                                    >
                                      <summary className="cursor-pointer px-2 py-1.5 text-[9px] font-medium">
                                        {part.type}
                                        {part.tool ? ` · ${part.tool}` : ""}
                                        {part.status ? ` · ${part.status}` : ""}
                                      </summary>
                                      {part.content ? (
                                        <pre className="max-h-72 overflow-auto whitespace-pre-wrap border-t border-border/50 p-2 font-mono text-[9px] leading-4">
                                          {part.content}
                                        </pre>
                                      ) : null}
                                    </details>
                                  ))}
                                </div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-[9px]"
                                    disabled={
                                      terminalForkBusy ||
                                      terminalInspection.capabilities?.fork !== true
                                    }
                                    onClick={() => void forkLocalTerminal(session, entry.messageId)}
                                  >
                                    Fork here
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-[9px] text-amber-800"
                                    disabled={
                                      terminalRevertBusy !== null ||
                                      terminalInspection.capabilities?.revert !== true
                                    }
                                    onClick={() =>
                                      void revertLocalTerminal(session, entry.messageId)
                                    }
                                  >
                                    {terminalRevertBusy === entry.messageId ? (
                                      <LoaderCircle className="animate-spin" />
                                    ) : null}
                                    Revert here
                                  </Button>
                                </div>
                              </li>
                            ))}
                          </ol>
                        ) : (
                          <p className="mt-2 text-[10px] text-muted-foreground">
                            No local message timeline is available. Content is read directly from
                            this device and is never copied into the I/O control plane.
                          </p>
                        )}
                      </div>

                      <div className="rounded-lg border border-border/60 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                            Full local diff review
                          </p>
                          <Badge variant="outline" className="text-[9px]">
                            {terminalInspection.diffs.length} FILES
                          </Badge>
                        </div>
                        {terminalInspection.diffs.length ? (
                          <div className="mt-2 space-y-2">
                            {terminalInspection.diffs.map((diff) => (
                              <details
                                key={diff.file}
                                className="rounded-lg border border-border/55"
                              >
                                <summary className="cursor-pointer px-3 py-2 text-[10px] font-semibold">
                                  {diff.file}
                                  {diff.additions !== null && diff.deletions !== null
                                    ? ` · +${diff.additions} / -${diff.deletions}`
                                    : ""}
                                </summary>
                                <div className="grid border-t border-border/55 lg:grid-cols-2">
                                  <pre className="max-h-80 overflow-auto whitespace-pre-wrap border-b border-border/55 bg-rose-50 p-3 text-[10px] lg:border-b-0 lg:border-r">
                                    {diff.before}
                                  </pre>
                                  <pre className="max-h-80 overflow-auto whitespace-pre-wrap bg-emerald-50 p-3 text-[10px]">
                                    {diff.after}
                                  </pre>
                                </div>
                              </details>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-2 text-[10px] text-muted-foreground">
                            No changed files in this local session.
                          </p>
                        )}
                      </div>
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
            ) : (
              <div>
                <div className="grid gap-3 border-b border-border/55 bg-background/35 p-4 md:grid-cols-3">
                  <BillingSummaryCard
                    label="Available credits"
                    value={
                      billingSummary?.credits.length
                        ? billingSummary.credits
                            .map((credit) =>
                              formatExactNanos(credit.balanceNanos, credit.currencyCode),
                            )
                            .join(" · ")
                        : "No credit account"
                    }
                    detail="Credits offset settled usage; the workspace budget still authorizes every route."
                  />
                  <BillingSummaryCard
                    label="Unbilled usage"
                    value={
                      billingSummary?.unbilled.length
                        ? billingSummary.unbilled
                            .map((row) => formatExactNanos(row.amountDueNanos, row.currencyCode))
                            .join(" · ")
                        : "No amount due"
                    }
                    detail={`${billingSummary?.unbilled.reduce((total, row) => total + row.usageCount, 0) ?? 0} settled usage records; provider cost and I/O fee remain separate.`}
                  />
                  <BillingSummaryCard
                    label="Invoices"
                    value={`${billingSummary?.invoiceCounts.issued ?? 0} issued · ${billingSummary?.invoiceCounts.draft ?? 0} draft`}
                    detail="Drafts are not tax invoices. Issuance remains an operator and compliance action."
                  />
                </div>

                <div id="io-billing-profile" className="border-b border-border/55 p-4">
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                        Billing identity
                      </p>
                      <h3 className="mt-1 text-sm font-semibold text-foreground">
                        Buyer details for invoice issuance
                      </h3>
                      <p className="mt-1 max-w-2xl text-[10px] leading-4 text-muted-foreground">
                        Workspace owners, admins and billing members can maintain this versioned
                        record. Saving changes removes verification; I/O never guesses GST status or
                        place of supply.
                      </p>
                    </div>
                    {billingProfileAccess === "available" && (
                      <Badge variant="outline" className="capitalize">
                        {billingProfile?.verifiedAt ? "verified" : "verification required"}
                      </Badge>
                    )}
                  </div>
                  {billingProfileAccess === "restricted" ? (
                    <p className="rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">
                      Billing identity is restricted to workspace owners, admins and billing
                      members.
                    </p>
                  ) : (
                    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                      <Input
                        value={billingProfileDraft.legalName}
                        onChange={(event) =>
                          setBillingProfileDraft((current) => ({
                            ...current,
                            legalName: event.target.value,
                          }))
                        }
                        placeholder="Legal name"
                        maxLength={160}
                        aria-label="Billing legal name"
                      />
                      <Input
                        type="email"
                        value={billingProfileDraft.billingEmail}
                        onChange={(event) =>
                          setBillingProfileDraft((current) => ({
                            ...current,
                            billingEmail: event.target.value,
                          }))
                        }
                        placeholder="Billing email"
                        maxLength={254}
                        aria-label="Billing email"
                      />
                      <select
                        value={billingProfileDraft.customerType}
                        onChange={(event) =>
                          setBillingProfileDraft((current) => ({
                            ...current,
                            customerType: event.target.value as BillingProfileDraft["customerType"],
                          }))
                        }
                        className="h-9 rounded-md border border-input bg-background px-3 text-xs"
                        aria-label="Billing customer type"
                      >
                        <option value="business">Business</option>
                        <option value="individual">Individual</option>
                        <option value="government">Government</option>
                        <option value="nonprofit">Nonprofit</option>
                      </select>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={billingProfileDraft.countryCode}
                          onChange={(event) =>
                            setBillingProfileDraft((current) => ({
                              ...current,
                              countryCode: event.target.value.toUpperCase(),
                            }))
                          }
                          placeholder="Country"
                          maxLength={2}
                          aria-label="Billing country code"
                        />
                        <Input
                          value={billingProfileDraft.stateCode}
                          onChange={(event) =>
                            setBillingProfileDraft((current) => ({
                              ...current,
                              stateCode: event.target.value.toUpperCase(),
                            }))
                          }
                          placeholder="State"
                          maxLength={8}
                          aria-label="Billing state code"
                        />
                      </div>
                      <Input
                        value={billingProfileDraft.addressLine1}
                        onChange={(event) =>
                          setBillingProfileDraft((current) => ({
                            ...current,
                            addressLine1: event.target.value,
                          }))
                        }
                        placeholder="Billing address"
                        maxLength={240}
                        aria-label="Billing address line one"
                        className="md:col-span-2"
                      />
                      <Input
                        value={billingProfileDraft.addressLine2}
                        onChange={(event) =>
                          setBillingProfileDraft((current) => ({
                            ...current,
                            addressLine2: event.target.value,
                          }))
                        }
                        placeholder="Address line 2 (optional)"
                        maxLength={240}
                        aria-label="Billing address line two"
                      />
                      <Input
                        value={billingProfileDraft.postalCode}
                        onChange={(event) =>
                          setBillingProfileDraft((current) => ({
                            ...current,
                            postalCode: event.target.value,
                          }))
                        }
                        placeholder="Postal code"
                        maxLength={24}
                        aria-label="Billing postal code"
                      />
                      <Input
                        value={billingProfileDraft.gstin}
                        onChange={(event) =>
                          setBillingProfileDraft((current) => ({
                            ...current,
                            gstin: event.target.value.toUpperCase(),
                          }))
                        }
                        placeholder="GSTIN (if registered)"
                        maxLength={15}
                        aria-label="GSTIN"
                      />
                      <Input
                        value={billingProfileDraft.taxRegistrationName}
                        onChange={(event) =>
                          setBillingProfileDraft((current) => ({
                            ...current,
                            taxRegistrationName: event.target.value,
                          }))
                        }
                        placeholder="GST registration name"
                        maxLength={160}
                        aria-label="Tax registration name"
                      />
                      <Button
                        type="button"
                        disabled={billingProfileBusy}
                        onClick={() => void saveBillingProfile()}
                      >
                        {billingProfileBusy ? (
                          <LoaderCircle className="animate-spin" />
                        ) : (
                          <WalletCards />
                        )}
                        Save billing identity
                      </Button>
                    </div>
                  )}
                </div>

                <div className="grid gap-3 border-b border-border/55 p-4 xl:grid-cols-2">
                  <div className="rounded-xl border border-border/60 bg-background/60 p-3">
                    <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      Credit ledger
                    </p>
                    {creditEntries.length ? (
                      <div className="mt-2 space-y-2">
                        {creditEntries.slice(0, 5).map((entry) => (
                          <div
                            key={entry.id}
                            className="flex items-start justify-between gap-3 text-[10px]"
                          >
                            <div className="min-w-0">
                              <p className="font-semibold capitalize text-foreground">
                                {humanizeEvent(entry.kind)}
                              </p>
                              <p className="truncate text-muted-foreground" title={entry.reason}>
                                {entry.reason}
                              </p>
                            </div>
                            <span
                              className={cn(
                                "shrink-0 font-mono font-semibold",
                                entry.amountNanos.startsWith("-")
                                  ? "text-amber-800"
                                  : "text-emerald-800",
                              )}
                            >
                              {formatExactNanos(entry.amountNanos, entry.currencyCode)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-[10px] leading-4 text-muted-foreground">
                        No promotional, sponsored or manual credits have been posted. Provider calls
                        are never enabled merely by showing a credit balance.
                      </p>
                    )}
                  </div>

                  <div className="rounded-xl border border-border/60 bg-background/60 p-3">
                    <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      Invoice snapshots
                    </p>
                    {invoices.length ? (
                      <div className="mt-2 space-y-2">
                        {invoices.slice(0, 5).map((invoice) => (
                          <div
                            key={invoice.id}
                            className="flex items-start justify-between gap-3 text-[10px]"
                          >
                            <div>
                              <p className="font-mono font-semibold text-foreground">
                                {invoice.invoiceNumber}
                              </p>
                              <p className="text-muted-foreground">
                                {invoice.lineCount} lines · {invoice.taxStatus.replaceAll("_", " ")}
                              </p>
                            </div>
                            <div className="text-right">
                              <Badge variant="outline" className="text-[9px] capitalize">
                                {invoice.state}
                              </Badge>
                              <p className="mt-1 font-mono font-semibold">
                                {formatExactNanos(invoice.amountDueNanos, invoice.currencyCode)}
                              </p>
                              {(invoice.paymentState === "due" ||
                                invoice.paymentState === "partially_paid") && (
                                <Button
                                  type="button"
                                  size="sm"
                                  className="mt-2 h-7 text-[9px]"
                                  disabled={paymentBusy === invoice.id}
                                  onClick={() => void payInvoice(invoice)}
                                >
                                  {paymentBusy === invoice.id ? (
                                    <LoaderCircle className="animate-spin" />
                                  ) : (
                                    <WalletCards />
                                  )}
                                  Pay securely
                                </Button>
                              )}
                              {invoice.state !== "draft" && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="mt-1 h-7 text-[9px]"
                                  disabled={invoiceDocumentBusy === invoice.id}
                                  onClick={() => void downloadInvoice(invoice)}
                                >
                                  {invoiceDocumentBusy === invoice.id ? (
                                    <LoaderCircle className="animate-spin" />
                                  ) : (
                                    <FileDown />
                                  )}
                                  Download PDF
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-[10px] leading-4 text-muted-foreground">
                        No invoice snapshots yet. An operator can create a draft only from settled,
                        uninvoiced usage; tax and issuance are never guessed by the application.
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid gap-2 border-b border-border/55 p-4 md:grid-cols-[9rem_minmax(0,1fr)_minmax(0,1fr)_auto]">
                  <select
                    value={usageStateFilter}
                    onChange={(event) =>
                      setUsageStateFilter(event.target.value as typeof usageStateFilter)
                    }
                    aria-label="Usage result filter"
                    className="h-9 rounded-md border border-input bg-background px-3 text-xs"
                  >
                    <option value="all">All results</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                  </select>
                  <Input
                    value={usageProviderFilter}
                    onChange={(event) => setUsageProviderFilter(event.target.value)}
                    placeholder="Provider key"
                    aria-label="Usage provider filter"
                    maxLength={80}
                  />
                  <Input
                    value={usageModelFilter}
                    onChange={(event) => setUsageModelFilter(event.target.value)}
                    placeholder="Model key"
                    aria-label="Usage model filter"
                    maxLength={160}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={usageHistoryBusy}
                    onClick={() => void refreshUsageHistory(false)}
                  >
                    {usageHistoryBusy ? <LoaderCircle className="animate-spin" /> : <Route />}
                    Apply filters
                  </Button>
                </div>

                {receipts.length ? (
                  <div className="divide-y divide-border/55">
                    {receipts.map((receipt) => (
                      <RouteReceiptRow key={receipt.id} receipt={receipt} />
                    ))}
                  </div>
                ) : (
                  <div className="flex min-h-36 flex-col items-center justify-center p-6 text-center">
                    <FileCheck2 className="h-7 w-7 text-muted-foreground/35" />
                    <p className="mt-2 text-sm font-medium text-muted-foreground">
                      No matching provider route receipts
                    </p>
                    <p className="mt-1 max-w-md text-xs leading-5 text-muted-foreground">
                      Route history records model, capacity, fallback, usage, cost, fee, credit and
                      amount-due facts. Prompt and response bodies are never stored here.
                    </p>
                  </div>
                )}

                {usageHasMore ? (
                  <div className="flex justify-center border-t border-border/55 p-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={usageHistoryBusy || !usageCursor}
                      onClick={() => void refreshUsageHistory(true)}
                    >
                      {usageHistoryBusy ? <LoaderCircle className="animate-spin" /> : null}
                      Load earlier usage
                    </Button>
                  </div>
                ) : null}
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

function PermissionDecisionCard({
  mode,
  permission,
  busy,
  canRun,
  onDecision,
}: {
  mode: TerminalMode;
  permission: OpenCodePermission;
  busy: boolean;
  canRun: boolean;
  onDecision: (decision: "once" | "reject") => void;
}) {
  const policy = terminalPermissionPolicy({
    mode,
    permission: permission.permission,
    risk: permission.risk,
  });
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-[10px] text-amber-950">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <strong>{permission.permission}</strong>
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className="text-[9px] uppercase">
            {policy.kind.replace("_", " ")}
          </Badge>
          <Badge variant="outline" className="text-[9px] uppercase">
            {permission.risk}
          </Badge>
        </div>
      </div>
      {permission.patterns.length ? (
        <p className="mt-1 break-all text-amber-900/75">{permission.patterns.join(", ")}</p>
      ) : null}
      <p className={cn("mt-1", policy.allowed ? "text-emerald-800" : "text-red-800")}>
        {policy.reason}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          className="h-7 text-[10px]"
          disabled={busy || !canRun || !policy.allowed}
          onClick={() => onDecision("once")}
        >
          Approve once
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 text-[10px]"
          disabled={busy || !canRun}
          onClick={() => onDecision("reject")}
        >
          Reject
        </Button>
      </div>
    </div>
  );
}

function OpenCodeTaskTreeView({ node, depth = 0 }: { node: OpenCodeTaskNode; depth?: number }) {
  return (
    <div className={cn("mt-2", depth > 0 && "ml-3 border-l border-border/60 pl-3")}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px]">
        <span className="font-semibold">{node.title ?? node.sessionId}</span>
        <Badge variant="outline" className="text-[8px] uppercase">
          {node.status}
        </Badge>
      </div>
      {node.todos.length ? (
        <ul className="mt-1 space-y-1 text-[10px] text-muted-foreground">
          {node.todos.map((todo) => (
            <li key={todo.id} className="flex gap-2">
              <span aria-hidden="true">{todo.status === "completed" ? "✓" : "○"}</span>
              <span>{todo.content}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-[10px] text-muted-foreground">No task items reported.</p>
      )}
      {node.children.map((child) => (
        <OpenCodeTaskTreeView key={child.sessionId} node={child} depth={depth + 1} />
      ))}
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
        label="Usage / settled due"
        value={`${formatTokens(receipt.inputTokens, receipt.outputTokens)} · ${
          receipt.currencyCode && receipt.customerChargeNanos !== null
            ? `${formatExactNanos(receipt.amountDueNanos, receipt.currencyCode)} due · ${formatExactNanos(receipt.serviceFeeNanos ?? "0", receipt.currencyCode)} I/O fee`
            : formatNanos(receipt.estimatedCostNanos, receipt.currencyCode)
        }`}
      />
    </article>
  );
}

function BillingSummaryCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/70 p-3">
      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-mono text-sm font-semibold text-[var(--indigo-night)]">{value}</p>
      <p className="mt-1 text-[10px] leading-4 text-muted-foreground">{detail}</p>
    </div>
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

function formatExactNanos(nanos: string, currencyCode: string) {
  if (!/^-?\d+$/.test(nanos) || !/^[A-Z]{3}$/.test(currencyCode)) return "Invalid amount";
  const value = BigInt(nanos);
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const whole = absolute / 1_000_000_000n;
  const fraction = (absolute % 1_000_000_000n).toString().padStart(9, "0").replace(/0+$/, "");
  return `${currencyCode} ${negative ? "-" : ""}${whole.toLocaleString()}${fraction ? `.${fraction}` : ""}`;
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

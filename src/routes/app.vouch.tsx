import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Plus, ShieldCheck, Sparkles, Send } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getMyVouchStatus, issueCode, vouchDirectly } from "@/server/vouch.functions";

export const Route = createFileRoute("/app/vouch")({
  head: () => ({ meta: [{ title: "Vouch — Indus Orbit" }, { name: "robots", content: "noindex" }] }),
  component: VouchPage,
});

type Status = Awaited<ReturnType<typeof getMyVouchStatus>>;

function VouchPage() {
  const { user, isAdmin } = useAuth();
  const getStatus = useServerFn(getMyVouchStatus);
  const issueCodeFn = useServerFn(issueCode);
  const vouchFn = useServerFn(vouchDirectly);
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(true);
  const [issueOpen, setIssueOpen] = useState(false);
  const [directOpen, setDirectOpen] = useState(false);
  const [verified, setVerified] = useState<boolean | null>(null);

  async function load() {
    setBusy(true);
    try {
      const s = await getStatus();
      setStatus(s);
    } catch (e) {
      toast.error((e as Error).message);
    }
    if (user) {
      const { data } = await supabase.from("profiles").select("is_verified").eq("user_id", user.id).maybeSingle();
      setVerified(!!data?.is_verified);
    }
    setBusy(false);
  }

  useEffect(() => { if (user) load(); }, [user]); // eslint-disable-line

  async function onIssue() {
    try {
      const r = await issueCodeFn();
      toast.success("Code generated");
      setIssueOpen(false);
      await navigator.clipboard.writeText(r.code).catch(() => {});
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  if (!user) return null;

  const canIssue = isAdmin || verified === true;
  const remaining = status?.remaining ?? 0;
  const quota = status?.quota ?? 0;

  return (
    <div className="mx-auto max-w-4xl">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--saffron)]">Vouch</p>
      <h1 className="mt-2 font-display text-3xl font-medium md:text-4xl">Build the trust web</h1>
      <p className="mt-2 max-w-2xl text-sm text-foreground/70">
        Verified members can vouch for others. Each vouch — by direct selection or by handing out a code —
        counts against your {status?.windowDays ?? 28}-day budget.
      </p>

      {!canIssue && verified === false && (
        <div className="mt-6 rounded-3xl border border-border bg-card p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-[var(--saffron)]" />
            <div>
              <p className="font-semibold">You're not yet verified.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Have a code? Paste it on your profile page. Or ask an existing verified member to vouch for you.
              </p>
            </div>
          </div>
        </div>
      )}

      {canIssue && (
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="md:col-span-1 rounded-3xl border border-border bg-card p-6">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Remaining</p>
            <p className="mt-2 font-display text-5xl">{isAdmin ? "∞" : remaining}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              of {isAdmin ? "unlimited" : quota} this {status?.windowDays ?? 28}-day window
            </p>
          </div>
          <div className="md:col-span-2 rounded-3xl border border-border bg-card p-6">
            <h2 className="font-display text-lg font-semibold">Two ways to vouch</h2>
            <p className="mt-1 text-sm text-muted-foreground">Both consume from the same budget.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={() => setIssueOpen(true)} disabled={!isAdmin && remaining <= 0}>
                <Plus className="mr-1 h-4 w-4" /> Generate code
              </Button>
              <Button variant="outline" onClick={() => setDirectOpen(true)} disabled={!isAdmin && remaining <= 0}>
                <Sparkles className="mr-1 h-4 w-4" /> Vouch directly
              </Button>
            </div>
          </div>
        </div>
      )}

      {busy ? (
        <p className="mt-8 text-muted-foreground">Loading…</p>
      ) : (
        <>
          <section className="mt-8">
            <h2 className="font-display text-lg font-semibold">My active codes</h2>
            {!status || status.codes.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No codes yet.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {status.codes.map((c) => (
                  <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
                    <div>
                      <code className="rounded bg-muted px-2 py-1 font-mono text-sm">{c.code}</code>
                      <span className="ml-3 text-xs text-muted-foreground">
                        {c.status === "active"
                          ? `expires ${new Date(c.expires_at).toLocaleDateString()}`
                          : c.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status}</Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(c.code);
                          toast.success("Copied");
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="mt-8">
            <h2 className="font-display text-lg font-semibold">Recent vouch activity</h2>
            {!status || status.events.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {status.events.map((e) => (
                  <div key={e.id} className="rounded-2xl border border-border bg-card p-4 text-sm">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">{e.channel}</span>
                    <span className="ml-3">
                      {e.recipient_id ? `→ ${e.recipient_id.slice(0, 8)}…` : "code unredeemed"}
                    </span>
                    <span className="ml-3 text-xs text-muted-foreground">
                      {new Date(e.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate a vouch code</DialogTitle>
            <DialogDescription>
              The code expires in {status?.codeTtlDays ?? 14} days. It counts against your budget the moment it's
              created — even if no one redeems it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssueOpen(false)}>Cancel</Button>
            <Button onClick={onIssue}>Generate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DirectVouchDialog
        open={directOpen}
        onOpenChange={setDirectOpen}
        onDone={load}
        vouchFn={vouchFn}
      />
    </div>
  );
}

function DirectVouchDialog({
  open,
  onOpenChange,
  onDone,
  vouchFn,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onDone: () => void;
  vouchFn: (args: { data: { recipientId: string } }) => Promise<{ ok: boolean; alreadyVerified: boolean }>;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Array<{ user_id: string; display_name: string | null; is_verified: boolean }>>([]);

  useEffect(() => {
    let active = true;
    if (q.trim().length < 2) { setResults([]); return; }
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, is_verified")
        .ilike("display_name", `%${q.trim()}%`)
        .limit(8);
      if (active) setResults((data as never) ?? []);
    })();
    return () => { active = false; };
  }, [q]);

  async function vouch(uid: string) {
    try {
      const r = await vouchFn({ data: { recipientId: uid } });
      toast.success(r.alreadyVerified ? "Already verified — vouch logged" : "Vouched and verified");
      onOpenChange(false);
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vouch for a member</DialogTitle>
          <DialogDescription>
            Search by name. Vouching instantly verifies the member and uses one of your slots.
          </DialogDescription>
        </DialogHeader>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search members…" />
        <div className="mt-2 max-h-72 space-y-2 overflow-y-auto">
          {results.map((r) => (
            <div key={r.user_id} className="flex items-center justify-between rounded-xl border border-border p-3">
              <div>
                <p className="font-medium">{r.display_name ?? "Member"}</p>
                <p className="text-xs text-muted-foreground">{r.is_verified ? "Already verified" : "Unverified"}</p>
              </div>
              <Button size="sm" onClick={() => vouch(r.user_id)}>
                <Send className="mr-1 h-3 w-3" /> Vouch
              </Button>
            </div>
          ))}
          {q.trim().length >= 2 && results.length === 0 && (
            <p className="text-sm text-muted-foreground">No matches.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

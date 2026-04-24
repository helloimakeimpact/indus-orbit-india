import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/app/connect")({
  head: () => ({ meta: [{ title: "Connect — Indus Orbit" }, { name: "robots", content: "noindex" }] }),
  component: ConnectPage,
});

type Req = {
  id: string;
  sender_id: string;
  recipient_id: string;
  reason: string;
  note: string;
  status: "pending" | "accepted" | "declined" | "withdrawn";
  created_at: string;
  responded_at: string | null;
};

const TABS = [
  { key: "incoming", label: "Incoming" },
  { key: "outgoing", label: "Outgoing" },
] as const;

function ConnectPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("incoming");
  const [rows, setRows] = useState<Req[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(true);

  async function load() {
    if (!user) return;
    setBusy(true);
    const col = tab === "incoming" ? "recipient_id" : "sender_id";
    const { data } = await supabase
      .from("connection_requests")
      .select("*")
      .eq(col, user.id)
      .order("created_at", { ascending: false });
    const list = (data as unknown as Req[] | null) ?? [];
    setRows(list);
    const otherIds = Array.from(new Set(list.map((r) => (tab === "incoming" ? r.sender_id : r.recipient_id))));
    if (otherIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", otherIds);
      const map: Record<string, string> = {};
      for (const p of (profs as { user_id: string; display_name: string | null }[] | null) ?? []) {
        map[p.user_id] = p.display_name ?? "Member";
      }
      setNames(map);
    }
    setBusy(false);
  }

  useEffect(() => { load(); }, [user, tab]); // eslint-disable-line react-hooks/exhaustive-deps

  async function respond(r: Req, status: "accepted" | "declined" | "withdrawn") {
    const { error } = await supabase.from("connection_requests").update({ status }).eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success(`Request ${status}`);
    load();
  }

  return (
    <div className="mx-auto max-w-4xl">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--saffron)]">Connect</p>
      <h1 className="mt-2 font-display text-3xl font-medium md:text-4xl">Your conversations</h1>
      <p className="mt-2 max-w-2xl text-sm text-foreground/70">
        Reach-outs you've sent and received. Accepted requests open a private channel via email.
      </p>

      <div className="mt-6 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full border px-4 py-1.5 text-xs uppercase tracking-wider transition ${
              tab === t.key
                ? "border-[var(--indigo-night)] bg-[var(--indigo-night)] text-[var(--parchment)]"
                : "border-border hover:bg-foreground/5"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {busy ? (
        <p className="mt-8 text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="mt-8 text-muted-foreground">
          {tab === "incoming" ? "No incoming requests yet." : "You haven't sent any requests yet."}
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {rows.map((r) => {
            const otherId = tab === "incoming" ? r.sender_id : r.recipient_id;
            const otherName = names[otherId] ?? "Member";
            return (
              <article key={r.id} className="rounded-3xl border border-border bg-card p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-lg font-semibold">
                      {tab === "incoming" ? "From " : "To "}
                      {otherName}
                    </h3>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="secondary">{r.reason}</Badge>
                    <Badge>{r.status}</Badge>
                  </div>
                </div>
                <p className="mt-3 text-sm">{r.note}</p>
                {tab === "incoming" && r.status === "pending" && (
                  <div className="mt-4 flex gap-2">
                    <Button onClick={() => respond(r, "accepted")}>Accept</Button>
                    <Button variant="outline" onClick={() => respond(r, "declined")}>Decline</Button>
                  </div>
                )}
                {tab === "outgoing" && r.status === "pending" && (
                  <div className="mt-4">
                    <Button variant="outline" onClick={() => respond(r, "withdrawn")}>Withdraw</Button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
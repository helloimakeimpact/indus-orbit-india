import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Copy, MessageSquare } from "lucide-react";

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
  const navigate = useNavigate();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("incoming");
  const [rows, setRows] = useState<Req[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [emails, setEmails] = useState<Record<string, string>>({});
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

      // Fetch emails for accepted requests
      const emailMap: Record<string, string> = {};
      const acceptedRequests = list.filter(r => r.status === "accepted");
      await Promise.all(
        acceptedRequests.map(async (r) => {
          const id = tab === "incoming" ? r.sender_id : r.recipient_id;
          const { data: emailData } = await supabase.rpc("get_connection_email", { target_user_id: id });
          if (emailData) emailMap[id] = emailData;
        })
      );
      setEmails(emailMap);
    }
    setBusy(false);
  }

  useEffect(() => { load(); }, [user, tab]); // eslint-disable-line react-hooks/exhaustive-deps

  async function respond(r: Req, status: "accepted" | "declined" | "withdrawn") {
    const { error } = await supabase.from("connection_requests").update({ status }).eq("id", r.id);
    if (error) return toast.error(error.message);
    
    // Send notification if accepted
    if (status === "accepted" && tab === "incoming") {
      await supabase.from("notifications").insert({
        user_id: r.sender_id,
        category: "connect_requests",
        type: "connect_requests",
        message: `${user?.email} has accepted your connection request.`,
        link: "/app/connect"
      });
    }
    
    toast.success(`Request ${status}`);
    load();
  }

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    toast.success("Email copied to clipboard");
  };

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
                {r.status === "accepted" && emails[otherId] && (
                  <div className="mt-6 flex items-center justify-between rounded-2xl bg-[var(--indigo-night)]/5 p-4 border border-[var(--indigo-night)]/10">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--indigo-night)]">Contact Information</p>
                      <p className="mt-1 font-medium">{emails[otherId]}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="icon" variant="outline" onClick={() => handleCopyEmail(emails[otherId])}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        className="bg-[var(--indigo-night)] text-[var(--parchment)] hover:bg-[var(--indigo-night)]/90"
                        onClick={() => { window.location.href = `mailto:${emails[otherId]}`; }}
                      >
                        <Mail className="mr-2 h-4 w-4" /> Email
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => navigate({ to: '/app/messages', search: { user: otherId } })}
                      >
                        <MessageSquare className="mr-2 h-4 w-4" /> Message
                      </Button>
                    </div>
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
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import { Flag, Send, ThumbsUp, CalendarClock, Search, Mail, Copy, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { ReachOutDialog } from "@/components/connect/ReachOutDialog";
import { EndorseDialog } from "@/components/connect/EndorseDialog";
import { ReportDialog } from "@/components/connect/ReportDialog";
import { BookMentorDialog } from "@/components/connect/BookMentorDialog";
import { SEGMENT_LIST, SEGMENT_META, type Segment } from "@/components/auth/segments";
import { VerifiedBadge } from "@/components/auth/VerifiedBadge";
import { VerificationCard } from "@/components/auth/VerificationCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const Route = createFileRoute("/app/directory")({
  head: () => ({ meta: [{ title: "Directory — Indus Orbit" }, { name: "robots", content: "noindex" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    segment: typeof s.segment === "string" && (SEGMENT_LIST as string[]).includes(s.segment) ? (s.segment as Segment) : undefined,
  }),
  component: DirectoryPage,
});

const FILTERS = ["all", ...SEGMENT_LIST] as const;
type Filter = (typeof FILTERS)[number];

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

type Profile = {
  id: string;
  user_id: string;
  display_name: string | null;
  headline: string | null;
  city: string | null;
  country: string | null;
  orbit_segment: Segment | null;
  linkedin_url: string | null;
  website_url: string | null;
  is_verified: boolean;
};

const PAGE_SIZE = 24;

function DirectoryPage() {
  const search = Route.useSearch();
  const { user } = useAuth();
  const [meVerified, setMeVerified] = useState(false);
  const [filter, setFilter] = useState<Filter>(search.segment ?? "all");
  const [members, setMembers] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [reachOut, setReachOut] = useState<Profile | null>(null);
  const [endorse, setEndorse] = useState<Profile | null>(null);
  const [report, setReport] = useState<Profile | null>(null);
  const [bookMentor, setBookMentor] = useState<Profile | null>(null);
  const [endorseCounts, setEndorseCounts] = useState<Record<string, number>>({});
  const [showVerificationPrompt, setShowVerificationPrompt] = useState(false);
  const debounceRef = useRef<any>(null);

  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<"directory" | "incoming" | "outgoing">("directory");
  const [reqRows, setReqRows] = useState<Req[]>([]);
  const [reqNames, setReqNames] = useState<Record<string, string>>({});
  const [reqEmails, setReqEmails] = useState<Record<string, string>>({});
  const [reqBusy, setReqBusy] = useState(false);

  useEffect(() => {
    if (search.segment) setFilter(search.segment);
  }, [search.segment]);

  // Debounce search input
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(searchQuery), 350);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery]);

  const fetchMembers = useCallback(async (append = false) => {
    if (append) setLoadingMore(true); else setLoading(true);
    const from = append ? members.length : 0;
    const to = from + PAGE_SIZE - 1;

    let q = supabase
      .from("profiles")
      .select("id, user_id, display_name, headline, city, country, orbit_segment, linkedin_url, website_url, is_verified", { count: "exact" })
      .eq("is_public", true);
    if (filter !== "all") q = q.eq("orbit_segment", filter as never);
    if (debouncedSearch.trim()) {
      q = q.or(`display_name.ilike.%${debouncedSearch.trim()}%,headline.ilike.%${debouncedSearch.trim()}%`);
    }
    const { data, count } = await q
      .order("is_verified", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, to);

    const list = (data as unknown as Profile[] | null) ?? [];
    const total = count ?? 0;
    setTotalCount(total);
    setMembers(append ? [...members, ...list] : list);
    setHasMore(from + list.length < total);
    setLoading(false);
    setLoadingMore(false);

    // Fetch endorsements for new batch
    const ids = list.map((m) => m.user_id);
    if (ids.length) {
      const { data: ends } = await supabase.from("endorsements").select("endorsee_id").in("endorsee_id", ids);
      const counts: Record<string, number> = {};
      for (const e of (ends as { endorsee_id: string }[] | null) ?? []) {
        counts[e.endorsee_id] = (counts[e.endorsee_id] ?? 0) + 1;
      }
      setEndorseCounts(prev => append ? { ...prev, ...counts } : counts);
    }
  }, [filter, debouncedSearch, members]);

  useEffect(() => {
    if (viewMode === "directory") fetchMembers(false);
  }, [filter, debouncedSearch, viewMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadRequests = useCallback(async () => {
    if (!user || viewMode === "directory") return;
    setReqBusy(true);
    const col = viewMode === "incoming" ? "recipient_id" : "sender_id";
    const { data } = await supabase
      .from("connection_requests")
      .select("*")
      .eq(col, user.id)
      .order("created_at", { ascending: false });
    const list = (data as unknown as Req[] | null) ?? [];
    setReqRows(list);
    const otherIds = Array.from(new Set(list.map((r) => (viewMode === "incoming" ? r.sender_id : r.recipient_id))));
    if (otherIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", otherIds);
      const map: Record<string, string> = {};
      for (const p of (profs as { user_id: string; display_name: string | null }[] | null) ?? []) {
        map[p.user_id] = p.display_name ?? "Member";
      }
      setReqNames(map);

      const emailMap: Record<string, string> = {};
      const acceptedRequests = list.filter(r => r.status === "accepted");
      await Promise.all(
        acceptedRequests.map(async (r) => {
          const id = viewMode === "incoming" ? r.sender_id : r.recipient_id;
          const { data: emailData } = await supabase.rpc("get_connection_email", { target_user_id: id });
          if (emailData) emailMap[id] = emailData;
        })
      );
      setReqEmails(emailMap);
    }
    setReqBusy(false);
  }, [user, viewMode]);

  useEffect(() => {
    if (viewMode !== "directory") loadRequests();
  }, [viewMode, loadRequests]);

  async function respond(r: Req, status: "accepted" | "declined" | "withdrawn") {
    const { error } = await supabase.from("connection_requests").update({ status }).eq("id", r.id);
    if (error) return toast.error(error.message);
    if (status === "accepted" && viewMode === "incoming") {
      await supabase.from("notifications").insert({
        user_id: r.sender_id, category: "connect_requests", type: "connect_requests",
        message: `${user?.email} has accepted your connection request.`, link: "/app/directory"
      });
    }
    toast.success(`Request ${status}`);
    loadRequests();
  }

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    toast.success("Email copied to clipboard");
  };

  useEffect(() => {
    if (!user) { setMeVerified(false); return; }
    supabase.from("profiles").select("is_verified").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setMeVerified(Boolean(data?.is_verified)));
  }, [user]);

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--saffron)]">Network</p>
          <h1 className="mt-2 font-display text-3xl font-medium md:text-4xl">Members & Connections</h1>
          <p className="mt-2 max-w-2xl text-sm text-foreground/70">
            Public profiles across all stakeholder segments, and your private connections.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-2 border-b border-border pb-4 overflow-x-auto">
        <button
          onClick={() => setViewMode("directory")}
          className={`rounded-full border px-4 py-1.5 text-xs uppercase tracking-wider transition whitespace-nowrap ${
            viewMode === "directory" ? "border-[var(--indigo-night)] bg-[var(--indigo-night)] text-[var(--parchment)]" : "border-border hover:bg-foreground/5"
          }`}
        >
          Directory
        </button>
        <button
          onClick={() => setViewMode("incoming")}
          className={`rounded-full border px-4 py-1.5 text-xs uppercase tracking-wider transition whitespace-nowrap flex items-center gap-2 ${
            viewMode === "incoming" ? "border-[var(--indigo-night)] bg-[var(--indigo-night)] text-[var(--parchment)]" : "border-border hover:bg-foreground/5"
          }`}
        >
          Incoming Requests
        </button>
        <button
          onClick={() => setViewMode("outgoing")}
          className={`rounded-full border px-4 py-1.5 text-xs uppercase tracking-wider transition whitespace-nowrap flex items-center gap-2 ${
            viewMode === "outgoing" ? "border-[var(--indigo-night)] bg-[var(--indigo-night)] text-[var(--parchment)]" : "border-border hover:bg-foreground/5"
          }`}
        >
          Outgoing Requests
        </button>
      </div>

      {viewMode === "directory" && (
        <>
          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-full border px-4 py-1.5 text-xs uppercase tracking-wider transition ${
                filter === s
                  ? "border-[var(--indigo-night)] bg-[var(--indigo-night)] text-[var(--parchment)]"
                  : "border-border hover:bg-foreground/5"
              }`}
            >
              {s === "all" ? "All" : SEGMENT_META[s as Segment].label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search directory..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 rounded-full bg-muted/50 border-border/50"
          />
        </div>
      </div>

      {/* Result count */}
      {!loading && totalCount > 0 && (
        <p className="mt-6 text-xs text-muted-foreground">
          Showing {members.length} of {totalCount} member{totalCount !== 1 ? "s" : ""}
          {debouncedSearch && ` matching "${debouncedSearch}"`}
        </p>
      )}

      {loading ? (
        <p className="mt-12 text-muted-foreground">Loading…</p>
      ) : members.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-muted-foreground">No members found{debouncedSearch ? ` matching "${debouncedSearch}"` : " in this segment yet"}.</p>
          {debouncedSearch && (
            <button onClick={() => setSearchQuery("")} className="mt-2 text-sm text-[var(--indigo-night)] underline">
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="mt-4 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {members.map((m) => (
            <article key={m.id} className="rounded-3xl border border-border bg-card p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-lg font-semibold hover:text-[var(--indigo-night)] transition">
                    <Link to="/profile/$id" params={{ id: m.user_id }}>
                      {m.display_name ?? "Member"}
                    </Link>
                  </h3>
                  {m.is_verified && <VerifiedBadge />}
                </div>
                {m.orbit_segment && <Badge variant="secondary">{SEGMENT_META[m.orbit_segment].label}</Badge>}
              </div>
              {m.headline && <p className="mt-1 text-sm text-foreground/80">{m.headline}</p>}
              {(m.city || m.country) && (
                <p className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">
                  {[m.city, m.country].filter(Boolean).join(" · ")}
                </p>
              )}
              <div className="mt-4 flex gap-3 text-sm">
                {m.linkedin_url && <a href={m.linkedin_url} target="_blank" rel="noreferrer" className="text-[var(--indigo-night)] hover:underline">LinkedIn</a>}
                {m.website_url && <a href={m.website_url} target="_blank" rel="noreferrer" className="text-[var(--indigo-night)] hover:underline">Website</a>}
              </div>
              {(endorseCounts[m.user_id] ?? 0) > 0 && (
                <p className="mt-3 text-xs text-muted-foreground">
                  ★ {endorseCounts[m.user_id]} endorsement{endorseCounts[m.user_id] === 1 ? "" : "s"}
                </p>
              )}
              {user && user.id !== m.user_id && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => setReachOut(m)}>
                    <Send className="mr-1 h-3.5 w-3.5" /> Reach out
                  </Button>
                  {meVerified && (
                    <Button size="sm" variant="outline" onClick={() => setEndorse(m)}>
                      <ThumbsUp className="mr-1 h-3.5 w-3.5" /> Endorse
                    </Button>
                  )}
                  {user && (
                    <Button size="sm" variant="outline" onClick={() => meVerified ? setBookMentor(m) : setShowVerificationPrompt(true)}>
                      <CalendarClock className="mr-1 h-3.5 w-3.5" /> Book Session
                    </Button>
                  )}
                  <button
                    onClick={() => setReport(m)}
                    className="ml-auto text-muted-foreground hover:text-foreground"
                    aria-label="Report"
                  >
                    <Flag className="h-4 w-4" />
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {/* Load More */}
      {hasMore && !loading && (
        <div className="mt-8 flex justify-center">
          <Button
            variant="outline"
            onClick={() => fetchMembers(true)}
            disabled={loadingMore}
            className="rounded-full px-8"
          >
            {loadingMore ? "Loading…" : `Load More (${totalCount - members.length} remaining)`}
          </Button>
        </div>
      )}
      </>
      )}

      {viewMode !== "directory" && (
        <div className="mt-6">
          {reqBusy ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : reqRows.length === 0 ? (
            <p className="text-muted-foreground">
              {viewMode === "incoming" ? "No incoming requests yet." : "You haven't sent any requests yet."}
            </p>
          ) : (
            <div className="space-y-4">
              {reqRows.map((r) => {
                const otherId = viewMode === "incoming" ? r.sender_id : r.recipient_id;
                const otherName = reqNames[otherId] ?? "Member";
                return (
                  <article key={r.id} className="rounded-3xl border border-border bg-card p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-display text-lg font-semibold">
                          {viewMode === "incoming" ? "From " : "To "}
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
                    {viewMode === "incoming" && r.status === "pending" && (
                      <div className="mt-4 flex gap-2">
                        <Button onClick={() => respond(r, "accepted")}>Accept</Button>
                        <Button variant="outline" onClick={() => respond(r, "declined")}>Decline</Button>
                      </div>
                    )}
                    {viewMode === "outgoing" && r.status === "pending" && (
                      <div className="mt-4">
                        <Button variant="outline" onClick={() => respond(r, "withdrawn")}>Withdraw</Button>
                      </div>
                    )}
                    {r.status === "accepted" && reqEmails[otherId] && (
                      <div className="mt-6 flex items-center justify-between rounded-2xl bg-[var(--indigo-night)]/5 p-4 border border-[var(--indigo-night)]/10">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--indigo-night)]">Contact Information</p>
                          <p className="mt-1 font-medium">{reqEmails[otherId]}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="icon" variant="outline" onClick={() => handleCopyEmail(reqEmails[otherId])}>
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            className="bg-[var(--indigo-night)] text-[var(--parchment)] hover:bg-[var(--indigo-night)]/90"
                            onClick={() => { window.location.href = `mailto:${reqEmails[otherId]}`; }}
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
      )}

      {reachOut && (
        <ReachOutDialog
          open={!!reachOut}
          onOpenChange={(o) => !o && setReachOut(null)}
          recipientId={reachOut.user_id}
          recipientName={reachOut.display_name ?? "Member"}
          senderId={user?.id ?? null}
        />
      )}
      {endorse && (
        <EndorseDialog
          open={!!endorse}
          onOpenChange={(o) => !o && setEndorse(null)}
          endorseeId={endorse.user_id}
          endorseeName={endorse.display_name ?? "Member"}
          endorserId={user?.id ?? null}
          defaultSegment={endorse.orbit_segment}
        />
      )}
      {report && (
        <ReportDialog
          open={!!report}
          onOpenChange={(o) => !o && setReport(null)}
          targetType="profile"
          targetId={report.id}
          reporterId={user?.id ?? null}
        />
      )}
      {bookMentor && (
        <BookMentorDialog
          open={!!bookMentor}
          onOpenChange={(o) => !o && setBookMentor(null)}
          expertId={bookMentor.user_id}
          expertName={bookMentor.display_name ?? "Member"}
        />
      )}
      <Dialog open={showVerificationPrompt} onOpenChange={setShowVerificationPrompt}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Verification Required</DialogTitle>
            <DialogDescription>
              You must be a verified member to book mentorship and networking sessions.
            </DialogDescription>
          </DialogHeader>
          <VerificationCard onChanged={() => { setShowVerificationPrompt(false); window.location.reload(); }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

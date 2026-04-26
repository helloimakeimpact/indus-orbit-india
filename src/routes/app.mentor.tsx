import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarClock, Check, X, CheckCircle, Video } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getMyMentorSessions, updateMentorSession } from "@/server/mentor.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/mentor")({
  head: () => ({ meta: [{ title: "Mentorship — Indus Orbit" }, { name: "robots", content: "noindex" }] }),
  component: MentorPage,
});

function MentorPage() {
  const { user } = useAuth();
  const [data, setData] = useState<{ asExpert: any[]; asBooker: any[]; monthlyHoursDelivered: number } | null>(null);
  const [busy, setBusy] = useState(true);
  const [acceptingSession, setAcceptingSession] = useState<any | null>(null);

  async function load() {
    try {
      const res = await getMyMentorSessions();
      setData(res);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (user) load();
  }, [user]);

  async function updateStatus(sessionId: string, status: "declined" | "completed" | "cancelled") {
    try {
      await updateMentorSession({ data: { sessionId, status } });
      toast.success(`Session marked as ${status}`);
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  if (busy || !data) return <p className="mt-8 text-muted-foreground px-4">Loading sessions…</p>;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--saffron)]">Mentorship</p>
          <h1 className="mt-2 font-display text-3xl font-medium md:text-4xl">Your Sessions</h1>
        </div>
      </div>

      {data.asExpert.length > 0 && (
        <section className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-medium">As an Expert</h2>
            <div className="text-sm font-medium text-muted-foreground">
              {data.monthlyHoursDelivered} hours delivered this month
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {data.asExpert.map((s) => (
              <SessionCard 
                key={s.id} 
                session={s} 
                isExpert={true} 
                onAccept={() => setAcceptingSession(s)}
                onUpdate={updateStatus} 
              />
            ))}
          </div>
        </section>
      )}

      {data.asBooker.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-xl font-medium">As a Learner / Founder</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {data.asBooker.map((s) => (
              <SessionCard 
                key={s.id} 
                session={s} 
                isExpert={false} 
                onUpdate={updateStatus} 
              />
            ))}
          </div>
        </section>
      )}

      {data.asExpert.length === 0 && data.asBooker.length === 0 && (
        <div className="mt-10 rounded-3xl border border-dashed border-border p-12 text-center text-muted-foreground">
          <CalendarClock className="mx-auto h-8 w-8 opacity-50" />
          <p className="mt-4 font-medium text-foreground">No mentorship sessions yet.</p>
          <p className="mt-1 text-sm">Find experts in the directory and request a session.</p>
        </div>
      )}

      {acceptingSession && (
        <AcceptSessionDialog 
          session={acceptingSession} 
          onClose={() => setAcceptingSession(null)} 
          onAccepted={load} 
        />
      )}
    </div>
  );
}

function SessionCard({ session, isExpert, onAccept, onUpdate }: { session: any, isExpert: boolean, onAccept?: () => void, onUpdate: (id: string, s: any) => void }) {
  const profile = isExpert ? session.profiles : session.profiles; // Since both return the joined profile as profiles
  
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <Badge variant={session.status === 'pending' ? 'secondary' : session.status === 'accepted' ? 'default' : 'outline'}>
            {session.status.toUpperCase()}
          </Badge>
          <h3 className="mt-3 font-display text-lg font-semibold">{profile?.display_name ?? 'Member'}</h3>
          <p className="text-xs text-muted-foreground">{profile?.headline}</p>
        </div>
      </div>
      
      <div className="mt-4 rounded-xl bg-muted/40 p-3 text-sm">
        <p className="font-medium">Request ({session.duration_mins} mins):</p>
        <p className="mt-1 text-muted-foreground">{session.message}</p>
      </div>

      {session.status === 'accepted' && session.scheduled_for && (
        <div className="mt-3 text-sm text-[var(--indigo-night)] font-medium flex items-center gap-2">
          <CalendarClock className="h-4 w-4" /> 
          Scheduled for: {new Date(session.scheduled_for).toLocaleString()}
        </div>
      )}
      
      {session.status === 'accepted' && session.meeting_url && (
        <a href={session.meeting_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm text-[var(--saffron)] hover:underline">
          <Video className="h-4 w-4" /> Join Meeting
        </a>
      )}

      <div className="mt-5 flex gap-2">
        {session.status === 'pending' && isExpert && (
          <>
            <Button size="sm" onClick={onAccept}><Check className="mr-1 h-3.5 w-3.5" /> Accept</Button>
            <Button size="sm" variant="outline" onClick={() => onUpdate(session.id, 'declined')}><X className="mr-1 h-3.5 w-3.5" /> Decline</Button>
          </>
        )}
        {session.status === 'accepted' && isExpert && (
          <Button size="sm" variant="outline" onClick={() => onUpdate(session.id, 'completed')}><CheckCircle className="mr-1 h-3.5 w-3.5" /> Mark Completed</Button>
        )}
        {session.status === 'pending' && !isExpert && (
          <Button size="sm" variant="outline" onClick={() => onUpdate(session.id, 'cancelled')}>Cancel Request</Button>
        )}
      </div>
    </div>
  );
}

function AcceptSessionDialog({ session, onClose, onAccepted }: { session: any, onClose: () => void, onAccepted: () => void }) {
  const { user } = useAuth();
  const [meetingUrl, setMeetingUrl] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("booking_url")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.booking_url) setMeetingUrl(data.booking_url);
      });
  }, [user]);

  async function submit() {
    setBusy(true);
    try {
      await updateMentorSession({ data: { 
        sessionId: session.id, 
        status: "accepted", 
        meetingUrl: meetingUrl.trim() || undefined,
        scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : undefined
      }});
      toast.success("Session accepted");
      onAccepted();
      onClose();
    } catch (err: any) {
      toast.error(err.message);
      setBusy(false);
    }
  }

  return (
    <Dialog open={true} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Accept Mentorship Session</DialogTitle>
          <DialogDescription>Set a time and provide a meeting link for the session.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Date & Time</Label>
            <Input type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Meeting Link (e.g., Google Meet, Zoom)</Label>
            <Input placeholder="https://meet.google.com/..." value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={busy || !scheduledFor}>{busy ? "Accepting…" : "Accept Session"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

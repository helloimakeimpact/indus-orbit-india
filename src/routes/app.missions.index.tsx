import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Globe2, Rocket, Plus, Users, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createMission, getMissions, joinMission, updateMissionStatus } from "@/server/mission.functions";

export const Route = createFileRoute("/app/missions/")({
  head: () => ({ meta: [{ title: "India Missions — Indus Orbit" }, { name: "robots", content: "noindex" }] }),
  component: MissionsPage,
});

function MissionsPage() {
  const { user, isAdmin, userSegment } = useAuth();
  const navigate = useNavigate();
  const [missions, setMissions] = useState<any[]>([]);
  const [busy, setBusy] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState<any | null>(null);

  async function load() {
    try {
      const data = await getMissions();
      setMissions(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleStatusChange(missionId: string, status: "open" | "completed" | "archived") {
    try {
      await updateMissionStatus({ data: { missionId, status } });
      toast.success(`Mission marked as ${status}`);
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  if (busy) return <p className="mt-8 text-muted-foreground px-4">Loading missions…</p>;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--saffron)]">India Missions</p>
          <h1 className="mt-2 font-display text-3xl font-medium md:text-4xl">Platform Campaigns</h1>
          <p className="mt-2 max-w-2xl text-sm text-foreground/70">
            Time-bounded campaigns where Diaspora members and Experts commit capital, mentorship, or hiring support toward a cohort of Founders.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setCreateOpen(true)} className="bg-[var(--indigo-night)] text-[var(--parchment)]">
            <Plus className="mr-2 h-4 w-4" /> Create Mission
          </Button>
        )}
      </div>

      <div className="mt-8 space-y-6">
        {missions.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border p-12 text-center text-muted-foreground">
            <Globe2 className="mx-auto h-8 w-8 opacity-50" />
            <p className="mt-4 font-medium text-foreground">No active missions right now.</p>
          </div>
        ) : (
          missions.map((m) => {
            const hasJoined = m.mission_members?.some((mm: any) => mm.user_id === user?.id);
            const diasporaCount = m.mission_members?.filter((mm: any) => mm.role === 'contributor').length || 0;
            const founderCount = m.mission_members?.filter((mm: any) => mm.role === 'founder').length || 0;
            
            return (
              <div key={m.id} className="rounded-3xl border border-border bg-card overflow-hidden">
                <div className="bg-[var(--indigo-night)] p-6 text-[var(--parchment)] relative overflow-hidden">
                  <div className="absolute -right-10 -top-10 opacity-10">
                    <Globe2 className="h-48 w-48" />
                  </div>
                  <div className="relative z-10">
                    <div className="flex justify-between items-start">
                      <Badge className="bg-[var(--saffron)] text-[var(--indigo-night)] uppercase tracking-widest text-[10px]">
                        {m.theme}
                      </Badge>
                      <Badge variant="outline" className="border-[var(--parchment)]/20 text-[var(--parchment)]">
                        {m.status.toUpperCase()}
                      </Badge>
                    </div>
                    <h2 className="mt-4 font-display text-2xl font-semibold md:text-3xl max-w-2xl">{m.title}</h2>
                    <p className="mt-2 text-sm text-[var(--parchment)]/80 max-w-3xl leading-relaxed">{m.description}</p>
                  </div>
                </div>
                
                <div className="p-6 md:flex justify-between items-center bg-muted/20">
                  <div className="flex gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                        <Globe2 className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-semibold">{diasporaCount}</p>
                        <p className="text-xs text-muted-foreground">Contributors</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-700">
                        <Rocket className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-semibold">{founderCount}</p>
                        <p className="text-xs text-muted-foreground">Founders</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 md:mt-0 flex gap-2">
                    {hasJoined ? (
                      <Button
                        className="bg-[var(--indigo-night)] text-[var(--parchment)] hover:bg-[var(--indigo-night)]/90"
                        onClick={() => {
                          console.log('Navigating to mission:', m.id);
                          navigate({ to: '/app/missions/$missionId', params: { missionId: m.id } })
                            .then(res => console.log('Navigation success', res))
                            .catch(err => console.error('Navigation error', err));
                        }}
                      >
                        Open Workspace <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    ) : m.status === 'open' ? (
                      <Button onClick={() => setJoinOpen(m)} className="bg-[var(--saffron)] text-[var(--indigo-night)] hover:bg-[var(--saffron)]/90">
                        Join Mission <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => navigate({ to: '/app/missions/$missionId', params: { missionId: m.id } })}
                      >
                        View Details
                      </Button>
                    )}
                  </div>
                </div>
                
                {m.mission_members && m.mission_members.length > 0 && (
                  <div className="border-t border-border p-4 px-6 bg-card">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center">
                      <Users className="mr-1.5 h-3.5 w-3.5" /> Recent Participants
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {m.mission_members.slice(0, 5).map((mm: any) => (
                        <Badge key={mm.user_id} variant="secondary" className="font-normal flex gap-1.5 items-center">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: mm.role === 'founder' ? '#22c55e' : '#3b82f6' }} />
                          {mm.profiles?.display_name || 'Member'}
                          {mm.commitment_type && <span className="opacity-50">({mm.commitment_type})</span>}
                        </Badge>
                      ))}
                      {m.mission_members.length > 5 && (
                        <Badge variant="outline">+{m.mission_members.length - 5} more</Badge>
                      )}
                    </div>
                  </div>
                )}
                
                {isAdmin && (
                  <div className="border-t border-border p-4 px-6 bg-muted/30 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admin Controls</span>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant={m.status === 'open' ? 'default' : 'outline'} onClick={() => handleStatusChange(m.id, 'open')}>Open</Button>
                      <Button size="sm" variant={m.status === 'completed' ? 'default' : 'outline'} onClick={() => handleStatusChange(m.id, 'completed')}>Complete</Button>
                      <Button size="sm" variant={m.status === 'archived' ? 'default' : 'outline'} onClick={() => handleStatusChange(m.id, 'archived')}>Archive</Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {createOpen && <CreateMissionDialog onClose={() => setCreateOpen(false)} onCreated={load} />}
      {joinOpen && <JoinMissionDialog mission={joinOpen} userSegment={userSegment} onClose={() => setJoinOpen(null)} onJoined={load} />}
    </div>
  );
}

function CreateMissionDialog({ onClose, onCreated }: { onClose: () => void, onCreated: () => void }) {
  const [form, setForm] = useState({ title: "", theme: "", description: "" });
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await createMission({ data: form });
      toast.success("Mission created");
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(err.message);
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Mission</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. AI for Bharat" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Theme</label>
            <Input value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })} placeholder="e.g. Healthcare, Agriculture" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={busy || !form.title || !form.theme || !form.description}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function JoinMissionDialog({ mission, userSegment, onClose, onJoined }: { mission: any, userSegment: string | null, onClose: () => void, onJoined: () => void }) {
  const isFounder = userSegment === "founder" || userSegment === "youth";
  const [role, setRole] = useState<"contributor" | "founder">(isFounder ? "founder" : "contributor");
  const [commitmentType, setCommitmentType] = useState("mentorship");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await joinMission({ data: { 
        missionId: mission.id, 
        role, 
        commitmentType: role === "contributor" ? commitmentType : undefined,
        message: message.trim() || undefined
      }});
      toast.success("Successfully joined mission!");
      onJoined();
      onClose();
    } catch (err: any) {
      toast.error(err.message);
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join Mission: {mission.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">How are you joining?</label>
            <Select value={role} onValueChange={(v: "contributor" | "founder") => setRole(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="founder">As a Founder (seeking support)</SelectItem>
                <SelectItem value="contributor">As a Contributor (offering support)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {role === "contributor" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">What is your commitment?</label>
              <Select value={commitmentType} onValueChange={setCommitmentType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mentorship">Mentorship & Time</SelectItem>
                  <SelectItem value="capital">Capital / Investment</SelectItem>
                  <SelectItem value="hiring">Hiring / Network Access</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Any specifics? (Optional)</label>
            <Textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="e.g. I can review pitch decks on weekends..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>Join Mission</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

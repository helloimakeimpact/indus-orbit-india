import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MapPin, Users, Crown, ArrowLeft, Calendar, FileText, Target, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { createMission } from "@/server/mission.functions";
import { submitStory, submitEvent, removeChapterMember } from "@/server/society.functions";

export const Route = createFileRoute("/app/chapters/$chapterId")({
  head: () => ({ meta: [{ title: "Chapter Workspace — Indus Orbit" }, { name: "robots", content: "noindex" }] }),
  component: ChapterWorkspace,
});

function ChapterWorkspace() {
  const { chapterId } = Route.useParams();
  const { user } = useAuth();
  const [chapter, setChapter] = useState<any>(null);
  const [missions, setMissions] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [busy, setBusy] = useState(true);
  
  // Dialog States
  const [missionOpen, setMissionOpen] = useState(false);
  const [storyOpen, setStoryOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);

  // Form States
  const [missionForm, setMissionForm] = useState({ title: "", theme: "", description: "" });
  const [storyForm, setStoryForm] = useState({ title: "", content: "" });
  const [eventForm, setEventForm] = useState({ title: "", description: "", startTime: "", endTime: "" });

  // Filtering State
  const [searchQuery, setSearchQuery] = useState("");
  
  // Member Removal State
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);

  const navigate = useNavigate();

  async function load() {
    try {
      const [chData, mData, sData, eData] = await Promise.all([
        supabase.from("chapters").select(`*, chapter_members(user_id, role, profiles(display_name, avatar_url))`).eq("id", chapterId).single().then(r => r.data),
        supabase.from("missions").select("id, title, status, description").eq("chapter_id", chapterId).then(r => r.data),
        supabase.from("stories").select("id, title, created_at").eq("chapter_id", chapterId).then(r => r.data),
        supabase.from("events").select("id, title, start_time, location").eq("chapter_id", chapterId).then(r => r.data)
      ]);
      setChapter(chData);
      setMissions(mData || []);
      setStories(sData || []);
      setEvents(eData || []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { load(); }, [chapterId]);

  if (busy) return <p className="mt-8 text-muted-foreground px-4">Loading chapter…</p>;
  if (!chapter) return <p className="mt-8 text-muted-foreground px-4">Chapter not found.</p>;

  const leads = chapter.chapter_members?.filter((m: any) => m.role === 'lead') || [];
  const members = chapter.chapter_members || []; // Include all members for the list
  const isMember = chapter.chapter_members?.some((m: any) => m.user_id === user?.id);
  const isLead = leads.some((m: any) => m.user_id === user?.id);

  async function handleJoin() {
    if (!user) return toast.error("Log in first");
    const { error } = await supabase.from("chapter_members").insert({ chapter_id: chapter.id, user_id: user.id, role: 'member' });
    if (error) return toast.error(error.message);
    toast.success("Joined chapter!");
    load();
  }

  async function handleCreateMission(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createMission({ data: { ...missionForm, chapterId: chapter.id } });
      toast.success("Mission created!");
      setMissionOpen(false);
      setMissionForm({ title: "", theme: "", description: "" });
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleCreateStory(e: React.FormEvent) {
    e.preventDefault();
    try {
      await submitStory({ data: { ...storyForm, chapterId: chapter.id } });
      toast.success("Story published!");
      setStoryOpen(false);
      setStoryForm({ title: "", content: "" });
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();
    try {
      await submitEvent({ data: { 
        title: eventForm.title, 
        description: eventForm.description, 
        startTime: new Date(eventForm.startTime).toISOString(), 
        endTime: new Date(eventForm.endTime).toISOString(), 
        locationType: "irl", 
        chapterId: chapter.id 
      } });
      toast.success("Event created!");
      setEventOpen(false);
      setEventForm({ title: "", description: "", startTime: "", endTime: "" });
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleRemoveMember() {
    if (!memberToRemove) return;
    try {
      await removeChapterMember({ data: { chapterId: chapter.id, targetUserId: memberToRemove.id } });
      toast.success(`${memberToRemove.name} removed from chapter.`);
      setMemberToRemove(null);
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="mb-2">
        <Link to="/app/chapters" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-[var(--indigo-night)] transition">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Chapters
        </Link>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 h-32 w-32 bg-[var(--saffron)]/10 rounded-bl-full -mr-8 -mt-8" />
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10">
          <div className="flex-1">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-[var(--indigo-night)]">{chapter.name}</h1>
            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground font-medium">
              <MapPin className="h-4 w-4 text-[var(--saffron)]" /> {[chapter.city, chapter.country].filter(Boolean).join(", ")}
            </p>
            <p className="mt-4 text-sm text-foreground/85 leading-relaxed">{chapter.description}</p>
          </div>
          <div className="flex flex-col gap-3 min-w-[220px]">
            {isMember ? (
              <Badge variant="secondary" className="justify-center py-2 text-sm bg-muted/50 border border-border font-semibold">
                Member
              </Badge>
            ) : (
              <Button onClick={handleJoin} className="w-full shadow-sm bg-[var(--indigo-night)] text-[var(--parchment)] hover:bg-[var(--indigo-night)]/90">
                Join Chapter
              </Button>
            )}
            <div className="rounded-xl bg-muted/30 p-4 border border-border shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold mb-3">
                <Users className="h-4 w-4 text-[var(--indigo-night)]" /> {chapter.chapter_members?.length || 0} Members
              </div>
              {leads.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-border/50">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1 font-bold">
                    <Crown className="h-3 w-3 text-[var(--saffron)]"/> Leads
                  </div>
                  {leads.map((l: any) => (
                    <div key={l.user_id} className="text-sm font-medium">
                      <Link to="/profile/$id" params={{ id: l.user_id }} className="hover:text-[var(--saffron)] transition">
                        {l.profiles?.display_name || "Member"}
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="missions" className="mt-4">
        <TabsList className="bg-transparent border-b border-border w-full justify-start rounded-none p-0 h-auto gap-6 overflow-x-auto hide-scrollbar">
          <TabsTrigger value="missions" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[var(--saffron)] rounded-none px-2 py-3 font-semibold text-sm">
            Missions <span className="ml-2 text-muted-foreground font-normal">{missions.length}</span>
          </TabsTrigger>
          <TabsTrigger value="stories" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[var(--saffron)] rounded-none px-2 py-3 font-semibold text-sm">
            Stories <span className="ml-2 text-muted-foreground font-normal">{stories.length}</span>
          </TabsTrigger>
          <TabsTrigger value="events" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[var(--saffron)] rounded-none px-2 py-3 font-semibold text-sm">
            Events <span className="ml-2 text-muted-foreground font-normal">{events.length}</span>
          </TabsTrigger>
          <TabsTrigger value="members" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[var(--saffron)] rounded-none px-2 py-3 font-semibold text-sm">
            Members <span className="ml-2 text-muted-foreground font-normal">{members.length}</span>
          </TabsTrigger>
        </TabsList>
        
        <div className="mt-4 mb-6">
          <Input 
            placeholder="Filter list..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-xs bg-muted/50 border-border"
          />
        </div>

        <TabsContent value="missions" className="outline-none">
          {isLead && (
            <div className="mb-6">
              <Dialog open={missionOpen} onOpenChange={setMissionOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2 bg-muted text-foreground hover:bg-muted/80 shadow-none border border-border"><Plus className="h-4 w-4" /> New Mission</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Mission</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateMission} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input required value={missionForm.title} onChange={e => setMissionForm(prev => ({...prev, title: e.target.value}))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Theme</Label>
                      <Input required value={missionForm.theme} onChange={e => setMissionForm(prev => ({...prev, theme: e.target.value}))} placeholder="e.g. Technology, Education" />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea required value={missionForm.description} onChange={e => setMissionForm(prev => ({...prev, description: e.target.value}))} className="resize-none" rows={4} />
                    </div>
                    <DialogFooter>
                      <Button type="submit">Create Mission</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          )}
          {missions.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
              <Target className="mx-auto h-6 w-6 opacity-40 mb-3" />
              <p className="text-sm">No active missions for this chapter.</p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-border border border-border rounded-2xl bg-card overflow-hidden">
              {missions.filter(m => m.title.toLowerCase().includes(searchQuery.toLowerCase())).map(m => (
                <div key={m.id} className="p-5 transition hover:bg-muted/30">
                  <div className="flex items-center justify-between gap-4 mb-1">
                    <h3 className="font-display font-medium text-lg text-foreground hover:text-[var(--saffron)] transition">
                      <Link to="/app/missions/$missionId" params={{ missionId: m.id }}>{m.title}</Link>
                    </h3>
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{m.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-2 leading-relaxed">{m.description}</p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="stories" className="outline-none">
          {isLead && (
            <div className="mb-6">
              <Dialog open={storyOpen} onOpenChange={setStoryOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2 bg-muted text-foreground hover:bg-muted/80 shadow-none border border-border"><Plus className="h-4 w-4" /> Publish Story</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Publish Story</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateStory} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input required value={storyForm.title} onChange={e => setStoryForm(prev => ({...prev, title: e.target.value}))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Content</Label>
                      <Textarea required value={storyForm.content} onChange={e => setStoryForm(prev => ({...prev, content: e.target.value}))} className="resize-none" rows={6} />
                    </div>
                    <DialogFooter>
                      <Button type="submit">Publish Story</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          )}
          {stories.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
              <FileText className="mx-auto h-6 w-6 opacity-40 mb-3" />
              <p className="text-sm">No stories published yet.</p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-border border border-border rounded-2xl bg-card overflow-hidden">
              {stories.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase())).map(s => (
                <div key={s.id} className="p-5 transition hover:bg-muted/30">
                  <h3 className="font-display font-medium text-lg hover:text-[var(--saffron)] transition">
                    <Link to="/app/stories/$id" params={{ id: s.id }}>{s.title}</Link>
                  </h3>
                  <p className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground mt-2">{new Date(s.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="events" className="outline-none">
          {isLead && (
            <div className="mb-6">
              <Dialog open={eventOpen} onOpenChange={setEventOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2 bg-muted text-foreground hover:bg-muted/80 shadow-none border border-border"><Plus className="h-4 w-4" /> Create Event</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Event</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateEvent} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input required value={eventForm.title} onChange={e => setEventForm(prev => ({...prev, title: e.target.value}))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea required value={eventForm.description} onChange={e => setEventForm(prev => ({...prev, description: e.target.value}))} className="resize-none" rows={3} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Start Time</Label>
                        <Input type="datetime-local" required value={eventForm.startTime} onChange={e => setEventForm(prev => ({...prev, startTime: e.target.value}))} />
                      </div>
                      <div className="space-y-2">
                        <Label>End Time</Label>
                        <Input type="datetime-local" required value={eventForm.endTime} onChange={e => setEventForm(prev => ({...prev, endTime: e.target.value}))} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit">Create Event</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          )}
          {events.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
              <Calendar className="mx-auto h-6 w-6 opacity-40 mb-3" />
              <p className="text-sm">No upcoming events.</p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-border border border-border rounded-2xl bg-card overflow-hidden">
              {events.filter(e => e.title.toLowerCase().includes(searchQuery.toLowerCase())).map(e => (
                <div key={e.id} className="p-5 transition hover:bg-muted/30">
                  <h3 className="font-display font-medium text-lg hover:text-[var(--saffron)] transition">
                    <Link to="/app/events/$id" params={{ id: e.id }}>{e.title}</Link>
                  </h3>
                  <div className="flex items-center gap-4 text-[11px] font-semibold tracking-wider uppercase text-muted-foreground mt-3">
                    <span>{new Date(e.start_time).toLocaleDateString()}</span>
                    {e.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {e.location}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="members" className="outline-none">
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members yet.</p>
          ) : (
            <div className="flex flex-col divide-y divide-border border border-border rounded-2xl bg-card overflow-hidden">
              {members.filter((m: any) => (m.profiles?.display_name || "Member").toLowerCase().includes(searchQuery.toLowerCase())).map((m: any) => (
                <div key={m.user_id} className="p-4 transition hover:bg-muted/30 flex items-center justify-between group">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{m.profiles?.display_name || "Member"}</span>
                    {m.role === 'lead' && (
                      <Badge className="bg-[var(--saffron)] text-[var(--indigo-night)] border-none text-[10px] uppercase tracking-wider py-0 h-4">
                        Lead
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="text-xs h-8 text-[var(--indigo-night)]" asChild>
                      <Link to="/profile/$id" params={{ id: m.user_id }}>View Profile</Link>
                    </Button>
                    {isLead && m.role !== 'lead' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-600 hover:bg-red-50"
                        onClick={() => setMemberToRemove({ id: m.user_id, name: m.profiles?.display_name || "Member" })}
                        title="Remove Member"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
          </DialogHeader>
          <p className="py-4 text-sm text-muted-foreground">
            Are you sure you want to remove <span className="font-semibold text-foreground">{memberToRemove?.name}</span> from this chapter?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMemberToRemove(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRemoveMember}>Remove Member</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

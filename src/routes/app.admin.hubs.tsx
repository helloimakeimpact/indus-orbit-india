import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/app/admin/hubs")({
  head: () => ({ meta: [{ title: "Hub Leads — Indus Orbit" }, { name: "robots", content: "noindex" }] }),
  component: HubsAdmin,
});

function HubsAdmin() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAdmin) {
      toast.error("Admins only");
      navigate({ to: "/app" });
    }
  }, [isAdmin, loading, navigate]);

  if (!isAdmin) return null;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <h1 className="font-display text-3xl font-medium">Hubs Management</h1>
      <p className="mt-2 text-sm text-muted-foreground">Manage leads for Chapters and Missions.</p>

      <Tabs defaultValue="chapters" className="mt-8">
        <TabsList className="bg-transparent border-b border-border w-full justify-start rounded-none p-0 h-auto">
          <TabsTrigger value="chapters" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[var(--saffron)] rounded-none px-6 py-3 font-medium">
            Chapters
          </TabsTrigger>
          <TabsTrigger value="missions" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[var(--saffron)] rounded-none px-6 py-3 font-medium">
            Missions
          </TabsTrigger>
        </TabsList>
        <TabsContent value="chapters" className="pt-6 outline-none">
          <ChapterLeadsManager />
        </TabsContent>
        <TabsContent value="missions" className="pt-6 outline-none">
          <MissionLeadsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ChapterLeadsManager() {
  const [chapters, setChapters] = useState<any[]>([]);
  const [busy, setBusy] = useState(true);
  const [search, setSearch] = useState("");
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);

  async function load() {
    setBusy(true);
    const { data } = await supabase.from("chapters").select("*, chapter_members(user_id, role, profiles(display_name))").order("name");
    setChapters(data || []);
    setBusy(false);
  }

  useEffect(() => { load(); }, []);

  async function searchUsers(q: string) {
    setSearch(q);
    if (q.length < 3) return setCandidates([]);
    const { data } = await supabase.from("profiles").select("user_id, display_name, headline").ilike("display_name", `%${q}%`).limit(5);
    setCandidates(data || []);
  }

  async function assignLead(userId: string) {
    if (!selectedChapter) return;
    const { error } = await supabase.from("chapter_members").upsert({ chapter_id: selectedChapter, user_id: userId, role: "lead" });
    if (error) return toast.error(error.message);
    toast.success("Lead assigned");
    setSearch("");
    setCandidates([]);
    setSelectedChapter(null);
    load();
  }

  async function removeLead(chapterId: string, userId: string) {
    const { error } = await supabase.from("chapter_members").delete().eq("chapter_id", chapterId).eq("user_id", userId).eq("role", "lead");
    if (error) return toast.error(error.message);
    toast.success("Lead removed");
    load();
  }

  if (busy) return <p className="text-muted-foreground">Loading chapters...</p>;

  return (
    <div className="space-y-6">
      {chapters.map((c) => {
        const leads = c.chapter_members?.filter((m: any) => m.role === "lead") || [];
        return (
          <div key={c.id} className="rounded-3xl border border-border bg-card p-6">
            <h3 className="font-display text-lg font-semibold">{c.name}</h3>
            <div className="mt-4 space-y-2">
              {leads.length > 0 ? leads.map((l: any) => (
                <div key={l.user_id} className="flex justify-between items-center text-sm border p-3 rounded-xl">
                  <span>{l.profiles?.display_name || "Unknown"} (Lead)</span>
                  <Button variant="outline" size="sm" onClick={() => removeLead(c.id, l.user_id)}>Remove</Button>
                </div>
              )) : <p className="text-sm text-muted-foreground">No leads assigned.</p>}
            </div>
            
            {selectedChapter === c.id ? (
              <div className="mt-4 border-t pt-4">
                <Input placeholder="Search member to assign..." value={search} onChange={(e) => searchUsers(e.target.value)} />
                <div className="mt-2 space-y-1">
                  {candidates.map(cand => (
                    <div key={cand.user_id} className="flex justify-between items-center text-sm p-2 bg-muted/30 rounded">
                      <span>{cand.display_name}</span>
                      <Button size="sm" onClick={() => assignLead(cand.user_id)}>Assign Lead</Button>
                    </div>
                  ))}
                </div>
                <Button variant="ghost" size="sm" className="mt-2" onClick={() => { setSelectedChapter(null); setSearch(""); setCandidates([]); }}>Cancel</Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setSelectedChapter(c.id)}>+ Assign Lead</Button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MissionLeadsManager() {
  const [missions, setMissions] = useState<any[]>([]);
  const [busy, setBusy] = useState(true);
  const [search, setSearch] = useState("");
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selectedMission, setSelectedMission] = useState<string | null>(null);

  async function load() {
    setBusy(true);
    const { data } = await supabase.from("missions").select("*, mission_members(user_id, role, profiles(display_name))").order("title");
    setMissions(data || []);
    setBusy(false);
  }

  useEffect(() => { load(); }, []);

  async function searchUsers(q: string) {
    setSearch(q);
    if (q.length < 3) return setCandidates([]);
    const { data } = await supabase.from("profiles").select("user_id, display_name, headline").ilike("display_name", `%${q}%`).limit(5);
    setCandidates(data || []);
  }

  async function assignLead(userId: string) {
    if (!selectedMission) return;
    const { error } = await supabase.from("mission_members").upsert({ mission_id: selectedMission, user_id: userId, role: "lead" });
    if (error) return toast.error(error.message);
    toast.success("Lead assigned");
    setSearch("");
    setCandidates([]);
    setSelectedMission(null);
    load();
  }

  async function removeLead(missionId: string, userId: string) {
    const { error } = await supabase.from("mission_members").delete().eq("mission_id", missionId).eq("user_id", userId).eq("role", "lead");
    if (error) return toast.error(error.message);
    toast.success("Lead removed");
    load();
  }

  if (busy) return <p className="text-muted-foreground">Loading missions...</p>;

  return (
    <div className="space-y-6">
      {missions.map((m) => {
        const leads = m.mission_members?.filter((mem: any) => mem.role === "lead") || [];
        return (
          <div key={m.id} className="rounded-3xl border border-border bg-card p-6">
            <h3 className="font-display text-lg font-semibold">{m.title}</h3>
            <div className="mt-4 space-y-2">
              {leads.length > 0 ? leads.map((l: any) => (
                <div key={l.user_id} className="flex justify-between items-center text-sm border p-3 rounded-xl">
                  <span>{l.profiles?.display_name || "Unknown"} (Lead)</span>
                  <Button variant="outline" size="sm" onClick={() => removeLead(m.id, l.user_id)}>Remove</Button>
                </div>
              )) : <p className="text-sm text-muted-foreground">No leads assigned.</p>}
            </div>
            
            {selectedMission === m.id ? (
              <div className="mt-4 border-t pt-4">
                <Input placeholder="Search member to assign..." value={search} onChange={(e) => searchUsers(e.target.value)} />
                <div className="mt-2 space-y-1">
                  {candidates.map(cand => (
                    <div key={cand.user_id} className="flex justify-between items-center text-sm p-2 bg-muted/30 rounded">
                      <span>{cand.display_name}</span>
                      <Button size="sm" onClick={() => assignLead(cand.user_id)}>Assign Lead</Button>
                    </div>
                  ))}
                </div>
                <Button variant="ghost" size="sm" className="mt-2" onClick={() => { setSelectedMission(null); setSearch(""); setCandidates([]); }}>Cancel</Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setSelectedMission(m.id)}>+ Assign Lead</Button>
            )}
          </div>
        );
      })}
    </div>
  );
}

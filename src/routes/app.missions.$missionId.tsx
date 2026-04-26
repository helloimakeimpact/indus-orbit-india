import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Globe2, ArrowLeft, Send } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getMission, postMissionUpdate } from "@/server/mission.functions";

export const Route = createFileRoute("/app/missions/$missionId")({
  component: MissionDetailPage,
});

function MissionDetailPage() {
  console.log('Rendering MissionDetailPage!');
  const { missionId } = Route.useParams();
  const { user } = useAuth();
  const [mission, setMission] = useState<any>(null);
  const [busy, setBusy] = useState(true);
  const [updateText, setUpdateText] = useState("");
  const [posting, setPosting] = useState(false);

  async function load() {
    try {
      const data = await getMission(missionId);
      setMission(data);
    } catch (err: any) {
      toast.error("Failed to load mission");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, [missionId]);

  async function handlePostUpdate() {
    if (!updateText.trim()) return;
    setPosting(true);
    try {
      await postMissionUpdate({ data: { missionId, content: updateText } });
      setUpdateText("");
      toast.success("Update posted");
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setPosting(false);
    }
  }

  if (busy) return <p className="mt-8 text-muted-foreground px-4">Loading mission workspace…</p>;
  if (!mission) return <p className="mt-8 text-muted-foreground px-4">Mission not found.</p>;

  const hasJoined = mission.mission_members?.some((mm: any) => mm.user_id === user?.id);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <Link to="/app/missions" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Missions
      </Link>

      <div className="rounded-3xl border border-border bg-card overflow-hidden">
        <div className="bg-[var(--indigo-night)] p-8 text-[var(--parchment)] relative overflow-hidden">
          <div className="absolute -right-10 -top-10 opacity-10">
            <Globe2 className="h-48 w-48" />
          </div>
          <div className="relative z-10">
            <div className="flex justify-between items-start">
              <Badge className="bg-[var(--saffron)] text-[var(--indigo-night)] uppercase tracking-widest text-[10px]">
                {mission.theme}
              </Badge>
              <Badge variant="outline" className="border-[var(--parchment)]/20 text-[var(--parchment)]">
                {mission.status.toUpperCase()}
              </Badge>
            </div>
            <h1 className="mt-4 font-display text-3xl font-semibold md:text-4xl max-w-2xl">{mission.title}</h1>
            <p className="mt-4 text-[var(--parchment)]/80 max-w-3xl leading-relaxed">{mission.description}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-medium">Workspace Updates</h2>
          </div>

          {!hasJoined ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center bg-muted/20">
              <p className="text-muted-foreground">You must join this mission to view or post updates.</p>
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-border bg-card p-4">
                <Textarea 
                  placeholder="Post an update to the mission members..." 
                  className="resize-none border-0 focus-visible:ring-0 bg-transparent p-2 text-base"
                  rows={3}
                  value={updateText}
                  onChange={(e) => setUpdateText(e.target.value)}
                />
                <div className="mt-2 flex justify-end pt-2 border-t border-border/50">
                  <Button 
                    onClick={handlePostUpdate} 
                    disabled={posting || !updateText.trim()}
                    className="bg-[var(--indigo-night)] text-[var(--parchment)] hover:bg-[var(--indigo-night)]/90"
                  >
                    {posting ? "Posting..." : <><Send className="mr-2 h-4 w-4" /> Post Update</>}
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {mission.mission_updates?.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No updates posted yet. Be the first!</p>
                ) : (
                  mission.mission_updates?.map((u: any) => (
                    <div key={u.id} className="rounded-2xl border border-border bg-card p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={u.profiles?.avatar_url} />
                          <AvatarFallback>{u.profiles?.display_name?.substring(0, 2) || "U"}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{u.profiles?.display_name || "Member"}</p>
                          <p className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{u.content}</p>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-border bg-card p-6">
            <h3 className="font-display text-lg font-medium mb-4">Mission Roster</h3>
            <p className="text-2xl font-bold mb-6">{mission.mission_members?.length || 0} Members</p>
            
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {mission.mission_members?.map((m: any) => (
                <div key={m.user_id} className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={m.profiles?.avatar_url} />
                    <AvatarFallback>{m.profiles?.display_name?.substring(0, 2) || "U"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-medium truncate">{m.profiles?.display_name || "Member"}</p>
                    <p className="text-xs text-muted-foreground capitalize">{m.role} • {m.profiles?.orbit_segment}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

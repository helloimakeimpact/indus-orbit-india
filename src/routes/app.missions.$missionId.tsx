import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Globe2, ArrowLeft, Send, Pin, Calendar, BookOpen, MoreVertical, Trash } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { getMission, postMissionUpdate, pinMissionUpdate, removeMissionMember, updateMissionStatus } from "@/server/mission.functions";

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
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);

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

  const userMemberRecord = mission.mission_members?.find((mm: any) => mm.user_id === user?.id);
  const hasJoined = !!userMemberRecord;
  const isLead = userMemberRecord?.role === 'lead';

  async function handleTogglePin(updateId: string, currentPinStatus: boolean) {
    try {
      await pinMissionUpdate(updateId, !currentPinStatus);
      toast.success(currentPinStatus ? "Update unpinned" : "Update pinned to top");
      load();
    } catch (err: any) {
      toast.error("Failed to pin update");
    }
  }

  async function handleRemoveMember() {
    if (!memberToRemove) return;
    try {
      await removeMissionMember({ data: { missionId, targetUserId: memberToRemove.id } });
      toast.success("Member removed");
      setMemberToRemove(null);
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleStatusChange(status: "open" | "completed" | "archived") {
    try {
      await updateMissionStatus({ data: { missionId, status } });
      toast.success("Status updated");
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8">
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
              {isLead ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="bg-[var(--parchment)]/10 border-[var(--parchment)]/20 text-[var(--parchment)] hover:bg-[var(--parchment)]/20">
                      {mission.status.toUpperCase()} <MoreVertical className="h-3 w-3 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleStatusChange('open')}>Open</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleStatusChange('completed')}>Completed</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleStatusChange('archived')}>Archived</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Badge variant="outline" className="border-[var(--parchment)]/20 text-[var(--parchment)]">
                  {mission.status.toUpperCase()}
                </Badge>
              )}
            </div>
            <h1 className="mt-4 font-display text-3xl font-semibold md:text-4xl max-w-2xl">{mission.title}</h1>
            <p className="mt-4 text-[var(--parchment)]/80 max-w-3xl leading-relaxed">{mission.description}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <Tabs defaultValue="feed" className="w-full">
            <TabsList className="bg-transparent border-b border-border w-full justify-start rounded-none p-0 h-auto">
              <TabsTrigger value="feed" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[var(--saffron)] rounded-none px-6 py-3 font-medium">
                Workspace Feed
              </TabsTrigger>
              <TabsTrigger value="events" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[var(--saffron)] rounded-none px-6 py-3 font-medium">
                Events ({mission.events?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="stories" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[var(--saffron)] rounded-none px-6 py-3 font-medium">
                Stories ({mission.stories?.length || 0})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="feed" className="pt-6 space-y-6 outline-none">
              {!hasJoined ? (
                <div className="rounded-2xl border border-dashed border-border p-8 text-center bg-muted/20">
                  <p className="text-muted-foreground">You must join this mission to view or post updates.</p>
                </div>
              ) : (
                <>
                  <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
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
                        className="bg-[var(--indigo-night)] text-[var(--parchment)] hover:bg-[var(--indigo-night)]/90 rounded-full"
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
                        <div key={u.id} className={`rounded-2xl border bg-card p-5 transition ${u.is_pinned ? 'border-[var(--saffron)] shadow-sm' : 'border-border'}`}>
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 border border-border/50">
                                <AvatarImage src={u.profiles?.avatar_url} />
                                <AvatarFallback>{u.profiles?.display_name?.substring(0, 2) || "U"}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold">{u.profiles?.display_name || "Member"}</p>
                                  {u.is_pinned && (
                                    <Badge variant="secondary" className="text-[10px] bg-[var(--saffron)]/10 text-[var(--saffron)] hover:bg-[var(--saffron)]/20 px-1.5 py-0">
                                      <Pin className="h-3 w-3 mr-1 inline" /> Pinned
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleString()}</p>
                              </div>
                            </div>
                            
                            {isLead && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleTogglePin(u.id, u.is_pinned)}>
                                    <Pin className="mr-2 h-4 w-4" /> {u.is_pinned ? "Unpin Update" : "Pin to Top"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-red-600">
                                    <Trash className="mr-2 h-4 w-4" /> Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                          <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90">{u.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="events" className="pt-6 outline-none">
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium text-lg">Mission Events</h3>
                  {isLead && (
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/app/events">Create Event</Link>
                    </Button>
                  )}
                </div>
                {mission.events?.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
                    No events scheduled for this mission yet.
                  </div>
                ) : (
                  mission.events?.map((evt: any) => (
                    <div key={evt.id} className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <Calendar className="h-6 w-6 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-lg"><Link to={`/app/events/${evt.id}`} className="hover:underline">{evt.title}</Link></h4>
                        <p className="text-sm text-muted-foreground capitalize">{new Date(evt.start_time).toLocaleDateString()} • {evt.location_type}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="stories" className="pt-6 outline-none">
              <div className="space-y-4">
                <h3 className="font-medium text-lg mb-4">Mission Stories & Reports</h3>
                {mission.stories?.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
                    No stories published under this mission yet.
                  </div>
                ) : (
                  mission.stories?.map((story: any) => (
                    <div key={story.id} className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                        <BookOpen className="h-6 w-6 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-lg"><Link to={`/app/stories/${story.id}`} className="hover:underline">{story.title}</Link></h4>
                        <p className="text-sm text-muted-foreground capitalize">Status: {story.status} {story.published_at && `• ${new Date(story.published_at).toLocaleDateString()}`}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-border bg-card p-6">
            <h3 className="font-display text-lg font-medium mb-4">Mission Roster</h3>
            <p className="text-2xl font-bold mb-6">{mission.mission_members?.length || 0} Members</p>
            
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {mission.mission_members?.map((m: any) => (
                <div key={m.user_id} className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={m.profiles?.avatar_url} />
                    <AvatarFallback>{m.profiles?.display_name?.substring(0, 2) || "U"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{m.profiles?.display_name || "Member"}</p>
                      {m.role === 'lead' && (
                        <Badge className="bg-[var(--indigo-night)] text-[var(--parchment)] text-[9px] uppercase px-1.5 py-0 h-4">
                          Lead
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground capitalize">
                      {m.role !== 'lead' && `${m.role} • `}{m.profiles?.orbit_segment}
                    </p>
                  </div>
                  {isLead && m.role !== 'lead' && (
                     <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-red-600"
                        onClick={() => setMemberToRemove({ id: m.user_id, name: m.profiles?.display_name || "Member" })}
                     >
                       <Trash className="h-4 w-4" />
                     </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
          </DialogHeader>
          <p className="py-4 text-sm text-muted-foreground">
            Are you sure you want to remove <span className="font-semibold text-foreground">{memberToRemove?.name}</span> from this mission?
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

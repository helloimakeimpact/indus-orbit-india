import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users, Target, Trash2, Search } from "lucide-react";
import { getMyAdminMissions } from "@/server/society.functions";
import { removeMissionMember } from "@/server/mission.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { VerifiedBadge } from "@/components/auth/VerifiedBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/app/mission-admin")({
  head: () => ({ meta: [{ title: "Mission Admin — Indus Orbit" }, { name: "robots", content: "noindex" }] }),
  component: MissionAdminPage,
});

function MissionAdminPage() {
  const [missions, setMissions] = useState<any[]>([]);
  const [busy, setBusy] = useState(true);
  const [search, setSearch] = useState("");
  const [memberToRemove, setMemberToRemove] = useState<{ missionId: string; userId: string; name: string } | null>(null);
  const navigate = useNavigate();

  useEffect(() => { load(); }, []);

  async function load() {
    setBusy(true);
    try {
      const data = await getMyAdminMissions();
      setMissions(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load missions");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    if (!memberToRemove) return;
    try {
      await removeMissionMember({ data: { missionId: memberToRemove.missionId, targetUserId: memberToRemove.userId } });
      toast.success(`${memberToRemove.name} removed from mission.`);
      setMemberToRemove(null);
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  if (busy) return <p className="mt-8 px-4 text-muted-foreground">Loading mission dashboard…</p>;

  if (missions.length === 0) {
    return (
      <div className="mx-auto w-full max-w-7xl text-center py-24">
        <Target className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
        <h1 className="font-display text-3xl font-medium mb-2">No Missions Found</h1>
        <p className="text-muted-foreground mb-8">You are not currently a lead for any missions.</p>
        <Button variant="outline" onClick={() => navigate({ to: "/app/missions" })}>Browse Missions</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-12 pb-16">
      <div>
        <h1 className="font-display text-4xl font-semibold leading-tight text-[var(--indigo-night)]">
          Mission Administration
        </h1>
        <p className="mt-2 text-foreground/70">
          Manage members of the missions you lead.
        </p>
      </div>

      {missions.map((mission) => {
        const members = mission.mission_members || [];
        const filtered = members.filter((m: any) =>
          m.profiles?.display_name?.toLowerCase().includes(search.toLowerCase())
        );

        return (
          <section key={mission.id} className="space-y-6">
            <div className="flex items-end justify-between border-b border-border pb-4">
              <div>
                <h2 className="font-display text-2xl font-medium text-[var(--indigo-night)] flex items-center gap-3">
                  {mission.title}
                  <Badge variant="secondary" className="text-xs uppercase tracking-wider">{members.length} members</Badge>
                </h2>
                <p className="text-sm text-muted-foreground mt-1">{mission.theme}</p>
              </div>
              <Link to="/app/missions/$missionId" params={{ missionId: mission.id }}>
                <Button variant="outline" size="sm">Open mission →</Button>
              </Link>
            </div>

            <div className="rounded-3xl border border-border bg-card p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h3 className="font-display text-lg font-medium flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" /> Roster
                </h3>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search members..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-muted/50" />
                </div>
              </div>

              <div className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <p className="py-8 text-center text-muted-foreground">No members found.</p>
                ) : (
                  filtered.map((m: any) => (
                    <div key={m.user_id} className="flex items-center justify-between py-4 group">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--indigo-night)] text-sm font-semibold text-[var(--parchment)]">
                          {(m.profiles?.display_name ?? "?").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <Link to="/profile/$id" params={{ id: m.user_id }} className="font-semibold hover:text-[var(--indigo-night)] transition">
                              {m.profiles?.display_name || "Unknown"}
                            </Link>
                            {m.profiles?.is_verified && <VerifiedBadge />}
                            {m.role === "lead" && <Badge className="bg-[var(--saffron)] text-[var(--indigo-night)] border-none text-[10px] uppercase tracking-wider py-0 h-4">Lead</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1">{m.profiles?.headline || "No headline"}</p>
                        </div>
                      </div>
                      {m.role !== "lead" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive/10"
                          onClick={() => setMemberToRemove({ missionId: mission.id, userId: m.user_id, name: m.profiles?.display_name || "Unknown" })}
                          title="Remove from mission"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        );
      })}

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
            <Button variant="destructive" onClick={handleRemove}>Remove Member</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

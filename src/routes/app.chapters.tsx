import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MapPin, Users, Crown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getChapters, joinChapter } from "@/server/society.functions";

export const Route = createFileRoute("/app/chapters")({
  head: () => ({ meta: [{ title: "Chapters — Indus Orbit" }, { name: "robots", content: "noindex" }] }),
  component: ChaptersPage,
});

function ChaptersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [chapters, setChapters] = useState<any[]>([]);
  const [busy, setBusy] = useState(true);

  async function load() {
    try {
      const data = await getChapters();
      setChapters(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleJoin(chapterId: string) {
    if (!user) return toast.error("Please log in to join.");
    try {
      await joinChapter({ data: { chapterId } });
      toast.success("Joined chapter!");
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  if (busy) return <p className="mt-8 text-muted-foreground px-4">Loading chapters…</p>;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--saffron)]">Society</p>
          <h1 className="mt-2 font-display text-3xl font-medium md:text-4xl">Local Chapters</h1>
          <p className="mt-2 max-w-2xl text-sm text-foreground/70">
            Connect with Indus Orbit members in your region. Local chapters organize IRL events and build tight-knit networks.
          </p>
        </div>
        
        {chapters.some(c => c.chapter_members?.some((m: any) => m.user_id === user?.id && m.role === 'lead')) && (
          <Button
            variant="outline"
            className="border-[var(--indigo-night)] text-[var(--indigo-night)]"
            onClick={() => navigate({ to: '/app/chapter-admin' })}
          >
            Manage Chapters
          </Button>
        )}
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {chapters.length === 0 ? (
          <div className="col-span-full rounded-3xl border border-dashed border-border p-12 text-center text-muted-foreground">
            <MapPin className="mx-auto h-8 w-8 opacity-50" />
            <p className="mt-4 font-medium text-foreground">No chapters have been launched yet.</p>
          </div>
        ) : (
          chapters.map((c) => {
            const hasJoined = c.chapter_members?.some((m: any) => m.user_id === user?.id);
            const memberCount = c.chapter_members?.length || 0;
            const leads = c.chapter_members?.filter((m: any) => m.role === 'lead') || [];

            return (
              <div key={c.id} className="rounded-3xl border border-border bg-card p-6 flex flex-col">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-display text-2xl font-semibold">{c.name}</h2>
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {[c.city, c.country].filter(Boolean).join(", ")}
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-relaxed flex-1">{c.description}</p>

                <div className="mt-6 border-t border-border pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-1.5 text-sm font-medium">
                      <Users className="h-4 w-4 text-[var(--indigo-night)]" />
                      {memberCount} Members
                    </div>
                    {hasJoined ? (
                      <Badge variant="secondary">Joined</Badge>
                    ) : (
                      <Button size="sm" onClick={() => handleJoin(c.id)}>Join Chapter</Button>
                    )}
                  </div>

                  {leads.length > 0 && (
                    <div className="flex flex-wrap gap-2 items-center text-xs">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Crown className="h-3 w-3" /> Leads:
                      </span>
                      {leads.map((l: any) => (
                        <Badge key={l.user_id} variant="outline" className="font-normal">
                          {l.profiles?.display_name || 'Member'}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

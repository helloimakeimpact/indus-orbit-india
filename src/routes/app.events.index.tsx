import { createFileRoute, Link } from "@tanstack/react-router";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarDays, MapPin, Video, Plus, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatEventLocation,
  formatLocationTypeLabel,
  getEventLocationFieldCopy,
} from "@/lib/location";
import { submitEvent, getApprovedEvents, getChapters } from "@/server/society.functions";

export const Route = createFileRoute("/app/events/")({
  head: () => ({
    meta: [{ title: "Events — Indus Orbit" }, { name: "robots", content: "noindex" }],
  }),
  component: EventsPage,
});

function EventsPage() {
  const { user } = useAuth();
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [busy, setBusy] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [timeFilter, setTimeFilter] = useState<"upcoming" | "past">("upcoming");
  const [locationFilter, setLocationFilter] = useState<"all" | "virtual" | "irl">("all");

  async function load() {
    try {
      const data = await getApprovedEvents();
      setAllEvents(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Client-side filter
  const filtered = allEvents
    .filter((e) => {
      const isPast = new Date(e.end_time ?? e.start_time) < new Date();
      if (timeFilter === "upcoming" && isPast) return false;
      if (timeFilter === "past" && !isPast) return false;

      if (locationFilter !== "all" && e.location_type !== locationFilter) return false;

      return true;
    })
    .sort((a, b) => {
      const aTime = new Date(a.start_time).getTime();
      const bTime = new Date(b.start_time).getTime();
      return timeFilter === "past" ? bTime - aTime : aTime - bTime;
    });

  const PAGE_SIZE = 12;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [timeFilter, locationFilter]);

  return (
    <div className="mx-auto w-full max-w-none">
      <div className="app-glass app-workspace-head rounded-2xl">
        <div className="app-workspace-head-main">
          <div className="app-workspace-title">
            <p className="app-workspace-kicker">🗓️ Society</p>
            <h1>Events Board</h1>
            <p>Talks, hackathons, and salons submitted by members and verified by the community.</p>
          </div>
          <div className="flex items-start justify-start gap-2 lg:justify-end">
            {user && (
              <Button onClick={() => setCreateOpen(true)} size="sm" className="h-8 rounded-full">
                <Plus className="mr-2 h-4 w-4" /> Submit Event
              </Button>
            )}
          </div>
        </div>

        <div className="app-workspace-controls app-workspace-controls-single">
          <div className="app-filter-row">
            <button
              type="button"
              onClick={() => setTimeFilter("upcoming")}
              className="app-chip"
              data-active={timeFilter === "upcoming"}
            >
              Upcoming
            </button>
            <button
              type="button"
              onClick={() => setTimeFilter("past")}
              className="app-chip"
              data-active={timeFilter === "past"}
            >
              Past
            </button>
            {["all", "virtual", "irl"].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setLocationFilter(type as "all" | "virtual" | "irl")}
                className="app-chip"
                data-active={locationFilter === type}
              >
                {type === "all" ? "All locations" : type === "virtual" ? "Virtual" : "In-person"}
              </button>
            ))}
          </div>
          {!busy && filtered.length > 0 && (
            <p className="app-result-line">
              Showing {visible.length} of {filtered.length} event{filtered.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>

      {busy ? (
        <p className="mt-8 text-muted-foreground px-4">Loading events…</p>
      ) : (
        <div className="mt-3 space-y-3">
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-5 text-center text-muted-foreground">
              <CalendarDays className="mx-auto h-8 w-8 opacity-50" />
              <p className="mt-4 font-medium text-foreground">
                No {timeFilter} events match your filters.
              </p>
            </div>
          ) : (
            visible.map((e) => {
              const start = new Date(e.start_time);
              const isVirtual = e.location_type === "virtual";
              return (
                <Link key={e.id} to="/app/events/$id" params={{ id: e.id }} className="block">
                  <article className="rounded-2xl border border-border bg-card p-4 md:flex items-start gap-4 hover:border-[var(--indigo-night)]/30 transition group">
                    <div className="flex-shrink-0 flex flex-col items-center justify-center bg-muted/40 rounded-xl h-20 w-20 md:h-24 md:w-24 border border-border/50 mb-4 md:mb-0">
                      <span className="text-xs font-bold uppercase text-[var(--saffron)] tracking-widest">
                        {start.toLocaleString("default", { month: "short" })}
                      </span>
                      <span className="text-2xl font-display font-medium text-[var(--indigo-night)] leading-none mt-1">
                        {start.getDate()}
                      </span>
                    </div>

                    <div className="flex-1">
                      <div className="flex flex-wrap gap-2 mb-2">
                        {e.chapters?.name && <Badge variant="outline">{e.chapters.name}</Badge>}
                        <Badge
                          variant={isVirtual ? "secondary" : "default"}
                          className="flex items-center gap-1"
                        >
                          {isVirtual ? (
                            <Video className="h-3 w-3" />
                          ) : (
                            <MapPin className="h-3 w-3" />
                          )}
                          {formatLocationTypeLabel(e.location_type)}
                        </Badge>
                      </div>

                      <h3 className="font-display text-xl font-semibold group-hover:text-[var(--indigo-night)] transition">
                        {e.title}
                      </h3>
                      <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap line-clamp-2">
                        {e.description}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <CalendarDays className="h-4 w-4" />
                          {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span className="flex items-center gap-1.5">
                          {isVirtual ? (
                            <Video className="h-4 w-4" />
                          ) : (
                            <MapPin className="h-4 w-4" />
                          )}
                          {formatEventLocation(e)}
                        </span>
                        <span className="flex items-center gap-1.5 opacity-70">
                          Organized by {e.profiles?.display_name || "Member"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 md:mt-0 flex-shrink-0">
                      <Button
                        variant="outline"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        View details
                      </Button>
                    </div>
                  </article>
                </Link>
              );
            })
          )}
        </div>
      )}

      {/* Load More */}
      {hasMore && !busy && (
        <div className="mt-8 flex justify-center">
          <Button
            variant="outline"
            onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
            className="rounded-full px-8"
          >
            Load More ({filtered.length - visibleCount} remaining)
          </Button>
        </div>
      )}

      {createOpen && <SubmitEventDialog onClose={() => setCreateOpen(false)} onSubmitted={load} />}
    </div>
  );
}

function SubmitEventDialog({
  onClose,
  onSubmitted,
}: {
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [form, setForm] = useState<{
    title: string;
    description: string;
    startTime: string;
    endTime: string;
    locationType: "virtual" | "irl";
    location: string;
    link: string;
    chapterId: string;
  }>({
    title: "",
    description: "",
    startTime: "",
    endTime: "",
    locationType: "virtual",
    location: "",
    link: "",
    chapterId: "",
  });
  const [chapters, setChapters] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const locationCopy = getEventLocationFieldCopy(form.locationType);

  useEffect(() => {
    getChapters().then(setChapters);
  }, []);

  async function submit() {
    if (form.locationType === "irl" && !form.location.trim()) {
      toast.error("Add a venue or address for in-person events.");
      return;
    }
    if (form.locationType === "virtual" && !form.location.trim() && !form.link.trim()) {
      toast.error("Add an online location or join link for virtual events.");
      return;
    }

    setBusy(true);
    try {
      await submitEvent({
        data: {
          ...form,
          chapterId: form.chapterId || undefined,
          location: form.location || undefined,
          link: form.link || undefined,
        },
      });
      toast.success("Event submitted for approval!");
      onSubmitted();
      onClose();
    } catch (err: any) {
      toast.error(err.message);
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Submit Event</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">Title</label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Start Time</label>
            <Input
              type="datetime-local"
              value={form.startTime}
              onChange={(e) => setForm({ ...form, startTime: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">End Time</label>
            <Input
              type="datetime-local"
              value={form.endTime}
              onChange={(e) => setForm({ ...form, endTime: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Event format</label>
            <Select
              value={form.locationType}
              onValueChange={(v: "virtual" | "irl") => setForm({ ...form, locationType: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="virtual">Virtual</SelectItem>
                <SelectItem value="irl">In-person (IRL)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{locationCopy.label}</label>
            <Input
              placeholder={locationCopy.placeholder}
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
            <p className="text-xs leading-5 text-muted-foreground">{locationCopy.helper}</p>
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">Registration / join link (optional)</label>
            <Input
              type="url"
              placeholder="https://..."
              value={form.link}
              onChange={(e) => setForm({ ...form, link: e.target.value })}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">Chapter (optional)</label>
            <Select
              value={form.chapterId || "__none__"}
              onValueChange={(v) => setForm({ ...form, chapterId: v === "__none__" ? "" : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {chapters.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={busy || !form.title || !form.startTime || !form.endTime}
          >
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

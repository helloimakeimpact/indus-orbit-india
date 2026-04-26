import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Share2, CalendarDays, MapPin, Video, Users, Clock, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/app/events/$id")({
  component: EventDetailPage,
});

function EventDetailPage() {
  const { id } = Route.useParams();
  const [event, setEvent] = useState<any>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("events")
        .select("*, chapters(name), profiles!events_organizer_id_fkey(display_name, headline)")
        .eq("id", id)
        .single();
        
      if (error) {
        toast.error("Event not found");
      } else {
        setEvent(data);
      }
      setBusy(false);
    }
    load();
  }, [id]);

  if (busy) return <p className="mt-8 px-4 text-muted-foreground">Loading event…</p>;
  if (!event) return <p className="mt-8 px-4 text-muted-foreground">Event not found or you do not have access.</p>;

  const start = new Date(event.start_time);
  const end = new Date(event.end_time);

  return (
    <div className="mx-auto max-w-4xl pb-16">
      <Link to="/app/events" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-[var(--indigo-night)] mb-8 transition">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Events
      </Link>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="flex flex-wrap gap-2">
            {event.chapters?.name && <Badge variant="outline">{event.chapters.name}</Badge>}
            <Badge variant={event.location_type === 'virtual' ? 'secondary' : 'default'} className="flex items-center gap-1">
              {event.location_type === 'virtual' ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
              {event.location_type.toUpperCase()}
            </Badge>
          </div>
          
          <h1 className="font-display text-4xl md:text-5xl font-semibold leading-tight text-[var(--indigo-night)]">
            {event.title}
          </h1>

          <div className="flex items-center gap-3 py-4 border-y border-border">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--indigo-night)] text-sm font-semibold text-[var(--parchment)]">
              {(event.profiles?.display_name ?? "?").charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Organized by</span>
              <span className="text-sm font-semibold text-foreground">{event.profiles?.display_name || 'Member'}</span>
            </div>
          </div>

          <div className="prose prose-base md:prose-lg prose-p:leading-relaxed max-w-none text-foreground/90 whitespace-pre-wrap mt-8">
            {event.description}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 space-y-6">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <CalendarDays className="h-4 w-4" /> Date & Time
              </h3>
              <p className="font-semibold">{start.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" /> 
                {start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {end.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </p>
            </div>

            <div className="border-t border-border pt-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Location
              </h3>
              <p className="font-medium">{event.location || (event.location_type === 'virtual' ? 'Virtual Event' : 'TBD')}</p>
            </div>

            <div className="border-t border-border pt-6 space-y-3">
              {event.link ? (
                <Button className="w-full" asChild>
                  <a href={event.link} target="_blank" rel="noreferrer">
                    RSVP / Join Link <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              ) : (
                <Button className="w-full" disabled>
                  No link provided
                </Button>
              )}
              <Button variant="outline" className="w-full" onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success("Event link copied to clipboard");
              }}>
                <Share2 className="mr-2 h-4 w-4" /> Share Event
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

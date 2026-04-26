import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/app/stories/$id")({
  component: StoryDetailPage,
});

function StoryDetailPage() {
  const { id } = Route.useParams();
  const [story, setStory] = useState<any>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("stories")
        .select("*, profiles!stories_author_id_fkey(display_name, headline)")
        .eq("id", id)
        .single();
        
      if (error) {
        toast.error("Story not found");
      } else {
        setStory(data);
      }
      setBusy(false);
    }
    load();
  }, [id]);

  if (busy) return <p className="mt-8 px-4 text-muted-foreground">Loading story…</p>;
  if (!story) return <p className="mt-8 px-4 text-muted-foreground">Story not found or you do not have access.</p>;

  return (
    <div className="mx-auto max-w-3xl pb-16">
      <Link to="/app/stories" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-[var(--indigo-night)] mb-8 transition">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Stories
      </Link>

      <div className="space-y-6">
        {story.status === 'featured' && (
          <Badge className="bg-[var(--saffron)] text-[var(--indigo-night)] font-semibold border-none px-3 py-1 uppercase tracking-widest text-[10px]">
            Editor's Pick
          </Badge>
        )}
        
        <h1 className="font-display text-4xl md:text-5xl font-semibold leading-tight text-[var(--indigo-night)]">
          {story.title}
        </h1>

        <div className="flex items-center justify-between border-y border-border py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--indigo-night)] text-sm font-semibold text-[var(--parchment)]">
              {(story.profiles?.display_name ?? "?").charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-foreground">{story.profiles?.display_name || 'Member'}</span>
              <span className="text-xs text-muted-foreground">{story.profiles?.headline}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {story.published_at ? new Date(story.published_at).toLocaleDateString() : 'Draft'}
            </span>
            <Button variant="ghost" size="icon" onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              toast.success("Link copied to clipboard");
            }}>
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="prose prose-base md:prose-lg prose-p:leading-relaxed max-w-none text-foreground/90 whitespace-pre-wrap mt-8">
          {story.content}
        </div>
      </div>
    </div>
  );
}

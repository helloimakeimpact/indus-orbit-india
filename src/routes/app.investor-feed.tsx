import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from "react";
import { Send, Rocket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReachOutDialog } from "@/components/connect/ReachOutDialog";

export const Route = createFileRoute("/app/investor-feed")({
  head: () => ({ meta: [{ title: "Deal Flow — Indus Orbit" }, { name: "robots", content: "noindex" }] }),
  component: InvestorFeedPage,
});

type FounderSignal = {
  id: string;
  user_id: string;
  display_name: string;
  headline: string | null;
  city: string | null;
  country: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  segment_details: any;
};

function InvestorFeedPage() {
  const { user } = useAuth();
  const [founders, setFounders] = useState<FounderSignal[]>([]);
  const [busy, setBusy] = useState(true);
  const [reachOut, setReachOut] = useState<FounderSignal | null>(null);

  useEffect(() => {
    async function load() {
      // Find founders who are actively raising
      const { data } = await supabase
        .from("profiles")
        .select("id, user_id, display_name, headline, city, country, linkedin_url, website_url, segment_details")
        .eq("orbit_segment", "founder")
        .eq("is_verified", true)
        // using contains to filter jsonb
        .contains("segment_details", { fundraising: "actively_raising" })
        .order("created_at", { ascending: false });
        
      setFounders(data as FounderSignal[] ?? []);
      setBusy(false);
    }
    load();
  }, []);

  if (busy) return <p className="mt-8 text-muted-foreground px-4">Loading deal flow…</p>;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--saffron)]">Deal Flow</p>
          <h1 className="mt-2 font-display text-3xl font-medium md:text-4xl">Founders Actively Raising</h1>
          <p className="mt-2 max-w-2xl text-sm text-foreground/70">
            A curated feed of verified founders currently seeking capital. Reach out to express interest privately.
          </p>
        </div>
      </div>

      {founders.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-border p-12 text-center text-muted-foreground">
          <Rocket className="mx-auto h-8 w-8 opacity-50" />
          <p className="mt-4 font-medium text-foreground">No founders currently raising.</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {founders.map((f) => (
            <article key={f.id} className="rounded-3xl border border-border bg-card p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display text-lg font-semibold">{f.display_name}</h3>
                  <p className="text-sm text-muted-foreground">{f.headline}</p>
                </div>
                <Badge variant="default" className="bg-green-600">Raising</Badge>
              </div>
              
              <div className="mt-4 space-y-2 text-sm">
                {f.segment_details?.company && (
                  <p><span className="font-medium">Company:</span> {f.segment_details.company}</p>
                )}
                {f.segment_details?.stage && (
                  <p><span className="font-medium">Stage:</span> <span className="capitalize">{f.segment_details.stage}</span></p>
                )}
                {f.segment_details?.sector && (
                  <p><span className="font-medium">Sector:</span> {f.segment_details.sector}</p>
                )}
              </div>

              {(f.city || f.country) && (
                <p className="mt-4 text-xs uppercase tracking-wider text-muted-foreground">
                  {[f.city, f.country].filter(Boolean).join(" · ")}
                </p>
              )}

              <div className="mt-3 flex gap-3 text-sm">
                {f.linkedin_url && <a href={f.linkedin_url} target="_blank" rel="noreferrer" className="text-[var(--indigo-night)] hover:underline">LinkedIn</a>}
                {f.website_url && <a href={f.website_url} target="_blank" rel="noreferrer" className="text-[var(--indigo-night)] hover:underline">Website</a>}
              </div>

              {user && user.id !== f.user_id && (
                <div className="mt-5">
                  <Button size="sm" onClick={() => setReachOut(f)} className="w-full">
                    <Send className="mr-1 h-3.5 w-3.5" /> Express Interest
                  </Button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {reachOut && (
        <ReachOutDialog
          open={!!reachOut}
          onOpenChange={(o) => !o && setReachOut(null)}
          recipientId={reachOut.user_id}
          recipientName={reachOut.display_name}
          senderId={user?.id ?? null}
        />
      )}
    </div>
  );
}

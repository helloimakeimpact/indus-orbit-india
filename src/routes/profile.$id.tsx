import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MapPin, Globe, Linkedin, ArrowLeft, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/site/SiteShell";
import { Badge } from "@/components/ui/badge";
import { VerifiedBadge } from "@/components/auth/VerifiedBadge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { ReachOutDialog } from "@/components/connect/ReachOutDialog";

export const Route = createFileRoute("/profile/$id")({
  component: PublicProfilePage,
});

function PublicProfilePage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [busy, setBusy] = useState(true);
  const [reachOutOpen, setReachOutOpen] = useState(false);

  useEffect(() => {
    async function load() {
      // Find the user by user_id OR ID
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", id)
        .eq("is_public", true)
        .maybeSingle();
        
      setProfile(data);
      setBusy(false);
    }
    load();
  }, [id]);

  if (busy) {
    return (
      <SiteShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <p className="text-muted-foreground">Loading profile…</p>
        </div>
      </SiteShell>
    );
  }

  if (!profile) {
    return (
      <SiteShell>
        <div className="mx-auto max-w-3xl py-24 px-6 text-center">
          <h1 className="font-display text-4xl font-semibold mb-4">Profile Not Found</h1>
          <p className="text-muted-foreground mb-8">This member's profile is either private or does not exist.</p>
          <Button onClick={() => navigate({ to: '/members' })}>
            View Directory
          </Button>
        </div>
      </SiteShell>
    );
  }

  const initial = (profile.display_name ?? "?").charAt(0).toUpperCase();

  return (
    <SiteShell>
      <div className="mx-auto max-w-4xl py-12 px-6 lg:px-8">
        <Link to="/members" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-[var(--indigo-night)] mb-12 transition">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Directory
        </Link>

        <div className="grid md:grid-cols-3 gap-12">
          {/* Left Column: Core Info */}
          <div className="md:col-span-1 space-y-8">
            <div className="flex h-32 w-32 items-center justify-center rounded-3xl bg-[var(--indigo-night)] text-5xl font-display font-semibold text-[var(--parchment)] shadow-xl">
              {initial}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <h1 className="font-display text-3xl font-semibold leading-tight text-[var(--indigo-night)]">
                  {profile.display_name}
                </h1>
                {profile.is_verified && <VerifiedBadge />}
              </div>
              {profile.orbit_segment && (
                <Badge className="mb-4 uppercase tracking-wider text-[10px]">{profile.orbit_segment}</Badge>
              )}
              <p className="text-foreground/80 leading-relaxed font-medium">
                {profile.headline}
              </p>
            </div>

            <div className="space-y-4 pt-6 border-t border-border">
              {(profile.city || profile.country) && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <MapPin className="mr-3 h-4 w-4 text-[var(--indigo-night)]" />
                  {[profile.city, profile.country].filter(Boolean).join(", ")}
                </div>
              )}
              {profile.website_url && (
                <div className="flex items-center text-sm">
                  <Globe className="mr-3 h-4 w-4 text-[var(--indigo-night)]" />
                  <a href={profile.website_url} target="_blank" rel="noreferrer" className="text-foreground hover:underline">
                    Website
                  </a>
                </div>
              )}
              {profile.linkedin_url && (
                <div className="flex items-center text-sm">
                  <Linkedin className="mr-3 h-4 w-4 text-[#0A66C2]" />
                  <a href={profile.linkedin_url} target="_blank" rel="noreferrer" className="text-foreground hover:underline">
                    LinkedIn
                  </a>
                </div>
              )}
            </div>

            {user && user.id !== profile.user_id && (
              <div className="pt-6 border-t border-border">
                <Button className="w-full" onClick={() => setReachOutOpen(true)}>
                  <Send className="mr-2 h-4 w-4" /> Reach out
                </Button>
              </div>
            )}
            
            {!user && (
              <div className="pt-6 border-t border-border">
                <div className="rounded-xl bg-muted p-4 text-center text-sm text-muted-foreground">
                  <Link to="/auth" className="font-medium text-[var(--indigo-night)] underline underline-offset-4">Log in</Link> to connect with {profile.display_name}.
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Details */}
          <div className="md:col-span-2 space-y-8">
            <div className="rounded-3xl border border-border bg-card p-8">
              <h2 className="font-display text-2xl font-medium mb-6">About</h2>
              {profile.bio ? (
                <p className="prose prose-base text-foreground/90 whitespace-pre-wrap leading-relaxed">
                  {profile.bio}
                </p>
              ) : (
                <p className="text-muted-foreground italic">No biography provided.</p>
              )}
            </div>

            {profile.segment_details && Object.keys(profile.segment_details).length > 0 && (
              <div className="rounded-3xl border border-border bg-card p-8">
                <h2 className="font-display text-2xl font-medium mb-6">Segment Details</h2>
                <div className="grid gap-6 sm:grid-cols-2">
                  {Object.entries(profile.segment_details).map(([key, value]) => (
                    <div key={key}>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                        {key.replace(/_/g, " ")}
                      </p>
                      <p className="text-sm font-medium">
                        {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {reachOutOpen && user && (
        <ReachOutDialog
          open={reachOutOpen}
          onOpenChange={setReachOutOpen}
          recipientId={profile.user_id}
          recipientName={profile.display_name}
          senderId={user.id}
        />
      )}
    </SiteShell>
  );
}

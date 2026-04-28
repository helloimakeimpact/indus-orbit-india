import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MapPin, Globe, Linkedin, ArrowLeft, Send, ShieldCheck, Award, Orbit } from "lucide-react";
import QRCodeLib from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/site/SiteShell";
import { AppShell } from "@/components/app/AppShell";
import { Badge } from "@/components/ui/badge";
import { VerifiedBadge } from "@/components/auth/VerifiedBadge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { ReachOutDialog } from "@/components/connect/ReachOutDialog";
import { SEGMENT_META, type Segment } from "@/components/auth/segments";
import logo from "@/assets/indus-orbit-logo.png";

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
  const [certData, setCertData] = useState<{ totalChapters: number; totalMissions: number; isLead: boolean } | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");

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

      // If profile is verified, load certificate metrics
      if (data?.is_verified) {
        const profileUrl = typeof window !== 'undefined' 
          ? `${window.location.origin}/profile/${id}`
          : `https://indus-orbit-india.com/profile/${id}`;
        QRCodeLib.toDataURL(profileUrl, { margin: 2, scale: 4 }, (err: any, url: string) => {
          if (!err) setQrDataUrl(url);
        });

        const [chRes, msRes] = await Promise.all([
          supabase.from("chapter_members").select("role").eq("user_id", id),
          supabase.from("mission_members").select("role").eq("user_id", id)
        ]);
        const chapters = chRes.data || [];
        const missions = msRes.data || [];
        setCertData({
          totalChapters: chapters.length,
          totalMissions: missions.length,
          isLead: chapters.some((c: any) => c.role === "lead") || missions.some((m: any) => m.role === "lead")
        });
      }
    }
    load();
  }, [id]);

  const Shell = user ? AppShell : SiteShell;

  if (busy) {
    return (
      <Shell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <p className="text-muted-foreground">Loading profile…</p>
        </div>
      </Shell>
    );
  }

  if (!profile) {
    return (
      <Shell>
        <div className="mx-auto w-full max-w-7xl py-24 px-6 text-center">
          <h1 className="font-display text-4xl font-semibold mb-4">Profile Not Found</h1>
          <p className="text-muted-foreground mb-8">This member's profile is either private or does not exist.</p>
          <Button onClick={() => navigate({ to: '/members' })}>
            View Directory
          </Button>
        </div>
      </Shell>
    );
  }

  const initial = (profile.display_name ?? "?").charAt(0).toUpperCase();

  return (
    <Shell>
      <div className="mx-auto w-full max-w-7xl py-12 px-6 lg:px-8">
        <Link to={user ? "/app/directory" : "/members"} className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-[var(--indigo-night)] mb-12 transition">
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

            {/* Verification & Network CTA (Public View Only) */}
            {!user && (
              <div className="rounded-3xl border border-[var(--saffron)]/30 bg-gradient-to-br from-[var(--saffron)]/5 to-transparent p-8 mt-8">
                <div className="flex items-start gap-4">
                  <div className="rounded-full bg-[var(--saffron)]/20 p-3 mt-1">
                    <ShieldCheck className="h-6 w-6 text-[var(--saffron)]" />
                  </div>
                  <div>
                    <h2 className="font-display text-2xl font-medium mb-2">Verified Ecosystem Member</h2>
                    <p className="text-foreground/80 mb-6 leading-relaxed">
                      This profile is an officially verified node within the Indus Orbit intelligence layer. 
                      You have scanned a trusted certification. 
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <Button asChild className="bg-[var(--indigo-night)] text-[var(--parchment)] hover:bg-[var(--indigo-night)]/90">
                        <Link to="/auth">Join the Network</Link>
                      </Button>
                      <Button asChild variant="outline" className="border-[var(--indigo-night)] text-[var(--indigo-night)] hover:bg-[var(--indigo-night)]/5">
                        <Link to="/what-is-indus-orbit">What is Indus Orbit?</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Certificate Preview (Verified Profiles Only) */}
            {profile.is_verified && certData && (
              <div className="rounded-3xl overflow-hidden" style={{ backgroundColor: "#0e0a1f", color: "#fcfaf5", border: "1px solid rgba(255,255,255,0.15)" }}>
                <div className="relative p-8 overflow-hidden">
                  {/* Background orbits */}
                  <div className="absolute -right-16 -top-16 opacity-5 pointer-events-none text-white">
                    <Orbit className="h-64 w-64" />
                  </div>
                  <div className="absolute -left-16 -bottom-16 opacity-5 pointer-events-none text-white">
                    <Orbit className="h-64 w-64" />
                  </div>

                  <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="mb-6 flex items-center gap-3">
                      <img src={logo} alt="Indus Orbit" className="h-10 w-10" style={{ filter: "invert(1)" }} />
                      <h3 className="font-display text-2xl font-semibold" style={{ color: "#fcfaf5" }}>Indus Orbit</h3>
                    </div>

                    <div className="mb-6" style={{ color: "#f97316" }}>
                      <ShieldCheck className="mx-auto h-8 w-8 mb-2" />
                      <p className="text-xs font-semibold uppercase tracking-[0.25em]">Official Certification</p>
                    </div>

                    <p className="text-sm mb-1" style={{ color: "rgba(252,250,245,0.7)" }}>This is to certify that</p>
                    <h2 className="font-display text-3xl font-semibold mb-4">{profile.display_name}</h2>
                    <p className="text-sm font-light italic max-w-md mb-6" style={{ color: "rgba(252,250,245,0.85)" }}>
                      is recognized as a Verified {profile.orbit_segment ? SEGMENT_META[profile.orbit_segment as Segment]?.label : "Member"} within the Indus Orbit ecosystem.
                    </p>

                    {/* Metrics */}
                    <div className="flex gap-8 pt-4 mb-4 justify-center" style={{ borderTop: "1px solid rgba(255,255,255,0.15)" }}>
                      {certData.isLead && (
                        <div className="flex flex-col items-center">
                          <span className="text-lg font-bold" style={{ color: "#f97316" }}>Platform Lead</span>
                          <span className="text-[10px] uppercase tracking-wider mt-1" style={{ color: "rgba(252,250,245,0.5)" }}>Status</span>
                        </div>
                      )}
                      <div className="flex flex-col items-center">
                        <span className="text-lg font-bold">{certData.totalChapters}</span>
                        <span className="text-[10px] uppercase tracking-wider mt-1" style={{ color: "rgba(252,250,245,0.5)" }}>Chapters</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-lg font-bold">{certData.totalMissions}</span>
                        <span className="text-[10px] uppercase tracking-wider mt-1" style={{ color: "rgba(252,250,245,0.5)" }}>Missions</span>
                      </div>
                    </div>

                    {/* QR & ID footer */}
                    <div className="flex w-full justify-between items-end pt-4 px-2" style={{ borderTop: "1px solid rgba(255,255,255,0.15)" }}>
                      <div className="flex items-center gap-3 text-left">
                        {qrDataUrl && (
                          <div className="p-1 rounded-lg bg-white">
                            <img src={qrDataUrl} alt="Profile QR" style={{ width: "48px", height: "48px", display: "block" }} />
                          </div>
                        )}
                        <div>
                          <p className="font-display text-sm" style={{ color: "#fcfaf5" }}>Indus Orbit Trust Layer</p>
                          <p className="text-[10px] uppercase tracking-widest" style={{ color: "rgba(252,250,245,0.6)" }}>Scan to verify or join</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-mono" style={{ color: "#f97316" }}>ID: {id.split('-')[0].toUpperCase()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

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
    </Shell>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Hourglass, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SEGMENT_META, type Segment } from "@/components/auth/segments";
import { VerifiedBadge } from "@/components/auth/VerifiedBadge";
import { SegmentHomeModules } from "@/components/app/SegmentHomeModules";
import { getSpotlights } from "@/server/society.functions";
import { getPersonalizedFeed, type FeedItem } from "@/server/feed.functions";
import { Sparkles, Calendar, BookOpen, Flag, Clock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [{ title: "Home — Indus Orbit" }, { name: "robots", content: "noindex" }],
  }),
  component: AppHome,
});

type ProfileBits = {
  display_name: string | null;
  orbit_segment: Segment | null;
  is_verified: boolean;
  headline: string | null;
  bio: string | null;
  city: string | null;
  country: string | null;
};

function AppHome() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileBits | null>(null);
  const [spotlights, setSpotlights] = useState<any[]>([]);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name, orbit_segment, is_verified, headline, bio, city, country")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data as unknown as ProfileBits | null));
      
    getSpotlights().then(setSpotlights).catch(console.error);
    getPersonalizedFeed()
      .then(setFeedItems)
      .catch(console.error)
      .finally(() => setLoadingFeed(false));
  }, [user]);

  const completeness = (() => {
    if (!profile) return 0;
    const fields = [profile.display_name, profile.orbit_segment, profile.headline, profile.bio, profile.city];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  })();

  const segmentMeta = profile?.orbit_segment ? SEGMENT_META[profile.orbit_segment] : null;

  return (
    <div className="mx-auto w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      {/* --- LEFT COLUMN: FEED & MAIN CONTENT --- */}
      <div className="lg:col-span-8 space-y-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--saffron)]">The Orbit</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl font-medium md:text-4xl">
              Welcome{profile?.display_name ? `, ${profile.display_name}` : ""}.
            </h1>
            {profile?.is_verified ? (
              <VerifiedBadge size="md" />
            ) : profile ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-foreground/5 px-3 py-1 text-xs font-medium text-muted-foreground">
                <Hourglass className="h-3 w-3" /> Verification pending
              </span>
            ) : null}
          </div>
        </div>

        {profile && (
          <div className="rounded-3xl border border-border bg-card p-5 md:p-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              {segmentMeta && (
                <span className="inline-flex items-center gap-2 rounded-full bg-[var(--indigo-night)] px-3 py-1 text-xs font-semibold text-[var(--parchment)]">
                  <segmentMeta.icon className="h-3 w-3" /> {segmentMeta.label}
                </span>
              )}
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                Profile {completeness}% complete
              </span>
            </div>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
              <div className="h-full bg-[var(--saffron)]" style={{ width: `${completeness}%` }} />
            </div>
            {profile.headline && <p className="mt-4 text-sm text-foreground/80">{profile.headline}</p>}
            {completeness < 80 && (
              <Link
                to="/app/profile"
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[var(--indigo-night)] hover:gap-2 transition-all"
              >
                Finish your profile <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        )}

        {/* --- PERSONALIZED FEED SECTION --- */}
        <section>
          <div className="flex items-center gap-2 mb-4 px-2">
            <Clock className="h-5 w-5 text-[var(--saffron)]" />
            <h2 className="font-display text-2xl font-medium">Your Feed</h2>
          </div>
          
          {loadingFeed ? (
            <p className="text-sm text-muted-foreground px-2">Loading feed...</p>
          ) : feedItems.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border p-8 text-center text-muted-foreground bg-card shadow-sm">
              <p>Your feed is quiet right now. Join missions or chapters to see updates here!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {feedItems.map((item) => (
                <div key={item.id} className="rounded-3xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md flex flex-col sm:flex-row gap-5">
                  <div className="flex-shrink-0 pt-1 hidden sm:block">
                    {item.type === "mission_update" && <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center"><Flag className="h-5 w-5 text-blue-600" /></div>}
                    {item.type === "story" && <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center"><BookOpen className="h-5 w-5 text-orange-600" /></div>}
                    {item.type === "event" && <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center"><Calendar className="h-5 w-5 text-purple-600" /></div>}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 ring-2 ring-background">
                          <AvatarImage src={item.authorAvatar || ""} />
                          <AvatarFallback>{item.authorName?.charAt(0) || "U"}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-foreground">{item.authorName || "User"}</span>
                          <span className="text-[11px] text-muted-foreground uppercase tracking-wider">
                            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      {item.type === "event" && (
                        <span className="inline-flex rounded-full bg-[var(--indigo-night)]/10 px-3 py-1 text-[10px] font-bold text-[var(--indigo-night)] uppercase tracking-wider">
                          Event
                        </span>
                      )}
                    </div>
                    <h3 className="mt-4 font-display text-xl font-medium leading-tight hover:text-[var(--saffron)] transition">
                      <Link to={item.link || "#"}>{item.title}</Link>
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-3 leading-relaxed">{item.content}</p>
                    
                    {item.link && (
                      <Link to={item.link} className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--indigo-night)] hover:text-[var(--saffron)] transition-colors">
                        Read more <ArrowRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* --- RIGHT COLUMN: WIDGETS --- */}
      <div className="lg:col-span-4 space-y-8 lg:sticky lg:top-24 pb-12">
        {profile?.orbit_segment && (
          <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-display text-xl font-medium">Built for you</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Curated for {SEGMENT_META[profile.orbit_segment].label.toLowerCase()}s.
            </p>
            <div className="mt-5">
              <SegmentHomeModules segment={profile.orbit_segment} />
            </div>
          </section>
        )}

        {spotlights.length > 0 && (
          <section className="rounded-3xl border border-border bg-[var(--indigo-night)] text-[var(--parchment)] p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 h-32 w-32 bg-[var(--saffron)]/20 rounded-bl-full -mr-8 -mt-8" />
            <div className="flex items-center gap-2 mb-6 relative z-10">
              <Sparkles className="h-5 w-5 text-[var(--saffron)]" />
              <h2 className="font-display text-xl font-medium">Spotlights</h2>
            </div>
            <div className="flex flex-col gap-6 relative z-10">
              {spotlights.map((s) => (
                <div key={s.id} className="group">
                  <h3 className="font-display text-lg font-semibold">{s.profiles?.display_name}</h3>
                  <p className="text-xs text-[var(--parchment)]/70 mt-0.5">{s.profiles?.headline}</p>
                  <div className="mt-3 text-sm leading-relaxed italic border-l-2 border-[var(--saffron)] pl-3">"{s.writeup}"</div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

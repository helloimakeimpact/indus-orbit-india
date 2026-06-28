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
import { toast } from "sonner";

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
  const [feedError, setFeedError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name, orbit_segment, is_verified, headline, bio, city, country")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        setProfile(data as unknown as ProfileBits | null);
      });

    getSpotlights()
      .then(setSpotlights)
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : "Could not load spotlights"),
      );
    getPersonalizedFeed()
      .then((items) => {
        setFeedError(null);
        setFeedItems(items);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Could not load feed";
        setFeedError(message);
        toast.error(message);
      })
      .finally(() => setLoadingFeed(false));
  }, [user]);

  const completeness = (() => {
    if (!profile) return 0;
    const fields = [
      profile.display_name,
      profile.orbit_segment,
      profile.headline,
      profile.bio,
      profile.city,
    ];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  })();

  const segmentMeta = profile?.orbit_segment ? SEGMENT_META[profile.orbit_segment] : null;

  return (
    <div className="mx-auto grid w-full max-w-none grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      {/* --- LEFT COLUMN: FEED & MAIN CONTENT --- */}
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--saffron)]">
            🪐 The Orbit
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold md:text-3xl">
              👋 Welcome{profile?.display_name ? `, ${profile.display_name}` : ""}.
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
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center gap-3">
              {segmentMeta && (
                <span className="inline-flex items-center gap-2 rounded-full bg-[var(--indigo-night)] px-2.5 py-1 text-xs font-semibold text-[var(--parchment)]">
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
            {profile.headline && (
              <p className="mt-4 text-sm text-foreground/80">{profile.headline}</p>
            )}
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
          <div className="mb-3 flex items-center gap-2 px-1">
            <Clock className="h-4 w-4 text-[var(--saffron)]" />
            <h2 className="text-lg font-semibold">📰 Your Feed</h2>
          </div>

          {loadingFeed ? (
            <p className="text-sm text-muted-foreground px-2">Loading feed...</p>
          ) : feedError ? (
            <div className="rounded-2xl border border-dashed border-destructive/30 bg-card p-6 text-center text-sm text-destructive">
              Could not load your feed: {feedError}
            </div>
          ) : feedItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
              <p>🌱 Your feed is quiet right now. Join missions or chapters to see updates here!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {feedItems.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 rounded-2xl border border-border bg-card p-4 transition hover:border-foreground/20"
                >
                  <div className="hidden flex-shrink-0 pt-1 sm:block">
                    {item.type === "mission_update" && (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100">
                        <Flag className="h-4 w-4 text-blue-600" />
                      </div>
                    )}
                    {item.type === "story" && (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100">
                        <BookOpen className="h-4 w-4 text-orange-600" />
                      </div>
                    )}
                    {item.type === "event" && (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-100">
                        <Calendar className="h-4 w-4 text-purple-600" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={item.authorAvatar || ""} />
                          <AvatarFallback>{item.authorName?.charAt(0) || "U"}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-foreground">
                            {item.authorName || "User"}
                          </span>
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
                    <h3 className="mt-3 text-base font-semibold leading-tight transition hover:text-[var(--saffron)]">
                      <Link to={item.link || "#"}>{item.title}</Link>
                    </h3>
                    <p className="mt-1.5 line-clamp-3 text-sm leading-6 text-muted-foreground">
                      {item.content}
                    </p>

                    {item.link && (
                      <Link
                        to={item.link}
                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--indigo-night)] transition-colors hover:text-[var(--saffron)]"
                      >
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
      <div className="space-y-4 pb-8 lg:sticky lg:top-20">
        {profile?.orbit_segment && (
          <section className="rounded-2xl border border-border bg-card p-4">
            <h2 className="text-base font-semibold">🎯 Built for you</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Curated for {SEGMENT_META[profile.orbit_segment].label.toLowerCase()}s.
            </p>
            <div className="mt-4">
              <SegmentHomeModules segment={profile.orbit_segment} />
            </div>
          </section>
        )}

        {spotlights.length > 0 && (
          <section className="relative overflow-hidden rounded-2xl border border-border bg-[var(--indigo-night)] p-4 text-[var(--parchment)]">
            <div className="relative z-10 mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[var(--saffron)]" />
              <h2 className="text-base font-semibold">✨ Spotlights</h2>
            </div>
            <div className="relative z-10 flex flex-col gap-4">
              {spotlights.map((s) => (
                <div key={s.id} className="group">
                  <h3 className="text-sm font-semibold">{s.profiles?.display_name}</h3>
                  <p className="text-xs text-[var(--parchment)]/70 mt-0.5">
                    {s.profiles?.headline}
                  </p>
                  <div className="mt-2 border-l-2 border-[var(--saffron)] pl-3 text-sm italic leading-6">
                    "{s.writeup}"
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

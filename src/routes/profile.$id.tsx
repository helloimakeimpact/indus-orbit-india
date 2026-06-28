import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Flag,
  Globe2,
  MessageSquare,
  Rocket,
  Send,
  Share2,
  ShieldCheck,
  ThumbsUp,
} from "lucide-react";
import QRCodeLib from "qrcode";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/site/SiteShell";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { ReachOutDialog } from "@/components/connect/ReachOutDialog";
import { BookMentorDialog } from "@/components/connect/BookMentorDialog";
import {
  ProfileAboutCard,
  ProfileActivityTabs,
  ProfileIdentityHero,
  ProfileLinksCard,
  ProfileSegmentSnapshot,
  ProfileStatsStrip,
  ProfileTrustCard,
  type ProfileActivityItem,
  type ProfileStat,
  type SocialProfileRecord,
} from "@/components/profile/SocialProfile";
import {
  formatChapterBaseLocation,
  formatEventLocation,
  formatLocationTypeLabel,
} from "@/lib/location";

export const Route = createFileRoute("/profile/$id")({
  component: PublicProfilePage,
});

type SocialData = {
  stats: ProfileStat[];
  activities: ProfileActivityItem[];
  endorsementCount: number;
  missionCount: number;
  chapterCount: number;
  qrDataUrl: string;
};

const emptySocial: SocialData = {
  stats: [],
  activities: [],
  endorsementCount: 0,
  missionCount: 0,
  chapterCount: 0,
  qrDataUrl: "",
};

type EndorsementRow = {
  id: string;
  created_at: string | null;
};

type MissionSummary = {
  id: string;
  title: string | null;
  theme: string | null;
  status: string | null;
  description?: string | null;
};

type ChapterSummary = {
  id: string;
  name: string | null;
  city: string | null;
  country: string | null;
};

type AskOfferRow = {
  id: string;
  kind: string | null;
  title: string;
  body: string | null;
  region: string | null;
  sector: string | null;
  created_at: string | null;
};

type MissionMemberRow = {
  role: string | null;
  commitment_type: string | null;
  created_at: string | null;
  missions: MissionSummary | MissionSummary[] | null;
};

type ChapterMemberRow = {
  role: string | null;
  created_at: string | null;
  chapters: ChapterSummary | ChapterSummary[] | null;
};

type StoryRow = {
  id: string;
  title: string;
  content: string | null;
  status: string | null;
  published_at: string | null;
  created_at: string | null;
};

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  start_time: string | null;
  location: string | null;
  location_type: string | null;
  status: string | null;
};

type MissionUpdateRow = {
  id: string;
  content: string | null;
  created_at: string | null;
  mission_id: string | null;
  missions: Pick<MissionSummary, "id" | "title"> | Pick<MissionSummary, "id" | "title">[] | null;
};

function relationOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function excerpt(value?: string | null, length = 150) {
  if (!value) return "";
  return value.length > length ? `${value.slice(0, length).trim()}...` : value;
}

async function loadSocialData(userId: string, profileUrl: string): Promise<SocialData> {
  const now = new Date().toISOString();
  const [endorsementsRes, asksRes, missionsRes, chaptersRes, storiesRes, eventsRes, updatesRes] =
    await Promise.all([
      supabase
        .from("endorsements")
        .select("id, segment, note, created_at, endorser_id")
        .eq("endorsee_id", userId)
        .order("created_at", { ascending: false })
        .limit(12),
      supabase
        .from("asks_offers")
        .select("id, kind, title, body, region, sector, created_at, expires_at")
        .eq("author_id", userId)
        .eq("status", "active")
        .gt("expires_at", now)
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("mission_members")
        .select(
          "role, commitment_type, message, created_at, missions(id, title, theme, status, description)",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("chapter_members")
        .select("role, created_at, chapters(id, name, city, country)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("stories")
        .select("id, title, content, status, published_at, created_at")
        .eq("author_id", userId)
        .in("status", ["approved", "featured", "published"])
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("events")
        .select("id, title, description, start_time, location, location_type, status")
        .eq("organizer_id", userId)
        .eq("status", "approved")
        .order("start_time", { ascending: false })
        .limit(8),
      supabase
        .from("mission_updates")
        .select("id, content, created_at, mission_id, missions(id, title)")
        .eq("author_id", userId)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

  const endorsements = (endorsementsRes.data as EndorsementRow[] | null) ?? [];
  const asks = (asksRes.data as AskOfferRow[] | null) ?? [];
  const missions = (missionsRes.data as MissionMemberRow[] | null) ?? [];
  const chapters = (chaptersRes.data as ChapterMemberRow[] | null) ?? [];
  const stories = (storiesRes.data as StoryRow[] | null) ?? [];
  const events = (eventsRes.data as EventRow[] | null) ?? [];
  const updates = (updatesRes.data as MissionUpdateRow[] | null) ?? [];

  const missionActivities: ProfileActivityItem[] = missions.map((row) => {
    const mission = relationOne<MissionSummary>(row.missions);
    return {
      id: mission?.id ?? `${row.created_at}-mission`,
      type: "mission",
      emoji: row.role === "lead" ? "👑" : "🚀",
      title: mission?.title ?? "Mission",
      subtitle: [row.role, row.commitment_type, mission?.theme].filter(Boolean).join(" · "),
      body: mission?.description,
      status: mission?.status,
      date: row.created_at,
      href: mission?.id ? `/app/missions/${mission.id}` : undefined,
    };
  });

  const chapterActivities: ProfileActivityItem[] = chapters.map((row) => {
    const chapter = relationOne<ChapterSummary>(row.chapters);
    return {
      id: chapter?.id ?? `${row.created_at}-chapter`,
      type: "chapter",
      emoji: row.role === "lead" ? "👑" : "🌍",
      title: chapter?.name ?? "Chapter",
      subtitle: [row.role, chapter ? `Base: ${formatChapterBaseLocation(chapter)}` : ""]
        .filter(Boolean)
        .join(" · "),
      date: row.created_at,
      href: chapter?.id ? `/app/chapters/${chapter.id}` : undefined,
    };
  });

  const postActivities: ProfileActivityItem[] = asks.map((post) => ({
    id: post.id,
    type: "post",
    emoji: post.kind === "offer" ? "🎁" : "🙏",
    title: post.title,
    subtitle: [post.kind, post.sector, post.region].filter(Boolean).join(" · "),
    body: post.body,
    date: post.created_at,
    status: "active",
  }));

  const storyActivities: ProfileActivityItem[] = stories.map((story) => ({
    id: story.id,
    type: "story",
    emoji: story.status === "featured" ? "🌟" : "📖",
    title: story.title,
    body: excerpt(story.content),
    date: story.published_at ?? story.created_at,
    status: story.status,
    href: `/app/stories/${story.id}`,
  }));

  const eventActivities: ProfileActivityItem[] = events.map((event) => ({
    id: event.id,
    type: "event",
    emoji: event.location_type === "virtual" ? "💻" : "🗓️",
    title: event.title,
    subtitle: [formatLocationTypeLabel(event.location_type), formatEventLocation(event)]
      .filter(Boolean)
      .join(" · "),
    body: excerpt(event.description),
    date: event.start_time,
    status: event.status,
    href: `/app/events/${event.id}`,
  }));

  const updateActivities: ProfileActivityItem[] = updates.map((update) => {
    const mission = relationOne<Pick<MissionSummary, "id" | "title">>(update.missions);
    return {
      id: update.id,
      type: "mission",
      emoji: "🛰️",
      title: mission?.title ? `Update in ${mission.title}` : "Mission update",
      body: excerpt(update.content),
      date: update.created_at,
      href: update.mission_id ? `/app/missions/${update.mission_id}` : undefined,
    };
  });

  const activities = [
    ...missionActivities,
    ...chapterActivities,
    ...postActivities,
    ...storyActivities,
    ...eventActivities,
    ...updateActivities,
  ];

  const qrDataUrl = await new Promise<string>((resolve) => {
    QRCodeLib.toDataURL(profileUrl, { margin: 2, scale: 4 }, (err, url) => resolve(err ? "" : url));
  });

  return {
    endorsementCount: endorsements.length,
    missionCount: missions.length,
    chapterCount: chapters.length,
    qrDataUrl,
    activities,
    stats: [
      {
        label: "Endorsements",
        value: endorsements.length,
        detail: "Member trust signals",
        icon: ThumbsUp,
      },
      {
        label: "Missions",
        value: missions.length,
        detail: `${missions.filter((m) => m.role === "lead").length} led`,
        icon: Rocket,
      },
      {
        label: "Chapters",
        value: chapters.length,
        detail: `${chapters.filter((c) => c.role === "lead").length} led`,
        icon: Globe2,
      },
      {
        label: "Public activity",
        value: activities.length,
        detail: "Posts, stories, events, updates",
        icon: MessageSquare,
      },
    ],
  };
}

function PublicProfilePage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<SocialProfileRecord | null>(null);
  const [social, setSocial] = useState<SocialData>(emptySocial);
  const [busy, setBusy] = useState(true);
  const [reachOutOpen, setReachOutOpen] = useState(false);
  const [bookOpen, setBookOpen] = useState(false);

  useEffect(() => {
    async function load() {
      setBusy(true);
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", id)
        .eq("is_public", true)
        .maybeSingle();

      const nextProfile = data as unknown as SocialProfileRecord | null;
      setProfile(nextProfile);
      if (nextProfile) {
        const profileUrl =
          typeof window !== "undefined"
            ? `${window.location.origin}/profile/${id}`
            : `/profile/${id}`;
        setSocial(await loadSocialData(id, profileUrl));
      }
      setBusy(false);
    }
    load();
  }, [id]);

  const Shell = user ? AppShell : SiteShell;
  const isOwner = user?.id === profile?.user_id;
  const canContact = user && profile && !isOwner;
  const canBook = canContact && profile.orbit_segment === "expert";

  async function copyProfile() {
    const url = typeof window !== "undefined" ? window.location.href : `/profile/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Profile link copied");
    } catch {
      toast.error("Could not copy profile link");
    }
  }

  if (busy) {
    return (
      <Shell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </Shell>
    );
  }

  if (!profile) {
    return (
      <Shell>
        <div className="mx-auto w-full max-w-3xl px-4 py-16 text-center">
          <h1 className="text-3xl font-semibold">Profile not found</h1>
          <p className="mt-3 text-muted-foreground">
            This member profile is private or does not exist.
          </p>
          <Button
            className="mt-6"
            onClick={() => navigate({ to: user ? "/app/directory" : "/members" })}
          >
            View directory
          </Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mx-auto w-full max-w-none space-y-4 px-0 py-2 sm:px-2 lg:px-4">
        <Link
          to={user ? "/app/directory" : "/members"}
          className="inline-flex items-center gap-2 px-1 text-sm font-medium text-muted-foreground transition hover:text-[var(--indigo-night)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to directory
        </Link>

        <ProfileIdentityHero
          profile={profile}
          actions={
            <>
              {canContact && (
                <Button onClick={() => setReachOutOpen(true)} className="rounded-full">
                  <Send className="h-4 w-4" /> Reach out
                </Button>
              )}
              {canBook && (
                <Button
                  onClick={() => setBookOpen(true)}
                  variant="outline"
                  className="rounded-full"
                >
                  <CalendarDays className="h-4 w-4" /> Book session
                </Button>
              )}
              {isOwner && (
                <Button asChild className="rounded-full">
                  <Link to="/app/profile">Edit profile</Link>
                </Button>
              )}
              {!user && (
                <Button asChild className="rounded-full">
                  <Link to="/auth">Join to connect</Link>
                </Button>
              )}
              <Button onClick={copyProfile} variant="outline" className="rounded-full">
                <Share2 className="h-4 w-4" /> Share
              </Button>
            </>
          }
        />

        <ProfileStatsStrip stats={social.stats} />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4">
            <ProfileAboutCard profile={profile} />
            <ProfileActivityTabs items={social.activities} />
          </div>

          <aside className="space-y-4">
            <ProfileSegmentSnapshot profile={profile} />
            <ProfileTrustCard
              profile={profile}
              endorsementCount={social.endorsementCount}
              qrDataUrl={profile.is_verified ? social.qrDataUrl : ""}
            />
            <ProfileLinksCard profile={profile} />
            {!user && (
              <section className="app-glass rounded-2xl p-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[var(--saffron)]" />
                  <h2 className="text-base font-semibold">Join the Orbit</h2>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Indus Orbit profiles become useful when members can connect, vouch, mentor, and
                  build in public.
                </p>
                <Button asChild className="mt-4 w-full rounded-full">
                  <Link to="/auth">Create account</Link>
                </Button>
              </section>
            )}
          </aside>
        </div>
      </div>

      {reachOutOpen && canContact && (
        <ReachOutDialog
          open={reachOutOpen}
          onOpenChange={setReachOutOpen}
          recipientId={profile.user_id}
          recipientName={profile.display_name ?? "Member"}
          senderId={user.id}
        />
      )}
      {bookOpen && canBook && (
        <BookMentorDialog
          open={bookOpen}
          onOpenChange={setBookOpen}
          expertId={profile.user_id}
          expertName={profile.display_name ?? "this expert"}
        />
      )}

      {canContact && (
        <div className="fixed inset-x-3 bottom-3 z-40 flex gap-2 rounded-2xl border border-white/60 bg-card/85 p-2 shadow-2xl backdrop-blur-2xl md:hidden">
          <Button onClick={() => setReachOutOpen(true)} className="flex-1 rounded-xl">
            <Send className="h-4 w-4" /> Reach out
          </Button>
          {canBook ? (
            <Button
              onClick={() => setBookOpen(true)}
              variant="outline"
              className="flex-1 rounded-xl"
            >
              <CalendarDays className="h-4 w-4" /> Book
            </Button>
          ) : (
            <Button onClick={copyProfile} variant="outline" className="flex-1 rounded-xl">
              <Share2 className="h-4 w-4" /> Share
            </Button>
          )}
        </div>
      )}
    </Shell>
  );
}

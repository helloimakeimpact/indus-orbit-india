import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense, lazy, useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import {
  BookOpen,
  CalendarDays,
  Edit3,
  Globe2,
  MessageSquare,
  Rocket,
  ThumbsUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SEGMENT_LIST,
  SEGMENT_META,
  type Segment,
  type SegmentDetails,
} from "@/components/auth/segments";
import { SegmentDetailsForm } from "@/components/auth/SegmentDetailsForm";
import { VerificationCard } from "@/components/auth/VerificationCard";
import {
  ProfileAboutCard,
  ProfileActivityTabs,
  ProfileCompletionCard,
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

const CertificateDialog = lazy(() =>
  import("@/components/profile/CertificateDialog").then((module) => ({
    default: module.CertificateDialog,
  })),
);

export const Route = createFileRoute("/app/profile")({
  head: () => ({
    meta: [{ title: "Your profile — Indus Orbit" }, { name: "robots", content: "noindex" }],
  }),
  component: ProfilePage,
});

const schema = z.object({
  display_name: z.string().trim().min(1, "Required").max(80),
  headline: z.string().trim().max(120).optional().or(z.literal("")),
  bio: z.string().trim().max(1000).optional().or(z.literal("")),
  avatar_url: z.string().trim().url("Must be a URL").max(500).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  country: z.string().trim().max(80).optional().or(z.literal("")),
  region: z.string().trim().max(80).optional().or(z.literal("")),
  timezone: z.string().trim().max(80).optional().or(z.literal("")),
  linkedin_url: z.string().trim().url("Must be a URL").max(255).optional().or(z.literal("")),
  website_url: z.string().trim().url("Must be a URL").max(255).optional().or(z.literal("")),
  orbit_segment: z.enum(SEGMENT_LIST as unknown as [Segment, ...Segment[]]).nullable(),
  booking_url: z.string().trim().url("Must be a URL").max(255).optional().or(z.literal("")),
  is_public: z.boolean(),
  notification_prefs: z.record(z.object({ in_app: z.boolean(), email: z.boolean() })).optional(),
});
type Form = z.infer<typeof schema>;

type OwnerSocial = {
  stats: ProfileStat[];
  activities: ProfileActivityItem[];
  endorsementCount: number;
  missionCount: number;
  chapterCount: number;
};

const defaultPrefs = {
  connect_requests: { in_app: true, email: true },
  vouches: { in_app: true, email: true },
  mentorship: { in_app: true, email: true },
  mission_updates: { in_app: true, email: true },
  system_alerts: { in_app: true, email: true },
};

const emptySocial: OwnerSocial = {
  stats: [],
  activities: [],
  endorsementCount: 0,
  missionCount: 0,
  chapterCount: 0,
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

type MentorSessionRow = {
  id: string;
  status: string | null;
  duration_mins: number | null;
  created_at: string | null;
  updated_at: string | null;
  expert_id: string | null;
  booker_id: string | null;
};

function relationOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function excerpt(value?: string | null, length = 140) {
  if (!value) return "";
  return value.length > length ? `${value.slice(0, length).trim()}...` : value;
}

async function loadOwnerSocialData(userId: string): Promise<OwnerSocial> {
  const now = new Date().toISOString();
  const [endorsementsRes, asksRes, missionsRes, chaptersRes, storiesRes, eventsRes, sessionsRes] =
    await Promise.all([
      supabase.from("endorsements").select("id", { count: "exact" }).eq("endorsee_id", userId),
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
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("events")
        .select("id, title, description, start_time, location, location_type, status")
        .eq("organizer_id", userId)
        .order("start_time", { ascending: false })
        .limit(8),
      supabase
        .from("mentor_sessions")
        .select("id, status, duration_mins, created_at, updated_at, expert_id, booker_id")
        .or(`expert_id.eq.${userId},booker_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

  const loadError = [
    endorsementsRes.error,
    asksRes.error,
    missionsRes.error,
    chaptersRes.error,
    storiesRes.error,
    eventsRes.error,
    sessionsRes.error,
  ].find(Boolean);
  if (loadError) throw new Error(loadError.message);

  const endorsements = endorsementsRes.count ?? endorsementsRes.data?.length ?? 0;
  const asks = (asksRes.data as AskOfferRow[] | null) ?? [];
  const missions = (missionsRes.data as MissionMemberRow[] | null) ?? [];
  const chapters = (chaptersRes.data as ChapterMemberRow[] | null) ?? [];
  const stories = (storiesRes.data as StoryRow[] | null) ?? [];
  const events = (eventsRes.data as EventRow[] | null) ?? [];
  const sessions = (sessionsRes.data as MentorSessionRow[] | null) ?? [];

  const activities: ProfileActivityItem[] = [
    ...missions.map((row) => {
      const mission = relationOne<MissionSummary>(row.missions);
      return {
        id: mission?.id ?? `${row.created_at}-mission`,
        type: "mission" as const,
        emoji: row.role === "lead" ? "👑" : "🚀",
        title: mission?.title ?? "Mission",
        subtitle: [row.role, row.commitment_type, mission?.theme].filter(Boolean).join(" · "),
        body: mission?.description,
        status: mission?.status,
        date: row.created_at,
        href: mission?.id ? `/app/missions/${mission.id}` : undefined,
      };
    }),
    ...chapters.map((row) => {
      const chapter = relationOne<ChapterSummary>(row.chapters);
      return {
        id: chapter?.id ?? `${row.created_at}-chapter`,
        type: "chapter" as const,
        emoji: row.role === "lead" ? "👑" : "🌍",
        title: chapter?.name ?? "Chapter",
        subtitle: [row.role, chapter ? `Base: ${formatChapterBaseLocation(chapter)}` : ""]
          .filter(Boolean)
          .join(" · "),
        date: row.created_at,
        href: chapter?.id ? `/app/chapters/${chapter.id}` : undefined,
      };
    }),
    ...asks.map((post) => ({
      id: post.id,
      type: "post" as const,
      emoji: post.kind === "offer" ? "🎁" : "🙏",
      title: post.title,
      subtitle: [post.kind, post.sector, post.region].filter(Boolean).join(" · "),
      body: post.body,
      date: post.created_at,
      status: "active",
    })),
    ...stories.map((story) => ({
      id: story.id,
      type: "story" as const,
      emoji: story.status === "featured" ? "🌟" : "📖",
      title: story.title,
      body: excerpt(story.content),
      date: story.published_at ?? story.created_at,
      status: story.status,
      href: `/app/stories/${story.id}`,
    })),
    ...events.map((event) => ({
      id: event.id,
      type: "event" as const,
      emoji: event.location_type === "virtual" ? "💻" : "🗓️",
      title: event.title,
      subtitle: [formatLocationTypeLabel(event.location_type), formatEventLocation(event)]
        .filter(Boolean)
        .join(" · "),
      body: excerpt(event.description),
      date: event.start_time,
      status: event.status,
      href: `/app/events/${event.id}`,
    })),
    ...sessions.map((session) => ({
      id: session.id,
      type: "mentor" as const,
      emoji: session.expert_id === userId ? "🧭" : "🎯",
      title:
        session.expert_id === userId ? "Mentorship session as expert" : "Mentorship session booked",
      subtitle: `${session.status} · ${session.duration_mins} minutes`,
      date: session.updated_at ?? session.created_at,
      status: session.status,
      href: "/app/mentor",
    })),
  ];

  const completedExpertMinutes = sessions
    .filter((session) => session.expert_id === userId && session.status === "completed")
    .reduce((sum, session) => sum + Number(session.duration_mins ?? 0), 0);

  return {
    endorsementCount: endorsements,
    missionCount: missions.length,
    chapterCount: chapters.length,
    activities,
    stats: [
      { label: "Endorsements", value: endorsements, detail: "Trust from members", icon: ThumbsUp },
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
        label: "Mentorship",
        value: `${Math.round(completedExpertMinutes / 60)}h`,
        detail: "Completed as expert",
        icon: CalendarDays,
      },
    ],
  };
}

function ProfilePage() {
  const { user } = useAuth();
  const [form, setForm] = useState<Form>({
    display_name: "",
    headline: "",
    bio: "",
    avatar_url: "",
    city: "",
    country: "",
    region: "",
    timezone: "",
    linkedin_url: "",
    website_url: "",
    orbit_segment: null,
    booking_url: "",
    is_public: false,
    notification_prefs: defaultPrefs,
  });
  const [details, setDetails] = useState<SegmentDetails>({});
  const [verified, setVerified] = useState(false);
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [social, setSocial] = useState<OwnerSocial>(emptySocial);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const userId = user.id;
    async function load() {
      setLoading(true);
      try {
        const [{ data, error }, socialData] = await Promise.all([
          supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
          loadOwnerSocialData(userId),
        ]);
        if (error) {
          toast.error(error.message);
          setLoading(false);
          return;
        }
        if (data) {
          const d = data as Record<string, unknown>;
          setForm({
            display_name: (d.display_name as string) ?? "",
            headline: (d.headline as string) ?? "",
            bio: (d.bio as string) ?? "",
            avatar_url: (d.avatar_url as string) ?? "",
            city: (d.city as string) ?? "",
            country: (d.country as string) ?? "",
            region: (d.region as string) ?? "",
            timezone: (d.timezone as string) ?? "",
            linkedin_url: (d.linkedin_url as string) ?? "",
            website_url: (d.website_url as string) ?? "",
            orbit_segment: (d.orbit_segment as Segment | null) ?? null,
            booking_url: (d.booking_url as string) ?? "",
            is_public: Boolean(d.is_public),
            notification_prefs:
              (d.notification_prefs as Form["notification_prefs"]) ?? defaultPrefs,
          });
          setDetails((d.segment_details as SegmentDetails) ?? {});
          setVerified(Boolean(d.is_verified));
          setVerifiedAt((d.verified_at as string | null) ?? null);
          setCreatedAt((d.created_at as string | null) ?? null);
        }
        setSocial(socialData);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not load profile");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: parsed.data.display_name,
        headline: parsed.data.headline || null,
        bio: parsed.data.bio || null,
        avatar_url: parsed.data.avatar_url || null,
        city: parsed.data.city || null,
        country: parsed.data.country || null,
        linkedin_url: parsed.data.linkedin_url || null,
        website_url: parsed.data.website_url || null,
        orbit_segment: parsed.data.orbit_segment,
        booking_url: parsed.data.booking_url || null,
        is_public: parsed.data.is_public,
        notification_prefs: parsed.data.notification_prefs,
        ...({
          region: parsed.data.region || null,
          timezone: parsed.data.timezone || null,
          segment_details: details,
        } as Record<string, unknown>),
      } as never)
      .eq("user_id", user.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Profile saved");
      try {
        setSocial(await loadOwnerSocialData(user.id));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not refresh profile activity");
      }
    }
  }

  if (loading || !user) return <p className="text-muted-foreground">Loading...</p>;

  const previewProfile: SocialProfileRecord = {
    user_id: user.id,
    display_name: form.display_name,
    headline: form.headline || null,
    bio: form.bio || null,
    avatar_url: form.avatar_url || null,
    city: form.city || null,
    country: form.country || null,
    region: form.region || null,
    timezone: form.timezone || null,
    linkedin_url: form.linkedin_url || null,
    website_url: form.website_url || null,
    booking_url: form.booking_url || null,
    orbit_segment: form.orbit_segment,
    is_public: form.is_public,
    is_verified: verified,
    verified_at: verifiedAt,
    created_at: createdAt,
    segment_details: details,
  };

  return (
    <div className="mx-auto w-full max-w-none space-y-4">
      <ProfileIdentityHero
        profile={previewProfile}
        actions={
          <>
            <Button asChild variant="outline" className="rounded-full">
              <a href="#profile-edit">
                <Edit3 className="h-4 w-4" /> Edit details
              </a>
            </Button>
            {form.is_public && (
              <Button asChild className="rounded-full">
                <Link to="/profile/$id" params={{ id: user.id }}>
                  View public profile
                </Link>
              </Button>
            )}
            {verified && (
              <Suspense fallback={null}>
                <CertificateDialog
                  userId={user.id}
                  isVerified={verified}
                  orbitSegment={form.orbit_segment}
                  displayName={form.display_name}
                />
              </Suspense>
            )}
          </>
        }
      />

      <ProfileStatsStrip stats={social.stats} showZeroStats />

      {!verified && <VerificationCard onChanged={() => setVerified(true)} />}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <ProfileCompletionCard profile={previewProfile} />
          <ProfileAboutCard profile={previewProfile} />
          <ProfileActivityTabs items={social.activities} />
        </div>
        <aside className="space-y-4">
          <ProfileSegmentSnapshot profile={previewProfile} />
          <ProfileTrustCard profile={previewProfile} endorsementCount={social.endorsementCount} />
          <ProfileLinksCard profile={previewProfile} />
        </aside>
      </div>

      <form
        id="profile-edit"
        onSubmit={onSave}
        className="app-glass space-y-5 rounded-2xl p-4 sm:p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--saffron)]">
              Profile editor
            </p>
            <h2 className="mt-1 text-xl font-semibold">Make the social profile clearer</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              These fields power your directory card, public profile, and connection flows.
            </p>
          </div>
          <Button type="submit" disabled={busy} className="rounded-full">
            {busy ? "Saving..." : "Save profile"}
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Display name" required>
            <Input
              value={form.display_name}
              onChange={(e) => setForm({ ...form, display_name: e.target.value })}
            />
          </Field>
          <Field label="Orbit segment">
            <Select
              value={form.orbit_segment ?? ""}
              onValueChange={(v) =>
                setForm({ ...form, orbit_segment: (v || null) as Segment | null })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose..." />
              </SelectTrigger>
              <SelectContent>
                {SEGMENT_LIST.map((s) => (
                  <SelectItem key={s} value={s}>
                    {SEGMENT_META[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field label="Avatar image URL">
          <Input
            placeholder="https://..."
            value={form.avatar_url}
            onChange={(e) => setForm({ ...form, avatar_url: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Use a clear headshot or founder/operator photo. This already maps to the existing
            avatar_url field.
          </p>
        </Field>

        <Field label="Headline">
          <Input
            placeholder="Founder building rural fintech infrastructure"
            value={form.headline}
            onChange={(e) => setForm({ ...form, headline: e.target.value })}
          />
        </Field>

        <Field label="Bio">
          <Textarea
            rows={5}
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            placeholder="What are you building, where are you useful, and what should people reach out about?"
          />
        </Field>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="City">
            <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </Field>
          <Field label="Country">
            <Input
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
            />
          </Field>
        </div>
        <p className="rounded-2xl bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">
          This is your public profile location for discovery. Keep street addresses and exact venues
          on events, not profiles.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Region / state">
            <Input
              value={form.region}
              onChange={(e) => setForm({ ...form, region: e.target.value })}
            />
          </Field>
          <Field label="Timezone">
            <Input
              value={form.timezone}
              onChange={(e) => setForm({ ...form, timezone: e.target.value })}
            />
          </Field>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="LinkedIn URL">
            <Input
              value={form.linkedin_url}
              onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })}
            />
          </Field>
          <Field label="Website URL">
            <Input
              value={form.website_url}
              onChange={(e) => setForm({ ...form, website_url: e.target.value })}
            />
          </Field>
        </div>

        {form.orbit_segment && (
          <div className="space-y-4 rounded-2xl border border-border bg-muted/30 p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--saffron)]">
                {SEGMENT_META[form.orbit_segment].label} social details
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                These become the public snapshot cards that make the profile feel useful.
              </p>
            </div>
            <SegmentDetailsForm
              segment={form.orbit_segment}
              value={details}
              onChange={setDetails}
            />

            {form.orbit_segment === "expert" && (
              <div className="border-t border-border pt-4">
                <Field label="Mentorship booking URL">
                  <Input
                    placeholder="https://calendly.com/your-link"
                    value={form.booking_url}
                    onChange={(e) => setForm({ ...form, booking_url: e.target.value })}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Used when you accept mentorship requests.
                  </p>
                </Field>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3 rounded-2xl bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">Show in public directory</p>
            <p className="text-sm text-muted-foreground">
              Other visitors can discover your social profile and activity.
            </p>
          </div>
          <Switch
            checked={form.is_public}
            onCheckedChange={(v) => setForm({ ...form, is_public: v })}
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border bg-muted/40 p-4">
            <h3 className="text-lg font-semibold">Notification preferences</h3>
            <p className="text-sm text-muted-foreground">
              Manage alerts for connection, mentorship, and community flows.
            </p>
          </div>
          <div className="divide-y divide-border">
            {Object.entries(form.notification_prefs || defaultPrefs).map(([key, prefs]) => (
              <div
                key={key}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <p className="font-medium capitalize">{key.replace("_", " ")}</p>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs uppercase text-muted-foreground">In-app</Label>
                    <Switch
                      checked={prefs.in_app}
                      onCheckedChange={(v) =>
                        setForm((prev) => ({
                          ...prev,
                          notification_prefs: {
                            ...prev.notification_prefs,
                            [key]: { ...prefs, in_app: v },
                          },
                        }))
                      }
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs uppercase text-muted-foreground">Email</Label>
                    <Switch
                      checked={prefs.email}
                      onCheckedChange={(v) =>
                        setForm((prev) => ({
                          ...prev,
                          notification_prefs: {
                            ...prev.notification_prefs,
                            [key]: { ...prefs, email: v },
                          },
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="sticky bottom-3 z-20 flex justify-end border-t border-border/70 bg-card/75 pt-4 backdrop-blur-xl sm:static sm:border-0 sm:bg-transparent sm:p-0">
          <Button type="submit" disabled={busy} className="w-full rounded-full sm:w-auto">
            {busy ? "Saving..." : "Save profile"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
    </div>
  );
}

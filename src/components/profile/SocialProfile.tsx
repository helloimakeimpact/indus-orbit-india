import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Award,
  BadgeCheck,
  CalendarDays,
  ExternalLink,
  Globe2,
  Linkedin,
  MapPin,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VerifiedBadge } from "@/components/auth/VerifiedBadge";
import { SEGMENT_META, type Segment } from "@/components/auth/segments";
import { formatProfileLocation } from "@/lib/location";
import { cn } from "@/lib/utils";

export type SocialProfileRecord = {
  user_id: string;
  display_name: string | null;
  headline: string | null;
  bio: string | null;
  avatar_url: string | null;
  city: string | null;
  country: string | null;
  region?: string | null;
  timezone?: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  booking_url?: string | null;
  orbit_segment: Segment | null;
  is_public?: boolean;
  is_verified: boolean;
  verified_at?: string | null;
  created_at?: string | null;
  segment_details?: Record<string, unknown> | null;
};

export type ProfileStat = {
  label: string;
  value: string | number;
  detail?: string;
  icon?: LucideIcon;
};

export type ProfileActivityItem = {
  id: string;
  type: "mission" | "chapter" | "post" | "story" | "event" | "mentor" | "endorsement";
  title: string;
  subtitle?: string | null;
  body?: string | null;
  date?: string | null;
  href?: string;
  status?: string | null;
  emoji?: string;
};

type SegmentHighlight = {
  label: string;
  value: string;
  emoji: string;
};

const ACTIVITY_TABS = [
  { value: "all", label: "All", emoji: "✨" },
  { value: "mission", label: "Missions", emoji: "🚀" },
  { value: "chapter", label: "Chapters", emoji: "🌍" },
  { value: "post", label: "Posts", emoji: "📣" },
  { value: "story", label: "Stories", emoji: "📖" },
  { value: "event", label: "Events", emoji: "🗓️" },
  { value: "mentor", label: "Mentor", emoji: "🧭" },
] as const;

function getProfileName(profile: Pick<SocialProfileRecord, "display_name" | "user_id">) {
  return profile.display_name?.trim() || "Orbit member";
}

function getProfileInitials(profile: Pick<SocialProfileRecord, "display_name" | "user_id">) {
  const name = getProfileName(profile);
  const parts = name.split(/\s+/).filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((p) => p[0])
    .join("");
  return (initials || "?").toUpperCase();
}

function formatDate(value?: string | null) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function humanizeKey(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace("Org", "Org");
}

function stringifyValue(value: unknown) {
  if (value == null || value === "") return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  if (typeof value === "object") return "";
  return String(value).replace(/_/g, " ");
}

function segmentHighlightConfig(segment: Segment | null) {
  switch (segment) {
    case "founder":
      return [
        ["company", "Company", "🏢"],
        ["stage", "Stage", "📈"],
        ["sector", "Sector", "🧭"],
        ["looking_for", "Looking for", "🤝"],
        ["fundraising", "Fundraising", "💰"],
      ] as const;
    case "expert":
      return [
        ["years", "Experience", "🏅"],
        ["industries", "Industries", "🏭"],
        ["hours_per_month", "Time/month", "⏱️"],
      ] as const;
    case "investor":
      return [
        ["firm", "Firm", "🏦"],
        ["ticket", "Ticket", "💸"],
        ["stages", "Stages", "📊"],
        ["sectors", "Sectors", "🧭"],
      ] as const;
    case "youth":
      return [
        ["stage", "Journey", "🎓"],
        ["craft", "Craft", "🛠️"],
        ["learn", "Learning", "🌱"],
      ] as const;
    case "diaspora":
      return [
        ["residence", "Based in", "🌍"],
        ["contribution", "Can contribute", "🤲"],
        ["connection", "India connection", "🧡"],
      ] as const;
    case "partner":
      return [
        ["org", "Organisation", "🏢"],
        ["org_type", "Type", "🧩"],
        ["partnership", "Partnership", "🤝"],
      ] as const;
    case "researcher":
      return [
        ["affiliation", "Affiliation", "🔬"],
        ["field", "Field", "📚"],
        ["focus", "Current focus", "🎯"],
        ["collab", "Collaborating", "🤝"],
      ] as const;
    default:
      return [] as const;
  }
}

function getSegmentHighlights(profile: SocialProfileRecord): SegmentHighlight[] {
  const details = (profile.segment_details ?? {}) as Record<string, unknown>;
  const configured = segmentHighlightConfig(profile.orbit_segment)
    .map(([key, label, emoji]) => ({ label, value: stringifyValue(details[key]), emoji }))
    .filter((item) => item.value);

  if (configured.length) return configured.slice(0, 5);

  return Object.entries(details)
    .map(([key, value]) => ({ label: humanizeKey(key), value: stringifyValue(value), emoji: "✨" }))
    .filter((item) => item.value)
    .slice(0, 5);
}

export function ProfileIdentityHero({
  profile,
  actions,
  meta,
  compact = false,
}: {
  profile: SocialProfileRecord;
  actions?: ReactNode;
  meta?: ReactNode;
  compact?: boolean;
}) {
  const segment = profile.orbit_segment ? SEGMENT_META[profile.orbit_segment] : null;
  const SegmentIcon = segment?.icon;
  const location = formatProfileLocation(profile);

  return (
    <section className="app-glass relative overflow-hidden rounded-2xl p-4 sm:p-5">
      <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-[var(--saffron)]/55 to-transparent" />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
          <Avatar
            className={cn(
              "border border-white/70 bg-card shadow-sm ring-1 ring-border/70",
              compact ? "h-16 w-16" : "h-20 w-20 sm:h-24 sm:w-24",
            )}
          >
            <AvatarImage src={profile.avatar_url ?? undefined} />
            <AvatarFallback className="bg-[var(--indigo-night)] text-xl font-semibold text-[var(--parchment)]">
              {getProfileInitials(profile)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-semibold tracking-tight text-[var(--indigo-night)] sm:text-2xl">
                {getProfileName(profile)}
              </h1>
              {profile.is_verified && <VerifiedBadge size="md" />}
            </div>
            {profile.headline && (
              <p className="mt-1 max-w-2xl text-sm leading-6 text-foreground/75 sm:text-base">
                {profile.headline}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {segment && (
                <Badge className="gap-1 rounded-full bg-[var(--indigo-night)] px-2.5 py-1 text-[var(--parchment)]">
                  {SegmentIcon && <SegmentIcon className="h-3.5 w-3.5" />}
                  {segment.label}
                </Badge>
              )}
              {location && (
                <Badge variant="secondary" className="gap-1 rounded-full px-2.5 py-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {location}
                </Badge>
              )}
              {profile.is_public !== undefined && (
                <Badge variant="outline" className="rounded-full px-2.5 py-1">
                  {profile.is_public ? "🌐 Public" : "🔒 Private"}
                </Badge>
              )}
            </div>
          </div>
        </div>
        {actions && <div className="flex flex-wrap gap-2 lg:justify-end">{actions}</div>}
      </div>
      {meta && <div className="mt-4 border-t border-border/70 pt-4">{meta}</div>}
    </section>
  );
}

function statHasValue(stat: ProfileStat) {
  if (typeof stat.value === "number") return stat.value > 0;
  return !["", "0", "0h"].includes(String(stat.value).trim().toLowerCase());
}

export function ProfileStatsStrip({
  stats,
  showZeroStats = false,
}: {
  stats: ProfileStat[];
  showZeroStats?: boolean;
}) {
  const visibleStats = showZeroStats ? stats : stats.filter(statHasValue);
  if (!visibleStats.length) return null;
  return (
    <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {visibleStats.map((stat) => {
        const Icon = stat.icon ?? Activity;
        return (
          <div key={stat.label} className="app-glass rounded-2xl p-3.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xl font-semibold text-[var(--indigo-night)]">{stat.value}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {stat.label}
                </p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--saffron)]/18 text-[var(--indigo-night)]">
                <Icon className="h-4 w-4" />
              </div>
            </div>
            {stat.detail && (
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{stat.detail}</p>
            )}
          </div>
        );
      })}
    </section>
  );
}

export function ProfileSegmentSnapshot({ profile }: { profile: SocialProfileRecord }) {
  const highlights = getSegmentHighlights(profile);
  const segment = profile.orbit_segment ? SEGMENT_META[profile.orbit_segment] : null;

  return (
    <section className="app-glass rounded-2xl p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-[var(--saffron)]" />
        <h2 className="text-base font-semibold">
          {segment ? `${segment.label} snapshot` : "Member snapshot"}
        </h2>
      </div>
      {segment && <p className="mt-1 text-sm text-muted-foreground">{segment.blurb}</p>}

      {highlights.length ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {highlights.map((item) => (
            <div key={item.label} className="rounded-2xl border border-border/70 bg-white/45 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {item.emoji} {item.label}
              </p>
              <p className="mt-1 text-sm font-medium capitalize text-foreground">{item.value}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          No segment details yet. Add a few specifics so people know how to connect.
        </p>
      )}
    </section>
  );
}

export function ProfileAboutCard({ profile }: { profile: SocialProfileRecord }) {
  return (
    <section className="app-glass rounded-2xl p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <UserRound className="h-4 w-4 text-[var(--saffron)]" />
        <h2 className="text-base font-semibold">About</h2>
      </div>
      {profile.bio ? (
        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-foreground/82">
          {profile.bio}
        </p>
      ) : (
        <p className="mt-3 rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          No bio yet. A good profile needs a short human story: what you do, why India, and what you
          are open to.
        </p>
      )}
    </section>
  );
}

export function ProfileLinksCard({ profile }: { profile: SocialProfileRecord }) {
  const links = [
    profile.linkedin_url ? { label: "LinkedIn", href: profile.linkedin_url, icon: Linkedin } : null,
    profile.website_url ? { label: "Website", href: profile.website_url, icon: Globe2 } : null,
    profile.booking_url
      ? { label: "Booking", href: profile.booking_url, icon: CalendarDays }
      : null,
  ].filter(Boolean) as Array<{ label: string; href: string; icon: LucideIcon }>;

  if (!links.length) return null;

  return (
    <section className="app-glass rounded-2xl p-4">
      <h2 className="text-base font-semibold">Links</h2>
      <div className="mt-3 flex flex-col gap-2">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-white/45 px-3 py-2 text-sm font-medium transition hover:bg-white/70"
            >
              <span className="flex min-w-0 items-center gap-2">
                <Icon className="h-4 w-4 text-[var(--indigo-night)]" />
                <span className="truncate">{link.label}</span>
              </span>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            </a>
          );
        })}
      </div>
    </section>
  );
}

export function ProfileTrustCard({
  profile,
  endorsementCount,
  qrDataUrl,
}: {
  profile: SocialProfileRecord;
  endorsementCount?: number;
  qrDataUrl?: string;
}) {
  return (
    <section className="app-glass rounded-2xl p-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-[var(--saffron)]" />
        <h2 className="text-base font-semibold">Trust layer</h2>
      </div>
      <div className="mt-4 grid gap-2">
        <div className="rounded-2xl border border-border/70 bg-white/45 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Verification
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-medium">
            {profile.is_verified ? (
              <>
                <BadgeCheck className="h-4 w-4 text-[var(--saffron)]" />
                Verified member
              </>
            ) : (
              "Not verified yet"
            )}
          </p>
          {profile.verified_at && (
            <p className="mt-1 text-xs text-muted-foreground">
              Since {formatDate(profile.verified_at)}
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-border/70 bg-white/45 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Endorsements
          </p>
          <p className="mt-1 text-sm font-medium">
            {endorsementCount ?? 0} member signal{endorsementCount === 1 ? "" : "s"}
          </p>
        </div>
        {qrDataUrl && (
          <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-white/45 p-3">
            <img src={qrDataUrl} alt="Profile QR" className="h-14 w-14 rounded-lg bg-white p-1" />
            <div>
              <p className="text-sm font-medium">Shareable trust card</p>
              <p className="text-xs text-muted-foreground">Scan to open this profile.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export function ProfileActivityTabs({ items }: { items: ProfileActivityItem[] }) {
  const sorted = [...items].sort(
    (a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime(),
  );
  const tabs = ACTIVITY_TABS.filter(
    (tab) => tab.value === "all" || sorted.some((item) => item.type === tab.value),
  );

  return (
    <section className="app-glass rounded-2xl p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Activity</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            What this member is building, joining, publishing, and offering.
          </p>
        </div>
        <Badge variant="secondary" className="rounded-full">
          {items.length} items
        </Badge>
      </div>

      <Tabs defaultValue="all">
        <TabsList className="app-sidebar-scroll mb-3 flex h-auto w-full justify-start gap-1 overflow-x-auto rounded-full bg-white/45 p-1">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="rounded-full px-3 text-xs">
              {tab.emoji} {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((tab) => {
          const visible =
            tab.value === "all" ? sorted : sorted.filter((item) => item.type === tab.value);
          return (
            <TabsContent key={tab.value} value={tab.value} className="mt-0">
              <ActivityList items={visible} />
            </TabsContent>
          );
        })}
      </Tabs>
    </section>
  );
}

function ActivityList({ items }: { items: ProfileActivityItem[] }) {
  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
        No public activity here yet.
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {items.map((item) => (
        <article
          key={`${item.type}-${item.id}`}
          className="rounded-2xl border border-border/70 bg-white/45 p-3 transition hover:bg-white/70"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {item.emoji ?? "✨"} {item.type}
                {item.status ? ` · ${item.status}` : ""}
              </p>
              {item.href ? (
                <a
                  href={item.href}
                  className="mt-1 block truncate text-sm font-semibold text-[var(--indigo-night)] hover:underline"
                >
                  {item.title}
                </a>
              ) : (
                <h3 className="mt-1 truncate text-sm font-semibold">{item.title}</h3>
              )}
              {item.subtitle && (
                <p className="mt-1 text-xs text-muted-foreground">{item.subtitle}</p>
              )}
              {item.body && (
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-foreground/75">
                  {item.body}
                </p>
              )}
            </div>
            {item.date && (
              <span className="shrink-0 text-[11px] text-muted-foreground">
                {formatDate(item.date)}
              </span>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

export function ProfileCompletionCard({ profile }: { profile: SocialProfileRecord }) {
  const fields = [
    profile.display_name,
    profile.avatar_url,
    profile.headline,
    profile.bio,
    profile.city || profile.country,
    profile.orbit_segment,
    profile.linkedin_url || profile.website_url,
    getSegmentHighlights(profile).length ? "details" : "",
  ];
  const complete = fields.filter(Boolean).length;
  const pct = Math.round((complete / fields.length) * 100);

  return (
    <section className="app-glass rounded-2xl p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Profile strength</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A social profile works best when it shows identity, proof, and current intent.
          </p>
        </div>
        <span className="text-2xl font-semibold text-[var(--indigo-night)]">{pct}%</span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-foreground/10">
        <div className="h-full rounded-full bg-[var(--saffron)]" style={{ width: `${pct}%` }} />
      </div>
    </section>
  );
}

export function ProfileQuickProof({
  endorsementCount,
  missionCount,
  chapterCount,
}: {
  endorsementCount: number;
  missionCount: number;
  chapterCount: number;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <div className="rounded-2xl border border-border/70 bg-white/45 p-3">
        <Award className="h-4 w-4 text-[var(--saffron)]" />
        <p className="mt-2 text-sm font-semibold">{endorsementCount} endorsements</p>
      </div>
      <div className="rounded-2xl border border-border/70 bg-white/45 p-3">
        <Activity className="h-4 w-4 text-[var(--saffron)]" />
        <p className="mt-2 text-sm font-semibold">{missionCount} missions</p>
      </div>
      <div className="rounded-2xl border border-border/70 bg-white/45 p-3">
        <Globe2 className="h-4 w-4 text-[var(--saffron)]" />
        <p className="mt-2 text-sm font-semibold">{chapterCount} chapters</p>
      </div>
    </div>
  );
}

export function ProfileActionButton({
  children,
  onClick,
  variant = "default",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "default" | "outline" | "secondary";
}) {
  return (
    <Button onClick={onClick} variant={variant} className="min-h-10 rounded-full px-4">
      {children}
    </Button>
  );
}

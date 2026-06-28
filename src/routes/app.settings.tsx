import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  Bell,
  ChevronRight,
  LogOut,
  MessageSquare,
  Palette,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/settings")({
  head: () => ({
    meta: [{ title: "Settings — Indus Orbit" }, { name: "robots", content: "noindex" }],
  }),
  component: SettingsPage,
});

const SETTINGS_KEY = "indus-orbit:settings";
const SIDEBAR_KEY = "indus-orbit:sidebar-expanded";

type AppPrefs = {
  sidebarExpanded: boolean;
  compactMode: boolean;
  glassSurfaces: boolean;
  reduceMotion: boolean;
  quietNotifications: boolean;
};

const defaultPrefs: AppPrefs = {
  sidebarExpanded: false,
  compactMode: true,
  glassSurfaces: true,
  reduceMotion: false,
  quietNotifications: false,
};

function readPrefs(): AppPrefs {
  if (typeof window === "undefined") return defaultPrefs;
  try {
    const stored = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) ?? "{}");
    const legacySidebar = window.localStorage.getItem(SIDEBAR_KEY);
    return {
      ...defaultPrefs,
      ...stored,
      sidebarExpanded:
        legacySidebar == null
          ? (stored.sidebarExpanded ?? defaultPrefs.sidebarExpanded)
          : legacySidebar === "true",
    };
  } catch {
    return defaultPrefs;
  }
}

function persistPrefs(next: AppPrefs) {
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  window.localStorage.setItem(SIDEBAR_KEY, String(next.sidebarExpanded));
  window.dispatchEvent(new CustomEvent("indus-orbit:settings-change"));
}

function SettingsPage() {
  const { user, signOut, isAdmin, isChapterLead, isMissionLead, userSegment } = useAuth();
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState<AppPrefs>(readPrefs);

  useEffect(() => {
    const syncPrefs = () => setPrefs(readPrefs());
    window.addEventListener("storage", syncPrefs);
    window.addEventListener("indus-orbit:settings-change", syncPrefs);
    return () => {
      window.removeEventListener("storage", syncPrefs);
      window.removeEventListener("indus-orbit:settings-change", syncPrefs);
    };
  }, []);

  const updatePref = <K extends keyof AppPrefs>(key: K, value: AppPrefs[K]) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    persistPrefs(next);
  };

  const resetPrefs = () => {
    setPrefs(defaultPrefs);
    persistPrefs(defaultPrefs);
  };

  const roles = [
    userSegment ? `${userSegment}` : null,
    isAdmin ? "admin" : null,
    isChapterLead ? "chapter lead" : null,
    isMissionLead ? "mission lead" : null,
  ].filter(Boolean);

  return (
    <div className="mx-auto w-full max-w-none space-y-4">
      <section className="app-glass app-workspace-head rounded-2xl">
        <div className="app-workspace-head-main">
          <div className="app-workspace-title">
            <p className="app-workspace-kicker">⚙️ Settings</p>
            <h1>Workspace preferences</h1>
            <p>Tune the Orbit interface, account shortcuts, and local workspace behavior.</p>
          </div>
          <div className="flex justify-start lg:justify-end">
            <Badge variant="secondary" className="gap-1 rounded-full px-3 py-1">
              💾 Local
            </Badge>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <SettingsSection
            emoji="🎛️"
            title="Interface"
            description="Keep the app clean, dense, and easy to scan."
          >
            <SettingToggle
              emoji="↔️"
              title="Expand sidebar by default"
              description="Open desktop navigation with labels next to icons."
              checked={prefs.sidebarExpanded}
              onCheckedChange={(checked) => updatePref("sidebarExpanded", checked)}
            />
            <SettingToggle
              emoji="📐"
              title="Compact workspace"
              description="Reduce page padding and keep content closer together."
              checked={prefs.compactMode}
              onCheckedChange={(checked) => updatePref("compactMode", checked)}
            />
            <SettingToggle
              emoji="🪟"
              title="Glass surfaces"
              description="Use the branded glassmorphic panels across app pages."
              checked={prefs.glassSurfaces}
              onCheckedChange={(checked) => updatePref("glassSurfaces", checked)}
            />
            <SettingToggle
              emoji="🌙"
              title="Reduce motion"
              description="Minimize animated transitions in the app shell."
              checked={prefs.reduceMotion}
              onCheckedChange={(checked) => updatePref("reduceMotion", checked)}
            />
          </SettingsSection>

          <SettingsSection
            emoji="🔔"
            title="Notifications"
            description="Shortcuts for connection, message, and update flows."
          >
            <SettingToggle
              emoji="🤫"
              title="Quiet notification styling"
              description="Keep local notification surfaces calm and less visually loud."
              checked={prefs.quietNotifications}
              onCheckedChange={(checked) => updatePref("quietNotifications", checked)}
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <ActionLink
                to="/app/notifications"
                icon={<Bell className="h-4 w-4" />}
                title="🔔 Notification center"
                detail="Review recent alerts"
              />
              <ActionLink
                to="/app/messages"
                icon={<MessageSquare className="h-4 w-4" />}
                title="💬 Messages"
                detail="Open conversations"
              />
            </div>
          </SettingsSection>

          <SettingsSection
            emoji="🧭"
            title="Orbit controls"
            description="Jump to the places that shape your member presence."
          >
            <div className="grid gap-2 sm:grid-cols-2">
              <ActionLink
                to="/app/profile"
                icon={<UserRound className="h-4 w-4" />}
                title="👤 Profile"
                detail="Public info and links"
              />
              <ActionLink
                to="/app/vouch"
                icon={<ShieldCheck className="h-4 w-4" />}
                title="🛡️ Vouch"
                detail="Trust and verification"
              />
              <ActionLink
                to="/app/mentor"
                icon={<SlidersHorizontal className="h-4 w-4" />}
                title="🧭 Mentorship"
                detail="Sessions and expertise"
              />
              <ActionLink
                to="/app/soda"
                icon={<Sparkles className="h-4 w-4" />}
                title="💡 S.O.D.A"
                detail="Opportunity signals"
              />
            </div>
          </SettingsSection>
        </div>

        <aside className="space-y-4">
          <section className="app-glass rounded-2xl p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--saffron)] text-sm font-semibold text-[var(--indigo-night)]">
                {(user?.email ?? "?").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">👋 Account</p>
                <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            {roles.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {roles.map((role) => (
                  <Badge key={role} variant="secondary" className="rounded-full capitalize">
                    {role}
                  </Badge>
                ))}
              </div>
            )}
          </section>

          <section className="app-glass rounded-2xl p-4">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-[var(--saffron)]" />
              <h2 className="text-sm font-semibold">🎨 Current feel</h2>
            </div>
            <dl className="mt-3 space-y-2 text-xs">
              <SettingStat label="Sidebar" value={prefs.sidebarExpanded ? "Expanded" : "Rail"} />
              <SettingStat label="Density" value={prefs.compactMode ? "Compact" : "Comfortable"} />
              <SettingStat label="Glass" value={prefs.glassSurfaces ? "On" : "Off"} />
            </dl>
          </section>

          <section className="app-glass rounded-2xl p-4">
            <h2 className="text-sm font-semibold">🧹 Session</h2>
            <div className="mt-3 flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetPrefs}
                className="justify-start"
              >
                Reset local preferences
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="justify-start text-destructive hover:text-destructive"
                onClick={async () => {
                  await signOut();
                  navigate({ to: "/" });
                }}
              >
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function SettingsSection({
  emoji,
  title,
  description,
  children,
}: {
  emoji: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="app-glass rounded-2xl p-4">
      <div className="mb-3">
        <h2 className="text-base font-semibold">
          {emoji} {title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="divide-y divide-border">{children}</div>
    </section>
  );
}

function SettingToggle({
  emoji,
  title,
  description,
  checked,
  onCheckedChange,
}: {
  emoji: string;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-sm font-medium">
          {emoji} {title}
        </p>
        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function ActionLink({
  to,
  icon,
  title,
  detail,
}: {
  to: string;
  icon: ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <Button
      asChild
      variant="outline"
      className="h-auto justify-between rounded-2xl px-3 py-3 text-left"
    >
      <Link to={to}>
        <span className="flex min-w-0 items-center gap-2">
          <span className="text-[var(--saffron)]">{icon}</span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{title}</span>
            <span className="block truncate text-xs font-normal text-muted-foreground">
              {detail}
            </span>
          </span>
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Link>
    </Button>
  );
}

function SettingStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "rounded-full px-2 py-0.5 font-medium",
          value === "Off"
            ? "bg-muted text-muted-foreground"
            : "bg-[var(--indigo-night)]/10 text-[var(--indigo-night)]",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

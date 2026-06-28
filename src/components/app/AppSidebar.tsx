import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Home, Users, User as UserIcon, Shield, UserCog, LogOut, Menu, Megaphone, LayoutDashboard, ClipboardList, Flag, ScrollText, ShieldCheck, KeyRound, CalendarClock, TrendingUp, Globe2, BookOpen, MapPin, CalendarDays, Compass, Target, Sparkles, FileCheck, GraduationCap, Lightbulb, Settings, PanelLeftOpen, PanelLeftClose } from "lucide-react";
import logo from "@/assets/indus-orbit-logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";

const SETTINGS_KEY = "indus-orbit:settings";
const SIDEBAR_KEY = "indus-orbit:sidebar-expanded";

type Item = { to: string; label: string; icon: typeof Home; admin?: boolean };
type Surface = "dark" | "light";

const defaultPrefs = {
  sidebarExpanded: false,
};

const ITEMS: Item[] = [
  { to: "/app", label: "Home", icon: Home },
  { to: "/app/directory", label: "Network", icon: Users },
  { to: "/app/board", label: "Board", icon: Megaphone },
  { to: "/app/missions", label: "India Missions", icon: Globe2 },
  { to: "/app/chapters", label: "Chapters", icon: MapPin },
  { to: "/app/events", label: "Events", icon: CalendarDays },
  { to: "/app/stories", label: "Stories", icon: BookOpen },
  { to: "/app/education", label: "Academy", icon: GraduationCap },
  { to: "/app/soda", label: "S.O.D.A List", icon: Lightbulb },
  { to: "/app/vouch", label: "Vouch", icon: ShieldCheck },
  { to: "/app/mentor", label: "Mentorship", icon: CalendarClock },
  { to: "/app/profile", label: "My profile", icon: UserIcon },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

const ADMIN_ITEMS: Item[] = [
  { to: "/app/admin", label: "Dashboard", icon: LayoutDashboard, admin: true },
  { to: "/app/admin/queue", label: "Queue", icon: ClipboardList, admin: true },
  { to: "/app/admin/vouches", label: "Vouches", icon: KeyRound, admin: true },
  { to: "/app/admin/reports", label: "Reports", icon: Flag, admin: true },
  { to: "/app/admin/audit", label: "Audit log", icon: ScrollText, admin: true },
  { to: "/app/admin/members", label: "Members", icon: Shield, admin: true },
  { to: "/app/admin/roles", label: "Roles", icon: UserCog, admin: true },
  { to: "/app/admin/spotlights", label: "Spotlights", icon: Sparkles, admin: true },
  { to: "/app/admin/content", label: "Content", icon: FileCheck, admin: true },
  { to: "/app/admin/education", label: "Education", icon: GraduationCap, admin: true },
  { to: "/app/admin/soda", label: "S.O.D.A ideas", icon: Lightbulb, admin: true },
];

function readSidebarPrefs() {
  if (typeof window === "undefined") return defaultPrefs;
  try {
    const stored = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) ?? "{}");
    const legacySidebar = window.localStorage.getItem(SIDEBAR_KEY);
    return {
      ...defaultPrefs,
      ...stored,
      sidebarExpanded: legacySidebar == null ? stored.sidebarExpanded ?? defaultPrefs.sidebarExpanded : legacySidebar === "true",
    };
  } catch {
    return defaultPrefs;
  }
}

function saveSidebarExpanded(expanded: boolean) {
  if (typeof window === "undefined") return;
  let stored = {};
  try {
    stored = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) ?? "{}");
  } catch {
    stored = {};
  }
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...stored, sidebarExpanded: expanded }));
  window.localStorage.setItem(SIDEBAR_KEY, String(expanded));
  window.dispatchEvent(new CustomEvent("indus-orbit:settings-change"));
}

function NavList({ pathname, onNavigate, expanded = true, surface = "dark" }: { pathname: string; onNavigate?: () => void; expanded?: boolean; surface?: Surface }) {
  const { isAdmin, isChapterLead, isMissionLead, userSegment } = useAuth();
  
  const navItems = [...ITEMS];
  if (userSegment === "investor") {
    const boardIndex = navItems.findIndex(i => i.to === "/app/board");
    navItems.splice(boardIndex + 1, 0, { to: "/app/investor-feed", label: "Deal Flow", icon: TrendingUp });
  }

  return (
    <nav className={cn("flex flex-col", expanded ? "gap-0.5" : "items-center gap-1")}>
      {navItems.map((item) => (
        <NavRow
          key={item.to}
          item={item}
          active={pathname === item.to}
          onClick={onNavigate}
          expanded={expanded}
          surface={surface}
        />
      ))}
      {(isChapterLead || isMissionLead) && (
        <>
          {expanded ? (
            <p className={cn("mb-1 mt-2 px-2.5 text-[10px] font-semibold uppercase tracking-[0.16em]", surface === "dark" ? "text-[var(--parchment)]/40" : "text-muted-foreground")}>
              Lead workspace
            </p>
          ) : (
            <div className="my-1.5 h-px w-7 bg-border" />
          )}
          {isChapterLead && (
            <NavRow
              item={{ to: "/app/chapter-admin", label: "Chapter admin", icon: Compass }}
              active={pathname.startsWith("/app/chapter-admin")}
              onClick={onNavigate}
              expanded={expanded}
              surface={surface}
            />
          )}
          {isMissionLead && (
            <NavRow
              item={{ to: "/app/mission-admin", label: "Mission admin", icon: Target }}
              active={pathname.startsWith("/app/mission-admin")}
              onClick={onNavigate}
              expanded={expanded}
              surface={surface}
            />
          )}
        </>
      )}
      {isAdmin && (
        <>
          {expanded ? (
            <p className={cn("mb-1 mt-2 px-2.5 text-[10px] font-semibold uppercase tracking-[0.16em]", surface === "dark" ? "text-[var(--parchment)]/40" : "text-muted-foreground")}>
              Admin
            </p>
          ) : (
            <div className="my-1.5 h-px w-7 bg-border" />
          )}
          {ADMIN_ITEMS.map((item) => (
            <NavRow
              key={item.to}
              item={item}
              active={item.to === "/app/admin" ? pathname === "/app/admin" : pathname.startsWith(item.to)}
              onClick={onNavigate}
              expanded={expanded}
              surface={surface}
            />
          ))}
        </>
      )}
    </nav>
  );
}

function NavRow({
  item,
  active,
  onClick,
  badgeCount = 0,
  expanded = true,
  surface = "dark",
}: {
  item: Item;
  active: boolean;
  onClick?: () => void;
  badgeCount?: number;
  expanded?: boolean;
  surface?: Surface;
}) {
  const Icon = item.icon;
  const darkExpanded = expanded && surface === "dark";
  const lightExpanded = expanded && surface === "light";
  return (
    <Link
      to={item.to}
      onClick={onClick}
      aria-label={item.label}
      title={expanded ? undefined : item.label}
      className={cn(
        "group relative font-medium transition",
        expanded
          ? "flex h-9 items-center justify-between gap-2 rounded-xl px-2.5 text-[13px]"
          : "flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground",
        active && darkExpanded && "bg-[var(--parchment)]/10 text-[var(--parchment)] shadow-sm",
        !active && darkExpanded && "text-[var(--parchment)]/70 hover:bg-[var(--parchment)]/5 hover:text-[var(--parchment)]",
        active && lightExpanded && "bg-white/80 text-[var(--indigo-night)] shadow-sm ring-1 ring-border/70",
        !active && lightExpanded && "text-muted-foreground hover:bg-white/55 hover:text-foreground",
        active && !expanded && "bg-white/80 text-[var(--indigo-night)] shadow-sm ring-1 ring-border/70",
        !active && !expanded && "hover:bg-white/65 hover:text-foreground",
      )}
    >
      <div className={cn("flex items-center", expanded ? "gap-3" : "justify-center")}>
        {active && (
          <span
            className={cn(
              "absolute top-1/2 -translate-y-1/2 rounded-r bg-[var(--saffron)]",
              expanded ? "left-0 h-4 w-0.5" : "-left-2 h-5 w-0.5",
            )}
          />
        )}
        <Icon className="h-[17px] w-[17px] shrink-0" />
        {expanded && <span className="truncate">{item.label}</span>}
      </div>
      {badgeCount > 0 && expanded && (
        <span className="flex h-5 items-center justify-center rounded-full bg-[var(--saffron)] px-2 text-[10px] font-bold text-[var(--indigo-night)]">
          {badgeCount}
        </span>
      )}
      {badgeCount > 0 && !expanded && (
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[var(--saffron)]" />
      )}
    </Link>
  );
}

function SidebarBody({
  pathname,
  onNavigate,
  expanded = true,
  surface = "dark",
  onToggleExpanded,
  contained = false,
}: {
  pathname: string;
  onNavigate?: () => void;
  expanded?: boolean;
  surface?: Surface;
  onToggleExpanded?: () => void;
  contained?: boolean;
}) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const initial = (user?.email ?? "?").charAt(0).toUpperCase();
  const isDark = surface === "dark";

  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 flex-col overflow-hidden",
        isDark
          ? "bg-[var(--indigo-night)] text-[var(--parchment)]"
          : "app-rail border-r border-border/80 text-foreground",
        contained && "rounded-[1.35rem] border border-white/60 shadow-2xl",
      )}
    >
      <div className={cn("flex h-14 shrink-0 items-center", expanded ? "gap-2 px-3" : "justify-center px-2")}>
        <Link
          to="/app"
          onClick={onNavigate}
          aria-label="Indus Orbit home"
          className={cn("flex min-w-0 items-center", expanded ? "flex-1 gap-2" : "justify-center")}
        >
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
              isDark ? "bg-[var(--parchment)]/8" : "border border-border/80 bg-white/75 shadow-sm",
            )}
          >
            <img src={logo} alt="Indus Orbit" className="pixelated h-6 w-6" />
          </span>
          {expanded && <span className="truncate text-[15px] font-semibold tracking-tight">Indus Orbit</span>}
        </Link>

        {onToggleExpanded && expanded && (
          <button
            type="button"
            aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
            title={expanded ? "Collapse sidebar" : "Expand sidebar"}
            onClick={onToggleExpanded}
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-medium transition",
              isDark
                ? "bg-[var(--parchment)]/8 text-[var(--parchment)]/75 hover:bg-[var(--parchment)]/12 hover:text-[var(--parchment)]"
                : "bg-white/65 text-muted-foreground ring-1 ring-border/70 hover:bg-white hover:text-foreground",
            )}
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {onToggleExpanded && !expanded && (
        <div className="mb-1 flex justify-center">
          <button
            type="button"
            aria-label="Expand sidebar"
            title="Expand sidebar"
            onClick={onToggleExpanded}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/65 text-muted-foreground ring-1 ring-border/70 transition hover:bg-white hover:text-foreground"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className={cn("app-sidebar-scroll min-h-0 flex-1 overflow-y-auto pb-2", expanded ? "px-2" : "w-full px-1.5")}>
        <NavList pathname={pathname} onNavigate={onNavigate} expanded={expanded} surface={surface} />
      </div>

      <div className={cn("shrink-0 p-2", expanded && isDark ? "border-t border-[var(--parchment)]/10" : "w-full border-t border-border/80")}>
        {expanded ? (
          <div className={cn("flex items-center gap-2 rounded-xl p-2", isDark ? "bg-[var(--parchment)]/5" : "bg-white/55 ring-1 ring-border/60")}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--saffron)] text-xs font-semibold text-[var(--indigo-night)]">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className={cn("truncate text-xs font-medium", isDark ? "text-[var(--parchment)]" : "text-foreground")}>{user?.email}</p>
            </div>
            <button
              type="button"
              aria-label="Sign out"
              onClick={async () => {
                await signOut();
                navigate({ to: "/" });
              }}
              className={cn(
                "rounded-xl p-1.5 transition",
                isDark
                  ? "text-[var(--parchment)]/70 hover:bg-[var(--parchment)]/10 hover:text-[var(--parchment)]"
                  : "text-muted-foreground hover:bg-card hover:text-foreground",
              )}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <div
              title={user?.email ?? "Account"}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--saffron)] text-xs font-semibold text-[var(--indigo-night)]"
            >
              {initial}
            </div>
            <button
              type="button"
              aria-label="Sign out"
              title="Sign out"
              onClick={async () => {
                await signOut();
                navigate({ to: "/" });
              }}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-white/70 hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function AppSidebar() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState(readSidebarPrefs);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const syncPrefs = () => setPrefs(readSidebarPrefs());
    window.addEventListener("storage", syncPrefs);
    window.addEventListener("indus-orbit:settings-change", syncPrefs);
    return () => {
      window.removeEventListener("storage", syncPrefs);
      window.removeEventListener("indus-orbit:settings-change", syncPrefs);
    };
  }, []);

  const desktopExpanded = prefs.sidebarExpanded;

  return (
    <>
      {/* Desktop */}
      <aside className={cn("hidden md:flex md:flex-shrink-0", desktopExpanded ? "md:w-[216px]" : "md:w-[68px]")}>
        <div className={cn("fixed inset-y-0 left-0", desktopExpanded ? "w-[216px]" : "w-[68px]")}>
          <SidebarBody
            pathname={pathname}
            expanded={desktopExpanded}
            surface="light"
            onToggleExpanded={() => saveSidebarExpanded(!desktopExpanded)}
          />
        </div>
      </aside>

      {/* Mobile trigger */}
      <button
        type="button"
        aria-label="Open menu"
        onClick={() => setOpen(true)}
        className="app-mobile-menu fixed left-2.5 top-2.5 z-40 inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--indigo-night)] md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[min(88vw,320px)] border-0 bg-transparent p-2 text-foreground shadow-none sm:p-2">
          <SidebarBody pathname={pathname} onNavigate={() => setOpen(false)} surface="light" expanded contained />
        </SheetContent>
      </Sheet>
    </>
  );
}

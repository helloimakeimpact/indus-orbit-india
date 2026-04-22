import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { Home, Users, User as UserIcon, Shield, UserCog, LogOut, Menu, X } from "lucide-react";
import logo from "@/assets/indus-orbit-logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";

type Item = { to: string; label: string; icon: typeof Home; admin?: boolean };

const ITEMS: Item[] = [
  { to: "/app", label: "Home", icon: Home },
  { to: "/app/directory", label: "Directory", icon: Users },
  { to: "/app/profile", label: "My profile", icon: UserIcon },
];

const ADMIN_ITEMS: Item[] = [
  { to: "/app/admin/members", label: "Members", icon: Shield, admin: true },
  { to: "/app/admin/roles", label: "Roles", icon: UserCog, admin: true },
];

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const { isAdmin } = useAuth();
  return (
    <nav className="flex flex-col gap-0.5">
      {ITEMS.map((item) => (
        <NavRow key={item.to} item={item} active={pathname === item.to} onClick={onNavigate} />
      ))}
      {isAdmin && (
        <>
          <p className="mt-4 mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--parchment)]/40">
            Admin
          </p>
          {ADMIN_ITEMS.map((item) => (
            <NavRow key={item.to} item={item} active={pathname.startsWith(item.to)} onClick={onNavigate} />
          ))}
        </>
      )}
    </nav>
  );
}

function NavRow({ item, active, onClick }: { item: Item; active: boolean; onClick?: () => void }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      onClick={onClick}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
        active
          ? "bg-[var(--parchment)]/10 text-[var(--parchment)]"
          : "text-[var(--parchment)]/70 hover:bg-[var(--parchment)]/5 hover:text-[var(--parchment)]",
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r bg-[var(--saffron)]" />
      )}
      <Icon className="h-4 w-4" />
      {item.label}
    </Link>
  );
}

function SidebarBody({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const initial = (user?.email ?? "?").charAt(0).toUpperCase();

  return (
    <div className="flex h-full flex-col bg-[var(--indigo-night)] text-[var(--parchment)]">
      <Link to="/app" onClick={onNavigate} className="flex items-center gap-2.5 px-5 py-5">
        <img src={logo} alt="Indus Orbit" className="pixelated h-9 w-9" />
        <span className="font-display text-lg font-semibold tracking-tight">Indus Orbit</span>
      </Link>

      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <NavList pathname={pathname} onNavigate={onNavigate} />
      </div>

      <div className="border-t border-[var(--parchment)]/10 p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--saffron)] text-sm font-semibold text-[var(--indigo-night)]">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-[var(--parchment)]">{user?.email}</p>
          </div>
          <button
            type="button"
            aria-label="Sign out"
            onClick={async () => {
              await signOut();
              navigate({ to: "/" });
            }}
            className="rounded-lg p-2 text-[var(--parchment)]/70 transition hover:bg-[var(--parchment)]/10 hover:text-[var(--parchment)]"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function AppSidebar() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <>
      {/* Desktop */}
      <aside className="hidden md:flex md:w-64 md:flex-shrink-0">
        <div className="fixed inset-y-0 left-0 w-64">
          <SidebarBody pathname={pathname} />
        </div>
      </aside>

      {/* Mobile trigger */}
      <button
        type="button"
        aria-label="Open menu"
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-40 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--indigo-night)] text-[var(--parchment)] shadow-lg md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 border-0 bg-[var(--indigo-night)] p-0 text-[var(--parchment)]">
          <button
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute right-3 top-3 rounded-full p-2 text-[var(--parchment)]/70 hover:bg-[var(--parchment)]/10"
          >
            <X className="h-4 w-4" />
          </button>
          <SidebarBody pathname={pathname} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}

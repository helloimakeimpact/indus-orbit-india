import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X, LogOut, User as UserIcon, LayoutDashboard, ShieldCheck } from "lucide-react";
import logo from "@/assets/indus-orbit-logo.png";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const links = [
  { to: "/about", label: "About" },
  { to: "/our-work", label: "Our Work" },
  { to: "/writing", label: "Writing" },
  { to: "/members", label: "Members" },
  { to: "/contact", label: "Contact" },
] as const;

function ClockChip({ dark }: { dark: boolean }) {
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const fmt = new Intl.DateTimeFormat("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Kolkata",
      }).format(d);
      setTime(`${fmt} · DEL`);
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);
  return (
    <span
      className={cn(
        "hidden md:inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold tracking-wider uppercase",
        dark
          ? "bg-[var(--parchment)]/10 text-[var(--parchment)]"
          : "bg-[var(--indigo-night)]/5 text-[var(--indigo-night)]/80",
      )}
    >
      {time}
    </span>
  );
}

function UserMenu() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  const initial = (user.email ?? "?").charAt(0).toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Account menu"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--indigo-night)] text-sm font-semibold text-[var(--parchment)] hover:bg-[var(--saffron)] hover:text-[var(--indigo-night)] transition"
        >
          {initial}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="truncate text-xs text-muted-foreground">
          {user.email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate({ to: "/dashboard" })}>
          <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate({ to: "/profile" })}>
          <UserIcon className="mr-2 h-4 w-4" /> Profile
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem onClick={() => navigate({ to: "/admin" })}>
            <ShieldCheck className="mr-2 h-4 w-4" /> Admin
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={async () => {
            await signOut();
            navigate({ to: "/" });
          }}
        >
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SiteNav({ tone = "light" }: { tone?: "light" | "dark" }) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const dark = tone === "dark";
  return (
    <header className="fixed inset-x-0 top-4 z-50 px-4">
      <div
        className={cn(
          "mx-auto flex max-w-6xl items-center justify-between rounded-full px-4 py-2.5 shadow-lg",
          dark ? "glass-dark" : "glass-card",
        )}
      >
        <Link to="/" className="flex items-center gap-2.5">
          <img
            src={logo}
            alt="Indus Orbit"
            width={48}
            height={48}
            className="pixelated h-12 w-12"
          />
          <span className="font-display text-lg font-medium tracking-tight">
            Indus Orbit
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-full px-3 py-1.5 text-sm font-medium opacity-80 transition hover:bg-foreground/5 hover:opacity-100"
              activeProps={{ className: "rounded-full px-3 py-1.5 text-sm font-semibold opacity-100 bg-foreground/5" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <ClockChip dark={dark} />
          {user ? (
            <UserMenu />
          ) : (
            <Link
              to="/auth"
              className="hidden sm:inline-flex items-center rounded-full bg-[var(--indigo-night)] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--parchment)] transition hover:bg-[var(--saffron)] hover:text-[var(--indigo-night)]"
            >
              Join the Orbit
            </Link>
          )}
          <button
            type="button"
            aria-label="Toggle menu"
            className="md:hidden rounded-full p-2 hover:bg-foreground/10"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden mx-auto mt-2 max-w-6xl rounded-3xl glass-card p-3 shadow-xl">
          <nav className="flex flex-col">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="rounded-2xl px-4 py-3 text-sm font-medium hover:bg-foreground/5"
              >
                {l.label}
              </Link>
            ))}
            {!user && (
              <Link
                to="/auth"
                onClick={() => setOpen(false)}
                className="mt-1 rounded-2xl bg-[var(--indigo-night)] px-4 py-3 text-center text-sm font-semibold text-[var(--parchment)]"
              >
                Join the Orbit
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

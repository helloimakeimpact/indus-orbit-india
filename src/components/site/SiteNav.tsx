import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Menu,
  LogOut,
  User as UserIcon,
  LayoutDashboard,
  ShieldCheck,
  Terminal,
} from "lucide-react";
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

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const links = [
  { to: "/about", label: "About" },
  { to: "/our-work", label: "Our Work" },
  { to: "/models", label: "Models" },
  { to: "/cities", label: "Cities" },
  { to: "/io-port", label: "I/O Port" },
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
          className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[var(--indigo-night)] text-sm font-semibold text-[var(--parchment)] hover:bg-[var(--saffron)] hover:text-[var(--indigo-night)] transition"
        >
          {initial}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="truncate text-xs text-muted-foreground">
          {user.email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate({ to: "/io" })}>
          <Terminal className="mr-2 h-4 w-4" /> I/O Port
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate({ to: "/app" })}>
          <LayoutDashboard className="mr-2 h-4 w-4" /> Community
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate({ to: "/app/profile" })}>
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
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <header className="fixed inset-x-0 top-4 z-50 px-4">
        <div
          className={cn(
            "mx-auto flex max-w-6xl items-center justify-between rounded-full px-3 py-2.5 shadow-lg sm:px-4",
            dark ? "glass-dark" : "glass-card",
          )}
        >
          <Link to="/" className="flex items-center gap-2.5">
            <img
              src={logo}
              alt="Indus Orbit"
              width={48}
              height={48}
              className="pixelated h-9 w-9 sm:h-12 sm:w-12"
            />
            <span className="font-display text-base font-medium tracking-tight sm:text-lg">
              Indus Orbit
            </span>
          </Link>

          <nav aria-label="Primary" className="hidden lg:flex items-center gap-1">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="rounded-full px-3 py-1.5 text-sm font-medium opacity-80 transition hover:bg-foreground/5 hover:opacity-100"
                activeProps={{
                  "aria-current": "page",
                  className:
                    "rounded-full px-3 py-1.5 text-sm font-semibold opacity-100 bg-foreground/5",
                }}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <ClockChip dark={dark} />
            {user ? (
              <UserMenu />
            ) : (
              <Link
                to="/auth"
                search={{ tab: "signup", intent: "community", next: "/app" }}
                className="hidden sm:inline-flex items-center rounded-full bg-[var(--indigo-night)] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--parchment)] transition hover:bg-[var(--saffron)] hover:text-[var(--indigo-night)]"
              >
                Join the Orbit
              </Link>
            )}
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Open navigation"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
          </div>
        </div>
      </header>
      <SheetContent
        side="right"
        className="flex w-[calc(100vw-1rem)] max-w-sm flex-col gap-0 bg-card p-5"
      >
        <SheetHeader className="shrink-0 pr-10 text-left">
          <SheetTitle className="font-display text-xl">Explore Indus Orbit</SheetTitle>
          <SheetDescription>People, ideas and intelligence, built together.</SheetDescription>
        </SheetHeader>
        <nav
          aria-label="Mobile primary"
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-4"
        >
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center rounded-xl px-3 py-3 text-sm font-medium transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              activeProps={{ "aria-current": "page", className: "bg-muted font-semibold" }}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        {!user && (
          <Link
            to="/auth"
            search={{ tab: "signup", intent: "community", next: "/app" }}
            onClick={() => setOpen(false)}
            className="flex min-h-11 shrink-0 items-center justify-center rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Join the Orbit
          </Link>
        )}
      </SheetContent>
    </Sheet>
  );
}

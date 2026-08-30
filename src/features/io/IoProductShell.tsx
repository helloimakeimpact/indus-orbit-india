import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowUpRight, LogOut, Orbit, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import logo from "@/assets/indus-orbit-logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { IoWorkspaceShell } from "@/features/io/IoWorkspaceShell";
import { Button } from "@/components/ui/button";
import { useOrbitStore } from "@/features/orbit/OrbitStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function IoProductShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { connectionState } = useOrbitStore();
  const initial = (user?.email ?? "?").charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-[var(--indigo-night)] text-[var(--parchment)]">
      <header className="flex min-h-16 items-center justify-between gap-3 border-b border-white/10 px-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <Link to="/io" className="flex min-w-0 items-center gap-2.5" aria-label="I/O Port home">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--parchment)]/10 ring-1 ring-white/10">
              <img src={logo} alt="" className="pixelated h-6 w-6" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">I/O Port</span>
              <span className="hidden text-[10px] uppercase tracking-[0.16em] text-[var(--parchment)]/45 sm:block">
                An Indus Orbit product
              </span>
            </span>
          </Link>
          <span className="hidden rounded-full border border-[var(--saffron)]/25 bg-[var(--saffron)]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--saffron)] md:inline-flex">
            Preview
          </span>
        </div>

        <nav aria-label="Product switcher" className="flex items-center gap-1.5">
          {connectionState !== "online" ? (
            <span
              className="hidden rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-1 text-[10px] font-semibold text-amber-100 sm:inline-flex"
              role="status"
            >
              {connectionState === "offline" ? "Offline" : "Reconnecting"}
            </span>
          ) : null}
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="hidden text-[var(--parchment)]/70 hover:bg-white/10 hover:text-[var(--parchment)] sm:inline-flex"
          >
            <Link to="/io-port">
              About I/O <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-[var(--parchment)]/70 hover:bg-white/10 hover:text-[var(--parchment)]"
          >
            <Link to="/app">
              <Orbit className="mr-1.5 h-4 w-4" />
              <span className="hidden sm:inline">Community</span>
            </Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="I/O account menu"
                className="ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--saffron)] text-xs font-bold text-[var(--indigo-night)] transition hover:bg-[var(--gold)]"
              >
                {initial}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel>
                <span className="block text-xs font-medium">Shared Indus Orbit identity</span>
                <span className="mt-0.5 block truncate text-xs font-normal text-muted-foreground">
                  {user?.email}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate({ to: "/app/profile" })}>
                <UserRound className="mr-2 h-4 w-4" /> Community profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate({ to: "/app" })}>
                <Orbit className="mr-2 h-4 w-4" /> Switch to community
              </DropdownMenuItem>
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
        </nav>
      </header>

      <main className="bg-[radial-gradient(circle_at_top_left,rgba(239,172,61,0.12),transparent_28%),linear-gradient(to_bottom,var(--indigo-night),color-mix(in_oklab,var(--indigo-night)_94%,black))] p-2 sm:p-3">
        <IoWorkspaceShell>{children}</IoWorkspaceShell>
      </main>
    </div>
  );
}

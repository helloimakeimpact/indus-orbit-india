import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import logo from "@/assets/indus-orbit-logo.png";
import { cn } from "@/lib/utils";

const links = [
  { to: "/about", label: "About" },
  { to: "/our-work", label: "Our Work" },
  { to: "/writing", label: "Writing" },
  { to: "/contact", label: "Contact" },
] as const;

function ClockChip() {
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
    <span className="hidden md:inline-flex items-center rounded-full bg-foreground/5 px-3 py-1 text-[11px] font-medium tracking-wider uppercase text-foreground/70">
      {time}
    </span>
  );
}

export function SiteNav({ tone = "light" }: { tone?: "light" | "dark" }) {
  const [open, setOpen] = useState(false);
  const dark = tone === "dark";
  return (
    <header className="fixed inset-x-0 top-4 z-50 px-4">
      <div
        className={cn(
          "mx-auto flex max-w-6xl items-center justify-between rounded-full px-4 py-2.5 shadow-lg",
          dark ? "glass-dark" : "glass-card",
        )}
      >
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="Indus Orbit" width={28} height={28} className="h-7 w-7" />
          <span className="font-display text-lg font-semibold tracking-tight">
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
          <ClockChip />
          <Link
            to="/contact"
            className="hidden sm:inline-flex items-center rounded-full bg-[var(--indigo-night)] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--parchment)] transition hover:bg-[var(--saffron)] hover:text-[var(--indigo-night)]"
          >
            Join the Orbit
          </Link>
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
            <Link
              to="/contact"
              onClick={() => setOpen(false)}
              className="mt-1 rounded-2xl bg-[var(--indigo-night)] px-4 py-3 text-center text-sm font-semibold text-[var(--parchment)]"
            >
              Join the Orbit
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

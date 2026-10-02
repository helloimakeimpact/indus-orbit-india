import type { ReactNode } from "react";
import { SiteNav } from "./SiteNav";
import { SiteFooter } from "./SiteFooter";
import { BrowserStorageNotice } from "./BrowserStorageNotice";

export function SiteShell({
  children,
  navTone = "light",
}: {
  children: ReactNode;
  navTone?: "light" | "dark";
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#public-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-xl focus:bg-primary focus:px-4 focus:py-3 focus:text-primary-foreground focus:shadow-lg"
      >
        Skip to content
      </a>
      <SiteNav tone={navTone} />
      <main id="public-content" aria-label="Indus Orbit website" tabIndex={-1}>
        {children}
      </main>
      <BrowserStorageNotice />
      <SiteFooter />
    </div>
  );
}

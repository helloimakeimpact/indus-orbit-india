import type { ReactNode } from "react";
import { SiteNav } from "./SiteNav";
import { SiteFooter } from "./SiteFooter";
import { CookieBanner } from "./CookieBanner";

export function SiteShell({
  children,
  navTone = "light",
}: {
  children: ReactNode;
  navTone?: "light" | "dark";
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav tone={navTone} />
      <main>{children}</main>
      <SiteFooter />
      <CookieBanner />
    </div>
  );
}

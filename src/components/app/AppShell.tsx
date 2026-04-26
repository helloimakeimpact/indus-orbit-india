import type { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { NotificationSheet } from "./NotificationSheet";

export function AppShell({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <AppSidebar />
      <div className="flex min-h-screen flex-1 flex-col md:pl-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-6 pl-20 backdrop-blur md:pl-6">
          <h1 className="font-display text-lg font-medium text-foreground">{title ?? "Indus Orbit"}</h1>
          <NotificationSheet />
        </header>
        <main className="flex-1 px-4 py-6 md:px-8 md:py-10">{children}</main>
      </div>
    </div>
  );
}

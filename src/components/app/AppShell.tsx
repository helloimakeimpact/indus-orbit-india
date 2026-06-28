import { useEffect, useState, type ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { NotificationSheet } from "./NotificationSheet";
import { ChatDropdown } from "./ChatDropdown";
import { cn } from "@/lib/utils";

const SETTINGS_KEY = "indus-orbit:settings";

type AppPrefs = {
  compactMode: boolean;
  glassSurfaces: boolean;
  reduceMotion: boolean;
  quietNotifications: boolean;
};

const defaultPrefs: AppPrefs = {
  compactMode: true,
  glassSurfaces: true,
  reduceMotion: false,
  quietNotifications: false,
};

function readPrefs(): AppPrefs {
  if (typeof window === "undefined") return defaultPrefs;
  try {
    return { ...defaultPrefs, ...JSON.parse(window.localStorage.getItem(SETTINGS_KEY) ?? "{}") };
  } catch {
    return defaultPrefs;
  }
}

export function AppShell({ children, title }: { children: ReactNode; title?: string }) {
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

  return (
    <div
      className={cn(
        "app-ui flex min-h-screen overflow-x-hidden bg-background text-foreground antialiased",
        prefs.compactMode && "app-compact",
        !prefs.glassSurfaces && "app-flat",
        prefs.reduceMotion && "app-reduce-motion",
        prefs.quietNotifications && "app-quiet-notifications",
      )}
    >
      <AppSidebar />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="app-topbar sticky top-0 z-30 flex h-14 items-center justify-between px-3 pl-14 md:h-12 md:pl-3">
          <h1 className="truncate text-sm font-semibold text-foreground">{title ?? "Indus Orbit"}</h1>
          <div className="flex items-center gap-1">
            <ChatDropdown />
            <NotificationSheet />
          </div>
        </header>
        <main className="min-w-0 flex-1 px-2.5 py-2.5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-3 md:px-3 md:py-3">
          {children}
        </main>
      </div>
    </div>
  );
}

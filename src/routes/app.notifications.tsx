import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, BellDot, CheckCircle2 } from "lucide-react";
import { getNotifications, markNotificationsRead } from "@/server/notification.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Indus Orbit" }, { name: "robots", content: "noindex" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getNotifications();
        setNotifications(data);
        
        // Mark as read after a short delay
        if (data.some(n => !n.is_read)) {
          setTimeout(() => {
            markNotificationsRead();
            // Optimistically update local state
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
          }, 2000);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setBusy(false);
      }
    }
    load();
  }, []);

  if (busy) return <p className="mt-8 px-4 text-muted-foreground">Loading notifications…</p>;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center gap-3">
        <Bell className="h-6 w-6 text-[var(--indigo-night)]" />
        <h1 className="font-display text-3xl font-medium md:text-4xl">Notifications</h1>
      </div>
      <p className="mt-2 text-sm text-foreground/70 mb-8">
        Alerts about connections, mentorships, and community updates.
      </p>

      {notifications.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border p-12 text-center text-muted-foreground">
          <CheckCircle2 className="mx-auto h-8 w-8 opacity-50 mb-4 text-green-600" />
          <p className="font-medium text-foreground">You're all caught up!</p>
          <p className="text-sm">No new notifications.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => {
            const isUnread = !n.is_read;
            return (
              <Link 
                key={n.id} 
                to={n.link || "/app"}
                className={cn(
                  "block p-5 rounded-2xl border transition group",
                  isUnread 
                    ? "bg-muted/30 border-[var(--saffron)]/50 hover:bg-muted/50" 
                    : "bg-card border-border hover:border-foreground/20"
                )}
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1 flex-shrink-0">
                    {isUnread ? (
                      <BellDot className="h-5 w-5 text-[var(--saffron)]" />
                    ) : (
                      <Bell className="h-5 w-5 text-muted-foreground/50" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={cn(
                      "text-sm font-medium",
                      isUnread ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {n.message}
                    </p>
                    <p className="mt-1.5 text-xs text-muted-foreground opacity-75 uppercase tracking-wider">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

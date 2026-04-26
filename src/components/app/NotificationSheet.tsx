import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, BellDot, CheckCircle2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { getNotifications, getUnreadNotificationCount, markNotificationsRead } from "@/server/notification.functions";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

export function NotificationSheet() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  // Poll for unread count
  useEffect(() => {
    if (!user) return;
    const loadCount = async () => {
      try {
        const count = await getUnreadNotificationCount();
        setUnreadCount(count);
      } catch (err) {
        // ignore
      }
    };
    loadCount();
    const interval = setInterval(loadCount, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Load full notifications when opened
  useEffect(() => {
    if (open) {
      setBusy(true);
      getNotifications().then((data) => {
        setNotifications(data);
        setBusy(false);
        // Mark as read after a delay
        if (data.some(n => !n.is_read)) {
          setTimeout(() => {
            markNotificationsRead();
            setUnreadCount(0);
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
          }, 2000);
        }
      });
    }
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-10 w-10 text-foreground">
          {unreadCount > 0 ? (
            <>
              <BellDot className="h-5 w-5" />
              <span className="absolute right-2 top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--saffron)] px-1 text-[9px] font-bold text-[var(--indigo-night)]">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            </>
          ) : (
            <Bell className="h-5 w-5" />
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent className="flex flex-col w-full sm:max-w-md p-0">
        <SheetHeader className="p-6 border-b border-border text-left">
          <SheetTitle className="font-display flex items-center gap-2">
            <Bell className="h-5 w-5" /> Notifications
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {busy ? (
            <p className="text-center text-sm text-muted-foreground mt-8">Loading…</p>
          ) : notifications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground mt-8">
              <CheckCircle2 className="mx-auto h-8 w-8 opacity-50 mb-4 text-green-600" />
              <p className="font-medium text-foreground">You're all caught up!</p>
              <p className="text-sm">No new notifications.</p>
            </div>
          ) : (
            notifications.map((n) => {
              const isUnread = !n.is_read;
              return (
                <Link 
                  key={n.id} 
                  to={n.link || "/app"}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "block p-4 rounded-xl border transition group",
                    isUnread 
                      ? "bg-muted/30 border-[var(--saffron)]/50 hover:bg-muted/50" 
                      : "bg-card border-border hover:border-foreground/20"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-0.5 flex-shrink-0">
                      {isUnread ? (
                        <span className="flex h-2 w-2 mt-1.5 rounded-full bg-[var(--saffron)]" />
                      ) : (
                        <span className="flex h-2 w-2 mt-1.5 rounded-full bg-border" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-medium",
                        isUnread ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {n.message}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground opacity-75">
                        {new Date(n.created_at).toLocaleString(undefined, {
                          month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>

        <div className="p-4 border-t border-border bg-muted/20">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => { setOpen(false); navigate({ to: '/app/notifications' }); }}
          >
            View Notification History
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

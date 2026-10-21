import { lazy, Suspense, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, MessageSquare } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUnreadMessageCount } from "@/features/conversations/useUnreadMessageCount";
import type { ConversationContact } from "@/features/conversations/types";
import { unblockMember } from "@/server/messages.functions";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const ConversationList = lazy(() =>
  import("@/features/conversations/ConversationList").then((module) => ({
    default: module.ConversationList,
  })),
);
const ConversationSurface = lazy(() =>
  import("@/features/conversations/ConversationSurface").then((module) => ({
    default: module.ConversationSurface,
  })),
);

export function ChatDropdown() {
  const { user } = useAuth();
  return user ? <MemberQuickChat key={user.id} userId={user.id} /> : null;
}

function MemberQuickChat({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const { unreadCount } = useUnreadMessageCount(userId);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<ConversationContact | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("indus-orbit:quick-chat-visibility", { detail: open }));
    return () => {
      window.dispatchEvent(new CustomEvent("indus-orbit:quick-chat-visibility", { detail: false }));
    };
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative h-11 w-11 text-foreground"
          aria-label={`Open messages${unreadCount ? `, ${unreadCount} unread` : ""}`}
        >
          <MessageSquare className="h-5 w-5" />
          {unreadCount > 0 ? (
            <span
              aria-hidden="true"
              className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--saffron)] px-1 text-[10px] font-semibold text-[var(--indigo-night)]"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent className="inset-y-0 right-0 flex h-dvh w-full flex-col overflow-hidden rounded-none border-l bg-card p-0 sm:inset-y-2 sm:right-2 sm:h-[calc(100dvh-1rem)] sm:max-w-md sm:rounded-2xl sm:p-0">
        <SheetHeader className="shrink-0 border-b border-border/70 py-4 pr-16 pl-4 text-left">
          <SheetTitle className="font-display text-lg">Your conversations</SheetTitle>
          <SheetDescription className="sr-only">
            Private conversations with your Indus Orbit connections.
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1">
          <Suspense
            fallback={
              <p className="p-6 text-sm text-muted-foreground" role="status">
                Opening messages…
              </p>
            }
          >
            {active ? (
              <ConversationSurface
                key={`${userId}:${active.user_id}`}
                userId={userId}
                contact={active}
                enabled={open}
                compact
                onBack={() => setActive(null)}
                onBlocked={() => {
                  setActive(null);
                  setRevision((value) => value + 1);
                }}
              />
            ) : (
              <ConversationList
                key={revision}
                userId={userId}
                enabled={open}
                onSelect={setActive}
                onUnblock={(contact) => unblockMember(contact.user_id, userId)}
              />
            )}
          </Suspense>
        </div>
        <div className="shrink-0 border-t border-border/70 bg-card px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full gap-2"
            onClick={() => {
              const peerId = active?.user_id;
              setOpen(false);
              void navigate({ to: "/app/messages", search: peerId ? { user: peerId } : {} });
            }}
          >
            Open Messages
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

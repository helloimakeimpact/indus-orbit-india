import { lazy, Suspense, useState } from "react";
import { MessageSquare, Plus, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useConversationContacts } from "./useConversationContacts";
import { ConversationRow } from "./ConversationRow";
import type { ConversationContact } from "./types";

const ConnectionsPicker = lazy(() =>
  import("./ConnectionsPicker").then((module) => ({ default: module.ConnectionsPicker })),
);
const CommunityChatLinks = lazy(() =>
  import("./CommunityChatLinks").then((module) => ({ default: module.CommunityChatLinks })),
);

type Props = {
  userId: string;
  enabled: boolean;
  activeId?: string;
  onSelect: (contact: ConversationContact) => void;
  onUnblock: (contact: ConversationContact) => Promise<void>;
};
type View = "chats" | "connections" | "groups";

export function ConversationList({ userId, enabled, activeId, onSelect, onUnblock }: Props) {
  const [view, setView] = useState<View>("chats");
  const inbox = useConversationContacts(userId, enabled && view === "chats");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  return (
    <div className="flex h-full min-h-0 flex-col bg-card" aria-label="Conversation list">
      <div className="shrink-0 border-b border-border/70 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-xl">Messages</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Good work starts with a conversation.
            </p>
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={view === "connections" ? "Show recent chats" : "New conversation"}
            onClick={() => setView(view === "connections" ? "chats" : "connections")}
            className="h-11 w-11 shrink-0"
          >
            <Plus
              className={cn(
                "h-5 w-5 transition-transform motion-reduce:transition-none",
                view === "connections" && "rotate-45",
              )}
            />
          </Button>
        </div>
        <div className="mt-3 flex gap-1" aria-label="Message views">
          <Button
            type="button"
            variant={view === "chats" ? "secondary" : "ghost"}
            className="min-h-11 min-w-0 flex-1 px-2 text-xs"
            aria-pressed={view === "chats"}
            onClick={() => setView("chats")}
          >
            Chats
          </Button>
          <Button
            type="button"
            variant={view === "connections" ? "secondary" : "ghost"}
            className="min-h-11 min-w-0 flex-1 px-2 text-xs"
            aria-pressed={view === "connections"}
            onClick={() => setView("connections")}
          >
            Connections
          </Button>
          <Button
            type="button"
            variant={view === "groups" ? "secondary" : "ghost"}
            className="min-h-11 min-w-0 flex-1 px-2 text-xs"
            aria-label="Community conversations"
            aria-pressed={view === "groups"}
            onClick={() => setView("groups")}
          >
            Groups
          </Button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {view === "connections" ? (
          <Suspense
            fallback={
              <p className="p-6 text-sm text-muted-foreground" role="status">
                Opening connections…
              </p>
            }
          >
            <ConnectionsPicker
              userId={userId}
              enabled={enabled}
              activeId={activeId}
              onSelect={onSelect}
            />
          </Suspense>
        ) : view === "groups" ? (
          <Suspense
            fallback={
              <p className="p-6 text-sm text-muted-foreground" role="status">
                Opening community conversations…
              </p>
            }
          >
            <CommunityChatLinks userId={userId} />
          </Suspense>
        ) : (
          <>
            {inbox.error ? (
              <div className="p-4 text-sm" role="alert">
                <p>{inbox.error}</p>
                <Button
                  type="button"
                  variant="ghost"
                  className="mt-1 min-h-11"
                  onClick={() => void inbox.refresh()}
                >
                  Try again
                </Button>
              </div>
            ) : null}
            {inbox.loading && !inbox.contacts.length ? (
              <p className="p-6 text-center text-sm text-muted-foreground" role="status">
                Loading your chats…
              </p>
            ) : null}
            {!inbox.loading && !inbox.error && !inbox.contacts.length ? (
              <div className="px-6 py-10 text-center">
                <MessageSquare className="mx-auto mb-3 h-7 w-7 text-muted-foreground/50" />
                <p className="text-sm font-medium">Your conversations belong here</p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Choose a connection to say hello in a private conversation.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4 min-h-11"
                  onClick={() => setView("connections")}
                >
                  Start a conversation
                </Button>
              </div>
            ) : null}
            {inbox.contacts.map((contact) => (
              <ConversationRow
                key={contact.user_id}
                contact={contact}
                recent={contact}
                userId={userId}
                activeId={activeId}
                onSelect={onSelect}
              />
            ))}
            {inbox.hasMore ? (
              <div className="p-3">
                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-11 w-full"
                  disabled={inbox.loadingMore}
                  onClick={() => void inbox.loadMore()}
                >
                  Load more chats
                </Button>
              </div>
            ) : null}
            {inbox.blockedContacts.length ? (
              <details className="border-t border-border/70 p-3">
                <summary className="cursor-pointer rounded-lg px-2 py-3 text-xs text-muted-foreground focus-visible:outline focus-visible:outline-2">
                  Blocked by you ({inbox.blockedContacts.length})
                </summary>
                {inbox.blockedContacts.map((contact) => (
                  <div key={contact.user_id} className="flex items-center gap-2 px-2 py-1">
                    <span className="min-w-0 flex-1 truncate text-xs">
                      {contact.display_name ?? "Member"}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      className="min-h-11 gap-1 px-2 text-xs"
                      disabled={busyId === contact.user_id}
                      onClick={() => {
                        setBusyId(contact.user_id);
                        setActionError(null);
                        void onUnblock(contact)
                          .then(() => inbox.refresh())
                          .catch((cause) =>
                            setActionError(
                              cause instanceof Error
                                ? cause.message
                                : "Could not unblock this member.",
                            ),
                          )
                          .finally(() => setBusyId(null));
                      }}
                    >
                      <Undo2 className="h-3.5 w-3.5" />
                      Unblock
                    </Button>
                  </div>
                ))}
              </details>
            ) : null}
            {actionError ? (
              <p className="p-3 text-sm text-destructive" role="alert">
                {actionError}
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

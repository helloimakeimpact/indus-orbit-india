import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { MessageSquare } from "lucide-react";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { ConversationList } from "@/features/conversations/ConversationList";
import { ConversationSurface } from "@/features/conversations/ConversationSurface";
import type { ConversationContact } from "@/features/conversations/types";
import { getConversationContact, unblockMember } from "@/server/messages.functions";

export const Route = createFileRoute("/app/messages")({
  validateSearch: z.object({ user: z.string().uuid().optional() }),
  head: () => ({
    meta: [{ title: "Messages — Indus Orbit" }, { name: "robots", content: "noindex" }],
  }),
  component: MessagesPage,
});

function MessagesPage() {
  const { user } = useAuth();
  return user ? <MemberMessages key={user.id} userId={user.id} /> : null;
}

function MemberMessages({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const { user: peerId } = Route.useSearch();
  const [active, setActive] = useState<ConversationContact | null>(null);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);
  const [revision, setRevision] = useState(0);
  const activeRef = useRef(active);
  useLayoutEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    const visibility = (event: Event) =>
      setQuickOpen((event as CustomEvent<boolean>).detail === true);
    window.addEventListener("indus-orbit:quick-chat-visibility", visibility);
    return () => window.removeEventListener("indus-orbit:quick-chat-visibility", visibility);
  }, []);

  useEffect(() => {
    let current = true;
    if (peerId && activeRef.current?.user_id === peerId) return;
    void Promise.resolve().then(async () => {
      if (!current) return;
      setContactError(null);
      setActive(null);
      if (!peerId) return;
      setContactLoading(true);
      try {
        const contact = await getConversationContact(userId, peerId);
        if (!current) return;
        setActive(contact);
        if (!contact)
          setContactError(
            "This conversation is unavailable. Choose one of your accepted connections.",
          );
      } catch (cause) {
        if (current)
          setContactError(
            cause instanceof Error ? cause.message : "Could not open this conversation.",
          );
      } finally {
        if (current) setContactLoading(false);
      }
    });
    return () => {
      current = false;
    };
  }, [peerId, revision, userId]);

  function select(contact: ConversationContact) {
    setActive(contact);
    setContactError(null);
    void navigate({ to: "/app/messages", search: { user: contact.user_id } });
  }

  function back() {
    setActive(null);
    setContactLoading(false);
    void navigate({ to: "/app/messages", search: {} });
  }

  return (
    <div className="flex h-[calc(100dvh-6.5rem)] min-h-[20rem] min-w-0 overflow-hidden rounded-2xl border border-border bg-card md:h-[calc(100dvh-5rem)]">
      <aside
        className={cn(
          "h-full w-full shrink-0 border-r border-border/70 md:w-80 lg:w-[22rem]",
          active || peerId ? "hidden md:block" : "block",
        )}
        aria-label="Messages navigation"
      >
        <ConversationList
          key={`inbox:${revision}`}
          userId={userId}
          enabled={!quickOpen}
          activeId={active?.user_id}
          onSelect={select}
          onUnblock={(contact) => unblockMember(contact.user_id, userId)}
        />
      </aside>
      {active ? (
        <ConversationSurface
          key={`${userId}:${active.user_id}`}
          userId={userId}
          contact={active}
          enabled={!quickOpen}
          onBack={back}
          onBlocked={() => {
            back();
            setRevision((value) => value + 1);
          }}
        />
      ) : (
        <div
          className={cn(
            "min-w-0 flex-1 items-center justify-center p-6 text-center",
            peerId ? "flex" : "hidden md:flex",
          )}
        >
          <div>
            <MessageSquare className="mx-auto mb-4 h-9 w-9 text-muted-foreground/40" />
            <h1 className="font-display text-2xl">
              {contactLoading ? "Opening conversation…" : "A little closer, wherever you are."}
            </h1>
            <p
              className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground"
              role={contactError ? "alert" : "status"}
            >
              {contactError ?? "Choose a chat, or start a conversation with someone you know."}
            </p>
            {peerId ? (
              <div className="mt-4 flex justify-center gap-2">
                <button
                  type="button"
                  className="min-h-11 rounded-xl border border-border px-4 text-sm"
                  onClick={back}
                >
                  Back to conversations
                </button>
                {contactError ? (
                  <button
                    type="button"
                    className="min-h-11 rounded-xl border border-border px-4 text-sm"
                    onClick={() => setRevision((value) => value + 1)}
                  >
                    Try again
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

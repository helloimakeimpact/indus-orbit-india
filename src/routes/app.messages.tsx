import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { MessageSquare, Send, ArrowLeft, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  getConnections,
  getConversation,
  sendMessage,
  markConversationRead,
} from "@/server/messages.functions";
import { z } from "zod";

const searchSchema = z.object({ user: z.string().optional() });

export const Route = createFileRoute("/app/messages")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Messages — Indus Orbit" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MessagesPage,
});

type Profile = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  headline: string | null;
};

type Message = {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
};

function MessagesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { user: queryUserId } = Route.useSearch();

  const [connections, setConnections] = useState<Profile[]>([]);
  const [activeContact, setActiveContact] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingConns, setLoadingConns] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [search, setSearch] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load connections list
  useEffect(() => {
    getConnections()
      .then(setConnections)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoadingConns(false));
  }, []);

  // Auto-select contact from URL param
  useEffect(() => {
    if (queryUserId && connections.length > 0) {
      const contact = connections.find((c) => c.user_id === queryUserId);
      if (contact) setActiveContact(contact);
    }
  }, [queryUserId, connections]);

  // Load conversation when active contact changes
  useEffect(() => {
    if (!activeContact) return;
    setLoadingMsgs(true);
    navigate({ to: "/app/messages", search: { user: activeContact.user_id } });

    getConversation(activeContact.user_id)
      .then(setMessages)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoadingMsgs(false));

    markConversationRead(activeContact.user_id);
  }, [activeContact]);

  // Realtime subscription for new messages
  useEffect(() => {
    if (!activeContact || !user) return;

    const channel = supabase
      .channel(`messages:${user.id}:${activeContact.user_id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload) => {
          const msg = payload.new as Message;
          if (msg.sender_id === activeContact.user_id) {
            setMessages((prev) => [...prev, msg]);
            markConversationRead(activeContact.user_id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeContact, user]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!activeContact || !newMessage.trim()) return;
    setSending(true);
    try {
      const msg = await sendMessage(activeContact.user_id, newMessage);
      setMessages((prev) => [...prev, msg as Message]);
      setNewMessage("");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const filtered = connections.filter((c) =>
    (c.display_name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-6rem)] overflow-hidden rounded-3xl border border-border bg-card">
      {/* Sidebar: Connections */}
      <div
        className={cn(
          "flex w-full flex-col border-r border-border md:w-80 md:flex-shrink-0",
          activeContact ? "hidden md:flex" : "flex"
        )}
      >
        <div className="p-4 border-b border-border">
          <h1 className="font-display text-xl font-semibold">Messages</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Chat with your connections
          </p>
          <div className="mt-3 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search connections…"
              className="pl-9 h-9 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingConns ? (
            <div className="p-4 text-sm text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                {connections.length === 0
                  ? "No accepted connections yet."
                  : "No matches found."}
              </p>
            </div>
          ) : (
            filtered.map((c) => (
              <button
                key={c.user_id}
                onClick={() => setActiveContact(c)}
                className={cn(
                  "w-full flex items-center gap-3 p-4 text-left transition hover:bg-muted/50 border-b border-border/50",
                  activeContact?.user_id === c.user_id && "bg-muted/70"
                )}
              >
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarImage src={c.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-[var(--indigo-night)] text-[var(--parchment)] text-sm font-semibold">
                    {(c.display_name ?? "?").substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="overflow-hidden">
                  <p className="font-medium text-sm truncate">
                    {c.display_name ?? "Member"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {c.headline ?? ""}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Window */}
      {activeContact ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Chat Header */}
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <button
              className="mr-1 md:hidden text-muted-foreground hover:text-foreground"
              onClick={() => setActiveContact(null)}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <Avatar className="h-9 w-9">
              <AvatarImage src={activeContact.avatar_url ?? undefined} />
              <AvatarFallback className="bg-[var(--indigo-night)] text-[var(--parchment)] text-sm font-semibold">
                {(activeContact.display_name ?? "?")
                  .substring(0, 2)
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-sm">
                {activeContact.display_name}
              </p>
              <p className="text-xs text-muted-foreground">
                {activeContact.headline}
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {loadingMsgs ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                Loading conversation…
              </p>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="font-medium text-muted-foreground">
                  No messages yet
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Say hello to {activeContact.display_name}!
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMine = msg.sender_id === user?.id;
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex",
                      isMine ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                        isMine
                          ? "bg-[var(--indigo-night)] text-[var(--parchment)] rounded-br-sm"
                          : "bg-muted text-foreground rounded-bl-sm"
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words">
                        {msg.content}
                      </p>
                      <p
                        className={cn(
                          "mt-1 text-[10px] text-right",
                          isMine
                            ? "text-[var(--parchment)]/50"
                            : "text-muted-foreground"
                        )}
                      >
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Message Input */}
          <div className="border-t border-border p-3">
            <div className="flex items-end gap-2">
              <textarea
                className="flex-1 resize-none rounded-2xl border border-border bg-muted/40 px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--indigo-night)]/30 min-h-[44px] max-h-[140px]"
                placeholder={`Message ${activeContact.display_name}…`}
                rows={1}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <Button
                size="icon"
                disabled={sending || !newMessage.trim()}
                onClick={handleSend}
                className="h-11 w-11 flex-shrink-0 rounded-2xl bg-[var(--indigo-night)] text-[var(--parchment)] hover:bg-[var(--indigo-night)]/90"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-1.5 text-center text-xs text-muted-foreground">
              Press Enter to send, Shift+Enter for a new line
            </p>
          </div>
        </div>
      ) : (
        <div className="hidden flex-1 items-center justify-center md:flex">
          <div className="text-center">
            <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <p className="mt-4 font-display text-lg font-medium text-muted-foreground">
              Select a conversation
            </p>
            <p className="text-sm text-muted-foreground">
              Choose a connection from the left to start chatting
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useRef, useState, useCallback } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { MessageSquare, Send, ArrowRight, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  getConnections,
  getConversation,
  sendMessage,
  markConversationRead,
  getUnreadMessageCount,
} from "@/server/messages.functions";

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

export function ChatDropdown() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Contact list
  const [connections, setConnections] = useState<Profile[]>([]);
  const [loadingConns, setLoadingConns] = useState(false);

  // Inline chat
  const [activeContact, setActiveContact] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Poll unread count
  useEffect(() => {
    if (!user) return;
    const load = () => getUnreadMessageCount().then(setUnreadCount).catch(() => {});
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [user]);

  // Load connections when panel opens
  useEffect(() => {
    if (!open) return;
    setLoadingConns(true);
    getConnections()
      .then(setConnections)
      .catch(() => {})
      .finally(() => setLoadingConns(false));
  }, [open]);

  // Load conversation when active contact changes
  useEffect(() => {
    if (!activeContact) return;
    setLoadingMsgs(true);
    getConversation(activeContact.user_id)
      .then(setMessages)
      .catch(() => {})
      .finally(() => setLoadingMsgs(false));
    markConversationRead(activeContact.user_id);
  }, [activeContact]);

  // Realtime for inline chat
  useEffect(() => {
    if (!activeContact || !user) return;
    const channel = supabase
      .channel(`chat-dropdown:${user.id}:${activeContact.user_id}`)
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
    return () => { supabase.removeChannel(channel); };
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
    } catch {
      // ignore
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

  return (
    <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (!o) setActiveContact(null); }}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-10 w-10 text-foreground">
          <MessageSquare className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-2 top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--saffron)] px-1 text-[9px] font-bold text-[var(--indigo-night)]">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent className="flex flex-col w-full sm:max-w-md p-0">
        <SheetHeader className="p-5 border-b border-border text-left flex-shrink-0">
          <SheetTitle className="font-display flex items-center gap-2 text-lg">
            {activeContact ? (
              <>
                <button
                  className="text-muted-foreground hover:text-foreground transition mr-1"
                  onClick={() => setActiveContact(null)}
                >
                  ← 
                </button>
                <Avatar className="h-7 w-7">
                  <AvatarImage src={activeContact.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-[var(--indigo-night)] text-[var(--parchment)] text-xs font-semibold">
                    {(activeContact.display_name ?? "?").substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{activeContact.display_name}</span>
              </>
            ) : (
              <>
                <MessageSquare className="h-5 w-5" /> Messages
              </>
            )}
          </SheetTitle>
        </SheetHeader>

        {/* Contact list view */}
        {!activeContact && (
          <div className="flex-1 overflow-y-auto">
            {loadingConns ? (
              <p className="p-6 text-center text-sm text-muted-foreground">Loading…</p>
            ) : connections.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center mt-8">
                <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="font-medium text-muted-foreground">No connections yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Connect with members from the Directory to start chatting.
                </p>
              </div>
            ) : (
              connections.map((c) => (
                <button
                  key={c.user_id}
                  onClick={() => setActiveContact(c)}
                  className="w-full flex items-center gap-3 p-4 text-left transition hover:bg-muted/50 border-b border-border/50"
                >
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarImage src={c.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-[var(--indigo-night)] text-[var(--parchment)] text-sm font-semibold">
                      {(c.display_name ?? "?").substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="overflow-hidden flex-1">
                    <p className="font-medium text-sm truncate">{c.display_name ?? "Member"}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.headline ?? ""}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
                </button>
              ))
            )}
          </div>
        )}

        {/* Inline chat view */}
        {activeContact && (
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {loadingMsgs ? (
                <p className="text-center text-sm text-muted-foreground py-8">Loading…</p>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageSquare className="h-8 w-8 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Say hello to {activeContact.display_name}!
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.sender_id === user?.id;
                  return (
                    <div key={msg.id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                          isMine
                            ? "bg-[var(--indigo-night)] text-[var(--parchment)] rounded-br-sm"
                            : "bg-muted text-foreground rounded-bl-sm"
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        <p className={cn("mt-1 text-[10px] text-right", isMine ? "text-[var(--parchment)]/50" : "text-muted-foreground")}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t border-border p-3 flex-shrink-0">
              <div className="flex items-end gap-2">
                <textarea
                  className="flex-1 resize-none rounded-2xl border border-border bg-muted/40 px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--indigo-night)]/30 min-h-[44px] max-h-[100px]"
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
            </div>
          </div>
        )}

        {/* Footer: Open Full Page */}
        <div className="p-3 border-t border-border bg-muted/20 flex-shrink-0">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => { setOpen(false); navigate({ to: "/app/messages" }); }}
          >
            Open Full Messaging Page <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

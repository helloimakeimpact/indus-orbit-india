import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BookOpenCheck,
  CalendarDays,
  ClipboardList,
  Hash,
  HelpCircle,
  Loader2,
  Megaphone,
  MessageSquare,
  Radio,
  Send,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  getRoomMessages,
  getSpaceWorkspace,
  markSpaceRoomRead,
  sendSpaceMessage,
  type SpaceMessage,
  type SpaceWorkspace,
} from "@/features/spaces/space-client";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Room = Database["public"]["Tables"]["conversation_rooms"]["Row"];

export const Route = createFileRoute("/app/spaces/$spaceId")({
  head: () => ({
    meta: [{ title: "Space — Indus Orbit" }, { name: "robots", content: "noindex" }],
  }),
  component: SpacePage,
});

function roomIcon(roomType: string) {
  const className = "h-4 w-4 shrink-0";
  switch (roomType) {
    case "announcement":
      return <Megaphone className={className} />;
    case "board":
      return <ClipboardList className={className} />;
    case "event_index":
      return <CalendarDays className={className} />;
    case "evidence":
      return <BookOpenCheck className={className} />;
    case "help":
      return <HelpCircle className={className} />;
    default:
      return <Hash className={className} />;
  }
}

function SpacePage() {
  const { spaceId } = Route.useParams();
  const { user } = useAuth();
  const [workspace, setWorkspace] = useState<SpaceWorkspace | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SpaceMessage[]>([]);
  const [composer, setComposer] = useState("");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timelineEndRef = useRef<HTMLDivElement | null>(null);

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await getSpaceWorkspace(spaceId);
      setWorkspace(next);
      setSelectedRoomId((current) =>
        current && next.rooms.some((room) => room.id === current)
          ? current
          : (next.rooms[0]?.id ?? null),
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load this Space");
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  const loadMessages = useCallback(async (roomId: string) => {
    setMessagesLoading(true);
    try {
      const next = await getRoomMessages(roomId);
      setMessages(next);
      const lastMessage = next.at(-1);
      if (lastMessage) void markSpaceRoomRead(roomId, lastMessage.id).catch(() => undefined);
    } catch (loadError) {
      toast.error(loadError instanceof Error ? loadError.message : "Could not load Room messages");
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadWorkspace);
  }, [loadWorkspace]);

  useEffect(() => {
    if (!selectedRoomId) return;

    void Promise.resolve().then(() => loadMessages(selectedRoomId));
    const channel = supabase
      .channel(`space-room-${selectedRoomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversation_messages",
          filter: `room_id=eq.${selectedRoomId}`,
        },
        () => void loadMessages(selectedRoomId),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadMessages, selectedRoomId]);

  useEffect(() => {
    timelineEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const selectedRoom = useMemo(
    () => workspace?.rooms.find((room) => room.id === selectedRoomId) ?? null,
    [selectedRoomId, workspace?.rooms],
  );

  const roomsByGroup = useMemo(() => {
    if (!workspace) return [];
    return workspace.groups.map((group) => ({
      group,
      rooms: workspace.rooms.filter((room) => room.context_group_id === group.id),
    }));
  }, [workspace]);

  async function sendMessage() {
    if (!selectedRoom || !composer.trim()) return;
    setSending(true);
    try {
      const created = await sendSpaceMessage(selectedRoom.id, composer);
      setComposer("");
      setMessages((current) =>
        current.some((message) => message.id === created.id) ? current : [...current, created],
      );
      void markSpaceRoomRead(selectedRoom.id, created.id).catch(() => undefined);
    } catch (sendError) {
      toast.error(sendError instanceof Error ? sendError.message : "Could not send message");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--saffron)]" />
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-border bg-card p-8 text-center">
        <h1 className="font-display text-2xl">Space unavailable</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {error ?? "This Space could not be found."}
        </p>
        <Button className="mt-6" onClick={() => void loadWorkspace()}>
          Try again
        </Button>
      </div>
    );
  }

  const sourceBack =
    workspace.space.source_type === "chapter" && workspace.space.chapter_id ? (
      <Link
        to="/app/chapters/$chapterId"
        params={{ chapterId: workspace.space.chapter_id }}
        className="inline-flex items-center gap-2 text-xs text-white/70 hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Chapter
      </Link>
    ) : workspace.space.mission_id ? (
      <Link
        to="/app/missions/$missionId"
        params={{ missionId: workspace.space.mission_id }}
        className="inline-flex items-center gap-2 text-xs text-white/70 hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Mission
      </Link>
    ) : null;

  if (workspace.rooms.length === 0) {
    return (
      <div className="mx-auto max-w-2xl overflow-hidden rounded-3xl border border-border bg-card">
        <div className="bg-[var(--indigo-night)] p-6 text-white">
          {sourceBack}
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--saffron)]">
            I/O Space
          </p>
          <h1 className="mt-2 font-display text-3xl">{workspace.space.display_name}</h1>
        </div>
        <div className="p-8 text-center">
          <Users className="mx-auto h-9 w-9 text-muted-foreground" />
          <h2 className="mt-4 font-semibold">Membership opens the Rooms</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Join or request access from the Chapter or Mission page. Discoverability never exposes
            private Room content.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-7rem)] overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <div className="grid min-h-[calc(100vh-7rem)] grid-cols-1 lg:grid-cols-[250px_minmax(0,1fr)_240px]">
        <aside className="border-b border-white/10 bg-[var(--indigo-night)] text-white lg:border-b-0 lg:border-r">
          <div className="border-b border-white/10 p-5">
            {sourceBack}
            <div className="mt-5 flex items-center gap-2 text-[var(--saffron)]">
              <Radio className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-[0.22em]">I/O Space</span>
            </div>
            <h1 className="mt-2 font-display text-xl leading-tight">
              {workspace.space.display_name}
            </h1>
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/55">
              {workspace.space.description}
            </p>
          </div>

          <nav className="max-h-[42vh] overflow-y-auto p-3 lg:max-h-[calc(100vh-18rem)]">
            {roomsByGroup.map(({ group, rooms }) => (
              <div key={group.id} className="mb-5">
                <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                  {group.display_name}
                </p>
                <div className="mt-1 space-y-0.5">
                  {rooms.map((room) => (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => setSelectedRoomId(room.id)}
                      className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm transition ${
                        room.id === selectedRoomId
                          ? "bg-white/12 text-white"
                          : "text-white/58 hover:bg-white/7 hover:text-white"
                      }`}
                    >
                      {roomIcon(room.room_type)}
                      <span className="truncate">{room.display_name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className="border-t border-white/10 p-4">
            <div className="flex items-center gap-3 rounded-xl bg-white/6 p-2.5">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-[var(--saffron)] text-[var(--indigo-night)]">
                  {user?.email?.slice(0, 2).toUpperCase() ?? "IO"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">{user?.email}</p>
                <p className="text-[10px] text-white/40">People first · evidence ready</p>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex min-h-[620px] min-w-0 flex-col bg-background/60">
          <header className="flex min-h-20 items-center justify-between border-b border-border bg-card/85 px-5 backdrop-blur">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {selectedRoom ? (
                  roomIcon(selectedRoom.room_type)
                ) : (
                  <MessageSquare className="h-4 w-4" />
                )}
                <h2 className="truncate font-semibold">{selectedRoom?.display_name ?? "Room"}</h2>
              </div>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {selectedRoom?.description}
              </p>
            </div>
            <Badge variant="outline" className="ml-3 hidden shrink-0 sm:inline-flex">
              {selectedRoom?.posting_policy ?? "members"}
            </Badge>
          </header>

          <section className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
            {messagesLoading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full min-h-72 items-center justify-center text-center">
                <div>
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--saffron)]/15 text-[var(--saffron)]">
                    {selectedRoom ? roomIcon(selectedRoom.room_type) : <Hash className="h-5 w-5" />}
                  </div>
                  <h3 className="mt-4 font-display text-xl">Begin with context</h3>
                  <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                    The first message should make the purpose, evidence, or decision clear for the
                    people who arrive later.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                {messages.map((message, index) => {
                  const previous = messages[index - 1];
                  const grouped =
                    previous?.author_id === message.author_id &&
                    new Date(message.created_at).getTime() -
                      new Date(previous.created_at).getTime() <
                      5 * 60 * 1000;
                  return (
                    <article
                      key={message.id}
                      className={`group flex gap-3 rounded-xl px-2 py-2 hover:bg-muted/45 ${grouped ? "mt-0" : "mt-4"}`}
                    >
                      <div className="w-9 shrink-0">
                        {!grouped && (
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={message.profiles?.avatar_url ?? undefined} />
                            <AvatarFallback>
                              {message.profiles?.display_name?.slice(0, 2).toUpperCase() ?? "IO"}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        {!grouped && (
                          <div className="flex flex-wrap items-baseline gap-x-2">
                            <span className="text-sm font-semibold">
                              {message.profiles?.display_name ?? "Member"}
                            </span>
                            <time className="text-[10px] text-muted-foreground">
                              {new Intl.DateTimeFormat(undefined, {
                                dateStyle: "medium",
                                timeStyle: "short",
                              }).format(new Date(message.created_at))}
                            </time>
                          </div>
                        )}
                        <p className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground/90">
                          {message.content}
                        </p>
                      </div>
                    </article>
                  );
                })}
                <div ref={timelineEndRef} />
              </div>
            )}
          </section>

          <footer className="border-t border-border bg-card p-4 sm:p-5">
            <div className="flex items-end gap-2 rounded-2xl border border-border bg-background px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-[var(--saffron)]/25">
              <textarea
                value={composer}
                onChange={(event) => setComposer(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
                rows={1}
                maxLength={8000}
                disabled={!selectedRoom || sending}
                placeholder={
                  selectedRoom ? `Message #${selectedRoom.display_name}` : "Choose a Room"
                }
                className="max-h-36 min-h-10 flex-1 resize-none bg-transparent px-1 py-2 text-sm outline-none placeholder:text-muted-foreground"
              />
              <Button
                size="icon"
                onClick={() => void sendMessage()}
                disabled={!selectedRoom || !composer.trim() || sending}
                className="h-9 w-9 shrink-0 rounded-xl bg-[var(--indigo-night)] text-white"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="mt-2 px-1 text-[10px] text-muted-foreground">
              Enter sends · Shift + Enter adds a line · durable history is visible only to Space
              members
            </p>
          </footer>
        </main>

        <aside className="hidden border-l border-border bg-card lg:block">
          <div className="flex h-20 items-center justify-between border-b border-border px-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-[var(--saffron)]" />
              <span className="text-sm font-semibold">People</span>
            </div>
            <Badge variant="secondary">{workspace.members.length}</Badge>
          </div>
          <div className="max-h-[calc(100vh-12rem)] space-y-1 overflow-y-auto p-3">
            {workspace.members.map((member) => (
              <div
                key={member.user_id}
                className="flex items-center gap-3 rounded-xl p-2 hover:bg-muted/55"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={member.profiles?.avatar_url ?? undefined} />
                  <AvatarFallback>
                    {member.profiles?.display_name?.slice(0, 2).toUpperCase() ?? "IO"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">
                    {member.profiles?.display_name ?? "Member"}
                  </p>
                  <p className="truncate text-[10px] capitalize text-muted-foreground">
                    {member.domain_role}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

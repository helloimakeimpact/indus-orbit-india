import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  BookOpenCheck,
  CalendarDays,
  Check,
  CircleHelp,
  ClipboardList,
  Download,
  FileText,
  Flag,
  Hash,
  Heart,
  HelpCircle,
  Loader2,
  Lock,
  Megaphone,
  MessageCircle,
  MessageSquare,
  Paperclip,
  Radio,
  RotateCcw,
  Send,
  Settings,
  ShieldAlert,
  Unlock,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import {
  createMessageThread,
  getRoomFeed,
  getSpaceWorkspace,
  markSpaceRoomRead,
  moderateSpaceMessage,
  reportSpaceMessage,
  sendSpaceMessage,
  setSpaceThreadLock,
  toggleSpaceReaction,
  updateSpaceRoom,
  uploadSpaceAttachment,
  type SpaceFeed,
  type SpaceMessage,
  type SpaceReaction,
  type SpaceThreadSummary,
  type SpaceWorkspace,
} from "@/features/spaces/space-client";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Room = Database["public"]["Tables"]["conversation_rooms"]["Row"];
type ActiveThread = { summary: SpaceThreadSummary; parent: SpaceMessage };

const emptyFeed: SpaceFeed = {
  items: [],
  hasMore: false,
  nextCursor: null,
  canManage: false,
  canModerate: false,
};

const reactions: Array<{
  key: SpaceReaction["key"];
  label: string;
  icon: typeof Check;
}> = [
  { key: "acknowledge", label: "Acknowledge", icon: Check },
  { key: "support", label: "Support", icon: Heart },
  { key: "question", label: "Question", icon: CircleHelp },
  { key: "complete", label: "Complete", icon: BadgeCheck },
];

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

function formatMoment(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function SpacePage() {
  const { spaceId } = Route.useParams();
  const { user } = useAuth();
  const [workspace, setWorkspace] = useState<SpaceWorkspace | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [feed, setFeed] = useState<SpaceFeed>(emptyFeed);
  const [activeThread, setActiveThread] = useState<ActiveThread | null>(null);
  const [threadFeed, setThreadFeed] = useState<SpaceFeed>(emptyFeed);
  const [composer, setComposer] = useState("");
  const [threadComposer, setThreadComposer] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [threadLoading, setThreadLoading] = useState(false);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [sending, setSending] = useState(false);
  const [threadSending, setThreadSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<SpaceMessage | null>(null);
  const [reportCategory, setReportCategory] = useState("safety");
  const [reportDescription, setReportDescription] = useState("");
  const [reportSaving, setReportSaving] = useState(false);
  const [roomSettingsOpen, setRoomSettingsOpen] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [roomDescription, setRoomDescription] = useState("");
  const [roomPostingPolicy, setRoomPostingPolicy] = useState("members");
  const [roomSaving, setRoomSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const timelineEndRef = useRef<HTMLDivElement | null>(null);
  const threadEndRef = useRef<HTMLDivElement | null>(null);

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

  const loadRoom = useCallback(async (roomId: string) => {
    setMessagesLoading(true);
    try {
      const next = await getRoomFeed(roomId);
      setFeed(next);
      const lastMessage = next.items.at(-1);
      if (lastMessage) void markSpaceRoomRead(roomId, lastMessage.id).catch(() => undefined);
    } catch (loadError) {
      toast.error(loadError instanceof Error ? loadError.message : "Could not load Room messages");
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  const loadThread = useCallback(async (roomId: string, threadId: string) => {
    setThreadLoading(true);
    try {
      setThreadFeed(await getRoomFeed(roomId, { threadId }));
    } catch (loadError) {
      toast.error(loadError instanceof Error ? loadError.message : "Could not load Thread");
    } finally {
      setThreadLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadWorkspace);
  }, [loadWorkspace]);

  useEffect(() => {
    if (!selectedRoomId) return;
    void Promise.resolve().then(() => loadRoom(selectedRoomId));
    const channel = supabase
      .channel(`orbit-room-${selectedRoomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversation_messages",
          filter: `room_id=eq.${selectedRoomId}`,
        },
        () => void loadRoom(selectedRoomId),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversation_reactions" },
        () => void loadRoom(selectedRoomId),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadRoom, selectedRoomId]);

  function chooseRoom(roomId: string) {
    setActiveThread(null);
    setThreadFeed(emptyFeed);
    setSelectedFile(null);
    setSelectedRoomId(roomId);
  }

  useEffect(() => {
    timelineEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [feed.items.length]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [threadFeed.items.length]);

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
    if (!selectedRoom || (!composer.trim() && !selectedFile)) return;
    setSending(true);
    try {
      const messageId = await sendSpaceMessage(
        selectedRoom.id,
        composer.trim() || `Shared ${selectedFile?.name ?? "an attachment"}`,
      );
      if (selectedFile) {
        await uploadSpaceAttachment(messageId, selectedFile);
        toast.success("Attachment uploaded to security review");
      }
      setComposer("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadRoom(selectedRoom.id);
    } catch (sendError) {
      toast.error(sendError instanceof Error ? sendError.message : "Could not send message");
    } finally {
      setSending(false);
    }
  }

  async function sendThreadReply() {
    if (!selectedRoom || !activeThread || !threadComposer.trim()) return;
    setThreadSending(true);
    try {
      await sendSpaceMessage(selectedRoom.id, threadComposer, activeThread.summary.id);
      setThreadComposer("");
      await Promise.all([
        loadThread(selectedRoom.id, activeThread.summary.id),
        loadRoom(selectedRoom.id),
      ]);
    } catch (sendError) {
      toast.error(sendError instanceof Error ? sendError.message : "Could not send Thread reply");
    } finally {
      setThreadSending(false);
    }
  }

  async function openThread(message: SpaceMessage) {
    if (!selectedRoom) return;
    try {
      const summary =
        message.thread ?? (await createMessageThread(selectedRoom.id, message.id, undefined));
      setActiveThread({ summary, parent: message });
      await loadThread(selectedRoom.id, summary.id);
    } catch (threadError) {
      toast.error(threadError instanceof Error ? threadError.message : "Could not open Thread");
    }
  }

  async function react(messageId: string, key: SpaceReaction["key"], inThread = false) {
    if (!selectedRoom) return;
    try {
      await toggleSpaceReaction(messageId, key);
      if (inThread && activeThread) await loadThread(selectedRoom.id, activeThread.summary.id);
      else await loadRoom(selectedRoom.id);
    } catch (reactionError) {
      toast.error(reactionError instanceof Error ? reactionError.message : "Could not react");
    }
  }

  async function loadEarlier() {
    if (!selectedRoom || !feed.nextCursor) return;
    setLoadingEarlier(true);
    try {
      const older = await getRoomFeed(selectedRoom.id, { cursor: feed.nextCursor });
      setFeed((current) => ({
        ...current,
        items: [...older.items, ...current.items],
        hasMore: older.hasMore,
        nextCursor: older.nextCursor,
      }));
    } catch (loadError) {
      toast.error(
        loadError instanceof Error ? loadError.message : "Could not load earlier messages",
      );
    } finally {
      setLoadingEarlier(false);
    }
  }

  async function submitReport() {
    if (!reportTarget || reportDescription.trim().length < 10) return;
    setReportSaving(true);
    try {
      await reportSpaceMessage(reportTarget.id, reportCategory, reportDescription);
      toast.success("Report sent to the moderation queue");
      setReportTarget(null);
      setReportDescription("");
    } catch (reportError) {
      toast.error(reportError instanceof Error ? reportError.message : "Could not submit report");
    } finally {
      setReportSaving(false);
    }
  }

  async function moderateMessage(message: SpaceMessage, inThread = false) {
    if (!selectedRoom) return;
    const restoring = Boolean(message.deletedAt);
    try {
      await moderateSpaceMessage(
        message.id,
        restoring ? "restore" : "content_restrict",
        restoring
          ? "Restored after Space moderation review."
          : "Restricted after Space moderation review.",
      );
      await Promise.all([
        loadRoom(selectedRoom.id),
        inThread && activeThread
          ? loadThread(selectedRoom.id, activeThread.summary.id)
          : Promise.resolve(),
      ]);
      toast.success(restoring ? "Message restored" : "Message hidden and action audited");
    } catch (moderationError) {
      toast.error(moderationError instanceof Error ? moderationError.message : "Moderation failed");
    }
  }

  function openRoomSettings() {
    if (!selectedRoom) return;
    setRoomName(selectedRoom.display_name);
    setRoomDescription(selectedRoom.description);
    setRoomPostingPolicy(selectedRoom.posting_policy);
    setRoomSettingsOpen(true);
  }

  async function saveRoomSettings() {
    if (!selectedRoom || !roomName.trim()) return;
    setRoomSaving(true);
    try {
      await updateSpaceRoom(selectedRoom.id, roomName, roomDescription, roomPostingPolicy);
      await loadWorkspace();
      setRoomSettingsOpen(false);
      toast.success("Room settings updated");
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Could not update Room");
    } finally {
      setRoomSaving(false);
    }
  }

  async function toggleThreadLock() {
    if (!selectedRoom || !activeThread) return;
    const locked = !activeThread.summary.lockedAt;
    try {
      await setSpaceThreadLock(
        activeThread.summary.id,
        locked,
        locked
          ? "Thread locked after Space moderation review."
          : "Thread reopened after Space moderation review.",
      );
      const summary = {
        ...activeThread.summary,
        lockedAt: locked ? new Date().toISOString() : null,
      };
      setActiveThread({ ...activeThread, summary });
      await loadRoom(selectedRoom.id);
      toast.success(locked ? "Thread locked" : "Thread reopened");
    } catch (lockError) {
      toast.error(lockError instanceof Error ? lockError.message : "Could not change Thread lock");
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
          <h1 className="mt-6 font-display text-3xl">{workspace.space.display_name}</h1>
        </div>
        <div className="p-8 text-center">
          <Users className="mx-auto h-9 w-9 text-muted-foreground" />
          <h2 className="mt-4 font-semibold">Membership opens the Rooms</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Join or request access from the Chapter or Mission page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-[calc(100vh-7rem)] overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div
          className={`grid min-h-[calc(100vh-7rem)] grid-cols-1 ${activeThread ? "lg:grid-cols-[250px_minmax(0,1fr)_minmax(320px,390px)]" : "lg:grid-cols-[250px_minmax(0,1fr)_240px]"}`}
        >
          <aside className="border-b border-white/10 bg-[var(--indigo-night)] text-white lg:border-b-0 lg:border-r">
            <div className="border-b border-white/10 p-5">
              {sourceBack}
              <div className="mt-5 flex items-center gap-2 text-[var(--saffron)]">
                <Radio className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase tracking-[0.22em]">
                  Orbit Space
                </span>
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
                        onClick={() => chooseRoom(room.id)}
                        className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm transition ${room.id === selectedRoomId ? "bg-white/12 text-white" : "text-white/58 hover:bg-white/7 hover:text-white"}`}
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
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="hidden sm:inline-flex">
                  {selectedRoom?.posting_policy ?? "members"}
                </Badge>
                {feed.canManage && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Room settings"
                    onClick={openRoomSettings}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </header>
            <section className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
              {feed.hasMore && (
                <div className="mb-4 text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={loadingEarlier}
                    onClick={() => void loadEarlier()}
                  >
                    {loadingEarlier && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}Load
                    earlier
                  </Button>
                </div>
              )}
              {messagesLoading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : feed.items.length === 0 ? (
                <div className="flex h-full min-h-72 items-center justify-center text-center">
                  <div>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--saffron)]/15 text-[var(--saffron)]">
                      {selectedRoom ? (
                        roomIcon(selectedRoom.room_type)
                      ) : (
                        <Hash className="h-5 w-5" />
                      )}
                    </div>
                    <h3 className="mt-4 font-display text-xl">Begin with context</h3>
                    <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                      Make the purpose, evidence, or decision clear for people who arrive later.
                    </p>
                  </div>
                </div>
              ) : (
                <MessageList
                  messages={feed.items}
                  canModerate={feed.canModerate}
                  onThread={openThread}
                  onReact={react}
                  onReport={setReportTarget}
                  onModerate={moderateMessage}
                />
              )}
              <div ref={timelineEndRef} />
            </section>
            <footer className="border-t border-border bg-card p-4 sm:p-5">
              {selectedFile && (
                <div className="mb-2 flex items-center justify-between rounded-xl bg-muted px-3 py-2 text-xs">
                  <span className="truncate">{selectedFile.name} · security review required</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setSelectedFile(null)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
              <div className="flex items-end gap-2 rounded-2xl border border-border bg-background px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-[var(--saffron)]/25">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp,application/pdf,text/plain,text/markdown"
                  onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 shrink-0"
                  aria-label="Attach a file"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
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
                  maxLength={4000}
                  disabled={!selectedRoom || sending}
                  placeholder={
                    selectedRoom ? `Message #${selectedRoom.display_name}` : "Choose a Room"
                  }
                  className="max-h-36 min-h-10 flex-1 resize-none bg-transparent px-1 py-2 text-sm outline-none placeholder:text-muted-foreground"
                />
                <Button
                  size="icon"
                  onClick={() => void sendMessage()}
                  disabled={!selectedRoom || (!composer.trim() && !selectedFile) || sending}
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
                Enter sends · 4,000 characters · five private attachments up to 10 MB · files remain
                quarantined until trusted security review
              </p>
            </footer>
          </main>

          {activeThread && selectedRoom ? (
            <ThreadPane
              thread={activeThread}
              feed={threadFeed}
              loading={threadLoading}
              sending={threadSending}
              composer={threadComposer}
              canModerate={feed.canModerate}
              endRef={threadEndRef}
              onComposer={setThreadComposer}
              onClose={() => setActiveThread(null)}
              onSend={sendThreadReply}
              onReact={(id, key) => react(id, key, true)}
              onReport={setReportTarget}
              onLock={toggleThreadLock}
              onModerate={(message) => moderateMessage(message, true)}
            />
          ) : (
            <PeoplePane workspace={workspace} />
          )}
        </div>
      </div>

      <Dialog open={Boolean(reportTarget)} onOpenChange={(open) => !open && setReportTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report message</DialogTitle>
            <DialogDescription>
              The message content is not copied into the report. Describe the concern for the
              moderation team.
            </DialogDescription>
          </DialogHeader>
          <label className="space-y-2 text-sm">
            <span className="font-medium">Category</span>
            <select
              value={reportCategory}
              onChange={(event) => setReportCategory(event.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3"
            >
              <option value="safety">Safety</option>
              <option value="harassment">Harassment</option>
              <option value="spam">Spam</option>
              <option value="privacy">Privacy</option>
              <option value="misinformation">Misinformation</option>
              <option value="other">Other</option>
            </select>
          </label>
          <Textarea
            value={reportDescription}
            onChange={(event) => setReportDescription(event.target.value)}
            minLength={10}
            maxLength={2000}
            placeholder="Explain what needs review (at least 10 characters)"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportTarget(null)}>
              Cancel
            </Button>
            <Button
              disabled={reportSaving || reportDescription.trim().length < 10}
              onClick={() => void submitReport()}
            >
              {reportSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Send report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={roomSettingsOpen} onOpenChange={setRoomSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Room administration</DialogTitle>
            <DialogDescription>
              Changes are scoped to this Chapter or Mission Space and enforced by the database.
            </DialogDescription>
          </DialogHeader>
          <label className="space-y-2 text-sm">
            <span className="font-medium">Room name</span>
            <Input
              value={roomName}
              onChange={(event) => setRoomName(event.target.value)}
              maxLength={100}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">Description</span>
            <Textarea
              value={roomDescription}
              onChange={(event) => setRoomDescription(event.target.value)}
              maxLength={1000}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">Who can post</span>
            <select
              value={roomPostingPolicy}
              onChange={(event) => setRoomPostingPolicy(event.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3"
            >
              <option value="members">All members</option>
              <option value="stewards">Stewards/coordinators</option>
              <option value="owners">Leads only</option>
              <option value="read_only">Read only</option>
            </select>
          </label>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoomSettingsOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={roomSaving || !roomName.trim()}
              onClick={() => void saveRoomSettings()}
            >
              {roomSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Room
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function MessageList({
  messages,
  canModerate,
  onThread,
  onReact,
  onReport,
  onModerate,
  allowThreads = true,
}: {
  messages: SpaceMessage[];
  canModerate: boolean;
  onThread: (message: SpaceMessage) => Promise<void>;
  onReact: (messageId: string, key: SpaceReaction["key"]) => Promise<void>;
  onReport: (message: SpaceMessage) => void;
  onModerate: (message: SpaceMessage) => Promise<void>;
  allowThreads?: boolean;
}) {
  return (
    <div className="space-y-1">
      {messages.map((message, index) => {
        const previous = messages[index - 1];
        const grouped =
          previous?.authorId === message.authorId &&
          new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime() <
            5 * 60 * 1000;
        return (
          <article
            key={message.id}
            className={`group flex gap-3 rounded-xl px-2 py-2 hover:bg-muted/45 ${grouped ? "mt-0" : "mt-4"}`}
          >
            <div className="w-9 shrink-0">
              {!grouped && (
                <Avatar className="h-9 w-9">
                  <AvatarImage src={message.authorAvatarUrl ?? undefined} />
                  <AvatarFallback>
                    {message.authorDisplayName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
            <div className="min-w-0 flex-1">
              {!grouped && (
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-sm font-semibold">{message.authorDisplayName}</span>
                  <time className="text-[10px] text-muted-foreground">
                    {formatMoment(message.createdAt)}
                  </time>
                </div>
              )}
              <p
                className={`whitespace-pre-wrap break-words text-sm leading-6 ${message.deletedAt ? "italic text-muted-foreground" : "text-foreground/90"}`}
              >
                {message.content ?? "Message removed by a Space moderator."}
              </p>
              <AttachmentList attachments={message.attachments} />
              <div className="mt-1 flex flex-wrap items-center gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                {reactions.map(({ key, label, icon: Icon }) => {
                  const state = message.reactions.find((item) => item.key === key);
                  return (
                    <Button
                      key={key}
                      type="button"
                      variant={state?.reactedByMe ? "secondary" : "ghost"}
                      size="sm"
                      className="h-7 gap-1 px-2 text-[11px]"
                      disabled={Boolean(message.deletedAt)}
                      title={label}
                      onClick={() => void onReact(message.id, key)}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {state?.count ? state.count : null}
                    </Button>
                  );
                })}
                {allowThreads && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 px-2 text-[11px]"
                    disabled={Boolean(message.deletedAt)}
                    onClick={() => void onThread(message)}
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    {message.thread ? `${message.thread.replyCount} replies` : "Thread"}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2 text-[11px]"
                  onClick={() => onReport(message)}
                >
                  <Flag className="h-3.5 w-3.5" />
                  Report
                </Button>
                {canModerate && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 px-2 text-[11px]"
                    onClick={() => void onModerate(message)}
                  >
                    {message.deletedAt ? (
                      <RotateCcw className="h-3.5 w-3.5" />
                    ) : (
                      <ShieldAlert className="h-3.5 w-3.5" />
                    )}
                    {message.deletedAt ? "Restore" : "Restrict"}
                  </Button>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function AttachmentList({ attachments }: { attachments: SpaceMessage["attachments"] }) {
  if (!attachments.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className="flex max-w-full items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs"
        >
          <FileText className="h-4 w-4 shrink-0 text-[var(--saffron)]" />
          <span className="max-w-52 truncate">{attachment.fileName}</span>
          {attachment.scanStatus === "clean" && attachment.signedUrl ? (
            <a
              href={attachment.signedUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={`Download ${attachment.fileName}`}
            >
              <Download className="h-4 w-4" />
            </a>
          ) : (
            <Badge variant="outline" className="text-[9px]">
              {attachment.scanStatus === "pending" ? "Security review" : attachment.scanStatus}
            </Badge>
          )}
        </div>
      ))}
    </div>
  );
}

function ThreadPane({
  thread,
  feed,
  loading,
  sending,
  composer,
  canModerate,
  endRef,
  onComposer,
  onClose,
  onSend,
  onReact,
  onReport,
  onLock,
  onModerate,
}: {
  thread: ActiveThread;
  feed: SpaceFeed;
  loading: boolean;
  sending: boolean;
  composer: string;
  canModerate: boolean;
  endRef: React.RefObject<HTMLDivElement | null>;
  onComposer: (value: string) => void;
  onClose: () => void;
  onSend: () => Promise<void>;
  onReact: (messageId: string, key: SpaceReaction["key"]) => Promise<void>;
  onReport: (message: SpaceMessage) => void;
  onLock: () => Promise<void>;
  onModerate: (message: SpaceMessage) => Promise<void>;
}) {
  const locked = Boolean(thread.summary.lockedAt);
  return (
    <aside className="flex min-h-[620px] flex-col border-l border-border bg-card">
      <header className="flex h-20 items-center gap-2 border-b border-border px-4">
        <MessageCircle className="h-4 w-4 text-[var(--saffron)]" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{thread.summary.title ?? "Thread"}</p>
          <p className="text-[10px] text-muted-foreground">{feed.items.length} loaded replies</p>
        </div>
        {canModerate && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={locked ? "Reopen Thread" : "Lock Thread"}
            onClick={() => void onLock()}
          >
            {locked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          </Button>
        )}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Close Thread"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </header>
      <div className="border-b border-border bg-muted/35 p-4">
        <p className="text-xs font-semibold">{thread.parent.authorDisplayName}</p>
        <p className="mt-1 line-clamp-3 text-xs leading-5 text-muted-foreground">
          {thread.parent.content ?? "Removed message"}
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <MessageList
            messages={feed.items}
            canModerate={canModerate}
            onThread={async () => undefined}
            onReact={onReact}
            onReport={onReport}
            onModerate={onModerate}
            allowThreads={false}
          />
        )}
        <div ref={endRef} />
      </div>
      <div className="border-t border-border p-3">
        {locked ? (
          <div className="rounded-xl bg-muted p-3 text-center text-xs text-muted-foreground">
            <Lock className="mx-auto mb-2 h-4 w-4" />
            This Thread is locked.
          </div>
        ) : (
          <div className="flex items-end gap-2 rounded-xl border border-border px-2 py-1">
            <textarea
              value={composer}
              onChange={(event) => onComposer(event.target.value)}
              rows={1}
              maxLength={4000}
              placeholder="Reply in Thread"
              className="min-h-9 flex-1 resize-none bg-transparent px-1 py-2 text-xs outline-none"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void onSend();
                }
              }}
            />
            <Button
              type="button"
              size="icon"
              className="h-8 w-8"
              disabled={sending || !composer.trim()}
              onClick={() => void onSend()}
            >
              {sending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}

function PeoplePane({ workspace }: { workspace: SpaceWorkspace }) {
  return (
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
  );
}

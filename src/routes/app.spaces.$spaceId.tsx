import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Archive,
  BadgeCheck,
  Bell,
  BookOpenCheck,
  Bookmark,
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
  Pin,
  Plus,
  Radio,
  RotateCcw,
  Search,
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
import { cn } from "@/lib/utils";
import {
  SPACE_SLOW_MODE_OPTIONS,
  archiveManagedSpaceRoom,
  createManagedSpaceRoom,
  createMessageThread,
  createSpaceBoardTopic,
  explainManagedSpaceRoomPermission,
  getRoomFeed,
  getManagedSpaceRoomPermissions,
  listManagedSpaceMembers,
  getSpaceBoardTopics,
  getSpaceRoomControls,
  getSpaceThreadControls,
  getSpaceWorkspace,
  markSpaceRoomRead,
  markSpaceThreadRead,
  moderateSpaceMessage,
  reportSpaceMessage,
  replaceManagedSpaceThreadMembers,
  reorderManagedSpaceRooms,
  searchSpaceMessages,
  sendSpaceMessage,
  decideManagedSpaceMembership,
  setSpaceAttentionPolicy,
  setSpaceBoardTopicState,
  setManagedSpaceRoomPermission,
  setManagedSpaceMemberTimeout,
  setSpaceThreadLock,
  setSpaceThreadFollowing,
  setSpaceNotificationPreference,
  toggleSpaceReaction,
  toggleSpaceBookmark,
  toggleSpacePin,
  updateSpaceRoom,
  uploadSpaceAttachment,
  type SpaceBoardTopic,
  type SpaceFeed,
  type ManagedSpaceMember,
  type SpaceMessage,
  type SpaceReaction,
  type SpaceThreadSummary,
  type SpaceThreadControls,
  type SpaceWorkspace,
  type SpaceRoomControls,
  type SpaceRoomPermission,
  type SpaceRoomPermissionCapability,
  type SpacePermissionExplanation,
  type SpaceSearchResult,
  type SpaceSearchCursor,
  type SpaceNotificationPreference,
} from "@/features/spaces/space-client";
import { createSpaceSendRequestIds } from "@/features/spaces/space-send-recovery";
import { setMyOrbitSavedItem } from "@/features/orbit/saved-items";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Room = Database["public"]["Tables"]["conversation_rooms"]["Row"];
type ActiveThread = { summary: SpaceThreadSummary; parent: SpaceMessage };
type RoomSendAttempt = {
  roomId: string;
  roomName: string;
  content: string;
  composerValue: string;
  mentionedUserIds: string[];
  mentionedRoleIds: string[];
  file: File | null;
  messageClientRequestId: string;
  attachmentClientRequestId: string;
  messageId?: string;
  errorMessage?: string;
};
type ThreadSendAttempt = {
  roomId: string;
  threadId: string;
  threadLabel: string;
  content: string;
  mentionedUserIds: string[];
  mentionedRoleIds: string[];
  clientRequestId: string;
  errorMessage?: string;
};

const emptyFeed: SpaceFeed = {
  items: [],
  hasMore: false,
  nextCursor: null,
  canManage: false,
  canModerate: false,
};

const emptyRoomControls: SpaceRoomControls = {
  roomId: "",
  preference: "default",
  quietHours: {
    policyVersion: 1,
    timezone: "UTC",
    enabled: false,
    start: null,
    end: null,
    digestHour: 8,
  },
  quietActive: false,
  nextDeliveryAt: null,
  bookmarkedMessageIds: [],
  pinnedMessageIds: [],
  followedThreadIds: [],
  unreadThreadIds: [],
  canManagePins: false,
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

const roomPermissionOptions: Array<{
  value: SpaceRoomPermissionCapability;
  label: string;
}> = [
  { value: "room.view", label: "View Room" },
  { value: "message.create", label: "Post messages" },
  { value: "thread.create", label: "Create Threads" },
  { value: "message.moderate", label: "Moderate messages" },
  { value: "room.manage", label: "Manage Room" },
];

const memberTimeoutOptions = [
  { seconds: 300, label: "5 minutes" },
  { seconds: 1800, label: "30 minutes" },
  { seconds: 3600, label: "1 hour" },
  { seconds: 86400, label: "24 hours" },
  { seconds: 604800, label: "7 days" },
] as const;

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

function slowModeLabel(seconds: number) {
  if (seconds === 0) return "Off";
  if (seconds < 60) return `${seconds} seconds`;
  const minutes = seconds / 60;
  return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
}

function SpacePage() {
  const { spaceId } = Route.useParams();
  const { user } = useAuth();
  const [workspace, setWorkspace] = useState<SpaceWorkspace | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [feed, setFeed] = useState<SpaceFeed>(emptyFeed);
  const [roomControls, setRoomControls] = useState<SpaceRoomControls>(emptyRoomControls);
  const [activeThread, setActiveThread] = useState<ActiveThread | null>(null);
  const [threadFeed, setThreadFeed] = useState<SpaceFeed>(emptyFeed);
  const [threadControls, setThreadControls] = useState<SpaceThreadControls | null>(null);
  const [composer, setComposer] = useState("");
  const [threadComposer, setThreadComposer] = useState("");
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const [threadMentionedUserIds, setThreadMentionedUserIds] = useState<string[]>([]);
  const [threadMentionedRoleIds, setThreadMentionedRoleIds] = useState<string[]>([]);
  const [mentionedRoleIds, setMentionedRoleIds] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [threadLoading, setThreadLoading] = useState(false);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [sending, setSending] = useState(false);
  const [threadSending, setThreadSending] = useState(false);
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [failedRoomSend, setFailedRoomSend] = useState<RoomSendAttempt | null>(null);
  const [failedThreadSend, setFailedThreadSend] = useState<ThreadSendAttempt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<SpaceMessage | null>(null);
  const [reportCategory, setReportCategory] = useState("safety");
  const [reportDescription, setReportDescription] = useState("");
  const [reportSaving, setReportSaving] = useState(false);
  const [roomSettingsOpen, setRoomSettingsOpen] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [roomDescription, setRoomDescription] = useState("");
  const [roomPostingPolicy, setRoomPostingPolicy] = useState("members");
  const [roomSlowModeSeconds, setRoomSlowModeSeconds] = useState(0);
  const [roomSaving, setRoomSaving] = useState(false);
  const [roomPermissions, setRoomPermissions] = useState<SpaceRoomPermission[]>([]);
  const [permissionSubjectType, setPermissionSubjectType] = useState<"role" | "member">("role");
  const [permissionSubjectId, setPermissionSubjectId] = useState("");
  const [permissionCapability, setPermissionCapability] =
    useState<SpaceRoomPermissionCapability>("room.view");
  const [permissionEffect, setPermissionEffect] = useState<"allow" | "deny">("allow");
  const [permissionSaving, setPermissionSaving] = useState<string | null>(null);
  const [attentionBusy, setAttentionBusy] = useState<string | null>(null);
  const [attentionSettingsOpen, setAttentionSettingsOpen] = useState(false);
  const [attentionPreference, setAttentionPreference] =
    useState<SpaceNotificationPreference>("default");
  const [attentionTimezone, setAttentionTimezone] = useState("UTC");
  const [attentionQuietEnabled, setAttentionQuietEnabled] = useState(false);
  const [attentionQuietStart, setAttentionQuietStart] = useState("22:00");
  const [attentionQuietEnd, setAttentionQuietEnd] = useState("07:00");
  const [attentionDigestHour, setAttentionDigestHour] = useState(8);
  const [attentionSaving, setAttentionSaving] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SpaceSearchResult[]>([]);
  const [searchedQuery, setSearchedQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchCursor, setSearchCursor] = useState<SpaceSearchCursor | null>(null);
  const [searchHasMore, setSearchHasMore] = useState(false);
  const [searchingMore, setSearchingMore] = useState(false);
  const [threadMembersOpen, setThreadMembersOpen] = useState(false);
  const [threadMemberUserIds, setThreadMemberUserIds] = useState<string[]>([]);
  const [threadMemberSaving, setThreadMemberSaving] = useState(false);
  const [boardTopics, setBoardTopics] = useState<SpaceBoardTopic[]>([]);
  const [boardTitle, setBoardTitle] = useState("");
  const [boardBody, setBoardBody] = useState("");
  const [boardTags, setBoardTags] = useState("");
  const [boardSaving, setBoardSaving] = useState(false);
  const [roomManagerOpen, setRoomManagerOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomDescription, setNewRoomDescription] = useState("");
  const [newRoomType, setNewRoomType] = useState<Room["room_type"]>("conversation");
  const [newRoomGroupId, setNewRoomGroupId] = useState("");
  const [roomManagerBusy, setRoomManagerBusy] = useState(false);
  const [permissionExplanation, setPermissionExplanation] =
    useState<SpacePermissionExplanation | null>(null);
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
      const [next, controls, topics] = await Promise.all([
        getRoomFeed(roomId),
        getSpaceRoomControls(roomId),
        getSpaceBoardTopics(roomId),
      ]);
      setFeed(next);
      setRoomControls(controls);
      setBoardTopics(topics);
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
      const [next, controls, nextThreadControls] = await Promise.all([
        getRoomFeed(roomId, { threadId }),
        getSpaceRoomControls(roomId),
        getSpaceThreadControls(threadId),
      ]);
      setThreadFeed(next);
      setRoomControls(controls);
      setThreadControls(nextThreadControls);
      const lastMessage = next.items.at(-1);
      if (lastMessage && controls.followedThreadIds.includes(threadId)) {
        await markSpaceThreadRead(threadId, lastMessage.id);
        setRoomControls({
          ...controls,
          unreadThreadIds: controls.unreadThreadIds.filter((id) => id !== threadId),
        });
      }
      return nextThreadControls;
    } catch (loadError) {
      setThreadControls(null);
      toast.error(loadError instanceof Error ? loadError.message : "Could not load Thread");
      return null;
    } finally {
      setThreadLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadWorkspace);
  }, [loadWorkspace]);

  useEffect(() => {
    const markOnline = () => setIsOnline(true);
    const markOffline = () => setIsOnline(false);
    window.addEventListener("online", markOnline);
    window.addEventListener("offline", markOffline);
    return () => {
      window.removeEventListener("online", markOnline);
      window.removeEventListener("offline", markOffline);
    };
  }, []);

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
    setThreadControls(null);
    setMentionedUserIds([]);
    setThreadMentionedUserIds([]);
    setThreadMentionedRoleIds([]);
    setMentionedRoleIds([]);
    setSelectedFile(null);
    setRoomControls(emptyRoomControls);
    setBoardTopics([]);
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

  async function executeRoomSend(attempt: RoomSendAttempt) {
    setSending(true);
    let completedMessageId = attempt.messageId;
    try {
      if (!isOnline) throw new Error("You are offline. Reconnect to send this message.");
      completedMessageId ??= await sendSpaceMessage(
        attempt.roomId,
        attempt.content,
        undefined,
        attempt.mentionedUserIds,
        attempt.mentionedRoleIds,
        attempt.messageClientRequestId,
      );
      if (attempt.file) {
        await uploadSpaceAttachment(
          completedMessageId,
          attempt.file,
          attempt.attachmentClientRequestId,
        );
        toast.success("Attachment uploaded to security review");
      }
      setFailedRoomSend(null);
      if (composer === attempt.composerValue) {
        setComposer("");
        setMentionedUserIds([]);
        setMentionedRoleIds([]);
      }
      if (selectedFile === attempt.file) {
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
      if (selectedRoomId === attempt.roomId) await loadRoom(attempt.roomId);
    } catch (sendError) {
      const errorMessage =
        sendError instanceof Error ? sendError.message : "Could not send message";
      setFailedRoomSend({ ...attempt, messageId: completedMessageId, errorMessage });
      toast.error(errorMessage);
    } finally {
      setSending(false);
    }
  }

  async function sendMessage() {
    if (!selectedRoom || (!composer.trim() && !selectedFile)) return;
    if (failedRoomSend) {
      toast.error("Retry or discard the uncertain delivery before sending another message");
      return;
    }
    const requestIds = createSpaceSendRequestIds();
    await executeRoomSend({
      roomId: selectedRoom.id,
      roomName: selectedRoom.display_name,
      content: composer.trim() || `Shared ${selectedFile?.name ?? "an attachment"}`,
      composerValue: composer,
      mentionedUserIds: [...mentionedUserIds],
      mentionedRoleIds: [...mentionedRoleIds],
      file: selectedFile,
      ...requestIds,
    });
  }

  async function runSearch() {
    if (!workspace || searching || searchQuery.trim().length < 2) return;
    setSearching(true);
    setSearchCursor(null);
    setSearchHasMore(false);
    try {
      const cleanQuery = searchQuery.trim();
      const page = await searchSpaceMessages(workspace.space.id, cleanQuery);
      setSearchResults(page.items);
      setSearchCursor(page.nextCursor);
      setSearchHasMore(page.hasMore);
      setSearchedQuery(cleanQuery);
    } catch (searchError) {
      toast.error(searchError instanceof Error ? searchError.message : "Could not search Space");
    } finally {
      setSearching(false);
    }
  }

  async function loadMoreSearchResults() {
    if (!workspace || !searchedQuery || !searchCursor || !searchHasMore || searchingMore) return;
    setSearchingMore(true);
    try {
      const page = await searchSpaceMessages(workspace.space.id, searchedQuery, 30, searchCursor);
      setSearchResults((current) => {
        const seen = new Set(current.map((result) => result.messageId));
        return [...current, ...page.items.filter((result) => !seen.has(result.messageId))];
      });
      setSearchCursor(page.nextCursor);
      setSearchHasMore(page.hasMore);
    } catch (searchError) {
      toast.error(
        searchError instanceof Error ? searchError.message : "Could not load more search results",
      );
    } finally {
      setSearchingMore(false);
    }
  }

  async function openSearchResult(result: SpaceSearchResult) {
    chooseRoom(result.roomId);
    setSearchOpen(false);
    if (!result.thread) return;
    const summary: SpaceThreadSummary = {
      id: result.thread.id,
      title: result.thread.title,
      replyCount: result.thread.replyCount,
      updatedAt: result.thread.updatedAt,
      lockedAt: result.thread.lockedAt,
    };
    const parent: SpaceMessage = {
      id: result.thread.parentMessageId,
      roomId: result.roomId,
      threadId: null,
      authorId: result.thread.parentAuthorId,
      authorDisplayName: result.thread.parentAuthorDisplayName,
      authorAvatarUrl: result.thread.parentAuthorAvatarUrl,
      messageType: "human",
      content: result.thread.parentContent,
      createdAt: result.thread.parentCreatedAt,
      editedAt: null,
      deletedAt: result.thread.parentContent === null ? result.thread.parentCreatedAt : null,
      reactions: [],
      attachments: [],
      thread: summary,
    };
    setActiveThread({ summary, parent });
    setThreadControls(null);
    setThreadMentionedUserIds([]);
    setThreadMentionedRoleIds([]);
    await loadThread(result.roomId, result.thread.id);
  }

  async function executeThreadSend(attempt: ThreadSendAttempt) {
    setThreadSending(true);
    try {
      if (!isOnline) throw new Error("You are offline. Reconnect to send this reply.");
      await sendSpaceMessage(
        attempt.roomId,
        attempt.content,
        attempt.threadId,
        attempt.mentionedUserIds,
        attempt.mentionedRoleIds,
        attempt.clientRequestId,
      );
      setFailedThreadSend(null);
      if (activeThread?.summary.id === attempt.threadId && threadComposer === attempt.content) {
        setThreadComposer("");
        setThreadMentionedUserIds([]);
        setThreadMentionedRoleIds([]);
      }
      if (selectedRoomId === attempt.roomId) {
        await Promise.all([
          activeThread?.summary.id === attempt.threadId
            ? loadThread(attempt.roomId, attempt.threadId)
            : Promise.resolve(null),
          loadRoom(attempt.roomId),
        ]);
      }
    } catch (sendError) {
      const errorMessage =
        sendError instanceof Error ? sendError.message : "Could not send Thread reply";
      setFailedThreadSend({ ...attempt, errorMessage });
      toast.error(errorMessage);
    } finally {
      setThreadSending(false);
    }
  }

  async function sendThreadReply() {
    if (!selectedRoom || !activeThread || !threadComposer.trim()) return;
    if (failedThreadSend) {
      toast.error("Retry or discard the uncertain Thread reply before sending another one");
      return;
    }
    await executeThreadSend({
      roomId: selectedRoom.id,
      threadId: activeThread.summary.id,
      threadLabel: activeThread.summary.title ?? "Thread",
      content: threadComposer.trim(),
      mentionedUserIds: [...threadMentionedUserIds],
      mentionedRoleIds: [...threadMentionedRoleIds],
      clientRequestId: crypto.randomUUID(),
    });
  }

  async function openThread(message: SpaceMessage, visibility: "room" | "private" = "room") {
    if (!selectedRoom) return;
    try {
      const summary =
        message.thread ??
        (await createMessageThread(selectedRoom.id, message.id, undefined, visibility));
      setActiveThread({ summary, parent: message });
      setThreadControls(null);
      setThreadMentionedUserIds([]);
      setThreadMentionedRoleIds([]);
      const controls = await loadThread(selectedRoom.id, summary.id);
      if (visibility === "private" && controls?.canManageMembers) {
        setThreadMemberUserIds(controls.memberUserIds);
        setThreadMembersOpen(true);
      }
    } catch (threadError) {
      toast.error(threadError instanceof Error ? threadError.message : "Could not open Thread");
    }
  }

  function openThreadMemberEditor() {
    if (!threadControls?.canManageMembers) return;
    setThreadMemberUserIds(threadControls.memberUserIds);
    setThreadMembersOpen(true);
  }

  async function saveThreadMembers() {
    if (!activeThread || !threadControls?.canManageMembers || threadMemberSaving) return;
    setThreadMemberSaving(true);
    try {
      const next = await replaceManagedSpaceThreadMembers(
        activeThread.summary.id,
        threadMemberUserIds,
      );
      setThreadControls(next);
      setThreadMemberUserIds(next.memberUserIds);
      setThreadMembersOpen(false);
      toast.success("Private Thread audience updated");
    } catch (memberError) {
      toast.error(
        memberError instanceof Error ? memberError.message : "Could not update Thread members",
      );
    } finally {
      setThreadMemberSaving(false);
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

  async function toggleBookmark(messageId: string) {
    if (attentionBusy) return;
    setAttentionBusy(`bookmark:${messageId}`);
    try {
      const bookmarked = await toggleSpaceBookmark(messageId);
      setRoomControls((current) => ({
        ...current,
        bookmarkedMessageIds: bookmarked
          ? Array.from(new Set([...current.bookmarkedMessageIds, messageId]))
          : current.bookmarkedMessageIds.filter((id) => id !== messageId),
      }));
      toast.success(bookmarked ? "Saved to your bookmarks" : "Bookmark removed");
    } catch (bookmarkError) {
      toast.error(
        bookmarkError instanceof Error ? bookmarkError.message : "Could not update bookmark",
      );
    } finally {
      setAttentionBusy(null);
    }
  }

  async function togglePin(messageId: string) {
    if (attentionBusy) return;
    setAttentionBusy(`pin:${messageId}`);
    try {
      const pinned = await toggleSpacePin(messageId);
      setRoomControls((current) => ({
        ...current,
        pinnedMessageIds: pinned
          ? Array.from(new Set([...current.pinnedMessageIds, messageId]))
          : current.pinnedMessageIds.filter((id) => id !== messageId),
      }));
      toast.success(pinned ? "Message pinned for this Room" : "Room pin removed");
    } catch (pinError) {
      toast.error(pinError instanceof Error ? pinError.message : "Could not update Room pin");
    } finally {
      setAttentionBusy(null);
    }
  }

  async function toggleThreadFollowing() {
    if (!activeThread || attentionBusy) return;
    const threadId = activeThread.summary.id;
    const following = !roomControls.followedThreadIds.includes(threadId);
    setAttentionBusy(`follow:${threadId}`);
    try {
      await setSpaceThreadFollowing(threadId, following);
      const lastMessage = threadFeed.items.at(-1);
      if (following && lastMessage) await markSpaceThreadRead(threadId, lastMessage.id);
      setRoomControls((current) => ({
        ...current,
        followedThreadIds: following
          ? Array.from(new Set([...current.followedThreadIds, threadId]))
          : current.followedThreadIds.filter((id) => id !== threadId),
        unreadThreadIds: current.unreadThreadIds.filter((id) => id !== threadId),
      }));
      toast.success(following ? "Following this Thread" : "Thread notifications stopped");
    } catch (followError) {
      toast.error(
        followError instanceof Error ? followError.message : "Could not update Thread follow",
      );
    } finally {
      setAttentionBusy(null);
    }
  }

  async function changeNotificationPreference(preference: SpaceNotificationPreference) {
    if (!selectedRoom || attentionBusy) return;
    setAttentionBusy("preference");
    try {
      await setSpaceNotificationPreference(
        workspace?.space.id ?? spaceId,
        selectedRoom.id,
        preference,
      );
      setRoomControls((current) => ({ ...current, preference }));
      toast.success("Room notification preference updated");
    } catch (preferenceError) {
      toast.error(
        preferenceError instanceof Error
          ? preferenceError.message
          : "Could not update notifications",
      );
    } finally {
      setAttentionBusy(null);
    }
  }

  function openAttentionSettings() {
    const quiet = roomControls.quietHours;
    setAttentionPreference(roomControls.preference);
    setAttentionTimezone(
      quiet.timezone === "UTC"
        ? (Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC")
        : quiet.timezone,
    );
    setAttentionQuietEnabled(quiet.enabled);
    setAttentionQuietStart(quiet.start ?? "22:00");
    setAttentionQuietEnd(quiet.end ?? "07:00");
    setAttentionDigestHour(quiet.digestHour);
    setAttentionSettingsOpen(true);
  }

  async function saveAttentionSettings() {
    if (!selectedRoom || !workspace || attentionSaving) return;
    setAttentionSaving(true);
    try {
      await setSpaceAttentionPolicy({
        spaceId: workspace.space.id,
        roomId: selectedRoom.id,
        preference: attentionPreference,
        quietHours: {
          policyVersion: 1,
          timezone: attentionTimezone.trim(),
          enabled: attentionQuietEnabled,
          start: attentionQuietEnabled ? attentionQuietStart : null,
          end: attentionQuietEnabled ? attentionQuietEnd : null,
          digestHour: attentionDigestHour,
        },
      });
      setRoomControls(await getSpaceRoomControls(selectedRoom.id));
      setAttentionSettingsOpen(false);
      toast.success("Room attention schedule updated");
    } catch (attentionError) {
      toast.error(
        attentionError instanceof Error
          ? attentionError.message
          : "Could not update the attention schedule",
      );
    } finally {
      setAttentionSaving(false);
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

  async function openRoomSettings() {
    if (!selectedRoom || !workspace) return;
    setRoomName(selectedRoom.display_name);
    setRoomDescription(selectedRoom.description);
    setRoomPostingPolicy(selectedRoom.posting_policy);
    setRoomSlowModeSeconds(selectedRoom.slow_mode_seconds);
    setPermissionSubjectType(workspace.roles.length ? "role" : "member");
    setPermissionSubjectId(workspace.roles[0]?.id ?? workspace.members[0]?.user_id ?? "");
    setRoomSettingsOpen(true);
    try {
      setRoomPermissions(await getManagedSpaceRoomPermissions(selectedRoom.id));
    } catch (permissionError) {
      toast.error(
        permissionError instanceof Error
          ? permissionError.message
          : "Could not load Room permissions",
      );
    }
  }

  async function saveRoomPermission(
    effect: "allow" | "deny" | "inherit",
    existing?: SpaceRoomPermission,
  ) {
    if (!selectedRoom || permissionSaving) return;
    const roleId =
      existing?.roleId ?? (permissionSubjectType === "role" ? permissionSubjectId : undefined);
    const userId =
      existing?.userId ?? (permissionSubjectType === "member" ? permissionSubjectId : undefined);
    const capability = existing?.capability ?? permissionCapability;
    if (!roleId && !userId) return;
    setPermissionSaving(existing?.id ?? "new");
    try {
      await setManagedSpaceRoomPermission({
        roomId: selectedRoom.id,
        roleId: roleId ?? undefined,
        userId: userId ?? undefined,
        capability,
        effect,
      });
      setRoomPermissions(await getManagedSpaceRoomPermissions(selectedRoom.id));
      toast.success(
        effect === "inherit" ? "Room permission now inherits" : "Room permission saved",
      );
    } catch (permissionError) {
      toast.error(
        permissionError instanceof Error
          ? permissionError.message
          : "Could not update Room permission",
      );
    } finally {
      setPermissionSaving(null);
    }
  }

  async function saveRoomSettings() {
    if (!selectedRoom || !roomName.trim()) return;
    setRoomSaving(true);
    try {
      await updateSpaceRoom(
        selectedRoom.id,
        roomName,
        roomDescription,
        roomPostingPolicy,
        roomSlowModeSeconds,
      );
      await loadWorkspace();
      setRoomSettingsOpen(false);
      toast.success("Room settings updated");
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Could not update Room");
    } finally {
      setRoomSaving(false);
    }
  }

  async function createRoom() {
    if (!workspace || !newRoomName.trim()) return;
    setRoomManagerBusy(true);
    try {
      await createManagedSpaceRoom({
        spaceId: workspace.space.id,
        contextGroupId: newRoomGroupId || workspace.groups[0]?.id || null,
        displayName: newRoomName,
        description: newRoomDescription,
        roomType: newRoomType,
        visibility: "members",
        postingPolicy: "members",
      });
      setNewRoomName("");
      setNewRoomDescription("");
      await loadWorkspace();
      toast.success("Room created");
    } catch (createError) {
      toast.error(createError instanceof Error ? createError.message : "Could not create Room");
    } finally {
      setRoomManagerBusy(false);
    }
  }

  async function moveRoom(roomId: string, direction: -1 | 1) {
    if (!workspace) return;
    const ordered = workspace.rooms.map((room) => room.id);
    const currentIndex = ordered.indexOf(roomId);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= ordered.length) return;
    [ordered[currentIndex], ordered[nextIndex]] = [ordered[nextIndex]!, ordered[currentIndex]!];
    setRoomManagerBusy(true);
    try {
      await reorderManagedSpaceRooms(workspace.space.id, ordered);
      await loadWorkspace();
      toast.success("Room order updated");
    } catch (reorderError) {
      toast.error(reorderError instanceof Error ? reorderError.message : "Could not reorder Rooms");
    } finally {
      setRoomManagerBusy(false);
    }
  }

  async function archiveRoom(room: Room) {
    setRoomManagerBusy(true);
    try {
      await archiveManagedSpaceRoom(
        room.id,
        "Archived by a Space manager from Room administration.",
      );
      await loadWorkspace();
      toast.success("Room archived; its history remains retained");
    } catch (archiveError) {
      toast.error(archiveError instanceof Error ? archiveError.message : "Could not archive Room");
    } finally {
      setRoomManagerBusy(false);
    }
  }

  async function createBoardTopic() {
    if (!selectedRoom || selectedRoom.room_type !== "board") return;
    setBoardSaving(true);
    try {
      await createSpaceBoardTopic({
        roomId: selectedRoom.id,
        title: boardTitle,
        content: boardBody,
        tags: boardTags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      });
      setBoardTitle("");
      setBoardBody("");
      setBoardTags("");
      await loadRoom(selectedRoom.id);
      toast.success("Board topic published");
    } catch (boardError) {
      toast.error(boardError instanceof Error ? boardError.message : "Could not create topic");
    } finally {
      setBoardSaving(false);
    }
  }

  async function changeBoardState(topic: SpaceBoardTopic, state: SpaceBoardTopic["state"]) {
    if (!selectedRoom) return;
    try {
      await setSpaceBoardTopicState(topic.threadId, state);
      await loadRoom(selectedRoom.id);
      toast.success(`Topic marked ${state}`);
    } catch (boardError) {
      toast.error(
        boardError instanceof Error ? boardError.message : "Could not change topic state",
      );
    }
  }

  async function explainRoleAccess() {
    if (!selectedRoom || permissionSubjectType !== "role" || !permissionSubjectId) return;
    try {
      setPermissionExplanation(
        await explainManagedSpaceRoomPermission({
          roomId: selectedRoom.id,
          roleId: permissionSubjectId,
          capability: permissionCapability,
        }),
      );
    } catch (explainError) {
      toast.error(
        explainError instanceof Error ? explainError.message : "Could not explain access",
      );
    }
  }

  async function saveCurrentSpace() {
    if (!workspace) return;
    try {
      await setMyOrbitSavedItem({
        objectType: "space",
        objectId: workspace.space.id,
        saved: true,
      });
      toast.success("Space added to Saved work");
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Could not save Space");
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
              <div className="mt-4 flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 flex-1 bg-white/5 text-[11px] text-white hover:bg-white/10 hover:text-white"
                  onClick={() => void saveCurrentSpace()}
                >
                  <Bookmark className="h-3.5 w-3.5" /> Save Space
                </Button>
                {feed.canManage ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 flex-1 bg-white/5 text-[11px] text-white hover:bg-white/10 hover:text-white"
                    onClick={() => {
                      setNewRoomGroupId(workspace.groups[0]?.id ?? "");
                      setRoomManagerOpen(true);
                    }}
                  >
                    <Settings className="h-3.5 w-3.5" /> Rooms
                  </Button>
                ) : null}
              </div>
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
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  aria-label="Search this Space"
                  onClick={() => setSearchOpen(true)}
                >
                  <Search className="h-3.5 w-3.5" />
                </Button>
                <label className="hidden items-center gap-1.5 text-[10px] text-muted-foreground sm:flex">
                  <Bell className="h-3.5 w-3.5" />
                  <span className="sr-only">Room notifications</span>
                  <select
                    value={roomControls.preference}
                    disabled={!selectedRoom || attentionBusy !== null}
                    onChange={(event) =>
                      void changeNotificationPreference(
                        event.target.value as SpaceNotificationPreference,
                      )
                    }
                    className="h-8 rounded-lg border border-input bg-background px-2 text-[10px] text-foreground"
                    aria-label="Room notification preference"
                  >
                    <option value="default">Default</option>
                    <option value="all">All activity</option>
                    <option value="mentions">Mentions</option>
                    <option value="digest">Digest</option>
                    <option value="mute">Mute</option>
                  </select>
                </label>
                <Button
                  type="button"
                  size="icon"
                  variant={roomControls.quietActive ? "secondary" : "ghost"}
                  className="h-8 w-8"
                  aria-label="Configure notifications, digest and quiet hours"
                  disabled={!selectedRoom}
                  onClick={openAttentionSettings}
                >
                  <Bell className="h-3.5 w-3.5" />
                </Button>
                {roomControls.quietActive ? (
                  <Badge variant="outline" className="hidden text-[9px] sm:inline-flex">
                    Quiet now
                  </Badge>
                ) : null}
                {roomControls.pinnedMessageIds.length ? (
                  <Badge variant="outline" className="hidden gap-1 sm:inline-flex">
                    <Pin className="h-3 w-3" /> {roomControls.pinnedMessageIds.length}
                  </Badge>
                ) : null}
                {roomControls.bookmarkedMessageIds.length ? (
                  <Badge variant="outline" className="hidden gap-1 sm:inline-flex">
                    <Bookmark className="h-3 w-3" /> {roomControls.bookmarkedMessageIds.length}
                  </Badge>
                ) : null}
                <Badge variant="outline" className="hidden sm:inline-flex">
                  {selectedRoom?.posting_policy ?? "members"}
                </Badge>
                {selectedRoom?.slow_mode_seconds ? (
                  <Badge variant="outline" className="hidden sm:inline-flex">
                    Slow {slowModeLabel(selectedRoom.slow_mode_seconds)}
                  </Badge>
                ) : null}
                {feed.canManage && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Room settings"
                    onClick={() => void openRoomSettings()}
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
              ) : selectedRoom?.room_type === "board" ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-[var(--saffron)]" />
                      <h3 className="font-semibold">Start a structured topic</h3>
                    </div>
                    <div className="mt-3 grid gap-3">
                      <Input
                        value={boardTitle}
                        onChange={(event) => setBoardTitle(event.target.value)}
                        maxLength={160}
                        placeholder="A clear question or decision title"
                      />
                      <Textarea
                        value={boardBody}
                        onChange={(event) => setBoardBody(event.target.value)}
                        maxLength={4000}
                        placeholder="Context, evidence and the response you need"
                      />
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Input
                          value={boardTags}
                          onChange={(event) => setBoardTags(event.target.value)}
                          placeholder="Tags, comma separated (up to 5)"
                        />
                        <Button
                          type="button"
                          disabled={
                            boardSaving || boardTitle.trim().length < 3 || !boardBody.trim()
                          }
                          onClick={() => void createBoardTopic()}
                        >
                          {boardSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Plus className="h-4 w-4" />
                          )}
                          Publish topic
                        </Button>
                      </div>
                    </div>
                  </div>
                  {boardTopics.length ? (
                    boardTopics.map((topic) => (
                      <article
                        key={topic.threadId}
                        className="rounded-2xl border border-border bg-card p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={topic.state === "open" ? "secondary" : "outline"}>
                            {topic.state}
                          </Badge>
                          {topic.tags.map((tag) => (
                            <Badge key={tag} variant="outline">
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                        <h3 className="mt-3 font-display text-xl">{topic.title}</h3>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                          {topic.body}
                        </p>
                        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{topic.authorDisplayName}</span>
                          <span>·</span>
                          <span>{topic.replyCount} replies</span>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="ml-auto h-8"
                            onClick={() => {
                              const parent = feed.items.find(
                                (message) => message.id === topic.messageId,
                              );
                              if (parent) openThread(parent);
                            }}
                          >
                            Open discussion
                          </Button>
                          <select
                            aria-label={`State for ${topic.title}`}
                            value={topic.state}
                            onChange={(event) =>
                              void changeBoardState(
                                topic,
                                event.target.value as SpaceBoardTopic["state"],
                              )
                            }
                            className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
                          >
                            <option value="open">Open</option>
                            <option value="answered">Answered</option>
                            <option value="resolved">Resolved</option>
                            <option value="closed">Closed</option>
                          </select>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                      No board topics yet. Start with a clear title and enough context for a useful
                      answer.
                    </div>
                  )}
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
                  canManagePins={roomControls.canManagePins}
                  bookmarkedMessageIds={roomControls.bookmarkedMessageIds}
                  pinnedMessageIds={roomControls.pinnedMessageIds}
                  onThread={openThread}
                  onPrivateThread={(message) => openThread(message, "private")}
                  onReact={react}
                  onBookmark={toggleBookmark}
                  onPin={togglePin}
                  onReport={setReportTarget}
                  onModerate={moderateMessage}
                />
              )}
              <div ref={timelineEndRef} />
            </section>
            <footer className="border-t border-border bg-card p-4 sm:p-5">
              {!isOnline ? (
                <div
                  role="status"
                  className="mb-3 flex items-center gap-2 rounded-xl border border-[var(--saffron)]/45 bg-[var(--saffron)]/10 px-3 py-2 text-xs font-medium text-foreground"
                >
                  <Radio className="h-4 w-4 shrink-0 text-[var(--saffron)]" />
                  You are offline. This draft stays in this tab; reconnect to send it.
                </div>
              ) : null}
              {failedRoomSend ? (
                <div
                  role="alert"
                  className="mb-3 rounded-xl border border-destructive/35 bg-destructive/5 px-3 py-2 text-xs text-foreground"
                >
                  <p className="font-semibold">
                    Delivery to #{failedRoomSend.roomName} is uncertain
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {failedRoomSend.errorMessage ?? "The route did not confirm delivery."} Retrying
                    reuses the original request, so it cannot create a duplicate.
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="h-8"
                      disabled={!isOnline || sending}
                      onClick={() => void executeRoomSend(failedRoomSend)}
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Retry safely
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8"
                      disabled={sending}
                      onClick={() => setFailedRoomSend(null)}
                    >
                      Discard retry
                    </Button>
                  </div>
                </div>
              ) : null}
              {selectedFile && (
                <div className="mb-2 flex items-center justify-between rounded-xl bg-muted px-3 py-2 text-xs">
                  <span className="truncate">{selectedFile.name} · security review required</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={Boolean(failedRoomSend) || sending}
                    onClick={() => setSelectedFile(null)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
              <MentionPicker
                members={workspace.members}
                roles={workspace.roles}
                actorUserId={user?.id ?? null}
                selectedIds={mentionedUserIds}
                onChange={setMentionedUserIds}
                selectedRoleIds={mentionedRoleIds}
                onRoleChange={setMentionedRoleIds}
                canMentionRoles={feed.canManage}
              />
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
                  disabled={Boolean(failedRoomSend) || sending}
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
                  disabled={!selectedRoom || sending || Boolean(failedRoomSend)}
                  placeholder={
                    selectedRoom ? `Message #${selectedRoom.display_name}` : "Choose a Room"
                  }
                  className="max-h-36 min-h-10 flex-1 resize-none bg-transparent px-1 py-2 text-sm outline-none placeholder:text-muted-foreground"
                />
                <Button
                  size="icon"
                  onClick={() => void sendMessage()}
                  disabled={
                    !selectedRoom ||
                    (!composer.trim() && !selectedFile) ||
                    sending ||
                    !isOnline ||
                    Boolean(failedRoomSend)
                  }
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
                Enter sends · 4,000 characters · five private attachments up to 10 MB · safe retry
                stays in this tab · files remain quarantined until trusted security review
              </p>
            </footer>
          </main>

          {activeThread && selectedRoom ? (
            <ThreadPane
              thread={activeThread}
              feed={threadFeed}
              loading={threadLoading}
              sending={threadSending}
              online={isOnline}
              retryAttempt={failedThreadSend}
              composer={threadComposer}
              members={workspace.members}
              roles={workspace.roles}
              actorUserId={user?.id ?? null}
              mentionedUserIds={threadMentionedUserIds}
              mentionedRoleIds={threadMentionedRoleIds}
              controls={threadControls}
              canModerate={feed.canModerate}
              canMentionRoles={feed.canManage && threadControls?.visibility === "room"}
              endRef={threadEndRef}
              onComposer={setThreadComposer}
              onMentionedUserIds={setThreadMentionedUserIds}
              onMentionedRoleIds={setThreadMentionedRoleIds}
              onManageMembers={openThreadMemberEditor}
              onClose={() => {
                setActiveThread(null);
                setThreadControls(null);
                setThreadMentionedUserIds([]);
                setThreadMentionedRoleIds([]);
              }}
              onSend={sendThreadReply}
              onRetry={() =>
                failedThreadSend ? executeThreadSend(failedThreadSend) : Promise.resolve()
              }
              onDiscardRetry={() => setFailedThreadSend(null)}
              onReact={(id, key) => react(id, key, true)}
              onReport={setReportTarget}
              onLock={toggleThreadLock}
              following={roomControls.followedThreadIds.includes(activeThread.summary.id)}
              unread={roomControls.unreadThreadIds.includes(activeThread.summary.id)}
              followBusy={attentionBusy === `follow:${activeThread.summary.id}`}
              onFollow={toggleThreadFollowing}
              onModerate={(message) => moderateMessage(message, true)}
            />
          ) : (
            <PeoplePane
              workspace={workspace}
              canManage={feed.canManage}
              actorUserId={user?.id ?? null}
              onMembershipChanged={loadWorkspace}
            />
          )}
        </div>
      </div>

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Search this Space</DialogTitle>
            <DialogDescription>
              Search only returns messages from Rooms and private Threads you can currently open.
              Removed content stays excluded.
            </DialogDescription>
          </DialogHeader>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void runSearch();
            }}
          >
            <Input
              autoFocus
              value={searchQuery}
              minLength={2}
              maxLength={100}
              placeholder="Search decisions, evidence or context"
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setSearchedQuery("");
                setSearchResults([]);
                setSearchCursor(null);
                setSearchHasMore(false);
              }}
            />
            <Button type="submit" disabled={searching || searchQuery.trim().length < 2}>
              {searching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Search
            </Button>
          </form>
          <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
            {searchResults.map((result) => (
              <button
                key={result.messageId}
                type="button"
                className="block w-full rounded-2xl border border-border bg-card p-4 text-left transition hover:border-[var(--saffron)]/45 hover:bg-muted/35"
                onClick={() => void openSearchResult(result)}
              >
                <span className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                  <Badge variant="outline">#{result.roomName}</Badge>
                  {result.thread ? (
                    <Badge variant="secondary">{result.thread.title ?? "Thread"}</Badge>
                  ) : null}
                  <span>{result.authorDisplayName}</span>
                  <span>{formatMoment(result.createdAt)}</span>
                </span>
                <span className="mt-2 line-clamp-3 block whitespace-pre-wrap text-sm leading-6 text-foreground/85">
                  {result.excerpt}
                </span>
                <span className="mt-2 block text-[10px] font-medium text-[var(--saffron-deep)]">
                  {result.thread ? "Open Thread" : "Open Room"}
                </span>
              </button>
            ))}
            {!searching && searchedQuery && searchResults.length === 0 ? (
              <div className="rounded-2xl bg-muted/50 p-6 text-center text-sm text-muted-foreground">
                No visible messages match this search.
              </div>
            ) : null}
            {searchHasMore && searchCursor ? (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={searchingMore}
                onClick={() => void loadMoreSearchResults()}
              >
                {searchingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Load more results
              </Button>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(reportTarget)} onOpenChange={(open) => !open && setReportTarget(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
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

      <Dialog open={attentionSettingsOpen} onOpenChange={setAttentionSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Attention schedule</DialogTitle>
            <DialogDescription>
              Choose what this Room may notify you about and when delivery should wait. Times use
              your named timezone and never change Room visibility.
            </DialogDescription>
          </DialogHeader>
          <label className="space-y-2 text-sm">
            <span className="font-medium">Notification level</span>
            <select
              value={attentionPreference}
              onChange={(event) =>
                setAttentionPreference(event.target.value as SpaceNotificationPreference)
              }
              className="h-10 w-full rounded-md border border-input bg-background px-3"
            >
              <option value="default">Default</option>
              <option value="all">All activity</option>
              <option value="mentions">Mentions</option>
              <option value="digest">Daily digest</option>
              <option value="mute">Mute</option>
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">IANA timezone</span>
            <Input
              value={attentionTimezone}
              onChange={(event) => setAttentionTimezone(event.target.value)}
              placeholder="Asia/Kolkata"
              maxLength={64}
            />
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-border p-3 text-sm">
            <input
              type="checkbox"
              checked={attentionQuietEnabled}
              onChange={(event) => setAttentionQuietEnabled(event.target.checked)}
            />
            Hold external delivery during quiet hours
          </label>
          {attentionQuietEnabled ? (
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-2 text-sm">
                <span className="font-medium">Quiet starts</span>
                <Input
                  type="time"
                  value={attentionQuietStart}
                  onChange={(event) => setAttentionQuietStart(event.target.value)}
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium">Quiet ends</span>
                <Input
                  type="time"
                  value={attentionQuietEnd}
                  onChange={(event) => setAttentionQuietEnd(event.target.value)}
                />
              </label>
            </div>
          ) : null}
          <label className="space-y-2 text-sm">
            <span className="font-medium">Daily digest hour · 0–23</span>
            <Input
              type="number"
              min={0}
              max={23}
              step={1}
              value={attentionDigestHour}
              onChange={(event) => setAttentionDigestHour(Number(event.target.value))}
            />
          </label>
          {roomControls.nextDeliveryAt ? (
            <p className="rounded-xl bg-muted p-3 text-xs text-muted-foreground">
              Current next scheduled delivery: {formatMoment(roomControls.nextDeliveryAt)}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAttentionSettingsOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                attentionSaving ||
                !attentionTimezone.trim() ||
                !Number.isInteger(attentionDigestHour) ||
                attentionDigestHour < 0 ||
                attentionDigestHour > 23 ||
                (attentionQuietEnabled &&
                  (!attentionQuietStart ||
                    !attentionQuietEnd ||
                    attentionQuietStart === attentionQuietEnd))
              }
              onClick={() => void saveAttentionSettings()}
            >
              {attentionSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={roomManagerOpen} onOpenChange={setRoomManagerOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Room structure</DialogTitle>
            <DialogDescription>
              Create, order or archive Rooms. Archive is reversible in the control plane and never
              deletes history.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {workspace.rooms.map((room, index) => (
              <div
                key={room.id}
                className="flex items-center gap-2 rounded-xl border border-border p-3"
              >
                {roomIcon(room.room_type)}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{room.display_name}</p>
                  <p className="text-[10px] capitalize text-muted-foreground">
                    {room.room_type.replace("_", " ")}
                  </p>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  disabled={roomManagerBusy || index === 0}
                  aria-label={`Move ${room.display_name} up`}
                  onClick={() => void moveRoom(room.id, -1)}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  disabled={roomManagerBusy || index === workspace.rooms.length - 1}
                  aria-label={`Move ${room.display_name} down`}
                  onClick={() => void moveRoom(room.id, 1)}
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive"
                  disabled={roomManagerBusy || workspace.rooms.length === 1}
                  aria-label={`Archive ${room.display_name}`}
                  onClick={() => void archiveRoom(room)}
                >
                  <Archive className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
          <div className="space-y-3 rounded-2xl border border-border bg-muted/35 p-4">
            <h3 className="text-sm font-semibold">Create a Room</h3>
            <Input
              value={newRoomName}
              onChange={(event) => setNewRoomName(event.target.value)}
              maxLength={100}
              placeholder="Room name"
            />
            <Textarea
              value={newRoomDescription}
              onChange={(event) => setNewRoomDescription(event.target.value)}
              maxLength={1000}
              placeholder="Purpose and participation context"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <select
                value={newRoomGroupId}
                onChange={(event) => setNewRoomGroupId(event.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {workspace.groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.display_name}
                  </option>
                ))}
              </select>
              <select
                value={newRoomType}
                onChange={(event) => setNewRoomType(event.target.value as Room["room_type"])}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="conversation">Conversation</option>
                <option value="board">Board / forum</option>
                <option value="announcement">Announcement</option>
                <option value="help">Help</option>
                <option value="evidence">Evidence</option>
                <option value="event_index">Event index</option>
              </select>
            </div>
            <Button
              type="button"
              disabled={roomManagerBusy || !newRoomName.trim()}
              onClick={() => void createRoom()}
            >
              {roomManagerBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}{" "}
              Create Room
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={roomSettingsOpen} onOpenChange={setRoomSettingsOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
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
          <label className="space-y-2 text-sm">
            <span className="font-medium">Slow mode</span>
            <select
              value={roomSlowModeSeconds}
              onChange={(event) => setRoomSlowModeSeconds(Number(event.target.value))}
              className="h-10 w-full rounded-md border border-input bg-background px-3"
            >
              {SPACE_SLOW_MODE_OPTIONS.map((seconds) => (
                <option key={seconds} value={seconds}>
                  {slowModeLabel(seconds)}
                </option>
              ))}
            </select>
            <span className="block text-xs text-muted-foreground">
              Members wait between Room or Thread posts. Space managers can moderate without the
              delay; the database enforces the interval.
            </span>
          </label>
          <div className="space-y-3 rounded-2xl border border-border p-4">
            <div>
              <h3 className="text-sm font-semibold">Room access overrides</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Explicit deny wins. Remove an override to return to the Space role and Room policy.
                Source Chapter/Mission ownership is not changed here.
              </p>
            </div>
            {roomPermissions.length ? (
              <div className="space-y-2">
                {roomPermissions.map((permission) => {
                  const subject = permission.roleId
                    ? (workspace.roles.find((role) => role.id === permission.roleId)
                        ?.display_name ?? "Space role")
                    : (workspace.members.find((member) => member.user_id === permission.userId)
                        ?.profiles?.display_name ?? "Space member");
                  const capability =
                    roomPermissionOptions.find((option) => option.value === permission.capability)
                      ?.label ?? permission.capability;
                  return (
                    <div
                      key={permission.id}
                      className="flex flex-wrap items-center gap-2 rounded-xl bg-muted/45 px-3 py-2 text-xs"
                    >
                      <span className="font-medium">{subject}</span>
                      <span className="text-muted-foreground">{capability}</span>
                      <Badge variant={permission.effect === "deny" ? "destructive" : "secondary"}>
                        {permission.effect}
                      </Badge>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="ml-auto h-7 text-[10px]"
                        disabled={permissionSaving !== null}
                        onClick={() => void saveRoomPermission("inherit", permission)}
                      >
                        {permissionSaving === permission.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          "Use inherited"
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-xl bg-muted/45 p-3 text-xs text-muted-foreground">
                No explicit overrides. This Room uses inherited Space and posting policy.
              </p>
            )}
            <div className="grid gap-2 sm:grid-cols-2">
              <select
                value={permissionSubjectType}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                onChange={(event) => {
                  const type = event.target.value as "role" | "member";
                  setPermissionSubjectType(type);
                  setPermissionSubjectId(
                    type === "role"
                      ? (workspace.roles[0]?.id ?? "")
                      : (workspace.members[0]?.user_id ?? ""),
                  );
                }}
              >
                <option value="role">Space role</option>
                <option value="member">Individual member</option>
              </select>
              <select
                value={permissionSubjectId}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                onChange={(event) => setPermissionSubjectId(event.target.value)}
              >
                {permissionSubjectType === "role"
                  ? workspace.roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.display_name}
                      </option>
                    ))
                  : workspace.members.map((member) => (
                      <option key={member.user_id} value={member.user_id}>
                        {member.profiles?.display_name ?? "Member"}
                      </option>
                    ))}
              </select>
              <select
                value={permissionCapability}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                onChange={(event) =>
                  setPermissionCapability(event.target.value as SpaceRoomPermissionCapability)
                }
              >
                {roomPermissionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={permissionEffect}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                onChange={(event) => setPermissionEffect(event.target.value as "allow" | "deny")}
              >
                <option value="allow">Explicitly allow</option>
                <option value="deny">Explicitly deny</option>
              </select>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={!permissionSubjectId || permissionSaving !== null}
              onClick={() => void saveRoomPermission(permissionEffect)}
            >
              {permissionSaving === "new" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add override
            </Button>
            {permissionSubjectType === "role" ? (
              <div className="rounded-xl border border-border bg-background/60 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold">View effective access as this role</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      This explains inherited access without impersonating a member session.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void explainRoleAccess()}
                  >
                    Explain access
                  </Button>
                </div>
                {permissionExplanation ? (
                  <div className="mt-3 text-xs">
                    <Badge
                      variant={
                        permissionExplanation.effective === "allow" ? "secondary" : "destructive"
                      }
                    >
                      {permissionExplanation.effective}
                    </Badge>
                    <span className="ml-2 text-muted-foreground">
                      {permissionExplanation.reason}
                    </span>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Role chain:{" "}
                      {permissionExplanation.roleChain.map((role) => role.name).join(" → ")}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
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

      <Dialog open={threadMembersOpen} onOpenChange={setThreadMembersOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Private Thread members</DialogTitle>
            <DialogDescription>
              Choose up to {threadControls?.maxMembers ?? 30} people who already belong to this
              Space. Room access rules are checked again when you save.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between rounded-xl bg-muted/45 px-3 py-2 text-xs">
            <span>Explicit audience</span>
            <Badge variant="secondary">
              {threadMemberUserIds.length}/{threadControls?.maxMembers ?? 30}
            </Badge>
          </div>
          <div className="max-h-80 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
            {workspace.members.map((member) => {
              const checked = threadMemberUserIds.includes(member.user_id);
              const isCreator = member.user_id === threadControls?.createdBy;
              return (
                <label
                  key={member.user_id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/55"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={isCreator || threadMemberSaving}
                    onChange={(event) => {
                      if (event.target.checked) {
                        if (threadMemberUserIds.length >= (threadControls?.maxMembers ?? 30)) {
                          toast.error("This private Thread has reached its member limit");
                          return;
                        }
                        setThreadMemberUserIds((current) => [...current, member.user_id]);
                      } else {
                        setThreadMemberUserIds((current) =>
                          current.filter((id) => id !== member.user_id),
                        );
                      }
                    }}
                  />
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.profiles?.avatar_url ?? undefined} />
                    <AvatarFallback>
                      {member.profiles?.display_name?.slice(0, 2).toUpperCase() ?? "IO"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {member.profiles?.display_name ?? "Member"}
                  </span>
                  {isCreator ? <Badge variant="outline">Creator</Badge> : null}
                </label>
              );
            })}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={threadMemberSaving}
              onClick={() => setThreadMembersOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={
                threadMemberSaving ||
                !threadControls ||
                !threadMemberUserIds.includes(threadControls.createdBy)
              }
              onClick={() => void saveThreadMembers()}
            >
              {threadMemberSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save audience
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
  canManagePins = false,
  bookmarkedMessageIds = [],
  pinnedMessageIds = [],
  onThread,
  onPrivateThread,
  onReact,
  onBookmark = async () => undefined,
  onPin = async () => undefined,
  onReport,
  onModerate,
  allowThreads = true,
}: {
  messages: SpaceMessage[];
  canModerate: boolean;
  canManagePins?: boolean;
  bookmarkedMessageIds?: string[];
  pinnedMessageIds?: string[];
  onThread: (message: SpaceMessage) => Promise<void>;
  onPrivateThread?: (message: SpaceMessage) => Promise<void>;
  onReact: (messageId: string, key: SpaceReaction["key"]) => Promise<void>;
  onBookmark?: (messageId: string) => Promise<void>;
  onPin?: (messageId: string) => Promise<void>;
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
        const bookmarked = bookmarkedMessageIds.includes(message.id);
        const pinned = pinnedMessageIds.includes(message.id);
        return (
          <article
            key={message.id}
            className={`group flex gap-3 rounded-xl px-2 py-2 hover:bg-muted/45 ${pinned ? "border border-amber-200 bg-amber-50/45" : ""} ${grouped ? "mt-0" : "mt-4"}`}
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
                  {pinned ? (
                    <Badge variant="outline" className="h-5 gap-1 text-[9px] text-amber-800">
                      <Pin className="h-3 w-3" /> Pinned
                    </Badge>
                  ) : null}
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
                {allowThreads && !message.thread && onPrivateThread ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 px-2 text-[11px]"
                    disabled={Boolean(message.deletedAt)}
                    title="Start a private Thread with an explicit member list"
                    onClick={() => void onPrivateThread(message)}
                  >
                    <Lock className="h-3.5 w-3.5" /> Private
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant={bookmarked ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 gap-1 px-2 text-[11px]"
                  disabled={Boolean(message.deletedAt)}
                  onClick={() => void onBookmark(message.id)}
                >
                  <Bookmark className="h-3.5 w-3.5" />
                  {bookmarked ? "Saved" : "Save"}
                </Button>
                {canManagePins ? (
                  <Button
                    type="button"
                    variant={pinned ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 gap-1 px-2 text-[11px]"
                    disabled={Boolean(message.deletedAt)}
                    onClick={() => void onPin(message.id)}
                  >
                    <Pin className="h-3.5 w-3.5" />
                    {pinned ? "Unpin" : "Pin"}
                  </Button>
                ) : null}
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

function MentionPicker({
  members,
  roles = [],
  actorUserId,
  selectedIds,
  onChange,
  selectedRoleIds = [],
  onRoleChange,
  canMentionRoles = false,
  compact = false,
}: {
  members: SpaceWorkspace["members"];
  roles?: SpaceWorkspace["roles"];
  actorUserId: string | null;
  selectedIds: string[];
  onChange: (value: string[]) => void;
  selectedRoleIds?: string[];
  onRoleChange?: (value: string[]) => void;
  canMentionRoles?: boolean;
  compact?: boolean;
}) {
  const available = members.filter(
    (member) => member.user_id !== actorUserId && !selectedIds.includes(member.user_id),
  );
  const selected = selectedIds.flatMap((id) => {
    const member = members.find((candidate) => candidate.user_id === id);
    return member ? [member] : [];
  });
  const availableRoles = canMentionRoles
    ? roles.filter((role) => !selectedRoleIds.includes(role.id))
    : [];
  const selectedRoles = selectedRoleIds.flatMap((id) => {
    const role = roles.find((candidate) => candidate.id === id);
    return role ? [role] : [];
  });
  if (!available.length && !selected.length && !availableRoles.length && !selectedRoles.length) {
    return null;
  }
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", !compact && "mb-2 px-1")}>
      {selected.map((member) => (
        <button
          key={member.user_id}
          type="button"
          className="rounded-full border border-[var(--saffron)]/35 bg-[var(--saffron)]/10 px-2 py-1 text-[10px] font-medium text-[var(--indigo-night)]"
          aria-label={`Remove mention ${member.profiles?.display_name ?? "Member"}`}
          onClick={() => onChange(selectedIds.filter((id) => id !== member.user_id))}
        >
          @{member.profiles?.display_name ?? "Member"} ×
        </button>
      ))}
      {available.length && selectedIds.length < 10 ? (
        <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span>@ Mention</span>
          <select
            value=""
            aria-label="Mention a Space member"
            className="h-7 max-w-40 rounded-lg border border-border bg-background px-2 text-[10px] text-foreground"
            onChange={(event) => {
              if (!event.target.value) return;
              onChange([...selectedIds, event.target.value]);
            }}
          >
            <option value="">Choose person</option>
            {available.map((member) => (
              <option key={member.user_id} value={member.user_id}>
                {member.profiles?.display_name ?? "Member"} · {member.domain_role}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {selectedIds.length === 10 ? (
        <span className="text-[10px] text-muted-foreground">10-person mention limit</span>
      ) : null}
      {selectedRoles.map((role) => (
        <button
          key={role.id}
          type="button"
          className="rounded-full border border-violet-300 bg-violet-50 px-2 py-1 text-[10px] font-medium text-violet-900"
          aria-label={`Remove role mention ${role.display_name}`}
          onClick={() => onRoleChange?.(selectedRoleIds.filter((id) => id !== role.id))}
        >
          @{role.display_name} ×
        </button>
      ))}
      {availableRoles.length && selectedRoleIds.length < 3 ? (
        <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span>@ Role</span>
          <select
            value=""
            aria-label="Mention a Space role"
            className="h-7 max-w-40 rounded-lg border border-border bg-background px-2 text-[10px] text-foreground"
            onChange={(event) => {
              if (!event.target.value) return;
              onRoleChange?.([...selectedRoleIds, event.target.value]);
            }}
          >
            <option value="">Choose role</option>
            {availableRoles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.display_name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {selectedRoleIds.length === 3 ? (
        <span className="text-[10px] text-muted-foreground">3-role mention limit</span>
      ) : null}
    </div>
  );
}

function ThreadPane({
  thread,
  feed,
  loading,
  sending,
  online,
  retryAttempt,
  composer,
  members,
  roles,
  actorUserId,
  mentionedUserIds,
  mentionedRoleIds,
  controls,
  canModerate,
  canMentionRoles,
  endRef,
  onComposer,
  onMentionedUserIds,
  onMentionedRoleIds,
  onManageMembers,
  onClose,
  onSend,
  onRetry,
  onDiscardRetry,
  onReact,
  onReport,
  onLock,
  following,
  unread,
  followBusy,
  onFollow,
  onModerate,
}: {
  thread: ActiveThread;
  feed: SpaceFeed;
  loading: boolean;
  sending: boolean;
  online: boolean;
  retryAttempt: ThreadSendAttempt | null;
  composer: string;
  members: SpaceWorkspace["members"];
  roles: SpaceWorkspace["roles"];
  actorUserId: string | null;
  mentionedUserIds: string[];
  mentionedRoleIds: string[];
  controls: SpaceThreadControls | null;
  canModerate: boolean;
  canMentionRoles: boolean;
  endRef: React.RefObject<HTMLDivElement | null>;
  onComposer: (value: string) => void;
  onMentionedUserIds: (value: string[]) => void;
  onMentionedRoleIds: (value: string[]) => void;
  onManageMembers: () => void;
  onClose: () => void;
  onSend: () => Promise<void>;
  onRetry: () => Promise<void>;
  onDiscardRetry: () => void;
  onReact: (messageId: string, key: SpaceReaction["key"]) => Promise<void>;
  onReport: (message: SpaceMessage) => void;
  onLock: () => Promise<void>;
  following: boolean;
  unread: boolean;
  followBusy: boolean;
  onFollow: () => Promise<void>;
  onModerate: (message: SpaceMessage) => Promise<void>;
}) {
  const locked = Boolean(thread.summary.lockedAt);
  return (
    <aside className="flex min-h-[620px] flex-col border-l border-border bg-card">
      <header className="flex h-20 items-center gap-2 border-b border-border px-4">
        <MessageCircle className="h-4 w-4 text-[var(--saffron)]" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{thread.summary.title ?? "Thread"}</p>
          <p className="text-[10px] text-muted-foreground">
            {controls?.visibility === "private"
              ? `Private · ${controls.memberCount} ${controls.memberCount === 1 ? "member" : "members"} · `
              : ""}
            {feed.items.length} loaded replies{unread ? " · unread activity" : ""}
          </p>
        </div>
        {controls?.canManageMembers ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-[10px]"
            onClick={onManageMembers}
          >
            <Users className="h-3.5 w-3.5" /> Members
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant={following ? "secondary" : "ghost"}
          className="h-8 px-2 text-[10px]"
          disabled={followBusy}
          onClick={() => void onFollow()}
        >
          {followBusy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Bell className="h-3.5 w-3.5" />
          )}
          {following ? "Following" : "Follow"}
        </Button>
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
          <div className="space-y-2">
            {!online ? (
              <div
                role="status"
                className="rounded-xl border border-[var(--saffron)]/45 bg-[var(--saffron)]/10 px-3 py-2 text-xs font-medium text-foreground"
              >
                Offline. This reply stays in this tab until you reconnect.
              </div>
            ) : null}
            {retryAttempt ? (
              <div
                role="alert"
                className="rounded-xl border border-destructive/35 bg-destructive/5 px-3 py-2 text-xs text-foreground"
              >
                <p className="font-semibold">Delivery to {retryAttempt.threadLabel} is uncertain</p>
                <p className="mt-1 text-muted-foreground">
                  {retryAttempt.errorMessage ?? "The route did not confirm delivery."}
                </p>
                <div className="mt-2 flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="h-8"
                    disabled={!online || sending}
                    onClick={() => void onRetry()}
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Retry safely
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8"
                    disabled={sending}
                    onClick={onDiscardRetry}
                  >
                    Discard retry
                  </Button>
                </div>
              </div>
            ) : null}
            <MentionPicker
              members={members}
              roles={roles}
              actorUserId={actorUserId}
              selectedIds={mentionedUserIds}
              onChange={onMentionedUserIds}
              selectedRoleIds={mentionedRoleIds}
              onRoleChange={onMentionedRoleIds}
              canMentionRoles={canMentionRoles}
              compact
            />
            <div className="flex items-end gap-2 rounded-xl border border-border px-2 py-1">
              <textarea
                value={composer}
                onChange={(event) => onComposer(event.target.value)}
                rows={1}
                maxLength={4000}
                disabled={sending || Boolean(retryAttempt)}
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
                disabled={sending || !composer.trim() || !online || Boolean(retryAttempt)}
                onClick={() => void onSend()}
              >
                {sending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

type SpaceMemberAction = {
  kind: "timeout" | "lift" | "remove" | "restore";
  member: ManagedSpaceMember;
};

function PeoplePane({
  workspace,
  canManage,
  actorUserId,
  onMembershipChanged,
}: {
  workspace: SpaceWorkspace;
  canManage: boolean;
  actorUserId: string | null;
  onMembershipChanged: () => Promise<void>;
}) {
  const [managedMembers, setManagedMembers] = useState<ManagedSpaceMember[]>([]);
  const [managedLoaded, setManagedLoaded] = useState(false);
  const [action, setAction] = useState<SpaceMemberAction | null>(null);
  const [reason, setReason] = useState("");
  const [timeoutSeconds, setTimeoutSeconds] =
    useState<(typeof memberTimeoutOptions)[number]["seconds"]>(3600);
  const [busy, setBusy] = useState(false);

  const loadManagedMembers = useCallback(async () => {
    if (!canManage) return;
    try {
      setManagedMembers(await listManagedSpaceMembers(workspace.space.id));
      setManagedLoaded(true);
    } catch (loadError) {
      toast.error(
        loadError instanceof Error ? loadError.message : "Could not load member controls",
      );
    }
  }, [canManage, workspace.space.id]);

  useEffect(() => {
    if (canManage) void Promise.resolve().then(loadManagedMembers);
  }, [canManage, loadManagedMembers]);

  const activeMembers: ManagedSpaceMember[] = workspace.members.map((member) => ({
    userId: member.user_id,
    displayName: member.profiles?.display_name ?? "Member",
    avatarUrl: member.profiles?.avatar_url ?? null,
    headline: member.profiles?.headline ?? null,
    domainRole: member.domain_role,
    membershipState: "active",
    sourceMembershipVersion: Number(member.source_membership_version),
    timeoutExpiresAt: null,
  }));
  const visibleMembers = canManage && managedLoaded ? managedMembers : activeMembers;

  function beginAction(kind: SpaceMemberAction["kind"], member: ManagedSpaceMember) {
    setAction({ kind, member });
    setReason("");
    setTimeoutSeconds(3600);
  }

  async function submitAction() {
    if (!action || reason.trim().length < 8 || busy) return;
    setBusy(true);
    try {
      if (action.kind === "timeout" || action.kind === "lift") {
        await setManagedSpaceMemberTimeout({
          spaceId: workspace.space.id,
          userId: action.member.userId,
          durationSeconds: action.kind === "lift" ? 0 : timeoutSeconds,
          reason,
          expectedMembershipVersion: action.member.sourceMembershipVersion,
        });
      } else {
        await decideManagedSpaceMembership({
          spaceId: workspace.space.id,
          userId: action.member.userId,
          decision: action.kind,
          role: action.member.domainRole,
          reason,
          expectedMembershipVersion: action.member.sourceMembershipVersion,
        });
        await onMembershipChanged();
      }
      await loadManagedMembers();
      toast.success(
        action.kind === "timeout"
          ? "Member timeout applied."
          : action.kind === "lift"
            ? "Member timeout lifted."
            : action.kind === "remove"
              ? "Member removed from the source programme and Space."
              : "Member restored to the source programme and Space.",
      );
      setAction(null);
      setReason("");
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : "Member action failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <aside className="hidden border-l border-border bg-card lg:block">
        <div className="flex h-20 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[var(--saffron)]" />
            <span className="text-sm font-semibold">People</span>
          </div>
          <Badge variant="secondary">{visibleMembers.length}</Badge>
        </div>
        <div className="max-h-[calc(100vh-12rem)] space-y-1 overflow-y-auto p-3">
          {visibleMembers.map((member) => {
            const protectedRole = ["lead", "steward", "coordinator"].includes(member.domainRole);
            const self = member.userId === actorUserId;
            const activeTimeout = member.timeoutExpiresAt !== null;
            return (
              <div key={member.userId} className="rounded-xl p-2 hover:bg-muted/55">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.avatarUrl ?? undefined} />
                    <AvatarFallback>
                      {member.displayName.slice(0, 2).toUpperCase() || "IO"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{member.displayName}</p>
                    <p className="truncate text-[10px] capitalize text-muted-foreground">
                      {member.domainRole} · {member.membershipState}
                    </p>
                    {activeTimeout ? (
                      <p className="text-[10px] text-destructive">
                        Timed out until {formatMoment(member.timeoutExpiresAt!)}
                      </p>
                    ) : null}
                  </div>
                </div>
                {canManage && !self && !protectedRole ? (
                  <div className="mt-2 flex flex-wrap gap-1 pl-11">
                    {member.membershipState === "active" ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-[10px]"
                          onClick={() => beginAction(activeTimeout ? "lift" : "timeout", member)}
                        >
                          {activeTimeout ? "Lift timeout" : "Timeout"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-[10px] text-destructive"
                          onClick={() => beginAction("remove", member)}
                        >
                          Remove
                        </Button>
                      </>
                    ) : member.membershipState === "removed" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-[10px]"
                        onClick={() => beginAction("restore", member)}
                      >
                        Restore
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </aside>

      <Dialog open={action !== null} onOpenChange={(open) => !open && setAction(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="capitalize">{action?.kind} member</DialogTitle>
            <DialogDescription>
              {action?.kind === "remove" || action?.kind === "restore"
                ? "This changes the canonical Chapter or Mission membership and the linked Space together."
                : "Timeouts block new Room and Thread messages at the database boundary. Existing messages are unchanged."}
            </DialogDescription>
          </DialogHeader>
          {action?.kind === "timeout" ? (
            <label className="space-y-1 text-xs font-medium">
              Duration
              <select
                className="h-10 w-full rounded-lg border border-border bg-background px-3"
                value={timeoutSeconds}
                onChange={(event) => {
                  const seconds = Number(event.target.value);
                  const option = memberTimeoutOptions.find((item) => item.seconds === seconds);
                  if (option) setTimeoutSeconds(option.seconds);
                }}
              >
                {memberTimeoutOptions.map((option) => (
                  <option key={option.seconds} value={option.seconds}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="space-y-1 text-xs font-medium">
            Operational reason
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={500}
              placeholder="Policy and evidence basis (minimum 8 characters)"
            />
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={() => setAction(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant={action?.kind === "remove" ? "destructive" : "default"}
              disabled={busy || reason.trim().length < 8}
              onClick={() => void submitAction()}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

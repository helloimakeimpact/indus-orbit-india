import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { MessageCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  boundedDirectMessageRequest,
  DIRECT_MESSAGE_SESSION_TIMEOUT_MS,
} from "@/server/direct-message-request";
import type { SpaceFeedCursor, SpaceMessage } from "@/features/spaces/space-feed";
import {
  getEventDiscussion,
  getEventDiscussionFeed,
  joinEventDiscussion,
  sendEventDiscussionMessage,
  setEventDiscussion,
  markEventDiscussionRead,
  eventDiscussionSafetyAction,
} from "./event-discussion-client";
import type { EventDiscussion } from "./event-discussion-contract";
import {
  getConversationAccount,
  onConversationAccountChange,
} from "@/features/conversations/conversation-lifecycle";
import {
  loadDiscussionWindow,
  messageCursor,
  prependDiscussionWindow,
} from "./event-discussion-history";
import {
  restoreEventRetry,
  saveEventRetry,
  removeEventRetry,
  type EventMessageRetry,
} from "./event-discussion-retry";

type History = {
  items: SpaceMessage[];
  cursor: SpaceFeedCursor | null;
  older: boolean;
  newerAvailable: boolean;
};
const emptyHistory: History = { items: [], cursor: null, older: false, newerAvailable: false };
export function EventDiscussionPanel({ eventId, userId }: { eventId: string; userId: string }) {
  return <DiscussionContent key={`${eventId}:${userId}`} eventId={eventId} userId={userId} />;
}
function DiscussionContent({ eventId, userId }: { eventId: string; userId: string }) {
  const [discussion, setDiscussion] = useState<EventDiscussion | null>(null);
  const [history, setHistory] = useState<History>(emptyHistory);
  const historyRef = useRef(history);
  const messages = history.items;
  const cursor = history.cursor;
  const [draft, setDraft] = useState("");
  const [restoredRetry] = useState(() => {
    try {
      return typeof window !== "undefined" && getConversationAccount().owner === userId
        ? restoreEventRetry(window.sessionStorage, userId, eventId)
        : { retry: null, warning: "" };
    } catch {
      return {
        retry: null,
        warning: "This tab can’t save retry recovery. Keep it open until the message is confirmed.",
      };
    }
  });
  const [pending, setPending] = useState<EventMessageRetry | null>(restoredRetry.retry);
  const [storageWarning, setStorageWarning] = useState(restoredRetry.warning);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [safetyTarget, setSafetyTarget] = useState<{
    messageId: string;
    action: "report" | "content_restrict" | "restore";
    requestId: string;
    frozen: { category: string; reason: string } | null;
  } | null>(null);
  const [safetyReason, setSafetyReason] = useState("");
  const [safetyCategory, setSafetyCategory] = useState("safety");
  const [safetyStatus, setSafetyStatus] = useState("");
  const alive = useRef(true);
  const accountGeneration = useRef(getConversationAccount().generation).current;
  const mutationInFlight = useRef(false);
  const refreshing = useRef(false);
  const refreshQueued = useRef(false);
  const refreshRef = useRef<(forceLatest?: boolean, duringMutation?: boolean) => Promise<void>>(
    async () => undefined,
  );
  const latestQueued = useRef(false);
  const generation = useRef(0);
  const timeline = useRef<HTMLDivElement>(null);
  const following = useRef(true);
  const intersecting = useRef(false);
  const lastRead = useRef<string | null>(null);
  const restoreScroll = useRef<{
    bottom: boolean;
    id: string | null;
    offset: number;
    top: number;
  } | null>(null);
  const validAccount = useCallback(() => {
    const account = getConversationAccount();
    return alive.current && account.owner === userId && account.generation === accountGeneration;
  }, [userId, accountGeneration]);
  const currentAccount = useCallback(async () => {
    if (!validAccount()) return false;
    try {
      const { data, error: sessionError } = await boundedDirectMessageRequest(
        () => supabase.auth.getSession(),
        DIRECT_MESSAGE_SESSION_TIMEOUT_MS,
      );
      return validAccount() && !sessionError && data.session?.user.id === userId;
    } catch {
      if (validAccount()) setError("Couldn’t confirm this session. Please try again.");
      return false;
    }
  }, [userId, validAccount]);
  const applyHistory = useCallback((next: History, bottom = false) => {
    const node = timeline.current;
    const visible = node
      ? [...node.querySelectorAll<HTMLElement>("[data-event-message]")].find(
          (item) => item.getBoundingClientRect().bottom > node.getBoundingClientRect().top,
        )
      : null;
    restoreScroll.current = {
      bottom,
      id: visible?.dataset.eventMessage ?? null,
      offset:
        visible && node
          ? visible.getBoundingClientRect().top - node.getBoundingClientRect().top
          : 0,
      top: node?.scrollTop ?? 0,
    };
    historyRef.current = next;
    setHistory(next);
  }, []);
  useLayoutEffect(() => {
    const node = timeline.current,
      position = restoreScroll.current;
    if (!node || !position) return;
    restoreScroll.current = null;
    if (position.bottom) node.scrollTop = node.scrollHeight;
    else {
      const anchor = position.id
        ? [...node.querySelectorAll<HTMLElement>("[data-event-message]")].find(
            (item) => item.dataset.eventMessage === position.id,
          )
        : null;
      node.scrollTop = anchor
        ? node.scrollTop +
          anchor.getBoundingClientRect().top -
          node.getBoundingClientRect().top -
          position.offset
        : position.top;
    }
  }, [history]);
  useEffect(() => {
    alive.current = true;
    const stop = onConversationAccountChange(() => {
      if (validAccount()) return;
      generation.current += 1;
      setDiscussion(null);
      applyHistory(emptyHistory);
      setPending(null);
      setDraft("");
      setSafetyTarget(null);
    });
    return () => {
      alive.current = false;
      generation.current += 1;
      stop();
    };
  }, [eventId, userId, validAccount, applyHistory]);
  const refresh = useCallback(
    async (forceLatest = false, duringMutation = false) => {
      if (!validAccount()) return;
      if (refreshing.current || (mutationInFlight.current && !duringMutation)) {
        refreshQueued.current = true;
        latestQueued.current ||= forceLatest;
        return;
      }
      refreshing.current = true;
      const request = ++generation.current;
      try {
        const next = await getEventDiscussion(eventId);
        if (request !== generation.current || !(await currentAccount())) return;
        setDiscussion(next);
        if (!next.joined || !next.roomId) {
          applyHistory(emptyHistory);
          setError("");
          return;
        }
        const current = historyRef.current;
        const preserve =
          !forceLatest && current.items.length > 0 && (current.older || !following.current);
        const through = preserve
          ? messageCursor(current.items[current.items.length - 1])
          : undefined;
        const feed = await loadDiscussionWindow(
          (query) => getEventDiscussionFeed(eventId, userId, query),
          {
            limit: forceLatest ? 50 : Math.max(50, current.items.length),
            ...(through ? { through } : {}),
          },
        );
        if (request !== generation.current || !(await currentAccount())) return;
        if (forceLatest) following.current = true;
        applyHistory(
          {
            items: feed.items,
            cursor: feed.nextCursor,
            older: preserve,
            newerAvailable: feed.newerAvailable,
          },
          !preserve,
        );
        setError("");
      } catch (cause) {
        if (request !== generation.current || !validAccount()) return;
        if ((cause as { code?: string })?.code === "42501") {
          setDiscussion(null);
          applyHistory(emptyHistory);
          setPending(null);
          setDraft("");
          try {
            setStorageWarning(removeEventRetry(window.sessionStorage, userId, eventId));
          } catch {
            /* Denied storage remains unavailable. */
          }
        }
        setError(
          cause instanceof Error ? cause.message : "Couldn’t refresh this discussion. Try again.",
        );
      } finally {
        refreshing.current = false;
        if (refreshQueued.current && !mutationInFlight.current && validAccount()) {
          refreshQueued.current = false;
          const latest = latestQueued.current;
          latestQueued.current = false;
          queueMicrotask(() => {
            void refreshRef.current(latest);
          });
        }
      }
    },
    [eventId, userId, currentAccount, validAccount, applyHistory],
  );
  useLayoutEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);
  useEffect(() => {
    void Promise.resolve().then(() => refresh());
    const visible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("online", visible);
    window.addEventListener("focus", visible);
    document.addEventListener("visibilitychange", visible);
    return () => {
      window.removeEventListener("online", visible);
      window.removeEventListener("focus", visible);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [refresh]);
  useEffect(() => {
    if (!discussion?.roomId) return;
    // Postgres Changes rechecks row SELECT RLS on every outgoing message. A
    // cached private Broadcast join must not survive event access revocation.
    const channel = supabase
      .channel(`event-discussion:${eventId}:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversation_messages",
          filter: `room_id=eq.${discussion.roomId}`,
        },
        () => {
          void refresh();
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void refresh();
      });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [discussion?.roomId, eventId, userId, refresh]);
  const acknowledge = useCallback(() => {
    const node = timeline.current,
      current = historyRef.current,
      last = current.items.at(-1);
    if (
      !node ||
      !last ||
      !intersecting.current ||
      document.visibilityState !== "visible" ||
      current.older ||
      current.newerAvailable ||
      node.scrollHeight - node.scrollTop - node.clientHeight > 64 ||
      lastRead.current === last.id
    )
      return;
    lastRead.current = last.id;
    void currentAccount()
      .then((valid) => {
        if (valid) return markEventDiscussionRead(eventId, userId, last.id);
        if (lastRead.current === last.id) lastRead.current = null;
      })
      .catch(() => {
        if (lastRead.current === last.id) lastRead.current = null;
      });
  }, [currentAccount, eventId, userId]);
  useEffect(() => {
    const node = timeline.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        intersecting.current = entries.some((entry) => entry.isIntersecting);
        acknowledge();
      },
      { threshold: 0.3 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [discussion?.joined, acknowledge]);
  useEffect(() => {
    acknowledge();
  }, [history, acknowledge]);
  async function action(work: () => Promise<EventDiscussion>) {
    if (mutationInFlight.current) return;
    mutationInFlight.current = true;
    if (!(await currentAccount())) {
      mutationInFlight.current = false;
      return;
    }
    setBusy(true);
    setError("");
    try {
      const next = await work();
      if (!(await currentAccount())) return;
      setDiscussion(next);
      await refresh(false, true);
    } catch (cause) {
      if (validAccount())
        setError(cause instanceof Error ? cause.message : "Couldn’t update this discussion.");
    } finally {
      mutationInFlight.current = false;
      if (validAccount()) {
        setBusy(false);
        if (refreshQueued.current) {
          refreshQueued.current = false;
          const latest = latestQueued.current;
          latestQueued.current = false;
          void refresh(latest);
        }
      }
    }
  }
  async function send() {
    if (mutationInFlight.current || !discussion?.joined || (!discussion.canPost && !pending))
      return;
    mutationInFlight.current = true;
    if (!(await currentAccount())) {
      mutationInFlight.current = false;
      return;
    }
    const operation = pending ?? {
      userId,
      eventId,
      content: draft.trim(),
      requestId: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    if (!operation.content || operation.content.length > 4000) {
      mutationInFlight.current = false;
      return;
    }
    setPending(operation);
    setBusy(true);
    setError("");
    try {
      setStorageWarning(saveEventRetry(window.sessionStorage, operation));
    } catch {
      setStorageWarning(
        "This tab can’t save retry recovery. Keep it open until the message is confirmed.",
      );
    }
    try {
      await sendEventDiscussionMessage(eventId, userId, operation.content, operation.requestId);
      if (!(await currentAccount())) return;
      try {
        setStorageWarning(removeEventRetry(window.sessionStorage, userId, eventId));
      } catch {
        /* Storage denial is already visible. */
      }
      setPending(null);
      setDraft("");
      following.current = true;
      await refresh(true, true);
    } catch (cause) {
      if (validAccount())
        setError(
          cause instanceof Error ? cause.message : "Message not confirmed. Retry the same message.",
        );
    } finally {
      mutationInFlight.current = false;
      if (validAccount()) {
        setBusy(false);
        if (refreshQueued.current) {
          refreshQueued.current = false;
          const latest = latestQueued.current;
          latestQueued.current = false;
          void refresh(latest);
        }
      }
    }
  }
  async function earlier() {
    const current = historyRef.current;
    if (mutationInFlight.current || !discussion?.roomId || !current.cursor) return;
    mutationInFlight.current = true;
    if (!(await currentAccount())) {
      mutationInFlight.current = false;
      return;
    }
    const request = ++generation.current;
    setBusy(true);
    try {
      const page = await getEventDiscussionFeed(eventId, userId, {
        cursor: current.cursor,
        limit: 50,
      });
      if (request !== generation.current || !(await currentAccount())) return;
      const items = prependDiscussionWindow(current.items, page.items);
      following.current = false;
      applyHistory({
        items,
        cursor: page.hasMore && items.length ? messageCursor(items[0]) : null,
        older: true,
        newerAvailable:
          current.newerAvailable || current.items.length + page.items.length > items.length,
      });
    } catch (cause) {
      if (validAccount())
        setError(
          cause instanceof Error ? cause.message : "Couldn’t load earlier messages. Try again.",
        );
    } finally {
      mutationInFlight.current = false;
      if (validAccount()) {
        setBusy(false);
        if (refreshQueued.current) {
          refreshQueued.current = false;
          const latest = latestQueued.current;
          latestQueued.current = false;
          void refresh(latest);
        }
      }
    }
  }
  async function submitSafety() {
    if (!safetyTarget || mutationInFlight.current) return;
    const payload = safetyTarget.frozen ?? {
      category: safetyCategory,
      reason: safetyReason.trim(),
    };
    if (
      payload.reason.length < (safetyTarget.action === "report" ? 10 : 8) ||
      payload.reason.length > (safetyTarget.action === "report" ? 2000 : 500)
    )
      return;
    mutationInFlight.current = true;
    if (!(await currentAccount())) {
      mutationInFlight.current = false;
      return;
    }
    setSafetyTarget({ ...safetyTarget, frozen: payload });
    setBusy(true);
    setError("");
    try {
      await eventDiscussionSafetyAction(eventId, userId, {
        messageId: safetyTarget.messageId,
        action: safetyTarget.action,
        requestId: safetyTarget.requestId,
        ...payload,
      });
      if (!(await currentAccount())) return;
      setSafetyTarget(null);
      setSafetyReason("");
      setSafetyStatus(
        safetyTarget.action === "report"
          ? "Report sent to the safety team."
          : safetyTarget.action === "restore"
            ? "Message restored with an audit record."
            : "Message restricted with an audit record.",
      );
      await refresh(false, true);
    } catch (cause) {
      if (validAccount())
        setError(
          cause instanceof Error
            ? cause.message
            : "Safety action wasn’t confirmed. Retry the same action.",
        );
    } finally {
      mutationInFlight.current = false;
      if (validAccount()) {
        setBusy(false);
        if (refreshQueued.current) {
          refreshQueued.current = false;
          void refresh();
        }
      }
    }
  }
  return (
    <section
      id="discussion"
      aria-labelledby="event-discussion-title"
      className="event-registration-card scroll-mt-6"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="event-discussion-title" className="flex items-center gap-2">
          <MessageCircle aria-hidden className="h-5 w-5" />
          Event discussion
        </h2>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Refresh event discussion"
          disabled={busy}
          onClick={() => void refresh()}
        >
          <RefreshCw aria-hidden className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        A private conversation for confirmed attendees who choose to join. Your name is visible to
        the group. Posting closes seven days after the event; authorized history remains available
        while your registration and account remain eligible, subject to host closure and the
        retention policy.
      </p>
      {discussion?.canManage && (
        <Button
          variant="outline"
          disabled={busy}
          onClick={() =>
            void action(() =>
              setEventDiscussion(eventId, !discussion.enabled, discussion.version, userId),
            )
          }
        >
          {discussion.enabled ? "Close discussion" : "Enable attendee discussion"}
        </Button>
      )}
      {discussion &&
        !discussion.joined &&
        (discussion.canJoin ? (
          <Button
            disabled={busy}
            onClick={() => void action(() => joinEventDiscussion(eventId, userId))}
          >
            {busy ? "Joining…" : "Join event discussion"}
          </Button>
        ) : (
          <p className="text-sm">
            {discussion.enabled
              ? "A confirmed registration with your verified account is needed to join."
              : "The host hasn’t opened a discussion."}
          </p>
        ))}
      {discussion?.joined && (
        <>
          {(history.older || history.newerAvailable) && (
            <Button variant="outline" size="sm" disabled={busy} onClick={() => void refresh(true)}>
              {history.newerAvailable ? "New messages · show latest" : "Return to latest messages"}
            </Button>
          )}
          <div
            ref={timeline}
            onScroll={() => {
              const node = timeline.current;
              if (node && !historyRef.current.older)
                following.current = node.scrollHeight - node.scrollTop - node.clientHeight <= 64;
              acknowledge();
            }}
            role="region"
            aria-label="Event discussion messages"
            className="max-h-96 space-y-3 overflow-y-auto rounded-xl bg-muted/30 p-3"
          >
            {cursor && (
              <Button variant="outline" size="sm" disabled={busy} onClick={() => void earlier()}>
                Load earlier
              </Button>
            )}
            {!messages.length && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Start with a hello or a question about the gathering.
              </p>
            )}
            {messages.map((message) => (
              <article
                key={message.id}
                data-event-message={message.id}
                className={`rounded-xl p-3 ${message.authorId === userId ? "ml-5 bg-primary/10" : "mr-5 bg-background"}`}
              >
                <div className="mb-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="font-medium">
                    {message.authorId === userId ? "You" : message.authorDisplayName}
                  </span>
                  <time dateTime={message.createdAt}>
                    {new Date(message.createdAt).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </div>
                <p className="whitespace-pre-wrap break-words text-sm">
                  {message.deletedAt ? "Message removed" : message.content}
                </p>
                {message.authorId !== userId && (
                  <div className="mt-2 flex flex-wrap gap-3 text-xs">
                    <button
                      className="text-muted-foreground underline underline-offset-2"
                      onClick={() => {
                        setSafetyTarget({
                          messageId: message.id,
                          action: "report",
                          requestId: crypto.randomUUID(),
                          frozen: null,
                        });
                        setSafetyReason("");
                        setSafetyStatus("");
                      }}
                    >
                      Report message
                    </button>
                    {discussion.canManage && (
                      <button
                        className="text-muted-foreground underline underline-offset-2"
                        onClick={() => {
                          setSafetyTarget({
                            messageId: message.id,
                            action: message.deletedAt ? "restore" : "content_restrict",
                            requestId: crypto.randomUUID(),
                            frozen: null,
                          });
                          setSafetyReason("");
                          setSafetyStatus("");
                        }}
                      >
                        {message.deletedAt ? "Restore message" : "Restrict message"}
                      </button>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
          {discussion.canPost || pending ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void send();
              }}
              className="space-y-2"
            >
              <label htmlFor={`event-message-${eventId}`} className="sr-only">
                Message the event group
              </label>
              <textarea
                id={`event-message-${eventId}`}
                rows={2}
                maxLength={4000}
                value={pending?.content ?? draft}
                disabled={busy || Boolean(pending)}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Message the event group…"
                className="w-full resize-y rounded-xl border border-border bg-background p-3 text-sm"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button type="submit" disabled={busy || !(pending?.content ?? draft.trim())}>
                  {busy
                    ? "Sending…"
                    : pending
                      ? discussion.canPost
                        ? "Retry message"
                        : "Check previous send"
                      : "Send"}
                </Button>
                {pending && (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => {
                      try {
                        setStorageWarning(removeEventRetry(window.sessionStorage, userId, eventId));
                      } catch {
                        /* Storage denial is already visible. */
                      }
                      setPending(null);
                      setError("");
                    }}
                  >
                    Discard retry
                  </Button>
                )}
              </div>
              {pending && !busy && (
                <p className="text-xs text-muted-foreground">
                  The previous send wasn’t confirmed. Retry checks the original message instead of
                  posting twice.
                </p>
              )}
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">This discussion is now read-only.</p>
          )}
        </>
      )}
      {safetyStatus && (
        <p role="status" className="text-sm text-muted-foreground">
          {safetyStatus}
        </p>
      )}
      <Dialog
        open={Boolean(safetyTarget)}
        onOpenChange={(open) => {
          if (!open && !busy) setSafetyTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {safetyTarget?.action === "report"
                ? "Report this message"
                : safetyTarget?.action === "restore"
                  ? "Restore this message"
                  : "Restrict this message"}
            </DialogTitle>
            <DialogDescription>
              {safetyTarget?.action === "report"
                ? "Tell the safety team what needs review. Your explanation is private; message text isn’t copied into it automatically."
                : "Give a reason for this host action. It is retained in the private moderation audit."}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submitSafety();
            }}
            className="space-y-3"
          >
            {safetyTarget?.action === "report" && (
              <label className="block text-sm">
                Category
                <select
                  className="mt-1 block w-full rounded-md border border-border bg-background p-2"
                  value={safetyTarget.frozen?.category ?? safetyCategory}
                  disabled={busy || Boolean(safetyTarget.frozen)}
                  onChange={(event) => setSafetyCategory(event.target.value)}
                >
                  <option value="safety">Safety</option>
                  <option value="harassment">Harassment</option>
                  <option value="spam">Spam</option>
                  <option value="privacy">Privacy</option>
                  <option value="misinformation">Misinformation</option>
                  <option value="other">Other</option>
                </select>
              </label>
            )}
            <label className="block text-sm">
              Reason
              <textarea
                className="mt-1 block w-full rounded-md border border-border bg-background p-2"
                rows={3}
                minLength={safetyTarget?.action === "report" ? 10 : 8}
                maxLength={safetyTarget?.action === "report" ? 2000 : 500}
                required
                value={safetyTarget?.frozen?.reason ?? safetyReason}
                disabled={busy || Boolean(safetyTarget?.frozen)}
                onChange={(event) => setSafetyReason(event.target.value)}
              />
            </label>
            <Button type="submit" disabled={busy}>
              {busy
                ? "Saving…"
                : safetyTarget?.frozen
                  ? "Retry safety action"
                  : safetyTarget?.action === "report"
                    ? "Send report"
                    : "Confirm host action"}
            </Button>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </form>
        </DialogContent>
      </Dialog>
      {storageWarning && (
        <p role="status" className="text-xs text-muted-foreground">
          {storageWarning}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}

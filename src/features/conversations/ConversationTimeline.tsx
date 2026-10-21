import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowDown, Check, CheckCheck, Clock3, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DirectMessage } from "./types";

type Props = {
  userId: string;
  name: string;
  messages: DirectMessage[];
  loading: boolean;
  error: string | null;
  hasEarlier: boolean;
  loadingEarlier: boolean;
  loadEarlier: () => Promise<unknown>;
  hasNewer: boolean;
  loadLatest: () => Promise<unknown>;
  refresh: () => Promise<unknown>;
  retrySend: (requestId: string) => Promise<unknown>;
  discardSend: (requestId: string) => void;
  acknowledgeVisible: (boundary: string) => void;
  setFollowingLatest: (following: boolean) => void;
};

function deliveryLabel(message: DirectMessage) {
  if (message.delivery_state === "queued") return "Queued";
  if (message.delivery_state === "sending") return "Sending";
  if (message.delivery_state === "failed") return "Not sent";
  return message.read_at ? "Read" : "Sent";
}

export function ConversationTimeline({
  userId,
  name,
  messages,
  loading,
  error,
  hasEarlier,
  loadingEarlier,
  loadEarlier,
  hasNewer,
  loadLatest,
  refresh,
  retrySend,
  discardSend,
  acknowledgeVisible,
  setFollowingLatest,
}: Props) {
  const viewport = useRef<HTMLDivElement>(null);
  const anchor = useRef<{
    height: number;
    top: number;
    firstId?: string;
    visibleId?: string;
    visibleTop?: number;
  } | null>(null);
  const following = useRef(true);
  const previousLast = useRef<string | undefined>(undefined);
  const initial = useRef(true);
  const [newMessages, setNewMessages] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const lastId = messages.at(-1)?.id;
  const latestReceived = [...messages]
    .reverse()
    .find((message) => message.sender_id !== userId && !message.delivery_state)?.id;

  const acknowledge = useCallback(() => {
    const element = viewport.current;
    if (
      !element ||
      !following.current ||
      hasNewer ||
      !latestReceived ||
      document.visibilityState !== "visible"
    )
      return;
    if (element.scrollHeight - element.scrollTop - element.clientHeight <= 64)
      acknowledgeVisible(latestReceived);
  }, [acknowledgeVisible, hasNewer, latestReceived]);

  useLayoutEffect(() => {
    const element = viewport.current;
    if (!element) return;
    if (anchor.current && messages[0]?.id !== anchor.current.firstId) {
      const saved = anchor.current;
      const retained = saved.visibleId
        ? element.querySelector<HTMLElement>(`[data-message-id="${CSS.escape(saved.visibleId)}"]`)
        : null;
      element.scrollTop =
        retained && saved.visibleTop !== undefined
          ? element.scrollTop + retained.getBoundingClientRect().top - saved.visibleTop
          : saved.top + element.scrollHeight - saved.height;
      anchor.current = null;
    } else if (!anchor.current && (initial.current || following.current)) {
      element.scrollTop = element.scrollHeight;
    }
    if (initial.current) {
      following.current = !hasNewer;
      setFollowingLatest(!hasNewer);
    }
    initial.current = false;
    acknowledge();
    if (lastId !== previousLast.current && !following.current) {
      queueMicrotask(() => setNewMessages(true));
    }
    previousLast.current = lastId;
  }, [acknowledge, hasNewer, lastId, messages, setFollowingLatest]);

  useEffect(() => {
    document.addEventListener("visibilitychange", acknowledge);
    window.addEventListener("focus", acknowledge);
    return () => {
      document.removeEventListener("visibilitychange", acknowledge);
      window.removeEventListener("focus", acknowledge);
    };
  }, [acknowledge]);

  async function earlier() {
    if (!viewport.current) return;
    const top = viewport.current.getBoundingClientRect().top;
    const visible = [...viewport.current.querySelectorAll<HTMLElement>("[data-message-id]")].find(
      (row) => row.getBoundingClientRect().bottom >= top,
    );
    const saved = {
      height: viewport.current.scrollHeight,
      top: viewport.current.scrollTop,
      firstId: messages[0]?.id,
      visibleId: visible?.dataset.messageId,
      visibleTop: visible?.getBoundingClientRect().top,
    };
    anchor.current = saved;
    following.current = false;
    setFollowingLatest(false);
    try {
      await loadEarlier();
    } finally {
      requestAnimationFrame(() => {
        if (anchor.current === saved) anchor.current = null;
      });
    }
  }

  async function latest() {
    if (hasNewer) await loadLatest();
    following.current = true;
    setFollowingLatest(true);
    setNewMessages(false);
    requestAnimationFrame(() => {
      viewport.current?.scrollTo({ top: viewport.current.scrollHeight, behavior: "auto" });
      acknowledge();
    });
  }

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={viewport}
        data-testid="conversation-timeline"
        aria-label={`Messages with ${name}`}
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
        tabIndex={0}
        className="h-full overflow-y-auto overscroll-contain px-3 py-4 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/30 sm:px-5"
        onScroll={() => {
          const element = viewport.current;
          if (!element) return;
          following.current =
            !hasNewer && element.scrollHeight - element.scrollTop - element.clientHeight <= 64;
          setFollowingLatest(following.current);
          if (following.current) {
            setNewMessages(false);
            acknowledge();
          }
        }}
      >
        {hasEarlier ? (
          <div className="mb-3 flex justify-center">
            <Button
              type="button"
              variant="ghost"
              className="min-h-11"
              disabled={loadingEarlier}
              onClick={() => void earlier()}
            >
              {loadingEarlier ? "Loading earlier…" : "Load earlier messages"}
            </Button>
          </div>
        ) : null}
        {error ? (
          <div
            className="mb-4 rounded-xl border border-destructive/25 bg-destructive/5 p-3"
            role="alert"
          >
            <p className="text-sm">{error}</p>
            <Button
              type="button"
              variant="ghost"
              className="mt-1 min-h-11"
              onClick={() => void refresh()}
            >
              Retry conversation
            </Button>
          </div>
        ) : null}
        {loading && messages.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground" role="status">
            Loading conversation…
          </p>
        ) : null}
        {!loading && !error && messages.length === 0 ? (
          <div className="flex min-h-48 flex-col items-center justify-center text-center">
            <p className="font-display text-xl">A conversation starts here.</p>
            <p className="mt-2 text-sm text-muted-foreground">Say hello to {name}.</p>
          </div>
        ) : null}
        {messages.map((message, index) => {
          const mine = message.sender_id === userId;
          const date = new Date(message.created_at);
          const previous = messages[index - 1];
          const showDay =
            !previous || new Date(previous.created_at).toDateString() !== date.toDateString();
          const label = deliveryLabel(message);
          return (
            <div key={message.id} data-message-id={message.id}>
              {showDay ? (
                <p className="my-4 text-center text-xs text-muted-foreground">
                  <time dateTime={message.created_at}>
                    {date.toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </time>
                </p>
              ) : null}
              <div className={cn("mb-2 flex", mine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "min-w-0 max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm sm:max-w-[78%]",
                    mine
                      ? "rounded-br-md bg-[var(--indigo-night)] text-[var(--parchment)]"
                      : "rounded-bl-md border border-border/50 bg-card text-foreground",
                  )}
                >
                  <span className="sr-only">{mine ? "You" : name}: </span>
                  <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                    {message.content}
                  </p>
                  <div
                    className={cn(
                      "mt-1 flex items-center justify-end gap-1 text-[11px]",
                      mine ? "text-[var(--parchment)]/75" : "text-muted-foreground",
                    )}
                  >
                    <time dateTime={message.created_at}>
                      {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </time>
                    {mine ? (
                      <span aria-label={label} className="inline-flex items-center gap-1">
                        {message.delivery_state ? (
                          <Clock3 aria-hidden="true" className="h-3 w-3" />
                        ) : message.read_at ? (
                          <CheckCheck aria-hidden="true" className="h-3.5 w-3.5" />
                        ) : (
                          <Check aria-hidden="true" className="h-3.5 w-3.5" />
                        )}{" "}
                        {label}
                      </span>
                    ) : null}
                  </div>
                  {message.delivery_state === "failed" && message.client_request_id ? (
                    <div className="mt-1 flex flex-wrap justify-end gap-1">
                      <button
                        type="button"
                        className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs font-medium hover:bg-white/10 focus-visible:outline focus-visible:outline-2"
                        onClick={() => {
                          setActionError(null);
                          void retrySend(message.client_request_id!).catch((cause) =>
                            setActionError(
                              cause instanceof Error
                                ? cause.message
                                : "Retry failed. You can try again.",
                            ),
                          );
                        }}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Retry
                      </button>
                      <button
                        type="button"
                        className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs font-medium hover:bg-white/10 focus-visible:outline focus-visible:outline-2"
                        onClick={() => discardSend(message.client_request_id!)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Discard
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
        {actionError ? (
          <p className="mt-2 text-sm text-destructive" role="alert">
            {actionError}
          </p>
        ) : null}
      </div>
      {newMessages || hasNewer ? (
        <Button
          type="button"
          variant="outline"
          className="absolute right-3 bottom-3 min-h-11 gap-2 rounded-full bg-card shadow-sm"
          onClick={() => void latest()}
        >
          <ArrowDown className="h-4 w-4" />
          {hasNewer ? "Back to latest" : "New messages"}
        </Button>
      ) : null}
    </div>
  );
}

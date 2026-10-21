import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Ban, RefreshCw } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { blockMember } from "@/server/messages.functions";
import { useDirectConversation } from "./useDirectConversation";
import { ConversationComposer } from "./ConversationComposer";
import { ConversationTimeline } from "./ConversationTimeline";
import type { ConversationContact } from "./types";

type Props = {
  userId: string;
  contact: ConversationContact;
  enabled: boolean;
  onBack: () => void;
  onBlocked: () => void;
  compact?: boolean;
};

export function ConversationSurface({
  userId,
  contact,
  enabled,
  onBack,
  onBlocked,
  compact = false,
}: Props) {
  const conversation = useDirectConversation(userId, contact.user_id, { enabled });
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockBusy, setBlockBusy] = useState(false);
  const [blockError, setBlockError] = useState<string | null>(null);
  const shareTyping = useRef(true);
  const typingAt = useRef(0);
  const typingTimer = useRef<number | undefined>(undefined);
  const name = contact.display_name ?? "Member";
  const { broadcastTyping } = conversation;
  const stopTyping = useCallback(() => {
    window.clearTimeout(typingTimer.current);
    void broadcastTyping(false);
  }, [broadcastTyping]);

  useEffect(() => {
    const settings = () => {
      try {
        shareTyping.current =
          JSON.parse(window.localStorage.getItem("indus-orbit:settings") ?? "{}")
            .shareActiveTyping !== false;
      } catch {
        shareTyping.current = true;
      }
      if (!shareTyping.current) stopTyping();
    };
    const hidden = () => {
      if (document.visibilityState !== "visible") stopTyping();
    };
    settings();
    window.addEventListener("storage", settings);
    window.addEventListener("indus-orbit:settings-change", settings);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      stopTyping();
      window.removeEventListener("storage", settings);
      window.removeEventListener("indus-orbit:settings-change", settings);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [stopTyping]);

  function publishTyping(value: string) {
    if (!shareTyping.current || !value.trim()) {
      stopTyping();
      return;
    }
    if (Date.now() - typingAt.current > 2_000) {
      typingAt.current = Date.now();
      void broadcastTyping(true);
    }
    window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(stopTyping, 3_000);
  }

  async function confirmBlock() {
    setBlockBusy(true);
    setBlockError(null);
    try {
      await blockMember(contact.user_id, "member_choice", userId);
      setBlockOpen(false);
      window.dispatchEvent(new Event("indus-orbit:dm-changed"));
      onBlocked();
    } catch (cause) {
      setBlockError(cause instanceof Error ? cause.message : "Could not block this member.");
    } finally {
      setBlockBusy(false);
    }
  }

  return (
    <section
      className="flex h-full min-h-0 min-w-0 flex-1 flex-col bg-muted/20"
      aria-label={`Conversation with ${name}`}
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-border/70 bg-card px-2 py-2 sm:px-3">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={compact ? "h-11 w-11 shrink-0" : "h-11 w-11 shrink-0 md:hidden"}
          aria-label="Back to conversations"
          onClick={onBack}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={contact.avatar_url ?? undefined} alt="" />
          <AvatarFallback className="bg-[var(--indigo-night)] text-xs font-semibold text-[var(--parchment)]">
            {name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold">{name}</h2>
          <p className="mt-0.5 truncate text-xs text-muted-foreground" role="status">
            {conversation.isOtherTyping
              ? "Typing…"
              : conversation.connectionState === "offline"
                ? "Offline · messages will queue"
                : conversation.conversationConnected
                  ? "Private conversation"
                  : "Reconnecting…"}
          </p>
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-11 w-11 shrink-0"
          aria-label={`Block ${name}`}
          onClick={() => setBlockOpen(true)}
        >
          <Ban className="h-4 w-4" />
        </Button>
      </header>
      {conversation.catchingUp ? (
        <p
          className="flex items-center gap-2 border-b border-border/50 px-4 py-1.5 text-xs text-muted-foreground"
          role="status"
        >
          <RefreshCw className="h-3 w-3" />
          Updating messages…
        </p>
      ) : null}
      {conversation.storageWarning ? (
        <p
          className="border-b border-border/50 px-4 py-2 text-xs text-muted-foreground"
          role="status"
        >
          {conversation.storageWarning}
        </p>
      ) : null}
      <ConversationTimeline
        userId={userId}
        name={name}
        {...conversation}
        error={conversation.messages.length ? null : conversation.error}
        acknowledgeVisible={(boundary) => {
          if (enabled) conversation.acknowledgeVisible(boundary);
        }}
      />
      {conversation.error && conversation.messages.length ? (
        <p
          className="shrink-0 border-t border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {conversation.error}
        </p>
      ) : null}
      <ConversationComposer
        name={name}
        draft={conversation.draft}
        setDraft={conversation.setDraft}
        send={conversation.send}
        publishTyping={publishTyping}
        stopTyping={stopTyping}
        offline={conversation.connectionState === "offline"}
      />
      <AlertDialog
        open={blockOpen}
        onOpenChange={(open) => {
          if (!blockBusy) setBlockOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block {name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Neither of you will be able to send or read this direct conversation. You can unblock
              them from Messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {blockError ? (
            <p className="text-sm text-destructive" role="alert">
              {blockError}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={blockBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={blockBusy}
              onClick={(event) => {
                event.preventDefault();
                void confirmBlock();
              }}
            >
              {blockBusy ? "Blocking…" : "Block member"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

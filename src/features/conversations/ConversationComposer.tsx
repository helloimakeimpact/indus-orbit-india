import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  name: string;
  draft: string;
  setDraft: (value: string) => void;
  send: (value: string) => Promise<unknown>;
  publishTyping: (value: string) => void;
  stopTyping: () => void;
  offline: boolean;
};

export function ConversationComposer({
  name,
  draft,
  setDraft,
  send,
  publishTyping,
  stopTyping,
  offline,
}: Props) {
  const input = useRef<HTMLTextAreaElement>(null);
  const submittedRevision = useRef<string | null>(null);
  const [validation, setValidation] = useState<string | null>(null);
  const validationId = useId();

  useLayoutEffect(() => {
    if (!input.current) return;
    input.current.style.height = "auto";
    input.current.style.height = `${Math.min(input.current.scrollHeight, 140)}px`;
  }, [draft]);

  function submit() {
    const value = draft;
    if (!value.trim()) return;
    if (value.trim().length > 4_000) {
      setValidation("Keep this message within 4,000 characters. Your draft is still here.");
      return;
    }
    // send enqueues and clears its captured shared draft before awaiting the
    // network. Repeated events from the same rendered revision cannot resend it.
    if (submittedRevision.current === value) return;
    submittedRevision.current = value;
    setValidation(null);
    stopTyping();
    void send(value)
      .catch(() => {
        // The shared outbox renders failed delivery with retry/discard. Never
        // restore this content over a newer draft or another conversation.
      })
      .finally(() => {
        submittedRevision.current = null;
      });
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing &&
      event.keyCode !== 229
    ) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <div className="shrink-0 border-t border-border/70 bg-card px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="flex items-end gap-2 rounded-2xl border border-border bg-background px-1.5 py-1.5 focus-within:ring-2 focus-within:ring-ring/25">
        <textarea
          ref={input}
          aria-label={`Message ${name}`}
          aria-describedby={validation ? validationId : undefined}
          aria-invalid={validation ? true : undefined}
          className="min-h-11 max-h-[140px] min-w-0 flex-1 resize-none bg-transparent px-3 py-3 text-base outline-none placeholder:text-muted-foreground md:text-sm"
          placeholder={`Message ${name}…`}
          rows={1}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            submittedRevision.current = null;
            setValidation(null);
            publishTyping(event.target.value);
          }}
          onBlur={stopTyping}
          onKeyDown={onKeyDown}
        />
        <Button
          type="button"
          size="icon"
          aria-label="Send message"
          disabled={!draft.trim()}
          onClick={submit}
          className="h-11 w-11 shrink-0 rounded-xl bg-[var(--indigo-night)] text-[var(--parchment)] hover:bg-[var(--indigo-night)]/90"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      {validation ? (
        <p id={validationId} className="mt-2 text-xs text-destructive" role="alert">
          {validation}
        </p>
      ) : null}
      <p className="mt-2 text-xs text-muted-foreground" role="status">
        {offline
          ? "Offline. Messages queue in this tab until you reconnect."
          : "Enter to send · Shift+Enter for a new line"}
      </p>
    </div>
  );
}

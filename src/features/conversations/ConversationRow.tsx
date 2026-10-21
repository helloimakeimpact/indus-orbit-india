import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { ConversationContact, InboxContact } from "./types";

type Props = {
  contact: ConversationContact;
  recent?: InboxContact;
  userId: string;
  activeId?: string;
  onSelect: (contact: ConversationContact) => void;
};

export function ConversationRow({ contact, recent, userId, activeId, onSelect }: Props) {
  const unread = recent?.unread_count ?? 0;
  return (
    <button
      type="button"
      aria-current={activeId === contact.user_id ? "true" : undefined}
      aria-label={`${contact.display_name ?? "Member"}${unread ? `, ${unread} unread messages` : ""}`}
      onClick={() => onSelect(contact)}
      className={cn(
        "flex min-h-[76px] w-full items-center gap-3 border-b border-border/40 px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px]",
        activeId === contact.user_id && "bg-muted/65",
      )}
    >
      <Avatar className="h-11 w-11 shrink-0">
        <AvatarImage src={contact.avatar_url ?? undefined} loading="lazy" alt="" />
        <AvatarFallback className="bg-[var(--indigo-night)] text-sm font-semibold text-[var(--parchment)]">
          {(contact.display_name ?? "?").slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p
            className={cn(
              "min-w-0 flex-1 truncate text-sm",
              unread ? "font-semibold" : "font-medium",
            )}
          >
            {contact.display_name ?? "Member"}
          </p>
          {recent?.last_message_at ? (
            <time
              dateTime={recent.last_message_at}
              className="shrink-0 text-[11px] text-muted-foreground"
            >
              {new Date(recent.last_message_at).toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
              })}
            </time>
          ) : null}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
            {recent
              ? `${recent.last_sender_id === userId ? "You: " : ""}${recent.last_message_content ?? "Start a conversation"}`
              : (contact.headline ?? "Start a conversation")}
          </p>
          {unread ? (
            <span
              className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--saffron)] px-1.5 text-[11px] font-semibold text-[var(--indigo-night)]"
              aria-hidden="true"
            >
              {unread > 99 ? "99+" : unread}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}

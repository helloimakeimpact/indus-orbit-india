import { useState } from "react";
import { Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConversationRow } from "./ConversationRow";
import { useConversationPeople } from "./useConversationPeople";
import type { ConversationContact } from "./types";

type Props = {
  userId: string;
  enabled: boolean;
  activeId?: string;
  onSelect: (contact: ConversationContact) => void;
};

export function ConnectionsPicker({ userId, enabled, activeId, onSelect }: Props) {
  const [search, setSearch] = useState("");
  const people = useConversationPeople(userId, enabled, search);
  return (
    <section aria-label="Your connections">
      <div className="relative m-3">
        <Search
          aria-hidden="true"
          className="absolute top-3.5 left-3 h-4 w-4 text-muted-foreground"
        />
        <Input
          aria-label="Search your connections"
          placeholder="Find a connection…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="min-h-11 pl-9"
        />
      </div>
      {people.error ? (
        <div className="p-4 text-sm" role="alert">
          <p>{people.error}</p>
          <Button type="button" variant="ghost" className="mt-1 min-h-11" onClick={people.refresh}>
            Try again
          </Button>
        </div>
      ) : null}
      {people.loading && !people.people.length ? (
        <p className="p-6 text-center text-sm text-muted-foreground" role="status">
          Finding connections…
        </p>
      ) : null}
      {!people.loading && !people.error && !people.people.length ? (
        <div className="px-6 py-10 text-center">
          <Users className="mx-auto mb-3 h-7 w-7 text-muted-foreground/50" />
          <p className="text-sm font-medium">
            {search ? "No matching connections" : "No accepted connections yet"}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Connect with someone in People to start a private conversation.
          </p>
        </div>
      ) : null}
      {people.people.map((contact) => (
        <ConversationRow
          key={contact.user_id}
          contact={contact}
          userId={userId}
          activeId={activeId}
          onSelect={onSelect}
        />
      ))}
      {people.hasMore ? (
        <div className="p-3">
          <Button
            type="button"
            variant="ghost"
            className="min-h-11 w-full"
            disabled={people.loadingMore}
            onClick={() => void people.loadMore()}
          >
            Load more connections
          </Button>
        </div>
      ) : null}
    </section>
  );
}

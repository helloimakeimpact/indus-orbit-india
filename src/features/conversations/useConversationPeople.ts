import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  listConversationContacts,
  type ConversationContactsCursor,
} from "@/server/messages.functions";
import type { ConversationContact } from "./types";

export function useConversationPeople(
  userId: string | undefined,
  enabled: boolean,
  search: string,
) {
  const [revision, setRevision] = useState(0);
  const [people, setPeople] = useState<ConversationContact[]>([]);
  const [owner, setOwner] = useState(userId);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<ConversationContactsCursor | null>(null);
  const sequence = useRef(0);
  const currentOwner = useRef(userId);
  useLayoutEffect(() => {
    currentOwner.current = userId;
    sequence.current += 1;
  }, [userId]);

  useEffect(() => {
    const request = ++sequence.current;
    if (!enabled || !userId) return;
    const timer = window.setTimeout(
      async () => {
        setLoading(true);
        setError(null);
        try {
          const page = await listConversationContacts(userId, search);
          if (request !== sequence.current || currentOwner.current !== userId) return;
          setOwner(userId);
          setPeople(page.contacts);
          setNextCursor(page.nextCursor);
        } catch (cause) {
          if (request === sequence.current)
            setError(cause instanceof Error ? cause.message : "Could not find your connections.");
        } finally {
          if (request === sequence.current) setLoading(false);
        }
      },
      search ? 250 : 0,
    );
    return () => {
      window.clearTimeout(timer);
      sequence.current += 1;
    };
  }, [enabled, revision, search, userId]);

  const loadMore = useCallback(async () => {
    if (!userId || !nextCursor || loadingMore || loading) return;
    const request = sequence.current;
    setLoadingMore(true);
    try {
      const page = await listConversationContacts(userId, search, nextCursor);
      if (request !== sequence.current || currentOwner.current !== userId) return;
      setPeople((current) => [
        ...new Map(
          [...current, ...page.contacts].map((contact) => [contact.user_id, contact]),
        ).values(),
      ]);
      setNextCursor(page.nextCursor);
    } catch (cause) {
      if (request === sequence.current)
        setError(cause instanceof Error ? cause.message : "Could not load more connections.");
    } finally {
      if (request === sequence.current) setLoadingMore(false);
    }
  }, [loading, loadingMore, nextCursor, search, userId]);

  return {
    refresh: () => setRevision((value) => value + 1),
    people: owner === userId ? people : [],
    loading,
    error: owner === userId ? error : null,
    hasMore: owner === userId && nextCursor !== null,
    loadingMore,
    loadMore,
  };
}

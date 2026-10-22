import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { getBlockedConnections, getInbox, type InboxCursor } from "@/server/messages.functions";
import type { ConversationContact, InboxContact } from "./types";
import { onConversationAccountChange } from "./conversation-lifecycle";

// A shared, short-lived first page avoids refetching when the quick sheet opens
// over Messages. No message history or private profile data is persisted here.
let cachedOwner: string | undefined;
let cacheGeneration = 0;
let cachedInbox: { contacts: InboxContact[]; nextCursor: InboxCursor | null; at: number } | null =
  null;
let pendingInbox: Promise<Awaited<ReturnType<typeof getInbox>>> | null = null;
onConversationAccountChange(() => {
  cachedOwner = undefined;
  cacheGeneration += 1;
  cachedInbox = null;
  pendingInbox = null;
});

function firstInbox(userId: string, fresh = false) {
  if (cachedOwner !== userId) {
    cachedOwner = userId;
    cacheGeneration += 1;
    cachedInbox = null;
    pendingInbox = null;
  }
  if (!fresh && cachedInbox && Date.now() - cachedInbox.at < 15_000) {
    return Promise.resolve(cachedInbox);
  }
  if (pendingInbox) return pendingInbox;
  const generation = cacheGeneration;
  const pending = getInbox(userId).then((page) => {
    if (cachedOwner === userId && cacheGeneration === generation)
      cachedInbox = { ...page, at: Date.now() };
    return page;
  });
  pendingInbox = pending;
  void pending
    .finally(() => {
      if (pendingInbox === pending) pendingInbox = null;
    })
    .catch(() => undefined);
  return pending;
}

export function useConversationContacts(userId: string | undefined, enabled = true) {
  const [owner, setOwner] = useState(userId);
  const [contacts, setContacts] = useState<InboxContact[]>([]);
  const [blockedContacts, setBlockedContacts] = useState<ConversationContact[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<InboxCursor | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sequence = useRef(0);
  const currentOwner = useRef(userId);
  useLayoutEffect(() => {
    currentOwner.current = userId;
    sequence.current += 1;
  }, [userId]);

  const refresh = useCallback(
    async (fresh = true) => {
      const request = ++sequence.current;
      if (!userId) return;
      setLoading(true);
      setError(null);
      try {
        const [page, blocked] = await Promise.all([
          firstInbox(userId, fresh),
          getBlockedConnections(userId),
        ]);
        if (sequence.current !== request || currentOwner.current !== userId) return;
        setOwner(userId);
        setContacts(page.contacts);
        setNextCursor(page.nextCursor);
        setBlockedContacts(blocked);
      } catch (cause) {
        if (sequence.current !== request || currentOwner.current !== userId) return;
        setError(cause instanceof Error ? cause.message : "Could not load your conversations.");
      } finally {
        if (sequence.current === request && currentOwner.current === userId) setLoading(false);
      }
    },
    [userId],
  );

  useEffect(() => {
    if (cachedOwner !== userId) {
      cachedOwner = userId;
      cacheGeneration += 1;
      cachedInbox = null;
      pendingInbox = null;
    }
    let active = true;
    if (enabled && userId)
      void Promise.resolve().then(() => {
        if (active) return refresh(false);
      });
    return () => {
      active = false;
      sequence.current += 1;
    };
  }, [enabled, refresh, userId]);

  useEffect(() => {
    if (!enabled || !userId) return;
    // Coalesce app attention updates without installing a polling interval.
    let timer: number | undefined;
    const reconcile = () => {
      if (document.visibilityState !== "visible") return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void refresh(), 250);
    };
    window.addEventListener("focus", reconcile);
    window.addEventListener("indus-orbit:dm-changed", reconcile);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", reconcile);
      window.removeEventListener("indus-orbit:dm-changed", reconcile);
    };
  }, [enabled, refresh, userId]);

  const loadMore = useCallback(async () => {
    if (!userId || !nextCursor || loadingMore) return;
    const request = sequence.current;
    setLoadingMore(true);
    try {
      const page = await getInbox(userId, nextCursor);
      if (request !== sequence.current || currentOwner.current !== userId) return;
      setContacts((current) => [
        ...new Map(
          [...current, ...page.contacts].map((contact) => [contact.user_id, contact]),
        ).values(),
      ]);
      setNextCursor(page.nextCursor);
    } catch (cause) {
      if (request === sequence.current)
        setError(cause instanceof Error ? cause.message : "Could not load more conversations.");
    } finally {
      if (request === sequence.current) setLoadingMore(false);
    }
  }, [loadingMore, nextCursor, userId]);

  return {
    contacts: owner === userId ? contacts : [],
    blockedContacts: owner === userId ? blockedContacts : [],
    loading,
    error: owner === userId ? error : null,
    loadingMore,
    hasMore: owner === userId && nextCursor !== null,
    loadMore,
    refresh,
  };
}

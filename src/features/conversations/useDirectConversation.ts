import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { useOrbitStore } from "@/features/orbit/OrbitStore";
import { emptyConversationSnapshot } from "./direct-message-client";
import { getSharedConversationClient } from "./direct-message-runtime";

export function useDirectConversation(
  userId: string | undefined,
  otherUserId: string | undefined,
  { enabled = true }: { enabled?: boolean } = {},
) {
  const { connectionState } = useOrbitStore();
  const client = useMemo(() => (userId ? getSharedConversationClient(userId) : null), [userId]);
  const subscribe = useCallback(
    (listener: () => void) =>
      client && otherUserId ? client.subscribe(otherUserId, listener) : () => undefined,
    [client, otherUserId],
  );
  const snapshot = useSyncExternalStore(
    subscribe,
    useCallback(
      () => (client && otherUserId ? client.getSnapshot(otherUserId) : emptyConversationSnapshot),
      [client, otherUserId],
    ),
    () => emptyConversationSnapshot,
  );

  useEffect(() => {
    if (!enabled || !client || !otherUserId) return;
    return client.acquire(otherUserId);
  }, [client, enabled, otherUserId]);
  useEffect(() => {
    client?.setOnline(connectionState !== "offline");
  }, [client, connectionState]);

  const send = useCallback(
    (content: string) => {
      if (!client || !otherUserId || !enabled)
        return Promise.reject(new Error("Select an active conversation first."));
      return client.send(otherUserId, content, snapshot.draftRevision);
    },
    [client, enabled, otherUserId, snapshot.draftRevision],
  );
  const setDraft = useCallback(
    (value: string) => {
      if (enabled && otherUserId) client?.setDraft(otherUserId, value);
    },
    [client, enabled, otherUserId],
  );
  const refresh = useCallback(
    () =>
      otherUserId && enabled
        ? (client?.refresh(otherUserId) ?? Promise.resolve())
        : Promise.resolve(),
    [client, enabled, otherUserId],
  );
  const loadEarlier = useCallback(
    () =>
      otherUserId && enabled
        ? (client?.loadEarlier(otherUserId) ?? Promise.resolve())
        : Promise.resolve(),
    [client, enabled, otherUserId],
  );
  const loadLatest = useCallback(
    () =>
      otherUserId && enabled
        ? (client?.loadLatest(otherUserId) ?? Promise.resolve())
        : Promise.resolve(),
    [client, enabled, otherUserId],
  );
  const retrySend = useCallback(
    (id: string) =>
      otherUserId && enabled
        ? (client?.retrySend(otherUserId, id) ?? Promise.resolve(null))
        : Promise.resolve(null),
    [client, enabled, otherUserId],
  );
  const discardSend = useCallback(
    (id: string) => {
      if (otherUserId && enabled) client?.discardSend(otherUserId, id);
    },
    [client, enabled, otherUserId],
  );
  const broadcastTyping = useCallback(
    (typing: boolean) =>
      otherUserId
        ? (client?.broadcastTyping(otherUserId, typing && enabled) ?? Promise.resolve())
        : Promise.resolve(),
    [client, enabled, otherUserId],
  );
  const acknowledgeVisible = useCallback(
    (id: string) => {
      if (otherUserId && enabled) void client?.acknowledgeVisible(otherUserId, id);
    },
    [client, enabled, otherUserId],
  );
  const setFollowingLatest = useCallback(
    (following: boolean) => {
      if (enabled && otherUserId) client?.setFollowingLatest(otherUserId, following);
    },
    [client, enabled, otherUserId],
  );

  return {
    ...snapshot,
    connectionState,
    setDraft,
    send,
    refresh,
    loadEarlier,
    loadLatest,
    retrySend,
    discardSend,
    broadcastTyping,
    acknowledgeVisible,
    setFollowingLatest,
  };
}

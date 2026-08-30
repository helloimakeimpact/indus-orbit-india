import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  getConversation,
  markConversationRead,
  sendMessage,
  type DirectConversationCursor,
} from "@/server/messages.functions";
import type { DirectMessage } from "@/features/conversations/types";
import {
  isConversationMessage,
  mergeConversationMessages,
  parseDirectMessageBroadcast,
  updateDirectMessageDelivery,
} from "@/features/conversations/conversation-state";
import { useOrbitStore } from "@/features/orbit/OrbitStore";

function mergeMessage(messages: DirectMessage[], incoming: DirectMessage) {
  return mergeConversationMessages(messages, [incoming]);
}

export function useDirectConversation(userId: string | undefined, otherUserId: string | undefined) {
  const { connectionState, notifyAttentionChanged } = useOrbitStore();
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [nextCursor, setNextCursor] = useState<DirectConversationCursor | null>(null);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [conversationConnected, setConversationConnected] = useState(false);
  const conversationRequestSequence = useRef(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingExpiry = useRef<number | null>(null);
  const outbox = useRef(
    new Map<
      string,
      {
        requestId: string;
        recipientId: string;
        content: string;
        state: "queued" | "sending" | "failed";
      }
    >(),
  );

  const topic = useMemo(() => {
    if (!userId || !otherUserId) return null;
    return `dm:${[userId, otherUserId].sort().join(":")}`;
  }, [otherUserId, userId]);
  const activeTopic = useRef(topic);
  useEffect(() => {
    activeTopic.current = topic;
  }, [topic]);

  const refresh = useCallback(async () => {
    if (!otherUserId || !topic) return;
    const requestedTopic = topic;
    setLoading(true);
    setError(null);
    try {
      const page = await getConversation(otherUserId);
      if (activeTopic.current !== requestedTopic) return;
      setMessages((current) => mergeConversationMessages(current, page.messages));
      setNextCursor((current) => current ?? page.nextCursor);
    } catch (cause) {
      if (activeTopic.current !== requestedTopic) return;
      setError(cause instanceof Error ? cause.message : "Could not load this conversation.");
    } finally {
      if (activeTopic.current === requestedTopic) setLoading(false);
    }
  }, [otherUserId, topic]);

  const deliver = useCallback(
    async (requestId: string) => {
      const pending = outbox.current.get(requestId);
      if (!pending || !topic || pending.recipientId !== otherUserId) return null;
      pending.state = "sending";
      setMessages((current) => updateDirectMessageDelivery(current, requestId, "sending"));
      try {
        const message = (await sendMessage(
          pending.recipientId,
          pending.content,
          requestId,
        )) as DirectMessage;
        outbox.current.delete(requestId);
        if (activeTopic.current === topic) {
          setMessages((current) => mergeMessage(current, message));
        }
        notifyAttentionChanged();
        return message;
      } catch (cause) {
        pending.state = "failed";
        setMessages((current) => updateDirectMessageDelivery(current, requestId, "failed"));
        throw cause;
      }
    },
    [notifyAttentionChanged, otherUserId, topic],
  );

  const flushQueued = useCallback(async () => {
    if (connectionState !== "online" || !conversationConnected) return;
    const queued = [...outbox.current.values()].filter(
      (item) => item.recipientId === otherUserId && item.state === "queued",
    );
    for (const item of queued) {
      try {
        await deliver(item.requestId);
      } catch {
        // The failed item remains visible and requires an explicit retry.
      }
    }
  }, [connectionState, conversationConnected, deliver, otherUserId]);

  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    void Promise.resolve().then(async () => {
      if (!active) return;

      conversationRequestSequence.current += 1;
      setLoadingEarlier(false);
      setSending(false);
      setConversationConnected(false);
      setIsOtherTyping(false);

      if (!userId || !otherUserId || !topic) {
        setMessages([]);
        setNextCursor(null);
        setError(null);
        setLoading(false);
        return;
      }

      setMessages([]);
      setNextCursor(null);
      setLoading(true);
      setError(null);
      await supabase.realtime.setAuth();
      if (!active) return;

      const receiveBroadcast = (payload: unknown) => {
        const incoming = parseDirectMessageBroadcast(payload);
        if (!incoming || !isConversationMessage(incoming, userId, otherUserId)) return;
        if (active) setMessages((current) => mergeMessage(current, incoming));
        if (incoming.sender_id === otherUserId && incoming.recipient_id === userId) {
          void markConversationRead(otherUserId).catch(() => undefined);
          notifyAttentionChanged();
        }
      };

      const receiveTyping = (event: { payload?: unknown }) => {
        const payload =
          event.payload && typeof event.payload === "object" && !Array.isArray(event.payload)
            ? (event.payload as Record<string, unknown>)
            : null;
        if (
          payload?.userId !== otherUserId ||
          typeof payload.at !== "number" ||
          Math.abs(Date.now() - payload.at) > 15_000
        ) {
          return;
        }
        if (typingExpiry.current !== null) window.clearTimeout(typingExpiry.current);
        const typing = payload.typing === true;
        setIsOtherTyping(typing);
        if (typing) {
          typingExpiry.current = window.setTimeout(() => setIsOtherTyping(false), 6_000);
        }
      };

      channel = supabase
        .channel(topic, { config: { private: true } })
        .on("broadcast", { event: "INSERT" }, receiveBroadcast)
        .on("broadcast", { event: "UPDATE" }, receiveBroadcast)
        .on("broadcast", { event: "typing" }, receiveTyping)
        .subscribe((status) => {
          if (!active) return;
          if (status === "SUBSCRIBED") {
            setConversationConnected(true);
            void refresh();
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            setConversationConnected(false);
          }
        });
      channelRef.current = channel;

      void getConversation(otherUserId)
        .then((page) => {
          if (!active) return;
          setMessages((current) => mergeConversationMessages(current, page.messages));
          setNextCursor(page.nextCursor);
          void markConversationRead(otherUserId).catch(() => undefined);
          notifyAttentionChanged();
        })
        .catch((cause) => {
          if (!active) return;
          setMessages([]);
          setError(cause instanceof Error ? cause.message : "Could not load this conversation.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    });

    return () => {
      active = false;
      setConversationConnected(false);
      if (typingExpiry.current !== null) window.clearTimeout(typingExpiry.current);
      if (channelRef.current === channel) channelRef.current = null;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [notifyAttentionChanged, otherUserId, refresh, topic, userId]);

  useEffect(() => {
    void flushQueued();
  }, [flushQueued]);

  const send = useCallback(
    async (content: string) => {
      if (!otherUserId || !topic || !userId) throw new Error("Select a conversation first.");
      const requestedTopic = topic;
      const normalized = content.trim();
      if (!normalized) throw new Error("Message cannot be empty.");
      const requestId = crypto.randomUUID();
      const optimistic: DirectMessage = {
        id: `pending:${requestId}`,
        sender_id: userId,
        recipient_id: otherUserId,
        content: normalized,
        client_request_id: requestId,
        created_at: new Date().toISOString(),
        read_at: null,
        delivery_state: connectionState === "online" ? "sending" : "queued",
      };
      outbox.current.set(requestId, {
        requestId,
        recipientId: otherUserId,
        content: normalized,
        state: connectionState === "online" ? "sending" : "queued",
      });
      setMessages((current) => mergeMessage(current, optimistic));
      setSending(true);
      try {
        if (connectionState !== "online") return optimistic;
        return await deliver(requestId);
      } finally {
        if (activeTopic.current === requestedTopic) setSending(false);
      }
    },
    [connectionState, deliver, otherUserId, topic, userId],
  );

  const retrySend = useCallback(
    async (requestId: string) => {
      const pending = outbox.current.get(requestId);
      if (!pending) return;
      if (connectionState !== "online") {
        pending.state = "queued";
        setMessages((current) => updateDirectMessageDelivery(current, requestId, "queued"));
        return;
      }
      await deliver(requestId);
    },
    [connectionState, deliver],
  );

  const discardSend = useCallback((requestId: string) => {
    outbox.current.delete(requestId);
    setMessages((current) => current.filter((message) => message.client_request_id !== requestId));
  }, []);

  const broadcastTyping = useCallback(
    async (typing: boolean) => {
      if (!userId || !otherUserId || !conversationConnected) return;
      await channelRef.current?.send({
        type: "broadcast",
        event: "typing",
        payload: { userId, typing, at: Date.now() },
      });
    },
    [conversationConnected, otherUserId, userId],
  );

  const loadEarlier = useCallback(async () => {
    if (!otherUserId || !topic || !nextCursor || loadingEarlier) return;
    const requestedTopic = topic;
    const requestSequence = ++conversationRequestSequence.current;
    setLoadingEarlier(true);
    setError(null);
    try {
      const page = await getConversation(otherUserId, nextCursor);
      if (
        activeTopic.current !== requestedTopic ||
        conversationRequestSequence.current !== requestSequence
      ) {
        return;
      }
      setMessages((current) => mergeConversationMessages(current, page.messages));
      setNextCursor(page.nextCursor);
    } catch (cause) {
      if (
        activeTopic.current !== requestedTopic ||
        conversationRequestSequence.current !== requestSequence
      ) {
        return;
      }
      setError(cause instanceof Error ? cause.message : "Could not load earlier messages.");
    } finally {
      if (
        activeTopic.current === requestedTopic &&
        conversationRequestSequence.current === requestSequence
      ) {
        setLoadingEarlier(false);
      }
    }
  }, [loadingEarlier, nextCursor, otherUserId, topic]);

  return {
    messages,
    loading,
    error,
    sending,
    hasEarlier: nextCursor !== null,
    loadingEarlier,
    refresh,
    loadEarlier,
    send,
    retrySend,
    discardSend,
    broadcastTyping,
    isOtherTyping,
    conversationConnected,
    connectionState,
  };
}

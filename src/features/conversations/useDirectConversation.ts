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
} from "@/features/conversations/conversation-state";

function mergeMessage(messages: DirectMessage[], incoming: DirectMessage) {
  return mergeConversationMessages(messages, [incoming]);
}

export function useDirectConversation(userId: string | undefined, otherUserId: string | undefined) {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [nextCursor, setNextCursor] = useState<DirectConversationCursor | null>(null);
  const conversationRequestSequence = useRef(0);

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
      setMessages([]);
      setError(cause instanceof Error ? cause.message : "Could not load this conversation.");
    } finally {
      if (activeTopic.current === requestedTopic) setLoading(false);
    }
  }, [otherUserId, topic]);

  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    void Promise.resolve().then(() => {
      if (!active) return;

      conversationRequestSequence.current += 1;
      setLoadingEarlier(false);
      setSending(false);

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
      channel = supabase
        .channel(topic)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "direct_messages" },
          (payload) => {
            const incoming = payload.new as DirectMessage;
            if (!incoming?.id || !isConversationMessage(incoming, userId, otherUserId)) return;

            if (active) setMessages((current) => mergeMessage(current, incoming));
            if (incoming.sender_id === otherUserId && incoming.recipient_id === userId) {
              void markConversationRead(otherUserId).catch(() => undefined);
            }
          },
        )
        .subscribe();

      void getConversation(otherUserId)
        .then((page) => {
          if (!active) return;
          setMessages((current) => mergeConversationMessages(current, page.messages));
          setNextCursor(page.nextCursor);
          void markConversationRead(otherUserId).catch(() => undefined);
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
      if (channel) void supabase.removeChannel(channel);
    };
  }, [otherUserId, topic, userId]);

  const send = useCallback(
    async (content: string) => {
      if (!otherUserId || !topic) throw new Error("Select a conversation first.");
      const requestedTopic = topic;
      setSending(true);
      try {
        const message = (await sendMessage(otherUserId, content)) as DirectMessage;
        if (activeTopic.current === requestedTopic) {
          setMessages((current) => mergeMessage(current, message));
        }
        return message;
      } finally {
        if (activeTopic.current === requestedTopic) setSending(false);
      }
    },
    [otherUserId, topic],
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
  };
}

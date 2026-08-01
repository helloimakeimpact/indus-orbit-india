import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getConversation, markConversationRead, sendMessage } from "@/server/messages.functions";
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

  const topic = useMemo(() => {
    if (!userId || !otherUserId) return null;
    return `dm:${[userId, otherUserId].sort().join(":")}`;
  }, [otherUserId, userId]);

  const refresh = useCallback(async () => {
    if (!otherUserId) return;
    setLoading(true);
    setError(null);
    try {
      const loaded = (await getConversation(otherUserId)) as DirectMessage[];
      setMessages((current) => mergeConversationMessages(current, loaded));
    } catch (cause) {
      setMessages([]);
      setError(cause instanceof Error ? cause.message : "Could not load this conversation.");
    } finally {
      setLoading(false);
    }
  }, [otherUserId]);

  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    void Promise.resolve().then(() => {
      if (!active) return;

      if (!userId || !otherUserId || !topic) {
        setMessages([]);
        setError(null);
        setLoading(false);
        return;
      }

      setMessages([]);
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
        .then((loaded) => {
          if (!active) return;
          setMessages((current) => mergeConversationMessages(current, loaded as DirectMessage[]));
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
      if (!otherUserId) throw new Error("Select a conversation first.");
      setSending(true);
      try {
        const message = (await sendMessage(otherUserId, content)) as DirectMessage;
        setMessages((current) => mergeMessage(current, message));
        return message;
      } finally {
        setSending(false);
      }
    },
    [otherUserId],
  );

  return { messages, loading, error, sending, refresh, send };
}

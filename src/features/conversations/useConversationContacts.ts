import { useCallback, useEffect, useState } from "react";
import { getBlockedConnections, getConnections } from "@/server/messages.functions";
import type { ConversationContact } from "@/features/conversations/types";

export function useConversationContacts(enabled = true) {
  const [contacts, setContacts] = useState<ConversationContact[]>([]);
  const [blockedContacts, setBlockedContacts] = useState<ConversationContact[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [available, blocked] = await Promise.all([getConnections(), getBlockedConnections()]);
      setContacts(available);
      setBlockedContacts(blocked);
    } catch (cause) {
      setContacts([]);
      setBlockedContacts([]);
      setError(cause instanceof Error ? cause.message : "Could not load conversations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void Promise.resolve().then(refresh);
  }, [enabled, refresh]);

  return { contacts, blockedContacts, loading, error, refresh };
}

import { useCallback, useEffect, useState } from "react";
import { getConnections } from "@/server/messages.functions";
import type { ConversationContact } from "@/features/conversations/types";

export function useConversationContacts(enabled = true) {
  const [contacts, setContacts] = useState<ConversationContact[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setContacts(await getConnections());
    } catch (cause) {
      setContacts([]);
      setError(cause instanceof Error ? cause.message : "Could not load conversations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void refresh();
  }, [enabled, refresh]);

  return { contacts, loading, error, refresh };
}

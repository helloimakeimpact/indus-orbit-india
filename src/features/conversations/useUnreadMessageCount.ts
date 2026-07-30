import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getUnreadMessageCount } from "@/server/messages.functions";
import type { DirectMessage } from "@/features/conversations/types";

export function useUnreadMessageCount(userId: string | undefined) {
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      setUnreadCount(await getUnreadMessageCount());
    } catch {
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    if (!userId) {
      setUnreadCount(0);
      return;
    }

    void refresh();
    const channel = supabase
      .channel(`user:${userId}:direct-message-unread`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "direct_messages" },
        (payload) => {
          const message = payload.new as DirectMessage;
          if (message?.recipient_id === userId) void refresh();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refresh, userId]);

  return { unreadCount, refresh };
}

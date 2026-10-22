import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getUnreadMessageCount } from "@/server/messages.functions";
import { getConversationAccount } from "@/features/conversations/conversation-lifecycle";

export type OrbitConnectionState = "online" | "offline" | "reconnecting";
type OrbitStoreValue = {
  connectionState: OrbitConnectionState;
  lastRecoveredAt: string | null;
  unreadDirectMessages: number;
  refreshAttention: () => Promise<void>;
  notifyAttentionChanged: () => void;
};
const OrbitStoreContext = createContext<OrbitStoreValue | null>(null);
function browserIsOnline() {
  return typeof navigator === "undefined" || navigator.onLine;
}

export function OrbitStoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const owner = user?.id;
  const [connectionState, setConnectionState] = useState<OrbitConnectionState>(() =>
    browserIsOnline() ? "reconnecting" : "offline",
  );
  const [lastRecoveredAt, setLastRecoveredAt] = useState<string | null>(null);
  const [attention, setAttention] = useState<{ owner?: string; count: number }>({ count: 0 });
  const attentionChannel = useRef<BroadcastChannel | null>(null);
  const pending = useRef<{
    owner: string;
    generation: number;
    again: boolean;
    promise: Promise<void>;
  } | null>(null);
  const attentionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const announce = useRef(false);

  const refreshAttention = useCallback((): Promise<void> => {
    if (!owner) return Promise.resolve();
    const account = getConversationAccount();
    if (account.owner !== owner) return Promise.resolve();
    const current = () => {
      const active = getConversationAccount();
      return active.owner === owner && active.generation === account.generation;
    };
    if (pending.current?.owner === owner && pending.current.generation === account.generation) {
      pending.current.again = true;
      return pending.current.promise;
    }
    const request = {
      owner,
      generation: account.generation,
      again: false,
      promise: Promise.resolve(),
    };
    request.promise = (async () => {
      // A burst has one running request and one coalesced invalidation. There
      // is no idle polling and obsolete account results cannot update attention.
      do {
        request.again = false;
        try {
          const count = await getUnreadMessageCount(owner);
          if (current()) setAttention({ owner, count });
        } catch {
          /* Preserve the last reconciled count on a transient failure. */
        }
      } while (request.again && current());
    })().finally(() => {
      if (pending.current === request) pending.current = null;
    });
    pending.current = request;
    return request.promise;
  }, [owner]);

  const scheduleAttention = useCallback(
    (broadcast = false) => {
      if (!owner) return;
      announce.current ||= broadcast;
      if (attentionTimer.current !== null) return;
      attentionTimer.current = setTimeout(() => {
        attentionTimer.current = null;
        if (getConversationAccount().owner !== owner) return;
        void refreshAttention();
        if (announce.current)
          attentionChannel.current?.postMessage({ type: "refresh", owner, at: Date.now() });
        announce.current = false;
      }, 150);
    },
    [owner, refreshAttention],
  );
  const notifyAttentionChanged = useCallback(() => scheduleAttention(true), [scheduleAttention]);

  useEffect(() => {
    if (!owner || typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(`indus-orbit:attention:${owner}`);
    attentionChannel.current = channel;
    channel.onmessage = (event) => {
      if (event.data?.type === "refresh" && event.data.owner === owner) scheduleAttention();
    };
    return () => {
      if (attentionChannel.current === channel) attentionChannel.current = null;
      channel.close();
    };
  }, [owner, scheduleAttention]);

  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const recover = () => {
      if (!active) return;
      setConnectionState(
        !browserIsOnline()
          ? "offline"
          : !owner || channel?.state === "joined"
            ? "online"
            : "reconnecting",
      );
      if (browserIsOnline()) scheduleAttention();
    };
    const hidden = () => {
      if (document.visibilityState === "visible") recover();
    };
    const changed = (event: Event) => {
      const detail = (event as CustomEvent<{ owner?: string }>).detail;
      if (!detail?.owner || detail.owner === owner) notifyAttentionChanged();
    };
    window.addEventListener("online", recover);
    window.addEventListener("offline", recover);
    window.addEventListener("focus", recover);
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("indus-orbit:dm-changed", changed);
    void Promise.resolve().then(async () => {
      if (!active) return;
      if (!owner) {
        setConnectionState(browserIsOnline() ? "online" : "offline");
        return;
      }
      try {
        await supabase.realtime.setAuth();
        if (!active) return;
        channel = supabase
          .channel(`orbit:${owner}:attention`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "direct_messages",
              filter: `recipient_id=eq.${owner}`,
            },
            notifyAttentionChanged,
          )
          .subscribe((status) => {
            if (!active) return;
            if (status === "SUBSCRIBED") {
              setConnectionState("online");
              setLastRecoveredAt(new Date().toISOString());
              scheduleAttention();
            } else if (
              status === "CHANNEL_ERROR" ||
              status === "TIMED_OUT" ||
              status === "CLOSED"
            ) {
              setConnectionState(browserIsOnline() ? "reconnecting" : "offline");
            }
          });
        scheduleAttention();
      } catch {
        if (active) setConnectionState(browserIsOnline() ? "reconnecting" : "offline");
      }
    });
    return () => {
      active = false;
      window.removeEventListener("online", recover);
      window.removeEventListener("offline", recover);
      window.removeEventListener("focus", recover);
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("indus-orbit:dm-changed", changed);
      if (attentionTimer.current !== null) clearTimeout(attentionTimer.current);
      attentionTimer.current = null;
      announce.current = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [notifyAttentionChanged, owner, scheduleAttention]);

  const unreadDirectMessages = attention.owner === owner ? attention.count : 0;
  const value = useMemo<OrbitStoreValue>(
    () => ({
      connectionState,
      lastRecoveredAt,
      unreadDirectMessages,
      refreshAttention,
      notifyAttentionChanged,
    }),
    [
      connectionState,
      lastRecoveredAt,
      unreadDirectMessages,
      refreshAttention,
      notifyAttentionChanged,
    ],
  );
  return <OrbitStoreContext.Provider value={value}>{children}</OrbitStoreContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useOrbitStore() {
  const context = useContext(OrbitStoreContext);
  if (!context) throw new Error("useOrbitStore must be used within OrbitStoreProvider");
  return context;
}

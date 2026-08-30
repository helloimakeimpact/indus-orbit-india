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

export type OrbitConnectionState = "online" | "offline" | "reconnecting";

type OrbitStoreValue = {
  connectionState: OrbitConnectionState;
  lastRecoveredAt: string | null;
  unreadDirectMessages: number;
  refreshAttention: () => Promise<void>;
  notifyAttentionChanged: () => void;
};

const OrbitStoreContext = createContext<OrbitStoreValue | null>(null);
const attentionChannelName = "indus-orbit:attention";

function browserIsOnline() {
  return typeof navigator === "undefined" || navigator.onLine;
}

export function OrbitStoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [connectionState, setConnectionState] = useState<OrbitConnectionState>(() =>
    browserIsOnline() ? "reconnecting" : "offline",
  );
  const [lastRecoveredAt, setLastRecoveredAt] = useState<string | null>(null);
  const [unreadDirectMessages, setUnreadDirectMessages] = useState(0);
  const attentionChannel = useRef<BroadcastChannel | null>(null);

  const refreshAttention = useCallback(async () => {
    if (!user) {
      setUnreadDirectMessages(0);
      return;
    }
    try {
      setUnreadDirectMessages(await getUnreadMessageCount());
    } catch {
      // A failed attention refresh must not erase the last reconciled value.
    }
  }, [user]);

  const notifyAttentionChanged = useCallback(() => {
    void refreshAttention();
    attentionChannel.current?.postMessage({ type: "refresh", at: Date.now() });
  }, [refreshAttention]);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(attentionChannelName);
    attentionChannel.current = channel;
    channel.onmessage = (event) => {
      if (event.data?.type === "refresh") void refreshAttention();
    };
    return () => {
      attentionChannel.current = null;
      channel.close();
    };
  }, [refreshAttention]);

  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const recover = () => {
      if (!browserIsOnline()) {
        setConnectionState("offline");
        return;
      }
      setConnectionState("reconnecting");
      void refreshAttention();
    };
    const markOffline = () => setConnectionState("offline");
    const reconcileVisibleState = () => {
      if (document.visibilityState === "visible") recover();
    };

    window.addEventListener("online", recover);
    window.addEventListener("offline", markOffline);
    window.addEventListener("focus", recover);
    document.addEventListener("visibilitychange", reconcileVisibleState);

    void Promise.resolve().then(async () => {
      if (!active || !user) {
        setUnreadDirectMessages(0);
        setConnectionState(browserIsOnline() ? "online" : "offline");
        return;
      }

      await supabase.realtime.setAuth();
      if (!active) return;
      channel = supabase
        .channel(`orbit:${user.id}:attention`)
        .on("postgres_changes", { event: "*", schema: "public", table: "direct_messages" }, () =>
          notifyAttentionChanged(),
        )
        .subscribe((status) => {
          if (!active) return;
          if (status === "SUBSCRIBED") {
            setConnectionState("online");
            setLastRecoveredAt(new Date().toISOString());
            void refreshAttention();
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            setConnectionState(browserIsOnline() ? "reconnecting" : "offline");
          }
        });
      void refreshAttention();
    });

    return () => {
      active = false;
      window.removeEventListener("online", recover);
      window.removeEventListener("offline", markOffline);
      window.removeEventListener("focus", recover);
      document.removeEventListener("visibilitychange", reconcileVisibleState);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [notifyAttentionChanged, refreshAttention, user]);

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
      notifyAttentionChanged,
      refreshAttention,
      unreadDirectMessages,
    ],
  );

  return <OrbitStoreContext.Provider value={value}>{children}</OrbitStoreContext.Provider>;
}

// The provider and its hook intentionally share this module so the context
// cannot be imported without the owning product boundary.
// eslint-disable-next-line react-refresh/only-export-components
export function useOrbitStore() {
  const context = useContext(OrbitStoreContext);
  if (!context) throw new Error("useOrbitStore must be used within OrbitStoreProvider");
  return context;
}

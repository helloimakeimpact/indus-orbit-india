import { useOrbitStore } from "@/features/orbit/OrbitStore";

export function useUnreadMessageCount(_userId: string | undefined) {
  const { unreadDirectMessages, refreshAttention } = useOrbitStore();
  return { unreadCount: unreadDirectMessages, refresh: refreshAttention };
}

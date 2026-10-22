import { supabase } from "@/integrations/supabase/client";
import {
  getConversation,
  getConversationAfter,
  markConversationRead,
  sendMessage,
} from "@/server/messages.functions";
import { isConversationMessage, parseDirectMessageBroadcast } from "./conversation-state";
import { getConversationAccount, onConversationAccountChange } from "./conversation-lifecycle";
import { DirectMessageClient } from "./direct-message-client";

let shared: {
  client: DirectMessageClient;
  owner: string;
  generation: number;
  cleanup: () => void;
} | null = null;

function disposeShared() {
  shared?.client.dispose();
  shared?.cleanup();
  shared = null;
}
onConversationAccountChange(disposeShared);

export function getSharedConversationClient(owner: string) {
  const account = getConversationAccount();
  if (account.owner !== owner || typeof window === "undefined") return null;
  if (shared?.owner === owner && shared.generation === account.generation) return shared.client;
  disposeShared();
  const current = () => {
    const active = getConversationAccount();
    return active.owner === owner && active.generation === account.generation;
  };
  const client = new DirectMessageClient(owner, {
    current,
    visible: () => document.visibilityState === "visible",
    storage: () => window.sessionStorage,
    attention: () =>
      window.dispatchEvent(new CustomEvent("indus-orbit:dm-changed", { detail: { owner } })),
    history: (peer, before) => getConversation(peer, before, owner),
    after: (peer, cursor) => getConversationAfter(peer, cursor, owner),
    send: (peer, content, id) => sendMessage(peer, content, id, owner),
    read: (peer, id) => markConversationRead(peer, id, owner),
    subscribe: (peer, handlers) => {
      let active = true;
      let channel: ReturnType<typeof supabase.channel> | null = null;
      const valid = () => active && current();
      const topic = `dm:${[owner, peer].sort().join(":")}`;
      void supabase.realtime
        .setAuth()
        .then(() => {
          if (!valid()) return;
          const message = (event: unknown) => {
            if (!valid()) return;
            const row = parseDirectMessageBroadcast(event);
            if (row && isConversationMessage(row, owner, peer)) handlers.message(row);
          };
          channel = supabase
            .channel(topic, { config: { private: true } })
            .on("broadcast", { event: "INSERT" }, message)
            .on("broadcast", { event: "UPDATE" }, message)
            .on("broadcast", { event: "typing" }, (event: { payload?: unknown }) => {
              if (!valid() || !event.payload || typeof event.payload !== "object") return;
              const payload = event.payload as Record<string, unknown>;
              if (
                payload.userId !== peer ||
                typeof payload.at !== "number" ||
                Math.abs(Date.now() - payload.at) > 15_000
              )
                return;
              handlers.typing(payload.typing === true);
            })
            .subscribe((status) => {
              if (valid()) handlers.connected(status === "SUBSCRIBED");
            });
        })
        .catch(() => {
          if (valid()) handlers.connected(false);
        });
      return {
        close: () => {
          active = false;
          if (channel) void supabase.removeChannel(channel);
        },
        typing: async (typing) => {
          if (valid() && channel?.state === "joined")
            await channel.send({
              type: "broadcast",
              event: "typing",
              payload: { userId: owner, typing, at: Date.now() },
            });
        },
      };
    },
  });
  const online = () => client.setOnline(navigator.onLine);
  const focus = () => {
    if (document.visibilityState === "visible") {
      online();
      client.recover();
    }
  };
  const visibility = () => {
    if (document.visibilityState === "visible") focus();
    else client.hide();
  };
  const blur = () => client.hide();
  window.addEventListener("online", focus);
  window.addEventListener("offline", online);
  window.addEventListener("focus", focus);
  window.addEventListener("blur", blur);
  document.addEventListener("visibilitychange", visibility);
  client.setOnline(navigator.onLine);
  shared = {
    client,
    owner,
    generation: account.generation,
    cleanup: () => {
      window.removeEventListener("online", focus);
      window.removeEventListener("offline", online);
      window.removeEventListener("focus", focus);
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", visibility);
    },
  };
  return client;
}

// Auth updates this boundary synchronously, before React publishes a new account.
// Lazy chat clients cannot accept an old account's completion during that render.
let owner: string | null = null;
let generation = 0;
const listeners = new Set<() => void>();

export function transitionConversationAccount(nextOwner: string | null) {
  if (owner === nextOwner) return;
  // Recovery is plaintext and scoped to this browser tab. This cleanup lives
  // in the eager Auth boundary so a lazy event page cannot leave an old account's
  // retry behind when the account changes elsewhere in the product.
  try {
    if (typeof window !== "undefined")
      clearEventRetryStorage(window.sessionStorage, owner === null ? nextOwner : null);
  } catch {
    // Denied storage cannot become a reason to retain the old account in memory.
  }
  owner = nextOwner;
  generation += 1;
  for (const listener of listeners) listener();
}

export function getConversationAccount() {
  return { owner, generation };
}

export function onConversationAccountChange(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const eventRetryPrefix = "indus-orbit:event-retry:v1:";
const retryIdentity = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function clearEventRetryStorage(
  storage: Pick<Storage, "length" | "key" | "removeItem">,
  preserveOwner: string | null,
) {
  try {
    const keys: string[] = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (!key?.startsWith(eventRetryPrefix)) continue;
      const [candidate, eventId, ...extra] = key.slice(eventRetryPrefix.length).split(":");
      if (
        !preserveOwner ||
        candidate !== preserveOwner ||
        !retryIdentity.test(candidate ?? "") ||
        !retryIdentity.test(eventId ?? "") ||
        extra.length
      )
        keys.push(key);
    }
    for (const key of keys) {
      try {
        storage.removeItem(key);
      } catch {
        /* Try the remaining keys. */
      }
    }
  } catch {
    /* Browser privacy/storage policies can deny every operation. */
  }
}

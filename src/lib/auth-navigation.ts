export type AuthIntent = "io" | "community";
export type AuthTab = "signin" | "signup";
export type AuthReturnPath = "/io" | "/app";

const DEFAULT_RETURN_PATH: Record<AuthIntent, AuthReturnPath> = {
  io: "/io",
  community: "/app",
};

export function parseAuthIntent(value: unknown): AuthIntent {
  return value === "community" ? "community" : "io";
}

export function parseAuthTab(value: unknown): AuthTab {
  return value === "signup" ? "signup" : "signin";
}

/**
 * Resolve an auth return without ever accepting an arbitrary URL. A supplied
 * path must be both known and consistent with the selected product intent.
 */
export function resolveAuthReturnPath(value: unknown, intent: AuthIntent): AuthReturnPath {
  if (intent === "io" && value === "/io") return "/io";
  if (intent === "community" && value === "/app") return "/app";
  return DEFAULT_RETURN_PATH[intent];
}

export function getAuthSearch(search: Record<string, unknown>) {
  const intent = parseAuthIntent(search.intent);

  return {
    tab: parseAuthTab(search.tab),
    intent,
    next: resolveAuthReturnPath(search.next, intent),
  };
}

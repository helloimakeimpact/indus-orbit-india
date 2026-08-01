export type BrowserSupabaseConfig = Readonly<{
  url: string;
  publishableKey: string;
}>;

type BrowserEnvironment = Readonly<{
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}>;

export function resolveBrowserSupabaseConfig(
  environment: BrowserEnvironment,
): BrowserSupabaseConfig {
  const url = environment.VITE_SUPABASE_URL?.trim();
  const publishableKey = environment.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

  const missing = [
    ...(url ? [] : ["VITE_SUPABASE_URL"]),
    ...(publishableKey ? [] : ["VITE_SUPABASE_PUBLISHABLE_KEY"]),
  ];

  if (!url || !publishableKey) {
    throw new Error(
      `Missing browser Supabase configuration: ${missing.join(", ")}. ` +
        "Copy .env.example to .env and set browser-safe values.",
    );
  }

  return { url, publishableKey };
}

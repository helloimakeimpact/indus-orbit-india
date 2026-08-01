import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveBrowserSupabaseConfig } from "./runtime-config";

describe("resolveBrowserSupabaseConfig", () => {
  it("returns trimmed browser-safe values", () => {
    assert.deepEqual(
      resolveBrowserSupabaseConfig({
        VITE_SUPABASE_URL: " https://demo.supabase.co ",
        VITE_SUPABASE_PUBLISHABLE_KEY: " publishable-key ",
      }),
      {
        url: "https://demo.supabase.co",
        publishableKey: "publishable-key",
      },
    );
  });

  it("names a missing URL in the setup error", () => {
    assert.throws(
      () =>
        resolveBrowserSupabaseConfig({
          VITE_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
        }),
      /VITE_SUPABASE_URL/,
    );
  });

  it("names a missing publishable key in the setup error", () => {
    assert.throws(
      () =>
        resolveBrowserSupabaseConfig({
          VITE_SUPABASE_URL: "https://demo.supabase.co",
          VITE_SUPABASE_PUBLISHABLE_KEY: "   ",
        }),
      /VITE_SUPABASE_PUBLISHABLE_KEY/,
    );
  });
});

import { createClient } from "npm:@supabase/supabase-js@2.103.3";
import { createPublicFormHandler } from "../_shared/public-forms/handler.ts";

Deno.serve(
  createPublicFormHandler({
    configuration: () => ({
      secret: Deno.env.get("HCAPTCHA_SECRET_KEY")?.trim() ?? "",
      sitekey: Deno.env.get("HCAPTCHA_SITE_KEY")?.trim() ?? "",
      origins: (Deno.env.get("PUBLIC_FORM_ALLOWED_ORIGINS") ?? "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    }),
    fetch,
    save: async (submission) => {
      const url = Deno.env.get("SUPABASE_URL");
      const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (!url || !key) throw new Error("Public form storage is unavailable");
      const admin = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      if (submission.kind === "newsletter") {
        const { error } = await admin
          .from("newsletter_subscriptions")
          .insert({ email: submission.email });
        // Do not reveal whether an email address is already in the audience.
        if (error && error.code !== "23505") throw error;
      } else {
        const { kind: _kind, ...fields } = submission;
        const { error } = await admin
          .from("contact_submissions")
          .insert({ ...fields, source: "contact_page" });
        if (error) throw error;
      }
    },
  }),
);

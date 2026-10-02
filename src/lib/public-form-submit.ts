import { supabase } from "@/integrations/supabase/client";

export async function submitPublicForm(
  body:
    | { kind: "newsletter"; email: string; captchaToken: string }
    | {
        kind: "contact";
        email: string;
        name: string;
        role: string;
        message: string;
        captchaToken: string;
      },
) {
  const { data, error } = await supabase.functions.invoke("public-form-submit", { body });
  if (error || data?.ok !== true)
    throw new Error(
      "Your submission could not be confirmed. Please verify again and retry, or email hello@indusorbit.com.",
    );
}

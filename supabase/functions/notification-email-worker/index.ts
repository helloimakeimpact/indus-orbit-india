import { createClient } from "npm:@supabase/supabase-js@2";
import { renderEmailTemplate } from "../_shared/notifications/email-template.ts";

type DeliveryJob = {
  id: string;
  lease_token: string;
  recipient_email: string;
  template_key: string;
  template_data: Record<string, unknown>;
};

function getSecretKeys() {
  const keys: string[] = [];
  const configured = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (configured) {
    try {
      const parsed = JSON.parse(configured) as Record<string, unknown>;
      keys.push(
        ...Object.values(parsed).filter((value): value is string => typeof value === "string"),
      );
    } catch {
      console.error("SUPABASE_SECRET_KEYS is not valid JSON");
    }
  }
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) keys.push(legacy);
  return keys;
}

function suppliedKey(request: Request) {
  const apiKey = request.headers.get("apikey");
  if (apiKey) return apiKey;
  const authorization = request.headers.get("authorization");
  return authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
}

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function completeDelivery(
  admin: ReturnType<typeof createClient>,
  job: DeliveryJob,
  result: { succeeded: boolean; providerMessageId?: string; error?: string },
) {
  const { error } = await admin.rpc("complete_email_delivery", {
    _id: job.id,
    _lease_token: job.lease_token,
    _succeeded: result.succeeded,
    _provider_message_id: result.providerMessageId,
    _error: result.error,
  });
  if (error) throw new Error(`Could not complete outbox job ${job.id}: ${error.message}`);
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const secretKeys = getSecretKeys();
  const callerKey = suppliedKey(request);
  if (!callerKey || !secretKeys.includes(callerKey)) {
    return json({ ok: false, error: "Service authentication required" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const emailFrom = Deno.env.get("IO_EMAIL_FROM");
  if (!supabaseUrl || !secretKeys[0]) {
    return json({ ok: false, error: "Supabase backend configuration is missing" }, 503);
  }
  if (!resendApiKey || !emailFrom) {
    return json({ ok: false, error: "Email provider configuration is missing" }, 503);
  }

  const admin = createClient(supabaseUrl, secretKeys[0], {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await admin.rpc("claim_email_delivery_batch", { _limit: 10 });
  if (error) return json({ ok: false, error: error.message }, 500);

  const jobs = (data ?? []) as DeliveryJob[];
  let delivered = 0;
  let failed = 0;

  for (const job of jobs) {
    try {
      const message = renderEmailTemplate(job.template_key, job.template_data);
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": job.id,
        },
        body: JSON.stringify({
          from: emailFrom,
          to: [job.recipient_email],
          subject: message.subject,
          text: message.text,
          html: message.html,
        }),
      });

      if (!response.ok) {
        // Provider bodies can echo recipient data. Keep durable errors operational and redacted.
        await response.body?.cancel();
        throw new Error(`Email provider returned HTTP ${response.status}`);
      }

      const providerResult = (await response.json()) as { id?: string };
      await completeDelivery(admin, job, {
        succeeded: true,
        providerMessageId: providerResult.id,
      });
      delivered += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown delivery error";
      try {
        await completeDelivery(admin, job, { succeeded: false, error: message });
      } catch (completionError) {
        console.error(
          completionError instanceof Error ? completionError.message : "Outbox completion failed",
        );
      }
      failed += 1;
    }
  }

  return json({ ok: failed === 0, claimed: jobs.length, delivered, failed });
});

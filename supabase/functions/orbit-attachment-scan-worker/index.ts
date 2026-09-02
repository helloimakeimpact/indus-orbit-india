import { createGatewayAdminClient } from "../_shared/io/auth.ts";
import { parseScannerVerdict, scannerErrorCode } from "../_shared/attachments/scanner-contract.ts";

type ScanJob = {
  id: string;
  lease_token: string;
  storage_bucket: string;
  storage_path: string;
  file_name: string;
  content_type: string;
  byte_size: number;
  attempt_count: number;
};

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function serviceKeys() {
  const values: string[] = [];
  const configured = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (configured) {
    try {
      values.push(
        ...Object.values(JSON.parse(configured) as Record<string, unknown>).filter(
          (value): value is string => typeof value === "string",
        ),
      );
    } catch {
      console.error("SUPABASE_SECRET_KEYS is not valid JSON");
    }
  }
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) values.push(legacy);
  return values;
}

function suppliedKey(request: Request) {
  const apiKey = request.headers.get("apikey");
  if (apiKey) return apiKey;
  const authorization = request.headers.get("authorization");
  return authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);
  const keys = serviceKeys();
  const callerKey = suppliedKey(request);
  if (!callerKey || !keys.includes(callerKey))
    return json({ ok: false, error: "Service authentication required" }, 401);

  const scannerUrl = Deno.env.get("ORBIT_ATTACHMENT_SCANNER_URL")?.trim();
  const scannerToken = Deno.env.get("ORBIT_ATTACHMENT_SCANNER_TOKEN")?.trim();
  const providerKey = Deno.env.get("ORBIT_ATTACHMENT_SCANNER_PROVIDER_KEY")?.trim();
  if (
    !scannerUrl?.startsWith("https://") ||
    !scannerToken ||
    !providerKey ||
    !/^[a-z][a-z0-9_.-]{1,79}$/.test(providerKey)
  ) {
    return json({ ok: false, error: "Attachment scanner configuration is incomplete" }, 503);
  }

  const admin = createGatewayAdminClient();
  const claimed = await admin.rpc("claim_conversation_attachment_scan_batch", { _limit: 10 });
  if (claimed.error) return json({ ok: false, error: claimed.error.message }, 500);
  const jobs = (claimed.data ?? []) as ScanJob[];
  let submitted = 0;
  let failed = 0;

  for (const job of jobs) {
    try {
      const signed = await admin.storage
        .from(job.storage_bucket)
        .createSignedUrl(job.storage_path, 5 * 60);
      if (signed.error || !signed.data.signedUrl) throw new Error("scanner_signed_url_failure");
      const response = await fetch(scannerUrl, {
        method: "POST",
        signal: AbortSignal.timeout(60_000),
        headers: {
          Authorization: `Bearer ${scannerToken}`,
          "Content-Type": "application/json",
          "Idempotency-Key": job.id,
        },
        body: JSON.stringify({
          attachmentId: job.id,
          downloadUrl: signed.data.signedUrl,
          fileName: job.file_name,
          contentType: job.content_type,
          byteSize: job.byte_size,
        }),
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw new Error(`Scanner HTTP ${response.status}`);
      }
      const verdict = parseScannerVerdict(await response.json());
      const recorded = await admin.rpc("record_conversation_attachment_scan", {
        _attachment_id: job.id,
        _provider_key: providerKey,
        _provider_event_id: verdict.eventId,
        _verdict: verdict.verdict,
        _content_sha256: verdict.sha256,
        _threat_code: verdict.threatCode,
        _observed_at: verdict.observedAt,
      });
      if (recorded.error) throw recorded.error;
      const completed = await admin.rpc("complete_conversation_attachment_scan_attempt", {
        _attachment_id: job.id,
        _lease_token: job.lease_token,
        _submitted: true,
        _error_code: null,
      });
      if (completed.error) throw completed.error;
      submitted += 1;
    } catch (error) {
      const completion = await admin.rpc("complete_conversation_attachment_scan_attempt", {
        _attachment_id: job.id,
        _lease_token: job.lease_token,
        _submitted: false,
        _error_code: scannerErrorCode(error),
      });
      if (completion.error) console.error("scan completion failed", completion.error.message);
      failed += 1;
    }
  }
  return json({ ok: failed === 0, claimed: jobs.length, submitted, failed });
});

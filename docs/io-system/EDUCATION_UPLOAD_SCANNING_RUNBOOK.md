# Education upload quarantine and scanning

Implementation: **Verified locally**, 8 October 2026; production remains **Partial**. Source/contract evidence is in [finalization verification](../release-evidence/finalization-2026-10-08/verification.md). Real supplier configuration and hosted acceptance remain required.

## Source contract

`20261008094623_education_upload_quarantine.sql` places existing and new education objects in a private scan queue. Inserts and changes to object version/name/bucket/metadata invalidate prior verdicts. Existing published files are not silently grandfathered as clean.

A restrictive authenticated Storage SELECT policy requires a clean verdict for the current object ID, path and version, alongside existing publication/ownership/suspension rules. Editors also cannot download unscanned files. Failed/blocked/pending scans remain inaccessible. Browser roles cannot write scan state or call worker completion RPCs.

The trusted worker `education-file-scan-worker` claims up to five files, creates five-minute private URLs for the selected supplier, and submits bounded metadata through the existing normalized scanner contract. It requires an HTTPS endpoint, server token and bounded provider key. Files must have valid stored sizes between one byte and 50 MiB. Provider requests have twenty-second timeouts. Clean and blocked results require a digest and bounded supplier event ID; stale/future verdicts fail closed.

Completion locks the Storage object before its scan row and validates the current lease/version. An old scan cannot release replaced bytes. Five attempts, leases and backoff prevent endless retry. A crashed final lease becomes failed. Errors and responses exclude paths, signed URLs, file names and raw provider bodies. The scanner receives the actual file name and a temporary download URL only as needed for malware scanning.

The frontend checks a caller-authorized `education_file_status` before requesting a signed download. Pending files show “This file is being checked. Please try again later.” Unavailable/blocked files do not yield a URL. RLS remains authoritative for direct Storage requests.

Quarantined objects cannot be edited/deleted by an ordinary Storage request that requires SELECT. Removal or requeue of blocked files is a trusted service operation; ordinary editors cannot override a malware decision.

## Supplier and rollout

Education paths are immutable for browser roles, including editors: UPDATE and DELETE are denied so an existing signed path cannot be overwritten or deleted/recreated. New versions use new uploads. Removing a lesson attachment removes its reference; physical cleanup is a trusted service operation after approved retention/holds. Cleanup must not reuse keys. The app requests five-minute download URLs; this is not a claim of immediate revocation of issued bearer URLs or a bucket-wide maximum chosen by arbitrary API clients. Deleted identities cannot create new links or status requests.

Use the same supplier contract as the existing conversation scanner:

- `ORBIT_ATTACHMENT_SCANNER_URL`
- `ORBIT_ATTACHMENT_SCANNER_TOKEN`
- `ORBIT_ATTACHMENT_SCANNER_PROVIDER_KEY`

OpenAI/DeepSeek selection does not provide a malware-scanner verdict. Supplier approval and private file processing region remain an owner/service decision. No supplier is selected or paid by this increment.

Deploy the worker with internal secret authentication, gateway JWT verification disabled for that handler, and a one-minute service-only schedule. The existing conversation scanner remains separate. Configure and test the supplier in staging first.

Promotion requires a clean/blocked/failure fixture accepted by the actual supplier, correct hash/version binding, no direct download bypass, replacement during a scan, editor/member/suspended personas, retry/dead-letter handling and treatment of existing published files. Because the migration quarantines legacy objects, coordinate supplier setup/backfill before exposing the revised education download surface.

The pending policy matrix must cover uploaded objects, security verdicts, scan/provider evidence and deletion of orphaned/quarantined files. No retention purge or physical file deletion is activated automatically here.

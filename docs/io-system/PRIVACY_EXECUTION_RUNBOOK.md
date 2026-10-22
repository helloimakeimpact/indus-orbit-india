# Privacy execution delivery and operations

Status: **Verified** local source contracts; staging/production **Partial**. Policy `2026-10-15.1` is owner-delegated, not awaiting another retention worksheet.

## Delivery order

1. Select an approved separate staging backend/site. Review the fifteen exact forward files in the [current reviewed manifest](../release-evidence/chat-2026-10-22/reviewed-forward-release-manifest.json); historical migration aliases and held Spaces are separate. Never blanket `db push` or repair migration history to match file counts.
2. Rehearse backup, upgrade and recovery with synthetic accounts. Apply the approved prerequisite sequence and then `20261015114301_account_privacy_execution.sql` and `20261015115417_account_privacy_closure.sql`. Then apply the three reviewed chat migrations in manifest order, including the final safety/export projection before enabling event discussions. Check public/private schema lint, function grants, restrictive policies, Storage bucket/privacy and the browser type contract. Archived Loops remains without browser policies or grants.
3. Before any deletion, inspect `authenticator` role configuration and existing Data API hooks. Preserve required existing hook behaviour. The deletion claim requires the role setting `pgrst.db_pre_request=public.enforce_account_access`; do not overwrite another hook blindly. If composition is needed, review and test the guard implementation before changing role configuration. An authorized operator must install it and reload PostgREST configuration (`NOTIFY pgrst, 'reload config'`). Migrations do not make this role change automatically. Verify real HTTP/RPC denial using a previously issued access token after freezing a synthetic account. Table/Storage/Realtime restrictive policies are additional protection; managed object ownership and existing policies must be checked in the target environment.
4. Deploy the three service-only functions: `account-privacy-worker` (exports), `privacy-retention-worker` (retention/file cleanup), `account-deletion-worker`. The SDK is pinned to 2.111.0. Gateway JWT verification is off for these handlers; each handler requires an exact server secret/API key and has no anonymous execution path. Never distribute that key to a browser or documentation.
5. Keep `PRIVACY_EXECUTION_ENVIRONMENT` unset until staging acceptance. Only the exact values `staging` or `production` enable handlers. Establish server-side schedules invoking authenticated POSTs; begin with bounded, monitored invocations. Suggested cadence: exports/deletion every minute, retention every 15 minutes. Review queue size before selecting final frequency. Do not expose invocation credentials in cron output.
6. Deliver the paired member/admin frontends after backend readiness. Missing RPCs fail closed; no legacy unversioned mutation or browser-driven completion fallback is allowed. Test the actual Netlify commit and real role/MFA personas before promotion.

## Acceptance before activation

- Export own account, reject another account/request/path, verify 35-dataset coverage after the event discussion release, including only the caller’s own group opt-in, and exclusion of credentials/other guests. Download in Settings without losing a draft. Exercise account change during signing, expiry, cancellation during upload, a crashed final lease and an oversized assisted request.
- Cancel deletion before processing. Prove seven days from submission is the minimum. Approve only through MFA `members.support`, with current request version and recorded reason. Test ownership/safety blockers and explicit recovery of a started failed request.
- Freeze access before erasure. Prove old JWTs cannot call the Data API or read tables, Storage or private Realtime. Test the actual Auth ban/metadata clearing/soft-delete response and surviving financial/shared references; synthetic SQL confirmation is not GoTrue acceptance.
- Upload real disposable synthetic objects through Storage. Prove referenced, new, held and changed-version objects survive; retiring paths reject new references/replacement. Prove failed physical deletion does not advance Auth cleanup or completion. SQL tests only emulate API confirmations inside rollback transactions.
- Place subject/event holds before and after claim. Accepted holds are checked before each irreversible stage. Database locks serialize database erasure against accepted holds; an external Storage/Auth request already sent cannot be recalled. A worker preflight reduces this final external-call race but cannot eliminate it. Incident handling must account for it.
- Check short signed-link expiry. Cancelled/expired requests cannot mint new links; an already issued link can survive at most five minutes. Delete expired artifacts through the trusted cleanup API.
- Rehearse restore with deletion/closure tombstones kept in a restricted recovery record outside the restored serving snapshot. Reapply them before opening user access. Verify actual database/Storage backup coverage and rotation; never promise immediate erasure from immutable backups.

## Daily operating work

Name a privacy support owner. Review oldest requests against the 30-day response target; ready exports against seven-day expiry; blocked/exhausted leases; file cleanup failures; and holds by review date. The admin UI lists the first 50 active holds by review date, defaults new holds to 30 days and review in seven days, and audits explicit release reasons. Escalate larger queues rather than treating the first page as complete.

For a failed started deletion, investigate the recorded stage and file tasks, resolve the cause, then use versioned **Resume started deletion**. No automatic ownership bypass, manual completion flag or guessed Storage success is allowed. Waiting-for-files retries do not consume failure attempts. Superseded file identities that still exist require explicit recovery, not blind deletion by path.

Assisted requests need verified identity, scoped supplemental/binary export, secure expiring delivery, an inventory of preserved/removed data and a recorded response. Published learning content/administrative ownership must be handed over through trusted operations before automated erasure. Required finance/evidence retention is reviewed separately. Do not clear financial or safety tables just to make a deletion worker finish.

Before 13 May 2027, deliver the applicable statutory retention/archive profile or keep automated closure unavailable and process lawful requests through reviewed assistance. The current dated guard is an explicit remaining engineering obligation.

## Verification boundary

Local tests use synthetic records and rollback-only Storage/Auth metadata confirmations. Browser tests intercept suppliers and identities. Local TypeScript checking maps the pinned SDK and supplies only a Deno runtime declaration; genuine Edge/GoTrue/Storage, operator MFA and backup recovery acceptance remain required in staging. No real users, objects or hosted configuration were changed in this pass.

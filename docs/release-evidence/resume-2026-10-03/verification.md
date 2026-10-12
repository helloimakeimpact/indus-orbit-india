# Resumed launch work — 3 October 2026

Overall: **Partial**. Local source/contract verification does not establish a public production release. The owner resumed work after local checkpoint `e63290c85bfab9dcdbd591aa87bf488e803f6611` and resolved supplier/domain/host questions. Current resume work is uncommitted; nothing was pushed or applied to hosted Supabase.

## Current source evidence

| Gate                               | Result                                           | Exact boundary                                                                                                                                                                                                                   |
| ---------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fresh migration replay             | **125 migrations passed**                        | Dedicated disposable project `indus-community-launch-20261002`, port 55522; final source-copy hashes are in `final-source-manifest.json`.                                                                                        |
| Complete database contracts        | **32 files / 1,014 assertions passed**           | Includes 35 editing/history/review/receipt-expiry assertions, guest/profile projection and attendance refinements. All contract fixtures are synthetic and rolled back.                                                          |
| Replay snapshot confirmation       | `125\|1\|t\|t`                                   | Confirms 125 migration records, the edit migration, final active-receipt update in the function and nullable erasure-compatible history actor reference.                                                                         |
| Schema lint                        | **No error-level findings**                      | Current `public,private` schemas in disposable replay.                                                                                                                                                                           |
| Generated public type contract     | **Passed**                                       | Exactly 97 reviewed, hash-bound held-Spaces differences. New event/edit/review declarations match the generated snapshot. This allowance is not a hosted-drift exemption.                                                        |
| Unit suite                         | **195 passed**                                   | Existing full handler/client/transport/contracts, including 13 public-form, 11 guest-handler and four calendar cases; the new editing behavior is covered through SQL and browser contracts.                                     |
| Formatting/lint/types              | **Passed at stated checkpoints**                 | Full baseline format/lint/types passed on resume; final changed-source lint and full TypeScript pass after editing repairs. Final formatting covers updated source/docs/evidence.                                                |
| Configured guest/Turnstile browser | **Four passed**                                  | Desktop/mobile intercepted SDK, request failure, explicit confirmation, same-link reopening, anchor/reload continuity and cancellation. Runtime guest/form source is unchanged by editing. No real challenge or email delivery.  |
| Public/member browser baseline     | **29 passed / four configuration cases skipped** | Prior current guest production build before the editing increment. The four skipped cases passed separately with synthetic configuration.                                                                                        |
| Current production member browser  | **Ten passed**                                   | Latest production bundle: shell/navigation, tab/draft continuity, revocation/account changes, recovery of unavailable checks, I/O drawers, host creation/registration and edit stale-write/focus recovery. Synthetic identities. |
| Capacity races                     | **Both passed**                                  | Eight members: one seat/seven waitlist; four accounts plus four email guests: one seat/seven waitlist. Editing leaves registration conditions fixed and uses the same parent lock.                                               |
| Current production build           | **Passed, 47.55s Vite build**                    | Includes editing/dialog/client changes.                                                                                                                                                                                          |
| Bundle budgets                     | **Passed**                                       | Largest JS 377.12 KiB / 500; CSS 219.04 KiB / 250.                                                                                                                                                                               |

Early editing iterations exposed a declaration narrowing error, React purity/formatting issues, an exact label selector mismatch, and loss of the async dialog's focus return target. These were repaired; the final TypeScript/lint/browser passes above verify the current implementation. A concurrent local attempt also timed out while setting up a browser page; final current production member acceptance ran sequentially and passed. No timed-out attempt is counted as passing.

## Verified external connections (read-only)

- Member GitHub remote `main`: `04e10e5f754b219c6774a8da6b5159183e38fe7c`; local checkpoint is one commit ahead with additional uncommitted resume changes.
- Admin GitHub remote `20b594081394ecbfec41e9a053aaf7ea3f243ce1` and local `b46a815c7a9652ddd2ef6191f2ccd018f7ce9b4a` share tree `5e1ef524d10d6fb2986ab7ff7c6c8785acbe332e`.
- Public `https://indusorbit.com` returned 200, Netlify server/request headers and the approved company title; downloaded public entry scripts identify `jpwvgpnbkrktipwhvqss`. No browser credential value was printed or retained in evidence.
- Native Supabase project read confirms **Indus Orbit**, `ACTIVE_HEALTHY`, `ap-south-1`, PostgreSQL `17.6.1.104`. Both local app configurations use it. The project has 116 migration records and ten active functions; new public-form/guest functions are absent.
- Connected account returned no separate Indus Orbit staging project. The unrelated inactive JRI backup was not used.
- Read-only OpenAI/DeepSeek records remain in `conformance`, `resale_pending`, `routing_enabled=false`.
- Exact server-secret name inspection timed out; Resend/Turnstile/scanner configuration presence remains unverified. No secret values were printed. Netlify dashboard/repository settings, Resend domain verification and Auth SMTP were not inspected.

## Release boundary

Seven forward migrations, paired functions/frontend delivery, real email/challenge/persona acceptance and staging/production operating evidence remain pending. No real guest email, hosted write, provider activation, paid request or payment action occurred. Original brand/image assets are unchanged in this resume.

Automatic attendee status/change/reminder delivery, privacy export/purge, scanner/quarantine integration and I/O/finance/runtime/operating acceptance remain unfinished. Owner choices and practical setup are recorded in [LAUNCH_SETUP_AND_CONNECTIONS.md](../../io-system/LAUNCH_SETUP_AND_CONNECTIONS.md); current remaining work is in [the production report](../../io-system/PRODUCTION_STATUS_2026-10-03.md).

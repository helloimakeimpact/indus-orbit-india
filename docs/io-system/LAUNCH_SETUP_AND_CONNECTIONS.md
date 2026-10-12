# Launch setup and verified connections

Status: **Partial**, 3 October 2026. Development resumed after the local stop checkpoint. This is the current plain-language setup record; older dated setup questions are historical.

### Connection refresh — 7 October 2026

Read-only checks confirm the same two GitHub main commits, matching admin source trees, Netlify HTTP 200/site entry script/project reference, healthy Supabase project, 116 migration records, ten function versions and disabled OpenAI/DeepSeek routing. The connected account still returns no separate Indus Orbit staging project. Seven forward migrations and the new guest/form functions remain pending. The setup instructions below are retained; Resend domain verification, Auth SMTP, secret inventory and Netlify dashboard configuration were not verified in this refresh. See [the current status report](PRODUCTION_STATUS_2026-10-07.md) for dated evidence and remaining work.

## What is connected

| Service                 | Evidence on 3 October                                                                                                                                                                                                                              | Remaining boundary                                                                                                                                                                                                                                |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Member GitHub           | `helloimakeimpact/indus-orbit-india`, remote `main` at `04e10e5f754b219c6774a8da6b5159183e38fe7c`; local checkpoint `e63290c85bfab9dcdbd591aa87bf488e803f6611` is one commit ahead, with further uncommitted resume work.                          | New event/guest/Turnstile/editing work is local. This resume does not publish it.                                                                                                                                                                 |
| Admin GitHub            | `helloimakeimpact/admin-indus-orbit`, remote `20b594081394ecbfec41e9a053aaf7ea3f243ce1`; local `b46a815c7a9652ddd2ef6191f2ccd018f7ce9b4a`. Both have source tree `5e1ef524d10d6fb2986ab7ff7c6c8785acbe332e`.                                       | Source matches; deployment/MFA/persona acceptance are separate.                                                                                                                                                                                   |
| Live website            | `https://indusorbit.com` returns HTTP 200, `Server: Netlify`, a Netlify request header and the approved company title. Its entry scripts contain Supabase project reference `jpwvgpnbkrktipwhvqss`. The owner confirms GitHub-to-Netlify delivery. | Netlify dashboard repository/build/environment settings were not inspected in this resume. An HTTP response does not establish its exact deployed Git commit.                                                                                     |
| Supabase                | Both local apps and the live browser use `jpwvgpnbkrktipwhvqss`, named **Indus Orbit**, `ACTIVE_HEALTHY`, region `ap-south-1`, PostgreSQL `17.6.1.104`. The native connection can read this project.                                               | This is the backend currently serving the public site. Its production data, recovery and release acceptance still need review.                                                                                                                    |
| Hosted schema/functions | 116 recorded migrations; ten active Edge Functions, including `resend-email-dispatcher`, `notification-email-worker`, the I/O functions and attachment scan workers.                                                                               | Seven reviewed forward migrations are pending, including the new event editing migration. `public-form-submit` and `event-guest-session` are absent hosted. Existing worker deployment does not prove its supplier secrets, schedule or delivery. |
| Staging                 | No separate Indus Orbit staging project was returned by the connected account. The other returned project is an inactive JRI backup and is unrelated.                                                                                              | A separate test project or approved Supabase branch is needed for hosted release rehearsals. Local Docker tests remain disposable local verification.                                                                                             |

**Production** is the backend and deployment that real visitors use. **Staging** is a separate test backend/deployment for migrations, email and recovery rehearsals. Staging does not require buying another domain; its exact URL can be decided when the test environment is created. Do not repurpose the unrelated JRI project or reset the live Indus Orbit database.

## Decisions now confirmed by the owner

- Public domain: **indusorbit.com**, delivered through **GitHub → Netlify**.
- Transactional email supplier: **Resend**. Event verification already uses its API in source; existing hosted Resend workers are retained. The owner delegated the sender choice (“as needed”); intended event sender is **events@indusorbit.com**, pending verification/configuration in Resend. This is a chosen address, not evidence that its domain is verified or emails have been delivered.
- Initial event host and reviewer: **the owner**. Confirm the owner's actual signed-in account at onboarding, assign the scoped content capability, and verify MFA. Initial host approval needs a reviewed trusted bootstrap or a separate authorized reviewer because the browser RPC cannot grant its caller host approval. Subsequent host review can be performed by the owner. This does not create a second independent root operator for infrastructure recovery.
- Initial AI providers: **OpenAI and DeepSeek**. Provider selection is resolved. Exact launch models, server credentials, approved data controls, commercial activation evidence and bounded live conformance remain to be completed. No paid request or route activation is inferred from selecting them.
- Guest registration remains **public name/email by default**, with optional Community/chapter restrictions. Free events launch first; Razorpay event tickets are later.
- Brand remains **The General Intelligence Company of India** and **Intelligence, built together.** Original artwork and mark remain. Luma informs event clarity and interaction quality.

## Turnstile: the simpler spam check

Cloudflare Turnstile checks contact, newsletter and guest email requests for automated abuse. It generally runs in the background and shows a small interaction when necessary. It works on Netlify without moving DNS to Cloudflare. [Official setup](https://developers.cloudflare.com/turnstile/get-started/), reviewed 3 October 2026.

The code is implemented locally. Required setup:

1. Create a **Managed** widget in Cloudflare Turnstile for `indusorbit.com`.
2. Put its public site key in Netlify **`VITE_TURNSTILE_SITE_KEY`**.
3. Put its private secret in Supabase **`TURNSTILE_SECRET_KEY`**. Keep it out of chat, Git and VITE variables.
4. Configure Supabase **`PUBLIC_FORM_ALLOWED_ORIGINS=https://indusorbit.com`** and **`EVENT_PUBLIC_ORIGIN=https://indusorbit.com`** for the production functions. Add `https://www.indusorbit.com` only after verifying that hostname's intended deployment/redirect; a mention of the apex domain does not approve arbitrary previews or subdomains.
5. Engineering coordinates the two functions, verified-form migration and frontend build, then verifies real challenges and denied direct inserts. Staging uses its own approved origin and keys.

Exact server secret names were inspected through the CLI, but the read timed out; their presence is **unverified**, not absent. No secret values were printed. Local browser configuration has no Turnstile site key. Real Cloudflare acceptance remains pending.

## Resend: use the existing supplier

Resend is confirmed. Use **`IO_EMAIL_FROM=Indus Orbit <events@indusorbit.com>`** after verifying the sending domain in Resend. API email functions use server-only **`RESEND_API_KEY`** and **`IO_EMAIL_FROM`**. Supabase Auth email is separately configured through its SMTP settings; deploying an email function does not configure signup/password recovery SMTP. [Resend's Supabase SMTP guide](https://resend.com/docs/send-with-supabase-smtp), reviewed 3 October 2026.

Real delivery, recovery and guest links must be rehearsed. Private event links must not be rewritten by click tracking. Durable event status-change/reminder delivery remains engineering work; the current guest function sends the initial email proof link.

## What privacy and scanning mean

These are different decisions from choosing AI providers.

**Retention** means how long Indus Orbit keeps personal data, such as guest names/emails, event attendance, messages and uploads. **Export/deletion** means what a person receives or what is removed when they make an account/privacy request. The existing request queue is implemented; workers that produce exports and execute deletion still need the approved data rules.

For event guests, source already expires an unconfirmed email credential after **15 minutes**, extends a confirmed credential until **seven days after the event ends**, and provides daily pruning of expired credentials after a further day. Those are credential security limits. They do not automatically delete the guest's registration/name/email. No guest is silently subscribed to marketing.

Proposed policy for owner review: keep event guest contact/attendance data for **90 days after the event** for delivery/support, then delete or irreversibly anonymize it unless a documented safety/legal hold applies. Keep account information while the account is active; execute deletion requests according to the approved inventory and applicable obligations. This proposal is **Planned**, not an approved policy or a legal determination. Engineering must record exact scopes, exceptions, request deadlines and test the worker before launch.

**File scanning** means checking uploaded attachments for malware before people can access them. The existing scanner worker expects an HTTPS scanner endpoint and a normalized clean/infected verdict. OpenAI/DeepSeek route selection does not satisfy that malware verdict contract. The upload scanner still needs a supplier or a separately operated scanning service, private storage/quarantine and failure/retry/infected-file evidence. File safety can also be scoped by withholding uploads from launch until that integration is ready; do not expose unscanned files.

## Practical next steps

| Owner provides                                                                    | Engineering completes                                                                                                     |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Verified Resend sender address and service access through invitations             | Configure exact sender/Auth SMTP, deploy reviewed email functions and test actual signup, recovery and event mail.        |
| Cloudflare Turnstile keys placed in Netlify/Supabase                              | Coordinate the protected form/guest deployment and verify real tokens, failure paths and direct-insert denial.            |
| Staging project/branch choice and reviewed rollout authorization                  | Replay migrations, verify hosted types/permissions/personas, rehearse backup/rollback, then promote the approved release. |
| Initial owner account and MFA enrollment                                          | Bind host/reviewer capability to that identity with audited least-privilege onboarding.                                   |
| Approved retention rules and upload scanning scope                                | Implement export/purge and scanner delivery, then test retries, revocation and deletion.                                  |
| OpenAI/DeepSeek launch models, account readiness and approved activation evidence | Validate current provider contracts, run authorized capped conformance, then enable eligible routes individually.         |

Current implementation/evidence and remaining code are in [the production report](PRODUCTION_STATUS_2026-10-03.md), [event release runbook](EVENTS_RELEASE_RUNBOOK.md) and [completion register](CODE_COMPLETION_REGISTER.md). None of these configuration choices establishes full public production readiness.

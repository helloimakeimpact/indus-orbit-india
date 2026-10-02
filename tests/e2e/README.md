# Browser test boundary

`npm run test:e2e` starts the local application and runs public desktop/mobile and automated accessibility journeys. `npm run test:visual` compares the reviewed Brand baselines. Public navigation scenarios additionally exercise the skip link, named 320px short-screen menu, focus trapping/Escape/restoration, route choice, desktop-breakpoint closure and the in-flow storage notice under denied browser persistence.

`npm run test:e2e:member-ui` tests the Community and I/O shells with a synthetic, invalid session. It requires a localhost application URL, intercepts Supabase HTTP and Realtime sockets, suppresses remote font traffic and rejects writes. It covers keyboard skip/active-page semantics, 320px drawer navigation, internal navigation, cross-tab same-account auth events, draft retention, temporary access outages, explicit membership denial and sign-out. Seven scenarios also cover account-switch/A→B→A stale responses, fail-closed initial access with retry, I/O-only navigation and canonical Terminal reload, mobile nav/inspector focus trapping/Escape/restoration, serious/critical axe checks and overflow. This is browser UI evidence; it does not test hosted Auth, RLS, token expiry or real Realtime isolation. The Quality workflow includes this suite.

Authenticated journeys never contain credentials. Export a short-lived signed-in Playwright storage state outside Git, place it under the ignored `playwright/.auth/` directory, and run:

```sh
PLAYWRIGHT_MEMBER_STORAGE_STATE=playwright/.auth/member.json npm run test:e2e:auth
```

Delete the state after the run. Treat it like a session credential. Production passwords, refresh tokens and TOTP seeds must never enter fixtures, shell history, CI logs or GitHub.

The real-member suite checks I/O navigation/reload and Community tab-return draft retention. The draft is cancelled without submission. Sleep/wake, genuine token expiry, independent real account switching, supported mobile and two-member permission/Realtime journeys remain separate launch evidence. A skipped suite supplies no authenticated evidence.

## Public forms configuration boundary

`public-forms.spec.ts` uses the standard regression build without `VITE_HCAPTCHA_SITE_KEY`: it verifies unavailable submissions, named contact fields, the email alternative, 320px layout, retained input and no direct REST insertion or eager hCaptcha SDK load. The server-handler contracts verify the injected challenge/store boundary. Real staged hCaptcha completion/replay/expiry and hosted REST denial remain release evidence; no production challenge is solved by this suite.

## Native Community events and automatic verification — 3 October 2026

`community-events.spec.ts` checks public discovery/search, 320px invitation/community navigation, calendar download, accessibility, synthetic member waitlist/cancellation/access and the creation dialog's named fields/original covers/Escape/focus return. All data is intercepted; it is not genuine hosted-persona evidence.

`turnstile-configured.spec.ts` is opt-in. Start an isolated local preview with a synthetic `VITE_TURNSTILE_SITE_KEY`, set `PLAYWRIGHT_BASE_URL` to that local origin and `PLAYWRIGHT_TURNSTILE_CONFIGURED=1`, then run that file. It intercepts the official SDK and function requests and verifies automatic execution, single-use token reset and draft preservation. The standard build lacks a production sitekey and skips the two configured scenarios. Never point synthetic member fixtures at a hosted application.

`guest-registration.spec.ts` uses the same opt-in configured preview. Email and Turnstile are intercepted; desktop/mobile cover request rejection with draft preservation, explicit email confirmation (no automatic seat on open), fragment removal, receipt reload and private cancellation. This is not real deliverability or guest acceptance evidence.

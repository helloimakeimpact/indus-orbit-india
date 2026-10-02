# Public forms — Cloudflare Turnstile

Status: **Partial**, 3 October 2026. The owner requested a simpler replacement for hCaptcha. Source now uses Cloudflare Turnstile with managed verification, automatic execution after form interaction, and `appearance: interaction-only`. No Cloudflare account, production key, hosted function or migration was activated in this increment.

## What changed

Visitors fill in the form without a separate “Verify you’re human” step. The official SDK loads only after contact-form focus or newsletter input. A compact widget supplies a named `contact` or `newsletter` action, shows an interaction if required, clears expired/error tokens and resets after every submission. Failed submission preserves the draft. Missing configuration leaves submission unavailable and the contact email remains visible.

`public-form-submit` validates a bounded 20 KiB JSON stream, a token of at most 2,048 characters, exact allowed Origin and normalized allowlisted fields. It posts to the fixed HTTPS Turnstile Siteverify endpoint with an eight-second timeout. Storage requires literal `success === true`, an action equal to the submitted form kind, and a hostname equal to the allowed request origin's hostname. The endpoint rejects official dummy secrets, never logs form contents/tokens/secrets and never falls back to browser table inserts. Newsletter duplicates have a generic receipt.

Turnstile tokens are single use and expire after five minutes. Server verification is mandatory. Reviewed 2–3 October 2026: [client rendering](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/), [widget configuration](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/widget-configurations/), [server validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/), [testing](https://developers.cloudflare.com/turnstile/troubleshooting/testing/).

## Owner setup

1. Create separate managed Turnstile widgets for the approved staging and production domains in Cloudflare. Use real production keys. A Cloudflare account/widget is required; no DNS migration is part of this code change.
2. Set browser build variable **`VITE_TURNSTILE_SITE_KEY`** to the public widget key.
3. Set server-only **`TURNSTILE_SECRET_KEY`** and **`PUBLIC_FORM_ALLOWED_ORIGINS`** for `public-form-submit`. The latter is an exact comma-separated list, for example `https://indusorbit.com,https://www.indusorbit.com` only if both are approved. No paths or trailing slash. Keep the secret in the server secret interface.
4. Remove obsolete hCaptcha build/server variables after the coordinated switch. There is no hCaptcha fallback.
5. Engineering deploys the reviewed function to the approved staging project, then applies `20261002180809_require_verified_public_form_submissions.sql` and builds the browser with that environment's Turnstile site key. The public function intentionally uses `verify_jwt = false`; a valid challenge is its write boundary. Confirm the admin read path separately: RLS policies and table privileges both matter.
6. Rehearse a real success, expiry, replay, wrong form action, wrong hostname, blocked vendor, persistence outage and keyboard/screen-reader flow. Prove that direct anonymous and authenticated REST inserts into both form tables are denied. Promote only after review and environment authorization.

The existing minimal CSP does not block the SDK. A future full CSP must follow [Cloudflare's CSP requirements](https://developers.cloudflare.com/turnstile/reference/content-security-policy/) and be tested with the actual site.

## Evidence and limits

Local handler contracts and two configured browser scenarios use a fully intercepted synthetic SDK; they establish code behavior, not real Cloudflare challenge acceptance. Standard public regressions deliberately omit a production site key and verify that forms stay closed. No real email/contact record was sent by these checks.

The existing hosted anonymous insert policies remain a bypass until the paired migration is applied. CORS does not authenticate a caller. Durable platform rate controls, trusted client-IP handling, supplier privacy review and a real production challenge remain delivery gates. This change does not claim protection against every form of spam or denial of service.

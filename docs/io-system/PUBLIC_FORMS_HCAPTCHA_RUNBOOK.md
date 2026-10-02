# Public contact/newsletter hCaptcha runbook

Status: **Partial**, 2 October 2026. hCaptcha is the owner-selected supplier. The 12 local handler contracts, isolated role-permission fixture, production build and unconfigured-form browser checks pass; no hosted function, key configuration or access-control migration has been applied in this follow-up. Public form enforcement is not Released.

## Boundary

The browser renders a compact challenge only after the visitor chooses verification. It sends a token and bounded form fields to `public-form-submit`. The function requires an allowed exact Origin, a bounded JSON body and production configuration, verifies the token with a fixed expected sitekey using URL-encoded HTTPS POST, and stores only normalized allowed fields using server-only credentials. It checks `success === true`; exceptions/outages return no success. Tokens are cleared and the widget resets after every attempt. The client never falls back to direct table inserts. Newsletter duplicates return generic success without revealing an address's subscription status.

The paired migration `20261002180809_require_verified_public_form_submissions.sql` removes legacy anonymous INSERT policies and revokes INSERT from PUBLIC/anon/authenticated on both tables, while preserving service insertion and existing admin SELECT policies. Until that migration is delivered, hosted direct-insert bypass remains possible irrespective of the frontend widget. CORS is a browser-origin control, not a replacement for CAPTCHA or authorization.

No token, email, message or secret is logged by this handler. There is no per-IP forwarding because a trustworthy platform client-IP contract has not yet been established; arbitrary caller-supplied forwarding headers are not used. Evaluate provider guidance and platform anti-abuse/rate controls in staging. A valid CAPTCHA is not a guarantee against all spam, denial of service or malicious event hosts.

## Setup and coordinated rollout

1. Create separate staging/production sitekeys in the hCaptcha dashboard for the exact approved domains. Use real keys: this handler deliberately rejects the documented bypass test sitekeys and zero secret. [hCaptcha verification](https://docs.hcaptcha.com/#verify-the-user-response-server-side).
2. Configure browser build variable `VITE_HCAPTCHA_SITE_KEY` with the public sitekey. Configure server secrets `HCAPTCHA_SITE_KEY` (same value), `HCAPTCHA_SECRET_KEY`, and `PUBLIC_FORM_ALLOWED_ORIGINS` as an exact comma-separated origin list, for example `https://indusorbit.com,https://www.indusorbit.com` only if both are approved. Origins contain scheme/host/optional port and no trailing path or slash. Never put the secret in source, VITE variables, a browser bundle or chat. [Supabase function secrets](https://supabase.com/docs/guides/functions/secrets).
3. Engineering deploys only the reviewed `public-form-submit` to the approved staging project using the installed CLI and explicit project reference. Its config intentionally uses `verify_jwt = false`, because anonymous contact/newsletter callers are verified by hCaptcha. Other functions keep their own authentication configuration. [Public function configuration](https://supabase.com/docs/guides/functions/auth).
4. Apply the INSERT-revocation migration through the reviewed alias-safe deployment view. This is a fourth forward change after the three earlier 2 October migrations; it is not a historical ledger repair. Recheck grants/policies and the exact hosted schema boundary.
5. Deliver the browser build with the correct sitekey and verify the matrix below. Coordinate the function, migration and frontend to avoid presenting a working form during incomplete deployment. Missing configuration produces a truthful temporarily-unavailable state; the company email remains available on Contact.
6. Review the actual hCaptcha browser/service data processing, supplier terms and privacy disclosure. The existing minimal CSP only restricts base/object/frame ancestors; it does not currently block hCaptcha script/frame/style/connect. If introducing a full CSP, use hCaptcha's documented host rules and verify all form flows rather than hard-coding one asset subdomain. [hCaptcha CSP](https://docs.hcaptcha.com/#content-security-policy-settings).

## Acceptance matrix

| Case                                             | Required result                                                                           |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Valid contact                                    | Exactly one accepted record, normalized fields, truthful confirmation; no token stored.   |
| Newsletter existing/new                          | Same generic receipt; duplicate does not reveal audience membership.                      |
| Missing/invalid/expired/replayed token           | No write; clear retry, new challenge and retained draft.                                  |
| Vendor HTTP failure/timeout/bad response         | No write or success; recoverable unavailable state.                                       |
| Unapproved origin/non-JSON/oversized body/fields | Denied before verification or storage; bounded work.                                      |
| Missing config or documented bypass keys         | Unavailable; no acceptance path.                                                          |
| Anonymous and authenticated REST INSERT          | Permission denied after migration; read/admin behavior remains scoped.                    |
| Blocked SDK/network                              | Clear retry and company email alternative, no arithmetic bypass.                          |
| 320px/keyboard/reduced motion                    | Compact widget fits, form controls named, status readable, no overlay/scroll obstruction. |

Local deterministic handler contracts use an injected verifier and store. They establish control flow, not real hCaptcha service behavior. A real staged challenge, replay, expired token and cross-role direct REST denial remain required before promotion. New database pgTAP contracts also run in the source quality workflow; retain their exact result with the release evidence.

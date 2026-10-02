# Retired hCaptcha setup

Status: **Partial**, historical checkpoint from 2 October 2026. On 3 October the owner requested a simpler verification experience. The active source replaces hCaptcha with Cloudflare Turnstile.

Use [PUBLIC_FORMS_TURNSTILE_RUNBOOK.md](PUBLIC_FORMS_TURNSTILE_RUNBOOK.md) for current variables, server verification, rollout and acceptance. Do not configure hCaptcha for the current release. The earlier committed hCaptcha implementation and its evidence remain in Git history and `../release-evidence/community-2026-10-02/`.

The vendor-independent form INSERT boundary migration remains required and has not been applied to the hosted project in this increment.

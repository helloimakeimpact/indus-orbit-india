# Community direction and public-form follow-up — 2 October 2026

Status: **Verified** local slice; **Partial** hosted/release boundary. This record is separate from the earlier published 121-migration/883-assertion checkpoint.

## Source and scope

The owner confirmed an events-focused Community direction preserving the Indus Orbit identity. Approved member hosts, new-host review, public discovery and member-required registration are confirmed. Native free events come first; Razorpay is later. Global versus chapter registration membership remains a pending follow-up. The full research/audit/plan is `../../io-system/COMMUNITY_EVENTS_DIRECTION_AND_LUMA_ANALYSIS.md`.

This increment implements public navigation/storage repairs, the selected hCaptcha contact/newsletter boundary and narrow event-card/share fixes. The new public event/calendar/registration/host/check-in workstream is Planned; existing event/RSVP foundations remain Partial. The approved branding and original assets are retained.

## Local evidence

- 178 unit contracts passed, including 12 new deterministic public-form handler contracts. The verifier and store are injected mocks; real hCaptcha service behavior is not inferred.
- The production web bundle built and passed JS/CSS size budgets: largest JavaScript 377.12 KiB / 500 KiB, CSS 210.43 KiB / 250 KiB.
- The handler and handler tests passed a strict standalone TypeScript check.
- Isolated PostgreSQL 17 fixture replayed the original form tables and exact new migration. Actual anon/authenticated INSERT attempts were denied; service_role inserted both records under RLS; the prior read privilege remained. This fixture used synthetic data and did not contact hosted Supabase.
- The source adds 10 pgTAP assertions for the form boundary; full current migration replay awaits the corresponding CI result. No claim that the former 883 assertions include the new migration is made.
- The final production-bundle browser run passed **25/25** (16 public desktop/mobile, 2 card visuals, 7 synthetic member/I/O). Format and changed-file lint passed; the main TypeScript and standalone handler checks passed. The configured real hCaptcha widget/service still needs staged acceptance. Public short-screen/storage cases were previously checked on desktop/mobile. The first trigger lookup failed because Radix hides background accessibility while the dialog is open; using an inclusive locator corrected the assertion without removing the focus/aria-expanded checks. The targeted 2 navigation cases then passed.
- An initial final browser attempt reached a stopped loopback preview after turn interruption and failed with connection refused. The preview was restarted; the final browser run is recorded separately. These infrastructure failures are not accepted as a passing run.

## Hosted/release limits

No hCaptcha key, function deployment, access-control migration or production form challenge has been executed here. The legacy hosted direct-insert paths remain until the paired migration is delivered. The new frontend refuses unconfigured submission and keeps Contact's company email available. See `../../io-system/PUBLIC_FORMS_HCAPTCHA_RUNBOOK.md` for coordinated rollout and acceptance.

Hosted Supabase remains at the preceding read-only observation of 116 migration records. Source now has 122 migrations; four 2 October forward changes await reviewed hosted delivery. Providers still need commercial/conformance activation, and the full launch needs real member/operator/device, privacy, worker/scanner, event, payment, admin/terminal and restore/operations evidence. Source publication alone does not approve those actions.

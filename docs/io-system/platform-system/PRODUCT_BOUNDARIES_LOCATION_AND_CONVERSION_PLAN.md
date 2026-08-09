# Product boundaries, global location, and conversion plan

Status: Phases A and B Released to demo; Phase C foundation Partial, 9 August 2026.

## Decision

Indus Orbit has three related products with one Supabase identity and distinct authorization boundaries:

| Product             | Canonical route                          | Entry requirement                                                    | Onboarding                                                                           |
| ------------------- | ---------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Public Indus Orbit  | `/` and public content routes            | None                                                                 | None                                                                                 |
| I/O Port            | `/io`                                    | Authenticated identity; workspace authorization remains independent  | No community profile, segment, location, vouch, Chapter, or verification requirement |
| Community app       | `/app`                                   | Authenticated identity plus explicit community onboarding completion | User-initiated only                                                                  |
| Admin control plane | separate `admin-indus-orbit` application | Shared identity plus database-checked admin capability               | Privileged re-auth/MFA remains a release gate                                        |

`/io-port` remains the public I/O Port information page. The old `/app/io` path is compatibility-only and must lead to `/io` before the community gate is evaluated.

The former Loops content product is retired. Its active routes, navigation, server adapter, and sitemap entries are removed. Historical rows are retained behind a service-role read-only archive until a documented retention decision is approved; ordinary uses of the word “loop” in engineering or system philosophy are not the retired product.

## Identity and onboarding state

Authentication creates the minimum private account/profile record. It does not imply community membership, location consent, analytics consent, verification, or publication.

Community onboarding has an explicit state machine:

```text
not_started -> in_progress -> completed
                    |
                    +------> paused -> in_progress
```

Rules:

- I/O Port access is independent of this state.
- Visiting the community app may start onboarding only after a clear user action.
- `profiles.orbit_segment` is community profile data, not a universal product-access flag.
- Location is optional and never blocks community completion.
- Existing members with a segment may be backfilled to `completed`; I/O-only accounts remain `not_started`.
- All state mutations are caller-bound, idempotent RPCs with database authorization and audit/measurement boundaries.

## Global location model

Location is a consent-controlled community domain rather than a side effect of account creation.

### Reference geography

- ISO 3166-1 alpha-2 countries are global reference data.
- Regions and places use reviewed identifiers when available.
- Unmatched region/city labels may be stored privately for display, but are excluded from exact geographic aggregation until normalized.
- Time zones use IANA names and are stored only when the user enables scheduling use.

### Private preferences

The private location record may contain country, normalized or unmatched region/city, optional scheduling timezone, and separate booleans for scheduling and recommendations. It is owner-readable only through a caller-bound RPC. No browser role receives direct table access.

Legacy profile location is copied as `legacy_unconfirmed` with all uses and sharing disabled. A legacy public profile does not become granular location consent.

### Explicit sharing

A separate public-schema projection contains only the member's chosen audience and precision:

- audience: `members` or `public`;
- precision: `country`, `region`, or `city`;
- no time zone, coordinates, raw address, venue, or private labels outside the selected precision.

Direct browser writes are denied. Owner changes go through one atomic RPC that validates geography, records consent metadata, and replaces or removes the share. Withdrawal removes the public/member projection immediately.

### Not included in the foundation

- exact coordinates;
- background browser geolocation;
- inferred location from IP, locale, or time zone;
- distance-ranked people discovery;
- small-cohort geographic reporting;
- a hand-written global city gazetteer.

If coarse coordinates are added later, they require a separate consent version, deliberate browser action, server-side quantization, expiry, and immediate withdrawal.

## Scientifically valid conversion measurement

I/O and community have separate funnels and denominators. Community onboarding or location never appears in the I/O denominator.

### I/O funnel

```text
io_cta_viewed
-> io_auth_completed
-> io_workspace_created
-> io_local_connected OR io_first_route_succeeded
-> io_returned_d7
```

### Community funnel

```text
community_join_viewed
-> community_account_confirmed
-> community_onboarding_started
-> community_identity_saved
-> community_location_decided (skipped/private/members/public only)
-> community_onboarding_completed
-> community_activated
-> community_retained_d7
```

`community_activated` requires a trusted outcome such as an accepted connection, confirmed RSVP, joined Chapter/Mission, or accepted mentorship request. Page views and profile completion alone are not activation.

### Measurement contract

- First-party and consent-aware; consent defaults off.
- Community measurement consent is offered at the explicit product-entry decision, before `onboarding_started`, so opted-in starts and completions use the same denominator; it never changes access or CTA availability.
- Event names and surfaces are allowlisted.
- Client event IDs make ingestion idempotent.
- No arbitrary property JSON.
- No email, prompt/content, IP, user-agent string, city, coordinate, raw URL, or exact timezone in measurement events.
- High-value lifecycle events should be emitted transactionally by trusted RPCs.
- Location choice is a privacy diagnostic, never a primary success metric.

Primary community metrics:

```text
onboarding completion = completed / confirmed community entrants
activation rate = activated within 7 days / completed onboarding
D7 retention = returned on day 7-14 / activated
```

Guardrails include location skip rate, consent withdrawal rate, abandonment by step, support/error rate, and median/p95 completion time. Geographic analysis requires at least 50 subjects per comparison and aggregate cells of at least 10 people.

Before an A/B test:

1. run an A/A instrumentation test;
2. pre-register hypothesis, primary metric, minimum detectable effect, sample size, duration, exclusions, and stopping rule;
3. assign variants immutably at the server boundary;
4. check sample-ratio mismatch;
5. report denominators, absolute/relative lift, and 95% confidence intervals;
6. never vary privacy truthfulness or the prominence of a location Skip action.

## Implementation phases

### Phase A — product boundary foundation

- [x] top-level authenticated `/io` and distinct I/O shell;
- [x] public sign-up/sign-in with validated `io` or `community` intent;
- [x] compatibility handling for `/app/io`;
- [x] explicit community onboarding state and caller-bound access projection;
- [x] separate I/O/community navigation and wording;
- [x] product-access and route tests.

### Phase B — global location consent foundation

- [x] global 249-country reference contract;
- [x] private member preferences and explicit share projection;
- [x] owner-only get/set/withdraw RPCs with idempotency;
- [x] legacy values imported as unconfirmed/private;
- [x] onboarding Skip/private/member-country choice, purpose toggles and consent summary UI;
- [x] RLS/grant/withdrawal tests, including normalized region/place enforcement.

### Phase C — measurement foundation

- [x] consent preference defaults off;
- [x] allowlisted, idempotent, content-free event contract;
- [x] separate I/O and community event surfaces and documented funnel denominators;
- [ ] transactional onboarding/workspace lifecycle events;
- [ ] operator-only aggregate reporting with small-cohort suppression;
- [ ] A/A validation before experimentation.

### Phase D — normalized discovery and event safety

- [ ] reviewed global region/place import pipeline with provenance/versioning;
- [ ] replace direct profile directory reads with an allowlisted discovery RPC;
- [ ] split public event location from attendee-only venue/link details;
- [ ] local opportunity recommendations only after opt-in;
- [x] location confirmation, purpose/audience changes and immediate revocation in Community Settings;
- [ ] browser persona, accessibility, privacy, and load tests.

## Release boundary

The access/location migrations are Released to the demo project. Live verification confirms 249 active countries, no invalid consent-bearing legacy rows, RLS on all seven private state tables, no direct authenticated read of private preferences, authenticated-only caller-bound RPCs, and zero segmented profiles missing completed Community state. Public generated types match the hosted schema.

The prior local baseline still proves 58 migrations, 269 database assertions and public/private lint. The 59th SQL migration replayed, but a local Storage-container health failure prevented a fresh full 285-assertion run; that CI gate remains open. I/O-only/community browser personas, production deployment, consent/accessibility review and transactional lifecycle measurement also remain. No provider request, payment, hosted reset or automatic location collection occurred.

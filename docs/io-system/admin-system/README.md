# Indus Orbit admin system

Status: separate application foundation published to private GitHub `main`; provider/evidence/budget/circuit/commercial and capped provider-conformance database controls Released to demo on 20 August 2026.

## Ownership boundary

- `helloimakeimpact/admin-indus-orbit` owns the standalone administrator web application.
- `helloimakeimpact/indus-orbit-india` owns shared Supabase schema/migrations, the member application and a small `/admin` handoff.
- The member application does not render the admin control room. Old `/app/admin/*` bookmarks are redirected out of the member shell.
- Shared Supabase Auth supplies identity. Database roles/capabilities supply authority.

## Implemented authority model

Existing `public.user_roles.role = 'admin'` records remain root platform authority and are presented as **super-admin**. This avoids silently weakening dozens of inherited policies while the system is migrated.

Six new scoped duties exist without copying that root role:

| Duty               | Capabilities                                                  |
| ------------------ | ------------------------------------------------------------- |
| Trust & safety     | `admin.enter`, `trust.manage`, `reports.manage`, `audit.read` |
| Member support     | `admin.enter`, `members.read`, `members.support`              |
| Content operator   | `admin.enter`, `content.manage`                               |
| Programme operator | `admin.enter`, `programs.manage`                              |
| I/O operator       | `admin.enter`, `io.read`, `io.manage`, `audit.read`           |
| Audit viewer       | `admin.enter`, `audit.read`                                   |

Assignments, capability mappings and assignment events live in the non-exposed `private` schema. `get_my_admin_access()` is caller-bound. `admin_set_team_role()` requires an existing super-admin and a human reason. Browser roles can no longer insert, update or delete `public.user_roles`.

## I/O operator boundary

The admin application can read safe operational and commercial provider snapshots and operate the independent runtime switch through capability-checked RPCs. Enabling fails unless an endpoint has active provider/model/endpoint states, a ready connection, verified chat capability, effective published price, a passed conformance run and reviewed written onward-access authorization. The gateway's service-only resolver and a database trigger enforce the same rule, so UI state cannot bypass it.

Current demo facts:

- 5 staged providers;
- 5 runtime controls;
- 0 enabled runtime controls;
- 0 passed conformance runs;
- 0 ready routes;
- OpenAI and DeepSeek marked `resale_pending` with `resale_authorized=false`;
- 0 scoped team assignments (the two existing admins remain super-admins).

No provider call or credit was consumed by this work.

The Released operational/conformance backend and published admin build additionally provide:

- capability-checked workspace budget snapshots;
- immutable integer-minor-unit budget-version creation with an operator reason;
- endpoint health/circuit snapshots;
- reasoned manual circuit open/close controls;
- a single-use, 30-minute, USD 0.01-capped provider-conformance approval with discovery-first execution and redacted evidence;
- a fail-closed capability transition in which only a passing run seals the tested draft as Verified;
- explicit China-hosted processing acknowledgement for the DeepSeek API test;
- 13 passing browser contract tests and the last shared 550-assertion local database baseline.

The operational slice is Released through `20260810002754_create_io_operational_core.sql`; the commercial projection/gate is Released through `20260820001339_add_io_transparent_service_fee.sql`; conformance is Released through hosted versions `20260820191544` and `20260820191815` plus `io-provider-conformance` v1. The separate admin browser application is published but remains unhosted.

## Code complete versus left

Implemented:

- standalone branded shell and sign-in;
- desktop and 390px mobile runtime verification;
- control overview, team assignment/revocation and I/O operations pages;
- provider commercial state, onward-access activation gate and terms-evidence link;
- reasoned, explicitly confirmed and cost-capped OpenAI/DeepSeek conformance controls;
- safe unconfigured state and environment contract;
- typed/build verification in both repositories;
- all 23 tracked admin files published to `helloimakeimpact/admin-indus-orbit` private `main`;
- demo database migrations and post-apply checks;
- covering indexes for every foreign-key path in the new assignment, audit and provider-control tables.

Left before production:

1. host the admin repository and set `VITE_ADMIN_APP_URL` in the member app;
2. require MFA, recent re-authentication, session review/revocation and two-person approval for root changes;
3. replace legacy trust/report, member, content and programme direct-table mutations with transactional capability-checked RPCs;
4. add optimistic concurrency, mandatory decision reasons, immutable/redacted events, appeals and negative role-matrix tests;
5. add paginated audit search/export with retention and redaction policy;
6. role-test and explicitly execute the Released conformance boundary, then add commercial evidence mutation/expiry, scheduled health and ledger reconciliation before user traffic;
7. create staging/production separation, SLOs, alerts, incident response and rollback proof.

## Security-advisor interpretation

The new public RPCs are deliberately `SECURITY DEFINER` because they read private control-plane data, and each performs a database caller/capability check with a fixed empty search path and explicit grants. The advisor reports them generically as authenticated-executable; this is expected and requires role-matrix tests rather than blind revocation. Existing inherited anonymous/authenticated function warnings and permissive public form inserts remain product-wide remediation work. Private RLS-with-no-policy notices are intentional deny-by-default defense in depth. Fresh-index `unused_index` notices are informational until realistic traffic exists; the indexes protect foreign-key joins and cascades and should be evaluated after an observation window, not immediately removed.

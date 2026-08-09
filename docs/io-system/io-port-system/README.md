# I/O Port system record

Status: deployed provider foundation and top-level product boundary, updated 9 August 2026.

## Current operational truth

I/O Port has a real web surface, Supabase control plane and registry-driven gateway. Its live inventory contains five provider/model/endpoint/control records and three capacity sources/grants. It does **not** yet have shared OpenRouter capacity or any active direct-provider route; route receipts and provider attempts remain zero.

| Layer                      | Current state                                                                                                         |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Public `/io-port`          | Implemented; private-beta language rather than a public-capacity claim.                                               |
| Product `/io`              | Released to demo; any authenticated identity can enter without Community onboarding. `/app/io` redirects here.        |
| Supabase control plane     | Deployed to demo.                                                                                                     |
| Provider registry          | Five direct providers/models/endpoints/prices staged.                                                                 |
| Provider secrets           | Present in Edge Function secret storage by unique provider name; values are not in registry or Git.                   |
| Gateway                    | `io-gateway` v17 active with JWT verification.                                                                        |
| Member route evidence      | Latest twelve RLS-scoped receipts show route, capacity, attempt/fallback, token and currency-labelled estimate facts. |
| Admin route evidence       | Capability-checked aggregate plus keyset-paginated redacted receipt feed in the separate admin app.                   |
| Ready providers            | Zero. All five connections are testing; capability proofs are draft; providers/endpoints are conformance-only.        |
| OpenRouter upstream        | Not configured. No OpenRouter key, connection, model sync or paid/shared capacity has been claimed.                   |
| Owned/rented capacity      | Architecture only; no certified server endpoint.                                                                      |
| Donated/sponsored capacity | Demo source and plan only; no eligible live endpoint.                                                                 |
| Member BYOK                | Planned; current stored keys are operator-owned server secrets, not member connections.                               |
| Billing                    | Price cards and estimates only; no wallet, reserve-and-settle ledger or invoices.                                     |

I/O and the Community share one identity but not one onboarding gate. The Community switch opens `/app`, which offers explicit opt-in setup only when it has not already been completed.

## Documents

- `IO_PORT_IMPLEMENTATION_STATUS.md` — detailed done/partial/left and verified deployment state.
- `OPENROUTER_CAPABILITY_AND_CAPACITY_PLAN.md` — feature-by-feature OpenRouter comparison and capacity adoption plan.
- `IO_PORT_IMPLEMENTATION_PLAN.md` — product and platform target.
- `IO_PORT_CODE_LEVEL_ROADMAP.md` — engineering sequence.
- `IO_PORT_OPERATIONS_GUIDE.md` — secret, deployment and activation operations.
- `IO_PORT_PROVIDER_INVENTORY.md` — 20-provider inventory framework.
- `IO_PORT_PROVIDER_LANDSCAPE.md` — researched supply landscape.
- `IO_PORT_SOURCE_BRIEF.md` — research and product synthesis.

## Next safe milestone

The next milestone is not “turn every key on.” It is a no-cost conformance harness with recorded fixtures and SQL state-transition tests, followed by one explicitly approved bounded live request per provider. Only a passing provider should move from testing/conformance/draft to ready/active/verified, and only after workspace budget and kill-switch rules are present.

# I/O billing, credits and invoices

Status: hosted schema and caller-bound RPCs **Released** on 24 August 2026; member UI **Verified locally** and awaiting the next web deployment.

## Released boundary

I/O now preserves the commercial evidence for every settled route in integer currency nanos:

```text
provider cost + separately recorded 5.5% I/O service fee = customer charge
customer charge - applied non-cash credit = amount due
```

The hosted Indus Orbit project contains:

- paged, filterable member usage history with exact cost, fee, credit and amount-due fields;
- one credit account per workspace and currency, with append-only grant/application entries;
- automatic credit application when, and only when, a usage record is first settled;
- immutable invoice-line snapshots derived from uninvoiced settled usage;
- capability-gated operator RPCs for posting an idempotent credit and creating a draft invoice;
- caller-bound member RPCs for billing summary, credit history and invoice history;
- a member ledger surface that displays unbilled usage, available credits, draft/issued/paid counts, filters and keyset pagination.

Credits do not increase or replace a workspace budget. The hard reserve-before-dispatch budget remains the authorization boundary. A credit only offsets an already-settled customer charge. Provider cost and the I/O fee remain visible even when the resulting amount due is zero.

## Security and privacy boundary

The browser cannot select or mutate the underlying billing tables. Direct access for `anon` and `authenticated` is revoked; member reads and operator mutations pass through `security definer` RPCs that bind the caller to workspace membership or an administrative capability. Prompt, response, provider credential and raw upstream error data are absent from billing records.

Credit external references are unique per account, so an operator retry cannot silently double-grant a credit. A usage record can receive only one automatic credit application. One usage record and route receipt can appear in only one invoice line.

## Invoice meaning

An I/O `draft` is a reconciliation snapshot, not a legal tax invoice and not proof of payment. Draft creation freezes provider cost, service fee, credits and amount due for a selected workspace, currency and period. Ordinary members can see issued/paid invoices; workspace owners and admins may also see drafts.

The following remain **Planned/Blocked on commercial decisions**:

- buyer legal identity, GST/place-of-supply and tax calculation;
- invoice issuance, numbering/legal artifact generation and delivery;
- payment processor, INR/foreign-currency settlement and approved FX versions;
- refunds, payment failures, chargebacks and credit-expiry policy;
- provider invoice ingestion and line-by-line reconciliation;
- accounting approval and production concurrency evidence using controlled provider traffic.

No code should promote a draft to `issued` or `paid` until those rules and owners are approved.

## Verification evidence

- Hosted project: `jpwvgpnbkrktipwhvqss` (`Indus Orbit`, `ap-south-1`).
- Migration: `20260824173000_add_io_billing_history_credits_and_invoices.sql`.
- Hosted schema verification: four billing tables, six RPCs, usage credit/amount-due columns and the settlement trigger are present.
- Local quality gate: typecheck, lint, 65 unit tests and production build pass.
- Supabase Advisor was run after the DDL. Its existing broad project notices require a separate backlog pass; the new tables intentionally use RLS with no browser policies because all access is RPC-only and direct grants are revoked.

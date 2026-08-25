# I/O billing, credits, GST, FX and Razorpay

Status: finance code and hosted control plane **Released** on 25 August 2026; commercial activation remains operator-, accountant- and merchant-gated.

## What is implemented

Every settled route preserves exact integer currency nanos:

```text
provider cost + separately recorded 5.5% I/O service fee = customer charge
customer charge - applied non-cash credit = amount due
```

The hosted Indus Orbit project now contains:

- paged member usage and immutable invoice-line evidence;
- workspace/currency credit accounts and append-only credit entries;
- verified, versioned buyer billing profiles;
- versioned GST/tax policies and FX rates with effective periods and second-person approval;
- same-currency invoice drafts and cross-currency drafts that snapshot one approved FX rate;
- immutable issued-invoice seller, buyer, SAC, place-of-supply, tax and FX evidence;
- a member invoice PDF generated only from the issued database snapshot;
- Razorpay server-created Orders and Standard Checkout;
- mandatory server verification of the Checkout HMAC response;
- signed test/live webhook verification over the unmodified request body;
- provider-event and financial-transition idempotency, including duplicate capture/refund protection;
- captured-payment-only refunds with `X-Refund-Idempotency` on every Razorpay refund request;
- out-of-order refund reconciliation when a webhook arrives before the refund API response is saved;
- payment/refund/dispute state and provider-statement reconciliation;
- separate finance-operator UI for billing verification, structured Indian GST drafts, FX evidence, invoice drafting/issuance, Razorpay configuration, refunds and reconciliation.

The browser receives only the Razorpay public key ID, server-created Order ID and amount. Razorpay key secrets, webhook secrets, raw webhook bodies and raw Checkout signatures are never returned or stored. A Checkout success response proves only that its signature is valid; the signed webhook remains settlement authority.

## Razorpay runtime configuration

Use separate Supabase Edge Function secrets for each environment:

```text
RAZORPAY_TEST_KEY_ID=rzp_test_...
RAZORPAY_TEST_KEY_SECRET=...
RAZORPAY_TEST_WEBHOOK_SECRET=...

RAZORPAY_LIVE_KEY_ID=rzp_live_...
RAZORPAY_LIVE_KEY_SECRET=...
RAZORPAY_LIVE_WEBHOOK_SECRET=...
```

Configure both Razorpay dashboards to send supported payment/refund/dispute events to:

```text
https://jpwvgpnbkrktipwhvqss.supabase.co/functions/v1/io-payment-webhook
```

The legacy single-environment names remain available only for a controlled transition and require an explicit environment:

```text
RAZORPAY_ENVIRONMENT=test|live
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...

RAZORPAY_WEBHOOK_ENVIRONMENT=test|live
RAZORPAY_WEBHOOK_SECRET=...
```

Do not configure both test and live with one secret, and do not place any key secret in Netlify, GitHub variables exposed to Vite, browser JavaScript or local storage. `io-payments` requires a Supabase user JWT. `io-payment-webhook` deliberately disables Supabase JWT verification because it performs its own Razorpay HMAC verification.

## Indian GST boundary

The admin app creates a structured INR policy draft. Its common templates are:

- domestic intra-state: 9% CGST + 9% SGST;
- domestic inter-state: 18% IGST;
- export: zero-rated evidence, distinct from exemption;
- exempt: explicit exemption evidence.

These are data-entry templates, not legal classification. A qualified Indian tax professional must confirm the seller legal identity/GSTIN/state, buyer category and place of supply, SAC, description, taxable base, rate, export conditions, invoice wording and effective period. A different super-admin must then approve the exact policy version. The application cannot issue an invoice without a verified buyer profile and matching approved policy.

Drafts are reconciliation snapshots, not tax invoices. Issuance snapshots the approved policy and labels export as `zero_rated` and exemption as `exempt`. No policy is approved by code or migration.

## FX boundary

Usage may remain in its provider currency or be invoiced in a settlement currency. Cross-currency draft creation requires an approved, currently effective rate whose base and quote currencies match exactly. Conversion uses rational integer arithmetic and snapshots:

- source and settlement currency;
- approved rate-version ID;
- numerator and denominator;
- evidence URL;
- source totals and converted invoice/line totals.

The rate cannot change an existing invoice. Final amount due is rounded only to the settlement currency's active minor-unit rule at issuance. No automatic market-rate fetch or silently floating rate is used.

## Payment and refund lifecycle

```text
issued invoice
  → one active server payment intent
  → deterministic Razorpay receipt
  → create or unambiguously recover Razorpay Order
  → Standard Checkout
  → server verifies order_id|payment_id HMAC
  → signed webhook captures settlement
  → invoice paid state

captured payment
  → capability-gated refund request
  → idempotent Razorpay refund API call
  → signed webhook processes/fails refund
  → invoice refund state
```

One active Checkout per invoice prevents parallel overpayment. Expired intents are cancelled before a new intent is created. Event IDs deduplicate ordinary retries; unique provider payment/refund identifiers and locked state transitions also prevent a provider retry with a different event ID from incrementing money twice.

## Activation sequence

1. Create an isolated staging Supabase project/deployment; do not execute Razorpay test settlement against the production finance database.
2. Add a reviewed staging-only test-payment adapter, then add test key and webhook secrets only to that staging project.
3. Register and second-person approve the test processor, GST policy, any required FX rate and a workspace billing profile in staging.
4. Run a sandbox journey: draft → issue → Checkout → capture → duplicate webhook → partial refund → duplicate webhook → reconciliation.
5. Retain the resulting invoice, Razorpay dashboard, webhook, database and reconciliation evidence.
6. Only then repeat merchant due diligence and approvals for the **live** production processor configuration and live secrets.

## Current hosted evidence

- Project: `jpwvgpnbkrktipwhvqss` (`Indus Orbit`, `ap-south-1`).
- Migration: `20260825121136_harden_razorpay_gst_and_refunds.sql` applied successfully.
- Edge Functions: `io-payments` v3 active with JWT verification; `io-payment-webhook` v2 active with Razorpay HMAC verification.
- Contract: 23/23 finance schema/grant assertions pass on the hosted database.
- Smoke: unauthenticated payments request returns `401`; unsigned webhook currently returns `503` because no environment-specific Razorpay webhook secret is configured.
- Activation counts at migration time: zero invoices, payment intents, provider events, refunds, approved tax policies, approved FX rates and approved payment processors.
- Advisor: new finance indexes exist; unused-index notices are expected with zero finance traffic. RPC-only finance tables intentionally use RLS with no browser policy and revoked direct browser mutation grants.

## Still outside code

- Razorpay merchant/test/live credentials and webhook configuration;
- an isolated staging Supabase deployment plus staging-only test-payment adapter and retained sandbox evidence;
- accountant-approved GST registration/classification/place-of-supply and invoice sample;
- treasury-approved FX source/cadence/tolerance;
- refund authority/SLA, privacy/retention and accounting treatment;
- approved test and live processor records with two-person review;
- sandbox and then controlled-live operational evidence;
- Netlify deployment of the member commit and publication of the separate admin app.

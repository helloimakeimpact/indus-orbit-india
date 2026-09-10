# I/O execution adapter

Status: **Verified in 15 isolated unit contracts; not connected to live traffic.**

This private Node 22 boundary executes one route that the I/O control plane has
already selected and authorized. It deliberately does not select providers,
retry or fall back, calculate or settle bills, persist requests, or log content.

Before an upstream call, the adapter verifies a short-lived HMAC route grant.
The grant binds the request and workspace identifiers, policy version, exact
HTTPS endpoint, provider, model, sorted capability set, request content type and
SHA-256 body digest, maximum authorized cost, issue time and expiry. The adapter
then:

- requires the endpoint hostname to exactly match an operator allow-list;
- rejects HTTP, literal IP addresses, non-default ports, URL credentials,
  fragments and query strings;
- resolves credentials through an injected server-only resolver after all grant
  and endpoint checks pass;
- disables redirects and bounds request bytes, response bytes, time and
  concurrent calls;
- returns static, typed and redacted errors without upstream bodies, secrets,
  URLs or arbitrary exception text.

The caller must also present a separately signed, short-lived workload
assertion bound to the exact route-grant digest, request and workspace. An
atomic one-use replay-store interface consumes the grant before credentials or
network access. The bundled bounded in-memory implementation exists for tests
and single-process development only; production must provide a shared durable
implementation.

`executeStream` exposes provider bytes as they arrive while retaining the
response-byte, timeout, caller-cancellation and concurrency boundaries. A
consumer cancelling or abandoning a stream aborts and closes its upstream
reader. `execute` remains the bounded buffered convenience method.

Ordinary provider 4xx responses remain non-retryable. A 429 rate limit and 5xx
availability failures are classified as retryable transport facts, but the
adapter never chooses a retry, delay, alternate provider or fallback itself.

The calling control plane remains responsible for assertion/grant issuance, a
production shared replay store, route selection, translation, provider policy,
cost reservation/settlement, receipts, retry/fallback and audit metadata. The
runtime remains responsible for DNS/IP egress enforcement beyond the exact-host
application allow-list. In particular, `retryable` describes transport
classification only; the adapter never gives a fallback instruction.

Run the isolated checks from the repository root:

```sh
npm --prefix packages/io-execution-adapter run build
npm --prefix packages/io-execution-adapter run test
```

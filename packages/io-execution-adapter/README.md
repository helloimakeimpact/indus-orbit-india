# I/O execution adapter

Status: **Verified in isolated unit contracts; not connected to live traffic.**

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

Ordinary provider 4xx responses remain non-retryable. A 429 rate limit and 5xx
availability failures are classified as retryable transport facts, but the
adapter never chooses a retry, delay, alternate provider or fallback itself.

The calling control plane remains responsible for service authentication,
grant issuance, replay prevention, route selection, translation, provider
policy, cost reservation/settlement, receipts, retry/fallback and audit
metadata. In particular, `retryable` describes transport classification only;
the adapter never gives a fallback instruction.

Run the isolated checks from the repository root:

```sh
npm --prefix packages/io-execution-adapter run build
npm --prefix packages/io-execution-adapter run test
```

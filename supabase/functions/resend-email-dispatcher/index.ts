// Retired compatibility endpoint.
//
// The previous implementation accepted browser-supplied recipients, subjects
// and HTML. Product email now enters the private, fixed-template outbox through
// trusted database events. Keep this slug as a fail-closed tombstone so stale
// clients cannot reach the former delivery contract.

Deno.serve(() =>
  Response.json(
    {
      ok: false,
      error: "This email endpoint is retired. Upgrade to a trusted product-event workflow.",
    },
    {
      status: 410,
      headers: { "Cache-Control": "no-store" },
    },
  ),
);

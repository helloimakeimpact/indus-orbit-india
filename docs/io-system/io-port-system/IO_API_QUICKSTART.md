# I/O API quickstart

Status: code-complete server/CLI/local-agent examples for the bounded OpenAI-compatible API, updated 26 August 2026.

## Boundary

The I/O API is for servers, CLIs and local agents. Persistent I/O keys must never be embedded in browser JavaScript, mobile application bundles, public repositories or client-side storage. The signed-in I/O web workspace uses its Supabase session and a separate gateway boundary.

Current base URL:

```text
https://jpwvgpnbkrktipwhvqss.supabase.co/functions/v1/io-openai/v1
```

Use `https://api.indusorbit.com/v1` only after that hostname is provisioned and verified in front of the same service.

The default route is `io/latest-affordable`. It selects only reviewed, entitled, policy-compatible and healthy routes. An empty `/models` list is correct until an authorized provider route passes conformance and is activated.

## Secret handling

Store the one-time key in a server secret manager or protected local environment variable:

```sh
export IO_API_KEY="io_test_..."
```

Do not add this value to a committable `.env` file. Rotate or revoke it from the signed-in I/O workspace. Beta keys expire after 30 days by default and enforce immutable minute/day/month request and day/month spend ceilings.

## curl

```sh
curl "https://jpwvgpnbkrktipwhvqss.supabase.co/functions/v1/io-openai/v1/chat/completions" \
  -H "Authorization: Bearer $IO_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{
    "model": "io/latest-affordable",
    "messages": [{"role": "user", "content": "Hello from I/O"}],
    "stream": true
  }'
```

Use a new idempotency key for a new billable intent. Reuse the same key only when safely retrying the same canonical request.

## OpenAI JavaScript SDK

```ts
import OpenAI from "openai";

const io = new OpenAI({
  apiKey: process.env.IO_API_KEY,
  baseURL: "https://jpwvgpnbkrktipwhvqss.supabase.co/functions/v1/io-openai/v1",
});

const response = await io.responses.create({
  model: "io/latest-affordable",
  input: "Hello from I/O",
  store: false,
});

console.log(response.output_text);
```

## OpenAI Python SDK

```python
import os
from openai import OpenAI

io = OpenAI(
    api_key=os.environ["IO_API_KEY"],
    base_url="https://jpwvgpnbkrktipwhvqss.supabase.co/functions/v1/io-openai/v1",
)

response = io.responses.create(
    model="io/latest-affordable",
    input="Hello from I/O",
    store=False,
)

print(response.output_text)
```

## OpenCode

Keep the I/O key in the local shell or its secret manager. Add a custom OpenAI-compatible provider using:

```text
Base URL: https://jpwvgpnbkrktipwhvqss.supabase.co/functions/v1/io-openai/v1
Model: io/latest-affordable
API key: IO_API_KEY
```

The OpenCode server password and I/O API key are separate credentials. The password protects the device-local OpenCode connection. The I/O key authorizes a governed provider route. Neither belongs in browser JavaScript.

## Compatibility and evidence

- `GET /models` lists workspace-entitled routes.
- `POST /chat/completions` supports JSON and SSE, bounded function tools/tool results, strict structured output and credential-free HTTPS image input when the selected route has matching conformance evidence.
- `POST /responses` supports the stateless `store:false` subset.
- Every accepted request retains route, usage, fee, capacity and policy evidence without storing prompts or model responses in I/O receipts.
- Unsupported fields fail closed rather than being silently ignored.

Production activation still requires a commercially authorized provider route, exact capability conformance, abuse/support ownership and retained load/compatibility evidence.

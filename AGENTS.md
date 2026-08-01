# Repository guidance

## Living Indus Orbit system record

`docs/io-system/` is the canonical living record for what Indus Orbit is and what its code actually does.

When a change affects a product capability, I/O routing, provider or model data, price evidence, capacity, database contract, deployment, conversation behavior, terminal/OpenCode behavior, security boundary, or release readiness, update the matching document under `docs/io-system/` in the same change.

Use only these implementation states:

- `Released`: deployed to the intended environment and verified there.
- `Verified`: implemented and passing the stated local or integration evidence, but not necessarily released.
- `Partial`: useful code exists, but the documented completion boundary has not been met.
- `Planned`: design exists but no working implementation evidence exists.
- `Blocked`: a named dependency or decision prevents progress.

Do not infer `Released` from a source file, migration file, UI preview, secret, provider record, or plan. Record local, demo, staging, production, and external-provider states separately. Provider/model/pricing facts require an official source, observation date, effective date, and reviewer before activation.

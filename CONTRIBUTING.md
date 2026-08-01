# Contributing to Indus Orbit

## Change rules

- Keep changes small, typed, and reviewed.
- Do not commit `.env`, provider keys, service-role keys, user data, prompts, or production exports.
- Use `.env.example` for variable names and safe placeholders only.
- Use a fresh, forward-only Supabase migration for every approved schema change. Do not rewrite deployed migration history.
- Browser code must not use service-role credentials or bypass RLS.
- Multi-table mutations require a trusted atomic contract and an idempotency strategy.
- Update tests, operator documentation, and release evidence in the same change as a material behaviour or data-contract change.
- Preserve the distinction between demo, preview, stale, unavailable, and live data in the UI and copy.

## Before requesting review

Run the checks applicable to your change:

```bash
npm run typecheck
npm run build
npm run audit:high
npm run audit:production
npm run test:unit
npm run lint
npm run format:check
```

Until the inherited lint/format baseline is fully remediated, do not add new findings in files you modify. Record any pre-existing exceptions in the pull request with a follow-up issue.

## Supabase changes

1. Read the relevant official Supabase documentation and current changelog.
2. Inspect current grants, RLS, functions, and advisor findings before changing a contract.
3. Test both allowed and denied roles, including horizontal access attempts.
4. Generate a new migration using the Supabase CLI; keep it forward-only.
5. Run advisors and update the schema/release documentation with verification evidence.

The migration-history recovery rules are in [docs/SUPABASE_SCHEMA_RECONCILIATION.md](docs/SUPABASE_SCHEMA_RECONCILIATION.md).

# Indus Orbit

Indus Orbit is **The General Intelligence Company of India**. **Intelligence, built together.** Its product connects people, public knowledge, learning, collaboration and action with governed AI access through I/O Port. The whole product remains Partial for full public production; local verification and released capabilities are recorded separately.

The living whole-product record is in [docs/io-system/README.md](docs/io-system/README.md). The complete delivery order and release gates are in [docs/MASTER_IMPLEMENTATION_AND_RELEASE_PLAN.md](docs/MASTER_IMPLEMENTATION_AND_RELEASE_PLAN.md), and the current I/O Port truth is in [docs/io-system/io-port-system/IO_PORT_IMPLEMENTATION_STATUS.md](docs/io-system/io-port-system/IO_PORT_IMPLEMENTATION_STATUS.md).

## Local development

Requirements: Node.js 22.12 or newer and npm.

```bash
npm ci
cp .env.example .env
npm run dev
```

Use the existing demo Supabase project only with browser-safe values in `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Keep `SUPABASE_SERVICE_ROLE_KEY`, provider keys, and production-only credentials outside Git and outside `VITE_` variables.

## Quality commands

```bash
npm run typecheck
npm run build
npm run verify
npm run audit:high
npm run audit:production
npm run test:unit
npm run lint
npm run format:check
npm run test:e2e
npm run test:e2e:member-ui
```

Formatting, lint, typecheck, unit/browser tests, dependency audit, production build and bundle budgets are required in the Quality workflow. Database quality separately replays migrations, runs pgTAP and lints schemas. The synthetic member browser suite makes no live Supabase writes; real authenticated evidence uses short-lived state outside Git as described in [tests/e2e/README.md](tests/e2e/README.md).

Compare a fresh public-schema type generation with the checked-in browser contract using `npm run check:supabase-types -- --generated /absolute/path/to/generated.types.ts`. The check rejects schema differences; it excludes only generator helpers/metadata and formatting. Generate from the intended environment. Fresh local replay is checked with `--replay-boundary`, which permits only 97 exact held-Spaces differences pinned to that migration. The current release contract is 10 leaf contracts ahead of hosted for three pending forward migrations; the strict hosted gate must pass after their reviewed delivery. A protected manual Hosted schema contract workflow is defined for staging/production. See [the schema record](docs/SUPABASE_SCHEMA_RECONCILIATION.md).

The current full-public launch sequence, owner actions and design specification are in [the finalization plan](docs/io-system/FINALIZATION_EXECUTION_PLAN.md), [owner actions](docs/io-system/PRODUCTION_OWNER_ACTIONS.md) and [design philosophy](docs/io-system/DESIGN_PHILOSOPHY_AND_UI_PLAN.md).

## Environments

- Local: synthetic/demo-safe data and no production-only credentials.
- Preview: pull-request web build with no public indexing.
- Staging: production-like schema and approved test-provider accounts.
- Production: protected deployment, least-privileged secrets, monitoring, backups, and named rollback ownership.

See [docs/README.md](docs/README.md) for the documentation hierarchy and [CONTRIBUTING.md](CONTRIBUTING.md) for change rules.

# Indus Orbit

Indus Orbit is a people-centred Indian community and learning network with public knowledge, member collaboration, action programmes, and the future I/O Port for governed AI access.

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
```

`lint` and `format:check` intentionally report inherited repository-wide cleanup debt at the start of the implementation programme. The first active CI gate is typecheck plus build; lint and format become required after their baseline remediation is complete.

## Environments

- Local: synthetic/demo-safe data and no production-only credentials.
- Preview: pull-request web build with no public indexing.
- Staging: production-like schema and approved test-provider accounts.
- Production: protected deployment, least-privileged secrets, monitoring, backups, and named rollback ownership.

See [docs/README.md](docs/README.md) for the documentation hierarchy and [CONTRIBUTING.md](CONTRIBUTING.md) for change rules.

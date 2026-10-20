# Lightweight chat audit, plan and merge repair — 20 October 2026

## Scope and state

- Owner-approved first release: private messages plus event/community groups; current security model retained, E2EE planned separately.
- Three read-only reviews covered architecture/security, interface/performance and whole-product release/privacy fit. Their findings are consolidated in [the canonical plan](../../io-system/conversation-system/LIGHTWEIGHT_CHAT_FINALIZATION_PLAN.md).
- Existing chat is **Partial** for the expanded request. This increment implements two narrow message-state repairs and the execution plan; it does not implement the remaining shared store, inbox, group/event extension or redesigned interface.
- Starting member commit: `c3ed55f9449c3a010d2289bf095e13884e0d6464`. Its [GitHub Quality run](https://github.com/helloimakeimpact/indus-orbit-india/actions/runs/39453274101) completed successfully. This is the preceding source checkpoint, not CI evidence for the new repair.

## Reproduced defects and repairs

1. `mergeConversationMessages([], [queuedMessage])` returned no rows because an absent existing message was treated like an already durable one. Require an existing durable row before rejecting an incoming optimistic projection. Test empty history, an existing earlier row and queued-to-failed progression, while retaining the existing durable/optimistic reconciliation test.
2. An older history response with `read_at: null` could overwrite a previously received read receipt. Preserve established non-null read evidence during reconciliation. Test both arrival orders.

Both new tests failed on the preceding implementation (10 passed, 2 failed), then all **12 focused tests passed** after repair. These cases verify the pure reconciliation boundary; they do not establish genuine server read visibility, account-transition safety or cross-device delivery.

## Completed source gates

`npm run verify` exited **0** on 20 October:

- Repository formatting check.
- Repository ESLint quiet gate.
- TypeScript no-emit check.
- **238/238 member unit tests** (236 existing plus two new regressions).
- Transport-core, execution-adapter and OpenCode-client builds.
- Production Vite build.
- Existing per-asset bundle limits; largest reported JS asset 377.12 KiB / 500 KiB and CSS 219.07 KiB / 250 KiB.

`git diff --check` passed. The two repair files and changed canonical docs were formatted. The full local command log is `/private/tmp/indus-chat-finalization-20261020-verify.log`; that temporary path is not a durable release artifact.

No dependency, database migration, generated schema, Edge Function or separate-admin implementation changed in this increment. The prior 35 admin units, 49 browser journeys and 38 SQL files / 1,237 assertions remain dated baseline evidence; they were not rerun for this pure member-state repair. New integration/browser/SQL contracts are required as the larger plan is implemented.

## Release boundary

- No Supabase migration/function apply, hosted data mutation, real email, scanner invocation, paid model request or deletion is part of this increment.
- Source publication may trigger the existing Netlify integration; a push alone does not establish its deployed commit or acceptance.
- The structured-Spaces hold and 97 hash-bound generated-type differences remain intact.
- The current twelve reviewed forward migrations/seven new functions are the pre-chat hosted package. Future chat schema changes require a new exact reviewed manifest.
- C1–C5 source work and C6 genuine staging/production acceptance remain. The owner actions and existing production status are linked from the canonical plan.

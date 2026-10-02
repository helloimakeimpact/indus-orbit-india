# Indus Orbit — final local evidence and source publication, 2 October 2026

State: **Verified locally; full public production Partial and not approved.** This is the final local verification checkpoint. The owner subsequently explicitly authorized commit/push of all completed source work. Source publication does not apply hosted migrations or activate provider/payment operations. Final GitHub commit IDs and Actions records are checked after publication and are reported with the delivery; no deployment or hosted equivalence is inferred here.

## Source and remote boundary

| Repository/environment       | Checkpoint                                                                                                                                                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Member local/GitHub baseline | `6607d4039d766dc077153dd933802da02d28dba7`, independently rechecked read-only on 2 October                                                                                                                         |
| Admin local baseline         | `4a314f2a286e40158580256ff5d80b6fae370454`                                                                                                                                                                         |
| Admin GitHub baseline        | `211d5fe48357a65b5604e1b2d2637a065da94f57`, independently rechecked through the authenticated GitHub connection                                                                                                    |
| Admin baseline source parity | Both commit trees are exactly `2e925eff0467812b625db29a893de305a0919da8`; their histories differ. New session/MFA/dependency changes belong to this increment. Preserve the remote history without a force update. |
| GitHub branch protection     | Both `main` branch responses currently report `protected: false`. Required checks/reviewers remain owner setup.                                                                                                    |
| Hosted Supabase              | `jpwvgpnbkrktipwhvqss`, healthy, `ap-south-1`, PG17.6.1.104, 116 migration records through `20260907090226`                                                                                                        |

The released public-site baseline already restored the original dawn/pixel-art landing and removed the neon campaign. The new approved line **Intelligence, built together.**, continuity/accessibility changes and trusted data boundaries are the newly verified source. Whole-product launch is still open.

## Passing verification

| Gate                                          | Result                                              | Retained evidence                                                                                                                    |
| --------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Member `npm run verify`                       | Pass; 166/166 contracts                             | `repository-verification.txt`; formatting, repository lint, typecheck, all three package builds, production build and bundle budgets |
| Member production-bundle Playwright           | 19/19                                               | `production-browser.txt`; 10 public desktop/mobile, 2 reviewed card visuals, 7 controlled member/I/O scenarios                       |
| Admin `npm run verify`                        | Pass; 32/32 contracts                               | `admin-verification.txt`; format/typecheck, zero-warning lint, build and budgets                                                     |
| Admin controlled production-bundle Playwright | 8/8                                                 | `admin-browser.txt`; 4 public/accessibility and 4 synthetic session/MFA scenarios                                                    |
| Database contracts                            | Pass; 28 files / 883 assertions                     | `database-contracts.txt`; isolated database with every source migration applied                                                      |
| Database public/private lint                  | Pass; zero error-level findings                     | `database-lint.txt`                                                                                                                  |
| Fresh public replay type comparison           | Pass; exactly 97 hash-bound held-Spaces differences | `public-type-contract.txt`; 7 focused comparator contracts are included in the 166 member contracts                                  |
| Strict hosted type comparison                 | Expected nonzero; 10 pending release contracts      | `public-type-contract.txt`; no hosted drift allowance, declarations are not blindly overwritten                                      |
| Dependency audits                             | Zero findings in both repositories                  | `member-dependency-audit.txt`, `admin-dependency-audit.txt`                                                                          |
| Release-helper syntax                         | Pass                                                | `bash -n scripts/supabase/prepare-alias-safe-io-release.sh`                                                                          |

The database initially replayed 120 migrations from empty, then applied the education-file forward change. All 121 source files are applied in that isolated database; 883 assertions and the final generated-type/lint checks pass. A production-like snapshot upgrade is a distinct, still-open gate. The local/demo content seed and held broad structured-Spaces change are not automatically approved for production.

## Code boundaries repaired

- Member Auth keeps same-account identity stable while session/access refreshes. Account switches/sign-out clear the former user's work/projection; obsolete initial and A→B→A results cannot revive them. Community navigation preserves the shell and draft; temporary verification outages show retry while explicit denial closes access. Joined Orbit channels remain accurately labelled on focus.
- Community and I/O have skip links, named main regions, active navigation and named mobile drawers. I/O modal navigation/inspector trap focus, close with Escape, restore focus and do not leave hidden controls keyboard reachable. Light-surface contrast, reduced motion and 320px landing layout are repaired; dead social links are removed.
- Admin access/MFA results are versioned and account-bound. Same-account checks preserve continuity; failed privileged verification closes access with retry. Both AAL2 and a verified TOTP factor are required. Focus/online/visibility revalidate. The obsolete-result and MFA-error loading hang is repaired.
- Trusted vouch issuance is atomic, caller-bound, quota-serialized and audited. Cryptographically generated raw codes are returned once, hashed before persistence and never listed again; normalized historical codes still redeem. Browser vouch/ledger writes are denied.
- Quiz grading is caller-bound and checks published lesson/course, question/option ownership, valid answer configuration and bounded attempts. Browser answer-key reads and score writes are denied; the managed answer projection requires eligible authorship. Removed/inactive leads and suspended authors cannot retain author access.
- Proposal identity matches the hosted profile identity contract. Legacy physical membership-removal functions become denied invoker tombstones. Private education-file reads require published references or eligible authorship; writes use canonical author-owned paths. Upload size/destination and download disposition are bounded. This does not certify scanning.
- The schema comparator rejects malformed, missing, changed or extra public leaf contracts. The sole replay allowance is an exact 97-path/value boundary pinned to the held Spaces migration hash. Local DB CI and protected manual staging/production hosted type generation are defined.
- Admin build tooling is patched from brace-expansion 5.0.9 to 5.0.12; the member's unused legacy override is also corrected. No unrelated dependency upgrade is included.

## Three local forward migrations awaiting hosted release

1. `20261002110000_reconcile_proposal_identity_and_retire_legacy_member_removal.sql`
2. `20261002120000_trust_vouch_issuance_and_education_grading.sql`
3. `20261002130000_scope_private_education_files.sql`

The hosted browser contract is 10 leaves behind the new trusted vouch/quiz contract. Publish source and deliver database changes as separately reviewed operations. Until the required RPCs exist, the client provides temporary-unavailable feedback and does not fall back to browser-trusted issuance/grading. Preflight existing-code uniqueness, proposal identities and files; stage the upgrade and retain rollback/restore evidence. An older client cannot resume revoked direct writes after database delivery; do not widen grants as a rollback shortcut.

Read-only hosted Storage metadata confirms **two private buckets**: education currently has no ceiling and broadly readable signed-in files; orbit-attachments has 10 MiB and its existing allowlist. Local education hardening is unapplied. Live Storage API upload, signed download, quarantine and scanner evidence remain required.

The alias-safe hosted dry-run is incomplete: direct transport was IPv6-limited and the IPv4 ledger fetch stalled/cancelled before a plan. No migration was applied, no ledger repaired and no hosted data/role changed during this pass. The temporary database/preview processes used for verification are isolated from existing project stacks.

## Limits and remaining launch work

Synthetic browser sessions are deliberately invalid, scoped to localhost, intercept Supabase HTTP/Realtime and reject writes. They prove UI/auth-event behavior, not genuine hosted Auth, RLS, TOTP, token expiry, mobile sleep/wake or cross-member Realtime isolation. Axe checks cover serious/critical findings on tested views, not full manual WCAG acceptance. Storage tests use transactional object metadata, not real file scanning. Empty replay does not prove an existing production snapshot upgrade.

Hosted has five staged provider/model/private connections and zero enabled routes, conformance runs, receipts or attempts. Payment/finance activation, separate admin hosting/operators, approved privacy export/purge workers, scanner/email operations, real daemon/installers, field performance/load, restore/kill-switch/incident drills and named legal/security/finance release sign-off remain open. The broader premium UI system has a finalized specification but incomplete rollout.

Owner dashboard instructions and a reply worksheet: `../../io-system/PRODUCTION_OWNER_ACTIONS.md`. Full work packages and exit criteria: `../../io-system/FINALIZATION_EXECUTION_PLAN.md`. Brand/design specification: `../../io-system/DESIGN_PHILOSOPHY_AND_UI_PLAN.md`. Final code inventory: `../../io-system/CODE_COMPLETION_REGISTER.md`.

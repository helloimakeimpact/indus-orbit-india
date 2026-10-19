# Account privacy execution policy

Status: **Verified** for the stated local contracts; hosted execution **Partial**. Policy version: `2026-10-15.1`.

On 15 October 2026 the owner answered **“use best practice”**, delegating the previously pending retention choices. This supersedes the earlier request to await owner-supplied rules. The periods below are product defaults selected under that delegation; they are not universal legal deadlines. Hosted activation remains a separate release operation.

## Defaults

| Data                                               | Product rule                                                                                                                 | Safeguard                                                                                                                                          |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Guest contact and attendance identity              | Remove direct identity 90 days after the event; retain attendance counts/status                                              | Applicable processing-record floors and event/subject holds win                                                                                    |
| Transactional email payload/address                | Clear terminal payloads 30 days after delivery or termination                                                                | Keep minimal delivery/security evidence for 365 days; never clear an active delivery lease                                                         |
| Active profile and authored content                | Keep while the account/purpose remains active; reviewed account deletion has a seven-day cancellation window                 | No automatic inactive-account purge in this release                                                                                                |
| Account export                                     | Versioned UTF-8 JSON with explicit coverage and file metadata; private artifact expires after seven days                     | Caller-bound five-minute download links; no passwords, API tokens, other guests, supplier credentials or internal case evidence                    |
| Account deletion                                   | Freeze access before data/file cleanup; revoke Auth access and scrub the account after reviewed, version-bound authorization | Ownership transfer, safety/legal holds and retained financial evidence are checked before irreversible work                                        |
| Orphaned uploaded objects                          | Trusted API cleanup after at least 30 days without a live reference                                                          | Exact object identity/version, reference recheck, holds and retry evidence; no production SQL metadata deletion                                    |
| Security/moderation and privacy execution evidence | 365 days after resolution/completion unless a documented case needs longer                                                   | Restricted operations access, no raw content in routine job logs; holds need reason, owner and review date                                         |
| Accounting/payment records                         | Preserve required accounting evidence for eight completed Indian financial years after the relevant financial-year end       | Applies to required books/vouchers, not all personal data; investigations/other duties may extend it. No automatic finance purge in this increment |
| Backups                                            | Use the configured backup rotation, with a target of 30 days for ordinary recoverable copies                                 | Actual entitlement/rotation must be verified. Reapply deletion records before restored data serves users; do not claim immediate backup erasure    |

The operating target is a privacy response within 30 days. Large exports, disputes, ownership transfer and exceptions go to a named operator; a worker must report a blocker rather than silently truncate data or mark an incomplete deletion complete. A cancelled request invalidates the worker lease and new export authorization. A previously signed Storage link may remain valid for its remaining lifetime of at most five minutes; do not promise instant revocation. After irreversible deletion starts it cannot be cancelled.

## Legal floors and dated evidence

Data minimisation and purpose-specific retention follow the [EDPB principles](https://www.edpb.europa.eu/topics/key-gdpr-concepts/basic-principles_en), reviewed 15 October 2026. The selected 90/30/7-day product periods are engineering policy choices under the owner's delegation.

The final [MeitY DPDP Rules notification](https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf), dated 13 November 2025, provides staged commencement. Rules 6 and 8 are in the group commencing eighteen months after publication. Rule 8(3) contains a one-year processing-data/log minimum for its scheduled purposes; Rule 6 also addresses security-log retention. These are recorded as a launch-date/jurisdiction review requirement and an enforceable minimum-retention override, not replaced by a blanket 90-day promise. This policy does not claim that every provision was already in force on 15 October 2026.

[Companies Act section 128](https://www.incometaxindia.gov.in/w/section-128-81), reviewed 15 October 2026, requires covered companies' books and relevant vouchers for at least eight financial years and permits longer investigation retention. Entity-specific applicability, other tax duties and the production processing profile must be checked at delivery. Financial retention does not justify retaining unrelated guest or conversation content.

## Release boundary

Service execution is disabled unless an operator explicitly configures the privacy execution environment after staging verification. Source work does not delete real data, send privacy mail or change hosted Auth/Storage settings. The production release must prove cancellation/lease races, legal holds, cross-account denial, expired links, failed physical deletion, Auth failure and backup-restore replay.

## Implemented coverage and assisted work

The JSON snapshot contains 34 explicitly projected datasets, capped at 10,000 records per dataset and a five MiB artifact (the SQL snapshot has a conservative five-million-byte bound). New columns are not automatically exported. Binary files, financial/security/case supplements and oversized requests require identity-verified assisted delivery. This is a portable account export, not a claim to fulfil every access request automatically.

Deletion removes ordinary authored records and direct identity, closes browser access, removes owned file bytes through Storage, then confirms managed Auth soft deletion. Shared replies, required financial/governance evidence and a pseudonymous UUID shell remain. This is not irreversible anonymization of every linked record. Ownership transfer, open safety work and published learning content require operator review. No browser can mark delivery or deletion complete.

The 365-day security/evidence rule and backup target are operating policy, not a newly implemented universal log purge or guaranteed backup entitlement. The financial purge is deliberately absent. An operator must review due evidence/holds and document any justified extension. Before **13 May 2027**, implement and verify the applicable regulated retention/archive profile: source fails closed on automated account closure from that date rather than bypassing the future floor. Reassess applicability with the launch entity and jurisdictions.

See [execution and delivery runbook](PRIVACY_EXECUTION_RUNBOOK.md) and [18 October status](PRODUCTION_STATUS_2026-10-18.md).

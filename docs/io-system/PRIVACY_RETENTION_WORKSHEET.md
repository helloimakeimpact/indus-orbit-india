# Privacy and retention rules to supply

Status: **Blocked** for production privacy execution: owner policy is required. On 7 October 2026 the owner chose “I’ll provide different retention rules” instead of approving the proposed 90-day event guest rule. No 90-day rule is approved or applied.

Provide duration, starting point, deletion/anonymization action, export inclusion and safety/legal-hold treatment for each row. Engineering can then implement the exact rules and verify them with synthetic fixtures before any hosted execution.

| Data family                                                          | Duration and starting point | End action     | Export inclusion | Holds/exceptions |
| -------------------------------------------------------------------- | --------------------------- | -------------- | ---------------- | ---------------- |
| Guest name/email and registration status                             | Awaiting owner              | Awaiting owner | Awaiting owner   | Awaiting owner   |
| Attendance/check-in and event history                                | Awaiting owner              | Awaiting owner | Awaiting owner   | Awaiting owner   |
| Transactional email recipient/payload/delivery evidence              | Awaiting owner              | Awaiting owner | Awaiting owner   | Awaiting owner   |
| Account/profile/onboarding and location consent                      | Awaiting owner              | Awaiting owner | Awaiting owner   | Awaiting owner   |
| Conversations, uploaded objects and scanner verdicts                 | Awaiting owner              | Awaiting owner | Awaiting owner   | Awaiting owner   |
| I/O/terminal metadata, payment evidence and audit/moderation history | Awaiting owner              | Awaiting owner | Awaiting owner   | Awaiting owner   |

Also specify who approves holds/releases, export format, identity verification, request response target and deletion verification. Existing secure credential expiry is separate from personal-data retention. Guest marketing subscription remains opt-in; event registration does not subscribe a guest.

The current privacy request/review queue remains available. Export artifact creation and account/personal-data purge remain unfinished until this inventory and policy are approved. Production worker execution stays disabled; source development does not authorize deletion of real data.

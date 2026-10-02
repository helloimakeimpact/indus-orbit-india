# Community follow-up source delivery

Status: **Verified** source delivery and CI, 2 October 2026; whole-product production remains **Partial**.

| Repository        | Published source                                                                                                             | Evidence                                                                                                                                                                                                            |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Member/public     | `4ccd51613bf01931d6354dee6bd85468a9cfc01d`, followed by corrected contract/record `8b5adeef4bac352fb9b4a6effcdc3685c04ac89e` | [Final Quality](https://github.com/helloimakeimpact/indus-orbit-india/actions/runs/37049117004), [Final Database quality](https://github.com/helloimakeimpact/indus-orbit-india/actions/runs/37049116821): success. |
| Independent admin | `20b594081394ecbfec41e9a053aaf7ea3f243ce1`; no new admin source change in this increment                                     | Earlier [Admin quality](https://github.com/helloimakeimpact/admin-indus-orbit/actions/runs/37020079978): success. Local admin remains clean.                                                                        |

The first database run caught a bad new SELECT-grant assumption. The corrected test preserves the existing scoped policies without widening browser reads. Corrected replay: **122 migrations, 29 files/893 assertions**, the exact 97 held-Spaces type boundary and passing error-level schema lint. Local production browser: **25/25**; unit contracts: **178/178**. Full lint/types, build and bundle budgets pass.

A read-only live public homepage GET served `/assets/index-CYYVv5k3.js`, matching the tested local bundle. Original assets and approved core brand source are retained. This proves delivery of that artifact; live member/operator/event/hCaptcha acceptance is still required.

No hosted migration/function/provider/payment operation was executed. Contact/newsletter submissions remain unavailable until production keys and the coordinated hCaptcha function/migration rollout are complete; Contact retains the email alternative. Four reviewed forward migrations await delivery through the alias-safe release view. The native free event/community workstream is Planned, with existing event foundations Partial and publication/RSVP authority fixes now explicit priority work.

The final documentation commit records this evidence and the read-only hosted findings; its hash is available from Git history. It changes no product or migration source.

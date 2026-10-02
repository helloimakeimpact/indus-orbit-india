# Indus Orbit design philosophy and UI execution plan

Status: **Planned** product-wide design specification, finalized 2 October 2026 at the owner’s request. Initial continuity/accessibility/mobile repairs are implemented locally; the broader visual system remains to be applied and verified. This specification does not approve a production release. The canonical company definition is **“The General Intelligence Company of India”** and the approved short line is **“Intelligence, built together.”** The existing dawn, lotus, banyan, pixel mark, indigo, parchment and saffron are the identity assets to develop. The retired “Made of Many Minds.” line and the reverted neon/flat-poster campaign are not part of this direction.

## Design thesis: an orbit of agency

Indus Orbit should feel like a calm place where people and intelligence can make progress together. The interface gives each person a clear centre of gravity: what they can do now, who or what can help, what evidence supports a recommendation, and how to reverse or challenge a decision. The product should feel ambitious and distinctly Indian without using ornament as a substitute for utility.

The premium benchmark is **discipline of craft**: purposeful hierarchy, precise typography, responsive behavior and coherent interaction. Apple's current [Human Interface Guidelines design principles](https://developer.apple.com/design/human-interface-guidelines/design-principles) articulate purpose, agency, responsibility, familiarity, flexibility, simplicity, craft and delight. We use that quality bar while building a visual and behavioral language rooted in Indus Orbit's own mission. Indus Orbit’s mark, dawn art, color, voice and work/evidence patterns provide its own visual identity.

### Six principles

1. **People first.** Profiles, missions, learning and support explain the benefit to a person before the platform's architecture. Show real work and credible outcomes, with permission and attribution.
2. **Evidence is beautiful.** Model origin, serving region, currency, price version, capacity source, consent, uncertainty and timestamps should be legible and well composed. A trustworthy receipt can be more premium than a decorative animation.
3. **Calm intensity.** Use generous space, a precise type scale and one clear primary action per view. Indigo gives focus; parchment gives room to think; saffron signals a decision or meaningful opportunity. Avoid placing every card, badge and CTA at equal visual volume.
4. **India in the details.** Dawn, river/orbit geometry, lotus and banyan may form a restrained illustration grammar. Avoid generic sci-fi neon, stock-tech gradients and clichéd cultural motifs. Pixel art can be a memorable signature in the mark and selected editorial moments; operational UI should stay crisp and readable.
5. **Continuity is respect.** Returning to a tab, changing product areas, recovering connectivity or refreshing should preserve place and work. Do not clear a member's workspace for a routine token refresh. Status changes are quiet, accurate and reversible where possible.
6. **Inclusive by construction.** Readability, keyboard paths, screen-reader names, reduced motion, 320 CSS-pixel layouts, text scaling and low-bandwidth behavior are part of the design system. Motion should explain a state change and honor reduced-motion preference. Apple's [motion](https://developer.apple.com/design/human-interface-guidelines/motion) and [accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) guidance are reference quality bars, alongside WCAG 2.2 AA for this web product.

## Finalized identity and product expression

| Layer               | Specification                                                                                                                             |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Name                | Indus Orbit                                                                                                                               |
| Company definition  | The General Intelligence Company of India                                                                                                 |
| Approved short line | Intelligence, built together.                                                                                                             |
| Product purpose     | Help people find trusted people, knowledge, opportunities and governed intelligence, then turn them into useful work.                     |
| Character           | Human, lucid, rooted and exact. Editorial warmth invites people in; precise interaction helps them act.                                   |
| Signature           | Original pixel mark and selected dawn/lotus/banyan art; indigo structure, parchment space, saffron emphasis and restrained monsoon green. |
| Typography          | Fraunces for selected editorial moments; Inter for actions, forms and working information.                                                |
| Interaction promise | Preserve place and work, explain authority and cost, give clear recovery, and keep consequential actions inspectable.                     |
| Measure of quality  | A person understands the next action, can trust its evidence and can recover without losing work.                                         |

Public pages tell a clear human story. Community surfaces foreground people and shared work. I/O surfaces foreground capability, authority, policy and exact receipts. Admin surfaces foreground operational clarity and least-privilege decisions. The same tokens and patterns should carry these different densities.

No new logo or image generation is required for this specification. Asset rights, real-world claims and final release copy still need the evidence review listed in `PRODUCTION_OWNER_ACTIONS.md`.

## Visual grammar to standardize

| Element  | Direction                                                                                                                                                                                                          | Rule to validate                                                                                                                    |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Type     | Keep Fraunces as a selective editorial voice and Inter as the working voice. Define display, heading, body, caption and data scales with fluid but bounded sizes.                                                  | At one glance a person can distinguish the page purpose, next action and supporting evidence. Text remains readable at 200% zoom.   |
| Color    | Indigo for structure and trust; parchment for quiet surfaces; saffron for a small number of purposeful highlights; monsoon green for ecological/community context. Add semantic success/warning/error/info tokens. | Every text/control combination meets the chosen WCAG contrast target in default, hover, disabled and over-image states.             |
| Space    | Use a consistent spacing scale and restrained content widths. Let editorial pages breathe; keep dense workspace data compact but scan-friendly.                                                                    | No 320px overflow, clipped controls, or collision with fixed notices, navigation and safe areas.                                    |
| Surfaces | Use solid, legible surfaces by default. Reserve blur/glass for navigation or one focal overlay where it improves hierarchy. Keep border, radius and shadow tokens few and repeatable.                              | Blur never carries essential contrast and the product remains clear when backdrop filtering is unavailable.                         |
| Image    | Curate the restored locally authored/pixel-art asset family. Give each image a narrative job and correct crop; use people/work evidence where consented.                                                           | No unrelated stock imagery, neon campaign reintroduction, oversized decorative downloads or inaccessible text baked into images.    |
| Motion   | Short, purposeful transition for navigation, disclosure and confirmed change. Avoid perpetual orbiting in task surfaces.                                                                                           | No flashing, surprise movement on tab return, blocked action during entrance animation, or motion when reduced motion is requested. |
| Voice    | Direct, precise, warm and modest. State what is live, what is preview, and what depends on a partner or policy.                                                                                                    | No unsupported claims about Indian model hosting, providers, production capacity, privacy or price.                                 |

## Current UI audit and prioritized work

The audit combines current source, local desktop/mobile landing previews and controlled member-browser continuity scenarios. The owner confirmed that the reported reload occurs in the signed-in Indus Orbit member workspace. Real-session, multi-persona and usability evidence remain required.

### P0 — continuity and obstruction fixes before visual expansion

- **Implemented locally, controlled browser verification:** `AuthContext` preserves the user/shell through same-account auth events, refreshes access without global loading and ignores obsolete access/initial-session responses. `/app` now verifies by account identity rather than resetting its gate for every pathname; internal navigation leaves the shared shell mounted. Focus/visibility/online triggers a background membership check. A temporary access-service failure preserves open work with a visible retry notice; an explicit membership denial or sign-out closes the boundary. The Orbit store preserves a still-joined channel’s online indication on tab return. All seven `test:e2e:member-ui` scenarios cover the repaired boundaries against the production bundle. The suite uses invalid synthetic sessions and intercepted HTTP/Realtime to check navigation, drafts, auth events, temporary outage, denial and sign-out. The synthetic suite also covers account changes, stale A→B→A results, initial access failure and I/O-only mobile navigation/inspector dialogs with focus/Escape/return behavior. Real token expiry, independent real accounts, actual Realtime, sleep/wake and supported mobile devices remain launch evidence. This repair does not make unsent story drafts durable across a full browser reload.
- **Local landing fix:** the mobile hero now participates in document flow so a small phone does not make the title and card overlap. The CTA is clear of the cookie banner in the tested initial phone viewports. Recheck all public routes at 320/375/390/412px, portrait and landscape, 200% text zoom, with and without the notice.
- **Remaining:** redesign cookie consent as clear, truthful, accessible copy and controls after the actual cookie/data inventory is approved. It currently uses a small floating pill and can cover content on short viewports. Audit persistent bars, dialogs, toasts and mobile keyboard overlays product-wide.
- **Implemented locally:** dead footer/contact social anchors were removed; the footer now has a real Contact route and the existing company email is a working mail link. Verified social destinations still need owner input. Community and I/O now provide keyboard skip links and named main regions. Community navigation provides active-page semantics and a named mobile drawer; I/O uses named focus-trapped navigation/inspector dialogs and labels its compact Community switch. Admin session/MFA failures now show a recoverable access state rather than indefinite loading. **Remaining:** audit the rest of the public links and make form/subscription feedback explain the next step. Define an unobtrusive loading/saved/offline language instead of replacing whole views for background refreshes.

### P1 — public site narrative and hierarchy

1. Define the first-screen story: company definition, approved short line, one primary action and a concise proof cue. Keep the dawn art but reduce competition between the headline, large glass card and floating notice.
2. Simplify the eight-link desktop navigation into a reviewed top-level information architecture with a clear path for About, Work, People/Community and I/O. Keep direct routes and search/accessibility intact.
3. Recompose long stacked sections into a deliberate sequence: purpose → tangible work → people/places → evidence → invitation. Reduce repetitive three-card layouts and make sections visually distinct by meaning, not by arbitrary effects.
4. Review every public claim, route, CTA, metadata and image crop. Show case studies or measured proof only when verified; keep previews visibly labelled.
5. Design footer and consent as part of the same system, including newsletter purpose, error/success state, real social/contact destinations and small-phone form layout.

### P2 — shared design system

1. Publish tokens for typography, spacing, widths, color roles, elevation, radius, focus, motion and responsive behavior in code and a small visual reference. Consolidate variants across the public site, Community, I/O and admin where their permissions allow shared primitives.
2. Create documented patterns for page header, empty state, skeleton, warning, receipt, consent, confirmation, error recovery, offline state, form field, menu and data table. Each pattern includes keyboard and screen-reader behavior.
3. Prefer reusable layout primitives to one-off class chains. Capture visual baselines for 320px, common mobile, tablet and desktop widths, light/dark variants and reduced motion.
4. Keep product-specific character: editorial warmth on public pages, focused collaboration in Community, evidence-dense precision in I/O and restrained operational clarity in admin.

### P3 — member workspace and Community

1. Validate a single Orbit model: persistent rail, contextual navigation, main work surface and optional inspector. Keep People, Learning, Action, Messages and I/O easy to distinguish without fragmenting identity.
2. Make “resume work” reliable: preserve selected view, filters, drafts, scroll and pending sends when safe; communicate synchronization state without blanking the shell. Test back/forward, refresh, tab return, sleep/wake and reconnect.
3. Review navigation depth and default content by persona. New members should see one high-value next step, while active members should see their work and trusted attention first.
4. Give moderation, verification, permission and privacy states clear explanations and recovery paths. Keep engagement pressure, presence theater and decorative gamification out of the design.

### P4 — I/O Port and terminal

1. Treat a model choice as an evidence card: capability, provider, serving region, data policy, price version, availability and a plain-language reason. Clearly distinguish preview, no-dispatch preflight and a live call.
2. Before execution, show the chosen route, budget impact, consent and policy changes; after execution, show a concise receipt with exact cost and useful provenance. Error states must distinguish no eligible route, upstream failure, policy denial and offline state.
3. Keep Terminal actions inspectable: Observe, Plan, Build and Run require distinct visual affordances, permissions and confirmation. Preserve task context across reconnect without falsely implying a local daemon is connected.
4. Validate these flows with real provider and daemon evidence before presenting them as production capabilities.

### P5 — evaluation and launch gates

- Conduct moderated task sessions across student/builder, founder, mentor, I/O-only member and operator personas; include lower-bandwidth/mobile and assistive-technology use. Record task completion, confusion, recovery and perceived trust. Review design changes with the owner before broad implementation.
- Automate serious/critical WCAG A/AA checks on representative public and authenticated routes, then run manual keyboard, screen-reader, zoom, touch-target, contrast and reduced-motion checks. Add overlay/viewport regression checks for the actual bug classes found here.
- Measure field Core Web Vitals, route transition latency and return-to-tab continuity in staging and production. Set budgets and owners, then inspect real devices and browsers before launch.
- Keep an explicit visual/interaction acceptance record with before/after screenshots, copy and claim approval, persona results and rollback notes. A polished mockup or passing local build is not the production gate.

## Implementation order and decisions

The current local P0 fixes can be reviewed without changing production. The 320px homepage regression, ten public browser checks, two card visuals and seven member scenarios pass against the local production bundle. Evidence is retained in `../release-evidence/local-2026-10-02/verification.md`. Next, run the real-member continuity journey and the sleep/token-expiry/device matrix; redesign the mobile notice and broaden narrow-screen/zoom coverage; then implement the finalized principles through a reviewed first-page narrative, shared tokens/patterns and product surfaces. Product, Design/Content, Accessibility, Engineering and Privacy owners should sign the corresponding evidence in the release checklist. No commit, GitHub push or deployment is implied by this plan.

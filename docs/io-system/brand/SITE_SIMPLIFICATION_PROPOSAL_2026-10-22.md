# Indus Orbit site and product simplification proposal

Status: **Planned**. Source audit and asset inspection: **Verified** on 22 October 2026. This is a proposal for review and a bounded prototype; it does not establish a redesigned or deployed product. No product route, image, permission, registration rule or capability is changed by this document.

Source reference: member repository HEAD `cea18921b544e375e399dddde94365d41e4920f9`, plus the current working tree. Hosted appearance and Instagram observations belong to the parent review; this audit describes source, not the exact current Netlify deployment.

## 1. The decision in plain words

Redesign the full landing experience as a clear introduction to the General Intelligence Company of India through its **two main offerings: Messaging and Terminal**. Show how people connect and turn shared intention into useful work, with communities, events, learning, programmes, research and other capabilities as extensions. Give different people an understandable starting point before explaining the platform's taxonomy.

The latest owner hierarchy supersedes the earlier event-led and three-path drafts: **Messaging and Terminal are the core; everything else extends them.** The company overview must remain comprehensive, with every major extension discoverable in the next layer. “Meet”, “grow” and “build” can explain human actions; they are not three new platforms or product pillars.

Keep the name, the company definition **“The General Intelligence Company of India”**, and the approved line **“Intelligence, built together.”** Keep indigo, parchment and saffron, Fraunces and Inter, and the distinctive pixel illustration style. Express the established meaning of Connection, Synergy and Society through ordinary words: meet people, work together, contribute to the places we share.

The owner's latest clarification is decisive: **pixel art is the style; planets and extraterrestrial worlds are not the brand subject.** “Orbit” means relationships and shared purpose. The visual world should be Earth rooted: Indian places, people, learning, making, local light and a sense of possibility. A brighter, slightly dreamy direction comes from composition, lighting, space and warmth, with crisp readable controls.

The confirmed person-and-mirror image, `public/wiki-hero.jpg`, is the primary reference for a **portal of opportunity**. It can introduce the whole company and recur across people, learning, programmes and making. The metaphor concerns human agency and better possibilities on Earth. It does not imply that the product creates a digital twin, reads a person's mind or transports them to another world.

## 2. What currently makes the experience complex

These are source observations, with proposed corrections beside them.

| Area                         | Evidence in source                                                                                                                                                                                                                      | Simplification                                                                                                                                                                                                                                                                                    |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public navigation            | `SiteNav.tsx` lists eight peer destinations: Events, Communities, About, Our Work, Models, I/O Port, Writing and Contact. A Delhi clock and Join the Orbit action add more attention.                                                   | Four primary choices: Messaging, Terminal, Explore and About, with the two main offerings clear before their extensions. Use a quiet Sign in action; a signed-in person gets one account entry. Put Writing, Contact and social links in the footer. Remove the clock from task navigation.       |
| Homepage hierarchy           | `routes/index.tsx` has six unconditional page-level sections, conditional Spotlights and a feature-gated S.O.D.A section: up to eight. The three Ideas/Education/Skills cards are nested sections, not three extra page-level sections. | Five short sections with one coherent journey, described below.                                                                                                                                                                                                                                   |
| Competing homepage actions   | Eight in-content Link calls are present before the optional S.O.D.A link. Our Work is promoted twice; Academy, Skills and Models appear beside other destinations without a clear company/product hierarchy.                            | One clear company invitation and two visible doors: Messaging and Terminal. A concise extension panel covers all the other activities without presenting every subsystem as a peer product.                                                                                                       |
| Hero reading load            | The hero contains a company headline, short line, a second card headline, a long audience list, two actions and a separate desktop note. Its desktop artwork occupies 115svh with a minimum height of 820px.                            | One headline, one explanatory sentence, one primary action and one quiet alternative. Use an in-flow layout that lets the first useful content follow sooner.                                                                                                                                     |
| Repeated explanations        | Home, About, What is Indus Orbit?, Our Work and footer each explain the organisation with different taxonomies.                                                                                                                         | One concise About story and one short How it works explanation; retain detailed help and old links.                                                                                                                                                                                               |
| Terminology                  | “Intelligence layer”, “agent-native”, “digital and physical gravity”, “macro-nodes”, “algorithmically verified deal flow”, and “The model” require interpretation.                                                                      | Lead with a person's task. Explain specialised terms where they become useful. Recheck claims about matching, verification, scale and capital before publishing them.                                                                                                                             |
| Audience classification      | `segments.ts` defines seven segments. The guide asks people to choose a segment before explaining many capabilities.                                                                                                                    | Let public visitors understand the two offerings, explore their extensions, browse programmes and register for eligible public events before unnecessary classification. Ask profile questions when joining the member community; avoid treating an interest or self-description as a permission. |
| Footer                       | Two five-link columns, two separate company CTAs, newsletter, locations and contact actions repeat much of the site.                                                                                                                    | One short company sentence, a compact useful-links group, Contact, Instagram and reviewed legal/support links. Make newsletter an optional disclosure with a stated purpose.                                                                                                                      |
| Member navigation            | `AppSidebar.tsx` has 17 base destinations across five groups, plus Settings and conditional admin/lead actions. A collapsed icon rail makes this taxonomy harder to learn.                                                              | Make Messaging and the Terminal switch prominent, with Your work and Explore as supporting destinations and one account entry. Show management actions only to the relevant people.                                                                                                               |
| Member home                  | `/app` leads with verification/profile completeness, a mixed feed and segment-specific widgets. Current conversations and continuing work do not form one clear organising task.                                                        | Lead with conversations and continuing work; show a relevant gathering, learning item or opportunity as context. Move completeness prompts and recommendation explanation below the immediate task.                                                                                               |
| I/O                          | Public `/io-port` explains several products and future capabilities. `/io?view=…` has eight working views; `IoOverview.tsx` contains more than 4,000 lines of workspace and terminal controls.                                          | Give a newcomer a clear start, an accurate availability state and one useful action. Keep advanced routing, capacity and operational detail available through secondary disclosure.                                                                                                               |
| Event copy inconsistency     | `/events` metadata still says free registration for Community members, while the approved direction supports public guest registration by default.                                                                                      | Describe the actual event's registration scope. Do not make everyone join the community to understand or register for a public event.                                                                                                                                                             |
| Guide illustration integrity | `what-is-indus-orbit.tsx` references `/wiki-banner.jpg`; that file is absent from the current `public/` inventory. Its hero is actually the mirror-person image.                                                                        | Check every image reference during consolidation. A missing or unsuitable illustration must not remain as a broken visual placeholder.                                                                                                                                                            |

The problem is the number of competing first steps and explanations. Useful capabilities should remain available in a clearer sequence.

## 3. Homepage: two main offerings, the whole company, five sections

This is a full landing redesign proposal. It preserves the approved identity, foregrounds Messaging and Terminal, and explains the rest of the company as purposeful extensions. Draft copy is an application of the approved line, not a replacement tagline.

### Section 1 — company and possibility

- Company label: **The General Intelligence Company of India**.
- H1: **Intelligence, built together.**
- Supporting sentence: **Messaging for people. A terminal for working with intelligence. Together, a place to turn possibility into useful work.**
- Primary action: **Find your starting point** → the two offerings below.
- Quiet action: **How Indus Orbit works** → the explanation on this page.
- Artwork: the confirmed mirror-person scene in a contained editorial frame. Keep the human figure, opening and grounded landscape visible in the mobile crop. Put text on a quiet, solid surface.

The portal stands for opportunity: different people connecting, learning, contributing and doing useful work. It introduces the company rather than a single event, an avatar feature or an unexplained technology ecosystem. No floating second mission card, clock, rotating planet diagram or competing hero headline is needed.

### Section 2 — two clear doors

Heading: **Connect through Messaging. Work with Terminal.**

| Main offering | Draft explanation                                                                | Honest entry and scope                                                                                                                                                                                                                                                                                                                  |
| ------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Messaging** | Talk with people, stay connected to your communities, and find shared intention. | **Open Messaging** → `/app/messages`, through Community authentication/onboarding when required. Describe the existing accepted-connection chats and authorised group contexts; do not imply unrestricted public DMs or universal guest access.                                                                                         |
| **Terminal**  | Plan, build and review useful work with intelligence and tools.                  | **Open Terminal** → the existing `/io` workspace, with the Terminal view reachable through its canonical `view` state. I/O access is independent of Community membership. Local execution requires the user-run daemon and the existing connection/permission flow; provider use remains subject to real activation and budget/consent. |

A public explanatory link can appear beside each entry. Keep the two doors visually equal and understandable. Do not silently create a third core product called Explore, Learning or Community. Public information remains browsable; execution and private conversations retain their actual access requirements.

### Section 3 — the extensions make it useful

Heading: **More ways to connect, learn and contribute.**

A compact panel makes the full company discoverable without replacing the two-offering hierarchy:

| Extension                               | Relationship to the main offerings                                                                                       | Public next step                                                                     |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Events and communities                  | Give people a reason and context to gather; authorised discussions continue through the existing messaging/Space system. | Events, communities, and the relevant invitation/discussion link.                    |
| Learning, skills and mentorship         | Give people knowledge, practice and relationships they may carry into conversations or useful work.                      | An understandable learning/skills or mentorship explanation before member execution. |
| SODA programmes and opportunities       | Provide programme participation and ideas to explore, discuss or develop, with current availability made explicit.       | The programme/campaign record and the distinct startup-opportunity catalogue.        |
| Shared work, Missions and contributions | Organise collaborative purpose and continuing work around real membership and permissions.                               | The relevant work/community explanation, then its authorised member context.         |
| Research, writing and model comparisons | Supply context and evidence for better questions and decisions.                                                          | Dated, attributable research and comparison pages.                                   |

Show at most three timely examples below the panel, selected from actual published events, programme/learning material and demonstrable work/research. Do not manufacture balance by inventing an open cohort, a live provider, a project outcome or a currently available opportunity.

These are relationships and intended use cases. They do not establish an unimplemented automatic bridge between every course, event, conversation and Terminal session.

### Section 4 — how possibility becomes a contribution

Heading: **People connect. Intention becomes work.**

1. **Find a person, question or opportunity.** Messaging and its communities help people establish a useful connection.
2. **Choose something worth doing together.** Learn, exchange experience, join a programme or define a real task.
3. **Use intelligence deliberately.** Terminal helps with the work within its actual connection, provider and approval boundaries.
4. **Share what is useful.** Bring learning or work back to people and society, with attribution and evidence.

This is the company mechanism and portal story. It is not a claim that every step is already automatically linked in software, nor a guarantee of matching, opportunity, AI autonomy or social impact.

### Section 5 — a clear next beginning

Heading: **A place to begin. Room to contribute.**

Draft body: **Rooted in India, Indus Orbit brings people and useful intelligence into shared work. Start a conversation, open your workspace, or explore an opportunity that matters to you.**

Offer the two clear actions **Open Messaging** and **Open Terminal**, with a quiet **Explore what connects them** link. Contact belongs nearby for questions and collaborations. The approved company definition and short line remain the identity; this editorial heading is not another tagline.

### Page rhythm

The five sections form one story: company → Messaging and Terminal → useful extensions → human mechanism and contribution → the next action. The landing is minimal in hierarchy and comprehensive in coverage. A phone visitor sees an understandable action without scrolling past decorative art; text zoom can increase page height without clipping.

## 4. Navigation and naming

### Public website

| Placement     | Label and contents                                                                                                                                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primary       | **Messaging**, **Terminal**, **Explore**, **About**                                                                                                                                                                 |
| Messaging     | A concise public explanation, followed by the real `/app/messages` entry. Community authentication/onboarding applies; accepted connections and scoped groups remain explicit.                                      |
| Terminal      | A concise `/io-port` introduction, followed by the real `/io` workspace. Preserve independent I/O access, availability, local-daemon requirements, costs and approvals.                                             |
| Explore layer | Events/communities; learning/skills/mentorship; SODA programmes/opportunity ideas; shared work; research/writing/model comparisons. These are extensions of the two offerings, not six additional primary products. |
| About         | Company purpose, established values, the portal mechanism, verified work and the relationship to society.                                                                                                           |
| Account       | **Sign in**; after authentication, **Your Orbit** and a compact account menu.                                                                                                                                       |
| Footer        | Contact, Writing/research, Brand resources, Instagram `@indusorbit`, support/safety and reviewed privacy/terms destinations.                                                                                        |

In the first implementation, public Messaging information can be a clear section of the consolidated guide/About material, and Explore can be a named landing panel with ordinary links to existing pages. A later dedicated explanatory route is possible, but this proposal does not pretend that a `/messaging` or `/explore` production route already exists. Do not insert a mandatory persona-selection page between explanation and the authentic entry.

The coordinating reviewer inspected the public [@indusorbit profile](https://www.instagram.com/indusorbit/) on 22 October 2026. The limited bio/nine-cover review and its boundaries are recorded in [brand guidelines, section 15](BRAND_PHILOSOPHY_AND_GUIDELINES_2026-10-22.md#15-instagram-observed-public-profile-and-proposed-system). Use a normal outbound link; no feed embed or visitor tracking is needed. The campaign record below is documentation, not an instruction to register someone or update an external campaign.

A named keyboard-accessible mobile drawer exposes the same four primary choices. Disclosures preserve focus, Escape, active-page state and browser navigation. Public guest event registration remains available through Explore and must not be turned into mandatory Community membership just because Messaging is a main offering.

### Signed-in community

The signed-in shell should make **Messaging** and the **Terminal product switch** prominent, with **Your work** and **Explore** as the compact supporting areas. Events, Communities, People, Learning, Programmes/opportunities and Saved live in clear contextual layers. Profile/account actions sit behind the person's identity entry. Desktop navigation exposes names rather than relying on hover tooltips. The two products keep their real access boundaries: an I/O-only account must not be forced into Community onboarding to reach Terminal.

Within those destinations:

- **Events:** Discover, Your registrations, and Hosting when relevant.
- **Messages:** Chats, Connections and Groups already provide a useful lightweight hierarchy. Keep these controls and the common composer/timeline rather than starting another chat system.
- **Communities:** joined communities first, discovery second; Chapter and Mission relationships remain explicit where permissions or shared work depend on them.
- **People:** the member directory, relevant introductions and mentorship. Put Vouch in the person's relevant profile/action context with a plain explanation.
- **Learning:** Academy, skills and opportunities; keep existing enrolments, progress and detail links.
- **Shared work:** Board, Missions and Stories. Explain the action, not just the internal noun.
- **Account:** your profile, preferences, notifications, privacy requests and safety/appeal entry. Safety and help must stay easy to find.
- **Operators:** contextual Hosting, Chapter management, Mission management and Admin entries only when the trusted capability permits them.

This changes presentation and discovery. It does not merge public and private data projections or turn a self-selected profile segment into an authorisation role.

## 5. Route-by-route disposition

“Archive” below means remove from prominent marketing navigation or place in a labelled archive while preserving source and valid existing access. No capability is deleted by this proposal. Redirects, if later approved, must preserve useful deep links and avoid authentication loops.

### Public and access routes

| Existing route                     | Proposed disposition                                                                                                                                                                                                          | Completion rule                                                                                                                                          |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                                | **Keep; fully redesign** as the five-section company overview above.                                                                                                                                                          | Approved copy/art, one clear first action, genuine event content and accessible mobile layout.                                                           |
| `/events`, `/events/$id`           | **Keep** as gathering discovery and invitation extensions, reachable through Explore and relevant Messaging/community context.                                                                                                | Public guests can understand scope and register using the current trusted flow; private locations and guest identities remain protected.                 |
| `/communities`, `/communities/$id` | **Keep**; concise community descriptions and relevant upcoming events.                                                                                                                                                        | Public previews never become raw member/guest lists. Membership actions return to the correct community.                                                 |
| `/about`                           | **Keep; combine** the short company story, established principles and a simple How it works explanation.                                                                                                                      | Claims distinguish existing capabilities, previews and aspirations.                                                                                      |
| `/what-is-indus-orbit`             | **Combine its introductory narrative** into About/How it works; retain detailed help as a secondary guide.                                                                                                                    | Preserve existing route/anchors or publish a reviewed redirect map. Retain useful definitions without the first-visit segment toggle.                    |
| `/our-work`                        | **Keep; clarify** within Explore/company detail, with visible work and programme relationships.                                                                                                                               | Separate demonstrable work, related organisations and proposed programmes; avoid implying every described product is live.                               |
| `/models`                          | **Keep; move** within Explore/research as Model comparisons.                                                                                                                                                                  | Review dates/methodology and limitations remain visible; it is support content, not the brand's visual direction.                                        |
| `/io-port`                         | **Keep; simplify** the public product introduction.                                                                                                                                                                           | Explain who it helps, what is available and the next safe action in one screen. Keep detailed product/evidence information below.                        |
| `/writing`, `/writing/$slug`       | **Keep; group** within Explore/research and editorial/footer discovery.                                                                                                                                                       | Existing links, article dates and imagery continue to work; curate artwork against the revised subject rules.                                            |
| `/members`                         | **Keep its public-safe function; combine discovery** with the Communities/people story.                                                                                                                                       | Use only the public, consented profile projection; do not reuse member-directory queries for public browsing.                                            |
| `/profile/$id`                     | **Keep** as the existing profile permalink.                                                                                                                                                                                   | Public visibility and field disclosure remain controlled by the existing policy.                                                                         |
| `/skills`                          | **Keep; clarify** as the learning/skills extension entry, with an understandable Academy link.                                                                                                                                | Public catalogue and member learning views retain their different access boundaries and meaningful links.                                                |
| `/cities`                          | **Move** to a clearly named research/resource area; omit from the main visitor path.                                                                                                                                          | Retain methodology/data disclaimers and permalinks; avoid confusing a research ranking with active community locations.                                  |
| `/soda`                            | **Keep and separate** the startup-opportunity catalogue from SODA cohort/programme material. Make both visible in Explore, with one clear relationship and accurate next steps into participation, discussion or useful work. | Preserve programme/campaign history and relevant access. Show verified current availability; an old application post is not an open-registration status. |
| `/brand`                           | **Keep; curate** as a secondary brand resource.                                                                                                                                                                               | Remove planetary motifs from core recommendations, retain archived originals, and separate approved assets from historical mockups.                      |
| `/contact`                         | **Keep; move** to footer/About and relevant host/partner contexts.                                                                                                                                                            | One understandable form purpose, working email alternative and clear submission recovery.                                                                |
| `/auth`, `/onboarding`             | **Keep; simplify explanation**, not access checks.                                                                                                                                                                            | Preserve Community and I/O intent, return destinations, recovery and trusted onboarding requirements. Public guest RSVP remains separate.                |
| `/redeem/$code`, `/reset-password` | **Keep** as focused access flows.                                                                                                                                                                                             | No new marketing distractions; preserve verification, expiry and safe return behaviour.                                                                  |

### Member and operational routes

| Existing route family                                                  | Proposed disposition                                                                                                                                             | Boundary retained                                                                               |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `/app`                                                                 | **Keep; reorder** around current conversations and continuing work, with relevant events, learning and opportunities as context. Move the mixed feed to Updates. | Account switching, unsent work and session-return continuity.                                   |
| `/app/events`, `/app/events/$id`, `/app/events/hosting`                | **Keep; group** Discover / Yours / Hosting.                                                                                                                      | Approved hosts, review for new hosts, guest decisions, check-in and private details.            |
| `/app/messages`                                                        | **Keep** the shared lightweight UI and current chat history.                                                                                                     | Bounded pages/cache/outbox, visible read state, safe retries, blocking and identity generation. |
| `/app/chapters/*`, `/app/missions/*`, `/app/spaces/$spaceId`           | **Keep; group** under Communities/Shared work.                                                                                                                   | Actual Chapter/Mission membership, private Rooms/Threads, moderation and source permissions.    |
| `/app/directory`, `/app/mentor`, `/app/vouch`                          | **Keep; group** under People and contextual profile actions.                                                                                                     | Accepted connections, mentorship scope, trusted vouch issuance and privacy.                     |
| `/app/board`, `/app/stories/*`                                         | **Keep; group** under Shared work/Updates.                                                                                                                       | Submission review, ownership, moderation and existing links.                                    |
| `/app/education/*`, `/app/skills/*`, `/app/soda/*`                     | **Keep; group** under Learning and Opportunities.                                                                                                                | Course progress, quiz grading, private uploads and programme eligibility.                       |
| `/app/investor-feed`                                                   | **Keep; contextual entry** for eligible people.                                                                                                                  | Actual role/access checks; no automatic investor permissions from a profile label.              |
| `/app/profile`                                                         | **Keep; simplify** into a clear profile preview plus progressively disclosed editing.                                                                            | Visibility controls and sensitive fields remain understandable and account bound.               |
| `/app/settings`, `/app/notifications`, `/app/saved`, `/app/moderation` | **Keep** in account/utility discovery; surface urgent items contextually.                                                                                        | Privacy exports/deletion/holds, preferences, safety and appeal recovery.                        |
| `/app/chapter-admin`, `/app/mission-admin`, `/admin`, `/app/admin/*`   | **Keep; contextual/operator only**. Preserve existing redirects to the separate admin application where applicable.                                              | Trusted capabilities, MFA, root protections and audit evidence.                                 |
| `/io`, `/io?view=…`                                                    | **Keep** as the Terminal main offering’s authenticated AI workspace, simplified as below. Its access stays independent of Community membership.                  | Product-specific access, provider eligibility, budget/consent and execution approvals.          |
| `/app/io`                                                              | **Keep the existing redirect** to `/io`.                                                                                                                         | No duplicate AI workspace or broken saved destination.                                          |

## 6. Invitations, personal identity and the app

### Event invitation

First screen: title, date/time with timezone, place or Online, host and current registration action. A person should be able to answer “what, when, where, who, can I join?” immediately.

Use one primary action appropriate to the actual state: **Register**, **Request a place**, **Join waitlist**, or a clear confirmed/cancelled message. Explain a community restriction before collecting unnecessary input. Guest email verification, single-use links, challenge checks and consent remain intact. Keep lengthy host tools, registration decisions and guest lists in the host workspace; show only the attendee's own receipt and authorised meeting details on the invitation.

After confirmation, provide calendar, practical arrival details and, where enabled and authorised, the event discussion. Keep free native events as the initial format; later paid tickets do not need a dormant checkout explanation on every current invitation.

### The person and the frame

The confirmed asset is **`public/wiki-hero.jpg`**. It shows a saffron-clad traveller facing a tall rectangular frame containing a warm sky, with a Himalayan landscape, village paths and other people nearby. It is currently referenced by the public What is Indus Orbit? guide. It is an illustration, not a photograph or a representation of the signed-in person.

The primary role is a company-level portal of opportunity. It can recur inside the app as a restrained orientation panel, **Your place in the orbit**, paired with relevant Messaging/Terminal opportunities or a profile preview. It should not be reduced to a personal-avatar metaphor. Established members should reach their current task immediately; decorative artwork must not push events, learning, messages or continuing work below the fold. New character/format briefs are recorded below.

Use the existing profile/avatar data only within its authorised visibility. Do not infer a face, gender, identity, personality or future potential from an uploaded photo. Do not turn the artwork into a camera or biometric interaction. If the owner wants a personalised illustrated portrait later, that is a separate opt-in feature and asset decision.

### Lightweight messages

Preserve the new shared Messages/quick-sheet foundation. Keep recent chats, the optional connection picker and Groups as clear separate views. Continue loading the latter views only when selected. Registration links should lead into the existing authorised event discussion; community group links should lead into the existing Space. Do not add another messaging database or load decorative brand artwork into the messaging core.

## 7. I/O progressive disclosure

A simplified AI entry must still tell the truth about access, models, cost and execution.

- **Start:** name the workspace, show real availability, and offer the single relevant next step. If no provider is active, say so and explain what can be configured or explored.
- **Sessions:** resume work and inspect completed work; keep the local Terminal connection explicit.
- **Usage:** show the current budget and recorded usage. Cost and consent remain visible before paid execution.
- **Workspace details:** Model routes, Capacity, Evidence and Safety remain reachable as purposeful detail, with the current role-specific actions and receipts.

Retain the current `view` deep links and query parser during an initial presentation change. Existing Overview/Sessions/Terminal/Model routes/Capacity/Evidence/Usage ledger/Safety destinations can be regrouped without silently changing execution modes or source contracts. Technical provider, price and policy information should appear where it informs a real choice; a clean welcome screen cannot substitute for that evidence.

## 8. Art curation: keep a coherent world

These are placement recommendations based on local visual inspection, not approval of authorship or rights.

| Asset                                  | Observed content                                                         | Proposed role                                                                                                                                                |
| -------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `public/wiki-hero.jpg`                 | Human traveller, framed warm sky, Himalayan village and paths.           | **Human signature:** the confirmed frame of possibility, contained landing editorial art and personal orientation. Preserve the figure and frame in crops.   |
| `src/assets/hero-india-dawn.jpg`       | Indian city rooftops, a banyan tree, mountains and warm horizon light.   | **Place and hope:** environmental image, supporting public sections and event cover family. Lighten surrounding layout before altering the original artwork. |
| `src/assets/about-banyan.jpg`          | Banyan, village, fields and warm lit homes at dusk.                      | **Belonging and rootedness:** About, community stories or quiet empty states with a real narrative role.                                                     |
| `src/assets/lotus-pixel.png`           | Existing lotus illustration.                                             | **Learning and emergence:** a small editorial accent; avoid repeated full-screen symbolism.                                                                  |
| `src/assets/contact-rooftop.jpg`       | Two people talking over food on a lantern-lit rooftop.                   | **Connection:** contact, host/community story or a supporting human scene.                                                                                   |
| `src/assets/brand-hero.jpg`            | A large ringed planet over a skyline.                                    | **Archive from core brand recommendations.** Retain the file/history; do not use it as the new signature or homepage backdrop.                               |
| `src/assets/models-hero.jpg`           | Telescope and decorative glowing celestial patterns.                     | **Archive from core prominence.** Retain the source; any narrow supporting use needs review. Prefer a useful comparison interface on the model page.         |
| `public/wiki-chapter.jpg`              | Campfire/map gathering beside a cottage in a generic alpine setting.     | **Recontextualise or archive from lead pages.** It depicts people together, but does not establish an Indian location or actual community.                   |
| `public/wiki-mission.jpg`              | Luminous lotus formed from characters over digital water.                | **Archive from the main story.** The busy digital-code treatment conflicts with the calmer human/earthly direction.                                          |
| `public/wiki-story.jpg`                | Glowing manuscript/scroll/laptop collage with invented-looking markings. | **Archive from lead evidence/story surfaces.** Art must not look like a real document, product result or proof.                                              |
| Other blog, programme and merch images | Not all inspected in this source audit.                                  | **Review individually before reuse.** Pixel style alone does not qualify an asset for the new core.                                                          |

Curation rule: every prominent asset must serve one of four human jobs—**meet, belong, learn, make**—and match the approved subject, lighting, palette, pixel treatment and tone. An attractive pixel image can still be wrong for Indus Orbit. Keep rejected originals in a documented archive with their existing provenance; do not delete them during an interface simplification.

For new variants later, use bright warm daylight/dawn, gentle haze, grounded places and human scale. Keep key controls on solid surfaces, use readable Inter for working information and reserve Fraunces for selected editorial headings. Dreaminess belongs in the illustration and composition; action, status, price and permission must remain exact.

## 9. Existing campaign and programme record

This records existing work for the redesigned company story. It performs no registration, enrolment, publishing or external update.

| Item                                         | Evidence and current interpretation                                                                                                                                                                                                                                                                                               | Placement and next action                                                                                                                                                                                                                                                     |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **SODA application campaign**                | The coordinating reviewer saw an application campaign aimed at **ages 18–25** in the limited public late-April/early-May material. Nine visible reel covers in that review had linked dates from **20 April to 4 May 2026**. Exact application dates, complete terms and current availability are not established by that sample. | Include as an existing programme/campaign in **Explore**, connected to the ways people learn, discuss and make useful work. Until current availability is verified, label it as a previous campaign or programme record; do not show Register now or submit anyone’s details. |
| **Homepage S.O.D.A Cohort Program section**  | The source includes a section behind `VITE_ENABLE_SODA_COHORT`, describes a programme for builders **under 24**, calls S.O.D.A the communication wing and names a sponsor. These are source claims, not evidence that a cohort is currently open.                                                                                 | Reconcile the name, relationship, eligibility and sponsor before reuse. The 18–25 campaign and under-24 homepage wording must not silently become one current rule.                                                                                                           |
| **S.O.D.A opportunity catalogue**            | `/soda` is presently a startup-opportunity/research catalogue; `/app/soda/*` provides member idea views. The public source includes published-row loading and static fallback examples, with market-size/daily-signal claims that are not current proof by themselves.                                                            | Place opportunity ideas in **Explore**, linked to the wider SODA initiative and the distinct programme record. Date and source research claims; never market fallback examples as verified current opportunities.                                                             |
| **Other learning and participation formats** | Source contains Academy/courses, skills, mentorship, communities, events, Missions and shared-work surfaces. `/our-work` also describes product/venture/research initiatives with differing evidence.                                                                                                                             | Give each a clear role as an extension of Messaging/Terminal and a truthful state. A company-level overview should cover them without promising that every proposed initiative is available today.                                                                            |

The campaign record should eventually contain the public source URL, observed date, campaign name, intended audience, actual application window, programme format, eligibility, source owner, status, sponsor attribution and destination. Unknown fields remain explicitly unknown. An older cover or campaign must not create a false sense of current availability.

Use one SODA relationship explanation once verified: what the initiative is, how its programme and opportunity ideas relate, who it is for, and what a person can do now. Keep historical collateral accessible in the archive. Do not let a bottle/floral campaign mockup redefine the whole company identity.

## 10. Portal and character variants: production briefs

These are briefs for future illustration/prototype work. No new asset or recurring cast is claimed to exist. They develop the confirmed frame image across different people, activities and formats while preserving the human, earthly philosophy.

| Variant                    | Scene and human meaning                                                                                                                                     | Intended formats                                                                    | Exactness rule                                                                                                  |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **The original beginning** | Retain the grounded traveller, village paths and warm opening. The frame suggests an opportunity to participate or discover.                                | Homepage master image, About/editorial opening, a restrained first-visit app panel. | Preserve the original’s agency, people and place; no space portal or promise of transformation.                 |
| **Meet**                   | Different people arrive at a local gathering, a shared table or a community space. The frame opens onto conversation and an invitation, not another planet. | Event/community cover, host introduction, portrait social invitation.               | Real event facts remain live text outside the image. Illustrated figures are not presented as actual attendees. |
| **Grow**                   | A learner and mentor, a small workshop or people practising a craft; the frame opens toward a useful skill or understanding.                                | Learning/mentorship/programme intro, course/editorial thumbnail, vertical story.    | No implied certificate, guaranteed skill outcome, elite-network access or active cohort without evidence.       |
| **Build**                  | A small group working on a practical project, product or research question, with an intelligible connection to people beyond the table.                     | I/O/work introduction, case-study illustration, opportunity/research cover.         | No fabricated product result, live model capability or AI autonomy claim. Tools remain human directed.          |
| **Contribute**             | People exchange experience across generations, disciplines or locations; an opening links contribution to a shared place or useful work.                    | Company/philosophy spread, partner story, community recap.                          | An aspiration to benefit society is distinct from a measured impact claim.                                      |

A recurring visual language can include different ages, genders, abilities, backgrounds and settings without assigning a permanent “type” to the user. Avoid one lone young male figure as the only possible participant. Representation must feel grounded and considered rather than a token collage.

Use a consistent frame proportion, pixel density family, warm light and quiet typography around the artwork. Adapt square, landscape and vertical crops intentionally; do not crop out the person or opportunity relationship to fit a template. Important titles, programme dates and actions stay in accessible live text. Gentle haze or a softened edge may add dreaminess; the face, frame, mark and reading surfaces stay legible. Compare any new variant with the unchanged master before approving it.

## 11. Finite implementation plan and exact page coverage

Each phase has a finite output and an exit gate. This proposal/prototype is phase 0. Product files and external registrations remain unchanged during this review.

| Phase                                       | Exact pages/components and output                                                                                                                                                                                                                                           | Exit gate                                                                                                                                                                                                             |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **0. Agree the two-offering direction**     | Review the core philosophy, this route map, portal/character briefs, recorded SODA campaign and desktop/mobile full homepage prototype.                                                                                                                                     | The owner can see Messaging and Terminal as the main offerings, with the full company’s extensions covered. Earth-rooted art and programme status are explicit.                                                       |
| **1. Full homepage and global navigation**  | Redesign `/`, `SiteNav`, `SiteFooter`: five sections, visible two-door overview, extension panel, four primary labels, compact footer and verified Instagram link. Prepare responsive portal/dawn crops and archive planetary core prominence.                              | The first screen establishes the company and the two offerings. Every capability family is discoverable below; no persona selection is needed to understand the company.                                              |
| **2. Messaging introduction and workspace** | Clarify the public Messaging explanation in the consolidated guide/About surface; simplify `/app`, `AppSidebar`, `/app/messages`, profile orientation and the account/Explore entry. Retain the shared quick-sheet/timeline/composer and scoped group links.                | Real Community authentication/onboarding, accepted connections, groups, safety, drafts and account isolation work unchanged. A public explanation does not expose private messages.                                   |
| **3. Terminal introduction and workspace**  | Simplify `/io-port` and `/io?view=…`; preserve `/app/io` redirect and existing view URLs. Explain local execution, provider availability, budgets and approvals at the right time.                                                                                          | An I/O-only person reaches their workspace without Community onboarding. Local-daemon/connection and trusted execution/provider controls remain accurate.                                                             |
| **4. Explore extensions, page by page**     | Align `/events` and invitation/member/hosting views; `/communities` and member Chapters/Missions/Spaces; `/members` and People/mentorship; `/skills` and Academy; `/soda` programme-versus-ideas explanation; `/writing/*`, `/models`, `/cities` and shared-work discovery. | All activities have a clear relationship to the two offerings. Guest/member/host/learning/work permissions remain intact. Existing course progress, messages, records and saved URLs survive.                         |
| **5. Company, programme and brand detail**  | Consolidate `/about`, `/what-is-indus-orbit`, `/our-work`, `/contact` and `/brand`. Publish a reviewed programme/campaign archive, asset roles and old-route/anchor placement map. Separate related ventures, research, previews and evidence.                              | One coherent company story explains opportunity and contribution to society. Current SODA availability/eligibility is confirmed before a live application CTA; historical collateral remains labelled and accessible. |
| **6. Evidence and staged release**          | Verify affected routes, accessibility, crops, guest/member/operator journeys, performance, campaign/copy/asset inventory, deployment version and rollback plan.                                                                                                             | Reviewed staging acceptance and required service/operator setup establish production readiness. A prototype or source file does not establish Released status.                                                        |

Do not delete old paths, cohorts, lessons, messages or capability records to achieve a smaller navigation. Explain extensions publicly while retaining private execution boundaries: a course overview does not expose attachments, and a Terminal introduction does not activate a provider or charge a request.

## 12. Acceptance criteria

### Understandability and choice

- Homepage has five main sections and four primary navigation choices: Messaging, Terminal, Explore and About. The two main offerings are visible; events, communities, learning, mentorship, SODA programmes/opportunities, research and shared work are discoverable extensions, not buried in the footer. No segment selection is required for browsing.
- In a small first-time usability review, at least four of five people can explain the company’s purpose, identify its two main offerings and find a relevant next step within 30 seconds. Treat this as a proposed acceptance task, not completed research.
- A person can find an event invitation, a learning/programme explanation or a tool/work explanation within two navigation choices from Home. An invitation still exposes date, place, host and registration scope without a glossary.
- The same task uses the same label across public site, community entry, invitation and member navigation.

### Brand and content

- The approved name, company definition and short line are exact.
- Earth-rooted people, places and possibility guide prominent illustration. Ringed-planet/core-space imagery is removed from lead recommendations and recorded as archived source.
- No unverified location, member, partner, model capability, attendance or testimonial is presented as evidence.
- Every visible asset has a job, suitable crop, meaningful alt text or an explicit decorative role, a reviewed source/provenance entry and no baked-in essential text.
- Instagram uses the owner-confirmed handle and verified destination; no fabricated content or follower claim is required.

### Continuity, authority and recovery

- Existing route/anchor coverage is checked against the disposition map before any redirect is introduced.
- Same-account tab return, internal navigation and reconnect preserve safe work; account changes/sign-out clear private state.
- Public discovery never exposes member-only profile fields, guest lists or meeting credentials.
- Host review, membership/role checks, MFA, privacy lifecycle, moderation and execution approvals continue to be enforced by the existing trusted boundaries.
- Loading, missing content, denied access and offline states explain the next useful action without blanking a working surface.

### Accessibility and lightweight delivery

- Verify 320/375/390/412px phone widths, tablet and desktop, 200% text zoom, keyboard focus/Escape, screen-reader naming, reduced motion and mobile safe areas. Controls remain at least 44px in the relevant touch dimension.
- No serious/critical automated accessibility findings on Home, discovery, an invitation, member Home, profile, Messages and the I/O start view; manual checks remain necessary.
- Proposed art budgets: one responsive hero image, with a target of at most 250KB transferred on desktop and 150KB on a common phone crop. These are future implementation budgets, not measurements from this proposal.
- Preserve the existing measured incremental chat JavaScript budget and the lazy Connections/Groups boundary. Load mirror artwork only on the intended editorial/profile surface.
- Measure the new public entry and affected route dependency graphs against the current production build; do not replace a short text screen with an eager illustration, video or animation framework.

## 13. Decisions and evidence still needed

The owner has already decided the company identity, approved line, full-company landing scope, Messaging and Terminal as the two main offerings, portal-of-opportunity meaning, mirror-person reference and exclusion of planetary subject matter from the core. Community/events, learning, programmes and research extend the core; none should replace the two-offering hierarchy. Do not ask for those decisions again.

The concrete review now needed is the full-company prototype, Messaging/Terminal/Explore hierarchy, character/format treatments and responsive portal crop, followed by factual copy and asset/provenance approval. Current SODA application availability and consistent eligibility require confirmation before the website offers a live registration action. Real member/event content, exact production service setup and launch sign-off remain the separate production workstream; this visual proposal does not complete them.

Primary source files inspected: `src/routes/index.tsx`, `src/components/site/SiteNav.tsx`, `SiteFooter.tsx`, `SiteShell.tsx`, `src/routes/about.tsx`, `what-is-indus-orbit.tsx`, `our-work.tsx`, `brand.tsx`, `events.index.tsx`, `communities.index.tsx`, `src/features/events/EventDiscovery.tsx`, `CommunityDiscovery.tsx`, `EventInvitationPage.tsx`, `src/components/app/AppSidebar.tsx`, `src/routes/app.index.tsx`, `app.profile.tsx`, `src/routes/io-port.tsx`, `io.tsx`, `app.io.tsx`, `src/features/io/IoWorkspaceShell.tsx`, `IoOverview.tsx`, `src/components/auth/segments.ts`, and `src/styles.css`. Local visual inspection covered the assets explicitly described in section 8. This is not an audit of every unpublished image, hosted route or Instagram post.

## Portal focus correction - 22 October

The owner selected the quote-bearing portal picture and corrected the treatment: **only the scene inside the portal is blurred**. The traveller, frame, surrounding earthly pixel landscape and **Intelligence, built together.** remain sharp. The [selective-focus picture](assets/portal-quote-selective-focus-v1.png) implements this direction. The earlier globally blurred study is superseded and is not included in the selected asset pack. Keep atmosphere confined to the opening; do not apply a global CSS blur. Quote-bearing campaign images are permitted; on the website retain essential words as accessible live text and avoid duplicated display headings. This direction does not change the approved company definition or main offerings.

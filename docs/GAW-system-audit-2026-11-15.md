# GAW — Hackathon MVP audit and future production strategy

**Assessment date:** 15 November 2026, Asia/Manila. **Scope:** inspected working tree, including existing uncommitted changes. **Delivery context clarified by the team:** a hackathon requiring an MVP or working proof of concept. **Decision:** GAW has a credible functional prototype foundation. Prioritize a reliable, understandable demonstration of the core journeys; real authentication, a shared backend and operational verification are future production work unless the actual judging rubric requires them. Browser/device rehearsal remains outstanding.

## 1. Executive assessment

GAW has a useful interaction prototype: separate hiring and working experiences, flexible service categories, location-based filtering, booking stages, theme support, and progressive verification. Reusing these screens is sensible. For the hackathon, these implemented interactions are meaningful proof-of-concept work. The missing shared backend limits what the team can claim, but does not by itself make the prototype unsuitable for the stated deliverable.

The repository implements one browser-local account and local records. Passwords are validated for format but do not authenticate anyone. Workers, employers, jobs, reviews, and much of the activity are fictional. The same person can simulate both parties and approve their own verification. These are acceptable demonstration mechanisms when clearly labelled and presented as simulations. Keep the simulated reviewer and counterparty controls: they let judges see the full lifecycle without separate accounts. They become release blockers only if carried into real marketplace operations.

The immediate opportunity is to demonstrate one clear local matching problem and a convincing worker/hirer solution. The longer-term opportunity is a small, dependable local service marketplace with understandable quotes, realistic service areas, human support, and verified transaction history. Public browsing should precede identity verification. Credential requirements should depend on the service and risk, rather than excluding every worker who lacks formal documents.

### What was actually inspected and checked

Three specialist subagents reviewed (1) UI/accessibility and journey QA, (2) architecture/security/privacy, and (3) community research, competitors, and sustainability. Their work was consolidated against the actual files; an initial suspected self-profile routing defect was rejected because `/workers/w-me` is explicitly handled.

Reviewed all application routes and the GAW component/library layer, authentication, verification, local persistence, booking/application logic, location implementation, server entry, dependencies, and existing tests. Web research used primary government, standards, platform, and vendor sources. No user interviews were performed.

| Check actually run | Result | What this establishes |
|---|---|---|
| `npm test` | 2 test files, 17 tests pass | Existing unit, rendering, and route assertions pass; not a multi-user transaction test |
| `npm run build` | Pass | Client, SSR, and Cloudflare-targeted output compile; no deployment performed |
| `npx tsc --noEmit` | Pass | Current TypeScript checks pass |
| `npm run lint` and machine-readable ESLint inspection | Fail: 476 errors, 28 warnings | 475 formatting errors; one hooks naming-rule error in `jobs.$id.tsx:40`; 28 Fast Refresh warnings |
| Build output inspection | Main client chunk 355.48 kB raw / 112.66 kB gzip; Leaflet 148.81 / 43.39 kB; CSS 159.44 / 29.00 kB | Artifact sizes, not measured route transfer totals or load times |

**Limits:** no browser automation, real-device session, screen reader, measured rendered contrast, Lighthouse, penetration test, live database/RLS inspection, production traffic, or provider billing review. Responsive classes and ARIA attributes establish implementation intent, not WCAG conformance. No production incident or successful exploit is claimed. Application code, migrations, generated source, and existing user edits were not changed; this report is the deliverable.

## 2. Existing system audit

File references are relative to the repository root. Line references describe the inspected snapshot and may shift with later edits. **Status describes technical implementation, not hackathon failure.** Backend/security/operations recommendations in this table apply before real public transactions; they are not prerequisites for the current proof of concept. Clearly labelled fixtures, local persistence and simulation controls may remain for judging.

| Existing feature | Current status | Identified issue and evidence | Recommended improvement |
|---|---|---|---|
| Route architecture | Implemented frontend/SSR | TanStack Start/Router, React 19, Tailwind, Radix; `src/router.tsx`, `src/routes/__root.tsx`, `src/server.ts`. SSR is not a marketplace API. | Keep stack and route structure. Separate presentation from server-backed domain operations. |
| Registration | Simulated identity; implemented local validation | `AuthForm.tsx:63–74` drops password before signup; `store.tsx:246` replaces the one local account and seeds fictional bookings. | Managed authentication; separate demo environment and fixtures. |
| Login and recovery | Login simulated; recovery missing | `store.tsx:247–250` compares email with the account on this device. No password verification or recovery workflow. Explicit prototype notice in `AuthForm.tsx:219–222`. | Real authentication, recovery, session revocation, rate limits, and understandable errors. |
| Persistence/backend | Local demo only; shared backend missing | `src/lib/gaw/store.tsx:226–238` reads/writes `gaw:demo:v2`; no marketplace database schema, API routes, or backend integration found. | Shared database, authenticated API/server functions, ownership policies, backups, restore drill. |
| Role switching | Implemented UI | `AppLayout.tsx:270–276` changes current mode; a mode is a navigation preference, not a security boundary. | One account may be both roles; authorize each transaction by participant IDs. |
| Progressive verification | Implemented frontend guards; simulated outcome | Booking/application submit guards exist (`book.$workerId.tsx:124–130`, `jobs.$id.tsx:106–112`); store checks identity too. Reviewer controls are user-accessible in `VerificationCenter.tsx:751–785`. | Preserve exploration before verification; check authoritative verification at protected server writes. |
| ID/credential upload | Metadata-only simulation | `VerificationCenter.tsx:643–644` explicitly says metadata only; `store.tsx` stores name/type/size/status, not an uploaded document. | Do not infer an existing private storage service. Introduce minimal private evidence storage only after operational/privacy preparation. |
| Worker profile | Local editing/preview implemented | `ProfileSetup.tsx:28–35`; own profile synthesized in `find.tsx:102–121` and `workers.$id.tsx:47–68`, with invented rate, rating, experience, jobs and review. | Display saved facts and “New worker / no completed jobs yet.” Add explicit pricing fields. |
| Worker discovery | Functional local filtering of fixtures | `filter.ts:31–44` filters/sorts local arrays; `find.tsx:91` defaults to map and list. Does not discover another real user's profile. | List-first query API with pagination; preserve optional map and no-GPS location input. |
| Geography | Approximate demo areas | `data.ts:52–61` contains eight area centers labelled barangays; not authoritative boundaries or full city coverage. `nearestBarangay` picks nearest center. | Separate official barangay IDs from recognizable area aliases; declare pilot coverage. |
| Distance | Implemented approximation | `filter.ts:5–12` great-circle distance; rounded before radius inclusion at `34–35`; travel barriers and service-area radius are not fully modelled. | Filter using unrounded distance, round only presentation; label approximate distance and ask travel acceptance. |
| Jobs | Seeded read-only catalogue | `JOBS` in `data.ts`; job loader resolves fixtures. No hirer job-create/edit/close/applicant-management workflow found. | Either build a minimal posting workflow or remove public job-board promises for the first pilot. |
| Applications | Local submit/withdraw implemented | `store.tsx:275–291`; simulated hire at `292` onward. No employer inbox or delivery. | Persistent applications, real recipient response, close/reject states and timestamps. |
| Service picker | Partial; value-consistency defect | `ServicePicker.tsx:74–82,175–182` changes visible custom input without clearing/replacing the last valid parent value when empty/invalid. | Clear selection when entering custom mode; validate visible text at submit so an earlier service is not silently submitted. |
| Booking form | Local validation/review implemented | `BookingForm.tsx:59` owns editable draft; parent only receives it on review (`book.$workerId.tsx:178–180`). Early edits are not saved by parent persistence. | Controlled draft, explicit save/recovery, account-scoped drafts. |
| Booking lifecycle | Local state machine implemented | `bookings.ts:14–20` restricts state order; `applyAction:44–49` has no actor/ownership check. `bookings.tsx:76` lists all sides, including incoming worker requests. | Participant-bound transactions; separate hiring/working views; server-authorized transitions. |
| Counterparty actions | Demo only | Hirer simulates worker accept/start/finish (`bookings.tsx:230–284`); worker can simulate employer confirmation (`requests.$id.tsx`). | Remove production simulation actions and derive controls from actor permissions. |
| Reviews/reputation | Fictional display only; review-writing missing | `data.ts` fictional reviews; `workers.$id.tsx:124` calculates review count as `reviews.length * 12 + 7`. | Only completed-booking participants may review; real counts and moderation. |
| Availability | Local toggle plus seeded values | `store.tsx` stores one boolean; no schedule/conflict prevention. | “Accepting requests” plus preferred date; atomic conflict handling before calendar sophistication. |
| Live location | Device GPS/map preview, not remote sharing | `GawMap.tsx:700–768` toggles local tracking; no recipient transport; success toast before permission/fix success. | Relabel preview or defer. Use appointment directions and an arrival status for pilot. |
| Notifications/contact | Toast feedback implemented; delivery missing | Sonner plus local UI state; no persistent recipient notifications or transactional delivery service found. | In-app inbox first, opt-in email/SMS only with reliable delivery and cost controls. |
| Themes/motion | Implemented | `theme.tsx`, `styles.css`, `interactions.ts` support preference persistence, focus and reduced motion. | Retain; audit actual combinations and sticky focus behavior. |
| Terms/privacy/settings | Partial | Terms/privacy text is bold text, not linked policy (`AuthForm.tsx:169`); settings primarily theme/status/demo reset, not full account editing/deletion. | Accessible policies, support and rights-request process; recovery and account management. |
| Reporting/blocking/disputes/admin | Missing operational workflows | No corresponding routes/domain records found. Demo reviewer controls are not an admin service. | Small protected queue with reason, status, owner, action log and appeal route. |
| Pro subscription | Explicit local demonstration | `pro.tsx:124–127` toggles local plan; disclosure at `151–154`; top-rated filtering is Pro-gated. | Hide from production MVP; keep safety information and core matching free. |
| Offline/reliability | Partial local state only | No service worker/offline asset strategy found; map tiles/fonts depend on network. Storage JSON is unvalidated and write is unguarded (`store.tsx:229,237`). | Recoverable storage and network states; no “sent” until server acknowledgement. |

### Complete worker journey

These are code-derived walkthroughs, not observed user sessions. Each row includes the smallest useful next change; backend-dependent work must follow the architecture in section 7.

| Stage | What works now | Friction, continuation blocker, accessibility/trust risk | Simplification / smallest feasible improvement |
|---|---|---|---|
| Registration | Field validation and errors; verification not demanded | Email, mobile, password, confirmation and terms precede value discovery; password provides no real authentication; policy unreadable because absent | Public browsing; managed auth at first save/transaction; link real policies and focus first invalid field |
| Role selection | Hire/work cards and later switching | Two modes can be mistaken for separate accounts; changing routes changes mode | Label “What would you like to do?” and explain both are available; preserve intended destination |
| Browse jobs | Search/category/area filters | Only fictional jobs; limited geography; English only; no employer posting source | Clearly distinguish demo; text list, known area aliases, honest coverage and empty-state recovery |
| View opportunity | Description, budget, schedule, application form | Free-text rates lack scope/unit; profile prerequisite sends user away with no guaranteed return | Structured price unit, materials/travel note; short profile setup returning to this job |
| Verify when applying | Guard handles unsubmitted/pending/rejected/resubmission/verified states; draft saving exists | Manual-review outcome is simulated; a real queue could strand users; document and language barriers | Explain why, accepted options, next step and expected service window; save intent; no repeated upload unless needed |
| Apply | Message/rate entry; local submitted view | No delivery; minimum message length adds composition burden; “will see” overstates demo | Optional editable message template; server receipt with ID; retry same request safely |
| Employer response | Demo hire converts application to booking | No actual employer inbox; no rejection/expiry; user must simulate employer | Persistent inbox and accept/decline; show “waiting for response” honestly and allow withdrawal |
| Complete work | Ordered start/finish/confirmation statuses | Same user controls both sides; no disagreement/no-show path; no agreed quote record | Actor-controlled status timeline and “Report a problem”; retain accepted scope/quote |
| Review | Existing sample review display | Cannot submit authentic review; invented reputation advantages new profiles | One review per participant per completed booking; show zero history honestly; moderation/appeal |

### Complete hirer journey

| Stage | What works now | Friction, continuation blocker, accessibility/trust risk | Simplification / smallest feasible improvement |
|---|---|---|---|
| Registration and role | Validated local form and mode choice | Same authentication/policy issues; no guest comparison | Browse first, sign in on protected action; one account for both roles |
| Find worker | Skill/query/radius/availability controls, map and list | Split map default; only eight approximate areas; GPS can fail; small screens carry many filters | List first; one service and area input, expandable filters, manual area fallback |
| Compare profiles | Skills, bio, rates, reviews, history visible | Invented own-profile metrics, inflated counts, price units ambiguous | Actual data only; disclose what identity/credential checks do and do not establish |
| Review pricing | Rate or request-quote option, budget field | Hourly advertised price becomes a single budget with no duration/materials/travel contract | Show estimate basis and “quote required” until both accept one scope and amount |
| Verify when required | Confirmation guard preserves exploration within signed-in app | Real document handling/review absent; long delay could abandon draft | Save completed draft, explain reason, return to review after verification; no verification gate on search |
| Submit booking | Details → review → local success | Early edits not lifted to saved draft; restored form can miss parent changes; no recipient delivery | Controlled draft; recovery confirmation; server-acknowledged receipt and idempotent retry |
| Worker response | Local accept/decline demonstration | Hirer controls fictional worker; all booking sides mixed; no real notification | Own outgoing bookings only, real worker inbox and notification with timestamp |
| Complete service | Hirer confirmation stage exists | No dispute or cancellation negotiation; neither history nor confirmation proves payment | Completion confirmation, problem route and agreed-quote record; label payment as outside app if so |
| Review/repeat | Book-again link exists | Review creation missing; repeat starts fresh; Pro promotion adds distraction | Eligible review form; prefill non-sensitive service details and confirm new date/price |

## 3. Accessibility and community needs

### Evidence, inference, and field-validation gaps

**Geography is a product correctness problem.** PSA's official Davao City barangay directory lists 182 barangays; GAW offers eight approximate centers. Use official PSGC IDs and maintain familiar area names separately. Do not infer actual barangay membership from the nearest demo center. Clearly mark the pilot's supported areas. Source: [PSA Davao City directory](https://psa.gov.ph/classification/psgc/barangays/1130700000) and [PSGC summary](https://psa.gov.ph/classification/psgc/summary), current September 2026 snapshot, accessed 15 November 2026.

**National connectivity findings support low-data design, but are not Davao estimates.** PSA's 2024 NICTHS release reports 48.8% of households had internet access at home and 98.8% of internet users used a cellphone to access the internet. Household home access is not the same denominator as individual internet use. This supports mobile/list-first design, not an assumption that the other households cannot use GAW. [PSA 2024 NICTHS release](https://psa.gov.ph/content/percentage-households-internet-connection-increased-488-percent-2024-two-every-three), published 21 July 2025.

**Local employment assistance exists.** Davao's PESO identifies employment facilitation and a Skills Registry System among its services. An assisted-onboarding/referral pilot may be viable; no partnership, API, data-sharing permission, or endorsement is established by that fact. [City of Davao PESO](https://davaocity.gov.ph/public-employment-and-service-office/), undated, accessed 15 November 2026.

**Language preference and current household hiring habits remain unmeasured.** Cebuano/Bisaya, Filipino, and English options are reasonable hypotheses for inclusive use, not a verified ranking of GAW users' preferences. Likewise, referrals/Facebook, distrust of unfamiliar workers, document barriers and willingness to pay need interviews rather than invented percentages.

Run a small, consent-based discovery round with workers and hirers from the chosen pilot areas, including older adults, disabled participants and people with lower digital confidence. Ask participants to find a relevant job/worker, explain a price, recover from GPS denial, and resume after verification. Record task success, explanation errors and assistance needed. Offer compensation for time; do not collect IDs for research. A small qualitative sample exposes problems but cannot establish citywide prevalence.

### Specific WCAG 2.2 AA review

The normative reference is [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/), Recommendation dated 12 December 2024. The following is a targeted code audit, not a conformance certification.

| Area / criterion | Evidence and barrier | Concrete fix / validation |
|---|---|---|
| Keyboard and structure: 2.1.1, 1.3.1 | Custom tabs in `my-jobs.tsx` / `pro.tsx`, radio roles in `settings.tsx`, lack complete composite-widget keyboard behavior | Use existing Radix Tabs/RadioGroup or ordinary pressed buttons for filters. Verify arrows, Tab order, selected state and panel relationships with keyboard/AT. |
| Bypass navigation: 2.4.1 | `AppLayout.tsx:293–352` has repeated header navigation, no skip link | Add “Skip to main content”, `id` on main and a working focus destination. |
| Error association: 3.3.1, 3.3.2 | Some fields have good error IDs; custom service/skills controls do not consistently connect error text to inputs | Add `aria-invalid` / `aria-describedby`, persistent guidance and an error summary; focus first invalid field. |
| Focus: 2.4.7, 2.4.11 | Shared focus utilities are a strength; sticky header, bottom navigation and fixed booking CTA can obscure focus | Preserve visible rings; measure actual keyboard navigation, add scroll padding and resolve overlays. |
| Target size: 2.5.8 | Small skill edit/remove controls in `ProfileSetup.tsx` need measurement | Prefer 44px touch controls. AA minimum is 24×24 CSS px with exceptions; assess spacing rather than declaring every smaller icon a failure. |
| Text/UI contrast: 1.4.3, 1.4.11 | Muted text, gold accents and subtle input boundaries need rendered checks in both themes | Measure actual foreground/background, hover/focus/disabled and error states. Require normal text 4.5:1, large text 3:1, relevant UI boundaries 3:1. Do not rely on “high contrast” copy. |
| Reflow/text resizing: 1.4.4, 1.4.10 | Dense filters, segmented controls, status pills and fixed UI are risks; no viewport test done | Test 320 CSS-pixel width and 200% text; ensure essential actions remain usable and horizontal scroll is limited to appropriate content. |
| Location input: 2.1.1, 2.5.7 | Map pin dragging is cumbersome; manual area input already exists | Keep equivalent keyboard/text location choice; never require dragging or GPS to proceed. |
| Status messages: 4.1.3 | Some success views use `role=status`; toast-only feedback and broad live regions may be missed or noisy | Persistent concise transaction status; separate polite result-count region; announce actual success/failure once. |
| Motion and language | Global reduced-motion support and `html lang=en` exist | Retain motion override; when language changes, set `en`, `fil`, or `ceb`, and localize accessible labels/status/errors too. |

No measured contrast pass/fail is asserted. The agent's token-level contrast concern is a screening signal; actual computed styles, color gamut, background layers and rendered states must be assessed before issuing a compliance result.

### Economic and language access

Keep browsing, basic profiles, applying, receiving requests, safety information and support free in the pilot. Do not require paid credentials unrelated to the service. Identity verification and skill qualification are different claims. Offer an assisted alternative for users lacking a supported document only after privacy/security/legal review; do not improvise unsafe exceptions or promise universal acceptance.

Translate the highest-stakes strings first: role labels, prices/units, application/booking actions, verification explanations, errors, safety/reporting and support. Introduce message-key dictionaries in the existing React app; format currency/dates with locale-aware functions. Use fluent local reviewers and comprehension testing. Preserve original user content and avoid silently translating contractual scope. This is more useful than translating every marketing sentence immediately.

## 4. Priorities for the hackathon and future production

### Hackathon priorities — use these for the current deadline

| Priority | Work | Why it matters for the demonstration |
|---|---|---|
| P0 — demo blocker if observed | Rehearse the complete worker and hirer flows in the actual judging browser; fix crashes, unreachable actions, broken links and stuck states | A compiled build and unit tests do not prove a judge can finish a journey. These failures have not yet been browser-tested. |
| P1 | Fix booking draft restoration and custom-service value mismatch | These are actual interaction defects even with a local backend. They can lose entered work or submit the wrong visible service. |
| P1 | Clearly label fictional profiles/reviews, simulated verification and local-only submissions; keep reviewer/counterparty simulation controls | Judges can understand both the implemented behavior and the boundary of the proof of concept. Avoid unnecessary backend work just to demonstrate another actor. |
| P1 | Prepare a repeatable demo starting state and check reset behavior, including session drafts | Each presentation should start predictably and complete without stale records or a previous account's draft. |
| P1 | Check mobile layout, essential labels, keyboard focus/errors and a manual location fallback | These directly support the project's inclusive-use claim and make a live presentation more robust. |
| P2 | Clarify price units, status wording and next action; reduce image weight and use list discovery when maps fail | High-value polish after the core flow works. |
| P3 — after judging unless required | Real multi-user backend/auth, secure real-ID review, production moderation, paid messaging and billing | Necessary for real operations, but substantial scope beyond a disclosed local proof of concept. |

**Working proof-of-concept scope:** demo account → choose either role → browse fictional local listings/profiles → submit a booking/application → encounter progressive verification → simulate review and counterparty response → demonstrate status/completion tracking. Use sample documents, not real IDs. Show any missing review-writing or actual message delivery as future work. Do not claim two independent devices are synchronized.

These priorities assume the stated requirement is an MVP/working proof of concept. No detailed judging rubric has been supplied; an explicit requirement for a backend, deployment or multi-user behavior would change the scope.

### Top 10 future production improvements

The original ranked analysis below is retained for planning after the hackathon. **Its P0/P1 labels refer to real-user release readiness, not judging eligibility.**

### Scoring and effort assumptions

For future real-user deployment, P0 is a **release gate** for unsafe/false or broken core behavior; P1 substantially improves reliable use; P2 improves convenience/reach; P3 needs validation/funding. P0 overrides arithmetic. Within tiers use `score = 20 × impact × confidence / (effort + cost + delivery-risk)`; impact 1–5, confidence 0–1, effort 1–5, cost/risk 0–2. These are judgement-based ordering aids, not ROI measurements. High dependency is a reason to sequence carefully, not to ignore a release gate.

Effort estimates below are **person-days**, including targeted tests/review, for developers familiar with the stack; not contractual delivery promises. Infrastructure/vendor procurement, legal review, interviews and operational delays are additional. Features overlap: do not sum rows into a precise deadline.

| Rank / priority | Problem → target user → proposed solution → benefit | Implementation / existing files | Effort, cost, risks and operations | I/C/E/$/R → score |
|---|---|---|---|---|
| 1 — P0 | Local demo can appear transactional → everyone → isolate demo, remove invented reputation and false delivery/sharing claims → honest expectations | `AuthForm`, `find`, `workers.$id`, `bookings`, `my-jobs`, `VerificationCenter`, `GawMap`, `pro`; environment-level demo separation and banner | 2–4 days; negligible service spend; risk of leftover fixture paths. Owner must review all trust claims. | 5/1/1/0/0 → 100 |
| 2 — P0 | No secure account/shared data → both parties → managed auth plus shared participant-owned records → recoverable multi-device accounts | `store.tsx`, `AppLayout`, auth routes, TanStack server functions/queries; Lovable-managed backend schema | 12–20 days initial foundation; auth/DB/storage hosting, backups and messaging costs. High integration risk; include two-account isolation tests and restore drill. | 5/1/5/1/2 → 12.5 |
| 3 — P0 | Anyone simulates both actors → booking users → server-enforced lifecycle and ownership → trustworthy requests and completion | Port `bookings.ts` rules behind authenticated atomic writes; booking/request/My Jobs views; participant inbox and minimal quote snapshot | 8–14 days after foundation; shared backend costs; concurrency, duplicate requests, stale status. Operations need cancellation/disagreement policy. | 5/1/4/1/2 → 14.3 |
| 4 — P0 | Self-approved verification and missing abuse handling → all users → progressive real review, private minimal evidence, report/block/support queue → credible trust | `VerificationCenter`, verification/store helpers, protected reviewer interface; do not allow client role escalation | 8–15 days plus privacy/legal design; private storage and reviewer time. Sensitive evidence, bias, backlog; define retention, access audit and appeal. | 5/1/4/1/2 → 14.3 |
| 5 — P1 | Draft loss and misleading local success → low-connectivity/shared-device users → controlled drafts, clear recovery and acknowledged/idempotent sends → fewer failed attempts | `BookingForm`, `book.$workerId`, `jobs.$id`, `store`; scope/clear draft keys by account, minimize saved sensitive data | 3–6 days after API; low incremental spend. Draft persistence itself risks shared-device disclosure; expiry and logout clearing required. | 4/.95/2/0/1 → 25.3 |
| 6 — P1 | Dense navigation and incomplete widget semantics → first-time/disabled users → simplify actions, proper keyboard widgets, focus/error/contrast fixes → independent task completion | `AppLayout`, `AuthForm`, `ServicePicker`, `ProfileSetup`, theme/settings/tabs, shared Field/Input utilities | 4–8 days plus compensated usability/AT sessions; low service costs. Avoid claiming compliance after automated checks alone. | 4/.9/2/0/1 → 24 |
| 7 — P1 | Ambiguous cost and unrealistic availability → workers/hirers → price unit, scope/material/travel notes and acceptance of one quote → fewer misunderstandings | Profile/pricing model, `BookingForm`, booking review and details; new quote revision/acceptance record | 4–7 days after booking foundation; low infra cost. No universal “fair price” dataset assumed; revisions must require agreement. | 4/.9/2/0/1 → 24 |
| 8 — P1 | Heavy discovery and inaccurate service areas → mobile/peripheral users → list-first, optimized images, official area IDs/aliases, honest coverage → useful access without map/GPS | `find`, `data`, `filter`, `GawMap`, `mode`, root font loading; paginated discovery queries | 3–6 days; modest data curation, optional map vendor costs. Missing coverage and stale aliases; do not imply travel-time routing. | 4/.95/2/0/1 → 25.3 |
| 9 — P2 | English-only high-stakes tasks and unsupported onboarding → users needing local-language/assisted help → reviewed `en/fil/ceb` core strings and staffed assistance → broader completion | Root `lang`, message dictionaries, forms, verification, status and support content | 5–10 days plus translator/reviewer and partner time; ongoing translation upkeep. Needs field validation, not machine translation alone. | 3/.75/3/1/1 → 9 |
| 10 — P2 | No authentic follow-up/reputation loop → returning marketplace users → eligible reviews, simple notifications and repeat request → retention based on successful work | New review/notification records; profile, booking completion and book-again UI; retain generic rebooking free | 6–10 days; email/SMS optional metered cost and moderation. Spam, retaliatory reviews, cost escalation; start with in-app inbox. | 3/.85/3/1/1 → 10.2 |

Ranks within P1 also reflect dependency and workflow order; the score alone would put #8 alongside #5. Keep accessibility defects that actually prevent task completion at P0 when runtime validation establishes them; this audit has not proven such a complete barrier.

## 5. Missing features, innovation, and competitor lessons

### Capabilities justified by repository gaps

| Problem → user → solution → benefit | Requirements and smallest feasible alternative | Risks / effort / priority |
|---|---|---|
| No real job supply → workers and posting hirers → create/edit/close job plus applicant inbox → complete the Find Work loop | Owner-bound job/application tables, expiry and moderation; alternative: launch direct booking first and hide unoperational jobs | Fraudulent posts and extra moderation; 6–10 days after foundation; P1 if job board is in MVP, otherwise P2 |
| Overlooked workers outside familiar centers → underserved areas → coverage-aware area aliases and “willing to travel” → useful matches | PSGC snapshot, curated aliases and worker consent; show supported areas and broaden radius explicitly | Incorrect area mapping/travel costs; 2–4 days curation/UI beyond backend; P1 |
| Unreliable availability → both parties → “accepting requests”, proposed slot and acceptance expiry → fewer wasted requests | Availability updated timestamp; booking conflict check; no full calendar initially | Expiry may exclude slow-connectivity users; 3–5 days; P2 |
| Identity badge mistaken for skill guarantee → hirers/new workers → separate identity, credential issuer/validity, completed-work reputation → clearer decisions | Evidence review and honest badge descriptions; supported services/legal requirements defined first | False confidence, credential admin load; 3–6 days plus review; P1 |
| No-show/dispute leaves users stranded → participants → reasoned cancellation/report, moderation triage and appeal → operational recovery | Case record, evidence minimum, access policy and staffed hours; no promise of insurance/refunds without capability | Human workload, fairness and safety; 4–7 days plus staffing; core support P0, advanced dispute tooling P2 |
| Newcomer cold start → workers without formal portfolios → self-described skills, optional work samples with permission, “new” status → participation without fake ratings | Public/private media separation, content review, client consent for photos | Photos leak addresses/third-party information; 3–5 days; P2 |
| Weak local liquidity → both sides → assisted enrollment/referrals in one small area/service cluster → enough relevant supply and demand | Partner agreement, opt-in referral process and named operator; no assumed government API | Partner capacity and mistaken endorsement; engineering small, operations substantial; P2 pilot |
| No sustainable business evidence → team/community → optional convenience tools for repeat business hirers after demand is proven → revenue without charging for job access | Interviews, actual willingness-to-pay tests, basic cost accounting; grants/sponsorship alternative | Sponsor dependency, ranking bias and billing/support cost; P3 |

Do not build AI matching, facial recognition, live tracking, escrow, automated disputes, native apps, or a new search cluster now. Rule-based service/area/date matching and human support are easier to explain and operate.

### Related platforms: adapt the solved problem, not their complexity

Official product/help documentation supports the patterns below; it does not establish that competitors are accessible or effective for Davao's informal service workers. Availability, fees and screening vary by jurisdiction. Links are attached to each platform; JobStreet policy updated 14 August 2026, other help/product pages undated, all accessed 15 November 2026.

| Platform | Useful pattern | Adaptation for GAW / what to avoid |
|---|---|---|
| [JobStreet](https://ph.jobstreet.com/privacy) | Saved-search alerts and configurable profile visibility | Add saved category/area searches and clear visibility settings; avoid CV-heavy requirements for a one-day repair |
| [Indeed](https://www.indeed.com/help/job-seekers/articles/204652920-applying-for-a-job-on-indeed?co=US&hl=en) | Drafts, application confirmation and tracking | Use clear pending/response labels and free application access; do not promise tracking events GAW cannot receive |
| [Upwork](https://support.upwork.com/hc/en-us/articles/215917628-How-to-view-and-share-your-feedback-from-clients) | Contract-linked feedback and delayed mutual publication | Tie reviews to completed GAW work; consider delayed mutual publication only if retaliation becomes an observed problem. Avoid global freelancing proposal/contract complexity |
| [Taskrabbit](https://www.taskrabbit.com/how-it-works) | Local service selection, scheduling, rates and reviews | Show pricing units, service scope and counterparty response. Do not import US-specific checks, insurance or fee assumptions |
| [GrabExpress](https://www.grab.com/ph/express/) | Upfront delivery pricing and genuine delivery updates | Put “Report a problem” in booking details; defer GPS tracking and costly safety infrastructure that GAW cannot operate |
| [Davao PESO](https://davaocity.gov.ph/public-employment-and-service-office/) / [PhilJobNet](https://philjobnet.gov.ph/default.aspx) | Local employment facilitation and free job matching | Explore referrals and onboarding support; differentiate around small local service jobs and understandable household booking, not a duplicate general job board |

There is no repository or field evidence yet that GAW matches faster, is cheaper, or is more trusted than these alternatives. Validate that claim with completed pilot jobs, response times and participant interviews.

## 6. UI/UX recommendations

Keep the visual identity and reusable components; simplify the decision flow.

1. **Entry/auth:** let users see useful listings and coverage first. Require sign-in to save/submit; verification at the protected transaction. The present system already defers verification but requires sign-in through `AppLayout`; guest exploration would be a further improvement, not an existing feature.
2. **Home/navigation:** primary labels “Find work”, “Hire a worker”, “My requests”; explain dual roles once. Remove Pro from primary mobile navigation in MVP. Move theme to account/settings; avoid repeating mode/theme choices across screens. Preserve return destinations after profile/auth/verification.
3. **Discovery:** service and recognizable area first; advanced radius/rating controls collapsed. List default, map opt-in. Empty result offers change area/service or broaden distance with consent. Avoid “no workers” if the request actually failed.
4. **Profiles:** show actual skills, supported area, price basis, update time and verified claims separately. Remove fake defaults, fabricated review totals and synthetic credentials/history. Use “No reviews yet” without penalizing newcomers out of all results.
5. **Booking:** retain the useful Details → Review → Sent structure. Add an explicit estimate/quote distinction and recipient status. Fix custom-service display/value divergence in `ServicePicker.tsx:74–82,175–182`, so invalid or cleared custom text cannot submit a previous service. Save actual edited draft, let the user discard it, and confirm scope/date/price on rebooking. “Request received by GAW” and “worker accepted” are different events.
6. **Worker management:** separate submitted applications from incoming requests; filter records by real participant. Keep primary next action obvious and history available. Replace developer-facing “Shared Booking State” text with plain status and next step.
7. **Verification:** show what is needed now, why, acceptable options, what will be public, review state and support. Keep optional service credentials separate. Remove reviewer buttons from user pages in production; rejection needs a useful reason and appeal/resubmission route.
8. **Feedback/support:** inline errors plus persistent result states; errors preserve input. Display support hours and acknowledgement status that the team can actually meet. Never infer that a success toast proves a counterparty received anything.

### Scenarios to validate before a pilot

| Scenario | Code-supported failure concern | Required observed result |
|---|---|---|
| Older first-time user | Many filters/modes and unfamiliar terminology | Finds relevant worker and explains next step without coaching |
| Low-end Android / small screen | Large role images, map, sticky controls, dense pills | Core action remains visible; optional map does not delay list access |
| Screen reader / keyboard | Custom widget roles, field errors, repeated navigation | Complete signup, application and booking; hear correct labels/errors; reach main directly |
| GPS denied / inaccurate | Permission-dependent map; nearest-center assignment | Manual area works, accuracy limits stated; no false “sharing started” |
| Network drops while sending | Future real API may timeout after write | Reopening shows authoritative status; retry creates one request |
| Verification pending/rejected | No real reviewer operations today | Draft retained, next step clear, no repeat verification on browsing |
| Shared phone / second account | Logout retains local account/records; draft keys not account-scoped | Previous user's private draft/account data never appears |
| Two actors update at once | No authoritative concurrency today | One valid status transition wins; other sees current state |
| Worker lacks formal portfolio | Invented metrics currently fill gaps | Honest new profile can participate within appropriate risk rules |
| Completion disputed | State machine has no problem path | User can report issue and receive real acknowledgement without false completion |

These are proposed acceptance tests, not completed browser tests.

## 7. Technical architecture recommendations

**Timing:** the shared-backend, verification-storage and production operations work below is a post-hackathon plan. Retain the current architecture for judging unless the rubric requires a live multi-user system. Fix demonstrated UI/data-consistency defects within the existing local model first.

### Keep the stack; add an authoritative domain layer

Continue TanStack Start/Router, React, existing Radix UI and Tailwind. React Query already has a request-scoped client in `router.tsx`, a good base for remote reads and invalidation. Keep server error/CSRF middleware in `start.ts`; CSRF protection does not authenticate users or authorize records.

**Candidate backend:** Lovable-managed Cloud/Supabase-compatible auth, Postgres and private storage fit the repository's conventions, but are not currently integrated. Confirm the actual connected backend before implementing. Per `AGENTS.md`, schema/migration changes must go through Lovable; do not hand-edit `supabase/migrations/` or `drizzle/`. No schema change is made by this audit. Reuse existing server/framework conventions rather than adding an unrelated framework.

Suggested minimal logical model: auth-linked accounts; public worker profiles/services and private contact details; official areas/aliases; bookings with worker/hirer IDs, accepted scope/quote/date; booking events; optional jobs/applications if included; verification cases/private evidence pointers; reports/blocks; completed-booking reviews; notifications. Do not expose one giant all-fields account object to public discovery.

### Enforce invariants on the server and database

- Identify actor from the authenticated session, never request-body user ID, current mode, or client verification flag. Worker may accept/start/finish only their bookings; hirer may cancel/confirm only their bookings. Define worker cancellation/rescheduling and dispute rules explicitly.
- Use atomic conditional transitions against expected status/version, with an audit event in the same transaction. Duplicate application constraints, participant constraints, and server-generated IDs/timestamps protect integrity. Validate finite money, actual date/time values and past appointment times in Asia/Manila at final submit: `BookingForm.tsx:36–46` currently checks presence/date ordering and a budget floor, not those full invariants. Idempotency keys prevent duplicate submits after connection loss.
- Recheck verification at protected writes; allow list/profile exploration without it. No client can grant verification/admin roles. Enforce private-row policies even when the UI hides a button. Test unauthorized direct calls and cross-account access.
- Save price as amount/currency/unit and agreed terms, not only free text. Keep versioned quote acceptance; do not silently change a previously accepted booking when a profile rate changes.
- Notifications follow committed writes, with a retryable delivery record; never send before commit. Begin with in-app inbox and email only if useful; add SMS after delivery and budget validation.

Official technical references: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [private storage fundamentals](https://supabase.com/docs/guides/storage/buckets/fundamentals), and [storage access control](https://supabase.com/docs/guides/storage/security/access-control), living documentation accessed 15 November 2026. These describe capabilities, not evidence that GAW already uses them.

### Immediate local-state and content risks

`store.tsx:229` shallow-spreads parsed JSON without schema validation; malformed nested state may break consumers. Add versioned schema parsing and safe fallback. Catch write failures at `237` and display a recoverable warning. Logout at `258` leaves private account/state in browser storage; `resetDemo` only clears the main key while booking/application drafts use separate session keys. Namespace drafts by account and clear sensitive drafts/cache on logout/reset/account change; retain only harmless theme preferences. Prefer session-only minimal drafts and make persistence explicit on shared devices.

`GawMap.tsx` builds Leaflet HTML using names/skills/initials and pin labels. Current fixture values do not establish an exploit, but accepting user content creates an injection sink. Use DOM nodes with `textContent` or safely constructed React/DOM output; test hostile profile strings before connecting real data.

Keep service-role credentials, signing secrets and any `LOVABLE_API_KEY` server-side and in managed Secrets. Browser map tokens must be provider-supported public tokens restricted by domain/scope, not assumed safe merely because their variable begins `VITE_`. Deployment headers, CSP, provider restrictions and dependency vulnerability state were not audited here.

### Verification, privacy, and Philippine requirements

Primary references are [RA 10173](https://privacy.gov.ph/data-privacy-act/) (2012), the [NPC implementing rules](https://privacy.gov.ph/implementing-rules-regulations-data-privacy-act-2012/) (24 August 2016), and [RA 10361](https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/51514) (18 January 2013). This is an engineering applicability assessment, not a certification or legal opinion.

Define the operating entity, purpose and lawful basis for each field; a blanket “accept privacy” checkbox is insufficient governance. Publish an understandable notice, contact/rights process and retention schedule before real collection. Limit public location to service area; precise home address/contact belongs only to authorized participants when necessary. Record reviewer access and decisions. Store evidence in private buckets with authenticated policies and short-lived reviewer access; server-validate size/type/file signature, randomize names, prevent executable delivery, and use appropriate scanning/review. Client MIME/size checks alone are not a secure upload pipeline.

Avoid collecting raw IDs until staffed review, deletion and incident response exist. Identity check means a defined claim was checked, not a guarantee of honest behavior or skill. Minimize evidence retained after review where justified; do not collect criminal records or biometrics by default. Decide retention with counsel and operational needs, rather than inventing a universal period.

Domestic employment, independent service work, recruitment/placement, and regulated trades have different implications. GAW's category list includes household help and technical work; a generic “freelancer” label does not settle classification. Review obligations before those flows launch, and start with a small supported scope if the team cannot administer all categories.

### Performance and low-connectivity priorities

Build artifacts include role images of **688.96 kB** and **913.26 kB** and welcome image **387.81 kB**. The two role images total about **1.60 MB raw**; these are file sizes, not a measured waterfall. Convert to suitable compressed variants and responsive sizes, set dimensions, and lazy-load noncritical images. Prefer system font or appropriately subset/self-hosted font subject to licensing over a render-dependent remote font chain (`__root.tsx`). Measure route transfer before setting aggressive bundle targets.

Leaflet is already imported dynamically; preserve that improvement and delay map mounting until asked. List requests need pagination, bounded result sets and cached recent data. Clearly distinguish cached/stale listings, offline browsing and acknowledged transactions. Do not queue protected actions silently when verification/availability may change.

OpenStreetMap's public raster service is best-effort, requires attribution and forbids bulk/offline tile download. Keep the list usable if tiles fail; do not treat public tiles as an unlimited production SLA or add offline tile prefetch. [OSMF tile policy](https://operations.osmfoundation.org/policies/tiles/), living policy accessed 15 November 2026. Avoid extra compression middleware: existing server/config comments state edge hosting already compresses.

Start search with database indexes and deterministic service/area/availability filters; use correct distance math and pagination. Introduce PostGIS or a search service only when measured query patterns justify it. No AI matcher, live location stream or paid routing API is necessary for an initial neighborhood pilot.

### Quality and release controls

Retain existing tests but add high-value coverage: two real accounts, unauthorized mutations, protected action guard, database transition conflicts, duplicate retry, cross-device persistence, review eligibility, private-file access, failed verification, interrupted submit, draft recovery, shared-device clearing, and missing/expired listings. Browser tests should cover core journeys with keyboard and a small screen; AT testing needs actual TalkBack and desktop screen reader sessions.

Resolve the hooks lint error by giving the `jobs.$id.tsx` route component a named React component; it is a static-rule failure, not proof of a runtime hook crash. Treat formatting cleanup separately from behavior changes, preserving existing user edits. Add CI build/type/unit/lint gates after baselining; a green unit suite cannot replace authorization or browser tests. A vulnerability scan and dependency review remain outstanding; dependency age alone is not a vulnerability finding.

## 8. Implementation roadmap

### Current deadline: hackathon delivery

1. **Stabilize:** fix booking drafts/custom-service values; verify deterministic seed/reset behavior and remove any stuck demo states.
2. **Rehearse:** walk through both roles with sample data, progressive verification and simulated responses; check refresh/back navigation, small-screen layout and denied GPS/map failure. The team should perform these browser checks before calling the demo ready.
3. **Explain:** add concise simulation labels and prepare a short presentation identifying the local problem, demonstrated solution, accessibility choices and future backend boundary.
4. **Freeze:** preserve the working demo, run build/type/unit checks and fix relevant lint issues. Defer extra features that do not strengthen the demonstrated journey.

No fixed duration is assigned because the hackathon deadline and remaining team capacity are unknown. Completion criteria are a repeatable end-to-end demonstration, clear disclosures, and no observed blocker in the rehearsed path.

### After the hackathon: real-user pilot roadmap

Assume roughly two developers working part-time with access to a product/support owner. Person-day ranges above are more defensible than calendar promises. Run interviews and operational preparation alongside engineering; do not advertise a launch date before the P0 acceptance gates pass.

| Phase | Work and dependencies | Exit gate |
|---|---|---|
| **1 — Immediate fixes and quick wins** | 1–2 focused iterations: isolate demo, correct reputation/sharing claims, preserve drafts, scope/clear storage, link draft policies, list-first and image compression, keyboard/label fixes, lint baseline. No premature real-ID collection. | Demonstration clearly fictional; core prototype task can be completed by keyboard; drafts recover without leaking across accounts; build/type/tests pass; known lint baseline removed or explicitly tracked |
| **2 — Core usability and trust** | Approximately 4–8 full-time-equivalent developer-weeks across backend/auth, participant-owned bookings, pricing acceptance, private verification, notification inbox, minimal moderation/support and security tests. Range excludes partner/legal delays; part-time student calendar will be longer. | Two independent accounts/devices complete a real request; unauthorized access denied; retries duplicate nothing; review/support and data-deletion processes staffed; backup restore tested; critical a11y barriers resolved |
| **3 — Growth and community access** | Constrained pilot in one service/area cluster; bilingual/trilingual core task content after testing, assisted onboarding, official area aliases, genuine reviews and rebooking. Add real job posting/applicant management only if operations can support it. | Relevant supply, actual responses and completed jobs; abandonment reasons understood; accessible task testing passes; support load within capacity; no unresolved severe safety/privacy issue |
| **4 — Innovation and sustainability** | Validate paid convenience for repeat business hirers, institutional sponsorship, broader geography and optional SMS. Consider schedules/routing only after evidence. | Measured retention and cost per completed job justify expansion; funding/support capacity and privacy evaluation cover new services |

**For real-user operations,** P0 gates require named responsibility for privacy, reviewer decisions, user support, security incidents, and deployment/restore. These can be roles held by the small team, not separate departments. If reviewer/support capacity is unavailable, keep the product as a demonstration or supervised research pilot without real transactions.

### Costs and ongoing work

No verified vendor quote or volume forecast exists, so no monthly peso price is asserted. Build a budget from fixed hosting/DB/backups + stored evidence/egress + transactional email + SMS count × provider rate + reviewer/support hours + research/translation + incident contingency. Track actual cost per completed job, not just server expense. Manual verification/moderation may dominate at small scale.

Use hosted services within managed limits and a list-first product; do not self-host map infrastructure or construct a custom identity platform to avoid small vendor bills. Validate provider pricing/retention/data-processing terms at procurement. Prioritize affordable manual moderation before automated fraud scoring, with an explicit capacity limit.

## 9. Success metrics

Metrics below are proposed instrumentation and targets, not current results. Establish an initial baseline and inspect failures by role/device/language and pilot coverage. Avoid citywide claims from small samples.

| Metric | Definition / collection | Decision and proposed target |
|---|---|---|
| Registration completion | Server-auth account created / registration started; track separately from verification | Find biggest field/drop-off; improve baseline, rather than inventing a benchmark |
| Protected-action completion | Acknowledged application/booking / intent to submit; split first/repeat and verification state | Reduce preventable abandonment; do not hide policy-required checks to inflate conversion |
| Verification completion and wait | Approved or finally resolved cases / submitted; median/p90 review time and abandonment at each step | Set staffed review window before launch; alert on missed window and inaccessible/rejected-document patterns |
| Response and acceptance | Requests receiving real response / delivered; accepted / delivered; median response delay | Reveals liquidity and stale availability; distinguish no delivery from no interest |
| Successful matching | Accepted then mutually completed / valid requests; report dispute/no-show separately | Primary marketplace outcome; never count seeded records or self-confirmed demo events |
| Review integrity | Reviews tied to eligible completed bookings / published reviews | 100% eligibility; monitor removals/appeals without assuming high ratings equal safety |
| Accessibility | Critical task success with keyboard/AT; unresolved severity by criterion; automated regression findings | Zero blockers in supported core journeys; automation plus manual checks, not a single score |
| Mobile usability | Unassisted task completion, error/retry and assistance rate on representative lower-end phones | Improve observed baseline; record network/device test conditions |
| Performance | Field p75 LCP/INP/CLS, plus route transfer size and lab slow-network runs | Aim LCP ≤2.5s, INP ≤200ms, CLS ≤0.1; a target, not a claimed result |
| Reliability/security | Failed writes, duplicate requests, unauthorized-access tests, restore result | No duplicates in retry tests; denied cross-account access; actionable error/incident monitoring |
| Retention | Cohort return and repeat completed hire/work at 30/60 days, interpreted for service frequency | Avoid daily-use goals for occasional repairs; distinguish habit from actual job success |
| Sustainability/support | Operating/support cost per completed job; cases per job and resolution time | Scale only when team capacity and funding support observed workload |

Core Web Vitals thresholds are described by [Google/web.dev](https://web.dev/articles/defining-core-web-vitals-thresholds), living guidance accessed 15 November 2026. Low pilot volumes may be insufficient for stable field percentiles; lab/device results should be reported separately.

Collect only allowlisted event names, coarse role/language/device class, server timestamps and short-lived pseudonymous/session identifiers where needed. Keep security/audit logs access-restricted and distinct from product analytics. Never log IDs, precise coordinates, phone numbers, free-text job descriptions, draft content or raw documents as analytics payloads. Document purpose, retention and access; avoid session replay by default. Use aggregate dashboard queries and suppressed small-area cells rather than invasive tracking. Do not call pseudonymous data anonymous.

## 10. Final strategic recommendation

**1. Five changes first for the hackathon:** (a) rehearse and fix blockers in both complete demo journeys; (b) correct draft recovery and custom-service value handling; (c) label sample reputation, verification and counterparty actions as simulated; (d) make demo data/reset and refresh behavior predictable; (e) fix mobile/keyboard/error usability in the demonstrated path. Real auth, persistence, permissions and staffed verification become the next milestones if the team proceeds to a public pilot.

**2. Simplify/remove for judging:** hide distracting Pro/earnings panels if they do not support the story; reduce duplicate theme controls and map dependence. Keep labelled sample profiles, demo-review and counterparty simulation controls so the lifecycle is demonstrable. Remove unsupported claims of real delivery, real verification or actual earned reputation. Before production, remove end-user simulation powers and replace sample activity with real records.

**3. Accessibility barriers:** keyboard widget behavior, weak error association, dense small-screen layouts, potentially obscured focus and insufficient contrast/touch sizing pending measurement; English-only critical tasks, mandatory typing, expensive map/images, unsupported documents and failed GPS without clear fallback. Technical WCAG work and economic/language access both matter.

**4. Davao opportunity:** a coverage-honest, local-language, assisted, service-specific alternative for neighborhood work, with transparent scope and repeat hiring. This is a hypothesis supported by a local facilitation ecosystem, not a proven gap or guaranteed market.

**5. Minimum hackathon scope:** one repeatable worker flow and one hirer flow using local seeded data, understandable profiles/pricing, progressive verification using sample documents, simulated responses and completion/status tracking, usable mobile navigation and clear demo disclosures. No production backend is inherently required by the stated proof-of-concept scope.

**If proceeding to production later:** one constrained service/area pilot; guest discovery; real account/recovery; truthful profiles and price basis; necessary progressive verification; persistent two-party booking/response/completion with agreed scope; notifications/inbox; reporting/blocking and staffed support; privacy/account processes; accessible mobile/list UI; authorization/reliability testing. Include jobs/applications only with real hirer posting and response management. Authenticated completion-linked reviews can follow immediately after core transactions; no fabricated substitute.

**6. Avoid before judging:** unnecessary backend rewrites, real-ID collection, billing and operational infrastructure unless explicitly required; AI recommendations/chatbots, biometric matching, live tracking, escrow/payments, broad category expansion, guaranteed/insurance language, native apps, advanced analytics, custom map infrastructure, paid ranking and worker pay-to-apply. Each adds risk/operations before the basic match is proven.

**7. Sustainability after validation:** use the hackathon to gather feedback on the problem and workflow; do not present fictional activity as traction. If continuing, recruit enough reliable supply in a narrow area before marketing widely; measure responses/completed jobs and support load; seek opt-in referrals/assisted onboarding with local organizations; keep core access free; validate optional convenience revenue with repeat hirers only after recurring value exists. A small service the team can operate is more credible than a wide marketplace whose requests nobody receives.

### Research notes and primary-source register

All sources accessed 15 November 2026. Dates are publication/effective dates where identified; undated and living pages are labelled. These sources inform recommendations, not proof of local user preferences or legal compliance. Additional official market and Philippine legal references follow below.


- **Connectivity:** [PSA 2024 NICTHS](https://psa.gov.ph/content/percentage-households-internet-connection-increased-488-percent-2024-two-every-three), **21 July 2025**. National survey denominators differ across household and individual measures; no Davao adoption rate is inferred.
- **Local channels and uncertainty:** [Davao employment-services update](https://davaocity.gov.ph/local-government/davao-city-employment-rate-rose-since-2021/), **25 March 2025**, describes PEIS, job fairs, Facebook vacancy announcements and plans for Barangay Employment Services Offices. Plans do not establish current operations. Its total vacancy figure does not reconcile with its listed annual figures; no vacancy/placement total is used in this report.
- **Language:** [PSA 2020 Census home-language release](https://psa.gov.ph/content/tagalog-most-widely-spoken-language-home-2020-census-population-and-housing), **7 March 2023**, identifies several major language categories nationally. Home language is not UI preference, and national counts do not establish a Davao preference ranking. Human-reviewed core-task translations and comprehension testing remain proposed validation.
- **Skills evidence:** [TESDA assessment and certification](https://www.tesda.gov.ph/About/TESDA/25), **undated**, describes competency assessment and a Registry of Certified Workers. A small team could manually check supported credentials and link assessment resources; an integration API or automatic endorsement was not established. Identity verification must remain a separate claim.
- **Privacy:** [RA 10173](https://privacy.gov.ph/data-privacy-act/), **2012**, and [NPC implementing rules](https://privacy.gov.ph/implementing-rules-regulations-data-privacy-act-2012/), **24 August 2016**, support purpose limitation, proportionality, appropriate safeguards and data-subject rights. ID details may include sensitive personal information. Review registration/DPO and processor-contract obligations against the actual operating entity and processing; this audit does not determine registration eligibility. Incident preparation must include assessment of notification thresholds; the IRR's 72-hour rule applies to qualifying breaches, not every technical error. No universal document-retention duration is asserted.
- **Domestic work:** [RA 10361](https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/51514), **18 January 2013**, distinguishes domestic employment from occasional/sporadic nonoccupational household work (§4). It addresses understandable employment contracts (§11), specified pre-employment document costs (§12), and recruitment/finder fees charged to domestic workers (§13). Do not model continuing kasambahay employment as an ordinary short-task booking. Confirm category-specific contracts and operations before including it.
- **Recruitment/placement:** [DOLE Labor Code Book I](https://dole.gov.ph/book-1-pre-employment/) and [Bureau of Local Employment private employment agency page](https://ble.dole.gov.ph/private-employment-agency/), **undated**, are applicability starting points; the latter page could not be fully fetched by the research agent. Verify current rules and GAW's classification with DOLE XI/qualified Philippine counsel before recruitment/placement operations or success fees. A narrow service pilot is an operational simplification, not a legal exemption.

### Repository evidence entry points

- [Local state, accounts and domain operations](../src/lib/gaw/store.tsx)
- [Authentication form and prototype disclosure](../src/components/gaw/AuthForm.tsx)
- [Booking transitions and role metadata](../src/lib/gaw/bookings.ts)
- [Verification UI and demo review controls](../src/components/gaw/VerificationCenter.tsx)
- [Worker discovery and synthetic self-profile](../src/routes/find.tsx)
- [Worker profile reputation display](../src/routes/workers.$id.tsx)
- [Booking draft and confirmation](../src/routes/book.$workerId.tsx)
- [Editable booking form](../src/components/gaw/BookingForm.tsx)
- [Custom-service value handling](../src/components/gaw/ServicePicker.tsx)
- [Application form](../src/routes/jobs.$id.tsx)
- [Map/GPS behavior](../src/components/gaw/GawMap.tsx)
- [Existing test suite](../src/test/gaw-v2.test.tsx)

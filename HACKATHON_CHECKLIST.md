# OpenAI Build Week submission checklist

Official source: [OpenAI Build Week rules](https://openai.devpost.com/rules)

## Eligibility

- [x] North Macedonia is an eligible OpenAI API-supported territory.
- [ ] Entrant confirms they are at least the legal age of majority where they live.
- [ ] Entrant confirms no employment, judging, promotional, or other conflict listed in the official rules.
- [x] Project is newly created during the submission period, not an old-project submission.
- [x] Project is original work and MIT licensed.

## Timing

- Registration and submission deadline: **July 21, 2026 at 5:00 PM Pacific Time**.
- In Skopje: **July 22, 2026 at 2:00 AM CEST**.
- The optional $100 free-credit request deadline was July 17 at 12:00 PM PT and has passed. This does not affect eligibility.

## Submission requirements

- [x] Install and connect the optional Devpost Hackathons plugin after signing into ChatGPT. Version 3.0.0 was verified through its active Manage/Try in chat controls; the official rules say it is not required for eligibility or judging.
- [ ] Join the hackathon on Devpost.
- [ ] Exercise the live GPT-5.6 path with a real API key and capture evidence.
- [x] Category selected: **Apps for Your Life**.
- [x] English project description drafted in `DEVPOST.md`.
- [ ] Record a public YouTube demo shorter than three minutes, with audio explaining both Codex and GPT-5.6 use.
- [x] Create and push the public GitHub repository.
- [x] README includes setup, demo data, testing, and Codex collaboration details.
- [x] Judges can run the project without a Garmin device, account, or API key.
- [ ] Run `/feedback` in the Codex task where the majority of the core functionality was built; add that session ID to Devpost.
- [x] Capture repository-ready desktop, mobile, dashboard, plan, and fuel screenshots with honest demo labels.
- [ ] Add the screenshot set and public demo URL to the Devpost submission.
- [ ] Submit before the deadline and verify the Devpost confirmation screen.

## Current engineering status

- [x] First-run athlete-map onboarding covers baseline activity, safety, goals, strength, schedule, data, coaching preference, nutrition, and delivery.
- [x] Onboarding drafts persist; completion returns deterministic running, strength, connector, nutrition, and automation recommendations.
- [x] Safety signals pause both running and strength prescription while preserving the profile and next-step explanation.
- [x] Apple Health and Health Connect are truthfully labeled as native-companion routes; planned integrations are not shown as connected.
- [x] Demo behavior is truthfully separated from live GPT-5.6 and Garmin connector state.
- [x] Approval and decline state persists across reloads.
- [x] Approval identity and action are server-authoritative.
- [x] HTTP integration tests cover simulation, persistence, duplicate approval, safety stop, and image validation.
- [x] Data setup shows source priority and freshness without calling planned, simulated, or merely configured routes connected.
- [x] FIT, GPX, TCX, and CSV preview/import works with explicit local-summary consent, raw-file discard, and per-record deletion.
- [x] Manual pain, RPE, energy, sleep-feel, and context check-ins work without a wearable and can be deleted.
- [x] Deterministic athlete analysis covers stage, goal pressure, load evidence, weekly room, recovery, missing data, confidence, and permission boundaries.
- [x] Model enrichment is restricted to explanatory text and cannot override safety, stage, or permissions.
- [x] Deterministic four-week plans cover beginner run/walk, running, strength, mobility, rest, optional cross-training, and a reduced-load fourth week.
- [x] Plan frequency and intensity are bounded by stage, availability, recovery, pain, and athlete-selected intensity tolerance.
- [x] Named advanced or regional training methods trigger a suitability-research gate instead of becoming a universal template.
- [x] Training-plan preview, proposal, decline, and activation use the persisted decision ledger; only explicit server-authorized approval activates a block.
- [x] Missed sessions never create catch-up stacking, and new pain/profile evidence marks an active block for review.
- [x] Nutrition support is optional and implements off, loose, guided, detailed, and number-free behavior.
- [x] Number-free preference, tracking concerns, under-18 profiles, and clinician-prescribed diets prevent automated restrictive targets.
- [x] Meal and fridge estimates expose ingredient, portion, allergen, and cross-contact uncertainty; raw images are not written to local state.
- [x] Food logging requires a linked decision, an explicit confirmation, and supports bounded corrections, decline, persistence, and deletion.
- [x] Protein powder, creatine, caffeine, and other supplements are inventoried without automatic prescription.
- [x] The dashboard shows server-authoritative today/week/strength/fuel state, source freshness, and useful setup, pending, review, safety, recovery, and upcoming states.
- [x] Observed activity remains separate from claimed plan completion, and no synthetic readiness score is substituted for a completed athlete profile.
- [x] Dashboard behavior is covered by deterministic unit/API tests and real-browser desktop/mobile checks.
- [x] Morning, pre-workout, post-workout, and weekly Scheduled proposals are timezone-aware, editable, copyable, and explicitly not auto-installed.
- [x] Every scheduled prompt has a manual test path, read-only command contract, no-update behavior, safety override, and zero external writes.
- [x] `npm run setup` installs, diagnoses, and starts a clean clone; `npm run doctor` checks Node, dependencies, env syntax, state permissions, port, privacy ignores, sample profile, and required docs.
- [x] Windows, macOS, and Linux clean-install instructions, optional live mode, persistent state, reset, and a non-auto-loaded synthetic sample are documented.
- [x] Corrupt local JSON state is moved to a recoverable ignored backup before StrideOS starts with an empty state.
- [x] Garmin approval is bound to the exact server-authored workout resource, revalidated against new evidence, and synthetic judge workouts stay simulated even when a bridge is configured.
- [x] Onboarding separately asks about workout delivery, destination, and setup help; the optional Garmin community wrapper stays loopback-only and user-supplied.
- [x] Security headers, content type, malformed JSON, oversized input, traversal, duplicate action, static accessibility, persistence, and bridge-payload boundaries have automated coverage.
- [x] Task 11 release gate passes: setup doctor, syntax checks, 100 tests, and the production dependency audit report zero vulnerabilities.
- [x] The isolated clean-state browser rehearsal completed all 11 onboarding steps, plan proposal/approval, active dashboard, desktop/mobile layouts, and a read-only automation preview.
- [x] Architecture, judging guide, final English copy, screenshot captions, and the under-three-minute video script are checked into the public repository.
- [ ] Live GPT-5.6 reasoning and image analysis still require an API-key verification pass.
- [ ] A real Garmin bridge is optional and not configured in judge mode; the UI explicitly reports simulation.

## Prize reality check

Participation alone does not include ChatGPT Pro. The published prize table awards a one-year Pro account to each first- and second-place winning project in the four categories, alongside the applicable cash prize and other listed benefits.

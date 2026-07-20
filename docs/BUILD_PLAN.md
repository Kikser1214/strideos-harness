# StrideOS rebuild plan

This plan is the delivery contract for the open-source Build Week rebuild. Every task ends with a runnable result, tests proportional to risk, documentation, and a focused commit.

## Product promise

StrideOS is an installable five-skill plugin for ChatGPT Work mode and Codex, for people who may know nothing about endurance training and for experienced athletes who want an inspectable coaching loop. It gathers the minimum useful context, recommends running and strength, supports optional fueling and permitted data routes, and can build an athlete-controlled room for a real coach or trusted reviewer. The optional Node/PWA makes those rules testable; it is not the product identity.

The initial product is wellness coaching, not diagnosis, treatment, or emergency care. A safety stop always wins over a training recommendation.

## Task 1 — Product contract and research pack

Deliverables:

- define the beginner-first user journey and safety boundaries;
- create the complete onboarding question inventory;
- document current permitted-individual provider routes and the conditional attended-browser, file-import, and manual-entry tiers truthfully;
- require a first-party source, individual-permission flag, capability limits, and review date in every provider playbook;
- anchor general activity, strength, screening, and supplement behavior in primary sources.

Done when the questionnaire has no unexplained field, every provider route has an honest capability label, prohibited or partner-only routes cannot be selected, and research links live in the repository.

## Task 2 — Onboarding engine

Deliverables:

- versioned onboarding schema;
- draft and completion validation;
- safe persistence and migration from the existing state file;
- completeness, starting-stage, data-quality, safety, and recommendation analysis;
- an explicit strength-training recommendation for every eligible profile.

Done when API tests cover a new athlete, an experienced runner, missing answers, safety escalation, and state restoration.

## Task 3 — First-run wizard

Deliverables:

- seven short steps: starting point, safety, goals, strength, schedule, data, and coaching preferences;
- optional nutrition and delivery setup;
- save/resume, back/next, keyboard access, mobile layout, and final review;
- truthful skip-to-demo route without pretending a real athlete profile exists.

Done when the optional reference implementation opens the wizard before its dashboard and a beginner can finish it without knowing training terminology.

## Task 4 — Provider access setup

Status: **policy/resolver rebuild complete — no attended-browser executor is implemented or enabled, and every currently listed provider fails closed unless an available route is proved**

Deliverables:

- provider playbook schema and capability-specific route resolver;
- a separate workout-delivery opt-in, destination choice, and agent setup-assistance boundary;
- official individual API/MCP/native-companion routes where the provider permits them;
- attended assisted browsing in Codex desktop when the provider permits it and a reviewed executor exists, placed above file import and below official self-service routes;
- a Garmin fail-closed classification: no assisted reads or writes, with official export/file import and manual entry as the current individual routes and the application/business-reviewed developer program shown as unavailable as ordinary self-service;
- a hard block on both Strava API-to-AI use and automated Strava browsing under current terms;
- Apple Health and Health Connect companion-app routes clearly labeled as requiring native apps;
- Fitbit, Oura, WHOOP, Polar, COROS, and Suunto playbooks that expose only current individual-permitted routes and state unavailable routes honestly;
- FIT, GPX, TCX, and CSV import plus manual check-in fallback;
- browser-read records with `source: <providerId>`, `provenance: "browser_read"`, `ingestionRoute: "browser_read"`, observation/retrieval timestamps, freshness, and local-only normalization;
- user-only login, no credential/MFA/session handling, attended-only browsing, and no scheduled/headless route;
- a specified one-use, expiring write-approval contract with dry-run preview, atomic claim, visible confirmation, and replay rejection for any future provider operation that qualifies;
- source priority, freshness, consent, sign-out/revocation, and delete controls.

The policy, playbooks, resolver, fail-closed Garmin/Strava behavior, copy, and current-route acceptance tests are implemented. The browser-read normalizer and exact-write protocol remain dormant contracts: a real executor must not be added or presented as supported until a first-party source establishes that the specific operation is permitted for an individual. When a provider qualifies, its executor is done only when browser reads retain no page/session material and one exact approval can produce at most one visible write.

## Task 5 — Athlete analysis

Status: **complete — July 18, 2026**

Deliverables:

- starting-stage classification: starter, returning, building, or established;
- goal feasibility and deadline pressure;
- current load, available time, recovery constraints, and missing-data assessment;
- confidence label and plain-language explanation for every recommendation.

Done when the same profile always produces the same non-model baseline analysis and model enrichment cannot override safety or permission rules.

## Task 6 — Training-plan engine

Status: **complete — July 18, 2026**

Deliverables:

- couch-to-active, general cardio, return-to-running, and race-distance paths;
- running, run/walk, strength, mobility, rest, and optional cross-training sessions;
- recommend-for-me mode plus evidence research for named methods;
- no assumption that “Norwegian” or “African” training is one universal template;
- progressive loading, recovery weeks, missed-session handling, and pain-aware adaptation.

Done when each plan explains why its frequency and intensity fit the athlete and no advanced method is assigned to an unsuitable beginner.

## Task 7 — Nutrition companion

Status: **complete — July 18, 2026**

Deliverables:

- opt-out, loose guidance, guided portions, and detailed tracking modes;
- dietary pattern, allergies, intolerances, budget, cooking access, hydration, and routine intake;
- protein powder, creatine, caffeine, medication, and supplement inventory;
- meal and fridge photos with uncertainty confirmation;
- no aggressive calorie or weight target when the athlete requests number-free support or reports relevant risk.

Done when nutrition remains optional, estimates are visibly uncertain, and logging requires confirmation.

## Task 8 — Dashboard rebuild

Status: **complete — July 18, 2026**

Deliverables:

- today view, week plan, strength sessions, recovery, progress, fuel, and decision ledger;
- data freshness and source labels;
- visible approval controls for local plan changes, exact local provider previews, fail-closed provider state, and labeled synthetic actions;
- useful empty, loading, stale-data, offline, and error states.

Done when the dashboard answers “what should I do today, why, and what happens if I approve?” in one screen.

## Task 9 — Codex and ChatGPT automation layer

Status: **complete — July 18, 2026**

Deliverables:

- proposed morning brief, pre-workout check, post-workout reflection, and weekly review;
- user-selected timezone and schedule;
- manual test before scheduling;
- narrow permissions and no unattended external write without the configured approval rule;
- an explicit rule that assisted browsing is unavailable to Scheduled, headless, or unattended execution.

Done when automation setup is optional, previewable, editable, and documented for Codex/ChatGPT scheduled tasks.

## Task 10 — Local reference install experience

Status: **complete — July 18, 2026**

Deliverables:

- one first-run command, setup doctor, environment example, privacy notes, and sample profile;
- no secrets or private athlete data in the repository;
- Windows, macOS, and Linux instructions where supported;
- local demo path that requires no wearable or API key.

Done when a clean clone can reach onboarding and judge mode from the README alone.

## Task 11 — Hardening

Status: **complete (July 18, 2026)**. The release gate passes, the production dependency audit reports zero vulnerabilities, and the full 11-step first-run, plan approval, dashboard activation, desktop/mobile, and manual automation-preview path was rehearsed against isolated local state.

Deliverables:

- unit, API, persistence, browser, accessibility, responsive, and clean-install checks;
- protection against oversized input, invalid state, duplicate actions, and unsafe defaults;
- route-policy tests for official-over-browser-over-file precedence, Garmin fail-closed export/manual resolution, Strava blocks, attended-only enforcement, and the dormant browser-read provenance contract;
- before enabling any provider browser-write executor, acceptance tests for credential redaction, exact one-write approval, expiry, stale-resource rejection, visible confirmation, and replay denial;
- copy and playbook validation that rejects any route not marked and sourced as permitted for an individual;
- a manual release checklist.

Done when all automated checks pass and the primary first-run path is rehearsed from a clean state.

## Task 12 — Hackathon submission pack

Status: **in progress**. Final English copy, the public repository, MIT license, screenshot set, architecture, judging notes, release evidence, and asset captions are ready. Live GPT-5.6 evidence, the `/feedback` session ID, YouTube URL, eligibility confirmations, hackathon registration confirmation, and accepted submission screen remain external checkpoints.

Deliverables:

- final English Devpost copy, public repository, license, screenshots, architecture diagram, and judging notes;
- evidence of the live GPT-5.6 path and Codex build process;
- `/feedback` session ID and final eligibility checklist;
- final Devpost submission confirmation.

Done only when the submission form is accepted before the deadline.

## Task 13 — First-run demo video

Status: **recording pack ready**. The founder still needs to record the real first run and live GPT-5.6 segment, then publish the final public YouTube cut.

The founder records the real first run. StrideOS provides:

- a clean demo athlete and reset command;
- a sub-three-minute shot list and spoken outline;
- the exact moments that show onboarding, strength, data truthfulness, GPT-5.6, Codex, safety, and approval;
- an opening plugin-discovery beat that shows the manifest, five skills, and `build-coach-room` human-review flow;
- one Garmin route-truth beat: show that assisted browsing and workout/calendar/watch delivery are unavailable, then demonstrate the athlete-selected official export/file-import or manual fallback without implying a live provider connection;
- an edit plan, captions, title card, and screenshot assets.

Done when the public YouTube video clearly shows the product working and the narration explains how both Codex and GPT-5.6 were used.

## Task 14 — ChatGPT Work/Codex plugin package

Status: **complete — July 20, 2026**.

Deliverables:

- a validation-ready `plugins/strideos/.codex-plugin/plugin.json` manifest with accurate UI metadata and no unshipped MCP or app claims;
- five focused skills: athlete coaching, training plans, training data, fueling, and coach-room collaboration;
- concise skill references for onboarding authority, method research, provider routes, nutrition boundaries, and human-review permissions;
- plugin assets and a package-level MIT license;
- repository marketplace metadata for the ChatGPT desktop plugin directory;
- repository acceptance tests for manifest structure, exact skill inventory, frontmatter, UI prompts, references, route-safety language, and provider model-context policy;
- official Codex validation of the source plugin, all five skills, and the installed cache copy;
- plugins CLI discovery and a successful local installation test.

Done when a clean clone describes one `strideos` plugin with five skills through the repository marketplace, installs from the relative `./plugins/strideos` path, and loads in a new Work/Codex task after restart.

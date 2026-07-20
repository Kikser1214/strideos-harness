# StrideOS rebuild plan

This plan is the delivery contract for the open-source Build Week rebuild. Every task ends with a runnable result, tests proportional to risk, documentation, and a focused commit.

## Product promise

StrideOS is an installable six-skill plugin for ChatGPT Work mode and Codex, for people who may know nothing about endurance training and for experienced athletes who want an inspectable coaching loop. It gathers the minimum useful context, recommends running and strength, supports optional fueling, official data-route recommendations, and athlete-selected host tools, prepares athlete-chosen coaching rhythms, and can build an athlete-controlled room for a real coach or trusted reviewer. The optional Node/PWA makes those rules testable; it is not the product identity.

The initial product is wellness coaching, not diagnosis, treatment, or emergency care. A safety stop always wins over a training recommendation.

## Task 1 — Product contract and research pack

Deliverables:

- define the beginner-first user journey and safety boundaries;
- create the complete onboarding question inventory;
- document current official provider routes plus the universal host-browser, file-import, and manual-entry tiers truthfully;
- require a first-party source, capability limits, and review date for every official route in a provider playbook;
- anchor general activity, strength, screening, and supplement behavior in primary sources.

Done when the questionnaire has no unexplained field, official route claims have honest capability labels, host browser/computer use is offered only when the surface exposes it, and research links live in the repository.

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

Status: **ownership/resolver rebuild in progress — official recommendations are separate from universal host-browser use and explicitly supplied external tools**

Deliverables:

- provider playbook schema and capability-specific official-route resolver;
- a separate workout-delivery opt-in, destination choice, and agent setup-assistance boundary;
- provider-documented individual API/MCP/native-companion routes;
- attended browser/computer use in the user's authenticated session whenever the current AI surface exposes it, placed above file import and below official self-service routes;
- Garmin's official export/file-import and manual recommendations, plus the attended Garmin Connect flow for one visible approved workout/calendar write;
- Strava's official MCP where available, official export/manual recommendations, and the universal attended host-browser option;
- Apple Health and Health Connect companion-app routes clearly labeled as requiring native apps;
- Fitbit, Oura, WHOOP, Polar, COROS, and Suunto playbooks that document only official routes while leaving host browser/computer use available as the universal second tier;
- FIT, GPX, TCX, and CSV import plus manual check-in fallback;
- browser-read records with `source: <providerId>`, `provenance: "browser_read"`, `ingestionRoute: "browser_read"`, observation/retrieval timestamps, freshness, and local-only normalization;
- user-only login, no credential/MFA/session handling, attended-only browsing, and no scheduled/headless route;
- a one-use, expiring write-approval contract with dry-run preview, atomic claim, visible confirmation, and replay rejection for every browser/provider write;
- an explicit ownership branch: local scripts, other plugins, and user-supplied adapters bypass StrideOS route guidance and remain governed by their host plus ordinary write approval;
- source priority, freshness, consent, sign-out/revocation, and delete controls.

Done when StrideOS provides official recommendations without defining an allowlist; browser/computer use works as a host capability for any provider web app; no unofficial connector recipe ships; explicit external tools are not blocked by plugin policy; browser reads retain no page/session material; and one exact approval can produce at most one visible write.

## Task 5 — Athlete analysis

Status: **complete — July 18, 2026**

Deliverables:

- starting-stage classification: starter, returning, building, or established;
- goal feasibility and deadline pressure;
- current load, available time, recovery constraints, and missing-data assessment;
- confidence label and plain-language explanation for every recommendation.

Done when the same profile always produces the same non-model baseline analysis and model enrichment cannot silently bypass athlete safety or state-change approval.

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
- visible approval controls for local plan changes, exact provider/browser previews, unavailable host capability, and labeled synthetic actions;
- useful empty, loading, stale-data, offline, and error states.

Done when the dashboard answers “what should I do today, why, and what happens if I approve?” in one screen.

## Task 9 — Codex and ChatGPT automation layer

Status: **complete — July 18, 2026**

Deliverables:

- proposed morning brief, pre-workout check, post-workout reflection, and weekly review;
- a dedicated `schedule-coaching` skill that owns scheduled-workflow requests without overlapping ordinary coaching;
- user-selected timezone and schedule;
- manual test before scheduling;
- a human-readable schedule and exact read-only prompt handed to the native ChatGPT/Codex Scheduled tool when available; the plugin never emits raw automation directives or claims installation without confirmation;
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
- route tests for official-over-host-browser-over-file precedence, Garmin and Strava attended flows, attended-only enforcement, and browser-read provenance;
- browser-write acceptance tests for credential redaction, exact one-write approval, expiry, stale-resource rejection, visible confirmation, and replay denial;
- copy and playbook validation that keeps unofficial recipes out of the public package without turning the catalog into an allowlist;
- ownership tests proving an explicitly supplied script/plugin/adapter is handed back to the host rather than blocked by StrideOS;
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
- an opening marketplace-listing beat that shows the manifest, six skills, the read-only `schedule-coaching` contract, and `build-coach-room` human-review flow;
- one Garmin route-truth beat: approved plan → agent opens Garmin Connect in the session the athlete signed into → fills one structured workout → verifies it on the watch calendar;
- an edit plan, captions, title card, and screenshot assets.

Done when the public YouTube video clearly shows the product working and the narration explains how both Codex and GPT-5.6 were used.

## Task 14 — ChatGPT Work/Codex plugin package

Status: **complete — July 20, 2026**.

Deliverables:

- a validation-ready `plugins/strideos/.codex-plugin/plugin.json` manifest with accurate UI metadata and no unshipped MCP or app claims;
- six focused skills: athlete coaching, training plans, training data, fueling, scheduled coaching rhythms, and Training Circle collaboration;
- concise skill references for onboarding authority, method research, official provider recommendations, ownership/extensions, nutrition boundaries, and human-review permissions;
- plugin assets and a package-level MIT license;
- repository marketplace metadata for the ChatGPT desktop plugin directory;
- repository acceptance tests for manifest structure, exact skill inventory, frontmatter, UI prompts, references, attended browser boundaries, and non-authoritative provider guidance;
- official Codex validation of the source plugin, all six skills, and the installed plugin copy;
- a Codex repository-marketplace listing and successful `strideos@strideos` installation test.

Done when the GitHub repository or a local clone can be added as a Codex marketplace, lists `strideos@strideos`, installs through Codex CLI or ChatGPT desktop Plugins Directory, and loads in a new Work/Codex task after restart.

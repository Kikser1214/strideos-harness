# StrideOS rebuild plan

This plan is the delivery contract for the open-source Build Week rebuild. Every task ends with a runnable result, tests proportional to risk, documentation, and a focused commit.

## Product promise

StrideOS is a first-run personal endurance coach for people who may know nothing about training. It gathers the minimum useful context, explains what it knows and does not know, recommends an appropriate running and strength approach, and asks before changing plans, records, calendars, or connected services.

The initial product is wellness coaching, not diagnosis, treatment, or emergency care. A safety stop always wins over a training recommendation.

## Task 1 — Product contract and research pack

Deliverables:

- define the beginner-first user journey and safety boundaries;
- create the complete onboarding question inventory;
- document current wearable, file-import, and manual-entry routes truthfully;
- anchor general activity, strength, screening, and supplement behavior in primary sources.

Done when the questionnaire has no unexplained field, every connector has an honest capability label, and research links live in the repository.

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

Done when a clean GitHub install opens the wizard before the dashboard and a beginner can finish it without knowing training terminology.

## Task 4 — Data connection setup

Status: **complete — July 18, 2026**

Deliverables:

- Garmin and Strava setup contracts;
- Apple Health and Health Connect companion-app routes clearly labeled as requiring native apps;
- Fitbit, Oura, WHOOP, Polar, COROS, and Suunto capability cards;
- FIT, GPX, TCX, and CSV import plus manual check-in fallback;
- source priority, freshness, consent, disconnect, and delete controls.

Done when the UI never labels a planned or simulated connector as connected.

## Task 5 — Athlete analysis

Deliverables:

- starting-stage classification: starter, returning, building, or established;
- goal feasibility and deadline pressure;
- current load, available time, recovery constraints, and missing-data assessment;
- confidence label and plain-language explanation for every recommendation.

Done when the same profile always produces the same non-model baseline analysis and model enrichment cannot override safety or permission rules.

## Task 6 — Training-plan engine

Deliverables:

- couch-to-active, general cardio, return-to-running, and race-distance paths;
- running, run/walk, strength, mobility, rest, and optional cross-training sessions;
- recommend-for-me mode plus evidence research for named methods;
- no assumption that “Norwegian” or “African” training is one universal template;
- progressive loading, recovery weeks, missed-session handling, and pain-aware adaptation.

Done when each plan explains why its frequency and intensity fit the athlete and no advanced method is assigned to an unsuitable beginner.

## Task 7 — Nutrition companion

Deliverables:

- opt-out, loose guidance, guided portions, and detailed tracking modes;
- dietary pattern, allergies, intolerances, budget, cooking access, hydration, and routine intake;
- protein powder, creatine, caffeine, medication, and supplement inventory;
- meal and fridge photos with uncertainty confirmation;
- no aggressive calorie or weight target when the athlete requests number-free support or reports relevant risk.

Done when nutrition remains optional, estimates are visibly uncertain, and logging requires confirmation.

## Task 8 — Dashboard rebuild

Deliverables:

- today view, week plan, strength sessions, recovery, progress, fuel, and decision ledger;
- data freshness and source labels;
- visible approval controls for plan changes and device writes;
- useful empty, loading, stale-data, offline, and error states.

Done when the dashboard answers “what should I do today, why, and what happens if I approve?” in one screen.

## Task 9 — Codex and ChatGPT automation layer

Deliverables:

- proposed morning brief, pre-workout check, post-workout reflection, and weekly review;
- user-selected timezone and schedule;
- manual test before scheduling;
- narrow permissions and no unattended external write without the configured approval rule.

Done when automation setup is optional, previewable, editable, and documented for Codex/ChatGPT scheduled tasks.

## Task 10 — Open-source install experience

Deliverables:

- one first-run command, setup doctor, environment example, privacy notes, and sample profile;
- no secrets or private athlete data in the repository;
- Windows, macOS, and Linux instructions where supported;
- local demo path that requires no wearable or API key.

Done when a clean clone can reach onboarding and judge mode from the README alone.

## Task 11 — Hardening

Deliverables:

- unit, API, persistence, browser, accessibility, responsive, and clean-install checks;
- protection against oversized input, invalid state, duplicate actions, and unsafe defaults;
- a manual release checklist.

Done when all automated checks pass and the primary first-run path is rehearsed from a clean state.

## Task 12 — Hackathon submission pack

Deliverables:

- final English Devpost copy, public repository, license, screenshots, architecture diagram, and judging notes;
- evidence of the live GPT-5.6 path and Codex build process;
- `/feedback` session ID and final eligibility checklist;
- final Devpost submission confirmation.

Done only when the submission form is accepted before the deadline.

## Task 13 — First-run demo video

The founder records the real first run. StrideOS provides:

- a clean demo athlete and reset command;
- a sub-three-minute shot list and spoken outline;
- the exact moments that show onboarding, strength, data truthfulness, GPT-5.6, Codex, safety, and approval;
- an edit plan, captions, title card, and screenshot assets.

Done when the public YouTube video clearly shows the product working and the narration explains how both Codex and GPT-5.6 were used.

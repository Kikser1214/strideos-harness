# StrideOS agent contract

This repository is a beginner-first personal endurance coaching harness. A Codex or ChatGPT agent working here must preserve the distinction between advice, deterministic safety/permission rules, and external actions.

## First run

1. Read `GET /api/bootstrap` or the local state before coaching. If `needsOnboarding` is true, onboarding is the first product flow.
2. Use `rules/onboarding-schema.json` as the question inventory. The web wizard is the default; a conversational agent may gather the same sections one at a time and save drafts through `POST /api/onboarding`.
3. Never silently substitute `data/demo-athlete.json` for a real new user. Synthetic data is judge/demo data and must stay labeled.
4. Optional answers may be skipped. Required answers must be complete before creating the first athlete map.
5. A completed profile with an active safety gate may be saved, but running and strength prescription remain paused until the indicated review is resolved.
6. Conversational onboarding must use plain language. Do not ask a new or inactive athlete to choose among unexplained training systems, intensity models, or coaching jargon.

## Coaching scope

- Support people starting from inactivity, building general cardio, returning to running, training for a race, or maintaining performance.
- Treat strength as a core plan input. Ask about prior/current strength work, weekly frequency, technique confidence, coaching history, equipment, limitations, preferences, and realistic availability. Provide an appropriate strength recommendation whenever the safety gate permits it.
- Include schedule, sleep, stress, work pattern, terrain, climate/access, motivation, recurring barriers, pain, and subjective effort in decisions.
- Nutrition is opt-in. Support loose, guided, detailed, or number-free modes. Meal/fridge image outputs are estimates and require confirmation before logging.
- Inventory protein powder, creatine, caffeine, other supplements, medications, allergies, medically prescribed diets, and number-free preference. Do not assume a supplement is needed or replace qualified medical/dietetic advice.
- Read `GET /api/nutrition` before showing fuel guidance. The effective mode and number policy are deterministic and cannot be relaxed by model output.
- Number-free preference, a relevant tracking concern, an under-18 profile, “do not use” weight context, or clinician-prescribed constraints win over detailed tracking.
- Never claim an image is safe for a declared allergy or cross-contact risk. Ask the athlete to verify ingredients, preparation, sauces, cooking fats, and portions.
- A meal estimate becomes logged data only through its linked server-stored `log_food` decision and explicit confirmation. Preserve corrections separately; never replace the estimate with client-supplied content.
- Never persist raw meal or fridge images in the included state file. Allow deletion of every normalized meal record.

## Training-method research

- “Recommend for me” is the default for users who do not know training systems.
- If the athlete is a starter, says they do not know the methods, or asks StrideOS to choose, record `recommend_for_me` and lead with a recommendation instead of another style-selection question. Subject to the safety gate and realistic availability, explain the default as three separated run-walk-run sessions plus two short technique-first strength sessions per week. Progress by gently lengthening the easy running intervals and shortening the walking intervals only when pain, recovery, and recent effort support it.
- Offer easy cycling as optional low-impact cross-training when the athlete has bike access, wants it, and has enough schedule and recovery room. Present it as an alternative/supporting aerobic session, not mandatory extra load, a replacement for strength, or catch-up work.
- After making the beginner recommendation, ask only for a practical constraint or preference that can change it, such as available days, bike access, pain, or whether the proposed starting frame feels realistic. Do not respond with a menu of method names unless the athlete explicitly asks to compare methods.
- A named method is a research request, not a command. Verify the exact method from current primary or authoritative sources, explain what population it was designed for, and check the athlete's experience, recovery, schedule, and goal before proposing it.
- Do not treat “Norwegian training” as automatic double-threshold work or “African training” as one universal system. Avoid advanced threshold density for unsuitable beginner or returning profiles.
- Keep the deterministic baseline in `src/onboarding.mjs`; model enrichment may explain or personalize it but cannot override safety or permission gates.

## Training plans

- Read `GET /api/training-plan` after onboarding and athlete analysis. Treat its preview as a proposal, never as an active prescription.
- Preserve the deterministic baseline in `src/training-plan.mjs`: stage, available days, recovery, pain, and intensity tolerance bound frequency and intensity.
- Strength remains part of each eligible block. Week four reduces load before the next block is proposed.
- A missed session never authorizes doubling the next day. Two or more missed sessions lead to repeating or simplifying the week.
- Named advanced or regional methods stay on the conservative baseline until their research gate is completed and suitability is reviewed.
- Only the server-stored `change_training_plan` decision can activate its linked plan. Never infer approval from chat language or replace the stored plan with client content.
- New safety or pain evidence wins over an active plan. A plan marked `review_required` is not active and must be reassessed.

## Data truth

- Use `docs/ONBOARDING_RESEARCH.md` and `listConnectors()` for connector language.
- Garmin bridge, simulation, planned OAuth, native companion, file import, manual, and connected are different states. Never collapse them into “connected.”
- Apple Health requires an authorized iOS route. Health Connect requires an Android route. Manual check-ins are a valid primary source.
- Label every signal with source and freshness when the dashboard supports it. Missing wearable data lowers confidence; it does not exclude the athlete.
- Read `GET /api/dashboard` before answering what the athlete should do today. A pending or review-required plan is not an active prescription.
- Keep planned sessions, observed activities, and confirmed completion as separate concepts. Until explicit matching exists, never infer plan completion from an import.
- Do not calculate or display a synthetic personal readiness score. Unknown, stale, and missing evidence must stay visible.

## Workout annotations

- Treat the inline workout note as athlete-authored evidence attached to the exact server-authoritative session snapshot.
- Saving a note is not permission to change, move, cancel, or push a workout. Any resulting plan change still requires its own server-stored `change_training_plan` decision and explicit approval.
- Feed the latest annotation into the next coaching turn. Explain the proposed response in plain language and preserve the original note separately.
- Pain of 4/10 or higher in a workout annotation pauses the active block for review, matching the manual check-in safety boundary.
- Allow every workout annotation to be deleted. Never present a deleted note as current evidence.

## Actions and automations

- Follow `rules/harness-policy.json`. Unknown actions stop by default.
- Plan changes, food logging, and device/calendar writes require the configured approval.
- Morning, pre-workout, post-workout, and weekly automations begin as proposals. Test prompts manually before scheduling and keep permissions narrow.
- Never create a scheduled task merely because onboarding selected one. Show the schedule, prompt, data access, and approval behavior first.
- Use `npm run brief -- --kind <morning_brief|pre_workout|post_workout|weekly_review>` as the read-only scheduled-task contract. Treat its JSON as authoritative and never substitute the synthetic fixture for missing personal state.
- A scheduled task may summarize and ask questions. It may not modify files, activate or change a plan, log food, or write to Garmin/calendar/connectors. Return those actions to interactive approval.

## Self-service connector setup

- When device delivery is requested, read `delivery.workoutDeliveryTarget`, `delivery.connectorSetupMode`, `GET /api/connectors`, and `docs/SELF_SERVICE_CONNECTORS.md` before proposing setup.
- Reading history, configuring an adapter, authenticating an athlete, and writing a workout are separate permissions and separate proof states.
- Recommend official provider routes first. The optional Garmin community bridge is local, self-hosted, unofficial, user-selected, and may break; personal or non-commercial use does not make it official.
- `guide_only` permits explanation only. `allow_local_setup_after_review` permits proposing exact local commands and file changes, but installation, authentication, and configuration still require review before execution. `not_now` stops setup.
- Never ask a user to paste a vendor password, MFA code, refresh token, or token directory contents into chat. Keep connector tokens local/private and out of Git, Sites, logs, screenshots, and StrideOS state.
- A configured URL, dependency, or healthy bridge is not proof of an authenticated athlete. Verify adapter health, authentication with the correct account, a dry-run, and then one exact separately approved test workout.
- Keep the included community Garmin bridge on loopback. Do not weaken its host restriction or expose an unofficial connector publicly.

## Development commands

```bash
npm start
npm test
npm run check
npm run reset
```

Run tests and syntax checks after behavior changes. Browser-check the clean first-run path on desktop and mobile for onboarding UI changes.

Localhost is the default. A non-local `HOST` must use a long `STRIDEOS_ACCESS_TOKEN`; never commit or print that key. The browser keeps it in session storage only. See `docs/REMOTE_COMPANION.md` before describing the dashboard as remotely available.

For clean-install support, run `npm run doctor` before guessing about Node, dependencies, `.env`, state permissions, port conflicts, or missing repository artifacts. Never print secret values. `data/sample-profile.json` is synthetic documentation/test input and must not be silently loaded as a real athlete.

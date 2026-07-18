# StrideOS agent contract

This repository is a beginner-first personal endurance coaching harness. A Codex or ChatGPT agent working here must preserve the distinction between advice, deterministic safety/permission rules, and external actions.

## First run

1. Read `GET /api/bootstrap` or the local state before coaching. If `needsOnboarding` is true, onboarding is the first product flow.
2. Use `rules/onboarding-schema.json` as the question inventory. The web wizard is the default; a conversational agent may gather the same sections one at a time and save drafts through `POST /api/onboarding`.
3. Never silently substitute `data/demo-athlete.json` for a real new user. Synthetic data is judge/demo data and must stay labeled.
4. Optional answers may be skipped. Required answers must be complete before creating the first athlete map.
5. A completed profile with an active safety gate may be saved, but running and strength prescription remain paused until the indicated review is resolved.

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

## Actions and automations

- Follow `rules/harness-policy.json`. Unknown actions stop by default.
- Plan changes, food logging, and device/calendar writes require the configured approval.
- Morning, pre-workout, post-workout, and weekly automations begin as proposals. Test prompts manually before scheduling and keep permissions narrow.
- Never create a scheduled task merely because onboarding selected one. Show the schedule, prompt, data access, and approval behavior first.
- Use `npm run brief -- --kind <morning_brief|pre_workout|post_workout|weekly_review>` as the read-only scheduled-task contract. Treat its JSON as authoritative and never substitute the synthetic fixture for missing personal state.
- A scheduled task may summarize and ask questions. It may not modify files, activate or change a plan, log food, or write to Garmin/calendar/connectors. Return those actions to interactive approval.

## Development commands

```bash
npm start
npm test
npm run check
npm run reset
```

Run tests and syntax checks after behavior changes. Browser-check the clean first-run path on desktop and mobile for onboarding UI changes.

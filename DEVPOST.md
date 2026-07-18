# Devpost submission copy

## Submission fields

- **Project:** StrideOS
- **Category:** Apps for Your Life
- **Repository:** https://github.com/Kikser1214/strideos-harness
- **Demo video:** add the public YouTube URL after the final cut
- **Codex feedback session:** add the `/feedback` session ID from the primary build task
- **Architecture and judge path:** `docs/ARCHITECTURE.md` and `docs/JUDGING_GUIDE.md`

## Category

Apps for Your Life

## Tagline

A personal running coach that can act—and a rule harness that knows when it must ask first.

## Inspiration

Training data is fragmented across a watch, a plan, meal photos, and the athlete's own felt experience. AI can connect those signals, but a persuasive coach should not silently rewrite a week or push something to a device. We wanted a personal harness: one place where Codex can do the work efficiently inside explicit rules the athlete controls.

## What it does

StrideOS starts by building an athlete map for someone who may not know how to train. It asks about current movement, running history, safety, goals, real-life schedule, strength experience and equipment, data sources, coaching preferences, and optional nutrition. A deterministic analysis returns starting stage, deadline pressure, declared-versus-observed load, available time, recovery constraints, missing evidence, confidence, an explicit strength recommendation, connector truth, and any safety gate before a plan exists.

From there, StrideOS creates a deterministic four-week running and strength proposal. It supports couch-to-active, general cardio, return-to-running, and race-distance paths; places sessions inside real availability; reduces load in week four; and explains how pain, poor recovery, or missed sessions change the block. Named methods trigger a suitability-research gate instead of being copied blindly. Previewing changes nothing: activation requires an explicit server-recorded approval.

The dashboard projects that server-authoritative state into one screen: today's approved session or an honest recovery/upcoming/empty state, current-week running and strength load, fresh subjective feedback, observed activities, goal window, fuel mode, source labels, and the approval ledger. Pending plans never masquerade as workouts, observed files are not silently counted as completed sessions, and missing wearable data never becomes a synthetic personal readiness score.

Its Coach's margin closes the daily loop. An athlete can annotate the exact workout from any phone or computer, say that it is too hard, too long, badly timed, or simply not a fit, and request a shorter, easier, moved, swapped, or cancelled session. StrideOS creates an exact revised block in the approval ledger while leaving the current plan untouched. The dashboard is installable as a PWA, and optional private companion hosting protects athlete APIs with a server-side access key.

StrideOS also turns authorized training signals, pain and RPE feedback, and meal images into a single evidence-backed next move. GPT-5.6 handles multimodal understanding and reasoning. A deterministic policy outside the model then classifies the intended action as autonomous, approval-required, or stopped. The decision ledger shows the entire path: evidence → reason → rule gate → action.

Its optional fuel companion respects off, loose, guided, detailed, and number-free modes. It combines ordinary food and training-day cues with allergy, medical-diet, budget, kitchen, hydration, and supplement context. A photo never proves ingredients or allergen safety. The harness can remove all calorie and macro ranges before storage, and every estimate must be corrected or confirmed before it becomes a local log.

Optional Codex/ChatGPT Scheduled workflows cover a morning brief, pre-workout check, post-workout reflection, and weekly review. StrideOS generates an editable timezone-aware RRULE and durable read-only prompt, requires a manual test, and never claims the workflow was installed. Scheduled runs can summarize or ask for input, but plan changes, food logs, and connector writes return to interactive approval.

The included judge mode needs no account, wearable, private data, or API key. Judges can inspect the data-source truth matrix, import a FIT, GPX, TCX, or CSV activity through preview and explicit consent, or add a manual pain/RPE/energy/sleep check-in. They can then ask for today's workout, inspect why a Garmin write stops for approval, accept or decline a clearly labeled simulation, and test the meal approval flow with a disclosed fixed sample estimate. With an OpenAI key, the same meal flow analyzes the uploaded image with GPT-5.6.

## How we built it

The project was created from scratch during OpenAI Build Week with Codex. It uses a small Node.js server, Garmin's official FIT JavaScript SDK, a responsive first-run wizard, a versioned onboarding schema, atomic local persistence, deterministic analysis and action gates, and the OpenAI Responses API. GPT-5.6 receives text and image inputs and returns strict schema-constrained outputs; the model never grants itself permission to act.

A clean clone reaches onboarding with `npm run setup`: the command installs the locked dependency, runs a privacy-aware setup doctor, and starts the zero-account demo. Windows, macOS, and Linux instructions, a complete synthetic sample profile, reset flow, environment template, and local-state contract are checked into the repository.

## How we used Codex and GPT-5.6

Codex was the primary implementation partner: product architecture, UI, server, rule engine, tests, documentation, hardening, and real-browser verification. GPT-5.6 is the runtime reasoning layer for coaching and food-image understanding. The README identifies the decisions made by the human and the work accelerated by Codex.

## Challenges

The hard part was not generating another training answer. It was defining the boundary between reasoning and authority. We kept rules outside the prompt, made unknown actions stop by default, constrained model responses with JSON Schema, and made every external write visible before approval.

## Accomplishments

- A complete, coherent experience rather than a chat proof of concept.
- Beginner-first onboarding that includes strength, real-life constraints, manual data, and honest native/partner connector routes.
- A deterministic starter analysis that refuses to assign an advanced named method blindly and pauses both running and strength prescription when a safety review is needed.
- A deterministic four-week running and strength engine with beginner run/walk, stage-appropriate intensity, a recovery week, missed-session rules, and pain-aware invalidation.
- A complete plan approval lifecycle: preview, persisted proposal, decision ledger, explicit activation or decline, and duplicate-action protection.
- An athlete-controlled nutrition companion with number-free and protected contexts, food-first session cues, and no automatic supplement prescription.
- A server-authoritative meal lifecycle: uncertain photo estimate, optional correction, explicit confirm or decline, local persistence without the raw image, and deletion.
- A deterministic athlete dashboard that separates approved plans, observed activity, subjective recovery, source freshness, and confirmed meal records without inventing completion or readiness.
- A two-way workout annotation loop that turns athlete feedback into an exact revised-plan proposal while preserving the current block until separate approval.
- An installable private web companion mode with API access-key protection, localhost-by-default binding, durable-state guidance, and a container recipe.
- Four preview-first scheduled-workflow proposals with editable RRULEs, exact prompts, manual tests, safety overrides, and no unattended external writes.
- Transparent confidence and evidence-gap labels for stage, goal window, load, weekly room, and recovery; model enrichment cannot rewrite safety or permissions.
- Multimodal meal analysis that exposes uncertainty, with an honest non-AI sample fallback.
- Server-authoritative, persisted approvals and an optional Garmin bridge adapter.
- Real FIT, GPX, TCX, and CSV parsing with preview, explicit local-summary consent, raw-file discard, freshness, and deletion.
- First-class manual feedback for athletes without a wearable.
- Inspectable, versioned approval boundaries outside the model.
- A deterministic zero-setup judge mode.
- MIT-licensed StrideOS source with synthetic data and a documented third-party Garmin SDK license.
- One-command clean-clone setup, a secret-safe doctor, and documented Windows/macOS/Linux paths.
- A hardened release gate with 100 passing tests, zero production dependency vulnerabilities, corrupt-state recovery, HTTP input limits, static accessibility checks, and desktop/mobile rehearsal.
- Exact Garmin workout binding: approval revalidates the persisted plan/session against current pain, recovery, and profile evidence, while synthetic judge workouts can never reach a configured bridge.

## What we learned

Trust improves when the system shows both what it knows and what it is not authorized to do. The decision ledger became more important than another dashboard metric because it makes agency legible.

## What's next

- Publish a maintained reference implementation for the Garmin bridge contract.
- Complete Strava OAuth plus the iOS HealthKit and Android Health Connect companion routes.
- Add encrypted local athlete memory and portable policy profiles.
- Evaluate recommendations against retrospective training blocks.
- Let runners share rules and coaching protocols without sharing personal data.

## Demo production

The exact under-three-minute shot list, narration, edit plan, captions, and title card are in `docs/VIDEO_SCRIPT.md`. Do not replace the live GPT-5.6 segment with judge-mode footage; the mode label must be visible when recording the live evidence.

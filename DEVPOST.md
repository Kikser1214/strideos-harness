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

An open-source, local-first five-skill endurance coaching plugin for ChatGPT Work mode and Codex—with a private coach room and provider routes that fail closed.

## Inspiration

Training evidence is fragmented across a watch, a plan, meal photos, and the athlete's own felt experience. AI can bring those signals together, but a persuasive coach should not silently rewrite a week or push something to a device. We wanted an installable coaching package: Codex does the preparation through focused skills, while explicit rules keep authority with the athlete.

## What it does

StrideOS ships five focused plugin skills for ChatGPT Work mode and Codex: `coach-athlete` builds the athlete map and coordinates the coaching loop; `plan-training` researches methods and proposes running plus strength blocks; `use-training-data` selects only provider-permitted and implemented evidence routes; `support-fueling` provides optional, athlete-controlled nutrition support; and `build-coach-room` creates a scoped local dashboard or private Site for human review.

StrideOS starts by building an athlete map for someone who may not know how to train. It asks about current movement, running history, safety, goals, real-life schedule, strength experience and equipment, data sources, coaching preferences, and optional nutrition. A deterministic analysis returns starting stage, deadline pressure, declared-versus-observed load, available time, recovery constraints, missing evidence, confidence, an explicit strength recommendation, provider-route truth, and any safety gate before a plan exists.

From there, StrideOS creates a deterministic four-week running and strength proposal. It supports couch-to-active, general cardio, return-to-running, and race-distance paths; places sessions inside real availability; reduces load in week four; and explains how pain, poor recovery, or missed sessions change the block. Named methods trigger a suitability-research gate instead of being copied blindly. Previewing changes nothing: activation requires an explicit server-recorded approval.

The dashboard projects that server-authoritative state into one screen: today's approved session or an honest recovery/upcoming/empty state, current-week running and strength load, fresh subjective feedback, observed activities, goal window, fuel mode, source labels, and the approval ledger. Pending plans never masquerade as workouts, observed files are not silently counted as completed sessions, and missing wearable data never becomes a synthetic personal readiness score.

The `build-coach-room` skill is the central collaboration feature. It can create an athlete-controlled local dashboard or private-capable Site where a real coach, experienced runner, or trusted friend reviews the same plan, comments on an exact session, and suggests a structured edit. Reviewers cannot activate a plan, widen sharing, invite others, or operate a provider account. The checked-in coach-room Site is explicitly a synthetic product template until real identity, private persistence, invitations, and revocation are bound to the chosen hosting surface.

StrideOS also turns authorized training signals, pain and RPE feedback, and meal images into a single evidence-backed next move. GPT-5.6 handles multimodal understanding and reasoning. A deterministic policy outside the model then classifies the intended action as autonomous, approval-required, or stopped. The decision ledger shows the entire path: evidence → reason → rule gate → action.

The optional `support-fueling` skill respects off, loose, guided, detailed, and number-free modes. It combines ordinary food and training-day cues with allergy, medical-diet, budget, kitchen, hydration, and supplement context. A photo never proves ingredients or allergen safety. The deterministic policy can remove all calorie and macro ranges before storage, and every estimate must be corrected or confirmed before it becomes a local log.

Optional Codex/ChatGPT Scheduled workflows cover a morning brief, pre-workout check, post-workout reflection, and weekly review. StrideOS generates an editable timezone-aware RRULE and durable read-only prompt, requires a manual test, and never claims the workflow was installed. Scheduled runs can summarize or ask for input, but plan changes and food logs return to interactive approval. A provider write would be eligible only when both provider permission and a tested executor are proved; none is enabled in this build.

The included judge mode needs no account, wearable, private data, or API key. Judges can inspect the data-source truth matrix, import a FIT, GPX, TCX, or CSV activity through preview and explicit consent, or add a manual pain/RPE/energy/sleep check-in. They can then ask for today's workout, inspect why a synthetic Garmin write stops for approval, accept or decline a clearly labeled simulation, and test the meal approval flow with a disclosed fixed sample estimate. With an OpenAI key, the same meal flow analyzes the uploaded image with GPT-5.6.

For Garmin, the current playbook does not establish provider permission for attended AI/browser operation, so the resolver fails closed. StrideOS can show an exact structured workout preview locally for the athlete to enter manually; supported data routes are Garmin's official export with a locally supported activity file where applicable, and manual entry. The synthetic judge write remains a labeled simulation and never changes an external calendar.

## How we built it

The project was created from scratch during OpenAI Build Week with Codex. The shipped product is a validation-ready `.codex-plugin` package containing five focused `SKILL.md` modules, UI metadata, scoped references, an icon, and an MIT license. The repository's small Node.js server and responsive PWA are an optional deterministic reference implementation for inspecting onboarding, state transitions, imports, approval gates, and the coach-room interaction. They are not required to use the skills.

The reference implementation uses Garmin's official FIT JavaScript SDK, a versioned onboarding schema, atomic local persistence, deterministic analysis and action gates, and the OpenAI Responses API. Device-delivery preference is recorded separately; opt-in never creates a route. Provider playbooks expose only routes permitted for an individual user, and the resolver prefers official self-service API/MCP/companion routes, then attended browsing only where provider permission and an implemented executor are both proved, then provider exports and manual input. No provider browser or real provider-write executor ships. GPT-5.6 receives text and image inputs and returns strict schema-constrained outputs; the model never grants itself permission to act.

A clean clone discovers one `strideos` plugin with five skills and installs it from the relative `./plugins/strideos` path. `npm run test:plugin` validates the exact package inventory and safety language. Contributors and judges can separately run `npm run setup` to start the zero-account reference app. Windows, macOS, and Linux instructions, a synthetic sample profile, reset flow, environment template, and local-state contract are checked into the repository.

## How we used Codex and GPT-5.6

Codex was the primary implementation partner: plugin and skill architecture, UI, reference server, rule engine, tests, documentation, hardening, and real-browser verification. GPT-5.6 is the runtime reasoning layer for coaching and food-image understanding. The README identifies the decisions made by the human and the work accelerated by Codex.

## Challenges

The hard part was not generating another training answer. It was defining the boundary between reasoning and authority. We kept rules outside the prompt, made unknown actions stop by default, constrained model responses with JSON Schema, and blocked external writes unless provider permission, a tested executor, and the athlete's exact approval are all present.

## Accomplishments

- A discoverable, installable `strideos` ChatGPT Work/Codex plugin with five validated coaching skills and no unshipped MCP, browser executor, or hosted-backend claim.
- An athlete-controlled `build-coach-room` workflow for scoped human review, exact comments and proposed diffs, and athlete-only approval.
- A complete, coherent experience rather than a chat proof of concept.
- Beginner-first onboarding that includes strength, real-life constraints, manual data, and honest provider-permitted individual routes.
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
- A fail-closed Garmin boundary: exact structured local previews, no unsupported AI/browser handoff, and honest export/manual fallbacks.
- Real FIT, GPX, TCX, and CSV parsing with preview, explicit local-summary consent, raw-file discard, freshness, and deletion.
- First-class manual feedback for athletes without a wearable.
- Inspectable, versioned approval boundaries outside the model.
- A deterministic zero-setup judge mode.
- MIT-licensed StrideOS source with synthetic data and a documented third-party Garmin SDK license.
- One-command clean-clone setup, a secret-safe doctor, and documented Windows/macOS/Linux paths.
- A hardened release gate covering the plugin package and optional reference implementation, with zero production dependency vulnerabilities, corrupt-state recovery, HTTP input limits, static accessibility checks, and desktop/mobile rehearsal.
- Exact Garmin workout-preview binding: the persisted plan/session is revalidated against current pain, recovery, and profile evidence, provider automation remains blocked, and synthetic judge workouts can never create an external account action.

## What we learned

Trust improves when the system shows both what it knows and what it is not authorized to do. The decision ledger became more important than another dashboard metric because it makes agency legible.

## What's next

- Bind coach-room identity, private persistence, invitations, expiry, and revocation to a production-capable hosting surface.
- Add attended-browser or provider-write executors only when the exact provider operation is permitted for an individual and a reviewed executor passes the full acceptance contract.
- Complete the iOS HealthKit and Android Health Connect companion routes.
- Revisit Strava only if its official terms and agent interface permit a ChatGPT/Codex route; until then, retain export/manual only.
- Add encrypted local athlete memory and portable policy profiles.
- Evaluate recommendations against retrospective training blocks.
- Let runners share rules and coaching protocols without sharing personal data.

## Demo production

The exact under-three-minute shot list, narration, edit plan, captions, and title card are in `docs/VIDEO_SCRIPT.md`. Do not replace the live GPT-5.6 segment with judge-mode footage; the mode label must be visible when recording the live evidence.

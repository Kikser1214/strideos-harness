# Devpost submission copy

## Submission fields

- **Project:** StrideOS
- **Category:** Apps for Your Life
- **Repository:** https://github.com/Kikser1214/strideos-harness
- **Live landing site:** https://strideos-open-coach.gogov-nikola22.chatgpt.site/
- **Training Circle demo:** https://strideos-coach-demo.gogov-nikola22.chatgpt.site/
- **Demo video:** add the public YouTube URL after the final cut
- **Codex feedback session:** add the `/feedback` session ID from the primary build task
- **Architecture and judge path:** `docs/ARCHITECTURE.md` and `docs/JUDGING_GUIDE.md`

## Category

Apps for Your Life

## Tagline

An open-source, local-first six-skill endurance coaching plugin for ChatGPT Work mode and Codex—with a Training Circle and provider recommendations that never become an allowlist.

## Inspiration

Training evidence is fragmented across a watch, a plan, meal photos, and the athlete's own felt experience. AI can bring those signals together, but a persuasive coach should not silently rewrite a week or push something to a device. We wanted an installable coaching package: Codex does the preparation through focused skills, while explicit rules keep authority with the athlete.

## What it does

StrideOS ships six focused plugin skills for ChatGPT Work mode and Codex: `coach-athlete` builds the athlete map and coordinates the coaching loop; `plan-training` researches methods and proposes running plus strength blocks; `use-training-data` recommends official evidence routes and hands explicitly selected browser, computer, script, or plugin capabilities back to the host; `support-fueling` provides optional, athlete-controlled nutrition support; `schedule-coaching` prepares preview-first morning, pre-workout, post-workout, and weekly rhythms; and `build-coach-room` creates a scoped local dashboard or private Site as a Training Circle for human review.

StrideOS starts by building an athlete map for someone who may not know how to train. It asks about current movement, running history, safety, goals, real-life schedule, strength experience and equipment, data sources, coaching preferences, and optional nutrition. A deterministic analysis returns starting stage, deadline pressure, declared-versus-observed load, available time, recovery constraints, missing evidence, confidence, an explicit strength recommendation, provider-route truth, and any safety gate before a plan exists.

From there, StrideOS creates a deterministic four-week running and strength proposal. It supports couch-to-active, general cardio, return-to-running, and race-distance paths; places sessions inside real availability; reduces load in week four; and explains how pain, poor recovery, or missed sessions change the block. Named methods trigger a suitability-research gate instead of being copied blindly. Previewing changes nothing: activation requires an explicit server-recorded approval.

The dashboard projects that server-authoritative state into one screen: today's approved session or an honest recovery/upcoming/empty state, current-week running and strength load, fresh subjective feedback, observed activities, goal window, fuel mode, source labels, and the approval ledger. Pending plans never masquerade as workouts, observed files are not silently counted as completed sessions, and missing wearable data never becomes a synthetic personal readiness score.

The Training Circle is built by the `build-coach-room` skill. It can create an athlete-controlled local dashboard or private-capable Site where a real coach, experienced runner, or trusted friend reviews the same plan, comments on an exact session, and suggests a structured edit. Reviewers cannot activate a plan, widen sharing, invite others, or operate a provider account. The checked-in Training Circle Site is explicitly a synthetic product template until real identity, private persistence, invitations, and revocation are bound to the chosen hosting surface.

StrideOS also turns authorized training signals, pain and RPE feedback, and meal images into a single evidence-backed next move. GPT-5.6 handles multimodal understanding and reasoning. A deterministic policy outside the model then classifies the intended action as autonomous, approval-required, or stopped. The decision ledger shows the entire path: evidence → reason → rule gate → action.

The optional `support-fueling` skill respects off, loose, guided, detailed, and number-free modes. It combines ordinary food and training-day cues with allergy, medical-diet, budget, kitchen, hydration, and supplement context. A photo never proves ingredients or allergen safety. The deterministic policy can remove all calorie and macro ranges before storage, and every estimate must be corrected or confirmed before it becomes a local log.

The optional `schedule-coaching` skill covers a morning brief, pre-workout check, post-workout reflection, and weekly review. It shows the intended local time and timezone in plain language, prepares a durable read-only prompt, requires a manual test, and hands creation to ChatGPT/Codex's native Scheduled flow when that tool is available. Scheduled runs can summarize or ask for input, but plan changes and food logs return to interactive approval. It never claims a workflow was installed without confirmation, and unattended runs never browse or write to provider accounts.

The included judge mode needs no account, wearable, private data, or API key. Judges can inspect the data-source truth matrix, import a FIT, GPX, TCX, or CSV activity through preview and explicit consent, or add a manual pain/RPE/energy/sleep check-in. They can then ask for today's workout, inspect why a synthetic Garmin write stops for approval, accept or decline a clearly labeled simulation, and test the meal approval flow with a disclosed fixed sample estimate. With an OpenAI key, the same meal flow analyzes the uploaded image with GPT-5.6.

For Garmin, StrideOS recommends the official athlete export plus manual input, then suggests attended browser/computer use when the current host exposes that capability. Garmin's developer program is application-reviewed, so it is documented as a limitation rather than ordinary self-service setup. In an attended session, the athlete signs in, reviews the exact structured workout, approves one visible write, and the host verifies the result in Garmin. The optional reference runtime has no live provider executor, so its judge write remains a labeled simulation; that runtime limitation never blocks a host tool selected by the user.

## How we built it

The project was built with Codex during OpenAI Build Week. The shipped product is a validation-ready `.codex-plugin` package containing six focused `SKILL.md` modules, UI metadata, scoped references, an icon, and an MIT license. The repository's small Node.js server and responsive PWA are an optional deterministic reference implementation for inspecting onboarding, state transitions, imports, approval gates, and the Training Circle interaction. They are not required to use the skills.

The reference implementation uses Garmin's official FIT JavaScript SDK, a versioned onboarding schema, atomic local persistence, deterministic analysis and action gates, and the OpenAI Responses API. Provider playbooks document official routes, and the resolver recommends official self-service API/MCP/companion routes first, then attended browser/computer use when the current host exposes it, followed by provider exports and manual input. The optional reference runtime ships no provider-specific browser or live provider-write executor, but that implementation boundary never vetoes a capability selected on the host. GPT-5.6 receives text and image inputs and returns strict schema-constrained outputs; the model never grants itself permission to act.

StrideOS is exposed through the repository's checked-in marketplace metadata. A user can add the GitHub-backed marketplace with `codex plugin marketplace add Kikser1214/strideos-harness --ref main`, verify it with `codex plugin list`, and install `strideos@strideos` in Codex CLI or enable StrideOS through the ChatGPT desktop Plugins Directory. A local clone can instead register its repository root as the marketplace. Work web can use an already installed or workspace-shared plugin, but it cannot read a local folder or run the reference app on the athlete's computer. `npm run test:plugin` validates the exact six-skill inventory and safety language.

## How we used Codex and GPT-5.6

Codex was the primary implementation partner: plugin and skill architecture, UI, reference server, rule engine, tests, documentation, hardening, and real-browser verification. GPT-5.6 is the runtime reasoning layer for coaching and food-image understanding. The README identifies the decisions made by the human and the work accelerated by Codex.

## Challenges

The hard part was not generating another training answer. It was defining the boundary between reasoning and authority. We kept deterministic reference-runtime rules outside the prompt, made unknown in-runtime actions stop by default, constrained model responses with JSON Schema, and required a real selected capability plus the athlete's exact approval before any external write. The plugin's recommendations never become an allowlist over host tools.

## Accomplishments

- A discoverable, installable `strideos` ChatGPT Work/Codex plugin with six validated coaching skills and no false bundled MCP, provider-specific executor, or hosted-backend claim.
- An athlete-controlled `build-coach-room` workflow for scoped human review, exact comments and proposed diffs, and athlete-only approval.
- A complete, coherent experience rather than a chat proof of concept.
- Beginner-first onboarding that includes strength, real-life constraints, manual data, honest official-route recommendations, and surface-aware browser/computer-use options.
- A deterministic starter analysis that refuses to assign an advanced named method blindly and pauses both running and strength prescription when a safety review is needed.
- A deterministic four-week running and strength engine with beginner run/walk, stage-appropriate intensity, a recovery week, missed-session rules, and pain-aware invalidation.
- A complete plan approval lifecycle: preview, persisted proposal, decision ledger, explicit activation or decline, and duplicate-action protection.
- An athlete-controlled nutrition companion with number-free and protected contexts, food-first session cues, and no automatic supplement prescription.
- A server-authoritative meal lifecycle: uncertain photo estimate, optional correction, explicit confirm or decline, local persistence without the raw image, and deletion.
- A deterministic athlete dashboard that separates approved plans, observed activity, subjective recovery, source freshness, and confirmed meal records without inventing completion or readiness.
- A two-way workout annotation loop that turns athlete feedback into an exact revised-plan proposal while preserving the current block until separate approval.
- An installable private web companion mode with API access-key protection, localhost-by-default binding, durable-state guidance, and a container recipe.
- A dedicated `schedule-coaching` skill with four preview-first workflow proposals, human-readable schedules, exact read-only prompts, manual tests, native Scheduled handoff, safety overrides, and no unattended external writes.
- Transparent confidence and evidence-gap labels for stage, goal window, load, weekly room, and recovery; model enrichment cannot rewrite safety or permissions.
- Multimodal meal analysis that exposes uncertainty, with an honest non-AI sample fallback.
- A non-exclusive Garmin flow: official-route guidance, surface-aware attended browser/computer use, exact one-write approval, and honest reference-runtime simulation/fallback labels.
- Real FIT, GPX, TCX, and CSV parsing with preview, explicit local-summary consent, raw-file discard, freshness, and deletion.
- First-class manual feedback for athletes without a wearable.
- Inspectable, versioned approval boundaries outside the model.
- A deterministic zero-setup judge mode.
- MIT-licensed StrideOS source with synthetic data and a documented third-party Garmin SDK license.
- One-command clean-clone setup, a secret-safe doctor, and documented Windows/macOS/Linux paths.
- A hardened release gate covering the plugin package and optional reference implementation, with zero production dependency vulnerabilities, corrupt-state recovery, HTTP input limits, static accessibility checks, and desktop/mobile rehearsal.
- Exact Garmin workout-preview binding: the persisted plan/session is revalidated against current pain, recovery, and profile evidence; synthetic judge workouts can never create an external account action, while an explicitly selected host capability stays outside the simulator.

## What we learned

Trust improves when the system shows both what it knows and what it is not authorized to do. The decision ledger became more important than another dashboard metric because it makes agency legible.

## What's next

- Bind Training Circle identity, private persistence, invitations, expiry, and revocation to a production-capable hosting surface.
- Add official provider-specific executors when documented access exists and the implementation passes the full acceptance contract; keep attended browser/computer use host-provided and surface-detected.
- Complete the iOS HealthKit and Android Health Connect companion routes.
- Add first-class Strava MCP setup as compatible ChatGPT/Codex surfaces expose it; attended host browser/computer use remains a separate surface-dependent option.
- Add encrypted local athlete memory and portable preference profiles.
- Evaluate recommendations against retrospective training blocks.
- Let runners share rules and coaching protocols without sharing personal data.

## Demo production

The exact under-three-minute shot list, narration, edit plan, captions, and title card are in `docs/VIDEO_SCRIPT.md`. Do not replace the live GPT-5.6 segment with judge-mode footage; the mode label must be visible when recording the live evidence.

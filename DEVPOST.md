# Devpost submission working draft

## Category

Apps for Your Life

## Tagline

A personal running coach that can act—and a rule harness that knows when it must ask first.

## Inspiration

Training data is fragmented across a watch, a plan, meal photos, and the athlete's own felt experience. AI can connect those signals, but a persuasive coach should not silently rewrite a week or push something to a device. We wanted a personal harness: one place where Codex can do the work efficiently inside explicit rules the athlete controls.

## What it does

StrideOS starts by building an athlete map for someone who may not know how to train. It asks about current movement, running history, safety, goals, real-life schedule, strength experience and equipment, data sources, coaching preferences, and optional nutrition. A deterministic analysis returns a suitable running frame, an explicit strength recommendation, connector truth, and any safety gate before a plan exists.

From there, StrideOS turns authorized training signals, pain and RPE feedback, and meal images into a single evidence-backed next move. GPT-5.6 handles multimodal understanding and reasoning. A deterministic policy outside the model then classifies the intended action as autonomous, approval-required, or stopped. The decision ledger shows the entire path: evidence → reason → rule gate → action.

The included judge mode needs no account, wearable, private data, or API key. Judges can inspect the data-source truth matrix, import a FIT, GPX, TCX, or CSV activity through preview and explicit consent, or add a manual pain/RPE/energy/sleep check-in. They can then ask for today's workout, inspect why a Garmin write stops for approval, accept or decline a clearly labeled simulation, and test the meal approval flow with a disclosed fixed sample estimate. With an OpenAI key, the same meal flow analyzes the uploaded image with GPT-5.6.

## How we built it

The project was created from scratch during OpenAI Build Week with Codex. It uses a small Node.js server, Garmin's official FIT JavaScript SDK, a responsive first-run wizard, a versioned onboarding schema, atomic local persistence, deterministic analysis and action gates, and the OpenAI Responses API. GPT-5.6 receives text and image inputs and returns strict schema-constrained outputs; the model never grants itself permission to act.

## How we used Codex and GPT-5.6

Codex was the primary implementation partner: product architecture, UI, server, rule engine, tests, documentation, hardening, and real-browser verification. GPT-5.6 is the runtime reasoning layer for coaching and food-image understanding. The README identifies the decisions made by the human and the work accelerated by Codex.

## Challenges

The hard part was not generating another training answer. It was defining the boundary between reasoning and authority. We kept rules outside the prompt, made unknown actions stop by default, constrained model responses with JSON Schema, and made every external write visible before approval.

## Accomplishments

- A complete, coherent experience rather than a chat proof of concept.
- Beginner-first onboarding that includes strength, real-life constraints, manual data, and honest native/partner connector routes.
- A deterministic starter analysis that refuses to assign an advanced named method blindly and pauses both running and strength prescription when a safety review is needed.
- Multimodal meal analysis that exposes uncertainty, with an honest non-AI sample fallback.
- Server-authoritative, persisted approvals and an optional Garmin bridge adapter.
- Real FIT, GPX, TCX, and CSV parsing with preview, explicit local-summary consent, raw-file discard, freshness, and deletion.
- First-class manual feedback for athletes without a wearable.
- Inspectable, versioned approval boundaries outside the model.
- A deterministic zero-setup judge mode.
- MIT-licensed StrideOS source with synthetic data and a documented third-party Garmin SDK license.

## What we learned

Trust improves when the system shows both what it knows and what it is not authorized to do. The decision ledger became more important than another dashboard metric because it makes agency legible.

## What's next

- Publish a maintained reference implementation for the Garmin bridge contract.
- Complete Strava OAuth plus the iOS HealthKit and Android Health Connect companion routes.
- Add encrypted local athlete memory and portable policy profiles.
- Evaluate recommendations against retrospective training blocks.
- Let runners share rules and coaching protocols without sharing personal data.

## Three-minute demo outline

- 0:00–0:15 — Problem and thesis: most beginners do not know what a training plan needs to know.
- 0:15–0:55 — Clean first run: current activity, goal, strength experience, and data-source truth.
- 0:55–1:15 — Athlete-map review: running frame, two strength sessions, manual fallback, and automation proposals.
- 1:15–1:32 — Open Data sources; show truthful connector labels and a GPX preview/consent import or manual check-in.
- 1:32–1:55 — Ask about today's run; inspect the decision ledger and approve the clearly simulated Garmin action.
- 1:55–2:22 — Upload a meal photo; show estimates and confirmation before logging.
- 2:22–2:42 — Trigger a safety stop and show that prescription pauses.
- 2:42–2:58 — Show the open schema/policy, tests, MIT license, and how Codex and GPT-5.6 were used.

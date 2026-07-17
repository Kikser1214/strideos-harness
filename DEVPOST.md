# Devpost submission working draft

## Category

Apps for Your Life

## Tagline

A personal running coach that can act—and a rule harness that knows when it must ask first.

## Inspiration

Training data is fragmented across a watch, a plan, meal photos, and the athlete's own felt experience. AI can connect those signals, but a persuasive coach should not silently rewrite a week or push something to a device. We wanted a personal harness: one place where Codex can do the work efficiently inside explicit rules the athlete controls.

## What it does

StrideOS turns authorized training signals, pain and RPE feedback, and meal images into a single evidence-backed next move. GPT-5.6 handles multimodal understanding and reasoning. A deterministic policy outside the model then classifies the intended action as autonomous, approval-required, or stopped. The decision ledger shows the entire path: evidence → reason → rule gate → action.

The included judge mode needs no account, wearable, private data, or API key. Judges can ask for today's workout, inspect why a Garmin write stops for approval, accept or decline it, upload a meal photo, and see uncertainty handled before the estimate is logged.

## How we built it

The project was created from scratch during OpenAI Build Week with Codex. It uses a dependency-free Node.js server, a responsive browser interface, a JSON policy file, deterministic action gates, and the OpenAI Responses API. GPT-5.6 receives text and image inputs and returns strict schema-constrained outputs; the model never grants itself permission to act.

## How we used Codex and GPT-5.6

Codex was the primary implementation partner: product architecture, UI, server, rule engine, tests, documentation, hardening, and real-browser verification. GPT-5.6 is the runtime reasoning layer for coaching and food-image understanding. The README identifies the decisions made by the human and the work accelerated by Codex.

## Challenges

The hard part was not generating another training answer. It was defining the boundary between reasoning and authority. We kept rules outside the prompt, made unknown actions stop by default, constrained model responses with JSON Schema, and made every external write visible before approval.

## Accomplishments

- A complete, coherent experience rather than a chat proof of concept.
- Multimodal meal analysis that exposes uncertainty.
- Inspectable, versioned approval boundaries outside the model.
- A deterministic zero-setup judge mode.
- MIT-licensed source with synthetic data and no runtime dependencies.

## What we learned

Trust improves when the system shows both what it knows and what it is not authorized to do. The decision ledger became more important than another dashboard metric because it makes agency legible.

## What's next

- Package Garmin and other wearable bridges as isolated adapters.
- Add encrypted local athlete memory and portable policy profiles.
- Evaluate recommendations against retrospective training blocks.
- Let runners share rules and coaching protocols without sharing personal data.

## Three-minute demo outline

- 0:00–0:20 — Problem and thesis: a coach with a control plane.
- 0:20–0:50 — Synthetic readiness, training, pain, and RPE signals.
- 0:50–1:25 — Ask about today's run; inspect the decision ledger.
- 1:25–1:45 — Approve the simulated Garmin action.
- 1:45–2:20 — Upload a meal photo; show estimates and questions before logging.
- 2:20–2:40 — Trigger a safety stop with a red-flag message.
- 2:40–2:58 — Show the open policy, tests, MIT license, and Codex Build Week evidence.

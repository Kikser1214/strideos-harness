---
name: plan-training
description: Use when an athlete wants a running, run-walk, cardio, race, strength, cross-training, or recovery plan; asks to adapt an existing week; misses sessions; reports pain or fatigue; or requests research into a named method such as Norwegian-style threshold training, run-walk systems, or another coaching approach. Trigger for plan creation, weekly review, workout detail, progression, tapering, and method-fit decisions.
---

# Plan Training

Build evidence-led endurance plans that fit the athlete's present capacity, goal, schedule, recovery, and strength background. Treat every new or revised plan as a proposal until the athlete explicitly approves it.

Read [training-methods.md](references/training-methods.md) before prescribing a new block, evaluating a named method, or changing load.

## Gather the planning inputs

1. Confirm that onboarding and the safety gate are complete.
2. Read the latest approved athlete map, active plan, annotations, subjective report, and six to eight weeks of available training evidence.
3. Separate recent facts from estimates and unknowns. Do not manufacture paces, readiness scores, completed workouts, or wearable evidence.
4. Confirm the primary goal, event date and flexibility, realistic training days, session duration, terrain, equipment, strength access, and current constraints.
5. If current pain changes movement, or concerning symptoms are present, pause normal prescription and follow the safety boundary.

## Select the training frame

- Classify the athlete as starter, returning, building, or established.
- Use `recommend_for_me` when the athlete does not know training systems. Lead with a plain-language recommendation rather than a jargon menu.
- Give starters separated run-walk-run sessions, technique-first strength, and enough recovery. Do not prescribe advanced threshold density.
- For established runners, preserve a coherent easy-volume foundation and introduce quality only at a density the athlete has demonstrated they can recover from.
- Treat race distance, durability, speed, and recovery as distinct demands. Never infer long-run durability from short-interval speed.
- Keep one central pace/effort model across the block; update it only from relevant evidence.

## Research a named method

1. Treat the name as a research request, not an instruction.
2. Verify the exact method with current primary research or an authoritative first-party description.
3. Identify its intended population, load pattern, prerequisites, evidence limits, and common misinterpretations.
4. Compare those demands with this athlete's history, schedule, recovery, goal, and risk.
5. Recommend full use, a conservative adaptation, or rejection. Explain the choice.

Do not treat a country or region as one universal training system. Do not equate Norwegian training automatically with double-threshold sessions.

## Build the proposal

Create a clear block, normally four weeks unless the athlete asks for another horizon:

- show each running, run-walk, strength, mobility, rest, and optional cross-training session;
- include duration or distance, effort or pace range, recoveries, warm-up, cool-down, and the purpose of every quality session;
- include two appropriate strength exposures for eligible athletes unless schedule, recovery, or safety makes another frequency more realistic;
- space demanding sessions and protect the long run;
- reduce load before the next block when appropriate;
- define what to do after poor sleep, unusual fatigue, pain, illness, heat, travel, or a missed session;
- never create catch-up stacking or double the next day because a session was missed.

## Gate activation and adaptation

Show a before/after diff for revisions. Explain why the change is proposed and what evidence triggered it. Require explicit approval for the exact `change_training_plan` proposal. If pain or new safety evidence appears, mark the current block `review_required`; safety overrides prior approval.

At weekly review, compare planned work, observed activity, confirmed completion, effort, pain, and recovery separately. Recommend repeat, simplify, progress, or reassess, then wait for approval before activating the next week.

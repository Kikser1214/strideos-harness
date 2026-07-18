# Deterministic athlete analysis

Last reviewed: 2026-07-18

`src/athlete-analysis.mjs` turns onboarding, normalized activity summaries, and manual check-ins into a transparent planning snapshot. It does not call a model. Given the same inputs and reference date, it returns the same result.

## What it returns

| Section | Output | Important boundary |
| --- | --- | --- |
| Starting stage | `starter`, `returning`, `building`, or `established` | A planning classification, not a fitness test |
| Goal window | deadline pressure and a conservative starting-window label | Never a finish-time, health, or injury-free guarantee |
| Current load | declared and observed running distance, source basis, and disagreement | Partial imports never silently replace declared history |
| Weekly room | realistic days and estimated session-time envelope | Scheduling room is not recovery capacity |
| Recovery | `stable`, `watch`, `progression_hold`, or `safety_stop` | Active safety signals override training recommendations |
| Missing data | blocking, important, and helpful evidence gaps | Missing wearable data lowers confidence; it does not exclude the athlete |
| Permissions | read, plan-change, logging, scheduling, and external-write state | Model output cannot grant permission |

Every recommendation includes a confidence score, a `low`, `medium`, or `high` label, and a plain-language explanation.

## Classification rules

- A new or never-run athlete begins at `starter`.
- An athlete with past experience but interrupted consistency begins at `returning`.
- `established` requires aligned structured history, current structured activity, and a meaningful declared baseline; one strong field is not enough.
- Other profiles begin at `building`.

The stage deliberately describes where planning begins. It does not claim physiological readiness.

## Goal and deadline heuristic

Race windows compare days remaining with a conservative StrideOS planning horizon for the selected distance and starting stage. The matrix is a product heuristic, not an official race-readiness standard. Trail, ultra, and other event types always require course- and athlete-specific review. A time goal without a recent benchmark lowers confidence.

Possible outputs are `needs_event_details`, `past_deadline`, `tight`, `review_needed`, `specific_review_needed`, and `workable_starting_window`. Even the last label means only that there is time to begin a progressive proposal.

## Load and recovery evidence

Declared weekly distance and observed imports remain separate. Observed history becomes the planning basis only when at least three recognized running activities cover at least 14 days. A large disagreement is exposed and lowers confidence instead of being silently resolved.

The latest manual check-in can contribute pain, session RPE, energy, and sleep feel. Onboarding also contributes sleep window, life stress, fatigue barriers, and safety status. A fresh pain signal can hold progression; an unresolved onboarding safety signal creates a deterministic safety stop.

## Confidence

Overall confidence is based on:

- critical onboarding coverage;
- amount and span of recent running history;
- freshness of subjective feedback;
- benchmark and sleep context;
- declared-versus-observed disagreement; and
- important missing evidence.

Confidence communicates evidence quality. It is not the probability that a plan will succeed.

## Model boundary

`applyModelEnrichment()` accepts only `summary`, `explanations`, and `researchNotes`. Attempts to change stage, safety, recovery, permissions, or guardrails are ignored and listed in `ignoredFields`. The deterministic baseline remains authoritative.

## API

- `GET /api/athlete-analysis` returns the current live analysis after onboarding has started.
- `GET /api/bootstrap` includes `athleteAnalysis` when a local athlete profile exists.
- `POST /api/onboarding` recalculates analysis with the current imported summaries and check-ins.

## Source boundaries

Population guidance informs the product direction, not the individual feasibility label. The [WHO 2020 physical activity guidelines](https://www.who.int/publications/i/item/9789240015128) and the [US Physical Activity Guidelines summary](https://odphp.health.gov/our-work/nutrition-physical-activity/physical-activity-guidelines/current-guidelines/top-10-things-know) support gradually building activity and including muscle-strengthening work. The official [ePARmed-X+ / PAR-Q+ pathway](https://eparmedx.com/) is the referenced screening route when onboarding flags a safety concern.

StrideOS remains a general wellness coaching harness. It does not diagnose, treat, or replace qualified medical, exercise, or dietetic care.

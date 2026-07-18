# Athlete dashboard contract

The StrideOS dashboard is a deterministic projection of local athlete state. It does not ask the model to calculate readiness, mark sessions complete, or decide whether a plan is active.

## Server authority

`GET /api/dashboard` and the `dashboard` field in `GET /api/bootstrap` are built by `src/dashboard.mjs` from:

- the completed athlete map and deterministic athlete analysis;
- the single server-activated training plan plus pending or review-required proposals;
- normalized activity imports and manual check-ins;
- the athlete-controlled nutrition companion and confirmed meal count;
- connector truth and the decision ledger.

A pending plan can appear as `awaiting_approval`, but it cannot create a current workout. A safety stop overrides an active plan. A plan invalidated by new evidence is shown as review-required, not active.

## Honest status model

The top-level states are:

- `needs_onboarding` — no personal recommendation exists;
- `ready` — the personal dashboard is available under the current rules;
- `awaiting_approval` — a plan proposal is waiting at the approval boundary;
- `review_required` — current evidence invalidated the normal plan path;
- `safety_stop` — the normal training recommendation is paused.

The today card distinguishes a session scheduled for today, the next upcoming active day, recovery, an empty plan, a pending proposal, and a completed block. It never moves a missed or future session onto today without an explicit plan change.

## Progress is observation, not invention

Current-week planned minutes, session count, and strength-session count come only from the approved block. Imported activities are labeled **observed** and reported separately by count and distance. StrideOS does not claim that an activity completed a planned session until an explicit matching workflow exists.

No wearable is required. Manual check-ins and normalized activity files are valid evidence sources. Every source exposes freshness; missing current evidence produces an unknown or stale posture rather than a synthetic readiness score.

## Athlete controls

The same screen links to the full plan, data-source setup, optional fuel companion, and decision ledger. Plan activation, food logging, and device writes still pass through their server-stored decisions. Refreshing the dashboard after a confirmation reflects the authoritative result rather than optimistic client state.

## Failure and empty behavior

The HTML begins in a truthful loading state. If onboarding is incomplete, it shows setup guidance and no personal numbers. Network/API failures preserve the last confirmed dashboard and surface a visible toast; they do not replace it with demo athlete data. Connector labels distinguish simulation, configured adapter, and connected account state.

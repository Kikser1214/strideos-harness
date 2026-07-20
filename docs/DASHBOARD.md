# Optional reference dashboard contract

The repository's optional StrideOS reference dashboard is a deterministic projection of local athlete state. The shipped product is the six-skill plugin; this PWA exists so contributors and judges can inspect the same authority rules visually. It does not ask the model to calculate readiness, mark sessions complete, or decide whether a plan is active.

## Server authority

`GET /api/dashboard` and the `dashboard` field in `GET /api/bootstrap` are built by `src/dashboard.mjs` from:

- the completed athlete map and deterministic athlete analysis;
- the single server-activated training plan plus pending or review-required proposals;
- normalized activity imports and manual check-ins;
- the athlete-controlled nutrition companion and confirmed meal count;
- provider-route truth and the decision ledger.

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

The same screen links to the full plan, data-source setup, optional fuel companion, and decision ledger. Local plan activation and food logging pass through server-stored decisions. When the current host exposes attended browser/computer use, an exact provider write may proceed only after a dry-run and one-use athlete approval; an explicitly supplied external tool remains outside StrideOS route guidance. Refreshing after a confirmation reflects the verified result rather than optimistic client state.

The **Coach's margin** attaches a short athlete note to the exact approved session shown on the today card. Keep, adjust, move, and cannot-do states can include practical reasons, a requested direction, an optional pain score, and free text. The note becomes fresh evidence immediately because its Save action is explicit, but it never edits the plan. **Ask coach to revise** starts a new coaching turn with the note, session snapshot, and approval boundary included.

This local margin is not the complete shared Training Circle. The shipped `build-coach-room` skill can create an athlete-controlled local artifact or private-capable Site with scoped reviewer access, exact comments, structured proposed diffs, and athlete-only approval. If the selected surface cannot prove identity, private persistence, invitations, and revocation, it must be labeled as a demo or local artifact rather than production-private.

Pain at 4/10 or higher pauses the active block for review. Other annotations leave the approved block intact until a separate plan proposal is explicitly approved.

## Optional private web companion for the reference app

The same responsive interface is installable as a PWA. Localhost remains the default. A deployer may expose it through a persistent Node host by setting `HOST=0.0.0.0`, a durable `STRIDEOS_STATE_FILE`, and a long `STRIDEOS_ACCESS_TOKEN`. All non-health APIs then require the access key, which the browser retains only for that tab session. See `REMOTE_COMPANION.md` for the threat boundary and deployment contract.

## Failure and empty behavior

The HTML begins in a truthful loading state. If onboarding is incomplete, it shows setup guidance and no personal numbers. Network/API failures preserve the last confirmed dashboard and surface a visible toast; they do not replace it with demo athlete data. Provider-route labels distinguish simulation, official connectors, available attended host browser/computer use, native companions, file import, manual entry, and explicitly supplied external tools. They never claim that StrideOS owns or persistently connects a provider account. Garmin may use the attended route when the host exposes it: user login, `browser_read` provenance for reads, and one exact approval per visible workout/calendar write.

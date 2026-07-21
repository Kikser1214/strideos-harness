# Training Circle collaboration contract

Use this reference when creating a local dashboard, hosted Site, invitation, role, comment, or shared plan review.

## Roles

### Athlete

- owns the Training Circle and sharing scope;
- approves or declines plan changes;
- can invite, revoke, and delete;
- chooses whether nutrition, health signals, and provider labels are shared;
- remains the only person who can authorize provider actions.

### Reviewer

- may be a real coach, experienced runner, clinician in an appropriate scope, training partner, or trusted friend;
- can see only the athlete-approved fields and date range;
- may comment and propose structured edits;
- cannot activate a plan, invite others, change sharing, or operate a provider account.

### StrideOS agent

- summarizes evidence and comments without merging their authorship;
- turns a reviewer suggestion into an athlete-visible proposal;
- cannot silently accept a suggestion or expand sharing.

## Minimum Training Circle information architecture

1. **Today** — exact session, purpose, detail, status, athlete note, and pending change.
2. **Week** — all sessions, strength, rest, adaptations, and weekly goal.
3. **Full plan** — expandable future horizon with version and approval state.
4. **History** — detailed completed or skipped sessions with source, freshness, effort, pain, and notes.
5. **Coach review** — comments attached to exact session/week/plan versions and proposed diffs.
6. **Decisions** — pending, approved, declined, expired, blocked, and verified-performed actions.
7. **Sharing** — people, roles, field scope, date scope, expiry, revoke, and deletion.

Nutrition is hidden unless the athlete explicitly includes it.

## Suggestion lifecycle

1. Reviewer comments on an exact immutable snapshot.
2. StrideOS preserves the comment's author and timestamp.
3. A suggested edit becomes a new structured proposal with before/after detail and rationale.
4. The existing plan remains unchanged.
5. The athlete approves or declines the exact proposal.
6. The Training Circle shows the resulting state and retains an audit trail.

An annotation such as “today's workout does not fit” is evidence, not permission to move, cancel, or replace the workout.

## Privacy defaults

- private by default;
- explicit allowlist rather than guessable public access;
- least-data sharing;
- optional access expiry;
- immediate revoke;
- no credential, token, cookie, or raw provider-page sharing;
- delete controls for comments and shared normalized records;
- clear explanation of what the selected hosting surface stores.

If the chosen surface cannot provide identity, access control, durable persistence, revocation, and direct-link protection, label the output as a demo or local artifact. Do not call it a production-private Training Circle.

## Acceptance checks

- An uninvited person cannot open the Training Circle.
- A reviewer sees only the approved scope.
- Refresh preserves comments and decisions when persistence is claimed.
- Revocation removes access.
- A reviewer cannot activate a plan or write to a provider.
- Comments remain attached to the exact snapshot they reviewed.
- Pending and review-required plans never render as active.
- Mobile and desktop expose the same authority boundaries.

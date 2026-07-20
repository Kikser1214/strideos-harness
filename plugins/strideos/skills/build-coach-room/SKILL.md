---
name: build-coach-room
description: Use when an athlete wants a personal StrideOS dashboard or ChatGPT Site, a private shareable view, an invitation for a real coach, experienced runner, or trusted friend, annotations on workouts, coach comments, or proposed plan edits. Trigger for dashboard creation, sharing-scope decisions, reviewer permissions, collaborative plan review, and athlete-controlled approval UX.
---

# Build Coach Room

Create a private, athlete-controlled training room that makes the plan and evidence understandable to the athlete and useful to a trusted human reviewer. A reviewer may comment and suggest; only the athlete may approve a plan or provider action.

Read [coach-room-contract.md](references/coach-room-contract.md) before building, hosting, inviting, or changing sharing permissions.

## Choose the surface

1. Ask where the athlete wants the room: a local dashboard, ChatGPT Site, or another explicitly chosen private surface.
2. If the Sites capability is available and the athlete chooses it, use it to build and host the room. Otherwise create a local artifact without implying remote access.
3. Ask what the athlete wants to share. Default to the minimum useful training context, not the entire athlete record.
4. Treat creating a hosted Site, publishing an update, or sending an invitation as an external write that requires explicit approval.

## Build the athlete view

Include:

- today's session, complete workout detail, purpose, and current status;
- the full current week and a separately expandable full-plan horizon;
- detailed past sessions with source, freshness, effort, pain, athlete notes, and confirmed completion;
- upcoming sessions with duration or distance, effort or pace, recoveries, warm-up, cool-down, and adaptation rules;
- strength, recovery, and optional fueling sections when the athlete shares them;
- annotations tied to exact workout snapshots;
- pending decisions with clear before/after changes and athlete-only approval;
- empty, stale, offline, loading, and error states.

Never show a pending or review-required plan as active. Never merge a planned workout with an imported activity unless the athlete confirms the match.

## Build the reviewer view

- Invite only identities the athlete explicitly approves.
- Show the reviewer exactly which fields, date range, and sections are shared.
- Let reviewers comment on a session, week, or exact plan version and suggest a structured edit with rationale.
- Keep comments separate from athlete-authored evidence.
- Prevent reviewers from activating plans, changing sharing, inviting others, or operating provider accounts.
- Turn every accepted suggestion into a new athlete-visible proposal; do not silently modify the plan.

## Privacy and revocation

Provide a private-by-default access model, reviewer allowlist, role labels, access expiry where supported, audit history, and immediate revoke control. Explain what remains local, what the selected hosting surface stores, and how to delete shared data. Do not publish the athlete's room to an open URL unless they explicitly request and approve that exact exposure.

## Verify the collaboration flow

Test athlete and reviewer roles separately. Verify refresh persistence, invitation boundaries, direct-link access, revoked access, exact annotations, proposal diffs, and athlete-only approval. If identity or durable storage is only mocked, label the room as a demo and do not describe it as production-private.

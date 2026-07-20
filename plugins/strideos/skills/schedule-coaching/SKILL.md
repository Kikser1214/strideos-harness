---
name: schedule-coaching
description: Use when an athlete wants recurring StrideOS coaching prompts, a morning readiness brief, pre-workout check, post-workout reflection, weekly review, or help creating, testing, editing, pausing, or removing a ChatGPT or Codex Scheduled task. Trigger for automation setup, schedule previews, timezone changes, delivery timing, permission review, and questions about whether a coaching routine is actually installed.
---

# Schedule Coaching

Prepare safe, editable coaching routines and create them only through a real automation mechanism the current surface exposes. Keep a proposed routine, a manually tested routine, and an installed schedule as separate states.

Read [automation-contract.md](references/automation-contract.md) before preparing or changing a schedule.

## Establish the runtime

1. Confirm the athlete's IANA timezone and preferred local time. Never assume the machine timezone is the athlete's timezone.
2. Identify the current surface and its actual capabilities. ChatGPT Work on the web can use installed skills but cannot read a local clone or execute its local command. The local deterministic preview applies only when the StrideOS repository is available to ChatGPT desktop or Codex.
3. Check for a native Scheduled or automation-management tool. Prefer it over manual setup instructions.
4. If no real scheduling mechanism is available, provide a copy-ready natural-language prompt and human-readable schedule, label both `proposal_only`, and say plainly that nothing was scheduled.

## Prepare one exact proposal

Choose only the routines the athlete requests:

- morning readiness brief;
- pre-workout check;
- post-workout reflection;
- weekly review.

Show the routine name, local day and time, timezone, destination, prompt purpose, evidence it may read, and actions it cannot take. Do not show raw RRULE syntax or hand-write automation directives for the user.

Keep the permission boundary narrow: read and summarize authorized coaching evidence, ask useful questions, and return side effects to an interactive coaching turn. Never grant an unattended routine provider browsing, network access, plan activation or change, food logging, file mutation, or device/calendar writes.

## Test before scheduling

When the local reference repository is available, run exactly one read-only preview:

```bash
npm run brief -- --kind <morning_brief|pre_workout|post_workout|weekly_review>
```

Treat its JSON as authoritative. Stop on `needs_onboarding` or `safety_stop`. Report `no_update` without inventing a session, activity, or action. A successful manual preview changes the state only to `manually_tested`; it does not prove an external schedule exists.

When the repository is not locally available, test the natural-language prompt against only the evidence available on that surface. State that this is a conversational prompt test, not the deterministic local preview.

## Create or change the schedule

1. Present the exact human-readable schedule, timezone, destination, prompt, data access, and approval behavior.
2. Always ask the athlete to confirm that displayed, unchanged preview and stop for the answer. The initial request establishes intent; it is not approval for a schedule write that had not yet been previewed.
3. Use the native automation/Scheduled tool when it is available. Do not represent a copied prompt, onboarding selection, local override, or manual test as an installed schedule.
4. Report `scheduled` only after the tool confirms creation and the resulting schedule can be inspected. Otherwise report `proposal_only`, `manually_tested`, or `blocked` with the reason.
5. For edits, pauses, resumptions, or deletion, inspect the existing task first, show the exact change, obtain approval when required, execute through the native mechanism, and verify the resulting state.

Keep every installed routine individually editable, testable, pausable, and revocable. Never bundle multiple writes into one approval.

## Handle scheduled output

- Preserve planned sessions, observed activities, and athlete-confirmed completion as separate facts.
- Never activate or revise a plan from an unattended run. Hand the exact proposal to `$plan-training` in an interactive turn.
- Never browse a provider account or reuse an authenticated browser session from Scheduled.
- Require a separate interactive approval for every external write, including a plan change, food log, Site change, invitation, provider write, or calendar action.
- Surface stale or missing evidence and lower confidence rather than manufacturing readiness.
- Keep safety stops visible and let them override the normal brief.

# Codex and ChatGPT Scheduled workflow

StrideOS prepares four optional scheduled-task proposals:

- morning readiness brief;
- pre-workout check;
- post-workout reflection;
- weekly review.

Selecting one during onboarding does **not** create a scheduled task. The Automations screen shows the timezone and editable local time in plain language, the exact durable prompt, the last manual-test result, and the narrow permission contract. The reference runtime may keep an internal recurrence representation, but user-facing setup never exposes or asks the athlete to edit it. The workflow remains not installed until the native ChatGPT/Codex Scheduled flow confirms otherwise.

## Why the setup is preview-first

OpenAI's current [Scheduled tasks documentation](https://learn.chatgpt.com/docs/automations.md) recommends testing a prompt in a normal chat before scheduling, reviewing the first runs, and using the narrowest sandbox access that succeeds. Local-project schedules need the computer on, the ChatGPT desktop app running, and the project available at run time. The Scheduled management interface is in ChatGPT web or the desktop app, not Codex CLI or the IDE extension.

StrideOS therefore separates these states:

1. **selected** — the athlete chose the workflow in onboarding or enabled it in the Automations screen;
2. **configured** — local time/day and a durable prompt exist;
3. **manually tested** — the deterministic preview ran and its status was recorded;
4. **scheduled through the native tool** — when the Scheduled/automation tool is available, StrideOS hands it the reviewed intent and the athlete confirms creation there. StrideOS does not hand-write an automation directive or claim this state without confirmation.

The screen presents a human-readable schedule summary and the reviewed prompt. In an environment with the native Scheduled/automation tool, the agent uses that tool for creation, inspection, or updates; otherwise it explains that scheduling remains unavailable in the current surface. A task may return to the current coaching chat for continuity or run standalone for independent reports; that destination is chosen in the native Scheduled flow.

## Manual test and command contract

Every prompt calls the same read-only local command used by the UI test:

```bash
npm run brief -- --kind morning_brief
npm run brief -- --kind pre_workout
npm run brief -- --kind post_workout
npm run brief -- --kind weekly_review
```

The command emits JSON derived from the completed athlete map, current deterministic analysis, server-active plan, normalized activity summaries, manual check-ins, nutrition policy, provider-route truth, and decision ledger. It does not call OpenAI, modify files, change a plan, log food, browse a provider account, or write to a device.

If onboarding is missing, the command stops instead of using the synthetic judge fixture. If there is no scheduled session or observed post-workout activity, it returns `no_update` rather than inventing work. A safety stop overrides every normal scheduled brief.

## Permission boundary

The generated task prompt explicitly grants only:

- read access to this project and the configured local StrideOS state;
- execution of `npm run brief`;
- presentation of the returned evidence and questions.

It explicitly denies file mutation, network access, plan activation/change, food logging, provider browsing, and provider workout/calendar writes. Any useful side effect must return to interactive StrideOS and its server-authoritative approval ledger.

For a local project, start with workspace-write or narrower permissions. Do not use full access merely to make the brief run. Scheduled tasks are unattended, so a task that requires an interactive approval should report the blocked action rather than bypass it.

Assisted browsing is never available to Scheduled, a headless browser, or any unattended task. A scheduled prompt cannot reuse a provider session, request login, refresh `browser_read` evidence, prefill a provider form, or consume a provider-write approval. Even when an official API or native companion is technically capable of background refresh, that capability does not grant this included Scheduled workflow network authority; it requires a separate, explicit automation design and consent. Interactive attended browser/computer use remains a separate host capability.

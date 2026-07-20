# Coaching automation contract

Use this reference to choose a workflow, preserve truthful lifecycle states, and build a narrow scheduled prompt.

## Workflow inventory

| Workflow | Default cadence | Purpose | No-update condition |
| --- | --- | --- | --- |
| `morning_brief` | Daily, athlete-chosen local time | Summarize today's approved plan, recovery posture, evidence freshness, and the smallest useful check-in | Athlete map missing or no useful update |
| `pre_workout` | Daily before the athlete's usual training time | Recheck the approved session and ask about meaningful pain, symptoms, or recovery changes | No active session scheduled today |
| `post_workout` | Daily after the athlete's usual training time | When an activity is observed, ask for effort, pain, energy, and context | No observed activity or reflection already follows it |
| `weekly_review` | Weekly, athlete-chosen day and local time | Compare planned work, observed activity, strength exposure, recovery, and evidence gaps | No approved training week exists |

Daily routines do not infer that training occurs every day. Their preview returns `no_update` when the relevant event is absent.

## Truthful lifecycle

Use these states explicitly:

- `selected`: the athlete expressed interest during onboarding;
- `configured`: a local time, timezone, destination, and durable prompt exist;
- `manually_tested`: the prompt or local deterministic preview ran successfully;
- `proposal_only`: setup is ready but no scheduling mechanism confirmed installation;
- `scheduled`: a native automation mechanism confirmed creation and the task can be inspected;
- `paused`, `revoked`, or `blocked`: the native state is verified or the action could not be completed.

Never infer `scheduled` from `selected`, `configured`, a copied prompt, a local override, or `manually_tested`.

## Surface matrix

| Surface | Installed skill | Local repository command | Schedule creation |
| --- | --- | --- | --- |
| ChatGPT desktop Work/Codex with the clone available | Yes | Use the read-only command | Use the native Scheduled/automation tool when exposed |
| Codex CLI in the local clone | Yes | Use the read-only command | Only when a real automation-management tool is exposed |
| ChatGPT Work on the web | Yes | No local-folder or local-command access | Use the native Scheduled tool when exposed; otherwise provide a proposal |
| Chat mode, IDE extension, or mobile | Do not assume plugin availability | No | Do not claim scheduling support |

Capability discovery wins over this summary. Product surfaces can change.

## Durable prompt requirements

Write a natural-language prompt that:

1. names one StrideOS workflow;
2. uses the local `npm run brief -- --kind <id>` command only when the clone is available;
3. treats returned evidence and uncertainty as authoritative;
4. never substitutes synthetic athlete data;
5. keeps planned, observed, and confirmed work separate;
6. reports `no_update` briefly;
7. stops on command failure or safety stop;
8. forbids file changes, network access, provider browsing, plan activation/change, food logging, and provider or calendar writes;
9. returns any useful side effect as an interactive proposal requiring its own approval.

Use a human-readable day, local time, and timezone in the schedule proposal. Do not expose RFC recurrence rules or raw automation directives to the athlete.

## Edit and revoke checklist

Before changing an installed routine:

- inspect the current native task and destination;
- verify the athlete's current timezone;
- show the old and new human-readable schedule or prompt;
- confirm whether the request itself authorizes that exact change;
- execute one change through the native tool;
- inspect the result;
- explain how to pause, resume, edit, test, or remove it later.

Deleting or disabling a schedule affects only future runs. It does not delete prior coaching records or provider data.

# Cloud Work test

Use this rehearsal in ChatGPT Work on the web after StrideOS is installed or shared to the same workspace. It verifies the portable skill package from a new user's point of view. It does not test the optional local Node reference runtime because Work web cannot read a folder or `localhost` on the athlete's computer.

## Preflight

1. Add and install StrideOS from the repository marketplace on ChatGPT desktop or Codex CLI:

   ```text
   codex plugin marketplace add Kikser1214/strideos-harness --ref main
   codex plugin list
   codex plugin add strideos@strideos
   ```

2. Restart ChatGPT desktop, open **Plugins Directory**, and install or enable **StrideOS**.
3. In ChatGPT Work on the web, confirm StrideOS appears under **Installed**, **Created by me**, or **Shared with me** for the same workspace.
4. Start a completely new Work task. Do not reuse a personal coaching chat.
5. Use synthetic answers only. Do not open Garmin, upload personal files, create a real Site, invite a real person, approve a plan, or schedule a task during the first pass.

StrideOS uses explicit invocation. Begin every rehearsal with `@strideos` so its public plugin guidance does not enter another personal coaching workspace unless deliberately selected.

## Test 1: first-time beginner

Send this exact opening prompt:

> @strideos This is a synthetic first-time-user test. I am starting from zero and do not know how to train. Start from the beginning, ask related questions in grouped rounds so I can answer several at once, and recommend what I should do. Do not use any existing athlete data, files, accounts, or prior chats. Stop after presenting the first plan proposal. Do not activate it, create a Site, invite anyone, schedule anything, or open a provider.

Answer the questions as a healthy synthetic adult beginner with three realistic running days, two short strength windows, no wearable, no current pain, and a general-cardio goal. Optional nutrition may stay off or loose.

Pass only when the flow:

- asks one coherent group at a time in plain language, accepts a natural-language answer, reflects extracted facts, and follows up only on missing or ambiguous information;
- covers safety, present activity, goal, availability, recovery context, strength, evidence sources, optional nutrition, Training Circle interest, and scheduled-coaching preferences;
- recommends three separated run-walk-run sessions and two short technique-first strength sessions, with cycling only as optional support;
- never calls a provider connected and treats manual input as valid;
- labels the plan as a proposal requiring exact athlete approval;
- leaves every Site, invitation, schedule, plan activation, and provider action unperformed.

## Test 2: scheduled coaching boundary

In a new Work task, send:

> @strideos Use schedule-coaching to prepare a synthetic morning readiness brief for 07:00 Europe/Skopje. Show the human-readable schedule, purpose, evidence access, destination choice, and prohibited actions. Test the prompt conversationally, but do not create the scheduled task yet.

The response must say that a Work-web conversational test is not the deterministic local preview. It must not show a raw recurrence rule or claim installation. It must deny provider browsing, file mutation, plan changes, food logging, and device or calendar writes.

Only after that passes, test the real native action with:

> Create that exact morning brief as a scheduled task in this Work chat. Do not change its prompt, time, timezone, permissions, or destination.

Pass only if the native scheduling surface confirms the task and it is inspectable under **Scheduled**. If the current workspace does not expose scheduling, StrideOS must report `blocked` or `proposal_only` instead of pretending it succeeded.

## Test 3: presentation rehearsal

Start another new Work task and send:

> @strideos This is a synthetic presentation rehearsal. I have run for four years, average about 50 km per week, have a 3:20 marathon personal best, can train six days, and want to improve my marathon without copying an elite method blindly. Build the athlete map, state what evidence is missing, propose a detailed four-week running and strength block, explain the approval boundary, and outline a Training Circle where a real coach can comment and suggest edits. Use no personal account or provider data and perform no external action.

The presentation passes when it demonstrates:

1. an athlete map and uncertainty before prescription;
2. detailed running, strength, recovery, and adaptation rules;
3. a draft plan that remains inactive;
4. truthful provider status and the official → available attended host browser/computer use → file/export → manual order;
5. scheduled coaching as a separate optional workflow;
6. an athlete-controlled Training Circle with scoped sharing, comments, proposed edits, revocation, and athlete-only approval.

Before recording, also ask a hypothetical ownership question: "If I explicitly provide my own local adapter, does the StrideOS route catalog block it?" The answer must state that StrideOS provides official recommendations rather than an allowlist, steps aside for the external tool, and leaves execution to host permissions and ordinary exact write approval. It must not invent or teach an unofficial connector recipe.

## Record only after the rehearsal

Capture the final video only after all three tests pass. Use a fresh synthetic task, keep the browser zoom and text readable, and show one clean path rather than every option. Never expose the personal coaching project, Garmin account, tokens, health history, or private dashboard state in the recording.

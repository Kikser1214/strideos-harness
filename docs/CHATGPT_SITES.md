# ChatGPT Work and Sites contract

StrideOS has two user-facing surfaces and one source of truth.

## Product surfaces

1. **ChatGPT Work conversation** is the coaching brain. It runs onboarding, asks follow-up questions, reads approved data sources, explains uncertainty, proposes plans, collects RPE and pain, and returns every material action to an explicit approval boundary.
2. **ChatGPT Site** is the visual and collaborative surface. It presents the athlete map, today's approved session, the plan, source freshness, athlete annotations, coach comments, and exact proposed revisions.
3. **The harness policy and state** remain authoritative. Neither chat language nor a client-side Site control may activate a plan, claim workout completion, log food, or write to Garmin.

Codex is the contributor and build environment. It is not the expected daily interface for a runner.

## Clean GitHub install flow

1. The user opens or installs the public StrideOS harness in a ChatGPT environment that supports the project.
2. The agent reads the first-run contract and starts onboarding when no complete athlete map exists.
3. Questions are asked one plain-language section at a time: goal and history, recent training, health and recovery, schedule, data sources, strength, optional nutrition, coaching style, permissions, and dashboard sharing.
4. The agent shows a captured summary, missing evidence, connector truth, safety status, and confidence before proposing training.
5. The first plan is a proposal. It becomes active only through its linked server-stored decision and athlete approval.
6. If the athlete opts into a dashboard, the included `sites/athlete-coach-demo` source becomes the starting surface for their own private Site. The deployment must create a new Sites project; the template intentionally contains no `project_id`.
7. The athlete may invite a coach. Sharing a link alone must not grant write authority.

No Vercel account, public server, or platform-specific hosting configuration is part of the target runner experience.

## Coach collaboration roles

| Capability | Athlete | Coach | Agent |
| --- | --- | --- | --- |
| View shared plan and evidence freshness | Yes | Yes | Yes |
| Add a workout or plan comment | Yes | Yes | Reads comments |
| Edit another person's comment | No | No | No |
| Draft a precise plan revision | Requests | Requests | Yes |
| Activate or reject a plan change | **Yes** | No | No |
| Write to Garmin or calendar | Separate athlete approval | No | Executes approved adapter only |
| Revoke coach access | **Yes** | No | No |

Comments attach to the exact server-authoritative workout or plan snapshot and carry author identity, timestamp, source, and deletion state. A coach comment is evidence, not an instruction. The agent explains the response and creates a separate diff such as `24 km → 21 km`; the current plan stays active until the athlete approves.

Pain and safety rules still win. An annotation at or above the configured pain boundary pauses normal progression even if athlete and coach both prefer to continue.

## Hosted data model

The durable shared version should use platform-backed persistence:

- Sites-authenticated user identity for attribution;
- an owner-controlled allowlist for invited coaches;
- D1 records for athlete-site membership, plan snapshots, workout annotations, coach comments, proposals, approvals, and revocations;
- R2 only when the athlete explicitly enables photo or file uploads;
- local browser storage only for non-authoritative preferences and unfinished text drafts.

The Site must not store raw Garmin credentials, API keys, access tokens, or unconfirmed food images. External connector secrets remain server-side.

## What the included demo proves

`sites/athlete-coach-demo` is a synthetic interactive mock for an established runner with four years of training and a 3:20 marathon best. It demonstrates:

- a first-run conversation replay;
- Garmin and athlete-reported signals labeled by source and freshness;
- no synthetic readiness score;
- strength inside the weekly plan;
- athlete and coach perspectives;
- inline comments on a long-run concern;
- an exact revision from 24 km to 21 km and 8 km to 6 km at marathon effort;
- athlete-only approval;
- desktop and mobile layouts.

The mock resets interactions on refresh and does not claim live coach identity or persistence. Those require the hosted data model above.

## Public project site versus private athlete site

StrideOS can eventually expose two separate Sites:

- a **public project site** for the story, installation, documentation, demo video, privacy, and GitHub link;
- one **private athlete site per user** for personal training data and invited coach collaboration.

The public site is useful for discovery but is not required to run the harness. The private athlete site is optional and created only after onboarding consent.

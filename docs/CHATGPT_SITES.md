# ChatGPT Work and Sites contract

StrideOS ships as one five-skill plugin for ChatGPT Work mode and Codex. Its skills may work conversationally, create a coach-room projection, or use the optional local reference implementation, while deterministic authority boundaries remain consistent across every surface.

## Product surfaces

1. **The installed StrideOS plugin** provides five focused skills: `coach-athlete`, `plan-training`, `use-training-data`, `support-fueling`, and `build-coach-room`.
2. **The Codex or ChatGPT conversation** is the everyday coaching surface. It runs onboarding, asks follow-up questions, explains uncertainty, proposes plans, collects RPE and pain, and returns every material change to an explicit authority boundary.
3. **The coach room** is the visual and collaborative projection produced by `build-coach-room`: an athlete-controlled local dashboard, Site, or other explicitly chosen private-capable surface with scoped reviewer access, exact comments, and proposed revisions.
4. **The optional Node/PWA reference implementation** makes the deterministic onboarding, planning, import, nutrition, dashboard, and approval behavior inspectable. It is not the shipped product identity and is not required to use the plugin.
5. **Codex desktop attended browsing** is a dormant provider-account contract. It becomes eligible only when a current playbook permits the exact operation and a reviewed executor is implemented. No provider browser executor ships now, and Garmin has no qualifying classification.
6. **The deterministic policy and authoritative state** remain in control. Neither chat language nor a client-side Site control may activate a plan, claim workout completion, log food, browse a provider session, or write to a provider account.

The installed plugin remains the everyday product surface. A coach room never receives or reuses a provider session.

## Clean GitHub install flow

1. The user installs `plugins/strideos` from a supported plugin browser or local Codex environment, restarts the desktop app or CLI session, and opens a new Work/Codex task.
2. The `coach-athlete` skill reads the first-run contract and starts onboarding when no complete athlete map exists.
3. Questions are asked one plain-language section at a time: goal and history, recent training, health and recovery, schedule, data sources, strength, optional nutrition, coaching style, permissions, and dashboard sharing.
4. The agent shows a captured summary, missing evidence, provider-route truth, safety status, and confidence before proposing training.
5. The first plan is a proposal. It becomes active only through its linked server-stored decision and athlete approval.
6. If the athlete requests provider data or workout delivery, `use-training-data` offers only current individual-permitted and implemented routes. No attended browser route is enabled in this release; a future route would additionally require a reviewed executor, a user-authenticated visible session, and attended execution.
7. If the athlete opts into a dashboard, `build-coach-room` uses the included `sites/athlete-coach-demo` source as a product template for a new local artifact or athlete-owned Site. The template contains no `project_id`, identity binding, or durable private persistence and must not be called production-private until the chosen surface proves those controls.
8. The athlete may invite a coach. Sharing a link alone must not grant write authority.

No Vercel account, public server, or platform-specific hosting configuration is part of the target runner experience.

## Coach collaboration roles

| Capability | Athlete | Coach | Agent |
| --- | --- | --- | --- |
| View shared plan and evidence freshness | Yes | Yes | Yes |
| Add a workout or plan comment | Yes | Yes | Reads comments |
| Edit another person's comment | No | No | No |
| Draft a precise plan revision | Requests | Requests | Yes |
| Activate or reject a plan change | **Yes** | No | No |
| Write to a provider workout/calendar UI | Unavailable in this release; a future route would require provider permission, a reviewed executor, a visible attended session, and one-use athlete approval | No | No current executor |
| Revoke coach access | **Yes** | No | No |

Comments attach to the exact server-authoritative workout or plan snapshot and carry author identity, timestamp, source, and deletion state. A coach comment is evidence, not an instruction. The agent explains the response and creates a separate diff such as `24 km → 21 km`; the current plan stays active until the athlete approves.

Pain and safety rules still win. An annotation at or above the configured pain boundary pauses normal progression even if athlete and coach both prefer to continue.

## Production coach-room data model (not shipped)

The durable shared version should use platform-backed persistence:

- Sites-authenticated user identity for attribution;
- an owner-controlled allowlist for invited coaches;
- D1 records for athlete-site membership, plan snapshots, workout annotations, coach comments, proposals, approvals, and revocations;
- R2 only when the athlete explicitly enables photo or file uploads;
- local browser storage only for non-authoritative preferences and unfinished text drafts.

The Site must not store provider credentials, API keys, access tokens, browser cookies, session tokens, raw provider pages, or unconfirmed food images. Official-client secrets remain local/private, and attended browser sessions remain inside the athlete's Codex desktop browser.

## What the included demo proves

`sites/athlete-coach-demo` is a synthetic interactive mock for an established runner with four years of training and a 3:20 marathon best. It demonstrates:

- a first-run conversation replay;
- synthetic Garmin-derived and athlete-reported signals labeled by source and freshness without claiming a live provider connection;
- no synthetic readiness score;
- strength inside the weekly plan;
- athlete and coach perspectives;
- inline comments on a long-run concern;
- an exact revision from 24 km to 21 km and 8 km to 6 km at marathon effort;
- athlete-only approval;
- desktop and mobile layouts.

The mock resets interactions on refresh and does not claim live coach identity or persistence. Those require the hosted data model above.

It also does not prove provider browsing or provider writes. The separate Codex desktop contract remains conditional on a provider-permitted classification, a reviewed executor, a user-authenticated attended session, and an exact one-write approval. No such executor ships now; Garmin also fails the route classification.

## Public project site versus private athlete site

StrideOS separates two Site purposes:

- the existing **public project site** for the story, installation, documentation, demo video, privacy, and GitHub link;
- an athlete-owned coach room created through `build-coach-room`, which may be a local artifact or Site and becomes production-private only after identity, access control, durable persistence, invitations, expiry, revocation, and deletion are proved.

The public site is useful for discovery but is not required to use the plugin. A coach room is optional and created only after onboarding and sharing consent.

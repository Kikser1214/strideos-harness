# ChatGPT Work and Sites contract

StrideOS ships as one six-skill plugin for ChatGPT Work mode and Codex. Its skills may work conversationally, prepare optional scheduled coaching rhythms, create a Training Circle projection, or use the optional local reference implementation, while deterministic authority boundaries remain consistent across every surface.

## Product surfaces

1. **The installed StrideOS plugin** provides six focused skills: `coach-athlete`, `plan-training`, `use-training-data`, `support-fueling`, `schedule-coaching`, and `build-coach-room`.
2. **The Codex or ChatGPT conversation** is the everyday coaching surface. It runs onboarding, asks follow-up questions, explains uncertainty, proposes plans, collects RPE and pain, and returns every material change to an explicit authority boundary.
3. **The Training Circle** is the visual and collaborative projection produced by `build-coach-room`: an athlete-controlled local dashboard, Site, or other explicitly chosen private-capable surface with scoped reviewer access, exact comments, and proposed revisions.
4. **The optional Node/PWA reference implementation** makes the deterministic onboarding, planning, import, nutrition, dashboard, and approval behavior inspectable. It is not the shipped product identity and is not required to use the plugin.
5. **Scheduled coaching** is prepared by `schedule-coaching` as a human-readable schedule preview, manual test, and exact read-only prompt. When available, the native Scheduled/automation tool performs creation or updates after review; StrideOS does not hand-write raw automation directives or infer that installation happened, and unattended execution cannot mutate state or use assisted browsing.
6. **Attended browser/computer use** is the universal second provider tier when the current ChatGPT, Work, Codex, or other AI surface exposes it. The user signs in, reads retain `browser_read` provenance and freshness, and every write receives one exact approval.
7. **The deterministic state boundary** remains in control of the optional reference runtime. Neither chat language nor a client-side Site control may silently activate a plan, claim workout completion, log food, or perform an external write.

The installed plugin remains the everyday product surface. A Training Circle never receives or reuses a provider session. StrideOS provides official recommendations; it does not define an allowlist. Explicitly supplied scripts, plugins, and adapters remain outside StrideOS route guidance.

Work web may use a plugin that is already installed or shared through the workspace, but it cannot read this repository's local folder or start the optional local Node/PWA. Clean-clone installation, local state, file imports, and the full reference runtime require ChatGPT desktop or Codex CLI with access to the athlete's machine.

## Clean GitHub install flow

1. The user installs `plugins/strideos` from a supported plugin browser or local Codex environment, restarts the desktop app or CLI session, and opens a new Work/Codex task.
2. The `coach-athlete` skill reads the first-run contract and starts onboarding when no complete athlete map exists.
3. Questions are asked one plain-language section at a time: goal and history, recent training, health and recovery, schedule, data sources, strength, optional nutrition, coaching style, permissions, and dashboard sharing.
4. The agent shows a captured summary, missing evidence, provider-route truth, safety status, and confidence before proposing training.
5. The first plan is a proposal. It becomes active only through its linked server-stored decision and athlete approval.
6. If the athlete requests provider data or workout delivery, `use-training-data` prefers official API/MCP/companion routes, then detects and offers attended host browser/computer use, followed by file/export and manual routes. A user-supplied external tool is handed back to the host rather than blocked by StrideOS guidance.
7. If the athlete wants recurring support, `schedule-coaching` prepares and manually tests one narrow read-only workflow. The athlete reviews the human-readable local schedule, timezone, prompt, destination, and permissions before confirming it through the native Scheduled/automation tool when that surface is available.
8. If the athlete opts into a dashboard, `build-coach-room` uses the included `sites/athlete-coach-demo` source as a product template for a new local artifact or athlete-owned Site. The template contains no `project_id`, identity binding, or durable private persistence and must not be called production-private until the chosen surface proves those controls.
9. The athlete may invite a coach. Sharing a link alone must not grant write authority.

No Vercel account, public server, or platform-specific hosting configuration is part of the target runner experience.

## Coach collaboration roles

| Capability | Athlete | Coach | Agent |
| --- | --- | --- | --- |
| View shared plan and evidence freshness | Yes | Yes | Yes |
| Add a workout or plan comment | Yes | Yes | Reads comments |
| Edit another person's comment | No | No | No |
| Draft a precise plan revision | Requests | Requests | Yes |
| Activate or reject a plan change | **Yes** | No | No |
| Write to a provider workout/calendar UI | Approves one exact preview in a visible attended session | No | Performs one write only when the selected host capability exists, then verifies it |
| Revoke coach access | **Yes** | No | No |

Comments attach to the exact server-authoritative workout or plan snapshot and carry author identity, timestamp, source, and deletion state. A coach comment is evidence, not an instruction. The agent explains the response and creates a separate diff such as `24 km → 21 km`; the current plan stays active until the athlete approves.

Pain and safety rules still win. An annotation at or above the configured pain boundary pauses normal progression even if athlete and coach both prefer to continue.

## Production Training Circle data model (not shipped)

The durable shared version should use platform-backed persistence:

- Sites-authenticated user identity for attribution;
- an owner-controlled allowlist for invited coaches;
- D1 records for athlete-site membership, plan snapshots, workout annotations, coach comments, proposals, approvals, and revocations;
- R2 only when the athlete explicitly enables photo or file uploads;
- local browser storage only for non-authoritative preferences and unfinished text drafts.

The Site must not store provider credentials, API keys, access tokens, browser cookies, session tokens, raw provider pages, or unconfirmed food images. Official-client secrets remain local/private, and attended browser sessions remain inside the current host's visible browser/computer-use surface.

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

The synthetic Site also does not prove a live provider write. Test that separately in a user-authenticated visible session: dry-run preview, one exact approval, one attended write, and visible provider-side verification. The public plugin bundles no unofficial provider connector or connection recipe.

## Public project site versus private athlete site

StrideOS separates two Site purposes:

- the existing **public project site** for the story, installation, documentation, demo video, privacy, and GitHub link;
- an athlete-owned Training Circle created through `build-coach-room`, which may be a local artifact or Site and becomes production-private only after identity, access control, durable persistence, invitations, expiry, revocation, and deletion are proved.

The public site is useful for discovery but is not required to use the plugin. A Training Circle is optional and created only after onboarding and sharing consent.

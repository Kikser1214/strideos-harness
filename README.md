# StrideOS

> An open-source, local-first endurance coaching plugin for ChatGPT Work mode and Codex.

StrideOS is a package of coaching skills—not another training-account app. It helps an athlete build a complete athlete map, understand permitted training evidence, plan running and strength work, use optional fueling support, and create a private coach room that can be shared with a real coach, experienced runner, or trusted friend.

The athlete stays in control. StrideOS may explain and propose; it does not silently activate a plan, log uncertain food, expand sharing, or operate a provider account.

![StrideOS four-week training plan and detailed session view](sites/strideos-landing/public/dashboard-plan.png)

Built from scratch for **OpenAI Build Week 2026** with Codex and GPT-5.6. Licensed under MIT.

## Install the plugin

According to [OpenAI's plugin documentation](https://learn.chatgpt.com/docs/plugins), plugins are supported in Work mode on ChatGPT web, in Work mode or Codex in the ChatGPT desktop app, and in Codex CLI. They are not available in Chat mode, the IDE extension, or mobile. The validated local-source install below requires Git, Node.js 20 or newer, and a desktop or CLI Codex environment; workspace policy may control which personal plugins are available.

```bash
git clone https://github.com/Kikser1214/strideos-harness.git
cd strideos-harness
npx plugins discover .
npx plugins add ./plugins/strideos --target codex
```

On Windows PowerShell, use `npx.cmd` if PowerShell blocks `npx.ps1`:

```powershell
npx.cmd plugins discover .
npx.cmd plugins add ./plugins/strideos --target codex
```

Restart the ChatGPT desktop app or begin a new Codex CLI session, then open a new Work/Codex task so the skills are loaded. Then try:

> I want StrideOS to coach me. Start from the beginning and recommend what I should do.

The distributable package lives at [`plugins/strideos`](plugins/strideos). The repository also includes [marketplace metadata](.agents/plugins/marketplace.json) for the ChatGPT desktop plugin directory, following [OpenAI's repository-marketplace format](https://learn.chatgpt.com/docs/build-plugins#marketplace-metadata). The package contains a real `.codex-plugin/plugin.json`, five skills, UI metadata, references, an icon, and its MIT license. It does not claim an MCP server, hosted backend, parser, native companion, or provider integration that it does not ship.

## Five core skills, many coaching workflows

These are broad intent boundaries, not five single-purpose features. Strength, run-walk progression, race planning, method research, provider routes, meal images, training review, automation preferences, dashboard building, and human-coach feedback live inside the relevant core skill so the plugin can route requests without overlapping triggers or conflicting authority rules.

| Skill | What it does |
| --- | --- |
| `strideos:coach-athlete` | Runs first-time onboarding, resumes an athlete relationship, answers “what should I do today?”, and routes work across StrideOS |
| `strideos:plan-training` | Builds and adapts running, run-walk, race, strength, recovery, and cross-training plans; researches named methods before using them |
| `strideos:use-training-data` | Chooses permitted data routes, preserves provenance and freshness, applies provider model-use rules, and gates any future provider write; tested file parsing lives in the optional reference runtime |
| `strideos:support-fueling` | Provides opt-in loose, guided, detailed, or number-free fueling support, including uncertain meal and fridge images |
| `strideos:build-coach-room` | Builds an athlete-controlled local dashboard or private Site with scoped human review and athlete-only approval |

The skills are self-contained enough to use conversationally. This repository also includes a deterministic local reference implementation and two Sites templates so contributors and judges can inspect and test the rules behind the coaching behavior.

## What makes StrideOS different

### A real coach can join the room

The private coach room is the central collaboration feature. The athlete decides:

- who is invited;
- which workouts, dates, and fields they can see;
- whether nutrition or body context is included;
- how long access lasts;
- when access is revoked.

A reviewer can comment on an exact workout or week and suggest a structured edit. They cannot activate a plan, invite other people, widen sharing, or operate a provider account. An accepted suggestion becomes a new athlete-visible proposal with a before/after diff; the existing plan stays unchanged until the athlete approves it.

The included [`athlete-coach-demo`](sites/athlete-coach-demo) shows the complete product flow with a clearly synthetic 3:20 marathon runner: detailed history, current week, full plan, annotations, coach comments, revision proposals, and athlete-only approval. Its current identity and persistence are demo-only, so the repository does not describe it as production-private.

### Beginner-first onboarding

StrideOS asks for information only when it can change safety, the recommendation, delivery, or communication:

- current activity, running history, recent load, and useful benchmarks;
- pain, relevant symptoms, injury, conditions, medications, and clearance;
- goal, event date if any, expectations, and motivation;
- realistic schedule, work pattern, sleep, stress, terrain, climate, and barriers;
- strength experience, technique confidence, equipment, preferences, and limitations;
- athlete-selected phone, watch, provider, file, or manual evidence;
- coaching style, optional nutrition, collaboration, automation, and delivery preferences.

Someone who does not know training terminology is not asked to choose among unexplained systems. For a suitable beginner who wants StrideOS to decide, the starting recommendation is three separated run-walk-run sessions, two short technique-first strength sessions, and optional easy cycling when it fits schedule and recovery. Running grows gradually and walking reduces only when pain, recovery, and recent effort support it.

### Training methods are researched, not copied

A request for Norwegian-style threshold work, a run-walk protocol, a regional training tradition, or another named method starts research—it does not bypass the athlete assessment.

StrideOS verifies the exact method with current primary or authoritative sources, identifies the intended population and recovery demand, compares it with the athlete's history and goal, and recommends full use, a conservative adaptation, or rejection. It never treats “Norwegian training” as automatically meaning double threshold or describes “African training” as one universal system.

Strength belongs in every eligible plan. Missed sessions never create catch-up stacking. New pain or safety evidence overrides an approved progression.

### Works alongside the accounts the athlete already has

StrideOS does not say a provider is “connected” because a page is open, a client exists, or an athlete approved an idea. Reads and writes are resolved independently.

Route precedence is:

1. provider-permitted official self-service MCP, API, or user-owned native companion;
2. attended browsing only when the provider permits the exact operation and a reviewed executor is enabled;
3. provider-issued export and supported local file import;
4. manual entry.

This plugin ships **no provider browser executor**. Codex having a browser does not make an operation permitted or implemented. The athlete always performs login and MFA; StrideOS never requests, types, reads, copies, or stores credentials, cookies, session tokens, recovery codes, or browser storage.

Before a new setup, the data skill re-checks current first-party provider sources. If the operation is ambiguous, it fails closed and offers the permitted export or manual route.

#### Current provider truth

These are provider-permitted routes the skill can explain or help the athlete configure, not bundled integrations. This release includes no provider client, MCP server, native companion, browser executor, or file parser inside the plugin package. The optional reference runtime separately parses its tested FIT, GPX, TCX, and CSV inputs.

| Provider | Permitted route the skill can explain | Important limit |
| --- | --- | --- |
| Garmin Connect | Athlete-selected official export with a supported local file; manual check-in | No attended agent read/write or watch delivery is enabled; developer access is application/business reviewed |
| Strava | Athlete-initiated export; manual check-in | Ordinary API data cannot enter AI coaching under the reviewed policy; automated signed-in browsing is prohibited |
| Apple Health / Watch | Authorized iOS companion; manual check-in | HealthKit/WorkoutKit and per-type system permission require a native companion |
| Android Health Connect | Authorized Android companion; manual check-in | On-device authorization and a native companion are required |
| Fitbit / Google Health | Official API setup or athlete export with required disclosure and consent; manual check-in | Browser access is not established; restricted scopes and model-use consent must be enforced |
| Oura | Official Oura MCP only after compatible setup is documented; manual subjective entry | Browser, API, and export data must not enter LLM context; provider-data routes currently fail closed |
| WHOOP | Manual subjective entry | Browser extraction is prohibited; API/export model-context rules remain fail-closed |
| Polar | Official API setup where permitted, official export, or manual entry | No browser automation; writes are unavailable unless separately documented |
| COROS | Official read-only MCP, official export, or manual entry | Direct API access is reviewed; no browser automation |
| Suunto | Official export or manual entry | Cloud API access is partner-oriented; no browser automation |

The canonical, source-backed route catalog is [`rules/connector-playbooks.json`](rules/connector-playbooks.json). It records capability, permission, model-context policy, route status, first-party sources, limitations, and review date.

### Every write is exact and one-use

Provider permission and a real executor must exist before approval is even offered. A provider write preview is bound to the provider, route, account, capability, operation, context, exact payload, athlete state, and expiry. One approval authorizes one write.

Expired, altered, mismatched, replayed, scheduled, headless, or unattended attempts stop. After an executor reports success, StrideOS still requires a visible attestation of exactly one write before it calls the action performed. No current personal provider executor is enabled; the checked-in Garmin-shaped judge action is explicitly simulation only.

### Nutrition stays optional and practical

The fueling skill supports `off`, `loose`, `guided`, `detailed`, and `number_free` modes. Number-free preference, under-18 status, a relevant tracking concern, `do_not_use` weight context, and clinician-prescribed constraints override detailed tracking.

Meal and fridge photos are estimates. A photo cannot prove ingredients, portions, allergens, cooking fats, cross-contact safety, or nutritional values. The athlete corrects and confirms the normalized record before logging, and the bundled state never retains the raw image.

Body measurements and images are optional. StrideOS does not infer a diagnosis, body-fat percentage, health status, performance potential, or moral judgment from appearance.

## The control loop

StrideOS keeps model reasoning separate from authority:

1. **Sense** — use only athlete-authorized evidence and preserve source and freshness.
2. **Reason** — combine deterministic analysis with optional GPT-5.6 explanation or image reasoning.
3. **Gate** — check the intended action against versioned rules outside the model.
4. **Propose** — show the exact recommendation or state change and explain why.
5. **Approve or stop** — activate only the exact approved local change; provider actions additionally need a permitted implemented route.
6. **Verify** — call an action performed only after its resulting state is read back or visibly attested.

The model is never the permission system.

## Run the optional local reference implementation

The plugin does not require the web reference implementation. Use it when you want to inspect the deterministic state machine, onboarding, dashboard, imports, nutrition confirmation, decisions, and tests.

```bash
npm run setup
```

On Windows:

```powershell
npm.cmd run setup
```

Open <http://localhost:4173>. The first page is real onboarding; synthetic demo data is never silently loaded as a personal athlete.

Useful commands:

```bash
npm run doctor
npm run verify
npm run test:plugin
npm run reset
npm run brief -- --kind morning_brief
```

- `doctor` checks Node, dependencies, environment syntax, state permissions, privacy artifacts, and clean-install requirements without printing secret values.
- `verify` runs diagnostics, syntax checks, and the complete acceptance suite.
- `test:plugin` checks the plugin manifest, five skills, provider model-context rules, and prohibited-route regression guards.
- `reset` clears the configured local athlete state and returns to a true first run.
- `brief` produces a read-only payload for an optional scheduled prompt; it never changes a plan or provider account.

The deterministic experience needs no wearable, provider account, database, deployment, or OpenAI key. Optional GPT-5.6 mode uses a server-side `OPENAI_API_KEY` only after the athlete enables cloud processing; deterministic safety and permission rules remain authoritative.

## Repository map

```text
plugins/strideos/                     Installable StrideOS plugin package
  .codex-plugin/plugin.json          Plugin manifest and UI metadata
  skills/coach-athlete/              Onboarding and coaching orchestration
  skills/plan-training/              Training plans and method research
  skills/use-training-data/          Provider routes, imports, and provenance
  skills/support-fueling/            Optional fueling and photo boundaries
  skills/build-coach-room/           Private human-coach collaboration
rules/onboarding-schema.json         First-run question inventory
rules/connector-playbooks.json       Source-backed provider policy catalog
rules/harness-policy.json            Deterministic action boundaries
src/                                 Local reference engine and HTTP API
public/                              Local reference interface and PWA assets
sites/athlete-coach-demo/            Synthetic coach-room product template
sites/strideos-landing/              Public project website
docs/                                Architecture, install, research, demo, and release guides
test/                                Unit, HTTP, provider-policy, and plugin-package tests
```

The repository retains its original GitHub URL, `strideos-harness`, but the shipped product is the **StrideOS plugin package**. `src/harness.mjs` is the internal deterministic decision gate, not the product identity.

## Verification evidence

The release gate includes:

- current strict portable validation of the final plugin, five skills, route-safety language, and repository marketplace metadata;
- official Codex validation of the same manifest and skill metadata during packaging, including the installed cache copy;
- plugins CLI discovery showing one `strideos` plugin with five skills;
- an isolated successful Codex install using a relative local path;
- root diagnostics, syntax checks, and the complete Node acceptance suite;
- landing-site build and rendered-page test;
- athlete-and-coach site build and rendered-page tests;
- a last-successful production dependency audit with zero findings on July 18, 2026; refresh it immediately before submission;
- `git diff --check`.

Coverage includes beginner onboarding, safety stops, strength recommendations, training-plan approval and replay protection, workout annotations, nutrition confirmation, imports and freshness, provider permission and model-context filtering, explicit attended-context rejection, one-use expiring write envelopes, Garmin fail-closed behavior, Strava policy blocks, private-companion access control, and plugin packaging.

## Important current boundaries

- StrideOS provides general wellness coaching, not diagnosis or treatment.
- No provider browser executor or real provider write executor ships in this release.
- The coach-room Site is a product template until real identity, private persistence, invitations, and revocation are bound to a production surface.
- Scheduled tasks may summarize and ask questions; they cannot browse a provider, activate a plan, log food, or perform an external write.
- The repository contains synthetic athlete data only.

Read [`PRIVACY.md`](PRIVACY.md) before hosting a personal instance.

## Documentation

- [Clean-clone and plugin installation](docs/INSTALL.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Build plan](docs/BUILD_PLAN.md)
- [Provider access routes](docs/SELF_SERVICE_CONNECTORS.md)
- [Data access and provenance](docs/DATA_CONNECTIONS.md)
- [Onboarding research](docs/ONBOARDING_RESEARCH.md)
- [Training-plan engine](docs/TRAINING_PLAN_ENGINE.md)
- [Nutrition companion](docs/NUTRITION_COMPANION.md)
- [Dashboard contract](docs/DASHBOARD.md)
- [Automations](docs/AUTOMATIONS.md)
- [ChatGPT Work and Sites](docs/CHATGPT_SITES.md)
- [Judge guide](docs/JUDGING_GUIDE.md)
- [Demo video script](docs/VIDEO_SCRIPT.md)
- [Release checklist](docs/RELEASE_CHECKLIST.md)

## Open source

StrideOS is licensed under the [MIT License](LICENSE). Garmin's FIT SDK keeps its own license and is not relicensed by this project; see [Third-party notices](THIRD_PARTY_NOTICES.md).

Contributions are welcome for coaching skills, training-method research, deterministic safety, provider policy, data normalization, privacy, testing, and human-coach collaboration. Every new provider route must be current, first-party sourced, permitted for an individual, compatible with the intended model use, capability-specific, and fail closed when permission or implementation is missing.

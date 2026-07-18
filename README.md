# StrideOS

> A coach that can act. A harness that knows when not to.

StrideOS is an open-source, rule-governed personal coaching harness for runners and people who want to become active. It begins with a real athlete onboarding, combines training signals, strength experience, subjective feedback, schedule constraints, and optional meal images into evidence-backed recommendations, then checks every intended action against an inspectable policy before anything changes.

Built from scratch for **OpenAI Build Week 2026** with Codex and GPT-5.6.

## Why this is a harness

Most AI fitness products stop at chat, or quietly turn a confident answer into an action. StrideOS separates the system into a visible control loop:

1. **Sense** — authorized Garmin-style training data, recovery signals, food images, pain, and RPE.
2. **Reason** — GPT-5.6 produces schema-constrained evidence and a proposed action.
3. **Gate** — deterministic, versioned rules outside the model decide whether the action is autonomous, requires approval, or must stop.
4. **Act** — approved actions move to an integration adapter; declined actions change nothing.

The **decision ledger** makes this loop visible to the athlete and to judges.

## Run it

Requires Node.js 20 or newer. Install the one runtime dependency, Garmin's official FIT JavaScript SDK, then start the local server.

```bash
npm install
npm start
```

Open <http://localhost:4173>. With no environment variables, the full interface runs in deterministic **judge demo mode** with synthetic data.

On the first launch, StrideOS opens the athlete-map onboarding. It asks about current movement, running history, safety, goals, strength experience and equipment, real-life schedule, data sources, coaching preferences, optional nutrition, and delivery. A watch is not required. Draft answers save locally, and the final review shows the starting running frame, strength recommendation, connector truth, and any safety gate before a plan is created.

Reset the local profile before recording or rehearsing a true first run:

```bash
npm run reset
```

### Live GPT-5.6 mode

```bash
cp .env.example .env
# Add OPENAI_API_KEY to .env
npm start
```

On Windows PowerShell:

```powershell
npm.cmd install
Copy-Item .env.example .env
# Add OPENAI_API_KEY to .env
npm.cmd start
```

The server uses the OpenAI Responses API with `gpt-5.6`, image input for meal analysis, medium reasoning effort, and strict JSON Schema outputs. API keys remain server-side.

## Judge demo

No account, Garmin device, private athlete data, or API key is required.

1. Select **Should I run today?**
2. Watch the decision ledger cite four synthetic athlete signals.
3. See the Garmin write stop at the approval boundary.
4. Approve or decline it.
5. Select **Scan a meal**, choose a local image, and review the clearly labeled fixed sample estimate. Add an OpenAI key for real image analysis.
6. Try a message mentioning chest pain or dizziness to see the safety stop.
7. Run `npm run reset`, refresh, and inspect the complete first-run athlete map, including the strength and data-source steps.

In demo mode, external writes are clearly marked as simulated.

## Project structure

```text
data/                  Synthetic judge fixture only
public/                Responsive product experience
rules/                 Versioned action policy
rules/onboarding-schema.json  Versioned first-run question inventory
docs/BUILD_PLAN.md     Delivery tasks and acceptance criteria
docs/ONBOARDING_RESEARCH.md  Safety, strength, and connector sources
src/env.mjs            Tiny local environment loader
src/harness.mjs        Deterministic gate and decision ledger
src/onboarding.mjs     Validation, readiness, connector, running, and strength analysis
src/openai.mjs         GPT-5.6 text + vision reasoning
src/garmin.mjs         Optional external bridge + honest simulation fallback
src/connectors.mjs     Runtime connector truth, setup contracts, and source priority
src/imports.mjs        FIT, GPX, TCX, CSV, and manual check-in normalization
src/store.mjs          Atomic local decision and onboarding persistence
src/reset.mjs          Clean first-run reset command
src/server.mjs         Dependency-free Node HTTP server
test/                  Rule-boundary and HTTP integration tests
```

### Optional Garmin bridge

No Garmin integration is claimed by default. The interface reports **Garmin simulation**, and an approved workout records a simulated result without changing an external calendar. Deployers can set `GARMIN_BRIDGE_URL` (and optionally `GARMIN_BRIDGE_TOKEN`) to route approved workout writes through their own server-side adapter.

Decisions are persisted atomically in the operating system's temporary directory by default. Set `STRIDEOS_STATE_FILE` to choose a durable deployment path.

### Wearables and files

Open **Data sources** to see the runtime truth matrix. FIT, GPX, TCX, and CSV import works now; FIT decoding uses Garmin's official SDK. Every file receives a server-side preview before the athlete explicitly confirms storage. Only normalized activity summaries are kept in local state, and each summary has a delete control. Manual pain, RPE, energy, sleep-feel, and context check-ins are also available now.

Garmin can use the documented bridge contract, but a configured adapter is never presented as proof that an athlete account is connected. Strava exposes its required OAuth environment contract without claiming the OAuth flow is live. Apple Health requires an iOS HealthKit companion, and Android Health Connect requires an Android companion. Fitbit, Oura, WHOOP, Polar, COROS, and Suunto stay visibly labeled **planned**. See [Data connections](docs/DATA_CONNECTIONS.md) and [the onboarding research pack](docs/ONBOARDING_RESEARCH.md).

## Safety and privacy

- StrideOS is for general wellness coaching, not diagnosis or medical treatment.
- Possible red flags stop the normal action path and recommend qualified care.
- A positive onboarding safety signal can save the profile but pauses automated running and strength prescription until the indicated review is resolved.
- Strength is always considered; the starting dose adapts to experience, technique confidence, equipment, schedule, and recovery.
- Food-image nutrition values are explicitly estimates and require confirmation before logging.
- Plan changes and external writes require athlete approval.
- Unknown actions stop by default.
- The repository contains synthetic athlete data only.
- `.env`, uploads, logs, and private data paths are gitignored.

See [PRIVACY.md](PRIVACY.md) for the data model and deployment responsibilities.

## How Codex accelerated the build

Codex was the primary engineering collaborator for the Build Week implementation. It:

- translated the product thesis into a bounded, testable control loop;
- implemented the rule engine, API, multimodal flow, and interface;
- used current OpenAI documentation to select GPT-5.6 Responses API patterns;
- added schema-constrained outputs after a hardening review;
- tested the approval boundary and visually verified desktop and mobile layouts with a real browser.

The human made the central product decisions: rebuild from scratch, treat StrideOS as a personal runner harness rather than a generic app, put Garmin and food-photo workflows in scope, and release the result as open source.

## Tests

```bash
npm test
npm run check
```

The current suite covers action boundaries, onboarding validation, beginner strength recommendations, safety stops, advanced-method suitability, connector truth, real FIT/GPX/TCX/CSV parsing, import consent and deletion, manual check-ins, draft persistence, and completed first-run restoration.

## Build Week plan

The rebuild is intentionally split into auditable tasks. See [the delivery plan](docs/BUILD_PLAN.md) for the onboarding, connector, analysis, plan, nutrition, dashboard, automation, open-source, hardening, submission, and demo-video checkpoints.

## Open source

StrideOS source is licensed under the [MIT License](LICENSE). Garmin's runtime FIT SDK remains under Garmin's own SDK license; it is installed from npm and is not relicensed by this project. See [Third-party notices](THIRD_PARTY_NOTICES.md). Contributions, experiments, and integration adapters are welcome.

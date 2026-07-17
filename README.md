# StrideOS

> A coach that can act. A harness that knows when not to.

StrideOS is an open-source, rule-governed personal coaching harness for runners. It combines training signals, subjective feedback, and meal images into evidence-backed recommendations, then checks every intended action against an inspectable policy before anything changes.

Built from scratch for **OpenAI Build Week 2026** with Codex and GPT-5.6.

## Why this is a harness

Most AI fitness products stop at chat, or quietly turn a confident answer into an action. StrideOS separates the system into a visible control loop:

1. **Sense** — authorized Garmin-style training data, recovery signals, food images, pain, and RPE.
2. **Reason** — GPT-5.6 produces schema-constrained evidence and a proposed action.
3. **Gate** — deterministic, versioned rules outside the model decide whether the action is autonomous, requires approval, or must stop.
4. **Act** — approved actions move to an integration adapter; declined actions change nothing.

The **decision ledger** makes this loop visible to the athlete and to judges.

## Run it

Requires Node.js 20 or newer. There are no runtime dependencies.

```bash
npm start
```

Open <http://localhost:4173>. With no environment variables, the full interface runs in deterministic **judge demo mode** with synthetic data.

### Live GPT-5.6 mode

```bash
cp .env.example .env
# Add OPENAI_API_KEY to .env
npm start
```

On Windows PowerShell:

```powershell
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
5. Select **Scan a meal**, choose any local meal image, and review the estimate before logging.
6. Try a message mentioning chest pain or dizziness to see the safety stop.

In demo mode, external writes are clearly marked as simulated.

## Project structure

```text
data/                  Synthetic judge fixture only
public/                Responsive product experience
rules/                 Versioned action policy
src/env.mjs            Tiny local environment loader
src/harness.mjs        Deterministic gate and decision ledger
src/openai.mjs         GPT-5.6 text + vision reasoning
src/server.mjs         Dependency-free Node HTTP server
test/                  Rule-boundary tests
```

## Safety and privacy

- StrideOS is for general wellness coaching, not diagnosis or medical treatment.
- Possible red flags stop the normal action path and recommend qualified care.
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

## Open source

Licensed under the [MIT License](LICENSE). Contributions, experiments, and integration adapters are welcome.

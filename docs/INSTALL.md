# Install StrideOS

StrideOS ships as an installable plugin package for ChatGPT Work mode and Codex. The repository also contains an optional local reference implementation for inspecting and testing the deterministic rules behind the skills.

## Requirements

- Git;
- Node.js 20 or newer;
- Work mode or Codex in the ChatGPT desktop app, or Codex CLI, for the validated repository-marketplace path.

No wearable, provider account, OpenAI API key, database, or cloud deployment is required.

## Recommended: add the GitHub marketplace

This keeps the marketplace source backed by the public repository and is the preferred setup when you want to use StrideOS across supported Codex environments:

```bash
codex plugin marketplace add Kikser1214/strideos-harness --ref main
codex plugin list
codex plugin add strideos@strideos
```

`codex plugin list` should show the StrideOS marketplace entry. `codex plugin add strideos@strideos` installs it for Codex CLI. Restart the ChatGPT desktop app, open **Plugins Directory**, and install or enable **StrideOS** there; then begin a new Work/Codex task. A workspace administrator may control which personal marketplaces and plugins are visible.

## Local clone marketplace

Use this route when you want to inspect or change the repository before loading the plugin:

```bash
git clone https://github.com/Kikser1214/strideos-harness.git
cd strideos-harness
codex plugin marketplace add .
codex plugin list
codex plugin add strideos@strideos
```

The `.` is the repository root containing `.agents/plugins/marketplace.json`; do not point the marketplace command directly at the nested skill package.

Windows PowerShell:

```powershell
git clone https://github.com/Kikser1214/strideos-harness.git
Set-Location strideos-harness
codex plugin marketplace add .
codex plugin list
codex plugin add strideos@strideos
```

The marketplace listing should expose `strideos@strideos`; `npm run test:plugin` separately proves the exact six-skill package inventory. Restart the ChatGPT desktop app or begin a new Codex CLI session, install or enable StrideOS in the desktop **Plugins Directory** when applicable, and open a new Work/Codex task so the skills are loaded.

An installed plugin is a cached snapshot. After editing a fork or local clone, update the version/cachebuster in `plugins/strideos/.codex-plugin/plugin.json`, reinstall `strideos@strideos` from the intended marketplace source, restart when required, and open a new task. Do not edit a generated cache and expect the change to persist. See [Ownership, forks, and local extensions](OWNERSHIP_AND_EXTENSIONS.md).

[OpenAI's plugin documentation](https://learn.chatgpt.com/docs/plugins) currently supports installed or workspace-shared plugins in Work mode on ChatGPT web, in Work mode or Codex in the ChatGPT desktop app, and through the Codex CLI plugin browser. Plugins are not available in Chat mode, the IDE extension, or mobile. Work web cannot access this clone's local folder or run its optional local reference implementation; use ChatGPT desktop or Codex CLI for that path. A workspace administrator may further control installation and marketplace visibility.

Try:

> @strideos I want StrideOS to coach me. Start with first-time onboarding and recommend a safe starting week.

The bundled skills use explicit invocation so StrideOS does not silently enter unrelated chats or another personal coaching workspace.

## What is installed

The plugin root is [`plugins/strideos`](../plugins/strideos):

```text
.codex-plugin/plugin.json
assets/icon.svg
skills/coach-athlete/
skills/plan-training/
skills/use-training-data/
skills/support-fueling/
skills/schedule-coaching/
skills/build-coach-room/
LICENSE
```

The package contains coaching instructions, UI metadata, marketplace metadata, and focused references. It does not bundle or claim a provider MCP server, hosted backend, browser executor, provider write executor, native companion, or activity-file parser.

## Verify the package

From the repository root:

```bash
npm run test:plugin
codex plugin list
```

The repository acceptance test checks the manifest, exact skill inventory, skill frontmatter, UI prompts, references, assets, official-recommendation language, ownership behavior, and unofficial-recipe regression guards.

Contributors can also run the Codex plugin-creator `validate_plugin.py` helper and skill-creator `quick_validate.py` helper when those system tools are available locally. The release procedure validates the source package, every skill, and the installed plugin copy.

## Run the optional local reference implementation

Use this when you want the onboarding wizard, athlete dashboard, decision ledger, data-import previews, nutrition confirmation, and synthetic judge flow:

```bash
npm run setup
```

Windows PowerShell:

```powershell
npm.cmd run setup
```

`setup` installs the locked dependency set, runs the setup doctor, and starts the local experience at <http://localhost:4173>. The first page is the real athlete-map onboarding. It never loads synthetic sample data as a personal profile.

For local ChatGPT desktop use, StrideOS first offers **Open the browser questionnaire (recommended)** or **Continue here in chat**. If the athlete selects the questionnaire, `coach-athlete` opens `http://localhost:4173` inside ChatGPT's in-app browser and keeps that same embedded tab available while the athlete completes the selections; it does not launch an external browser automatically. The skill then re-reads `GET /api/bootstrap` and continues only after `onboarding.completedAt` is present. On Work/cloud surfaces that cannot reach localhost—or surfaces without the in-app browser—the skill explains that briefly and asks the same detailed intake through eight grouped conversational rounds instead.

Stop the server with `Ctrl+C`. Later starts use:

```bash
npm start
```

## Setup doctor

```bash
npm run doctor
```

The doctor verifies the Node version, workspace, Garmin FIT SDK dependency, `.env` syntax without printing values, state-path writability, configured port, privacy/runtime ignore rules, synthetic sample validity, license, privacy notice, and installation guide. A missing OpenAI key is informational.

If the configured port is occupied, stop the other process or choose another in `.env`:

```dotenv
PORT=4180
```

## Optional GPT-5.6 mode

The deterministic experience works without an API key. To enable live coaching explanation and meal-image reasoning, copy the environment template and add the user's own server-side key.

macOS/Linux:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Set `OPENAI_API_KEY`, keep the configured model, and restart. Personal context is sent only when the athlete also permits cloud processing. Never commit `.env`.

## Training data and providers

Provider setup is deliberately outside zero-account first run. StrideOS provides official recommendations; it does not define an allowlist. The data skill prefers official API/MCP/companion routes, detects attended browser/computer use on the current interactive host, then offers provider export/local import and manual entry.

The athlete always completes login and MFA; the agent never handles credentials or session material. Browser/computer use stays visible, attended, and unavailable to Scheduled or headless work. Reads retain `browser_read` provenance and freshness; every write receives one dry-run preview, one approval, one write, and visible verification. The public package never bundles or teaches unofficial connectors. If the user explicitly supplies a script, plugin, or adapter, StrideOS route guidance steps aside and the host handles it.

See [Provider access routes](SELF_SERVICE_CONNECTORS.md) and [`rules/connector-playbooks.json`](../rules/connector-playbooks.json).

## Local state and reset

The reference implementation stores normalized local state in the operating system's temporary directory by default. Set an absolute `STRIDEOS_STATE_FILE` in `.env` for a durable location. The parent directory must be writable by the user running the server.

Reset to a true first run:

```bash
npm run reset
```

This clears the configured StrideOS state. It does not delete source files, the installed plugin, or external account data.

[`data/sample-profile.json`](../data/sample-profile.json) is synthetic documentation and test input. It is never imported automatically. FIT, GPX, TCX, and CSV files receive a preview before normalized summaries are saved; raw activity request bytes and raw meal images are not retained by the bundled state store.

For access from another device, do not expose the default local server directly. Follow [private companion mode](REMOTE_COMPANION.md) for HTTPS, access-key protection, persistent state, and PWA requirements.

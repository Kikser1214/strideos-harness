# Install StrideOS

StrideOS ships as an installable plugin package for ChatGPT Work mode and Codex. The repository also contains an optional local reference implementation for inspecting and testing the deterministic rules behind the skills.

## Requirements

- Git;
- Node.js 20 or newer;
- Work mode or Codex in the ChatGPT desktop app, or Codex CLI, for the validated local-source path.

No wearable, provider account, OpenAI API key, database, or cloud deployment is required.

## Install the plugin from a clone

```bash
git clone https://github.com/Kikser1214/strideos-harness.git
cd strideos-harness
npx plugins discover .
npx plugins add ./plugins/strideos --target codex
```

Use the relative `./plugins/strideos` path from the repository root. This is portable and avoids local-path parsing problems in some Windows CLI environments.

Windows PowerShell:

```powershell
git clone https://github.com/Kikser1214/strideos-harness.git
Set-Location strideos-harness
npx.cmd plugins discover .
npx.cmd plugins add ./plugins/strideos --target codex
```

Discovery should report one plugin named `strideos` with five skills. The installer registers the package in the local Codex plugin cache and configuration. The clone also contains `.agents/plugins/marketplace.json`, which describes StrideOS to the ChatGPT desktop plugin directory. Restart the ChatGPT desktop app or begin a new Codex CLI session, then open a new Work/Codex task so the skills are loaded.

[OpenAI's plugin documentation](https://learn.chatgpt.com/docs/plugins) currently supports plugins in Work mode on ChatGPT web, in Work mode or Codex in the ChatGPT desktop app, and through the Codex CLI plugin browser. Plugins are not available in Chat mode, the IDE extension, or mobile. A workspace administrator may further control installation and marketplace visibility.

Try:

> I want StrideOS to coach me. Start with first-time onboarding and recommend a safe starting week.

## What is installed

The plugin root is [`plugins/strideos`](../plugins/strideos):

```text
.codex-plugin/plugin.json
assets/icon.svg
skills/coach-athlete/
skills/plan-training/
skills/use-training-data/
skills/support-fueling/
skills/build-coach-room/
LICENSE
```

The package contains coaching instructions, UI metadata, marketplace metadata, and focused references. It does not bundle or claim a provider MCP server, hosted backend, browser executor, provider write executor, native companion, or activity-file parser.

## Verify the package

From the repository root:

```bash
npm run test:plugin
npx plugins discover .
```

The repository acceptance test checks the manifest, exact skill inventory, skill frontmatter, UI prompts, references, assets, provider model-context rules, and prohibited-route regression guards.

Contributors can also run the Codex plugin-creator `validate_plugin.py` helper and skill-creator `quick_validate.py` helper when those system tools are available locally. The release procedure validates the source package, every skill, and the installed cache copy.

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

Provider setup is deliberately outside zero-account first run. The data skill resolves each read or write capability against the current source-backed playbook. It describes only provider-permitted individual routes and fails closed when permission, model-context use, or implementation is missing.

The current plugin ships no provider browser executor. The athlete always completes login and MFA; the agent never handles credentials or session material. Garmin's current individual route is an athlete-selected official export with a supported local file or manual entry. Strava API data does not enter AI coaching under the reviewed policy, and signed-in browser automation is prohibited.

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

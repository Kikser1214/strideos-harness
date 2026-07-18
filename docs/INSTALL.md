# Install StrideOS from a clean clone

StrideOS supports a zero-account local demo on Windows, macOS, and Linux. You need Git and Node.js 20 or newer. A Garmin watch, wearable account, OpenAI API key, database, and cloud deployment are not required.

## One-command first run

Clone the public repository, enter it, then run the setup command:

```bash
git clone https://github.com/Kikser1214/strideos-harness.git
cd strideos-harness
npm run setup
```

`npm run setup` installs the locked dependency set, runs the setup doctor, and starts StrideOS at <http://localhost:4173>. The first page is the athlete-map onboarding. It never loads the synthetic sample as a personal profile.

Stop the server with `Ctrl+C`. Later starts only need:

```bash
npm start
```

## Windows PowerShell

```powershell
git clone https://github.com/Kikser1214/strideos-harness.git
Set-Location strideos-harness
npm.cmd run setup
```

If PowerShell execution policy blocks `npm.ps1`, use `npm.cmd` as shown. StrideOS is a native Node application and does not require WSL.

## macOS

Install a current Node.js LTS release with the official installer or your package manager, verify `node --version` reports 20 or newer, and run the common setup commands above. On Apple Silicon and Intel Macs, the included JavaScript dependency installs without a native compilation step.

## Linux

Use a maintained Node.js 20+ package for your distribution or a Node version manager. Do not rely on an older distribution-default Node. Verify versions, then run the common setup commands:

```bash
node --version
npm --version
npm run setup
```

## Setup doctor

Run this any time installation or startup is unclear:

```bash
npm run doctor
```

The doctor verifies the Node version, workspace, Garmin FIT SDK dependency, `.env` syntax without printing values, state-path writability, configured port, privacy/runtime gitignore rules, synthetic sample validity, license, privacy notice, and this install guide. A missing OpenAI key is informational, not a failure.

If the configured port is already occupied, stop the other process or choose another in `.env`:

```dotenv
PORT=4180
```

## Optional live GPT-5.6 mode

Demo mode is complete without an API key. To enable live coaching and real meal-image reasoning, copy the environment template and add your own server-side key:

macOS/Linux:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Set `OPENAI_API_KEY` in `.env`, keep `OPENAI_MODEL=gpt-5.6`, and restart. Personal context is sent only when the completed athlete profile also permits cloud processing. Never commit `.env`.

## Local state and reset

By default StrideOS stores normalized local state in the operating system's temporary directory. For a durable path, set an absolute `STRIDEOS_STATE_FILE` in `.env`. The parent directory must be writable by the user running the server.

Reset to a true first run:

```bash
npm run reset
```

This clears the configured local StrideOS state: onboarding, plan lifecycle, decisions, normalized imports, check-ins, meal records, and automation proposal/test metadata. It does not delete source files or external account data.

## Synthetic sample and judge mode

[`data/sample-profile.json`](../data/sample-profile.json) documents a complete synthetic beginner profile for contributors and tests. It is not imported automatically. The separate `data/demo-athlete.json` fixture powers the explicitly labeled no-setup judge trace only.

Use **Data sources** for a no-watch workflow: manual pain/RPE/energy/sleep check-ins work immediately, and FIT/GPX/TCX/CSV files receive a preview before normalized summaries are saved. Raw activity files and raw meal images are not retained by the included state store.

To open the dashboard from a phone or another computer, do not expose the default local server directly. Follow the [private companion mode](REMOTE_COMPANION.md) contract for access-key protection, HTTPS, a persistent state volume, and the installable PWA.

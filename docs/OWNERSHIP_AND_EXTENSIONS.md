# Ownership, forks, and local extensions

StrideOS is an MIT-licensed plugin package. Installing it gives the user a copy of skills and references; it does not give the upstream project authority over the user's computer, accounts, tools, or fork.

## What upstream ships

The public package:

- recommends documented official API, MCP, native-companion, attended browser/computer-use, provider export, and manual routes;
- supports attended browser/computer use in the provider session the user opened and authenticated;
- never bundles or teaches private endpoints, reverse-engineered clients, credential replay, or unofficial connector recipes;
- never requests, types, reads, copies, or stores provider credentials, MFA codes, cookies, or session tokens;
- requires an exact preview and one approval for every external write.

These are upstream distribution choices. They are not a remote policy service and they do not turn the plugin into the authority over an installed host.

**Central invariant: StrideOS provides official recommendations; it does not define an allowlist.**

## Recommendation is not enforcement

Keep two situations separate:

1. **The user asks how to connect a provider.** Recommend official MCP/API/companion routes first, attended browser/computer use second when the current AI surface exposes it, file import third, and manual entry fourth. Do not claim browser capability on a surface that lacks it. Do not expose an unofficial method as a setup tutorial.
2. **The user explicitly supplies a tool or changes a fork.** StrideOS provider-route guidance steps aside. The agent handles the local adapter, script, other plugin, companion, or other external host capability as if StrideOS were absent. The upstream catalog is not consulted as an allowlist. Only the host's permissions and the ordinary exact approval boundary for writes apply. Do not call the capability StrideOS-supported.

The plugin cannot bypass Codex, ChatGPT, operating-system, organization, or tool-level security controls. Those controls are separate from StrideOS guidance.

## Universal attended browser/computer use

For any provider with a usable web app, the user may ask the agent to work in the user's own authenticated session:

1. The user opens the provider page and completes login and MFA personally.
2. The session stays visible, attended, and interruptible.
3. A read collects only the fields needed for the stated coaching purpose, normalizes them locally with `provenance: "browser_read"`, observation/retrieval timestamps, and freshness, and then treats the result like an imported record.
4. A write begins with a dry-run showing the visible account, operation, exact payload, target, and expected result.
5. One explicit approval authorizes one write. A retry, second workout, changed date, changed payload, or extra confirmation requires a new preview and approval.
6. The agent verifies the visible result before reporting the write as performed.

Never use this route from Scheduled, headless, background, or unattended work. Never retain raw HTML, screenshots by default, cookies, browser storage, credentials, or unrelated account data.

## Using an explicitly supplied local adapter

When the user says, for example, "use this adapter" or a fork includes its own integration, StrideOS steps aside rather than evaluating the adapter against its public route catalog. The agent may still use this practical checklist as ordinary tool hygiene:

1. Identify the exact tool, source location, requested read or write, and destination.
2. Verify the tool is present and inspect its declared behavior before execution.
3. Let the user configure authentication directly; do not ask for or expose secrets.
4. Label results as coming from a user-supplied adapter where the state model supports provenance.
5. For reads, minimize collection and retain source and freshness.
6. For writes, show the exact dry-run, collect one approval, perform one write, and verify the result.
7. Do not describe the adapter as bundled, audited, endorsed, or supported by upstream StrideOS.

Upstream documentation must not include the adapter's unofficial connection recipe. A fork owner may write and maintain different local instructions in that fork.

The optional reference runtime uses conservative multilingual free-text symptom stops, but it is not a medical-language interpreter; structured safety answers, current symptoms, and qualified human judgment remain authoritative.

The bundled nutrition runtime does not retain raw meal or fridge photos; local retention and per-photo retention prompts are not implemented in this release.

## Installed snapshots and updates

Codex loads an installed plugin snapshot. Editing the Git checkout does not mutate an already installed copy or the instructions already loaded into an existing task.

After changing a fork or local clone:

1. Update the plugin version/cachebuster in `plugins/strideos/.codex-plugin/plugin.json`.
2. Make sure Codex is using the intended local repository marketplace, not an older public or cached source.
3. Reinstall with `codex plugin add strideos@strideos`.
4. Restart the desktop app when required and begin a new Work/Codex task.
5. Verify the loaded skill text before testing an external action.

Do not edit files inside a generated plugin cache and expect the change to be durable. Change the source, reinstall the snapshot, and test in a new task.

## Upstream contribution boundary

Pull requests to the public package may add provider-documented routes, generic attended-browser behavior, data normalization, approval envelopes, and extension interfaces. They must not add unofficial connector code or instructions. Personal forks and local adapters remain possible without being represented as upstream features.

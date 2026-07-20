# Provider access routes

StrideOS works alongside the accounts an athlete already uses. It does not claim that a provider account is permanently connected merely because a page is open, a client is configured, or a file was imported. Reads and writes are proved separately.

**StrideOS provides official recommendations; it does not define an allowlist.** The public skills and playbooks describe only provider-documented routes. They do not bundle or teach unofficial connectors. Attended browser/computer use is a universal host capability that StrideOS may actively suggest when the current surface exposes it. When a user explicitly selects a local script, another plugin, or another external host capability, StrideOS provider guidance steps aside and the agent handles that tool as if the plugin were absent.

## Route resolver

Use this order:

1. **Official individual self-service route** - a provider-documented API, MCP connector, or native companion that the athlete can authorize.
2. **User-selected attended browser/computer use** - the agent works in the visible web session the user opened and authenticated. This is a host capability, not a bundled provider connector.
3. **Provider export and local import** - the athlete obtains an official export and a verified local parser normalizes the selected file.
4. **Manual entry** - athlete check-ins and plan notes remain first-class evidence.

Structured official routes stay preferred because they are stable, preserve fields, and may support separately authorized unattended reads. Browser/computer use is attended only and is never scheduled or headless.

Resolve each capability independently. Reading activities does not prove recovery access; reading an account does not prove workout creation; creating a workout does not prove calendar or watch delivery.

## Setup modes

Respect `delivery.connectorSetupMode` when StrideOS initiates setup:

- `guide_only`: explain official choices and requirements without installing or authorizing anything;
- `allow_local_setup_after_review`: preview official client, companion, file, and permission steps before execution;
- `not_now`: stop StrideOS-initiated setup and keep file/manual input available.

These preferences do not create an installation-wide block. If the user later gives an explicit instruction to use a host tool or local extension, handle that request under the host's permissions.

## Universal attended browser/computer use

Any provider with a usable web app can be handled through browser or computer-use capabilities that the current host exposes.

### Session boundary

- The user opens the provider website and completes login and MFA personally.
- The agent never types, requests, reads, copies, or stores passwords, MFA codes, cookies, session tokens, recovery codes, or browser-storage values.
- The page stays visible and the user remains present and able to interrupt the flow.
- An open page is an ephemeral `session_ready` state, not a persistent `connected` state.
- A signed-out page, account mismatch, unexpected interstitial, or changed interface stops the current attempt and returns control to the user.

### Reads

After the athlete selects the source, read only the visible values needed for the stated coaching purpose. A read does not need write approval.

Normalize the result locally with:

- `source: <providerId>`;
- `provenance: "browser_read"`;
- `ingestionRoute: "browser_read"`;
- source observation time;
- local retrieval time;
- freshness;
- a sanitized description of the visible view when useful.

Treat the normalized result like an imported record. Do not retain raw HTML, screenshots by default, cookies, session material, hidden page state, or unrelated account information.

### Writes

Every attended write follows the same contract:

1. Build a dry-run showing the provider, visible account, operation, exact workout or calendar payload, target date, and expected result. Do not prefill a form during preview because some web apps save drafts automatically.
2. Revalidate the current approved plan, safety state, recovery evidence, and destination.
3. Create one exact, expiring approval envelope bound to the account hint, operation, resource hash, and destination.
4. After approval, perform one visible action in the provider UI.
5. Inspect the visible result before reporting the write as performed.

One approval means one write. A retry, second workout, changed date, changed payload, additional calendar edit, account change, or UI drift requires a new preview and approval.

Never perform provider browsing from Scheduled, headless, background, or unattended work.

## User-supplied adapters and other plugins

The upstream package does not describe, ship, audit, or support unofficial adapters. It also does not block them.

When the user explicitly names an existing script, local adapter, other plugin, MCP server, companion, or host tool:

1. Stop applying the StrideOS provider catalog as an allowlist.
2. Confirm the exact capability and requested operation exist.
3. Let the user configure authentication directly without exposing secrets.
4. Handle the tool under its host permissions as if StrideOS were absent.
5. Preserve source and freshness for reads.
6. Use an exact preview, one approval, one write, and result verification for mutations.
7. Do not label the tool as a StrideOS integration or reproduce its unofficial connection recipe.

## Official recommendation notes

These notes describe what the public plugin may proactively recommend. They do not restrict user-selected host capabilities.

### Garmin Connect

For structured self-service data, recommend an athlete-selected official Garmin export followed by a supported local import, or manual entry. Garmin Connect Developer Program access is application/business reviewed rather than a normal individual setup path.

If the athlete asks to use Garmin Connect in the browser, use the universal attended flow. The athlete signs in; a workout/calendar write receives an exact preview and one approval; the agent performs one visible write and verifies that it appears in the intended calendar. Do not call this a bundled Garmin connector.

### Strava

Prefer the official Strava MCP where it is available on the current host. Otherwise recommend the athlete's official export or manual entry. Do not teach an unofficial API setup as a substitute for the MCP.

If the athlete explicitly selects the signed-in Strava web app, use the universal attended flow as a host capability, not as a StrideOS connector.

### COROS

Prefer the official COROS MCP for user-authorized reads in supported AI clients. The MCP is read-only, so do not imply workout creation. Official export and manual input remain available. User-selected attended browser/computer use is handled by the universal session contract.

### Apple Watch and Apple Health

Apple Health reads and structured Apple Watch delivery require a user-authorized native iOS companion. Use [HealthKit authorization](https://developer.apple.com/documentation/HealthKit/authorizing-access-to-health-data) for selected evidence types and [WorkoutKit](https://developer.apple.com/documentation/workoutkit) for previewing and scheduling supported workouts. The user approves system permissions on the Apple device.

An agent may scaffold the companion only after local-setup consent. Before a companion write, show the exact workout, destination, authorization state, and disconnect/delete path. Keep `companion_required` until a complete round trip is proved.

### Android and Wear OS

Use a user-authorized native companion with [Health Connect](https://developer.android.com/health-and-fitness/health-connect/get-started). Request only required record types and prove planned-exercise support on the installed Android, Health Connect, and destination-app versions. A planned-exercise write does not by itself prove that a watch consumed it.

### Fitbit and Google Health

Recommend the official Google Health API, an athlete-selected Google export, or manual entry. API setup uses Google Cloud, OAuth, required scopes, disclosure, and consent; broader release may require verification. A user-selected web flow remains a host capability under the universal attended contract.

### Oura

Prefer Oura's official MCP for LLM use when compatible setup is available. Keep Oura's current model-use and retention requirements visible. If no compatible official route is available, offer manual subjective entry. A user-selected attended web flow remains outside the StrideOS recommendation catalog.

### WHOOP

Recommend only official OAuth/API or athlete-export routes after the current consent, retention, and model-use requirements are satisfied; otherwise offer manual subjective entry. A user-selected attended web flow remains outside the StrideOS recommendation catalog.

### Other providers

For Polar, Suunto, Wahoo, and new providers, document current official individual routes, read/write capabilities, export formats, revocation, deletion, source URLs, and verification date. Do not add unofficial connection instructions. User-selected browser/computer use and local extensions remain outside that official catalog.

## Completion checklist

A provider setup or one-off attended operation is complete only when its actual limits are visible:

- the intended account and selected capability are verified;
- normalized read provenance and freshness are recorded, when reading;
- the exact dry-run and one-write approval are verified, when writing;
- the provider-side result is visibly confirmed;
- sign-out or revocation is explained where relevant;
- local normalized records are deletable;
- raw credentials and session material are absent from Git, Sites, logs, screenshots, and StrideOS state.

# Data access routes

StrideOS reports what the current surface and selected tool can prove. It works alongside provider accounts; it does not claim to own or permanently connect them.

**StrideOS provides official recommendations; it does not define an allowlist.**

## Resolver precedence

For each provider and requested capability, prefer:

1. a provider-documented official self-service API, MCP connector, or native companion;
2. attended browser/computer use in the user's visible authenticated session when the current ChatGPT, Work, Codex, or other AI surface exposes it;
3. a provider-issued export imported locally;
4. manual entry.

Reads and writes resolve separately. Browser/computer use is attended and interruptible; skip it only when the current surface lacks the capability, the user is absent, or the session cannot safely continue. Never use it from Scheduled, headless, background, or unattended work.

The public playbooks contain official routes only. If the user explicitly supplies a local script, another plugin, or another external host capability, StrideOS guidance steps aside. The agent handles it as if the plugin were absent, subject to host permissions and ordinary exact approval for writes. Do not call it a StrideOS integration or teach its unofficial setup method.

## Route truth matrix

| Source | Public recommendation | What StrideOS may do | Limits that remain visible |
| --- | --- | --- | --- |
| Official provider API/MCP | Provider-documented individual authorization | Read or write only the granted capability | Scope, model-use, expiry, and revocation remain provider-specific |
| Native Apple/Android companion | User-authorized HealthKit, WorkoutKit, or Health Connect capability | Read granted record types or write a supported approved workout | On-device permission and a proved round trip are required |
| Attended browser/computer use | Available for provider web apps when the current host exposes it | Read visible relevant fields or perform one approved visible write | User login only; session-bound; never scheduled/headless; no credentials retained |
| FIT / GPX / TCX / CSV | Athlete-selected local file | Preview, normalize, confirm, preserve freshness, and delete | A verified parser must exist on the current surface |
| Manual check-ins | Built in | Record pain, effort, energy, sleep feel, and context | Subjective by design; no device or account required |
| User-supplied script/plugin/tool | Outside the StrideOS recommendation layer | The agent handles it through the host as if StrideOS were absent | Not bundled, documented, certified, or supported by upstream |

No status string should imply a persistent provider connection. An official authorization, native companion, open attended session, imported file, and manual record are distinct states.

## Browser-read contract

1. Detect that the current host actually exposes browser or computer use.
2. The athlete opens the provider web app and completes login and MFA.
3. Read only visible fields needed for the stated coaching purpose.
4. Normalize with `source: <providerId>`, `provenance: "browser_read"`, `ingestionRoute: "browser_read"`, observation time, retrieval time, and freshness.
5. Treat the result like an imported record downstream while preserving provenance.
6. Do not persist raw HTML, screenshots by default, browser storage, cookies, tokens, or unrelated account data.

Browser reads do not require write approval after the athlete selects the source.

## Browser-write contract

1. Build a local dry-run from the exact current approved resource. Do not prefill a provider form during preview because some sites save drafts automatically.
2. Show the provider, visible account hint, operation, complete workout or calendar fields, target date, and expected result.
3. Revalidate the current plan, pain, recovery, profile, and destination.
4. Create one exact, expiring approval envelope containing the provider, route, operation, resource hash, and destination.
5. After approval, perform one visible attended write.
6. Confirm the expected result in the provider UI and retain only a sanitized receipt.
7. Mark the approval consumed.

One approval cannot authorize a batch, retry, second workout, changed date, or additional calendar edit. Account, payload, date, or UI drift requires a new preview and approval.

## File-import contract

1. The reference browser accepts one `.fit`, `.gpx`, `.tcx`, or `.csv` file up to 8 MB.
2. The server validates the extension and payload, rejects XML entity declarations, and parses a normalized preview.
3. Preview does not change local state.
4. The athlete confirms the local-summary consent.
5. The server parses again and stores normalized activity summaries only. Raw request bytes are not written to disk.
6. The athlete can delete each summary.

FIT decoding uses Garmin's official `@garmin/fitsdk` package. GPX distance is calculated from track-point coordinates. TCX prefers recorded distance and time. CSV supports common activity date, sport, distance, duration, heart-rate, and calorie headings and imports at most 100 rows per file.

## Source priority and freshness

The onboarding primary source is first, followed by other athlete-selected sources, local file import, and manual check-ins. Preserve route provenance on every normalized record and remove duplicates. A current manual pain or recovery signal remains first-class evidence and can outweigh an older provider reading.

- Fresh: up to 36 hours old.
- Aging: more than 36 and up to 96 hours old; combine with a current check-in.
- Stale: more than 96 hours old; refresh through an available route or add a manual check-in before adapting a plan.

## Provider-specific official recommendations

These notes guide what StrideOS proactively recommends. Attended browser/computer use remains the universal second tier whenever the current host exposes it.

### Garmin

Recommend the athlete's official export plus local import for structured self-service history, or manual entry. Garmin's developer program is application/business reviewed. For a user who wants browser delivery, the athlete logs into Garmin Connect, approves the exact workout preview, and the agent performs and verifies one visible calendar write through the host browser/computer-use capability.

### Strava

Prefer the official Strava MCP where available. Otherwise recommend the athlete's official export or manual entry. Do not teach an unofficial API route as a substitute. Attended browser/computer use remains available when the host exposes it and the athlete selects it.

### COROS

Prefer the official COROS MCP for user-authorized reads in supported AI clients. It is read-only. Official export and manual input remain fallbacks; attended browser/computer use remains a host capability.

### Fitbit, Oura, and WHOOP

For Fitbit/Google Health, recommend the official API or athlete export with required scopes, disclosure, and consent. For Oura, prefer the official MCP for LLM use where compatible. For WHOOP, recommend only official API/export routes after current consent, retention, and model-use requirements are satisfied. Attended browser/computer use remains a user-authenticated host capability, not a bundled connector.

### Apple and Android

HealthKit and Health Connect are native platform permission systems. A provider web page cannot grant those operating-system permissions. A companion asks only for required data types, explains purpose, handles partial or revoked access, and exposes disconnect/delete behavior. Reading completed work and delivering planned workouts use distinct permissions and proof states.

### Every other provider

Document only current official individual routes in the public playbook. If the host exposes browser/computer use, actively offer the attended route above file and manual entry. If the user supplies a different local tool, step outside the StrideOS recommendation layer.

## Primary technical and policy sources

- [Garmin Connect Developer Program](https://developer.garmin.com/gc-developer-program/)
- [Garmin Connect Developer Program FAQ](https://developer.garmin.com/gc-developer-program/program-faq/)
- [Garmin FIT SDK](https://developer.garmin.com/fit/get-the-sdk/)
- [Strava data export](https://support.strava.com/hc/en-us/articles/216918437-Exporting-your-Data-and-Bulk-Export)
- [Strava MCP connector](https://support.strava.com/en-us/articles/15401531-strava-mcp-connector)
- [Apple HealthKit authorization](https://developer.apple.com/documentation/HealthKit/authorizing-access-to-health-data)
- [Apple WorkoutKit](https://developer.apple.com/documentation/workoutkit)
- [Android Health Connect](https://developer.android.com/health-and-fitness/health-connect/get-started)
- [COROS MCP guide](https://support.coros.com/hc/en-us/articles/50841795180948-COROS-MCP-A-Guide-to-Connecting-Your-Training-Data-to-AI)
- [Google Health API setup](https://developers.google.com/health/setup)
- [Oura API and MCP Agreement](https://cloud.ouraring.com/legal/api-agreement)
- [WHOOP API Terms](https://developer.whoop.com/api-terms-of-use/)

# Data access routes

StrideOS uses one rule for every source: report what the software can prove, not what a setup screen or open page implies. StrideOS works alongside provider accounts; it does not claim that it owns or permanently connects them.

## Resolver precedence

For each provider and requested capability, prefer:

1. a provider-permitted official self-service API, MCP connector, or native companion for an individual user;
2. attended assisted browsing in a visible user-authenticated session, only when the provider permits that access and a reviewed executor is implemented;
3. a provider-issued export imported locally;
4. manual entry.

Reads and writes resolve separately. The resolver skips assisted browsing outside Codex desktop, in an unattended or scheduled context, when provider permission is missing, when no reviewed executor is implemented, or when the visible web application does not expose the requested capability.

## Route truth matrix

| Source | Honest route for an individual | What StrideOS may do | Limits that remain visible |
| --- | --- | --- | --- |
| Garmin Connect | Athlete-selected official export and local file import; manual | Normalize selected exported activity evidence locally or accept a manual check-in | Attended AI/browser operation is not established as permitted; no workout, calendar, or watch delivery; developer access is application/business reviewed |
| Strava | Official athlete export; manual | Normalize an athlete-selected export locally | API-to-AI and assisted browsing are blocked under current Strava rules |
| Apple Health / Watch | User-authorized native iOS companion; user-supplied XML export after a parser is added; manual | Read granted HealthKit types and use WorkoutKit for supported approved workouts | No desktop/web HealthKit store; per-type permission and on-device proof are required; current StrideOS import does not parse Apple Health XML |
| Android Health Connect | User-authorized native Android companion; backup archive only after format validation; manual | Read granted record types and use supported planned-exercise paths | Android-only on-device store; export is documented for backup/restore, not current StrideOS interchange; watch delivery is not implied |
| COROS | Official user-authorized COROS MCP; official export; manual | Read the athlete's activity, health, recovery, and training data through the current read-only MCP | MCP is read-only; web automation is prohibited without written permission; direct API access is application-reviewed |
| Fitbit / Google Health | Official Google Health API with required setup, scopes, disclosure, and consent; official export; manual | Read approved health/activity scopes or normalize an athlete-selected export | No browser/MCP route is established; model training/evaluation is not claimed; public use may require Google verification |
| Oura | Official Oura MCP only after public setup and policy validation; manual | No Oura provider data enters model context until the MCP route is usable | Browser/API/export-to-LLM paths are blocked; MCP-only LLM rule and caching/training limits remain visible |
| WHOOP | Official API/export only after model-context policy review; manual | Local handling may be designed, but no provider data enters model context in the current resolver | Browser automation prohibited; opt-in, caching, derivative-work, and external-AI restrictions require review |
| FIT / GPX / TCX / CSV | Local file import | Server-side parsing, preview, explicit consent, normalized local summaries, freshness, and deletion | The athlete selects and refreshes files |
| Browser-read contract (conditional; none enabled) | Provider-permitted attended session plus a reviewed executor | Future qualifying reads normalize visible values locally with `source: <providerId>`, `provenance: "browser_read"`, and `ingestionRoute: "browser_read"` | No generic browser executor ships; no raw page/session material; never scheduled/headless |
| Manual check-ins | Built in | Pain, last-session RPE, energy, sleep feel, context, freshness, and deletion | Subjective by design; no device or account required |
| Other providers | Playbook-controlled permitted route | Only capabilities supported by a current first-party source | No generic OAuth, relay, or browser claim; unavailable routes stay unavailable |

No status string should imply a persistent provider connection. An official authorization, native companion, open attended session, imported file, and manual record are distinct states. An attended browser session expires with the visible provider session and must be proved again when needed.

## Browser-read contract

This is a provider-neutral conditional contract. No generic browser executor ships in the current build. It applies only after the playbook explicitly classifies the requested operation as permitted and a reviewed executor is implemented. Garmin does not qualify.

If a provider and executor qualify in a future build, the flow must be:

1. The athlete selects the provider as an evidence source and opens its web app in Codex desktop.
2. The athlete completes login and MFA. The agent does not type, request, read, or retain credentials or session material.
3. The agent reads only the visible fields needed for the stated coaching purpose.
4. The normalized record includes `source: <providerId>`, `provenance: "browser_read"`, `ingestionRoute: "browser_read"`, record timestamp, retrieval timestamp, and freshness.
5. Downstream analysis treats it like an imported record while preserving its provenance.
6. Raw HTML, browser storage, cookies, session tokens, and unrelated account data are not persisted.
7. Sign-out, account mismatch, unexpected UI, or provider-policy uncertainty stops the read.

Browser reads do not require a write approval. They still require the athlete's selected source authorization and remain attended and data-minimized.

## Browser-write contract

This is a conditional future contract, not a current executor. It applies only when the provider explicitly permits the operation and a reviewed executor exists. Exact approval constrains that available route; it cannot make Garmin or any other unavailable route permissible.

1. Build a local dry-run from the exact current server-authored resource. Do not prefill a provider form because some pages save drafts automatically.
2. Show the provider, visible account hint, operation, complete workout or calendar fields, target date, and expected result.
3. Revalidate the current plan, pain, recovery, profile, and destination.
4. Persist one exact, expiring approval envelope containing the provider, route, operation, resource hash, and destination.
5. After approval, atomically claim the envelope before touching the provider UI.
6. Perform one visible attended write. One approval cannot authorize a batch, retry, second workout, or additional calendar edit.
7. Confirm the expected result in the provider UI and store only a sanitized receipt.
8. Mark the envelope consumed. A duplicate or expired envelope is rejected.

If the account, fields, date, or provider UI differs from the preview, stop and create a new preview. Never broaden an approval during execution.

## File-import contract

1. The browser accepts one `.fit`, `.gpx`, `.tcx`, or `.csv` file up to 8 MB.
2. The server validates the extension and payload, rejects XML entity declarations, and parses a normalized preview.
3. Preview does not change local state.
4. The athlete must check the local-summary consent box and choose **Confirm local import**.
5. StrideOS parses the file again server-side and stores normalized activity summaries only. Raw request bytes are not written to disk.
6. The athlete can delete each summary from the same screen.

FIT decoding uses Garmin's official `@garmin/fitsdk` package. GPX distance is calculated from track-point coordinates. TCX prefers recorded distance and time. CSV supports common activity date, sport, distance, duration, heart-rate, and calorie headings and imports at most 100 rows per file.

## Source priority and freshness

The onboarding primary provider is first, followed by other athlete-selected providers, local file import, and manual check-ins. Route provenance remains attached to every normalized record. Duplicate entries are removed. A current manual pain or recovery signal remains first-class evidence and can outweigh an older provider reading.

- Fresh: up to 36 hours old.
- Aging: more than 36 and up to 96 hours old; combine with a current check-in.
- Stale: more than 96 hours old; refresh through a permitted route or add a manual check-in before adapting a plan.

## Provider-specific contracts

### Garmin

Garmin does not expressly establish attended AI/browser-agent operation as permitted. The resolver therefore fails closed: do not browse Garmin Connect for evidence, operate its workout builder, change its calendar, or claim delivery to a watch.

The current individual routes are an athlete-selected official Garmin export followed by local file import and manual entry. Garmin Connect Developer Program access is application/business reviewed rather than an ordinary individual self-service route. The current local reference app may simulate Garmin actions for the labeled judge trace; simulation never implies that an external account, calendar, or device changed.

### Strava

Do not configure Strava OAuth for AI processing and do not automate a signed-in Strava web session. Current Strava policy blocks ordinary API data from AI application context and identifies Strava's MCP as the authorized agent route; the current first-party rollout does not support this ChatGPT/Codex surface. Current Strava terms also prohibit automated access to the web experience. Use only an athlete-initiated official export and manual entry here, subject to current export terms.

### COROS

Prefer the official COROS MCP for user-authorized individual reads. It supports activity, health, recovery, fitness, and calendar context in supported AI clients, but is currently read-only. Do not automate COROS Training Hub: COROS terms prohibit automated web access without express written permission. Provider export and manual input remain the fallback.

### Fitbit, Oura, and WHOOP

Fitbit/Google Health may use the official API or an athlete export only with the required scopes, disclosure, and consent. No attended-browser or official MCP route is established. Oura data may enter LLM context only through Oura's authorized MCP; because public setup for this surface is not documented, Oura API/export routes remain nonselectable for StrideOS coaching. WHOOP web automation is prohibited, and its API/export routes remain nonselectable for model context until opt-in, caching, derivative-work, and external-AI terms are enforced.

### Apple and Android

HealthKit and Health Connect are native platform permission systems. A provider web page cannot grant those operating-system permissions. A companion app asks only for the data types needed for coaching, explains the purpose, handles partial or revoked access, and exposes disconnect/delete behavior. Reading completed work and delivering planned workouts use distinct permissions and proof states. Apple workout delivery means WorkoutKit scheduling. Android delivery means writing a supported planned-exercise record; it does not prove that a watch or destination app consumed it.

Apple's XML export and Android's Health Connect backup archive are provider-permitted user exports, but neither is claimed as an available StrideOS import today. Apple needs an XML adapter. Google's Health Connect archive is Android 14+ and documented for backup/restore, so its format must be validated before a parser is offered.

### Every other provider

The provider playbook must cite current first-party sources and mark each read/write route as permitted or unavailable for an individual. Partner-only access is documented only as unavailable. Assisted browsing is selectable only when the playbook records permission and a reviewed executor is implemented. If no direct or browser route qualifies, use the provider's official export and manual entry.

## Primary technical and policy sources

- [Garmin Connect Developer Program](https://developer.garmin.com/gc-developer-program/)
- [Garmin Connect Developer Program FAQ](https://developer.garmin.com/gc-developer-program/program-faq/)
- [Garmin Terms of Use](https://www.garmin.com/en-US/legal/terms-of-use/)
- [Garmin FIT SDK](https://developer.garmin.com/fit/get-the-sdk/)
- [Strava API Agreement](https://www.strava.com/legal/api)
- [Strava API Policy](https://www.strava.com/legal/api_policy)
- [Strava Terms of Service](https://www.strava.com/legal/terms)
- [Strava data export](https://support.strava.com/hc/en-us/articles/216918437-Exporting-your-Data-and-Bulk-Export)
- [Strava MCP connector](https://support.strava.com/en-us/articles/15401531-strava-mcp-connector)
- [Apple HealthKit authorization](https://developer.apple.com/documentation/HealthKit/authorizing-access-to-health-data)
- [Apple WorkoutKit](https://developer.apple.com/documentation/workoutkit)
- [Apple Health export](https://support.apple.com/guide/iphone/share-your-health-data-iph5ede58c3d/ios)
- [Apple health data and iCloud.com](https://support.apple.com/en-us/102630)
- [Android Health Connect](https://developer.android.com/health-and-fitness/health-connect/get-started)
- [Health Connect export and backup](https://support.google.com/android/answer/15323271?hl=en)
- [COROS MCP guide](https://support.coros.com/hc/en-us/articles/50841795180948-COROS-MCP-A-Guide-to-Connecting-Your-Training-Data-to-AI)
- [COROS Terms of Service](https://www.coros.com/terms)
- [Google Health API setup](https://developers.google.com/health/setup)
- [Google Health developer data policy](https://developers.google.com/health/policies/health-api-developer-user-data-policy)
- [Oura API and MCP Agreement](https://cloud.ouraring.com/legal/api-agreement)
- [WHOOP Terms](https://www.whoop.com/us/en/whoop-terms-of-use/)
- [WHOOP API Terms](https://developer.whoop.com/api-terms-of-use/)

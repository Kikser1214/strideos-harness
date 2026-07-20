# Provider access routes

StrideOS works alongside the accounts an athlete already uses. It does not claim that a provider account is connected merely because a page is open, a client is configured, or a file was imported. Each requested capability - reading evidence, creating a workout, or editing a calendar - is resolved and proved separately.

A provider playbook may describe only routes the provider permits for an individual user. If an API is partner-only, unavailable to individuals, or incompatible with AI use, the playbook states that limitation and points to the permitted alternatives. It never teaches a workaround.

## Route resolver

Resolve each provider and capability in this order:

1. **Official individual self-service route** - a provider-supported API, MCP connector, or native companion that an individual athlete may authorize.
2. **Attended assisted browsing** - Codex desktop works in a visible provider web session that the user opened and authenticated, but only when the provider playbook confirms permission and a reviewed executor is implemented.
3. **Provider export and local import** - the athlete obtains an official export and StrideOS normalizes the selected file locally.
4. **Manual entry** - short athlete check-ins and plan notes remain first-class evidence.

Structured official routes stay preferred because they are more stable and may support separately authorized background refresh. Assisted browsing is interactive only and can never run headlessly or on a schedule.

The resolver must consider the requested operation, current product surface, provider rules, implemented executor, and available capability. A provider may permit browser reads but not expose workout creation, or expose a calendar write without useful recovery data. Never infer one capability from another.

## Setup modes

Respect `delivery.connectorSetupMode`:

- `guide_only`: explain the permitted routes and requirements; do not install, authorize, open a provider page, or change configuration.
- `allow_local_setup_after_review`: preview exact local commands, files, or permissions. An attended flow may be offered only when both provider permission and a reviewed executor exist; then ask before each setup phase.
- `not_now`: stop setup and keep provider exports, local file imports, and manual check-ins available.

Reading evidence, configuring an official client, granting provider authorization, and performing a provider write remain separate permissions and proof states.

## Attended assisted browsing

Assisted browsing is a provider-neutral conditional contract for Codex desktop. No generic browser executor currently ships. The contract remains dormant unless the playbook classifies the requested operation as permitted and a reviewed executor is implemented. It does not create a reusable provider login inside StrideOS, and approval cannot make an unavailable route permissible.

### Session boundary

- The user opens the provider website and completes login and MFA personally.
- The agent never types, requests, reads, copies, or stores passwords, MFA codes, cookies, session tokens, recovery codes, or browser-storage values.
- The provider page stays visible and the user remains present and able to interrupt the flow.
- An open page is an ephemeral `session_ready` state, not a persistent `connected` state.
- A signed-out page, account mismatch, unexpected interstitial, or changed interface stops the flow and returns control to the user.

### Reads

If a permitted read also has a reviewed executor, the agent may read only relevant values visible in the attended session after the athlete selects the source. A read needs no write approval, but collection must be minimized to the coaching purpose.

Normalize the result locally with:

- `source: <providerId>`;
- `provenance: "browser_read"`;
- `ingestionRoute: "browser_read"`;
- record or observation time shown by the provider;
- retrieval timestamp;
- freshness status;
- a sanitized description of the visible source page when useful.

Treat the normalized record like an imported file downstream. Do not retain raw HTML, screenshots by default, cookies, session material, hidden page state, or unrelated account information.

### Writes

Before any attended write executor may be enabled, it must satisfy all of the following:

1. A local dry-run showing the provider, visible account, operation, exact workout or calendar payload, target date, and expected result. The preview must not type into a form because some sites save drafts automatically.
2. Revalidation against the current approved plan, safety state, pain, recovery evidence, and destination.
3. One exact, expiring approval envelope bound to the provider, account hint, route, operation, resource hash, and destination.
4. An atomic execution claim so the same approval cannot be replayed.
5. A visible attended action in the provider UI and a sanitized completion receipt.

This is a future acceptance contract: one approval may authorize one write only. It must not authorize a batch, second workout, calendar edit, retry after UI drift, or later session. Any materially different field or extra provider confirmation requires a new preview and approval.

## Garmin Connect

Garmin attended AI/browser operation is not established as provider-permitted, so StrideOS fails closed. Do not use Garmin Connect assisted browsing for reads or writes, operate its workout builder, change its calendar, or claim delivery to a watch.

The current individual paths are:

- an athlete-selected official Garmin export followed by local file import;
- manual entry.

Garmin Connect Developer Program access is application/business reviewed rather than ordinary self-service for an individual athlete. It is documented as a limitation, not offered as a setup path.

## Strava

Do not use ordinary Strava API data in model context. Strava's current API policy blocks that use and identifies Strava's MCP as the authorized agent route, while its current terms prohibit automated access to the signed-in web experience. The current first-party MCP rollout does not support this ChatGPT/Codex surface. Therefore StrideOS must not generate a Strava API-to-AI route or use assisted browsing on `strava.com`, even when the athlete is logged in.

Offer only routes Strava currently permits for this product:

- an athlete-initiated official account export followed by local import, subject to the current export terms;
- manual entry.

Revisit the playbook only when Strava publishes a compatible official route for this product.

## COROS

COROS provides an official MCP for individual users in supported AI clients. Prefer that structured, user-authorized route for activity, health, recovery, fitness, and training context. The MCP is currently read-only; it cannot create workouts or change the athlete's plan.

Do not use assisted browsing on COROS Training Hub. Current COROS terms prohibit robots, scrapers, and other automated web access without express written permission. Official export and manual entry remain the read fallback, and no workout-delivery route is claimed.

## Apple Watch and Apple Health

Apple Health reads and structured Apple Watch delivery require a user-authorized native iOS companion. Use [HealthKit authorization](https://developer.apple.com/documentation/HealthKit/authorizing-access-to-health-data) for selected evidence types and [WorkoutKit](https://developer.apple.com/documentation/workoutkit) for previewing and scheduling supported workouts. The user approves system permissions on their Apple device.

An agent may scaffold the companion only after local-setup consent. Before the companion writes anything, it must show the exact workout, destination, authorization state, and disconnect/delete path. Until it proves a successful round trip, report `companion_required`. The user-provided Apple Health XML export is a future file route; the current StrideOS importer does not parse it.

## Android and Wear OS

Android requires a user-authorized native companion using [Health Connect](https://developer.android.com/health-and-fitness/health-connect/get-started). Planned-exercise support and permissions must be checked against the installed Android, Health Connect, and destination-app versions. Health Connect availability alone does not prove that a watch will receive or execute a workout.

Scaffold only after consent, request only required record types, test on-device, and keep `companion_required` until a complete round trip succeeds. A `PlannedExerciseSessionRecord` needs the platform feature and write permission, and its presence does not prove that a watch consumed it. Health Connect's Android 14+ backup ZIP is not a current StrideOS import route: Google documents it for backup/restore and the archive format must be validated before support is claimed.

## Google Health for Fitbit and Pixel Watch

Use only the official Google Health API, an athlete-selected Google export, or manual entry. Attended browsing is not established as provider-permitted, and no official Google Health MCP is documented. API setup uses Google Cloud and OAuth; testing is limited to allowlisted users, while broader release can require OAuth verification and a security review because the health scopes are restricted.

Google permits AI-driven health and fitness features only within its user-data rules: the feature and data use must be visible, necessary, disclosed, and consented to. The playbook does not claim permission for generalized model training or evaluation. These constraints apply equally when an athlete supplies an export.

## Oura

Oura's API and export are legitimate individual access routes, but they are not LLM-ingestion routes. Oura requires its authorized MCP whenever Oura data is accessed or processed with an LLM, prohibits scraping, and prohibits model training and evaluation. The official MCP is recorded as the sole model-context route, but it remains nonselectable because Oura has not documented a compatible setup for this StrideOS surface. Until that changes, accept only a subjective manual check-in that does not transcribe Oura data.

## WHOOP

WHOOP prohibits scraping, harvesting, and data extraction from its web experience even when the account owner consents, so attended browsing is never offered. Its official OAuth API and athlete export are recorded but remain `policy_review_required`: the current terms require user opt-in for third-party disclosure and impose caching, permanent-copy, and derivative-work restrictions without expressly authorizing external AI/model-context use. Manual subjective entry remains available while that policy is unresolved.

## Other providers

For Polar, Suunto, Wahoo, and any new provider, verify current first-party documentation and terms before producing a playbook. Record separately:

- routes permitted for an individual user;
- AI-use restrictions;
- available read and write capabilities;
- whether attended browser access is permitted;
- official export formats;
- revocation and deletion behavior;
- source URLs and the last verification date.

If no permitted direct or browser route exists, say so plainly and offer only the provider's official export and manual entry. Never describe a fallback as automatic device delivery.

## Completion checklist

For any future provider executor, setup is complete only when the selected capability is proved and its limits are visible:

- official authorization or attended-session state verified with the correct account;
- normalized read provenance and freshness verified, when reading;
- exact dry-run and one-write approval verified, when writing;
- provider-side result visibly confirmed;
- sign-out or revocation explained;
- local normalized records deletable;
- raw credentials and session material absent from Git, Sites, logs, screenshots, and StrideOS state.

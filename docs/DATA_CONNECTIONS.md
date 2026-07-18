# Data connections

StrideOS uses one rule for every source: report what the software can prove, not what a setup screen hopes will exist later.

## Runtime truth matrix

| Source | Current label | What works in this release | What is still required |
| --- | --- | --- | --- |
| Garmin Connect | Setup needed, or adapter configured | Approval-gated workout writes can be simulated or sent to an official adapter or the optional local community bridge | An approved Garmin integration or user-selected private adapter, plus athlete authorization; a bridge URL alone is not proof of connection |
| Strava | Setup needed, or OAuth setup ready | The environment contract and requested read scope are visible | Complete OAuth authorization, token storage/refresh, activity sync, webhooks, and revocation |
| Apple Health / Watch | Native app required | Honest companion route and manual/file fallbacks | An iOS HealthKit companion with per-type permission |
| Android Health Connect | Native app required | Honest companion route and manual/file fallbacks | An Android companion, declared record types, and user-granted permissions |
| FIT / GPX / TCX / CSV | Available now | Server-side parsing, preview, explicit consent, normalized local summaries, freshness, and deletion | The athlete must export and refresh files manually |
| Manual check-ins | Available now | Pain, last-session RPE, energy, sleep feel, context, freshness, and deletion | No device or account |
| Fitbit, Oura, WHOOP, Polar | Planned | Capability cards and current fallbacks | Vendor OAuth implementation and policy review |
| COROS, Suunto | Planned | Capability cards and current fallbacks | Partner/API access or an authorized relay |

No status string in this release is `connected`. `adapter_configured` means only that a server-side Garmin bridge URL exists. `oauth_setup_ready` means only that the three Strava OAuth environment values exist.

## File-import contract

1. The browser accepts one `.fit`, `.gpx`, `.tcx`, or `.csv` file up to 8 MB.
2. The server validates the extension and payload, rejects XML entity declarations, and parses a normalized preview.
3. Preview does not change local state.
4. The athlete must check the local-summary consent box and choose **Confirm local import**.
5. StrideOS parses the file again server-side and stores normalized activity summaries only. Raw request bytes are not written to disk.
6. The athlete can delete each summary from the same screen.

FIT decoding uses Garmin's official `@garmin/fitsdk` package. GPX distance is calculated from track-point coordinates. TCX prefers recorded distance and time. CSV supports common activity date, sport, distance, duration, heart-rate, and calorie headings and imports at most 100 rows per file.

## Source priority and freshness

The onboarding primary source is first, followed by the other selected sources, file import, and manual check-ins. Duplicate entries are removed. A current manual pain or recovery signal remains first-class evidence and can outweigh an older device reading.

- Fresh: up to 36 hours old.
- Aging: more than 36 and up to 96 hours old; combine with a current check-in.
- Stale: more than 96 hours old; refresh or add a manual check-in before adapting a plan.

## Setup contracts

### Garmin

Set `GARMIN_BRIDGE_URL` and, when needed, `GARMIN_BRIDGE_TOKEN`. The bridge receives an approved, server-authored workout payload. Official Garmin cloud access is available through the Garmin Connect Developer Program and requires provider approval. Production adapters must implement athlete consent, read freshness, write confirmation, token security, disconnect, and upstream deletion/revocation behavior.

For personal experiments, the optional loopback-only community adapter can call a user-supplied Python push script. It is unofficial, is not a hosted service, never makes a bridge publicly reachable, and does not turn setup consent into workout-write consent. See [Self-service device connections](SELF_SERVICE_CONNECTORS.md).

The POST body is `{ decisionId, athleteId, workout }`. `workout` is copied from the exact scheduled running session attached to the persisted approval decision and includes its source, plan ID, session ID, name, sport, type, scheduled date, duration, target, intensity, and steps. Approval revalidates that exact resource against current plan, pain, recovery, and profile state. A missing or stale workout is rejected, and the synthetic judge fixture is always simulated even when a bridge URL is configured.

### Strava

Set `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, and `STRAVA_REDIRECT_URI`. This changes the truthful status to **OAuth setup ready**, not connected. A later connector must implement authorization-code exchange, short-lived access tokens, refresh-token rotation, accepted-scope checks, webhooks, and the current revocation endpoint before the status may become connected.

### Apple and Android

HealthKit and Health Connect are native platform permission systems. A browser-only page cannot request or bypass those permissions. A companion app must ask only for the data types needed for coaching, explain the purpose, handle partial or revoked access, and expose disconnect/delete behavior. Reading completed work and delivering planned workouts use distinct permissions and must be represented separately.

## Primary technical sources

- [Garmin FIT SDK: get the SDK](https://developer.garmin.com/fit/get-the-sdk/)
- [Garmin Health API](https://developer.garmin.com/gc-developer-program/health-api/)
- [Strava OAuth authentication](https://developers.strava.com/docs/authentication/)
- [Apple HealthKit authorization](https://developer.apple.com/documentation/HealthKit/authorizing-access-to-health-data)
- [Android Health Connect: get started](https://developer.android.com/health-and-fitness/health-connect/get-started)

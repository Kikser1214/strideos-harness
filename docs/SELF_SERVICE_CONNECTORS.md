# Self-service device connections

StrideOS is a harness, not a wearable subscription. Each user chooses their evidence sources and workout destination, owns their vendor account, and may build or configure only the connector they need. Reading history, configuring an adapter, proving account authorization, and writing one workout are four different states.

## Agent setup contract

When onboarding requests device delivery, the agent must:

1. Identify the exact device, phone platform, training app, and desired direction: read completed work, send structured workouts, or both.
2. Read the connector catalog from `GET /api/connectors`. Recommend the official route first and accurately label community or unofficial routes.
3. Respect `delivery.connectorSetupMode`:
   - `guide_only`: explain the steps, but do not install, authenticate, edit configuration, or start a connector.
   - `allow_local_setup_after_review`: show the exact commands and files, explain what they change, then ask before each installation, authentication, or configuration phase.
   - `not_now`: keep manual check-ins and file imports available; do not continue connector setup.
4. Keep passwords and MFA codes out of chat, onboarding state, logs, commits, screenshots, Sites, and the StrideOS `.env`. Authentication happens in the vendor page, operating-system permission sheet, device, or the connector's interactive terminal.
5. Start with least privilege. A read permission never implies a write permission. Setup assistance never implies approval to send a workout.
6. Prove the actual state: dependency ready, adapter healthy, athlete authorized, dry-run valid, then one explicitly approved test workout. Do not label an account connected from environment values alone.
7. Explain disconnect, token deletion, and any upstream deletion behavior before declaring setup complete.

Open-source or personal/non-commercial use does not turn an unofficial connector into an official vendor integration. The user must review the relevant provider terms and accepts that an unofficial route may break when the provider changes private endpoints.

## Garmin official route

The recommended public/product route is the [Garmin Connect Training API](https://developer.garmin.com/gc-developer-program/overview/). The user or organization applies for access, implements Garmin authorization and revocation, and exposes the StrideOS bridge contract described in `docs/DATA_CONNECTIONS.md`.

`GARMIN_BRIDGE_URL` means only that an adapter endpoint is configured. The adapter must independently prove the athlete's authorization. Every StrideOS workout write remains attached to a persisted approval decision.

## Garmin local community route

For personal experimentation, StrideOS includes a loopback-only adapter that can call a user-supplied Python workout-push script. It is deliberately not a Garmin login implementation and does not bundle, inspect, or upload Garmin credentials or tokens.

Prerequisites:

- a Python connector script the user has inspected and chosen to trust;
- that script accepts `workout.json --token-dir <path> --date YYYY-MM-DD` and prints a final JSON line with `{"success": true, ...}`;
- the connector's own authentication step has created a local token directory;
- the script supports the workout shape it will receive.

Add these local values to `.env`:

```dotenv
GARMIN_BRIDGE_URL=http://127.0.0.1:8787/workouts
GARMIN_BRIDGE_TOKEN=
GARMIN_COMMUNITY_PUSH_SCRIPT=C:\absolute\path\to\garmin_push.py
GARMIN_COMMUNITY_TOKEN_DIR=C:\absolute\path\to\private\garmin_tokens
GARMIN_COMMUNITY_PYTHON=python
GARMIN_COMMUNITY_BRIDGE_HOST=127.0.0.1
GARMIN_COMMUNITY_BRIDGE_PORT=8787
```

Use a shared random `GARMIN_BRIDGE_TOKEN` in both processes if desired. Never set the community bridge host to `0.0.0.0`; the included adapter refuses non-loopback binding.

Run the community adapter in one terminal:

```bash
npm run connector:garmin:bridge
```

Run StrideOS in another:

```bash
npm start
```

Verification order:

1. Open `http://127.0.0.1:8787/health`. `ok: true` proves only that the local adapter is listening; it intentionally reports `connected: false`.
2. Run the chosen Python connector's local dry-run against a synthetic workout. Do not use the judge fixture for a real write.
3. Confirm on the vendor account/device that the correct athlete is authenticated.
4. Activate a real StrideOS plan through its separate plan approval.
5. Approve one exact test workout in StrideOS and confirm its name, date, steps, and targets in Garmin Connect before relying on it.
6. Test token removal/disconnect. Keep the token directory outside Git and outside any shared Sites content.

The adapter accepts only running or strength workouts whose source is `approved_training_plan`. It refuses synthetic judge data, remote network binding, missing plan/session/date identity, and oversized requests. The temporary workout JSON is deleted after the Python process finishes.

## Apple Watch

Apple Health reads and structured Apple Watch delivery require a native iOS companion. Use [HealthKit authorization](https://developer.apple.com/documentation/HealthKit/authorizing-access-to-health-data) for selected evidence types and [WorkoutKit](https://developer.apple.com/documentation/workoutkit) for previewing and scheduling supported workouts. The user approves system permissions on their Apple device. A ChatGPT Site or browser page cannot bypass this boundary.

An agent may scaffold the companion only after local-setup consent. Before the app writes anything, it must show the exact workout, destination, authorization state, and a disconnect/delete path. Until the companion proves a successful round trip, StrideOS reports `companion_required`.

## Android and Wear OS

Android requires a native companion using [Health Connect](https://developer.android.com/health-and-fitness/health-connect/get-started). Planned exercise support and permissions must be checked on the installed Android/Health Connect version, and the user's workout or wearable app must actually consume the planned session. Health Connect availability alone is not proof that a watch can execute the workout.

The same setup boundary applies: scaffold after consent, ask only for required record types, test on-device, and keep `companion_required` until a complete round trip succeeds.

## Other devices

For Polar, COROS, Suunto, Fitbit, Oura, WHOOP, Wahoo, and other providers, the agent first verifies current official APIs and whether structured workout writes are supported. Partner approval, commercial terms, or a companion/relay may be required. If write support is absent, preserve a clear fallback: StrideOS dashboard instructions, calendar text, or a user-initiated file/export workflow. Never describe a fallback as automatic watch delivery.


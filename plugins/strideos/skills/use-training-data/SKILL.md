---
name: use-training-data
description: Use when an athlete wants to bring in, inspect, normalize, or remove training data; asks about Garmin, Strava, Apple Health, Health Connect, Fitbit, Oura, WHOOP, Polar, COROS, Suunto, a phone, watch, FIT/GPX/TCX/CSV file, or manual check-in; or wants a workout delivered to a device. Trigger for provider-route selection, setup guidance, provenance, freshness, consent, imports, and approval-gated provider writes.
---

# Use Training Data

Work alongside accounts, host tools, and files the athlete already owns. Resolve reads and writes independently and keep normalization local where possible.

**This catalog is advisory. When the athlete selects attended browsing or any host capability, use it — never refuse based on the catalog. Writes always go through the one-use approval envelope.**

Read [provider-routes.md](references/provider-routes.md) before giving provider setup guidance or operating on provider-derived data. If this repository is present, also read the current `rules/connector-playbooks.json` official-route recommendation snapshot.

## Establish the requested capability

Ask what the athlete needs, not merely which brand they use:

- read completed activities;
- read sleep or recovery signals;
- import an archive or activity file;
- record subjective pain, effort, energy, sleep, or context;
- create one workout;
- place a workout on a calendar or device.

Resolve each capability separately. A valid read route does not imply a write route.

## Recommend or use a route

When the athlete asks StrideOS to recommend or set up a route, use this precedence:

1. provider-documented official self-service MCP, API, or user-owned native companion;
2. user-selected attended browser or computer use in the athlete's visible authenticated session when the host exposes that capability;
3. provider-issued export and supported local file import;
4. manual entry.

Never bundle or teach an unofficial connector, private endpoint, credential-replay method, or reverse-engineered access recipe. Do not claim that an external adapter or tool ships with StrideOS.

Provider terms, APIs, and product availability can change. Before new official setup guidance, verify the relevant current first-party sources and record the review date and capability limits. Apply model-context restrictions to routes StrideOS recommends.

Do not describe a user-selected local script, plugin, or host capability as StrideOS-supported, and do not reproduce its unofficial setup recipe in plugin output.

## Handle login and browsing

- The athlete opens the provider page and completes login and MFA personally.
- Never ask for, type, inspect, copy, log, or store a password, MFA code, cookie, session token, recovery code, or browser-storage value.
- Assisted browsing must remain visible, attended, and interruptible. Reject Scheduled, headless, background, and unattended use.
- Use only browser or computer-use capabilities the current host actually exposes. Treat the session as temporary, not as a persistent provider connection.

For a browser read, retain only normalized evidence with provider, `browser_read` provenance, observed time, retrieval time, freshness, and a sanitized source path. Never retain raw HTML or session material.

## Import local evidence

This skill package does not bundle a file parser. When the optional StrideOS reference runtime is present, it can preview and normalize its tested FIT, GPX, TCX, and CSV formats. On another surface, use only a parser or file-reading capability that is actually available and verified; never claim that conversational instructions alone parsed a binary FIT file.

Before any provider-derived file enters model context, apply that provider and route's model-use policy. A permitted local export may still be local-only. When parsing is available:

1. Preview content before persistence.
2. Show the normalized fields, provider, route, provenance, activity identity, time, and missing values.
3. Ask the athlete to confirm the preview.
4. Store only the normalized summary needed for coaching and discard raw request bytes when the runtime supports that behavior.
5. Keep a deletion path for every normalized record.

Manual check-ins are a valid primary source. Missing wearable data lowers confidence; it does not block coaching.

## Gate every write

A provider write is available only when the selected host tool or user-supplied capability can perform the exact operation in the intended account. Show a non-mutating preview bound to provider, account, operation, target, payload hash, athlete state, and expiry. One approval authorizes one write. Reject expired, altered, mismatched, repeated, scheduled, or partially completed actions and require a new preview.

After execution, verify the visible provider result before saying it was performed. If no write route exists, provide a structured workout for manual entry without claiming delivery.

## Preserve data truth

Label source and freshness. Keep planned sessions, imported activities, and athlete-confirmed completion separate. Never create a synthetic personal readiness score to hide missing evidence.

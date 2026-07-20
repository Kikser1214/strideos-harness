---
name: use-training-data
description: Use when an athlete wants to bring in, inspect, normalize, or remove training data; asks about Garmin, Strava, Apple Health, Health Connect, Fitbit, Oura, WHOOP, Polar, COROS, Suunto, a phone, watch, FIT/GPX/TCX/CSV file, or manual check-in; or wants a workout delivered to a device. Trigger for provider-route selection, setup guidance, provenance, freshness, consent, imports, and approval-gated provider writes.
---

# Use Training Data

Work alongside accounts and files the athlete already owns. Resolve reads and writes independently, keep normalization local where possible, and fail closed when a provider route is not clearly permitted and implemented.

Read [provider-routes.md](references/provider-routes.md) before giving provider setup guidance or operating on provider-derived data. If this repository is present, also read the current `rules/connector-playbooks.json`; it is the canonical route snapshot.

## Establish the requested capability

Ask what the athlete needs, not merely which brand they use:

- read completed activities;
- read sleep or recovery signals;
- import an archive or activity file;
- record subjective pain, effort, energy, sleep, or context;
- create one workout;
- place a workout on a calendar or device.

Resolve each capability separately. A valid read route does not imply a write route.

## Resolve the route

Use this precedence only among routes that are provider-permitted for an individual, compatible with model use, and implemented on the current surface:

1. official self-service MCP, API, or user-owned native companion;
2. attended browsing for the exact operation only when the provider permits it and a reviewed executor is enabled;
3. provider-issued export and supported local file import;
4. manual entry.

Do not teach a prohibited access method. Do not convert partner-only access, an open browser tab, a configured client, or user approval into permission.

Provider terms, APIs, and product availability can change. Before new setup guidance, verify the relevant current first-party sources and record the review date and capability limits. An export is a fallback only when both access to that export and its intended use in model context are permitted. If either is ambiguous, keep provider-derived files out of the conversation and offer manual subjective entry.

## Handle login and browsing

- The athlete opens the provider page and completes login and MFA personally.
- Never ask for, type, inspect, copy, log, or store a password, MFA code, cookie, session token, recovery code, or browser-storage value.
- Assisted browsing must remain visible, attended, and interruptible. Reject Scheduled, headless, background, and unattended use.
- This plugin ships no provider browser executor. Do not claim a browser read or write is supported merely because Codex has a browser.

For a future permitted, reviewed browser read, retain only normalized evidence with provider, `browser_read` provenance, observed time, retrieval time, freshness, and a sanitized source path. Never retain raw HTML or session material.

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

A provider write is available only when current provider permission, a reviewed executor, the intended account, and the exact operation are all established. Show a non-mutating preview bound to provider, account, operation, target, payload hash, athlete state, and expiry. One approval authorizes one write. Reject expired, altered, mismatched, repeated, scheduled, or partially completed actions and require a new preview.

After execution, verify the visible provider result before saying it was performed. If no write route exists, provide a structured workout for manual entry without claiming delivery.

## Preserve data truth

Label source and freshness. Keep planned sessions, imported activities, and athlete-confirmed completion separate. Never create a synthetic personal readiness score to hide missing evidence.

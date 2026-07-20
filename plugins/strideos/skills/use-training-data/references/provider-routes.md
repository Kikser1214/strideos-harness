# Provider route contract

This upstream recommendation snapshot was reviewed on 2026-07-20. Provider terms, product surfaces, and APIs can change. Verify current first-party sources before recommending an official setup.

**StrideOS provides official recommendations; it does not define an allowlist. Official recommendations are not an allowlist.**

## Universal rules

- Resolve each capability independently: activity read, recovery read, subjective read, workout create, calendar write, and device delivery.
- Prefer a provider-documented official individual self-service MCP, API, or native companion.
- Let the athlete select attended browser or computer use in the athlete's own authenticated web session when the host exposes it. Treat this as a host capability, not a StrideOS connector.
- Otherwise use a provider-issued export with a supported local parser or offer manual subjective entry.
- Never bundle or teach an unofficial connector, private endpoint, credential-replay method, or reverse-engineered access recipe.
- The athlete performs login and MFA. Never handle credentials or session material.
- Provider writes require an exact preview, short expiry, one-use approval, execution in the intended account, and visible verification.
- Scheduled, headless, background, and unattended browsing are rejected.
- Apply model-context restrictions to routes StrideOS recommends. A user-selected external capability remains governed by its host, not this catalog.

## Current route summary

| Provider | Current individual route for StrideOS | Current limitation |
| --- | --- | --- |
| Garmin Connect | Official export + file import; attended browser session in the athlete's own login (reads, and writes via one-use approval) when the host provides browser use | Official API is business-reviewed; StrideOS ships no Garmin client and never handles credentials |
| Strava | Official Strava MCP where available; athlete-initiated export; manual check-in | Prefer the MCP for structured reads |
| Apple Health / Watch | Authorized iOS HealthKit/WorkoutKit companion; manual check-in | A native companion and per-type system permission are required; XML archive parsing is not bundled |
| Android Health Connect | Authorized Android companion; manual check-in | On-device authorization and a native companion are required; backup archives are not claimed as supported imports |
| Fitbit / Google Health | Official API setup or athlete export after required disclosure and consent; manual check-in | Restricted scopes and model-use disclosure must be enforced |
| Oura | Official Oura MCP when compatible; manual subjective entry | Keep current model-use and retention requirements visible |
| WHOOP | Official API/export after current consent, retention, and model-use review; manual subjective entry | Do not teach an unofficial connector |
| Polar | Official API setup where permitted, official export, or manual entry | Treat writes as unavailable until the selected capability proves them |
| COROS | Official read-only MCP, official export, or manual entry | Direct API access is reviewed; the MCP is read-only |
| Suunto | Official export or manual entry | Cloud API is partner-oriented |

## File and manual routes

The plugin package itself contains instructions and references, not file parsers. The optional reference runtime supports preview and normalization for its tested FIT, GPX, TCX, and CSV formats. Do not claim parsing on another surface unless that surface exposes a verified parser, and keep provider files out of model context when the selected official route does not support that use. Store the normalized summary only after athlete confirmation. Raw provider pages, cookies, tokens, and browser storage never enter the state file.

Manual pain, effort, energy, sleep, and context reports are valid evidence. Preserve who supplied them and when.

## User-selected host capabilities

If the user explicitly selects a local script, another plugin, or another external host capability, stop using this table as an allowlist. The agent handles that capability as if StrideOS were absent, subject to host permissions and ordinary exact approval for writes. Do not call it a StrideOS integration or teach its unofficial setup method.

## Browser-read provenance

For an attended browser/computer-use read, save only:

- provider ID and account-safe label;
- `provenance: browser_read` and `ingestionRoute: browser_read`;
- source observation time and local retrieval time;
- freshness status;
- normalized fields used for coaching;
- a sanitized path or view identifier with no token or sensitive query value.

Do not store raw HTML, screenshots by default, cookies, tokens, local storage, session storage, passwords, or MFA values.

## One-write approval envelope

Bind the preview to:

- provider and intended account;
- operation and target;
- exact structured payload or hash;
- relevant athlete and plan version;
- creation and expiry timestamps;
- one unique claim identifier.

Reject mismatch, expiry, replay, partial completion, account drift, UI drift, or an extra write. One approval means one write.

## Canonical sources

In the StrideOS repository, read `rules/connector-playbooks.json` for provider URLs, official-route status, capabilities, limitations, review dates, and model-context guidance. Use current provider documentation as the source for upstream recommendations. Never use the file as an organization-wide or installation-wide block on a capability the user explicitly selected.

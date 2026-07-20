# Provider route contract

This snapshot was reviewed on 2026-07-20. Provider terms, product surfaces, and APIs can change. Verify current first-party sources before setup or execution and fail closed if the exact operation is not clearly allowed.

## Universal rules

- Resolve each capability independently: activity read, recovery read, subjective read, workout create, calendar write, and device delivery.
- Prefer an official individual self-service MCP, API, or native companion when model use is permitted.
- Assisted browsing is eligible only when the provider permits the exact agent operation and StrideOS has a reviewed executor. Codex having a browser is not sufficient. This plugin ships no provider browser executor.
- Otherwise use a provider-issued export only when access and intended model use are both permitted and a supported local parser is present. If not, offer manual subjective entry.
- Never teach a prohibited access route.
- The athlete performs login and MFA. Never handle credentials or session material.
- Provider writes require an exact preview, short expiry, one-use approval, execution in the intended account, and visible verification.
- Scheduled, headless, background, and unattended browsing are rejected.
- Model-context permission is separate from data-access permission.

## Current route summary

| Provider | Current individual route for StrideOS | Current limitation |
| --- | --- | --- |
| Garmin Connect | Athlete-selected official export with a supported local file; manual check-in | No attended agent read/write or watch delivery is enabled; developer access is application/business reviewed |
| Strava | Athlete-initiated export; manual check-in | Ordinary API data cannot enter AI coaching under the reviewed policy; automated signed-in browsing is prohibited |
| Apple Health / Watch | Authorized iOS HealthKit/WorkoutKit companion; manual check-in | A native companion and per-type system permission are required; XML archive parsing is not bundled |
| Android Health Connect | Authorized Android companion; manual check-in | On-device authorization and a native companion are required; backup archives are not claimed as supported imports |
| Fitbit / Google Health | Official API setup or athlete export after required disclosure and consent; manual check-in | Browser route is not established; restricted scopes and model-use disclosure must be enforced |
| Oura | Official Oura MCP only after compatible setup is documented; manual subjective entry | Browser, API, and export data must not enter LLM context; current provider-data routes remain nonselectable |
| WHOOP | Manual subjective entry | Browser extraction is prohibited; API/export model-context, consent, caching, and derivative-work rules remain fail-closed |
| Polar | Official API setup where permitted, official export, or manual entry | Browser automation is not offered; treat writes as unavailable unless separately documented |
| COROS | Official read-only MCP, official export, or manual entry | Direct API access is reviewed; browser automation is not offered |
| Suunto | Official export or manual entry | Cloud API is partner-oriented; browser automation is not offered |

## File and manual routes

The plugin package itself contains instructions and references, not file parsers. The optional reference runtime supports preview and normalization for its tested FIT, GPX, TCX, and CSV formats. Do not claim parsing on another surface unless that surface exposes a verified parser, and do not place provider files in model context when the provider or route policy blocks that use. Store the normalized summary only after athlete confirmation. Raw provider pages, cookies, tokens, and browser storage never enter the state file.

Manual pain, effort, energy, sleep, and context reports are valid evidence. Preserve who supplied them and when.

## Browser-read provenance

If a future route becomes permitted and implemented, save only:

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

In the StrideOS repository, read `rules/connector-playbooks.json` for provider URLs, route status, capabilities, limitations, review dates, and model-context policies. Use current provider documentation and terms as the final authority.

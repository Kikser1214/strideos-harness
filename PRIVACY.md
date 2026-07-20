# Privacy and data handling

StrideOS is local-first by design. The public repository and judge demo use synthetic athlete data only.

`data/sample-profile.json` and `data/demo-athlete.json` are synthetic. Neither is silently imported as a completed personal athlete map.

## In the included demo

- Before onboarding, the clearly labeled zero-setup judge trace can use `data/demo-athlete.json`. After onboarding, personal demo coaching uses the local athlete dashboard and does not send that context to OpenAI.
- Meal images selected in the browser are held in memory for the request and are not written to disk.
- Decisions, onboarding answers, training-plan proposals and active-plan state, workout annotations and their bounded session snapshots, normalized meal drafts/logs and bounded corrections, confirmed normalized activity summaries, permitted browser-read summaries, manual check-ins, automation schedule overrides, and manual automation-test timestamps/statuses are stored in the configured local state file. The default is an operating-system temporary file and can be replaced with `STRIDEOS_STATE_FILE`.
- The included automation command is deterministic and read-only. It does not call OpenAI or claim that a ChatGPT/Codex Scheduled task exists.
- Demo Garmin actions are simulated and labeled as such.
- Activity-file preview does not persist the uploaded bytes. After explicit import confirmation, StrideOS stores normalized summaries and discards the raw FIT, GPX, TCX, or CSV request bytes.
- Every imported summary and manual check-in has a delete control in **Data sources**.
- Every workout annotation has a delete control in the **Coach's margin**. Deleting a note does not silently reactivate or roll back a previously approved plan revision.
- Every local meal draft or log has a delete control in **Fuel companion**. Number-free policy removes calorie and macro fields before a new estimate is stored; the current policy also masks numeric fields returned by the API.

## In live GPT-5.6 mode

- The server sends the user message, supplied athlete context, and—only for meal analysis after explicit photo and cloud-processing permission—the selected image to the OpenAI Responses API.
- The API key stays on the server and is never returned to the browser.
- This starter does not persist uploaded meal images or raw activity files. It does persist the local decision ledger, training-plan lifecycle, and athlete-selected normalized data described above.
- Operators are responsible for providing appropriate notice and consent, securing transport, controlling access, and complying with every provider route's current terms.
- Private companion mode protects athlete APIs with a deployer-supplied bearer key, kept in browser session storage. It is a single-athlete access boundary, not a multi-user identity system; operators must provide HTTPS, secret rotation, persistent-volume security, and backups.

## Provider sessions and assisted browsing

- A provider playbook may expose only a route the provider permits for an individual user. The browser rules below are a conditional future contract and apply only after the playbook classifies the exact operation as permitted and a reviewed executor is implemented. No provider browser executor ships in the current build.
- In an attended browser flow, the user opens the provider website and completes login and MFA personally. The agent never types, requests, reads, copies, or stores passwords, MFA codes, cookies, session tokens, recovery codes, or browser-storage values.
- A browser read stores only the coaching-relevant normalized record with `source: <providerId>`, `provenance: "browser_read"`, `ingestionRoute: "browser_read"`, observed time, retrieval time, and freshness. Raw HTML, unrelated account details, and session material are not persisted.
- An attended provider write requires a non-mutating dry-run and one exact, expiring approval. The approval is consumed by one visible write and cannot authorize a batch or retry.
- Provider browsing is never scheduled, headless, or unattended.
- Garmin attended AI/browser operation is not established as permitted and therefore fails closed. Current Garmin use is limited to athlete-selected official exports imported locally and manual entry; no workout, calendar, or watch-delivery action is claimed.
- Strava API-to-AI access and automated Strava browsing are blocked under current Strava rules. Athlete-selected official exports and manual entry remain available.
- The optional private athlete Site never receives provider credentials or a provider browser session. It receives only athlete-approved normalized projections.

Never commit `.env`, provider credentials or tokens, private athlete exports, browser-session material, real meal images, or application logs containing personal data.

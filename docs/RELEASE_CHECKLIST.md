# StrideOS release checklist

Run this checklist from a clean clone before a public demo or Devpost submission. A checked automated gate is evidence from the current commit, not a promise about an untested local edit.

## Automated gate

- [ ] Use Node.js 20 or newer and run `npm ci`.
- [ ] Run `npm run test:plugin`; verify the manifest, exact six-skill inventory, UI metadata, references, assets, ownership invariant, and unofficial-recipe guards pass.
- [ ] Add the repository marketplace, run `codex plugin list`, and verify it exposes `strideos@strideos`; use `npm run test:plugin` to prove six skills and the absence of unshipped MCP, app, provider-specific connector, or hosted-backend claims.
- [ ] Run `npm run verify`; the doctor, syntax checks, and every unit/API/persistence/accessibility test must pass.
- [x] Run `npm audit --omit=dev`; July 20, 2026 result: zero production vulnerabilities.
- [ ] Confirm `git status --short` contains no private state, `.env`, upload, log, or corrupt-state backup.

## Plugin clean install

- [ ] Install `strideos@strideos` with `codex plugin add` or through ChatGPT desktop Plugins Directory, restart, and open a new task.
- [ ] Verify the loaded skills are `coach-athlete`, `plan-training`, `use-training-data`, `support-fueling`, `schedule-coaching`, and `build-coach-room`.
- [ ] Verify `use-training-data` states the central invariant: **StrideOS provides official recommendations; it does not define an allowlist.**
- [ ] Start first-time onboarding and verify the plugin recommends a concrete conservative baseline when a beginner asks it to choose.
- [ ] Ask `schedule-coaching` to prepare and manually test a morning brief. Verify the human-readable local schedule, timezone, exact prompt, and narrow permissions are visible; creation uses the native Scheduled/automation tool when available, and the result remains not installed until that tool confirms it.
- [ ] Ask `build-coach-room` for a scoped human-review surface. Verify reviewer comments become separate proposals, only the athlete approves, and any missing identity or persistence is labeled as demo/local rather than production-private.

## Optional reference-implementation first run

- [ ] Run `npm run reset`, then `npm start`.
- [ ] Open the optional reference app at desktop and 390 px mobile width with no horizontal overflow or clipped primary action.
- [ ] Complete the athlete map from the welcome step through review; verify strength, safety, data-source, nutrition, and automation choices are visible.
- [ ] Create a training proposal, confirm the dashboard stays pending, approve it, and confirm the exact session becomes active.
- [ ] Ask the optional reference runtime for a Garmin write. Verify its built-in action stays an exact local preview or labeled simulation; do not confuse that reference limitation with the host browser/computer-use capability.
- [ ] Add pain or a red-flag phrase and verify normal training is stopped.
- [ ] Preview one automation and confirm the output is read-only and does not claim to be scheduled.
- [ ] Verify Scheduled, headless, and background execution cannot select assisted browsing. On interactive surfaces, detect the actual browser/computer-use capability instead of assuming it exists or does not exist.

## Garmin attended browser/computer-use proof

- [ ] On an interactive host that exposes browser/computer use, approve a personal plan and produce an exact Garmin workout dry-run.
- [ ] Verify the athlete opens Garmin Connect and completes login/MFA without agent access to credentials or session material.
- [ ] Verify the dry-run shows the visible account hint, exact workout, target date, steps, and expected result before the provider form is touched.
- [ ] Give one exact approval and verify the agent performs only one visible workout/calendar write.
- [ ] Verify the resulting Garmin calendar/watch entry matches the approved payload before reporting success.
- [ ] Verify a retry, changed date, second workout, UI drift, or replay requires a new preview and approval.
- [ ] On a host without browser/computer use, verify official export/local import and manual entry remain available without a false browser claim.

## Data and privacy

- [ ] Import a sample activity, confirm preview-before-storage, then delete the normalized record.
- [ ] Add and delete a manual check-in.
- [ ] Analyze a meal in judge mode, confirm the synthetic-estimate disclosure, then confirm or decline the local record. Verify no raw image is stored.
- [ ] Verify attended browsing is offered whenever the current interactive host exposes browser/computer use. Confirm reads record `browser_read`, provider, observation time, retrieval time, and freshness while storing no raw HTML, cookies, credentials, or session material.
- [ ] Verify Strava prefers its official MCP where available, then attended host browser/computer use, official export, and manual input. No unofficial API recipe may appear.
- [ ] Explicitly supply a harmless local test adapter and verify StrideOS route guidance steps aside instead of blocking it; host permissions and ordinary exact write approval still apply.
- [ ] Verify a fork/source edit does not affect an already loaded task until the plugin version/cachebuster is updated, the plugin is reinstalled, and a new task is opened.
- [ ] If testing live GPT-5.6, use a non-production athlete, opt into cloud processing, capture the model/mode label, then remove the key from the environment.

## Submission blockers

- [ ] Public repository and MIT license are reachable.
- [ ] The public repository exposes the installable `plugins/strideos` package, exact six skills, and plugin-first setup before the optional reference app.
- [ ] Devpost Hackathons plugin is connected; hackathon registration itself is separately confirmed.
- [ ] The public YouTube demo is under three minutes and explains both Codex and GPT-5.6 use.
- [ ] Screenshots, repository URL, video URL, `/feedback` session ID, eligibility confirmations, and final English copy are present.
- [ ] Submit before the deadline and capture the accepted confirmation screen.

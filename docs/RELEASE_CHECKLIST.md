# StrideOS release checklist

Run this checklist from a clean clone before a public demo or Devpost submission. A checked automated gate is evidence from the current commit, not a promise about an untested local edit.

## Automated gate

- [ ] Use Node.js 20 or newer and run `npm ci`.
- [ ] Run `npm run test:plugin`; verify the manifest, exact five-skill inventory, UI metadata, references, assets, and prohibited-route guards pass.
- [ ] Run `npx plugins discover .`; verify it reports one `strideos` plugin with five skills and no unshipped MCP, app, browser-executor, or hosted-backend claim.
- [ ] Run `npm run verify`; the doctor, syntax checks, and every unit/API/persistence/accessibility test must pass.
- [ ] Run `npm audit --omit=dev`; investigate any production vulnerability before release.
- [ ] Confirm `git status --short` contains no private state, `.env`, upload, log, or corrupt-state backup.

## Plugin clean install

- [ ] Install from the relative `./plugins/strideos` path, restart Codex, and open a new task.
- [ ] Verify the loaded skills are `coach-athlete`, `plan-training`, `use-training-data`, `support-fueling`, and `build-coach-room`.
- [ ] Start first-time onboarding and verify the plugin recommends a concrete conservative baseline when a beginner asks it to choose.
- [ ] Ask `build-coach-room` for a scoped human-review surface. Verify reviewer comments become separate proposals, only the athlete approves, and any missing identity or persistence is labeled as demo/local rather than production-private.

## Optional reference-implementation first run

- [ ] Run `npm run reset`, then `npm start`.
- [ ] Open the optional reference app at desktop and 390 px mobile width with no horizontal overflow or clipped primary action.
- [ ] Complete the athlete map from the welcome step through review; verify strength, safety, data-source, nutrition, and automation choices are visible.
- [ ] Create a training proposal, confirm the dashboard stays pending, approve it, and confirm the exact session becomes active.
- [ ] Ask for a Garmin write. Verify the personal route stops at an exact structured local preview and judge mode reports a simulation with no external calendar change.
- [ ] Add pain or a red-flag phrase and verify normal training is stopped.
- [ ] Preview one automation and confirm the output is read-only and does not claim to be scheduled.
- [ ] Verify Scheduled, headless, background, and Work web surfaces cannot select assisted browsing.

## Garmin provider-permission block

- [ ] Approve a personal plan and verify its Garmin request produces an exact structured local workout preview.
- [ ] Verify the Garmin playbook classifies assisted browsing as `not_established`.
- [ ] Verify the resolver exposes no Garmin AI/browser read or write route and creates no browser handoff.
- [ ] Verify the UI offers Garmin's official export with a locally supported activity file where applicable, plus manual entry.
- [ ] Verify the athlete can use the local workout preview for manual entry without any claim that StrideOS changed Garmin.
- [ ] Verify the synthetic judge write stays labeled as a simulation and reports no external calendar change.

## Data and privacy

- [ ] Import a sample activity, confirm preview-before-storage, then delete the normalized record.
- [ ] Add and delete a manual check-in.
- [ ] Analyze a meal in judge mode, confirm the synthetic-estimate disclosure, then confirm or decline the local record. Verify no raw image is stored.
- [ ] Verify assisted browsing is selectable only where provider permission and a reviewed executor are both present. The current build must expose none. For any future qualifying read, confirm normalized state records `browser_read`, provider, route ID, observation time, retrieval time, and freshness while storing no raw HTML, cookies, or session material.
- [ ] Verify the Strava playbook selects only user-initiated export or manual input; API-to-AI and browser automation must remain unavailable.
- [ ] If testing live GPT-5.6, use a non-production athlete, opt into cloud processing, capture the model/mode label, then remove the key from the environment.

## Submission blockers

- [ ] Public repository and MIT license are reachable.
- [ ] The public repository exposes the installable `plugins/strideos` package, exact five skills, and plugin-first setup before the optional reference app.
- [ ] Devpost Hackathons plugin is connected; hackathon registration itself is separately confirmed.
- [ ] The public YouTube demo is under three minutes and explains both Codex and GPT-5.6 use.
- [ ] Screenshots, repository URL, video URL, `/feedback` session ID, eligibility confirmations, and final English copy are present.
- [ ] Submit before the deadline and capture the accepted confirmation screen.

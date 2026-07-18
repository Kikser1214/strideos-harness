# StrideOS release checklist

Run this checklist from a clean clone before a public demo or Devpost submission. A checked automated gate is evidence from the current commit, not a promise about an untested local edit.

## Automated gate

- [ ] Use Node.js 20 or newer and run `npm ci`.
- [ ] Run `npm run verify`; the doctor, syntax checks, and every unit/API/persistence/accessibility test must pass.
- [ ] Run `npm audit --omit=dev`; investigate any production vulnerability before release.
- [ ] Confirm `git status --short` contains no private state, `.env`, upload, log, or corrupt-state backup.

## Clean first run

- [ ] Run `npm run reset`, then `npm start`.
- [ ] Open the app at desktop and 390 px mobile width with no horizontal overflow or clipped primary action.
- [ ] Complete the athlete map from the welcome step through review; verify strength, safety, data-source, nutrition, and automation choices are visible.
- [ ] Create a training proposal, confirm the dashboard stays pending, approve it, and confirm the exact session becomes active.
- [ ] Ask for a Garmin write. Verify the decision ledger requires approval and judge mode reports a simulation with no external calendar change.
- [ ] Add pain or a red-flag phrase and verify normal training is stopped.
- [ ] Preview one automation and confirm the output is read-only and does not claim to be scheduled.

## Data and privacy

- [ ] Import a sample activity, confirm preview-before-storage, then delete the normalized record.
- [ ] Add and delete a manual check-in.
- [ ] Analyze a meal in judge mode, confirm the synthetic-estimate disclosure, then confirm or decline the local record. Verify no raw image is stored.
- [ ] If testing a configured Garmin bridge, inspect the POST body and confirm it contains the exact decision-bound personal workout, never the demo fixture.
- [ ] If testing live GPT-5.6, use a non-production athlete, opt into cloud processing, capture the model/mode label, then remove the key from the environment.

## Submission blockers

- [ ] Public repository and MIT license are reachable.
- [ ] Devpost Hackathons plugin is connected; hackathon registration itself is separately confirmed.
- [ ] The public YouTube demo is under three minutes and explains both Codex and GPT-5.6 use.
- [ ] Screenshots, repository URL, video URL, `/feedback` session ID, eligibility confirmations, and final English copy are present.
- [ ] Submit before the deadline and capture the accepted confirmation screen.

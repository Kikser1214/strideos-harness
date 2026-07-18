# StrideOS judging guide

## Fast path — about 90 seconds

1. Run `npm run setup` and open <http://localhost:4173>. No account, watch, key, or database is required.
2. Before onboarding, select **Should I run today?** to see the labeled synthetic trace and Garmin approval boundary. Approve it and verify the result says no external calendar changed.
3. Run `npm run reset`, refresh, and inspect the 11-step athlete map. The strength, safety, data-source, optional nutrition, and automation sections are first-class—not afterthoughts.
4. Complete the map or use the synthetic sample as a reference. Open **Training plan**, send the exact four-week block to approval, and verify the dashboard remains pending until **Approve action** is selected.
5. Open **Automations**, select **Test now**, and verify the preview reports `External actions: none` and does not claim it was scheduled.
6. On the active today card, select **Add note**, request a shorter session, and choose **Ask coach to revise**. Verify the exact shortened block stops in the decision ledger while the current block remains active.

## Deeper paths

- **No wearable:** Data sources → save a manual pain/RPE/energy/sleep check-in.
- **Activity file:** preview `test/sample-run.gpx`, confirm normalized-summary storage, then delete it.
- **Fuel:** inspect number policy and supplement boundaries; a meal estimate needs correction/confirmation and the raw image is not stored.
- **Safety:** mention sharp chest pain or dizziness in coaching; the normal action path stops.
- **Fresh evidence:** create a workout proposal, then add pain 5/10; approval is rejected as stale.

## Claim-to-evidence map

| Claim | Inspect here |
| --- | --- |
| Rules, not prompt language, authorize actions | `rules/harness-policy.json`, `src/harness.mjs` |
| Model output is constrained | `src/openai.mjs` strict response schemas |
| Plan and strength prescription are deterministic | `src/athlete-analysis.mjs`, `src/training-plan.mjs` |
| Pending is not active | `/api/dashboard`, `test/dashboard.test.mjs`, `test/server.test.mjs` |
| Workout feedback creates a separate approvable block | `src/feedback.mjs`, `/api/workout-feedback/:id/proposal`, feedback/API tests |
| Food estimates remain athlete controlled | `src/nutrition.mjs`, meal decision tests |
| Garmin receives the exact approved workout | `src/garmin.mjs`, `test/garmin.test.mjs` |
| New pain invalidates an old device write | `test/server.test.mjs` |
| Scheduled prompts are preview-first and read-only | `src/automations.mjs`, `docs/AUTOMATIONS.md` |
| Clean install and release quality | `npm run verify`, `docs/RELEASE_CHECKLIST.md` |

Current release evidence: setup doctor passed, 100 tests passed, `npm audit --omit=dev` reported zero production vulnerabilities, and the workout annotation plus revised-plan approval flow was rehearsed at desktop and 390 px mobile width.

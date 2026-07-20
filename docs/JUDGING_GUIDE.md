# StrideOS judging guide

## Plugin-first fast path

1. From a clean clone, run `npx plugins discover .` and `npm run test:plugin`. Verify discovery reports one `strideos` plugin with exactly five skills.
2. Inspect `plugins/strideos/.codex-plugin/plugin.json` and the five skill folders: `coach-athlete`, `plan-training`, `use-training-data`, `support-fueling`, and `build-coach-room`. The package claims no MCP server, hosted backend, browser executor, or provider-write executor.
3. Install from `./plugins/strideos`, restart the ChatGPT desktop app or Codex CLI, and open a new Work/Codex task. Ask StrideOS to start first-time onboarding, then ask it to create a private coach room. Verify the athlete remains the only plan approver and any unbound identity or persistence is labeled as a demo or local artifact.
4. For the optional deterministic reference implementation, run `npm run setup` and open <http://localhost:4173>. No account, watch, key, or database is required.
5. Before onboarding, select **Should I run today?** to see the labeled synthetic trace and Garmin approval boundary. Approve it and verify the result says no external calendar changed.
6. Run `npm run reset`, refresh, and inspect the 11-step athlete map. Strength, safety, data-source, optional nutrition, and automation sections are first-class—not afterthoughts.
7. Complete the map or use the synthetic sample as a reference. Open **Training plan**, send the exact four-week block to approval, and verify the dashboard remains pending until **Approve action** is selected.
8. On the active today card, select **Add note**, request a shorter session, and choose **Ask coach to revise**. Verify the exact shortened block stops in the decision ledger while the current block remains active.

## Garmin fail-closed proof

This is the personal-plan counterpart to the labeled synthetic judge path:

1. Approve an active StrideOS plan, then inspect the exact structured local workout preview, including date, targets, and steps.
2. Inspect the Garmin playbook and verify assisted browsing is classified `not_established`.
3. Request provider delivery and verify the resolver blocks AI/browser operation instead of returning a browser handoff.
4. Verify the product offers manual entry and Garmin's official export/local supported activity-file route where applicable.
5. If using the synthetic judge action, verify it remains labeled as a simulation and reports that no external calendar changed.
6. Do not sign into, open, or operate Garmin Connect as part of the agent demo.

## Deeper paths

- **No wearable:** Data sources → save a manual pain/RPE/energy/sleep check-in.
- **Activity file:** preview `test/sample-run.gpx`, confirm normalized-summary storage, then delete it.
- **Fuel:** inspect number policy and supplement boundaries; a meal estimate needs correction/confirmation and the raw image is not stored.
- **Coach room:** invoke `build-coach-room`, scope a reviewer to the minimum useful fields, attach a comment to an exact session, and verify the suggestion becomes a separate athlete-visible proposal rather than a silent edit.
- **Safety:** mention sharp chest pain or dizziness in coaching; the normal action path stops.
- **Fresh evidence:** create a workout proposal, then add pain 5/10; approval is rejected as stale.
- **Garmin permission:** inspect the playbook and verify export/local supported activity files and manual entry remain available while AI/browser operation fails closed.
- **Strava policy:** inspect the playbook and verify only export/manual routes are selectable; API-to-AI and browser automation remain blocked.

## Claim-to-evidence map

| Claim | Inspect here |
| --- | --- |
| The shipped product is one installable plugin with five skills | `plugins/strideos/.codex-plugin/plugin.json`, `plugins/strideos/skills/`, `test/plugin-package.test.mjs` |
| Human coach review stays scoped and athlete-controlled | `plugins/strideos/skills/build-coach-room/`, `sites/athlete-coach-demo/` |
| Rules, not prompt language, authorize actions | `rules/harness-policy.json`, `src/harness.mjs` |
| Model output is constrained | `src/openai.mjs` strict response schemas |
| Plan and strength prescription are deterministic | `src/athlete-analysis.mjs`, `src/training-plan.mjs` |
| Pending is not active | `/api/dashboard`, `test/dashboard.test.mjs`, `test/server.test.mjs` |
| Workout feedback creates a separate approvable block | `src/feedback.mjs`, `/api/workout-feedback/:id/proposal`, feedback/API tests |
| Food estimates remain athlete controlled | `src/nutrition.mjs`, meal decision tests |
| Garmin returns an exact local preview but no AI/browser handoff | `src/garmin.mjs`, `test/garmin.test.mjs`, `test/server.test.mjs` |
| Route precedence and provider permission fail closed | `rules/connector-playbooks.json`, `src/connectors.mjs`, `test/connectors.test.mjs` |
| The dormant browser-read contract requires permission, an implemented executor, explicit attended context, and provenance without session material | `browserReadProvenance()`, `test/connectors.test.mjs` |
| New pain invalidates an external-action proposal before any provider-permitted write | `test/server.test.mjs` |
| Scheduled prompts are preview-first and read-only | `src/automations.mjs`, `docs/AUTOMATIONS.md` |
| Plugin and optional reference-app release quality | `npm run test:plugin`, `npm run verify`, `docs/RELEASE_CHECKLIST.md` |

Update the release-evidence count only after `npm run verify` completes on the final commit. The acceptance suite must include provider-permission and executor filtering, explicit attended-context checks, the dormant `browser_read` provenance contract, Garmin's `not_established` fail-closed route, export/manual fallbacks, Strava route blocks, and stale-plan rejection.

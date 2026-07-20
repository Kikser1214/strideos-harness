# StrideOS judging guide

## Plugin-first fast path

1. Add the GitHub marketplace with `codex plugin marketplace add Kikser1214/strideos-harness --ref main`, run `codex plugin list`, and run `npm run test:plugin` from a clone. Verify the marketplace exposes `strideos@strideos` and package validation proves exactly six skills.
2. Inspect `.agents/plugins/marketplace.json`, `plugins/strideos/.codex-plugin/plugin.json`, and the six skill folders: `coach-athlete`, `plan-training`, `use-training-data`, `support-fueling`, `schedule-coaching`, and `build-coach-room`. The package claims no bundled MCP server, hosted backend, provider-specific connector, or unofficial connection recipe.
3. Install with `codex plugin add strideos@strideos` for Codex CLI or install/enable StrideOS through the ChatGPT desktop Plugins Directory. Restart, open a new Work/Codex task, invoke `@strideos` to start first-time onboarding, invoke `schedule-coaching` to preview and manually test a morning brief, then ask it to create a private coach room. Verify the schedule remains explicitly not installed, the test is read-only, the athlete remains the only plan approver, and any unbound identity or persistence is labeled as a demo or local artifact.
4. For the optional deterministic reference implementation, run `npm run setup` and open <http://localhost:4173>. No account, watch, key, or database is required.
5. Before onboarding, select **Should I run today?** to see the labeled synthetic trace and Garmin approval boundary. Approve it and verify the result says no external calendar changed.
6. Run `npm run reset`, refresh, and inspect the 11-step athlete map. Strength, safety, data-source, optional nutrition, and automation sections are first-class—not afterthoughts.
7. Complete the map or use the synthetic sample as a reference. Open **Training plan**, send the exact four-week block to approval, and verify the dashboard remains pending until **Approve action** is selected.
8. On the active today card, select **Add note**, request a shorter session, and choose **Ask coach to revise**. Verify the exact shortened block stops in the decision ledger while the current block remains active.

## Garmin attended browser/computer-use proof

This is the personal-plan counterpart to the labeled synthetic judge path:

1. Use an interactive host that exposes browser/computer use and approve an active StrideOS plan.
2. Inspect the exact dry-run, including visible account hint, date, targets, steps, and expected result.
3. Open Garmin Connect and complete login/MFA yourself; do not expose credentials or account identity in the recording.
4. Give one exact approval and verify the agent performs one visible workout/calendar write in the attended session.
5. Verify the matching result in Garmin's calendar/watch view before reporting success.
6. Change a field or request a second write and verify that a new preview and approval are required.
7. On a host without browser/computer use, verify the product truthfully falls back to official export/local supported files and manual entry.

## Deeper paths

- **No wearable:** Data sources → save a manual pain/RPE/energy/sleep check-in.
- **Activity file:** preview `test/sample-run.gpx`, confirm normalized-summary storage, then delete it.
- **Fuel:** inspect number policy and supplement boundaries; a meal estimate needs correction/confirmation and the raw image is not stored.
- **Coach room:** invoke `build-coach-room`, scope a reviewer to the minimum useful fields, attach a comment to an exact session, and verify the suggestion becomes a separate athlete-visible proposal rather than a silent edit.
- **Scheduled coaching:** invoke `schedule-coaching`, preview one of the four supported rhythms, inspect its human-readable local schedule, timezone, exact prompt, and narrow permissions, then run the manual test. Verify creation is handed to the native Scheduled/automation tool when available and the plugin neither claims installation nor permits unattended mutation, provider browsing, or provider writes.
- **Safety:** mention sharp chest pain or dizziness in coaching; the normal action path stops.
- **Fresh evidence:** create a workout proposal, then add pain 5/10; approval is rejected as stale.
- **Garmin browser:** verify user login, `browser_read` provenance for any read, one exact approval per write, and visible calendar verification.
- **Strava:** verify the official MCP is preferred where available, then attended host browser/computer use, official export, and manual entry; no unofficial API recipe appears.
- **Open-source extension:** explicitly supply a harmless local test adapter and verify StrideOS guidance steps aside instead of blocking it or claiming it as supported.

## Claim-to-evidence map

| Claim | Inspect here |
| --- | --- |
| The shipped product is one installable plugin with six skills | `plugins/strideos/.codex-plugin/plugin.json`, `plugins/strideos/skills/`, `test/plugin-package.test.mjs` |
| Human coach review stays scoped and athlete-controlled | `plugins/strideos/skills/build-coach-room/`, `sites/athlete-coach-demo/` |
| Deterministic rules authorize optional reference-runtime state changes | `rules/harness-policy.json`, `src/harness.mjs` |
| Model output is constrained | `src/openai.mjs` strict response schemas |
| Plan and strength prescription are deterministic | `src/athlete-analysis.mjs`, `src/training-plan.mjs` |
| Pending is not active | `/api/dashboard`, `test/dashboard.test.mjs`, `test/server.test.mjs` |
| Workout feedback creates a separate approvable block | `src/feedback.mjs`, `/api/workout-feedback/:id/proposal`, feedback/API tests |
| Food estimates remain athlete controlled | `src/nutrition.mjs`, meal decision tests |
| Garmin supports an exact attended host-browser write while the reference simulator remains labeled | `src/garmin.mjs`, `test/garmin.test.mjs`, `test/server.test.mjs` |
| Official recommendations do not become an allowlist over host tools | `rules/connector-playbooks.json`, `src/connectors.mjs`, `test/connectors.test.mjs` |
| Browser reads require attended context and provenance without session material | `browserReadProvenance()`, `test/connectors.test.mjs` |
| New pain invalidates an external-action proposal before a write | `test/server.test.mjs` |
| Fork ownership and installed-snapshot behavior are explicit | `docs/OWNERSHIP_AND_EXTENSIONS.md`, `docs/INSTALL.md` |
| `schedule-coaching` keeps scheduled prompts preview-first and read-only | `plugins/strideos/skills/schedule-coaching/`, `src/automations.mjs`, `docs/AUTOMATIONS.md` |
| Plugin and optional reference-app release quality | `npm run test:plugin`, `npm run verify`, `docs/RELEASE_CHECKLIST.md` |

Update the release-evidence count only after `npm run verify` completes on the final commit. The acceptance suite must include official-over-host-browser-over-file precedence, host-capability detection, explicit attended-context checks, `browser_read` provenance, Garmin and Strava attended flows, exact one-write approval, external-tool pass-through, export/manual fallbacks, and stale-plan rejection.

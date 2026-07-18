import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createServer } from "../src/server.mjs";
import { activatePlan, resetState, savePlanProposal } from "../src/store.mjs";
import { completeProfile } from "./fixtures.mjs";

const stateFile = path.join(os.tmpdir(), `strideos-test-${process.pid}.json`);
process.env.STRIDEOS_STATE_FILE = stateFile;
delete process.env.OPENAI_API_KEY;
delete process.env.GARMIN_BRIDGE_URL;

async function withServer(run) {
  resetState();
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try { await run(base); }
  finally { await new Promise((resolve) => server.close(resolve)); }
}

async function post(base, pathname, body) {
  return fetch(`${base}${pathname}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}

function activateTodaysRunningPlan({ id = "plan_personal_bridge_test", sessionId = "personal_run_1", title = "Personal easy run" } = {}) {
  const today = new Date().toISOString().slice(0, 10);
  const plan = {
    id, status: "proposal", startDate: today, endDate: today,
    weeks: [{ week: 1, startDate: today, recoveryWeek: false, days: [{ day: "monday", date: today, sessions: [{ id: sessionId, type: "easy_run", title, durationMinutes: 31, intensity: { rpe: "2-4", talkTest: "Full sentences." }, steps: [] }] }] }]
  };
  savePlanProposal(plan, "seed_decision");
  activatePlan(plan.id);
  return plan;
}

test("bootstrap reports connector truthfully", () => withServer(async (base) => {
  const response = await fetch(`${base}/api/bootstrap`);
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.mode, "demo");
  assert.equal(data.connectors.garmin.mode, "simulation");
  assert.equal(data.connectors.garmin.configured, false);
  assert.equal(data.needsOnboarding, true);
  assert.equal(data.dashboard.status, "needs_onboarding");
  assert.equal(data.automations.status, "needs_onboarding");
}));

test("automation proposals are editable, testable, and never claim scheduling", () => withServer(async (base) => {
  await post(base, "/api/onboarding", { profile: completeProfile(), complete: true });
  let setup = await (await fetch(`${base}/api/automations`)).json();
  assert.equal(setup.scheduled, false);
  assert.equal(setup.tasks.length, 4);
  assert.ok(setup.tasks.every((task) => task.scheduleStatus === "proposal_only"));

  const configured = await post(base, "/api/automations/config", { id: "morning_brief", enabled: true, time: "06:45" });
  assert.equal(configured.status, 200);
  setup = await configured.json();
  assert.equal(setup.tasks.find((task) => task.id === "morning_brief").schedule.time, "06:45");

  const tested = await post(base, "/api/automations/test", { id: "morning_brief" });
  assert.equal(tested.status, 200);
  const result = await tested.json();
  assert.equal(result.preview.status, "ready");
  assert.deepEqual(result.preview.externalActions, []);
  assert.ok(result.setup.tasks.find((task) => task.id === "morning_brief").testedAt);

  assert.equal((await post(base, "/api/automations/config", { id: "morning_brief", time: "tomorrow" })).status, 422);
  assert.equal((await post(base, "/api/automations/test", { id: "unknown" })).status, 422);
}));

test("dashboard API never treats a pending plan as active", () => withServer(async (base) => {
  await post(base, "/api/onboarding", { profile: completeProfile(), complete: true });
  let dashboard = await (await fetch(`${base}/api/dashboard`)).json();
  assert.equal(dashboard.dashboard.plan.status, "no_active_plan");
  const proposal = await (await post(base, "/api/training-plan/proposals", { startDate: "2026-07-20" })).json();
  dashboard = await (await fetch(`${base}/api/dashboard`)).json();
  assert.equal(dashboard.dashboard.plan.status, "awaiting_approval");
  assert.equal(dashboard.dashboard.today.sessions.length, 0);
  await post(base, "/api/decisions/approve", { id: proposal.decision.id });
  dashboard = await (await fetch(`${base}/api/dashboard`)).json();
  assert.ok(["active", "upcoming"].includes(dashboard.dashboard.plan.status));
  assert.ok(dashboard.dashboard.week.plannedStrength >= 1);
}));

test("personal demo coaching does not invent a Garmin workout without an active session", () => withServer(async (base) => {
  await post(base, "/api/onboarding", { profile: completeProfile(), complete: true });
  const coached = await (await post(base, "/api/coach", { message: "Should I run today?" })).json();
  assert.equal(coached.decision.gate.action, "read_training_data");
  assert.equal(coached.decision.status, "completed");
  assert.match(coached.decision.evidence.join(" "), /No active training block/i);
}));

test("personal approval is bound to the exact active-plan workout", () => withServer(async (base) => {
  await post(base, "/api/onboarding", { profile: completeProfile({ personal: { preferredName: "Mia" } }), complete: true });
  activateTodaysRunningPlan();
  const coached = await (await post(base, "/api/coach", { message: "Send today's run to Garmin" })).json();
  assert.equal(coached.decision.gate.action, "push_garmin_workout");
  assert.equal(coached.decision.resource.athleteId, "Mia");
  assert.equal(coached.decision.resource.workout.planId, "plan_personal_bridge_test");
  assert.equal(coached.decision.resource.workout.sessionId, "personal_run_1");
  assert.equal(coached.decision.resource.workout.name, "Personal easy run");
  assert.equal(coached.decision.resource.workout.distanceKm, undefined);
  assert.equal((await post(base, "/api/decisions/approve", { id: coached.decision.id })).status, 200);
}));

test("new pain evidence invalidates a previously proposed Garmin write", () => withServer(async (base) => {
  await post(base, "/api/onboarding", { profile: completeProfile({ personal: { preferredName: "Mia" } }), complete: true });
  activateTodaysRunningPlan({ id: "plan_stale_workout_test", sessionId: "stale_run_1", title: "Run before new evidence" });
  const coached = await (await post(base, "/api/coach", { message: "Send today's run to Garmin" })).json();
  assert.equal(coached.decision.status, "awaiting_approval");
  await post(base, "/api/checkins", { pain: 5, rpe: 7, energy: 2, sleepFeel: 2, note: "Pain changed after the proposal" });
  const approval = await post(base, "/api/decisions/approve", { id: coached.decision.id });
  assert.equal(approval.status, 409);
  assert.match((await approval.json()).error, /no longer current/i);
  const bootstrap = await (await fetch(`${base}/api/bootstrap`)).json();
  assert.equal(bootstrap.decisions.find((item) => item.id === coached.decision.id).status, "stopped");
}));

test("onboarding schema and connector truth are available", () => withServer(async (base) => {
  const response = await fetch(`${base}/api/onboarding/schema`);
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.ok(data.schema.sections.some((section) => section.id === "strength"));
  assert.equal(data.connectors.find((connector) => connector.id === "apple_health").route, "ios_companion");
}));

test("data setup reports usable fallbacks without fake connected states", () => withServer(async (base) => {
  const response = await fetch(`${base}/api/connectors`);
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.connectors.find((connector) => connector.id === "garmin").status, "setup_required");
  assert.equal(data.connectors.find((connector) => connector.id === "file_import").status, "available");
  assert.equal(data.connectors.find((connector) => connector.id === "apple_health").status, "companion_required");
  assert.ok(data.connectors.every((connector) => connector.status !== "connected"));
  assert.equal(data.storage.rawActivityFilesStored, false);
}));

test("activity import previews before explicit local-summary consent", () => withServer(async (base) => {
  const gpx = `<?xml version="1.0"?><gpx><trk><name>Test run</name><trkseg><trkpt lat="41.99" lon="21.42"><time>2026-07-18T05:00:00Z</time></trkpt><trkpt lat="42.00" lon="21.42"><time>2026-07-18T05:10:00Z</time></trkpt></trkseg></trk></gpx>`;
  const payload = { fileName: "test.gpx", dataBase64: Buffer.from(gpx).toString("base64") };
  const preview = await post(base, "/api/imports/preview", payload);
  assert.equal(preview.status, 200);
  assert.equal((await preview.json()).file.rawStored, false);
  assert.equal((await post(base, "/api/imports", payload)).status, 422);

  const saved = await post(base, "/api/imports", { ...payload, consent: true });
  assert.equal(saved.status, 201);
  const savedBody = await saved.json();
  assert.equal(savedBody.rawStored, false);
  const setup = await (await fetch(`${base}/api/connectors`)).json();
  assert.equal(setup.imports.length, 1);
  assert.equal((await fetch(`${base}/api/imports/${setup.imports[0].id}`, { method: "DELETE" })).status, 200);
  assert.equal((await (await fetch(`${base}/api/connectors`)).json()).imports.length, 0);
}));

test("manual check-ins persist and can be deleted", () => withServer(async (base) => {
  const response = await post(base, "/api/checkins", { pain: 1, rpe: 4, energy: 3, sleepFeel: 4, note: "Easy day" });
  assert.equal(response.status, 201);
  const saved = (await response.json()).checkin;
  assert.equal(saved.pain, 1);
  assert.equal((await fetch(`${base}/api/checkins/${saved.id}`, { method: "DELETE" })).status, 200);
  assert.equal((await (await fetch(`${base}/api/connectors`)).json()).checkins.length, 0);
}));

test("onboarding draft persists without marking first run complete", () => withServer(async (base) => {
  const saved = await post(base, "/api/onboarding", { profile: { personal: { preferredName: "Mia" } }, complete: false });
  assert.equal(saved.status, 200);
  const bootstrap = await (await fetch(`${base}/api/bootstrap`)).json();
  assert.equal(bootstrap.needsOnboarding, true);
  assert.equal(bootstrap.onboarding.profile.personal.preferredName, "Mia");
}));

test("completed onboarding survives bootstrap", () => withServer(async (base) => {
  const incomplete = await post(base, "/api/onboarding", { profile: { personal: { preferredName: "Mia" } }, complete: true });
  assert.equal(incomplete.status, 422);
  const missing = await incomplete.json();
  assert.ok(missing.missing.includes("strength.experience"));

  const completed = await post(base, "/api/onboarding", { profile: completeProfile(), complete: true });
  assert.equal(completed.status, 201);
  const result = await completed.json();
  assert.equal(result.analysis.strength.sessionsPerWeek, 2);
  const bootstrap = await (await fetch(`${base}/api/bootstrap`)).json();
  assert.equal(bootstrap.needsOnboarding, false);
  assert.ok(bootstrap.onboarding.completedAt);
  assert.equal(bootstrap.athleteAnalysis.stage.value, "starter");
  const analysis = await (await fetch(`${base}/api/athlete-analysis`)).json();
  assert.equal(analysis.analysis.guardrails.modelCanOverrideSafety, false);
}));

test("training plans remain proposals until a server-authoritative approval", () => withServer(async (base) => {
  assert.equal((await fetch(`${base}/api/training-plan`)).status, 409);
  assert.equal((await post(base, "/api/onboarding", { profile: completeProfile(), complete: true })).status, 201);

  const previewResponse = await fetch(`${base}/api/training-plan`);
  const preview = await previewResponse.json();
  assert.equal(previewResponse.status, 200);
  assert.equal(preview.preview.status, "proposal");
  assert.equal(preview.activePlan, null);

  const proposedResponse = await post(base, "/api/training-plan/proposals", { startDate: "2026-07-20" });
  const proposed = await proposedResponse.json();
  assert.equal(proposedResponse.status, 201);
  assert.equal(proposed.plan.status, "awaiting_approval");
  assert.equal(proposed.decision.status, "awaiting_approval");
  assert.equal(proposed.decision.resource.id, proposed.plan.id);
  assert.equal((await post(base, "/api/training-plan/proposals", { startDate: "2026-07-20" })).status, 409);

  const approvedResponse = await post(base, "/api/decisions/approve", { id: proposed.decision.id, action: "different_plan" });
  const approved = await approvedResponse.json();
  assert.equal(approvedResponse.status, 200);
  assert.match(approved.result, /now active/i);
  const bootstrap = await (await fetch(`${base}/api/bootstrap`)).json();
  assert.equal(bootstrap.training.activePlan.id, proposed.plan.id);
  assert.equal(bootstrap.training.activePlan.status, "active");
}));

test("declining a plan leaves no active plan", () => withServer(async (base) => {
  await post(base, "/api/onboarding", { profile: completeProfile(), complete: true });
  const proposed = await (await post(base, "/api/training-plan/proposals", { startDate: "2026-07-20" })).json();
  assert.equal((await post(base, "/api/decisions/decline", { id: proposed.decision.id })).status, 200);
  const bootstrap = await (await fetch(`${base}/api/bootstrap`)).json();
  assert.equal(bootstrap.training.activePlan, null);
  assert.equal(bootstrap.training.proposals.find((plan) => plan.id === proposed.plan.id).status, "declined");
}));

test("a high-pain check-in removes an active plan from the normal path", () => withServer(async (base) => {
  await post(base, "/api/onboarding", { profile: completeProfile(), complete: true });
  const proposed = await (await post(base, "/api/training-plan/proposals", { startDate: "2026-07-20" })).json();
  await post(base, "/api/decisions/approve", { id: proposed.decision.id });
  assert.equal((await post(base, "/api/checkins", { pain: 5, rpe: 7, energy: 2, sleepFeel: 2, note: "Pain changed the day" })).status, 201);
  const bootstrap = await (await fetch(`${base}/api/bootstrap`)).json();
  assert.equal(bootstrap.training.activePlan, null);
  assert.equal(bootstrap.training.proposals.find((plan) => plan.id === proposed.plan.id).status, "review_required");
}));

test("decision approval is server-authoritative and survives bootstrap", () => withServer(async (base) => {
  const coached = await post(base, "/api/coach", { message: "Should I run today?" });
  const { decision } = await coached.json();
  const approved = await post(base, "/api/decisions/approve", { id: decision.id, action: "erase_everything" });
  const result = await approved.json();
  assert.equal(approved.status, 200);
  assert.equal(result.simulated, true);
  assert.match(result.result, /no external calendar changed/i);

  const bootstrap = await (await fetch(`${base}/api/bootstrap`)).json();
  assert.equal(bootstrap.decisions[0].id, decision.id);
  assert.equal(bootstrap.decisions[0].status, "approved");
}));

test("unknown and duplicate approvals are rejected", () => withServer(async (base) => {
  const missing = await post(base, "/api/decisions/approve", { id: "missing" });
  assert.equal(missing.status, 404);
  const coached = await (await post(base, "/api/coach", { message: "Should I run today?" })).json();
  assert.equal((await post(base, "/api/decisions/approve", { id: coached.decision.id })).status, 200);
  assert.equal((await post(base, "/api/decisions/approve", { id: coached.decision.id })).status, 409);
}));

test("safety decisions cannot be approved", () => withServer(async (base) => {
  const coached = await (await post(base, "/api/coach", { message: "I have sharp chest pain and feel dizzy." })).json();
  assert.equal(coached.decision.status, "stopped");
  assert.equal((await post(base, "/api/decisions/approve", { id: coached.decision.id })).status, 409);
}));

test("nutrition companion is opt-in and reflects the completed athlete profile", () => withServer(async (base) => {
  assert.equal((await fetch(`${base}/api/nutrition`)).status, 409);
  await post(base, "/api/onboarding", { profile: completeProfile(), complete: true });
  const response = await fetch(`${base}/api/nutrition`);
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.companion.effectiveMode, "loose");
  assert.equal(data.companion.numberPolicy.showMacros, false);
  assert.equal(data.companion.photo.rawImageStored, false);
}));

test("nutrition and photo opt-outs are enforced by the server", () => withServer(async (base) => {
  const imageDataUrl = "data:image/png;base64,iVBORw0KGgo=";
  await post(base, "/api/onboarding", { profile: completeProfile({ nutrition: { mode: "off", photoMode: true } }), complete: true });
  assert.equal((await post(base, "/api/food", { imageDataUrl })).status, 403);

  await post(base, "/api/onboarding", { profile: completeProfile({ nutrition: { mode: "guided", photoMode: false } }), complete: true });
  assert.equal((await post(base, "/api/food", { imageDataUrl })).status, 403);
}));

test("meal estimates require explicit confirmation and persist no raw image", () => withServer(async (base) => {
  const profile = completeProfile({
    personal: { weight: 70, weightContext: "context_only" },
    nutrition: { mode: "detailed", numberFreePreferred: false, trackingRelationship: "comfortable_with_numbers", photoMode: true }
  });
  await post(base, "/api/onboarding", { profile, complete: true });
  const analyzedResponse = await post(base, "/api/food", { imageDataUrl: "data:image/png;base64,iVBORw0KGgo=", note: "Sauce on the side" });
  const analyzed = await analyzedResponse.json();
  assert.equal(analyzedResponse.status, 200);
  assert.equal(analyzed.draft.status, "awaiting_confirmation");
  assert.equal(analyzed.draft.imageStored, false);
  assert.equal(analyzed.meal.rawImageStored, false);
  assert.match(analyzed.meal.caloriesRange, /kcal/);

  assert.equal((await post(base, "/api/decisions/approve", { id: analyzed.decision.id })).status, 422);
  const approved = await post(base, "/api/decisions/approve", {
    id: analyzed.decision.id,
    mealConfirmation: { confirmed: true, corrections: "Rice portion was closer to one cup." }
  });
  assert.equal(approved.status, 200);

  const nutrition = await (await fetch(`${base}/api/nutrition`)).json();
  const logged = nutrition.meals.find((meal) => meal.id === analyzed.draft.id);
  assert.equal(logged.status, "logged");
  assert.equal(logged.corrections, "Rice portion was closer to one cup.");
  assert.equal(logged.imageStored, false);

  const removed = await fetch(`${base}/api/meals/${logged.id}`, { method: "DELETE" });
  assert.equal(removed.status, 200);
  assert.equal((await (await fetch(`${base}/api/nutrition`)).json()).meals.length, 0);
}));

test("number-free meal support strips calorie and macro ranges before storage", () => withServer(async (base) => {
  await post(base, "/api/onboarding", { profile: completeProfile({ nutrition: { mode: "detailed", numberFreePreferred: true, photoMode: true } }), complete: true });
  const analyzed = await (await post(base, "/api/food", { imageDataUrl: "data:image/png;base64,iVBORw0KGgo=" })).json();
  assert.equal(analyzed.meal.caloriesRange, null);
  assert.equal(analyzed.meal.proteinRange, null);
  assert.equal(analyzed.draft.estimate.carbsRange, null);
}));

test("declining a meal decision leaves an explicit declined draft", () => withServer(async (base) => {
  await post(base, "/api/onboarding", { profile: completeProfile(), complete: true });
  const analyzed = await (await post(base, "/api/food", { imageDataUrl: "data:image/png;base64,iVBORw0KGgo=" })).json();
  assert.equal((await post(base, "/api/decisions/decline", { id: analyzed.decision.id })).status, 200);
  const nutrition = await (await fetch(`${base}/api/nutrition`)).json();
  assert.equal(nutrition.meals.find((meal) => meal.id === analyzed.draft.id).status, "declined");
}));

test("meal upload rejects non-image data", () => withServer(async (base) => {
  const response = await post(base, "/api/food", { imageDataUrl: "data:text/plain;base64,SGVsbG8=" });
  assert.equal(response.status, 400);
  const fakePng = await post(base, "/api/food", { imageDataUrl: "data:image/png;base64,SGVsbG8=" });
  assert.equal(fakePng.status, 400);
}));

test("HTTP boundary rejects malformed, mislabelled, oversized, and traversal requests", () => withServer(async (base) => {
  const apiResponse = await fetch(`${base}/api/bootstrap`);
  assert.equal(apiResponse.headers.get("x-content-type-options"), "nosniff");
  assert.match(apiResponse.headers.get("content-security-policy"), /default-src 'self'/);
  assert.equal(apiResponse.headers.get("cache-control"), "no-store");

  const page = await fetch(base);
  assert.equal(page.status, 200);
  assert.equal(page.headers.get("referrer-policy"), "no-referrer");
  assert.match(page.headers.get("permissions-policy"), /camera=\(\)/);
  assert.equal((await fetch(`${base}/%2e%2e%2fpackage.json`)).status, 404);

  const wrongType = await fetch(`${base}/api/coach`, { method: "POST", headers: { "content-type": "text/plain" }, body: "hello" });
  assert.equal(wrongType.status, 415);
  const malformed = await fetch(`${base}/api/coach`, { method: "POST", headers: { "content-type": "application/json" }, body: "{" });
  assert.equal(malformed.status, 400);
  const oversized = await fetch(`${base}/api/checkins`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ note: "x".repeat(21_000) }) });
  assert.equal(oversized.status, 413);
}));

test.after(() => { try { fs.rmSync(stateFile); } catch {} });

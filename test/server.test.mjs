import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createServer } from "../src/server.mjs";
import { resetState } from "../src/store.mjs";
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

test("bootstrap reports connector truthfully", () => withServer(async (base) => {
  const response = await fetch(`${base}/api/bootstrap`);
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.mode, "demo");
  assert.equal(data.connectors.garmin.mode, "simulation");
  assert.equal(data.connectors.garmin.configured, false);
  assert.equal(data.needsOnboarding, true);
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

test.after(() => { try { fs.rmSync(stateFile); } catch {} });

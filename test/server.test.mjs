import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createServer, currentModelAthleteContext, currentProviderWriteStateBinding, validateRuntimeAccess } from "../src/server.mjs";
import { buildProviderWriteDecision } from "../src/harness.mjs";
import { activatePlan, findDecision, resetState, saveDecision, savePlanProposal } from "../src/store.mjs";
import { completeProfile } from "./fixtures.mjs";

const stateFile = path.join(os.tmpdir(), `strideos-test-${process.pid}.json`);
process.env.STRIDEOS_STATE_FILE = stateFile;
delete process.env.OPENAI_API_KEY;
delete process.env.STRIDEOS_ACCESS_TOKEN;

const permittedBrowserFixture = {
  routePrecedence: ["official_mcp", "official_api", "native_companion", "assisted_browsing", "file_import", "manual"],
  assistedBrowsingContract: { executorEnabled: true },
  providers: [{
    id: "fixture_web", label: "Synthetic permitted web provider", webAppUrl: "https://provider.invalid/",
    permittedRoutes: [{
      id: "fixture_browser", type: "attended_browser", providerPermittedForIndividual: true, status: "host_dependent",
      executorImplemented: true, capabilities: ["read_activity", "workout_create"]
    }]
  }]
};

async function withServer(run, serverOptions = {}) {
  resetState();
  const server = createServer(serverOptions);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try { await run(base); }
  finally { await new Promise((resolve) => server.close(resolve)); }
}

async function post(base, pathname, body) {
  return fetch(`${base}${pathname}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}

function providerWriteDecision({ now = new Date(), accountBinding = "athlete-42" } = {}) {
  return buildProviderWriteDecision({
    evidence: ["Synthetic permitted attended route"], proposal: "Create exactly one structured workout?",
    providerId: "fixture_web", routeId: "fixture_browser", accountBinding,
    capability: "write_workout", operation: "create_workout",
    target: "workout:new",
    stateBinding: currentProviderWriteStateBinding(),
    payload: { name: "Easy 30", steps: [{ minutes: 30, target: "easy" }] },
    browserContext: { surface: "codex_desktop", attended: true, scheduled: false, headless: false },
    now,
    ttlMs: 60_000
  });
}

function activateTodaysRunningPlan({ id = "plan_personal_route_test", sessionId = "personal_run_1", title = "Personal easy run" } = {}) {
  const today = new Date().toISOString().slice(0, 10);
  const plan = {
    id, status: "proposal", startDate: today, endDate: today,
    weeks: [{ week: 1, startDate: today, recoveryWeek: false, days: [{ day: "monday", date: today, sessions: [{ id: sessionId, type: "easy_run", title, durationMinutes: 31, intensity: { rpe: "2-4", talkTest: "Full sentences." }, steps: [] }] }] }]
  };
  savePlanProposal(plan, "seed_decision");
  activatePlan(plan.id);
  return plan;
}

test("runtime refuses an unprotected non-local host", () => {
  assert.deepEqual(validateRuntimeAccess("127.0.0.1", ""), { local: true, protected: false });
  assert.throws(() => validateRuntimeAccess("0.0.0.0", ""), /refusing to expose/i);
  assert.deepEqual(validateRuntimeAccess("0.0.0.0", "a-long-private-key"), { local: false, protected: true });
});

test("bootstrap reports connector truthfully", () => withServer(async (base) => {
  const response = await fetch(`${base}/api/bootstrap`);
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.mode, "demo");
  assert.equal(data.connectors.garmin.mode, "reference_runtime_only");
  assert.equal(data.connectors.garmin.configured, false);
  assert.equal(data.connectors.garmin.workoutDeliverySupported, false);
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

test("the optional runtime delegates a personal Garmin request before offering an in-runtime approval", () => withServer(async (base) => {
  await post(base, "/api/onboarding", { profile: completeProfile({ personal: { preferredName: "Mia" }, delivery: { workoutDelivery: true, workoutDeliveryTarget: "garmin", connectorSetupMode: "allow_local_setup_after_review" } }), complete: true });
  activateTodaysRunningPlan();
  const coached = await (await post(base, "/api/coach", { message: "Send today's run to Garmin" })).json();
  assert.equal(coached.decision.gate.action, "read_training_data");
  assert.equal(coached.decision.status, "completed");
  assert.equal(coached.decision.resource, null);
  assert.match(coached.decision.proposal, /reference runtime has no delivery executor/i);
}));

test("new pain evidence removes the workout from local Garmin guidance", () => withServer(async (base) => {
  await post(base, "/api/onboarding", { profile: completeProfile({ personal: { preferredName: "Mia" }, delivery: { workoutDelivery: true, workoutDeliveryTarget: "garmin", connectorSetupMode: "allow_local_setup_after_review" } }), complete: true });
  activateTodaysRunningPlan({ id: "plan_stale_workout_test", sessionId: "stale_run_1", title: "Run before new evidence" });
  const coached = await (await post(base, "/api/coach", { message: "Send today's run to Garmin" })).json();
  assert.equal(coached.decision.status, "completed");
  await post(base, "/api/checkins", { pain: 5, rpe: 7, energy: 2, sleepFeel: 2, note: "Pain changed after the proposal" });
  const reviewed = await (await post(base, "/api/coach", { message: "Send today's run to Garmin" })).json();
  assert.equal(reviewed.decision.gate.action, "read_training_data");
  assert.equal(reviewed.decision.status, "completed");
  assert.match(reviewed.decision.evidence.join(" "), /Pain: 5\/10/i);
  assert.match(reviewed.decision.proposal, /paused the block/i);
}));

test("a personal plan cannot create a Garmin write when device delivery is off", () => withServer(async (base) => {
  await post(base, "/api/onboarding", { profile: completeProfile(), complete: true });
  activateTodaysRunningPlan({ id: "plan_local_only", sessionId: "local_only_run", title: "Local-only run" });
  const coached = await (await post(base, "/api/coach", { message: "Send today's run to Garmin" })).json();
  assert.equal(coached.decision.gate.action, "read_training_data");
  assert.match(coached.decision.proposal, /reference runtime has no delivery executor/i);
}));

test("onboarding schema and connector truth are available", () => withServer(async (base) => {
  const response = await fetch(`${base}/api/onboarding/schema`);
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.ok(data.schema.sections.some((section) => section.id === "strength"));
  assert.equal(data.connectors.find((connector) => connector.id === "apple_health").route, "native_companion");
}));

test("data setup reports usable fallbacks without fake connected states", () => withServer(async (base) => {
  const response = await fetch(`${base}/api/connectors`);
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.connectors.find((connector) => connector.id === "garmin").status, "file_or_manual");
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
  assert.equal(savedBody.activities[0].providerId, "unknown");
  assert.equal(savedBody.activities[0].modelContext.allowed, false);
  const setup = await (await fetch(`${base}/api/connectors`)).json();
  assert.equal(setup.imports.length, 1);
  assert.equal((await fetch(`${base}/api/imports/${setup.imports[0].id}`, { method: "DELETE" })).status, 200);
  assert.equal((await (await fetch(`${base}/api/connectors`)).json()).imports.length, 0);
}));

test("activity import records explicit provider model-context authorization", () => withServer(async (base) => {
  const csv = "date,type,distance_km,duration_minutes\n2026-07-18T05:00:00Z,Run,5,30\n";
  const payload = { fileName: "fitbit.csv", dataBase64: Buffer.from(csv).toString("base64"), providerId: "fitbit", consent: true };
  const blocked = await (await post(base, "/api/imports", payload)).json();
  assert.equal(blocked.activities[0].routeId, "fitbit_export");
  assert.equal(blocked.activities[0].modelContext.allowed, false);
  assert.equal(blocked.activities[0].modelContext.reason, "model_context_disclosure_required");

  const allowed = await (await post(base, "/api/imports", {
    ...payload,
    modelContext: { disclosureAccepted: true, consentRecorded: true }
  })).json();
  assert.equal(allowed.activities[0].modelContext.allowed, true);
  assert.equal(allowed.activities[0].modelContext.reason, "disclosure_and_consent_recorded");
}));

test("GPT athlete context excludes local-only imports while local storage retains them", () => withServer(async (base) => {
  await post(base, "/api/onboarding", { profile: completeProfile(), complete: true });
  const csv = "date,type,distance_km,duration_minutes\n2026-07-18T05:00:00Z,Run,5,30\n";
  const baseImport = { fileName: "history.csv", dataBase64: Buffer.from(csv).toString("base64"), consent: true };
  assert.equal((await post(base, "/api/imports", baseImport)).status, 201);
  let context = currentModelAthleteContext();
  assert.equal(context.modelContextEvidence.includedImportCount, 0);
  assert.equal(context.modelContextEvidence.excludedImportCount, 1);
  assert.equal(context.analysis.load.recentRunCount, 0);

  assert.equal((await post(base, "/api/imports", { ...baseImport, providerId: "garmin" })).status, 201);
  context = currentModelAthleteContext();
  assert.equal(context.modelContextEvidence.includedImportCount, 1);
  assert.equal(context.modelContextEvidence.excludedImportCount, 1);
  assert.equal(context.analysis.load.recentRunCount, 1);

  const local = await (await fetch(`${base}/api/connectors`)).json();
  assert.equal(local.imports.length, 2);
}));

test("manual check-ins persist and can be deleted", () => withServer(async (base) => {
  const response = await post(base, "/api/checkins", { pain: 1, rpe: 4, energy: 3, sleepFeel: 4, note: "Easy day" });
  assert.equal(response.status, 201);
  const saved = (await response.json()).checkin;
  assert.equal(saved.pain, 1);
  assert.equal((await fetch(`${base}/api/checkins/${saved.id}`, { method: "DELETE" })).status, 200);
  assert.equal((await (await fetch(`${base}/api/connectors`)).json()).checkins.length, 0);
}));

test("today's workout can be annotated without silently changing the active plan", () => withServer(async (base) => {
  await post(base, "/api/onboarding", { profile: completeProfile(), complete: true });
  const plan = activateTodaysRunningPlan({ id: "feedback_plan" });
  const response = await post(base, "/api/workout-feedback", {
    disposition: "adjust", reasons: ["schedule", "fatigue"], requestedChange: "shorter", pain: 2,
    note: "I only have 25 minutes today."
  });
  assert.equal(response.status, 201);
  const result = await response.json();
  assert.equal(result.feedback.planId, plan.id);
  assert.equal(result.dashboard.plan.status, "active");
  assert.equal(result.dashboard.feedback.latestForSession.id, result.feedback.id);
  assert.match(result.coachPrompt, /separate approval/i);

  const revisionResponse = await post(base, `/api/workout-feedback/${result.feedback.id}/proposal`, {});
  assert.equal(revisionResponse.status, 201);
  const revision = await revisionResponse.json();
  assert.equal(revision.plan.status, "awaiting_approval");
  assert.equal(revision.plan.adjustment.sourcePlanId, plan.id);
  assert.equal(revision.plan.weeks[0].days.find((day) => day.date === new Date().toISOString().slice(0, 10)).sessions[0].durationMinutes, 25);
  let bootstrap = await (await fetch(`${base}/api/bootstrap`)).json();
  assert.equal(bootstrap.training.activePlan.id, plan.id);
  assert.equal((await post(base, `/api/workout-feedback/${result.feedback.id}/proposal`, {})).status, 409);
  assert.equal((await post(base, "/api/decisions/approve", { id: revision.decision.id })).status, 200);
  bootstrap = await (await fetch(`${base}/api/bootstrap`)).json();
  assert.equal(bootstrap.training.activePlan.id, revision.plan.id);

  const listed = await (await fetch(`${base}/api/workout-feedback`)).json();
  assert.equal(listed.feedback.length, 1);
  assert.equal((await fetch(`${base}/api/workout-feedback/${result.feedback.id}`, { method: "DELETE" })).status, 200);
  assert.equal((await (await fetch(`${base}/api/workout-feedback`)).json()).feedback.length, 0);
}));

test("a high-pain workout annotation pauses the active block for review", () => withServer(async (base) => {
  await post(base, "/api/onboarding", { profile: completeProfile(), complete: true });
  const plan = activateTodaysRunningPlan({ id: "feedback_safety_plan" });
  const response = await post(base, "/api/workout-feedback", { disposition: "skip", reasons: ["pain"], requestedChange: "coach_choose", pain: 4 });
  assert.equal(response.status, 201);
  const bootstrap = await (await fetch(`${base}/api/bootstrap`)).json();
  assert.equal(bootstrap.training.activePlan, null);
  assert.equal(bootstrap.training.proposals.find((item) => item.id === plan.id).status, "review_required");
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

test("an attended provider approval executes exactly one bound write and rejects replay", () => {
  let writes = 0;
  const executor = {
    inspect: async ({ resource }) => ({
      providerId: resource.providerId,
      routeId: resource.routeId,
      accountBinding: resource.accountBinding,
      capability: resource.capability,
      operation: resource.operation,
      target: resource.target,
      pageUrl: "https://provider.invalid/workouts/new",
      surface: "codex_desktop",
      attended: true,
      scheduled: false,
      headless: false
    }),
    execute: async ({ payload, maxWrites }) => {
      assert.equal(maxWrites, 1);
      assert.equal(payload.name, "Easy 30");
      writes += 1;
      return { performed: true, writeCount: 1, providerRecordId: "provider-workout-1", message: "Synthetic attended write completed." };
    },
    verify: async ({ resource, execution }) => ({
      verified: true,
      matchingWriteCount: 1,
      providerId: resource.providerId,
      routeId: resource.routeId,
      accountBinding: resource.accountBinding,
      capability: resource.capability,
      operation: resource.operation,
      target: resource.target,
      providerRecordId: execution.providerRecordId,
      observedPayload: resource.payload,
      pageUrl: "https://provider.invalid/workouts/provider-workout-1",
      verifiedAt: new Date().toISOString(),
      message: "Synthetic attended write verified by read-back."
    })
  };
  return withServer(async (base) => {
    const decision = providerWriteDecision();
    saveDecision(decision);
    const proof = { id: decision.id, approvalNonce: decision.approvalEnvelope.nonce, scopeHash: decision.approvalEnvelope.scopeHash };
    assert.equal((await post(base, "/api/decisions/approve", { ...proof, approvalNonce: "wrong-proof" })).status, 422);
    assert.equal(findDecision(decision.id).status, "awaiting_approval");
    assert.equal(writes, 0);
    const approved = await post(base, "/api/decisions/approve", proof);
    assert.equal(approved.status, 200);
    assert.equal((await approved.json()).decision.result.writeCount, 1);
    assert.equal(findDecision(decision.id).result.providerRecordId, "provider-workout-1");
    assert.equal(writes, 1);
    assert.equal((await post(base, "/api/decisions/approve", proof)).status, 409);
    assert.equal(writes, 1);
  }, { providerWriteExecutor: executor, connectorPlaybooks: permittedBrowserFixture });
});

test("provider-write approval becomes stale when athlete evidence changes", () => {
  let inspected = false;
  const executor = {
    inspect: async () => { inspected = true; return {}; },
    execute: async () => { throw new Error("must not execute"); },
    verify: async () => { throw new Error("must not verify"); }
  };
  return withServer(async (base) => {
    const decision = providerWriteDecision();
    saveDecision(decision);
    assert.equal((await post(base, "/api/checkins", { pain: 1, rpe: 3, energy: 3, sleepFeel: 3, note: "New evidence" })).status, 201);
    const response = await post(base, "/api/decisions/approve", {
      id: decision.id,
      approvalNonce: decision.approvalEnvelope.nonce,
      scopeHash: decision.approvalEnvelope.scopeHash
    });
    assert.equal(response.status, 409);
    assert.match((await response.json()).error, /evidence or the training plan changed/i);
    assert.equal(findDecision(decision.id).status, "stopped");
    assert.equal(inspected, false);
  }, { providerWriteExecutor: executor, connectorPlaybooks: permittedBrowserFixture });
});

test("provider write is not reported performed without a separate exact read-back", () => {
  let writes = 0;
  let verified = 0;
  const executor = {
    inspect: async ({ resource }) => ({
      providerId: resource.providerId,
      routeId: resource.routeId,
      accountBinding: resource.accountBinding,
      capability: resource.capability,
      operation: resource.operation,
      target: resource.target,
      pageUrl: "https://provider.invalid/workouts/new",
      surface: "codex_desktop",
      attended: true,
      scheduled: false,
      headless: false
    }),
    execute: async () => {
      writes += 1;
      return { performed: true, writeCount: 1, providerRecordId: "provider-workout-2" };
    },
    verify: async ({ resource, execution }) => {
      verified += 1;
      return {
        verified: true,
        matchingWriteCount: 2,
        providerId: resource.providerId,
        routeId: resource.routeId,
        accountBinding: resource.accountBinding,
        capability: resource.capability,
        operation: resource.operation,
        target: resource.target,
        providerRecordId: execution.providerRecordId,
        observedPayload: resource.payload,
        pageUrl: "https://provider.invalid/workouts/provider-workout-2",
        verifiedAt: new Date().toISOString()
      };
    }
  };
  return withServer(async (base) => {
    const decision = providerWriteDecision();
    saveDecision(decision);
    const proof = { id: decision.id, approvalNonce: decision.approvalEnvelope.nonce, scopeHash: decision.approvalEnvelope.scopeHash };
    const response = await post(base, "/api/decisions/approve", proof);
    assert.equal(response.status, 409);
    assert.match((await response.json()).error, /may have occurred.*reconcile/i);
    assert.equal(writes, 1);
    assert.equal(verified, 1);
    assert.equal(findDecision(decision.id).status, "verification_required");
    assert.equal(findDecision(decision.id).result.performed, null);
    assert.equal(findDecision(decision.id).result.writeMayHaveOccurred, true);
    assert.equal(findDecision(decision.id).result.outcome, "write_may_have_occurred");
    assert.equal(findDecision(decision.id).result.providerRecordId, "provider-workout-2");
    assert.equal((await post(base, "/api/decisions/approve", proof)).status, 409);

    const retry = providerWriteDecision();
    const blockedRetry = saveDecision(retry);
    assert.equal(blockedRetry.status, "stopped");
    assert.equal(blockedRetry.result.reconciliationRequired, true);
    assert.equal(blockedRetry.result.blockedByDecisionId, decision.id);
    assert.equal((await post(base, "/api/decisions/approve", {
      id: retry.id,
      approvalNonce: retry.approvalEnvelope.nonce,
      scopeHash: retry.approvalEnvelope.scopeHash
    })).status, 409);
    assert.equal(writes, 1);
  }, { providerWriteExecutor: executor, connectorPlaybooks: permittedBrowserFixture });
});

test("the reference runtime reports a missing executor and consumes no phantom write", () => withServer(async (base) => {
  const decision = providerWriteDecision();
  saveDecision(decision);
  const response = await post(base, "/api/decisions/approve", {
    id: decision.id,
    approvalNonce: decision.approvalEnvelope.nonce,
    scopeHash: decision.approvalEnvelope.scopeHash
  });
  assert.equal(response.status, 409);
  assert.match((await response.json()).error, /no attended provider-write executor/i);
  assert.equal(findDecision(decision.id).status, "stopped");
}, { connectorPlaybooks: permittedBrowserFixture }));

test("expired provider-write approvals are rejected before executor inspection", () => {
  let inspected = false;
  const executor = {
    inspect: async () => { inspected = true; return {}; },
    execute: async () => { throw new Error("must not execute"); },
    verify: async () => { throw new Error("must not verify"); }
  };
  return withServer(async (base) => {
    const decision = providerWriteDecision({ now: new Date(Date.now() - 120_000) });
    saveDecision(decision);
    const response = await post(base, "/api/decisions/approve", {
      id: decision.id,
      approvalNonce: decision.approvalEnvelope.nonce,
      scopeHash: decision.approvalEnvelope.scopeHash
    });
    assert.equal(response.status, 409);
    assert.match((await response.json()).error, /expired/i);
    assert.equal(findDecision(decision.id).status, "expired");
    assert.equal(inspected, false);
  }, { providerWriteExecutor: executor, connectorPlaybooks: permittedBrowserFixture });
});

test("provider-write account mismatch consumes the approval without executing", () => {
  let writes = 0;
  const executor = {
    inspect: async ({ resource }) => ({
      providerId: resource.providerId,
      routeId: resource.routeId,
      accountBinding: "different-account",
      capability: resource.capability,
      operation: resource.operation,
      target: resource.target,
      pageUrl: "https://provider.invalid/workouts/new",
      surface: "codex_desktop",
      attended: true,
      scheduled: false,
      headless: false
    }),
    execute: async () => { writes += 1; return { performed: true, writeCount: 1, providerRecordId: "must-not-write" }; },
    verify: async () => { throw new Error("must not verify"); }
  };
  return withServer(async (base) => {
    const decision = providerWriteDecision();
    saveDecision(decision);
    const response = await post(base, "/api/decisions/approve", {
      id: decision.id,
      approvalNonce: decision.approvalEnvelope.nonce,
      scopeHash: decision.approvalEnvelope.scopeHash
    });
    assert.equal(response.status, 409);
    assert.match((await response.json()).error, /no longer matches/i);
    assert.equal(findDecision(decision.id).status, "stopped");
    assert.equal(writes, 0);
  }, { providerWriteExecutor: executor, connectorPlaybooks: permittedBrowserFixture });
});

test("safety decisions cannot be approved", () => withServer(async (base) => {
  const coached = await (await post(base, "/api/coach", { message: "I have sharp chest pain and feel dizzy." })).json();
  assert.equal(coached.decision.status, "stopped");
  assert.equal((await post(base, "/api/decisions/approve", { id: coached.decision.id })).status, 409);
}));

test("multilingual symptom messages stop before ordinary coaching", () => withServer(async (base) => {
  for (const message of [
    "Имам болка во градите и вртоглавица.",
    "Tengo dolor en el pecho y mareo.",
    "Kam dhimbje në gjoks dhe marramendje."
  ]) {
    const coached = await (await post(base, "/api/coach", { message })).json();
    assert.equal(coached.mode, "deterministic_safety");
    assert.equal(coached.decision.status, "stopped");
    assert.equal(coached.decision.gate.action, "medical_red_flag");
  }
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

test("private companion mode protects athlete APIs with a server-side access key", async () => {
  process.env.STRIDEOS_ACCESS_TOKEN = "test-private-key-123456789";
  try {
    await withServer(async (base) => {
      const access = await (await fetch(`${base}/api/access`)).json();
      assert.equal(access.required, true);
      assert.equal((await fetch(`${base}/api/health`)).status, 200);
      assert.equal((await fetch(`${base}/api/bootstrap`)).status, 401);
      const authorized = await fetch(`${base}/api/bootstrap`, { headers: { authorization: `Bearer ${process.env.STRIDEOS_ACCESS_TOKEN}` } });
      assert.equal(authorized.status, 200);
      assert.equal((await authorized.json()).companion.protected, true);
    });
  } finally { delete process.env.STRIDEOS_ACCESS_TOKEN; }
});

test.after(() => { try { fs.rmSync(stateFile); } catch {} });

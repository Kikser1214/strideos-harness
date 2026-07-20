import test from "node:test";
import assert from "node:assert/strict";
import { buildDecision, buildProviderWriteDecision, buildProviderWriteStateBinding, demoCoachDecision, gateAction, validateProviderWriteApproval, workoutResourceFromDashboard } from "../src/harness.mjs";

const providerStateBinding = buildProviderWriteStateBinding({ athleteState: { version: 1 }, planState: { id: "plan-1", version: 3 } });

test("unknown actions stop by default", () => {
  assert.equal(gateAction("erase_everything").mode, "stop");
});

test("synthetic Garmin-shaped writes still require approval", () => {
  const gate = gateAction("push_garmin_workout");
  assert.equal(gate.allowed, false);
  assert.equal(gate.mode, "confirm");
});

test("attended provider writes stay stopped until the reference runtime has an executor", () => {
  const gate = gateAction("write_provider_session");
  assert.equal(gate.allowed, false);
  assert.equal(gate.mode, "stop");
  assert.match(gate.reason, /reference runtime ships no provider-write executor/i);
  const incomplete = buildDecision({
    evidence: ["Synthetic route"], action: "write_provider_session",
    context: { providerRoutePermitted: true, executorEnabled: true }, proposal: "Write once."
  });
  assert.equal(incomplete.status, "stopped");
  assert.match(incomplete.gate.reason, /approval envelope/i);
});

test("provider-write envelopes bind account, route, target, athlete/plan state, and payload and then expire", () => {
  const now = new Date("2026-07-20T05:00:00.000Z");
  const decision = buildProviderWriteDecision({
    evidence: ["Synthetic permitted route"],
    proposal: "Create one structured workout?",
    providerId: "fixture_web",
    routeId: "fixture_browser",
    accountBinding: "athlete-42",
    capability: "write_workout",
    operation: "create_workout",
    target: "workout:new",
    stateBinding: providerStateBinding,
    payload: { name: "Easy 30", steps: [{ minutes: 30, target: "easy" }] },
    browserContext: { surface: "codex_desktop", attended: true, scheduled: false, headless: false },
    now
  });
  assert.equal(decision.status, "awaiting_approval");
  assert.equal(decision.approvalEnvelope.maxWrites, 1);
  assert.equal(decision.resource.target, "workout:new");
  assert.deepEqual(decision.resource.stateBinding, providerStateBinding);
  assert.deepEqual(validateProviderWriteApproval(decision, {
    approvalNonce: decision.approvalEnvelope.nonce,
    scopeHash: decision.approvalEnvelope.scopeHash,
    now: new Date("2026-07-20T05:01:00.000Z")
  }).resource.payload, decision.resource.payload);

  const changed = structuredClone(decision);
  changed.resource.payload.steps[0].minutes = 45;
  assert.throws(() => validateProviderWriteApproval(changed, {
    approvalNonce: changed.approvalEnvelope.nonce,
    scopeHash: changed.approvalEnvelope.scopeHash,
    now: new Date("2026-07-20T05:01:00.000Z")
  }), /payload changed/i);
  const staleState = structuredClone(decision);
  staleState.resource.stateBinding.planStateVersion = "0".repeat(64);
  assert.throws(() => validateProviderWriteApproval(staleState, {
    approvalNonce: staleState.approvalEnvelope.nonce,
    scopeHash: staleState.approvalEnvelope.scopeHash,
    now: new Date("2026-07-20T05:01:00.000Z")
  }), /payload changed/i);
  assert.throws(() => validateProviderWriteApproval(decision, {
    approvalNonce: decision.approvalEnvelope.nonce,
    scopeHash: decision.approvalEnvelope.scopeHash,
    now: new Date("2026-07-20T05:05:00.000Z")
  }), /expired/i);
});

test("provider-write envelopes reject credentials and unattended contexts", () => {
  const base = {
    evidence: ["Synthetic permitted route"], proposal: "Write once.", providerId: "fixture_web", routeId: "fixture_browser",
    accountBinding: "athlete-42", capability: "write_workout", operation: "create_workout", target: "workout:new", stateBinding: providerStateBinding
  };
  assert.throws(() => buildProviderWriteDecision({
    ...base, payload: { password: "never" }, browserContext: { surface: "codex_desktop", attended: true, scheduled: false, headless: false }
  }), /credentials or session material/i);
  assert.throws(() => buildProviderWriteDecision({
    ...base, payload: { name: "Easy" }, browserContext: { surface: "codex_desktop", attended: false }
  }), /explicit attended/i);
});

test("low-confidence food estimates cannot be logged silently", () => {
  const gate = gateAction("log_food", { confidence: 0.5 });
  assert.equal(gate.allowed, false);
  assert.match(gate.reason, /confidence threshold/i);
});

test("coach demo returns an auditable decision", () => {
  const decision = demoCoachDecision("What should I run today?");
  assert.equal(decision.status, "awaiting_approval");
  assert.ok(decision.evidence.length >= 3);
  assert.equal(decision.gate.action, "push_garmin_workout");
  assert.equal(decision.resource.type, "workout");
  assert.equal(decision.resource.workout.source, "synthetic_judge_fixture");
});

test("personal Garmin resources are built only from an exact scheduled plan session", () => {
  const dashboard = {
    today: {
      state: "scheduled",
      date: "2026-07-20",
      sessions: [{ id: "w1_run_1", type: "run_walk", title: "Comfortable run / walk", durationMinutes: 25, intensity: { rpe: "2-4", talkTest: "Full sentences." }, steps: [{ name: "Warm-up", minutes: 5 }] }]
    }
  };
  const resource = workoutResourceFromDashboard(dashboard, "Mia");
  assert.equal(resource.athleteId, "Mia");
  assert.equal(resource.workout.planId, null);
  assert.equal(resource.workout.sessionId, "w1_run_1");
  assert.equal(resource.workout.durationMinutes, 25);
  assert.equal(resource.workout.distanceKm, undefined);
  assert.equal(workoutResourceFromDashboard({ today: { state: "upcoming", sessions: dashboard.today.sessions } }, "Mia"), null);
});

test("a personal Garmin proposal requires explicit delivery support", () => {
  const dashboard = {
    plan: { label: "Active test plan" }, recovery: { status: "normal", pain: null }, sources: { status: "fresh" },
    today: {
      state: "scheduled", date: "2026-07-20",
      sessions: [{ id: "run_1", type: "easy_run", title: "Easy run", durationMinutes: 30, intensity: { rpe: "2-4" }, steps: [] }]
    }
  };
  assert.equal(demoCoachDecision("Run today", dashboard).gate.action, "read_training_data");
  assert.equal(demoCoachDecision("Run today", { ...dashboard, connector: { workoutDeliverySupported: false } }).gate.action, "read_training_data");
  assert.equal(demoCoachDecision("Run today", { ...dashboard, connector: { workoutDeliverySupported: true } }).gate.action, "push_garmin_workout");
});

test("possible medical red flags stop the normal action path", () => {
  const decision = demoCoachDecision("I feel dizzy and have sharp chest pain.");
  assert.equal(decision.status, "stopped");
  assert.equal(decision.gate.action, "medical_red_flag");
});

test("autonomous reads complete without an approval", () => {
  const decision = buildDecision({
    evidence: ["Selected browser_read evidence with source and freshness"],
    action: "read_training_data",
    proposal: "Training data refreshed."
  });
  assert.equal(decision.status, "completed");
});

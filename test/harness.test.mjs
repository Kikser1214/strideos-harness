import test from "node:test";
import assert from "node:assert/strict";
import { buildDecision, demoCoachDecision, gateAction, workoutResourceFromDashboard } from "../src/harness.mjs";

test("unknown actions stop by default", () => {
  assert.equal(gateAction("erase_everything").mode, "stop");
});

test("external Garmin writes require approval", () => {
  const gate = gateAction("push_garmin_workout");
  assert.equal(gate.allowed, false);
  assert.equal(gate.mode, "confirm");
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

test("possible medical red flags stop the normal action path", () => {
  const decision = demoCoachDecision("I feel dizzy and have sharp chest pain.");
  assert.equal(decision.status, "stopped");
  assert.equal(decision.gate.action, "medical_red_flag");
});

test("autonomous reads complete without an approval", () => {
  const decision = buildDecision({
    evidence: ["Authorized Garmin connection"],
    action: "read_training_data",
    proposal: "Training data refreshed."
  });
  assert.equal(decision.status, "completed");
});

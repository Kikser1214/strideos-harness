import test from "node:test";
import assert from "node:assert/strict";
import { pushWorkout } from "../src/garmin.mjs";

function decision(resource = null) {
  return { id: "decision_personal", resource };
}

const resource = {
  type: "workout",
  athleteId: "Mia",
  workout: { source: "approved_training_plan", sessionId: "w1_run_1", name: "Comfortable run / walk", sport: "running", durationMinutes: 25 }
};

test("Garmin writes reject decisions without an exact workout resource", async () => {
  await assert.rejects(() => pushWorkout({ decision: decision() }), /server-authored workout/i);
});

test("the optional runtime delegates a real Garmin write when it has no bundled executor", async () => {
  await assert.rejects(() => pushWorkout({ decision: decision(resource) }), /reference runtime has no live Garmin workout-write executor/i);
});

test("synthetic judge workouts always stay simulated", async () => {
  const result = await pushWorkout({ decision: decision({ ...resource, athleteId: "demo-alex", workout: { ...resource.workout, source: "synthetic_judge_fixture" } }) });
  assert.equal(result.simulated, true);
  assert.equal(result.performed, false);
  assert.match(result.message, /always simulated/i);
});

import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
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
  delete process.env.GARMIN_BRIDGE_URL;
  await assert.rejects(() => pushWorkout({ decision: decision() }), /server-authored workout/i);
});

test("simulation records approval without calling an external bridge", async () => {
  delete process.env.GARMIN_BRIDGE_URL;
  const result = await pushWorkout({ decision: decision(resource) });
  assert.equal(result.simulated, true);
  assert.equal(result.performed, false);
});

test("synthetic judge workouts stay simulated even when a bridge is configured", async () => {
  process.env.GARMIN_BRIDGE_URL = "http://127.0.0.1:1/should-never-be-called";
  try {
    const result = await pushWorkout({ decision: decision({ ...resource, athleteId: "demo-alex", workout: { ...resource.workout, source: "synthetic_judge_fixture" } }) });
    assert.equal(result.simulated, true);
    assert.equal(result.performed, false);
    assert.match(result.message, /always simulated/i);
  } finally {
    delete process.env.GARMIN_BRIDGE_URL;
  }
});

test("configured bridge receives the exact decision-bound workout", async () => {
  let received = null;
  const bridge = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    received = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    res.writeHead(200).end("ok");
  });
  await new Promise((resolve) => bridge.listen(0, "127.0.0.1", resolve));
  process.env.GARMIN_BRIDGE_URL = `http://127.0.0.1:${bridge.address().port}/workouts`;
  try {
    const result = await pushWorkout({ decision: decision(resource) });
    assert.equal(result.performed, true);
    assert.equal(received.athleteId, "Mia");
    assert.equal(received.workout.sessionId, "w1_run_1");
    assert.equal(received.workout.name, "Comfortable run / walk");
    assert.equal(received.workout.distanceKm, undefined);
  } finally {
    delete process.env.GARMIN_BRIDGE_URL;
    await new Promise((resolve) => bridge.close(resolve));
  }
});

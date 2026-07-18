import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { communityBridgeConfig, validateCommunityBridgeConfig, validateWorkoutRequest } from "../src/community-garmin-bridge.mjs";

const workout = {
  source: "approved_training_plan",
  planId: "plan_1",
  sessionId: "session_1",
  name: "Easy aerobic run",
  sport: "running",
  scheduledDate: "2026-07-20",
  durationMinutes: 40
};

test("community bridge accepts only exact approved workout resources", () => {
  assert.equal(validateWorkoutRequest({ decisionId: "decision_1", athleteId: "Alex", workout }), workout);
  assert.throws(() => validateWorkoutRequest({ decisionId: "decision_1", athleteId: "Alex", workout: { ...workout, source: "synthetic_judge_fixture" } }), /approved/i);
  assert.throws(() => validateWorkoutRequest({ decisionId: "decision_1", athleteId: "Alex", workout: { ...workout, scheduledDate: undefined } }), /scheduledDate/i);
});

test("community bridge refuses remote binding and incomplete local setup", () => {
  const config = communityBridgeConfig({
    GARMIN_COMMUNITY_BRIDGE_HOST: "0.0.0.0",
    GARMIN_COMMUNITY_PUSH_SCRIPT: path.join("missing", "garmin_push.py")
  });
  const errors = validateCommunityBridgeConfig(config);
  assert.ok(errors.some((error) => /local-only/i.test(error)));
  assert.ok(errors.some((error) => /does not exist/i.test(error)));
  assert.ok(errors.some((error) => /TOKEN_DIR/i.test(error)));
});

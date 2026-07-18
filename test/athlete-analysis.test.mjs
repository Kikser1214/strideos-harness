import test from "node:test";
import assert from "node:assert/strict";
import { analyzeAthlete, applyModelEnrichment } from "../src/athlete-analysis.mjs";
import { completeProfile } from "./fixtures.mjs";

const now = "2026-07-18T12:00:00.000Z";

function runActivity(activityAt, distanceKm) {
  return { activityAt, distanceKm, sport: "running", name: "Imported run" };
}

test("analysis is deterministic for the same inputs and reference date", () => {
  const input = { profile: completeProfile(), now };
  assert.deepEqual(analyzeAthlete(input), analyzeAthlete(input));
});

test("a new inactive athlete starts as a starter with a non-race window", () => {
  const analysis = analyzeAthlete({ profile: completeProfile(), now });
  assert.equal(analysis.stage.value, "starter");
  assert.equal(analysis.goal.feasibility, "no_race_deadline");
  assert.equal(analysis.availability.room, "workable");
  assert.equal(analysis.recommendationFrame.status, "ready_for_conservative_plan");
  assert.ok(analysis.recommendations.every((item) => item.confidence.label && item.explanation));
});

test("aligned structured evidence produces an established classification", () => {
  const profile = completeProfile({
    baseline: { activityLevel: "structured_training", runningHistory: "competitive", currentWeeklyKm: 42, longestRecentRunKm: 24, lastConsistentTraining: "now", recentBenchmark: "10K in 42:00" },
    goals: { primary: "race_performance", eventDistance: "half_marathon", eventDate: "2026-11-15", timeGoal: "sub 1:35", deadlineFlexibility: "fixed_event" }
  });
  const analysis = analyzeAthlete({ profile, now });
  assert.equal(analysis.stage.value, "established");
  assert.equal(analysis.goal.feasibility, "workable_starting_window");
  assert.equal(analysis.goal.deadlinePressure, "lower");
});

test("a compressed race date is labeled tight instead of promised feasible", () => {
  const profile = completeProfile({
    goals: { primary: "finish_race", eventDistance: "half_marathon", eventDate: "2026-08-15", deadlineFlexibility: "fixed_event" }
  });
  const analysis = analyzeAthlete({ profile, now });
  assert.equal(analysis.goal.feasibility, "tight");
  assert.equal(analysis.goal.deadlinePressure, "high");
  assert.match(analysis.goal.explanation, /compressed/i);
});

test("observed running history stays separate and exposes disagreement", () => {
  const profile = completeProfile({ baseline: { activityLevel: "regular_unstructured", runningHistory: "recreational", currentWeeklyKm: 5 } });
  const imports = [
    runActivity("2026-07-01T06:00:00Z", 10),
    runActivity("2026-07-06T06:00:00Z", 10),
    runActivity("2026-07-12T06:00:00Z", 10),
    runActivity("2026-07-17T06:00:00Z", 10)
  ];
  const analysis = analyzeAthlete({ profile, imports, now });
  assert.equal(analysis.load.basis, "observed_recent_activities");
  assert.equal(analysis.load.declaredWeeklyKm, 5);
  assert.equal(analysis.load.observed28dKm, 40);
  assert.equal(analysis.load.disagreement, true);
});

test("fresh subjective pain and recovery context can hold progression", () => {
  const profile = completeProfile({ schedule: { sleepHours: 5.5, stressLevel: "high", barriers: ["fatigue"] } });
  const checkins = [{ capturedAt: "2026-07-18T07:00:00Z", pain: 5, rpe: 9, energy: 2, sleepFeel: 2 }];
  const analysis = analyzeAthlete({ profile, checkins, now });
  assert.equal(analysis.recovery.status, "progression_hold");
  assert.equal(analysis.recovery.confidence.label, "high");
  assert.ok(analysis.recovery.signals.some((signal) => signal.id === "pain" && signal.severity === "hold"));
});

test("safety and permission rules survive hostile model enrichment", () => {
  const profile = completeProfile({
    safety: { chestPain: true, clearanceStatus: "cleared" },
    delivery: { approvalMode: "read_only" }
  });
  const baseline = analyzeAthlete({ profile, now });
  const enriched = applyModelEnrichment(baseline, {
    summary: "Friendly context",
    stage: { value: "established" },
    recovery: { status: "stable" },
    permissions: { externalWrites: "autonomous" },
    guardrails: { modelCanOverrideSafety: true }
  });
  assert.equal(enriched.stage.value, baseline.stage.value);
  assert.equal(enriched.recovery.status, "safety_stop");
  assert.equal(enriched.permissions.externalWrites, "disabled");
  assert.equal(enriched.guardrails.modelCanOverrideSafety, false);
  assert.deepEqual(enriched.enrichment.ignoredFields.sort(), ["guardrails", "permissions", "recovery", "stage"]);
});

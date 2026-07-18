import test from "node:test";
import assert from "node:assert/strict";
import { analyzeAthlete } from "../src/athlete-analysis.mjs";
import { buildTrainingPlan } from "../src/training-plan.mjs";
import { completeProfile } from "./fixtures.mjs";

const now = "2026-07-18T12:00:00.000Z";

function analyze(profile, checkins = []) {
  return analyzeAthlete({ profile, checkins, now });
}

function sessions(week) {
  return week.days.flatMap((day) => day.sessions);
}

test("starter plan is deterministic and aligns to a Monday", () => {
  const profile = completeProfile();
  const input = { profile, analysis: analyze(profile), startDate: "2026-07-18" };
  const first = buildTrainingPlan(input);
  const second = buildTrainingPlan(input);
  assert.deepEqual(first, second);
  assert.equal(first.startDate, "2026-07-20");
  assert.equal(first.weeks[0].days[0].day, "monday");
  assert.equal(first.weeks[0].days[0].date, "2026-07-20");
});

test("couch-to-active includes run-walk, strength, mobility, rest, and a recovery week", () => {
  const profile = completeProfile();
  const plan = buildTrainingPlan({ profile, analysis: analyze(profile), startDate: "2026-07-20" });
  assert.equal(plan.status, "proposal");
  assert.equal(plan.path, "couch_to_active");
  assert.equal(sessions(plan.weeks[0]).filter((session) => session.type === "run_walk").length, 3);
  assert.equal(sessions(plan.weeks[0]).filter((session) => session.type === "strength").length, 2);
  assert.ok(sessions(plan.weeks[0]).some((session) => session.type === "mobility"));
  assert.ok(sessions(plan.weeks[0]).some((session) => session.type === "rest"));
  assert.equal(plan.weeks[3].recoveryWeek, true);
  assert.ok(plan.weeks[3].activeMinutes < plan.weeks[2].activeMinutes);
});

test("an established race athlete gets only controlled quality plus easy running", () => {
  const profile = completeProfile({
    baseline: { activityLevel: "structured_training", runningHistory: "competitive", currentWeeklyKm: 45, longestRecentRunKm: 24, lastConsistentTraining: "now", recentBenchmark: "10K in 42:00" },
    goals: { primary: "race_performance", eventDistance: "half_marathon", eventDate: "2026-11-15", timeGoal: "sub 1:35", deadlineFlexibility: "fixed_event" },
    preferences: { intensityTolerance: "manageable" },
    schedule: { daysPerWeek: 5, preferredDays: ["monday", "tuesday", "thursday", "saturday", "sunday"], minutesWeekday: 60, minutesWeekend: 100 }
  });
  const plan = buildTrainingPlan({ profile, analysis: analyze(profile), startDate: "2026-07-20" });
  assert.equal(plan.stage, "established");
  assert.equal(sessions(plan.weeks[1]).filter((session) => session.type === "controlled_quality").length, 1);
  assert.ok(sessions(plan.weeks[1]).some((session) => session.type === "long_easy"));
  assert.ok(sessions(plan.weeks[1]).filter((session) => session.type.includes("run") || session.type === "controlled_quality").every((session) => session.intensity.rpe !== "8-10"));
});

test("advanced and regional method names trigger research instead of a universal template", () => {
  const norwegian = completeProfile({ preferences: { trainingStyle: "norwegian_inspired", customStyle: "" } });
  const norwegianPlan = buildTrainingPlan({ profile: norwegian, analysis: analyze(norwegian), startDate: "2026-07-20" });
  assert.equal(norwegianPlan.method.researchRequired, true);
  assert.equal(norwegianPlan.method.selectedBaseline, "run_walk");
  assert.equal(norwegianPlan.weeks.flatMap(sessions).some((session) => session.type === "controlled_quality"), false);

  const regional = completeProfile({ preferences: { trainingStyle: "custom_research", customStyle: "Kenyan training" } });
  const regionalPlan = buildTrainingPlan({ profile: regional, analysis: analyze(regional), startDate: "2026-07-20" });
  assert.match(regionalPlan.method.explanation, /not treated as one universal system/i);
});

test("pain progression holds and safety stops cannot produce an approvable block", () => {
  const profile = completeProfile();
  const painAnalysis = analyze(profile, [{ capturedAt: "2026-07-18T07:00:00Z", pain: 5, rpe: 7, energy: 2, sleepFeel: 2 }]);
  const painPlan = buildTrainingPlan({ profile, analysis: painAnalysis, startDate: "2026-07-20" });
  assert.equal(painPlan.status, "blocked");
  assert.equal(painPlan.approval.status, "not_available");

  const unsafe = completeProfile({ safety: { dizzinessOrFainting: true, clearanceStatus: "cleared" } });
  const unsafePlan = buildTrainingPlan({ profile: unsafe, analysis: analyze(unsafe), startDate: "2026-07-20" });
  assert.equal(unsafePlan.status, "blocked");
  assert.match(unsafePlan.explanation, /safety review/i);
});

test("read-only athletes may inspect but cannot activate a plan", () => {
  const profile = completeProfile({ delivery: { approvalMode: "read_only" } });
  const plan = buildTrainingPlan({ profile, analysis: analyze(profile), startDate: "2026-07-20" });
  assert.equal(plan.status, "proposal");
  assert.equal(plan.approval.status, "disabled");
});

test("missed sessions never create a catch-up stack", () => {
  const profile = completeProfile();
  const plan = buildTrainingPlan({ profile, analysis: analyze(profile), startDate: "2026-07-20" });
  const rules = plan.adaptationRules.map((rule) => `${rule.trigger} ${rule.action}`).join(" ");
  assert.match(rules, /never double/i);
  assert.match(rules, /instead of catching up/i);
});

test("preferred days never exceed the athlete's realistic weekly cap", () => {
  const profile = completeProfile({
    schedule: {
      daysPerWeek: 3,
      preferredDays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
      minutesWeekday: 30,
      minutesWeekend: 45
    }
  });
  const plan = buildTrainingPlan({ profile, analysis: analyze(profile), startDate: "2026-07-20" });
  const primaryDays = plan.weeks[0].days.filter((day) => day.sessions.some((session) => ["run_walk", "easy_run", "long_easy", "controlled_quality", "strength"].includes(session.type)));
  assert.equal(plan.frequency.availableDays, 3);
  assert.ok(primaryDays.length <= 3);
});

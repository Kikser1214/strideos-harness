import test from "node:test";
import assert from "node:assert/strict";
import { analyzeAthlete } from "../src/athlete-analysis.mjs";
import { buildDashboard } from "../src/dashboard.mjs";
import { buildNutritionCompanion } from "../src/nutrition.mjs";
import { buildTrainingPlan } from "../src/training-plan.mjs";
import { completeProfile } from "./fixtures.mjs";

const now = "2026-07-22T06:00:00.000Z";

function fixture(overrides = {}) {
  const profile = completeProfile(overrides);
  const analysis = analyzeAthlete({ profile, now });
  const plan = { ...buildTrainingPlan({ profile, analysis, startDate: "2026-07-20" }), status: "active" };
  const onboarding = { profile, analysis: { data: { primary: { label: "Manual check-ins" } } }, updatedAt: "2026-07-21T10:00:00.000Z", completedAt: "2026-07-18T10:00:00.000Z" };
  const companion = buildNutritionCompanion({ profile, activePlan: plan });
  return { profile, analysis, plan, onboarding, nutrition: { companion, meals: [] } };
}

test("dashboard refuses to substitute demo data before onboarding", () => {
  const dashboard = buildDashboard({ now });
  assert.equal(dashboard.status, "needs_onboarding");
  assert.equal(dashboard.today.title, "Athlete setup needed");
  assert.equal(dashboard.week.observedActivities, 0);
});

test("active plan produces a deterministic today, week, strength, and fuel view", () => {
  const { analysis, plan, onboarding, nutrition } = fixture();
  const input = { onboarding, analysis, activePlan: plan, plans: [plan], nutrition, now };
  const first = buildDashboard(input);
  const second = buildDashboard(input);
  assert.deepEqual(first, second);
  assert.equal(first.plan.status, "active");
  assert.equal(first.week.number, 1);
  assert.equal(first.week.plannedStrength, 2);
  assert.equal(first.today.date, "2026-07-22");
  assert.match(first.today.title, /Technique-first full body/i);
  assert.equal(first.fuel.mode, "loose");
});

test("observed activity is separate from claimed plan completion", () => {
  const { analysis, plan, onboarding, nutrition } = fixture();
  const dashboard = buildDashboard({
    onboarding, analysis, activePlan: plan, plans: [plan], nutrition, now,
    imports: [{ activityAt: "2026-07-21T07:00:00.000Z", distanceKm: 3.2, name: "Morning run", source: "file_gpx" }]
  });
  assert.equal(dashboard.week.observedActivities, 1);
  assert.equal(dashboard.week.observedDistanceKm, 3.2);
  assert.match(dashboard.week.explanation, /does not claim/i);
});

test("manual recovery and source freshness are visible", () => {
  const { analysis, plan, onboarding, nutrition } = fixture();
  const dashboard = buildDashboard({
    onboarding, analysis, activePlan: plan, plans: [plan], nutrition, now,
    checkins: [{ capturedAt: "2026-07-22T05:00:00.000Z", pain: 1, rpe: 4, energy: 4, sleepFeel: 3 }]
  });
  assert.equal(dashboard.recovery.pain, 1);
  assert.equal(dashboard.recovery.freshness.status, "fresh");
  assert.equal(dashboard.sources.status, "fresh");
  assert.equal(dashboard.sources.signals[0].label, "Manual check-in");
});

test("pending and review-required plans are never shown as active workouts", () => {
  const { analysis, plan, onboarding, nutrition } = fixture();
  const pending = { ...plan, status: "awaiting_approval" };
  const pendingDashboard = buildDashboard({ onboarding, analysis, plans: [pending], nutrition, now });
  assert.equal(pendingDashboard.status, "awaiting_approval");
  assert.match(pendingDashboard.today.target, /decision ledger/i);

  const review = { ...plan, status: "review_required" };
  const reviewDashboard = buildDashboard({ onboarding, analysis, plans: [review], nutrition, now });
  assert.equal(reviewDashboard.status, "review_required");
  assert.match(reviewDashboard.today.target, /Review before continuing/i);
});

test("safety stop overrides an otherwise active dashboard", () => {
  const unsafe = fixture({ safety: { chestPain: true, clearanceStatus: "followup_indicated" } });
  const dashboard = buildDashboard({ onboarding: unsafe.onboarding, analysis: unsafe.analysis, activePlan: unsafe.plan, plans: [unsafe.plan], nutrition: unsafe.nutrition, now });
  assert.equal(dashboard.status, "safety_stop");
  assert.equal(dashboard.today.state, "safety_stop");
});

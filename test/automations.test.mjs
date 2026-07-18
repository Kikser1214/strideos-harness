import test from "node:test";
import assert from "node:assert/strict";
import { buildAutomationSetup, normalizeAutomationOverride, runAutomationPreview } from "../src/automations.mjs";
import { completeProfile } from "./fixtures.mjs";

const now = "2026-07-18T18:00:00.000Z";

function dashboard(overrides = {}) {
  return {
    status: "ready",
    date: "2026-07-18",
    today: { state: "scheduled", title: "Easy run", target: "25 minutes at easy RPE", date: "2026-07-18" },
    plan: { label: "Week 1 active" },
    week: { number: 1, plannedMinutes: 140, plannedSessions: 5, plannedStrength: 2, observedActivities: 1, observedDistanceKm: 4.2, explanation: "Observed is separate from completion." },
    recovery: { status: "stable", pain: 1 },
    sources: { status: "fresh" },
    ...overrides
  };
}

test("automation setup is deterministic, timezone-aware, and never claims scheduling", () => {
  const profile = completeProfile({ schedule: { preferredTime: "evening" }, delivery: { briefTime: "07:15", weeklyReviewDay: "sunday", weeklyReviewTime: "18:30" } });
  const first = buildAutomationSetup({ profile, now });
  const second = buildAutomationSetup({ profile, now });
  assert.deepEqual(first, second);
  assert.equal(first.scheduled, false);
  assert.equal(first.timezone, "Europe/Skopje");
  assert.equal(first.tasks.find((item) => item.id === "morning_brief").schedule.rrule, "RRULE:FREQ=DAILY;BYHOUR=7;BYMINUTE=15");
  assert.equal(first.tasks.find((item) => item.id === "weekly_review").schedule.rrule, "RRULE:FREQ=WEEKLY;BYDAY=SU;BYHOUR=18;BYMINUTE=30");
  assert.ok(first.tasks.every((item) => item.scheduleStatus === "proposal_only" && item.permissions.externalWrites === false));
});

test("post-workout reflection is a first-class proposal", () => {
  const setup = buildAutomationSetup({ profile: completeProfile(), now });
  const post = setup.tasks.find((item) => item.id === "post_workout");
  assert.equal(post.enabled, true);
  assert.match(post.prompt, /npm run brief -- --kind post_workout/);
});

test("automation overrides validate time and weekday", () => {
  assert.deepEqual(normalizeAutomationOverride("weekly_review", { enabled: false, time: "19:05", day: "monday" }), { enabled: false, time: "19:05", day: "monday" });
  assert.throws(() => normalizeAutomationOverride("morning_brief", { time: "7pm" }), /HH:MM/);
  assert.throws(() => normalizeAutomationOverride("weekly_review", { day: "funday" }), /valid/);
});

test("morning brief uses dashboard evidence without external actions", () => {
  const result = runAutomationPreview({ id: "morning_brief", dashboard: dashboard(), now });
  assert.equal(result.status, "ready");
  assert.match(result.summary, /Easy run/);
  assert.deepEqual(result.externalActions, []);
});

test("pre-workout does not move an upcoming session onto today", () => {
  const result = runAutomationPreview({ id: "pre_workout", dashboard: dashboard({ today: { state: "upcoming", title: "Easy run", date: "2026-07-20" } }), now });
  assert.equal(result.status, "no_update");
  assert.match(result.summary, /nothing was moved/i);
});

test("post-workout asks for reflection only after an observed activity", () => {
  const none = runAutomationPreview({ id: "post_workout", dashboard: dashboard(), now });
  assert.equal(none.status, "no_update");
  const observed = runAutomationPreview({ id: "post_workout", dashboard: dashboard(), imports: [{ activityAt: "2026-07-18T17:00:00.000Z", name: "Evening run", summary: "4.2 km", source: "file_csv" }], now });
  assert.equal(observed.status, "needs_input");
  assert.equal(observed.questions.length, 4);
  const reflected = runAutomationPreview({ id: "post_workout", dashboard: dashboard(), imports: [{ activityAt: "2026-07-18T17:00:00.000Z", name: "Evening run" }], checkins: [{ capturedAt: "2026-07-18T17:30:00.000Z" }], now });
  assert.equal(reflected.status, "no_update");
});

test("safety stop overrides every scheduled coaching preview", () => {
  for (const id of ["morning_brief", "pre_workout", "post_workout", "weekly_review"]) {
    const result = runAutomationPreview({ id, dashboard: dashboard({ status: "safety_stop" }), now });
    assert.equal(result.status, "safety_stop");
    assert.deepEqual(result.externalActions, []);
  }
});

import test from "node:test";
import assert from "node:assert/strict";
import { buildWorkoutAdjustment, FeedbackError, normalizeWorkoutFeedback, workoutFeedbackCoachPrompt } from "../src/feedback.mjs";

const dashboard = {
  date: "2026-07-22",
  plan: { id: "plan_1", status: "active" },
  today: {
    state: "scheduled", date: "2026-07-22", title: "Run / walk + strength",
    sessions: [
      { id: "run_1", type: "run_walk", title: "Comfortable run / walk", durationMinutes: 30 },
      { id: "strength_1", type: "strength", title: "Technique-first strength", durationMinutes: 20 }
    ]
  }
};

test("workout feedback preserves the exact session and never claims a plan change", () => {
  const feedback = normalizeWorkoutFeedback({
    disposition: "adjust", reasons: ["fatigue", "schedule"], requestedChange: "shorter", pain: 2,
    note: "I only have 25 minutes and my legs are heavy."
  }, dashboard, "2026-07-22T06:15:00.000Z");
  assert.equal(feedback.targetDate, "2026-07-22");
  assert.equal(feedback.planId, "plan_1");
  assert.equal(feedback.session.items.length, 2);
  assert.equal(feedback.session.durationMinutes, 50);
  assert.equal(feedback.requiresSafetyReview, false);
  assert.match(feedback.disclosure, /does not change/i);
  assert.match(workoutFeedbackCoachPrompt(feedback), /separate approval/i);
});

test("pain at four or higher marks the annotation for safety review", () => {
  const feedback = normalizeWorkoutFeedback({ disposition: "skip", reasons: ["pain"], requestedChange: "coach_choose", pain: 4 }, dashboard);
  assert.equal(feedback.requiresSafetyReview, true);
});

test("a missing pain score does not introduce symptom language into the coach prompt", () => {
  const feedback = normalizeWorkoutFeedback({ disposition: "adjust", reasons: ["schedule"], requestedChange: "shorter" }, dashboard);
  assert.doesNotMatch(workoutFeedbackCoachPrompt(feedback), /pain/i);
});

test("feedback rejects vague adjustment notes and missing approved sessions", () => {
  assert.throws(() => normalizeWorkoutFeedback({ disposition: "adjust", requestedChange: "easier" }, dashboard), FeedbackError);
  assert.throws(() => normalizeWorkoutFeedback({ disposition: "keep" }, { today: { sessions: [] } }), /no approved session/i);
});

test("a shorter request creates an exact new block while preserving the source plan", () => {
  const activePlan = {
    id: "plan_1", status: "active", explanation: "Original block.", approval: { status: "required" },
    weeks: [{ week: 1, activeMinutes: 50, days: [{ date: "2026-07-22", sessions: dashboard.today.sessions }]}]
  };
  const feedback = { id: "feedback_1", ...normalizeWorkoutFeedback({ disposition: "adjust", reasons: ["schedule"], requestedChange: "shorter", note: "I have 25 minutes." }, dashboard) };
  const revised = buildWorkoutAdjustment({ activePlan, feedback });
  assert.notEqual(revised.id, activePlan.id);
  assert.equal(revised.adjustment.sourcePlanId, activePlan.id);
  assert.equal(revised.weeks[0].days[0].sessions[0].durationMinutes, 25);
  assert.equal(activePlan.weeks[0].days[0].sessions[0].durationMinutes, 30);
  assert.equal(revised.approval.status, "required");
});

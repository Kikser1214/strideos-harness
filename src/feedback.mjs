import crypto from "node:crypto";

const dispositions = new Set(["keep", "adjust", "move", "skip"]);
const reasons = new Set(["too_hard", "too_easy", "pain", "fatigue", "schedule", "weather", "equipment", "not_enjoyable", "other"]);
const requests = new Set(["none", "coach_choose", "shorter", "easier", "move_day", "swap_session", "cancel"]);

export class FeedbackError extends Error {
  constructor(message, status = 422) {
    super(message);
    this.status = status;
  }
}

function optionalInteger(value, min, max, label) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) throw new FeedbackError(`${label} must be a whole number from ${min} to ${max}.`);
  return number;
}

function clean(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

export function normalizeWorkoutFeedback(input = {}, dashboard = {}, now = new Date()) {
  const today = dashboard.today || {};
  if (!today.date || !Array.isArray(today.sessions) || today.sessions.length === 0) {
    throw new FeedbackError("There is no approved session to annotate right now.", 409);
  }

  const disposition = clean(input.disposition, 24);
  if (!dispositions.has(disposition)) throw new FeedbackError("Choose whether to keep, adjust, move, or skip this session.");
  const selectedReasons = [...new Set((Array.isArray(input.reasons) ? input.reasons : []).map((item) => clean(item, 30)))];
  if (selectedReasons.length > 5 || selectedReasons.some((item) => !reasons.has(item))) throw new FeedbackError("Choose up to five known reasons for the note.");
  const requestedChange = clean(input.requestedChange || "none", 30);
  if (!requests.has(requestedChange)) throw new FeedbackError("Choose a supported next step for the session.");
  const note = clean(input.note, 700);
  if (disposition !== "keep" && selectedReasons.length === 0 && !note) throw new FeedbackError("Add a reason or short note so the coach knows what is off.");

  const capturedAt = new Date(now);
  if (!Number.isFinite(capturedAt.getTime())) throw new FeedbackError("Feedback time is invalid.");
  const pain = optionalInteger(input.pain, 0, 10, "Pain");
  return {
    source: "athlete_workout_annotation",
    capturedAt: capturedAt.toISOString(),
    targetDate: today.date,
    planId: dashboard.plan?.id || null,
    disposition,
    reasons: selectedReasons,
    requestedChange,
    pain,
    note,
    session: {
      state: today.state,
      title: clean(today.title, 180),
      durationMinutes: today.sessions.reduce((sum, session) => sum + (Number(session.durationMinutes) || 0), 0),
      items: today.sessions.map((session) => ({
        id: clean(session.id, 120) || null,
        type: clean(session.type, 60),
        title: clean(session.title, 180),
        durationMinutes: Number(session.durationMinutes) || 0
      }))
    },
    requiresSafetyReview: pain !== null && pain >= 4,
    disclosure: "Saved as athlete evidence. This note does not change, move, or cancel the training plan by itself."
  };
}

export function workoutFeedbackCoachPrompt(feedback) {
  const reasonText = feedback.reasons.length ? feedback.reasons.map((item) => item.replaceAll("_", " ")).join(", ") : "the athlete note";
  const painText = feedback.pain === null ? "" : `Pain was reported as ${feedback.pain}/10.`;
  const requestText = feedback.requestedChange === "none" ? "Recommend the safest practical next step" : `The requested direction is ${feedback.requestedChange.replaceAll("_", " ")}`;
  return `Review my annotation for ${feedback.targetDate}: ${feedback.disposition.replaceAll("_", " ")} because of ${reasonText}. ${feedback.note || "No additional note."} ${painText} ${requestText}. Use the current approved plan and latest evidence, then explain a proposal. Do not change the plan without my separate approval.`.replace(/\s+/g, " ").trim();
}

function chosenAdjustment(feedback) {
  if (feedback.requestedChange !== "coach_choose") return feedback.requestedChange;
  if (feedback.disposition === "move" || feedback.reasons.includes("schedule")) return "move_day";
  if (feedback.disposition === "skip") return "cancel";
  if (feedback.reasons.some((reason) => ["fatigue", "too_hard"].includes(reason))) return "easier";
  if (feedback.reasons.some((reason) => ["weather", "equipment", "not_enjoyable"].includes(reason))) return "swap_session";
  return "shorter";
}

function revisedDuration(session, feedback) {
  const noteMinutes = /\b(\d{1,3})\s*(?:min|minute)/i.exec(feedback.note)?.[1];
  const requested = Number(noteMinutes);
  const current = Number(session.durationMinutes) || 20;
  if (Number.isFinite(requested) && requested >= 10 && requested < current) return requested;
  return Math.max(10, Math.round(current * 0.75));
}

function activeMinutes(week) {
  return week.days.flatMap((day) => day.sessions).reduce((sum, session) => sum + (Number(session.durationMinutes) || 0), 0);
}

export function buildWorkoutAdjustment({ activePlan, feedback } = {}) {
  if (!activePlan?.id || !Array.isArray(activePlan.weeks)) throw new FeedbackError("An active training block is required before proposing a workout revision.", 409);
  if (!feedback?.id || feedback.planId !== activePlan.id) throw new FeedbackError("This note is not attached to the current active block.", 409);
  if (feedback.requiresSafetyReview) throw new FeedbackError("Pain feedback requires a safety review before another training proposal.", 409);
  const adjustment = chosenAdjustment(feedback);
  if (feedback.disposition === "keep" || adjustment === "none") throw new FeedbackError("This note does not request a training-plan change.", 409);

  const plan = structuredClone(activePlan);
  const week = plan.weeks.find((item) => item.days.some((day) => day.date === feedback.targetDate));
  const target = week?.days.find((day) => day.date === feedback.targetDate);
  if (!week || !target) throw new FeedbackError("The annotated session is no longer present in the active block.", 409);
  const originalSessions = structuredClone(target.sessions);
  let explanation;

  if (adjustment === "move_day") {
    const targetIndex = week.days.indexOf(target);
    const destination = week.days.slice(targetIndex + 1).find((day) => day.sessions.every((session) => ["rest", "mobility"].includes(session.type)));
    if (destination) {
      const destinationSessions = structuredClone(destination.sessions);
      destination.sessions = originalSessions.map((session) => ({ ...session, explanation: `${session.explanation} Moved from ${target.date} after the athlete's explicit request.` }));
      target.sessions = destinationSessions;
      explanation = `Move ${feedback.session.title} from ${target.date} to ${destination.date}; keep the original recovery session on ${target.date}.`;
    } else {
      const primary = target.sessions.find((session) => Number(session.durationMinutes) > 0) || target.sessions[0];
      primary.durationMinutes = revisedDuration(primary, feedback);
      primary.explanation = `${primary.explanation} No later recovery day was available in this week, so the safe fallback is a shorter session rather than stacking it.`;
      explanation = `No safe move slot exists in the current week. Shorten ${feedback.session.title} to ${primary.durationMinutes} minutes instead.`;
    }
  } else if (adjustment === "cancel") {
    target.sessions = [{ id: `${feedback.id}_rest`, type: "rest", title: "Athlete-requested recovery day", durationMinutes: 0, intensity: null, steps: [], explanation: "The athlete explicitly requested to skip this session. No catch-up workout is added." }];
    explanation = `Replace ${feedback.session.title} on ${target.date} with recovery and add no catch-up session.`;
  } else if (adjustment === "swap_session") {
    const duration = Math.min(25, Math.max(15, Math.round((feedback.session.durationMinutes || 25) * 0.7)));
    target.sessions = [{ id: `${feedback.id}_swap`, type: "mobility", title: "Easy walk + mobility option", durationMinutes: duration, intensity: { rpe: "1-2", talkTest: "Relaxed throughout." }, steps: [], explanation: "A low-load walk or mobility session replaces the original workout. Stop if symptoms or pain appear; no catch-up is attached." }];
    explanation = `Swap ${feedback.session.title} for ${duration} minutes of optional easy walking and mobility.`;
  } else {
    target.sessions = target.sessions.map((session) => {
      if (!(Number(session.durationMinutes) > 0)) return session;
      if (adjustment === "shorter") {
        const durationMinutes = revisedDuration(session, feedback);
        return {
          ...session, durationMinutes,
          steps: session.type === "run_walk" ? [
            { name: "Warm-up walk", minutes: 5 },
            { name: "Easy run / walk", detail: `Use the existing easy rhythm within the revised ${durationMinutes}-minute total. Stop before strain.` },
            { name: "Cool-down walk", minutes: 5 }
          ] : session.steps,
          explanation: `${session.explanation} Shortened after the athlete's explicit annotation; no removed minutes are made up later.`
        };
      }
      return { ...session, intensity: { ...(session.intensity || {}), rpe: "1-3", talkTest: "Comfortable full sentences; slow down or walk before strain." }, explanation: `${session.explanation} Intensity reduced after the athlete's explicit fatigue or difficulty note.` };
    });
    const primary = target.sessions.find((session) => Number(session.durationMinutes) > 0);
    explanation = adjustment === "shorter"
      ? `Shorten ${feedback.session.title} on ${target.date} to ${primary?.durationMinutes || "a reduced duration"} minutes; do not move the removed work elsewhere.`
      : `Keep the session window on ${target.date}, but lower the target to RPE 1-3 with walking allowed before strain.`;
  }

  for (const item of plan.weeks) if ("activeMinutes" in item) item.activeMinutes = activeMinutes(item);
  plan.id = `plan_adjustment_${crypto.createHash("sha256").update(JSON.stringify({ source: activePlan.id, feedback: feedback.id, adjustment, weeks: plan.weeks })).digest("hex").slice(0, 16)}`;
  plan.status = "proposal";
  delete plan.activatedAt;
  delete plan.supersededAt;
  plan.explanation = `${activePlan.explanation} One athlete-requested session adjustment is proposed; the rest of the approved block is preserved.`;
  plan.adjustment = { sourcePlanId: activePlan.id, feedbackId: feedback.id, type: adjustment, targetDate: feedback.targetDate, explanation };
  plan.approval = { status: "required", explanation: "The annotated workout remains unchanged until this exact revised block is approved." };
  return plan;
}

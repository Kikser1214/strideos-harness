import { freshnessFor } from "./imports.mjs";

export const DASHBOARD_VERSION = "2026-07-18";

const activeSessionTypes = new Set(["run_walk", "easy_run", "long_easy", "controlled_quality", "strength", "cross_training"]);

function asDate(value) {
  const date = value instanceof Date ? new Date(value) : new Date(value || Date.now());
  if (!Number.isFinite(date.getTime())) throw new TypeError("Dashboard now must be a valid date.");
  return date;
}

function day(value) {
  return asDate(value).toISOString().slice(0, 10);
}

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function human(value) {
  return String(value || "").replaceAll("_", " ");
}

function goalView(profile, today) {
  const eventDate = profile.goals?.eventDate || null;
  const eventTime = eventDate ? new Date(`${eventDate}T00:00:00.000Z`).getTime() : NaN;
  const daysRemaining = Number.isFinite(eventTime) ? Math.ceil((eventTime - new Date(`${today}T00:00:00.000Z`).getTime()) / 86_400_000) : null;
  return {
    label: eventDate ? profile.goals?.eventDistance ? `${String(profile.goals.eventDistance).replaceAll("_", " ")} event` : "Event" : "Goal",
    value: eventDate ? daysRemaining >= 0 ? `${daysRemaining} days` : "Date passed" : human(profile.goals?.primary || "not set"),
    eventDate,
    daysRemaining
  };
}

function currentPlanView(activePlan, plans, today) {
  const pending = plans.find((plan) => plan.status === "awaiting_approval") || null;
  const review = plans.find((plan) => plan.status === "review_required") || null;
  if (!activePlan) return {
    status: review ? "review_required" : pending ? "awaiting_approval" : "no_active_plan",
    label: review ? "Plan review required" : pending ? "Plan awaiting approval" : "No active training block",
    activePlan: null,
    pending,
    review,
    currentWeek: null,
    todayPlanDay: null,
    nextPlanDay: null
  };

  if (!Array.isArray(activePlan.weeks) || activePlan.weeks.length === 0) return {
    status: "review_required",
    label: "Plan review required",
    activePlan,
    pending,
    review: review || activePlan,
    currentWeek: null,
    todayPlanDay: null,
    nextPlanDay: null
  };

  const days = activePlan.weeks.flatMap((week) => week.days.map((item) => ({ ...item, week: week.week, recoveryWeek: week.recoveryWeek, weekStartDate: week.startDate })));
  const todayPlanDay = days.find((item) => item.date === today) || null;
  const nextPlanDay = days.find((item) => item.date >= today && item.sessions.some((session) => activeSessionTypes.has(session.type))) || null;
  const currentWeek = activePlan.weeks.find((week) => week.days.some((item) => item.date === today))
    || activePlan.weeks.find((week) => week.startDate >= today)
    || activePlan.weeks.at(-1);
  const status = today < activePlan.startDate ? "upcoming" : today > activePlan.endDate ? "review_due" : "active";
  return {
    status,
    label: status === "upcoming" ? `Block starts ${activePlan.startDate}` : status === "review_due" ? "Block complete — review due" : `Week ${currentWeek.week} active`,
    activePlan,
    pending,
    review,
    currentWeek,
    todayPlanDay,
    nextPlanDay
  };
}

function todayView(planView) {
  if (!planView.activePlan) return {
    state: planView.status,
    title: planView.label,
    primaryMetric: "—",
    primaryUnit: "",
    target: planView.status === "awaiting_approval" ? "Review the proposal in the decision ledger." : planView.status === "review_required" ? "New evidence paused the block. Review before continuing." : "Create a conservative proposal from the athlete map.",
    sessions: [],
    date: null,
    explanation: "No session is presented as active without an approved training block."
  };
  const plannedDay = planView.todayPlanDay || planView.nextPlanDay;
  if (!plannedDay) return {
    state: "review_due",
    title: "Block review due",
    primaryMetric: "—",
    primaryUnit: "",
    target: "Review the completed block and current evidence before another prescription.",
    sessions: [],
    date: null,
    explanation: "No future active session remains in this block."
  };
  const sessions = plannedDay.sessions;
  const active = sessions.filter((session) => activeSessionTypes.has(session.type));
  const primary = active[0] || sessions[0];
  const exactToday = plannedDay.date === planView.todayPlanDay?.date;
  return {
    state: exactToday ? active.length ? "scheduled" : "recovery" : "upcoming",
    title: active.length ? active.map((session) => session.title).join(" + ") : primary.title,
    primaryMetric: active.length ? String(active.reduce((sum, session) => sum + finite(session.durationMinutes), 0)) : "—",
    primaryUnit: active.length ? "MIN" : "",
    target: active.length ? active.map((session) => session.intensity?.rpe ? `${session.type.replaceAll("_", " ")} · RPE ${session.intensity.rpe}` : session.type.replaceAll("_", " ")).join(" · ") : primary.explanation,
    sessions,
    date: plannedDay.date,
    explanation: exactToday ? plannedDay.sessions.map((session) => session.explanation).join(" ") : `Next active day is ${plannedDay.date}. Nothing is silently moved onto today.`
  };
}

function weekView(planView, imports, today) {
  const week = planView.currentWeek;
  if (!week) return { number: null, recoveryWeek: false, plannedMinutes: 0, plannedSessions: 0, plannedStrength: 0, observedActivities: 0, observedDistanceKm: 0, explanation: "No active week is available." };
  const start = week.days[0].date;
  const end = week.days.at(-1).date;
  const observed = imports.filter((activity) => {
    const activityDay = String(activity.activityAt || "").slice(0, 10);
    return activityDay >= start && activityDay <= end && activityDay <= today;
  });
  const sessions = week.days.flatMap((item) => item.sessions);
  return {
    number: week.week,
    startDate: start,
    endDate: end,
    recoveryWeek: week.recoveryWeek,
    plannedMinutes: sessions.reduce((sum, session) => sum + finite(session.durationMinutes), 0),
    plannedSessions: sessions.filter((session) => activeSessionTypes.has(session.type)).length,
    plannedStrength: sessions.filter((session) => session.type === "strength").length,
    observedActivities: observed.length,
    observedDistanceKm: Number(observed.reduce((sum, activity) => sum + finite(activity.distanceKm), 0).toFixed(1)),
    explanation: "Observed activities are reported separately; StrideOS does not claim they completed a planned session without an explicit match."
  };
}

function sourceView(onboarding, imports, checkins, workoutFeedback, now) {
  const latestActivity = imports[0] || null;
  const latestCheckin = checkins[0] || null;
  const latestFeedback = workoutFeedback[0] || null;
  const signals = [
    latestFeedback ? { id: "workout_feedback", label: "Workout annotation", capturedAt: latestFeedback.capturedAt, freshness: freshnessFor(latestFeedback.capturedAt, now), source: "athlete" } : null,
    latestCheckin ? { id: "subjective", label: "Manual check-in", capturedAt: latestCheckin.capturedAt, freshness: freshnessFor(latestCheckin.capturedAt, now), source: "athlete" } : null,
    latestActivity ? { id: "activity", label: latestActivity.name || "Imported activity", capturedAt: latestActivity.activityAt, freshness: freshnessFor(latestActivity.activityAt, now), source: latestActivity.source } : null,
    { id: "onboarding", label: "Athlete map", capturedAt: onboarding.updatedAt, freshness: freshnessFor(onboarding.updatedAt, now), source: "athlete" }
  ].filter(Boolean);
  const best = signals.find((signal) => signal.freshness.status === "fresh") || signals.find((signal) => signal.freshness.status === "aging") || signals[0];
  return {
    primary: onboarding.analysis?.data?.primary?.label || onboarding.profile.data?.primarySource || "Onboarding",
    status: best?.freshness.status || "unknown",
    signals,
    explanation: latestActivity || latestCheckin || latestFeedback ? "Freshness is visible per signal. Missing wearable data does not become a fake readiness score." : "Onboarding is the only current evidence. Add a manual check-in or activity import to improve today's context."
  };
}

export function buildDashboard({ onboarding = null, analysis = null, activePlan = null, plans = [], imports = [], checkins = [], workoutFeedback = [], nutrition = null, connectors = null, decisions = [], now = new Date() } = {}) {
  const reference = asDate(now);
  const today = day(reference);
  if (!onboarding?.completedAt || !onboarding.profile) return {
    version: DASHBOARD_VERSION,
    generatedAt: reference.toISOString(),
    date: today,
    status: "needs_onboarding",
    headline: "Build the athlete map first",
    explanation: "The dashboard will not substitute synthetic judge data for a real athlete profile.",
    today: { state: "empty", title: "Athlete setup needed", primaryMetric: "—", primaryUnit: "", target: "Complete the first-run questions.", sessions: [], date: null, explanation: "No personal recommendation exists yet." },
    plan: { status: "unavailable", label: "No athlete map" },
    week: { plannedMinutes: 0, plannedSessions: 0, plannedStrength: 0, observedActivities: 0, observedDistanceKm: 0 },
    recovery: { status: "unknown", pain: null, rpe: null, energy: null, sleepFeel: null, explanation: "No subjective check-in yet." },
    fuel: { status: "unavailable", mode: "off", loggedMeals: 0, explanation: "Nutrition support is optional after onboarding." },
    sources: { primary: "none", status: "unknown", signals: [], explanation: "No athlete evidence loaded." },
    goal: { label: "Goal", value: "Not set", eventDate: null, daysRemaining: null },
    connector: connectors?.garmin || null,
    feedback: { latest: null, latestForSession: null, countForSession: 0, explanation: "Complete athlete setup before adding a workout note." },
    pendingDecision: decisions.find((decision) => decision.status === "awaiting_approval") || null
  };

  const profile = onboarding.profile;
  const plan = currentPlanView(activePlan, plans, today);
  const week = weekView(plan, imports, today);
  const latestCheckin = checkins[0] || null;
  const companion = nutrition?.companion || null;
  const loggedMeals = nutrition?.meals?.filter((meal) => meal.status === "logged").length || 0;
  const recovery = {
    status: analysis?.recovery?.status || "unknown",
    pain: latestCheckin?.pain ?? null,
    rpe: latestCheckin?.rpe ?? null,
    energy: latestCheckin?.energy ?? null,
    sleepFeel: latestCheckin?.sleepFeel ?? null,
    capturedAt: latestCheckin?.capturedAt || null,
    freshness: latestCheckin ? freshnessFor(latestCheckin.capturedAt, reference) : { status: "unknown", ageHours: null },
    explanation: analysis?.recovery?.explanation || "Add a manual check-in for current pain, effort, energy, and sleep feel."
  };
  const todayCard = todayView(plan);
  const sessionFeedback = workoutFeedback.filter((item) => item.targetDate === todayCard.date && (!activePlan?.id || !item.planId || item.planId === activePlan.id));
  const latestFeedback = workoutFeedback[0] || null;
  const feedback = {
    latest: latestFeedback,
    latestForSession: sessionFeedback[0] || null,
    countForSession: sessionFeedback.length,
    explanation: sessionFeedback[0]
      ? "The athlete note is fresh evidence. It has not changed, moved, or cancelled the approved session."
      : todayCard.sessions.length ? "Add a note directly to this approved session if the dose, timing, or type does not fit." : "No approved session is available to annotate."
  };
  const status = analysis?.recovery?.safetyBlocked ? "safety_stop" : plan.status === "review_required" ? "review_required" : plan.status === "awaiting_approval" ? "awaiting_approval" : "ready";
  return {
    version: DASHBOARD_VERSION,
    generatedAt: reference.toISOString(),
    date: today,
    status,
    headline: todayCard.title,
    explanation: status === "safety_stop" ? "Safety review overrides the normal dashboard recommendation." : todayCard.explanation,
    today: status === "safety_stop" ? { ...todayCard, state: "safety_stop", title: "Safety review required", primaryMetric: "—", primaryUnit: "", target: "Pause the normal training path and follow the safety guidance." } : todayCard,
    plan: { status: plan.status, label: plan.label, id: activePlan?.id || null, startDate: activePlan?.startDate || null, endDate: activePlan?.endDate || null },
    week,
    recovery,
    fuel: {
      status: companion?.status || "off",
      mode: companion?.effectiveMode || "off",
      loggedMeals,
      numberFree: companion?.numberPolicy?.numberFree ?? true,
      explanation: companion?.status === "off" || !companion ? "Nutrition support is off and training continues without food logging." : companion.numberPolicy.explanation
    },
    sources: sourceView(onboarding, imports, checkins, workoutFeedback, reference),
    goal: goalView(profile, today),
    connector: connectors?.garmin || null,
    feedback,
    pendingDecision: decisions.find((decision) => decision.status === "awaiting_approval") || null
  };
}

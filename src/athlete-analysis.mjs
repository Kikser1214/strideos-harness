export const ATHLETE_ANALYSIS_VERSION = "2026-07-18";

const DAY_MS = 86_400_000;
const raceGoals = new Set(["finish_race", "race_performance", "trail"]);
const safetyFields = [
  ["currentPain", "Pain that changes movement was reported in onboarding."],
  ["chestPain", "Chest discomfort was reported in onboarding."],
  ["dizzinessOrFainting", "Dizziness or fainting was reported in onboarding."],
  ["unusualBreathlessness", "Unusual breathlessness was reported in onboarding."],
  ["recentInjuryOrSurgery", "A recent injury or surgery was reported in onboarding."],
  ["knownCondition", "A condition that may affect exercise was reported in onboarding."],
  ["medicationConsideration", "A medication consideration was reported in onboarding."]
];
const hardSafetyFields = new Set(["chestPain", "dizzinessOrFainting", "unusualBreathlessness"]);

const planningHorizonWeeks = {
  "5k": { starter: 10, returning: 8, building: 6, established: 4 },
  "10k": { starter: 14, returning: 10, building: 8, established: 6 },
  half_marathon: { starter: 24, returning: 16, building: 12, established: 10 },
  marathon: { starter: 32, returning: 24, building: 20, established: 16 }
};

function finiteNumber(value, fallback = null) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function rounded(value, digits = 1) {
  return Number(Number(value).toFixed(digits));
}

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function confidenceLabel(score) {
  if (score >= 0.75) return "high";
  if (score >= 0.5) return "medium";
  return "low";
}

function confidence(score, explanation) {
  const normalized = rounded(clamp(score), 2);
  return { score: normalized, label: confidenceLabel(normalized), explanation };
}

function validDate(value) {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function analysisClock(now) {
  const date = validDate(now || new Date());
  if (!date) throw new TypeError("Athlete analysis needs a valid reference date.");
  return { date, iso: date.toISOString(), day: date.toISOString().slice(0, 10) };
}

function activeSafetySignals(profile) {
  return safetyFields.filter(([field]) => profile.safety?.[field] === true).map(([, explanation]) => explanation);
}

function hasHardSafetySignal(profile) {
  return safetyFields.some(([field]) => hardSafetyFields.has(field) && profile.safety?.[field] === true);
}

function stageAnalysis(profile) {
  const activity = profile.baseline?.activityLevel;
  const history = profile.baseline?.runningHistory;
  const weeklyKm = Math.max(0, finiteNumber(profile.baseline?.currentWeeklyKm, 0));
  const lastConsistent = profile.baseline?.lastConsistentTraining;
  let value;
  let score;
  const reasons = [];

  if (["never", "new"].includes(history)) {
    value = "starter";
    score = 0.9;
    reasons.push(history === "never" ? "No prior running history was reported." : "Running is still new for this athlete.");
  } else if (history === "returning" || (["under_3_months", "3_to_12_months", "over_1_year"].includes(lastConsistent) && activity !== "structured_training")) {
    value = "returning";
    score = 0.88;
    reasons.push("Previous running experience exists, but current consistency is being rebuilt.");
  } else if (["structured", "competitive"].includes(history) && activity === "structured_training" && weeklyKm >= 20) {
    value = "established";
    score = 0.82;
    reasons.push("Structured running history, current structured training, and a meaningful weekly baseline agree.");
  } else if (["mostly_inactive", "some_walking"].includes(activity) && weeklyKm === 0) {
    value = history && !["never", "new"].includes(history) ? "returning" : "starter";
    score = 0.78;
    reasons.push(value === "returning" ? "Past experience exists, while the current running baseline is zero." : "Current movement and running load are both at a starting level.");
  } else {
    value = "building";
    score = 0.72;
    reasons.push("The athlete has some current capacity, without enough aligned evidence for the established classification.");
  }

  if (weeklyKm > 0) reasons.push(`Declared running volume is ${rounded(weeklyKm, 1)} km per week.`);
  return {
    value,
    reasons,
    confidence: confidence(score, `Classification uses declared activity, running history, consistency, and weekly distance. ${reasons[0]}`),
    explanation: `${value[0].toUpperCase()}${value.slice(1)} is a planning starting point, not a fitness test or diagnosis.`
  };
}

function goalAnalysis(profile, stage, clock) {
  const primary = profile.goals?.primary || "other";
  const distance = profile.goals?.eventDistance || null;
  const eventDate = validDate(profile.goals?.eventDate);
  const raceSpecific = raceGoals.has(primary);
  const common = { primary, distance, eventDate: eventDate?.toISOString().slice(0, 10) || null, planningHeuristic: true };

  if (!raceSpecific) {
    return {
      ...common,
      feasibility: "no_race_deadline",
      deadlinePressure: "none",
      daysRemaining: null,
      minimumPlanningWeeks: null,
      confidence: confidence(0.9, "The selected goal does not require a race deadline."),
      explanation: "Build a repeatable training habit first and review progress in short blocks; no race deadline is driving the load."
    };
  }

  if (!distance || !eventDate) {
    return {
      ...common,
      feasibility: "needs_event_details",
      deadlinePressure: "unknown",
      daysRemaining: null,
      minimumPlanningWeeks: null,
      confidence: confidence(0.45, "A race goal is selected, but event distance or date is missing."),
      explanation: "StrideOS can start a general base, but it cannot judge deadline pressure until both distance and event date are known."
    };
  }

  const daysRemaining = Math.ceil((eventDate.getTime() - clock.date.getTime()) / DAY_MS);
  if (daysRemaining < 0) {
    return {
      ...common,
      feasibility: "past_deadline",
      deadlinePressure: "past",
      daysRemaining,
      minimumPlanningWeeks: null,
      confidence: confidence(0.98, "The event date is earlier than the analysis date."),
      explanation: "The saved event date has passed. Confirm a new target before creating a race-specific plan."
    };
  }

  if (["ultra", "trail", "other"].includes(distance)) {
    return {
      ...common,
      feasibility: "specific_review_needed",
      deadlinePressure: daysRemaining < 84 ? "high" : "review",
      daysRemaining,
      minimumPlanningWeeks: null,
      confidence: confidence(0.55, "Distance, terrain, elevation, support, and experience need event-specific review."),
      explanation: "This event cannot be judged from distance name and date alone. Research the course and athlete-specific demands before setting progression."
    };
  }

  const minimumWeeks = planningHorizonWeeks[distance]?.[stage] || null;
  const availableWeeks = daysRemaining / 7;
  const ratio = minimumWeeks ? availableWeeks / minimumWeeks : 0;
  const feasibility = ratio < 0.75 ? "tight" : ratio < 1 ? "review_needed" : "workable_starting_window";
  const deadlinePressure = ratio < 0.75 ? "high" : ratio < 1.25 ? "moderate" : "lower";
  const hasPerformanceEvidence = Boolean(profile.baseline?.recentBenchmark) || !profile.goals?.timeGoal;
  const score = hasPerformanceEvidence ? 0.72 : 0.58;
  return {
    ...common,
    feasibility,
    deadlinePressure,
    daysRemaining,
    availableWeeks: rounded(availableWeeks, 1),
    minimumPlanningWeeks: minimumWeeks,
    confidence: confidence(score, `${daysRemaining} days remain. The comparison uses a conservative planning horizon for a ${stage} athlete${hasPerformanceEvidence ? "." : ", but a time goal has no recent benchmark."}`),
    explanation: feasibility === "workable_starting_window"
      ? "There is room to begin a progressive plan, but this is not a finish-time or injury-free guarantee."
      : "The current deadline is compressed for the declared starting point. Protect safety and consistency, and be ready to revise the event goal."
  };
}

function isRunningActivity(activity) {
  const description = `${activity?.sport || ""} ${activity?.name || ""} ${activity?.fileName || ""}`.toLowerCase();
  return /run|running|jog|trail/.test(description);
}

function loadAnalysis(profile, imports, clock) {
  const declaredWeeklyKm = Math.max(0, finiteNumber(profile.baseline?.currentWeeklyKm, 0));
  const datedRuns = imports
    .filter((activity) => isRunningActivity(activity) && finiteNumber(activity.distanceKm) !== null && validDate(activity.activityAt))
    .map((activity) => ({ ...activity, timestamp: new Date(activity.activityAt).getTime(), distance: Math.max(0, Number(activity.distanceKm)) }))
    .filter((activity) => activity.timestamp <= clock.date.getTime())
    .sort((a, b) => b.timestamp - a.timestamp);
  const cutoff7 = clock.date.getTime() - (7 * DAY_MS);
  const cutoff28 = clock.date.getTime() - (28 * DAY_MS);
  const runs7 = datedRuns.filter((activity) => activity.timestamp >= cutoff7);
  const runs28 = datedRuns.filter((activity) => activity.timestamp >= cutoff28);
  const observed7dKm = rounded(runs7.reduce((sum, activity) => sum + activity.distance, 0), 1);
  const observed28dKm = rounded(runs28.reduce((sum, activity) => sum + activity.distance, 0), 1);
  const oldest = runs28.at(-1)?.timestamp;
  const newest = runs28[0]?.timestamp;
  const coverageDays = oldest && newest ? Math.max(1, Math.ceil((newest - oldest) / DAY_MS) + 1) : runs28.length ? 1 : 0;
  const observedWeeklyKm = observed28dKm ? rounded(observed28dKm / Math.max(1, Math.min(4, coverageDays / 7)), 1) : 0;
  const observedBasis = runs28.length >= 3 && coverageDays >= 14;
  const basis = observedBasis ? "observed_recent_activities" : "declared_onboarding";
  const planningWeeklyKm = observedBasis ? observedWeeklyKm : declaredWeeklyKm;
  const disagreement = observedBasis && Math.abs(observedWeeklyKm - declaredWeeklyKm) >= 5 && Math.abs(observedWeeklyKm - declaredWeeklyKm) / Math.max(1, declaredWeeklyKm) > 0.5;
  const band = planningWeeklyKm === 0 ? "none" : planningWeeklyKm < 10 ? "light" : planningWeeklyKm < 30 ? "moderate" : "high";
  const score = observedBasis ? (disagreement ? 0.68 : 0.88) : declaredWeeklyKm > 0 || profile.baseline?.runningHistory ? 0.62 : 0.4;
  const excludedActivities = imports.filter((activity) => !isRunningActivity(activity)).length;

  return {
    basis,
    band,
    planningWeeklyKm: rounded(planningWeeklyKm, 1),
    declaredWeeklyKm: rounded(declaredWeeklyKm, 1),
    observed7dKm,
    observed28dKm,
    observedWeeklyKm,
    recentRunCount: runs28.length,
    coverageDays,
    excludedActivities,
    disagreement,
    confidence: confidence(score, observedBasis
      ? `${runs28.length} running activities across ${coverageDays} days support the observed load${disagreement ? ", but they disagree with the onboarding estimate." : "."}`
      : "Recent imported history is incomplete, so the onboarding estimate remains the planning baseline."),
    explanation: `${band[0].toUpperCase()}${band.slice(1)} is a descriptive planning band, not a risk score. Declared and observed values stay separate so a partial export is not treated as complete history.`
  };
}

function availabilityAnalysis(profile) {
  const daysPerWeek = Math.max(1, Math.min(7, finiteNumber(profile.schedule?.daysPerWeek, 3)));
  const preferredDays = Array.isArray(profile.schedule?.preferredDays) ? profile.schedule.preferredDays : [];
  const selectedWeekend = preferredDays.filter((day) => ["saturday", "sunday"].includes(day)).length;
  const selectedWeekday = Math.max(0, preferredDays.length - selectedWeekend);
  const selectionMatches = preferredDays.length === daysPerWeek;
  let weekendSessions;
  if (preferredDays.length) weekendSessions = Math.min(2, Math.round(daysPerWeek * (selectedWeekend / preferredDays.length)));
  else weekendSessions = Math.min(1, daysPerWeek);
  const weekdaySessions = daysPerWeek - weekendSessions;
  const weekdayMinutes = Math.max(0, finiteNumber(profile.schedule?.minutesWeekday, 0));
  const weekendMinutes = Math.max(0, finiteNumber(profile.schedule?.minutesWeekend, weekdayMinutes));
  const estimatedWeeklyMinutes = Math.round((weekdaySessions * weekdayMinutes) + (weekendSessions * weekendMinutes));
  const room = daysPerWeek <= 2 || estimatedWeeklyMinutes < 90 ? "limited" : daysPerWeek >= 5 && estimatedWeeklyMinutes >= 240 ? "flexible" : "workable";
  const score = selectionMatches ? 0.86 : preferredDays.length ? 0.66 : 0.55;

  return {
    daysPerWeek,
    preferredDays,
    weekdaySessions,
    weekendSessions,
    estimatedWeeklyMinutes,
    room,
    selectionMatches,
    confidence: confidence(score, selectionMatches
      ? "Realistic training days and selected days agree, so the time envelope is clear."
      : "The declared number of days and selected preferred days do not fully agree; the estimate uses the declared number."),
    explanation: `${room[0].toUpperCase()}${room.slice(1)} describes scheduling room only. The plan engine must still reserve recovery and fit both running and strength into this envelope.`
  };
}

function latestCheckin(checkins, clock) {
  return checkins
    .map((checkin) => ({ ...checkin, timestamp: validDate(checkin.capturedAt)?.getTime() }))
    .filter((checkin) => Number.isFinite(checkin.timestamp) && checkin.timestamp <= clock.date.getTime())
    .sort((a, b) => b.timestamp - a.timestamp)[0] || null;
}

function recoveryAnalysis(profile, checkins, clock) {
  const onboardingSafety = activeSafetySignals(profile);
  const clearance = profile.safety?.clearanceStatus;
  const safetyBlocked = hasHardSafetySignal(profile) || (onboardingSafety.length > 0 && clearance !== "cleared");
  const checkin = latestCheckin(checkins, clock);
  const checkinAgeDays = checkin ? rounded((clock.date.getTime() - checkin.timestamp) / DAY_MS, 1) : null;
  const signals = [];

  if (safetyBlocked) signals.push({ id: "safety_review", severity: "stop", explanation: "An onboarding safety signal is active without recorded clearance." });
  if (checkin?.pain >= 4) signals.push({ id: "pain", severity: "hold", explanation: `Latest pain check-in is ${checkin.pain}/10; pause progression and reassess before the next session.` });
  else if (checkin?.pain > 0) signals.push({ id: "pain", severity: "watch", explanation: `Latest pain check-in is ${checkin.pain}/10; keep it visible when choosing today's session.` });
  if (checkin?.energy <= 2) signals.push({ id: "energy", severity: "watch", explanation: `Latest energy check-in is ${checkin.energy}/5.` });
  if (checkin?.sleepFeel <= 2) signals.push({ id: "sleep_feel", severity: "watch", explanation: `Latest sleep-feel check-in is ${checkin.sleepFeel}/5.` });
  if (checkin?.rpe >= 9) signals.push({ id: "effort", severity: "watch", explanation: `Latest reported session effort is ${checkin.rpe}/10.` });
  const sleepHours = finiteNumber(profile.schedule?.sleepHours);
  if (sleepHours !== null && sleepHours < 6.5) signals.push({ id: "sleep_window", severity: "watch", explanation: `Typical sleep is reported as ${sleepHours} hours; use a conservative recovery assumption.` });
  if (["high", "very_high"].includes(profile.schedule?.stressLevel)) signals.push({ id: "life_stress", severity: "watch", explanation: `${profile.schedule.stressLevel.replace("_", " ")} life stress was reported.` });
  if (Array.isArray(profile.schedule?.barriers) && profile.schedule.barriers.includes("fatigue")) signals.push({ id: "fatigue_barrier", severity: "watch", explanation: "Fatigue is a recurring consistency barrier." });

  const status = safetyBlocked ? "safety_stop" : signals.some((signal) => signal.severity === "hold") ? "progression_hold" : signals.length ? "watch" : "stable";
  const score = checkin && checkinAgeDays <= 3 ? 0.9 : checkin ? 0.7 : sleepHours !== null ? 0.6 : 0.46;
  return {
    status,
    safetyBlocked,
    onboardingSafety,
    latestCheckin: checkin ? { capturedAt: checkin.capturedAt, pain: checkin.pain, rpe: checkin.rpe, energy: checkin.energy, sleepFeel: checkin.sleepFeel, ageDays: checkinAgeDays } : null,
    signals,
    confidence: confidence(score, checkin && checkinAgeDays <= 3
      ? "A manual pain, effort, energy, and sleep-feel check-in is available from the last three days."
      : "Recovery confidence is limited without a fresh subjective check-in; schedule answers are used as context."),
    explanation: status === "safety_stop"
      ? "Training prescription stays paused until the recorded safety pathway is resolved."
      : status === "progression_hold"
        ? "Do not progress load from this snapshot. Reassess pain and choose only activity that is already comfortable or professionally cleared."
        : status === "watch"
          ? "Keep intensity and volume flexible until the flagged recovery context improves."
          : "No current recovery constraint is visible in the supplied data; continue collecting subjective feedback."
  };
}

function missingDataAnalysis(profile, imports, checkins, goal, stage, recovery) {
  const blocking = [];
  const important = [];
  const helpful = [];
  if (recovery.safetyBlocked) blocking.push({ id: "safety_review", explanation: "Resolve the active safety review before automated training prescription." });
  if (raceGoals.has(profile.goals?.primary) && (!profile.goals?.eventDistance || !profile.goals?.eventDate)) important.push({ id: "event_details", explanation: "Race distance and date are needed for deadline-aware planning." });
  if (profile.goals?.timeGoal && !profile.baseline?.recentBenchmark) important.push({ id: "performance_benchmark", explanation: "A recent benchmark is needed before judging a time goal." });
  if (profile.data?.historyWindow && profile.data.historyWindow !== "none" && imports.length === 0) important.push({ id: "authorized_history", explanation: "History analysis was requested, but no readable activity history is available yet." });
  if (stage !== "starter" && profile.baseline?.longestRecentRunKm === undefined) helpful.push({ id: "longest_recent_run", explanation: "Recent longest-run context would improve session-duration decisions." });
  if (profile.schedule?.sleepHours === undefined) helpful.push({ id: "sleep_hours", explanation: "Typical sleep duration would improve recovery context." });
  if (profile.data?.manualCheckins === true && checkins.length === 0) helpful.push({ id: "first_checkin", explanation: "A first pain, effort, energy, and sleep-feel check-in would improve today's decision." });
  if (!profile.goals?.timeGoal && !profile.baseline?.recentBenchmark && profile.goals?.primary === "race_performance") helpful.push({ id: "recent_benchmark", explanation: "A race or time trial would improve pace-specific planning." });
  return {
    blocking,
    important,
    helpful,
    status: blocking.length ? "blocked" : important.length ? "important_gaps" : helpful.length ? "helpful_gaps" : "sufficient_to_start",
    explanation: blocking.length
      ? "A blocking item must be resolved before prescription."
      : important.length
        ? "A general starting plan is possible, but the listed gaps limit race- or pace-specific decisions."
        : "The available evidence is enough for a conservative starting recommendation; more data can refine it."
  };
}

function overallConfidence(profile, load, recovery, missing) {
  const critical = [
    profile.baseline?.activityLevel,
    profile.baseline?.runningHistory,
    profile.baseline?.currentWeeklyKm,
    profile.goals?.primary,
    profile.schedule?.daysPerWeek,
    profile.schedule?.stressLevel
  ];
  const coverage = critical.filter((value) => value !== undefined && value !== null && value !== "").length / critical.length;
  let score = 0.35 + (coverage * 0.22);
  if (load.recentRunCount >= 3) score += 0.13;
  if (recovery.latestCheckin?.ageDays <= 3) score += 0.1;
  if (profile.baseline?.recentBenchmark) score += 0.05;
  if (profile.schedule?.sleepHours !== undefined) score += 0.05;
  if (load.disagreement) score -= 0.12;
  score -= Math.min(0.15, missing.important.length * 0.05);
  return confidence(score, `Confidence reflects onboarding coverage, ${load.recentRunCount} recent running activities, ${recovery.latestCheckin ? "a subjective check-in" : "no subjective check-in"}, and ${missing.important.length} important data gap${missing.important.length === 1 ? "" : "s"}.`);
}

function permissionAnalysis(profile) {
  const approvalMode = profile.delivery?.approvalMode || "ask_every_time";
  const readAuthorized = profile.data?.authorizedRead === true;
  const readOnly = approvalMode === "read_only";
  return {
    approvalMode,
    authorizedRead: readAuthorized,
    trainingPlanChanges: readOnly ? "disabled" : "confirm",
    externalWrites: readOnly ? "disabled" : "confirm",
    nutritionLogging: readOnly ? "disabled" : "confirm",
    scheduledTasks: "proposal_only",
    explanation: readOnly
      ? "The athlete selected read-only delivery; analysis may run on authorized sources, but plan changes and writes stay disabled."
      : "Recommendations may be proposed, but plan changes, logs, schedules, and device writes still require confirmation."
  };
}

function recommendationList(stage, goal, load, availability, recovery, missing) {
  return [
    { id: "starting_stage", value: stage.value, confidence: stage.confidence, explanation: stage.explanation },
    { id: "goal_window", value: goal.feasibility, confidence: goal.confidence, explanation: goal.explanation },
    { id: "load_basis", value: load.basis, confidence: load.confidence, explanation: load.explanation },
    { id: "weekly_room", value: availability.room, confidence: availability.confidence, explanation: availability.explanation },
    { id: "recovery_posture", value: recovery.status, confidence: recovery.confidence, explanation: recovery.explanation },
    {
      id: "evidence_next",
      value: missing.status,
      confidence: confidence(missing.blocking.length ? 0.95 : 0.8, "This item is derived directly from missing fields and currently available data."),
      explanation: missing.explanation
    }
  ];
}

export function analyzeAthlete({ profile = {}, imports = [], checkins = [], now } = {}) {
  const clock = analysisClock(now);
  const stage = stageAnalysis(profile);
  const goal = goalAnalysis(profile, stage.value, clock);
  const load = loadAnalysis(profile, Array.isArray(imports) ? imports : [], clock);
  const availability = availabilityAnalysis(profile);
  const recovery = recoveryAnalysis(profile, Array.isArray(checkins) ? checkins : [], clock);
  const missingData = missingDataAnalysis(profile, Array.isArray(imports) ? imports : [], Array.isArray(checkins) ? checkins : [], goal, stage.value, recovery);
  const overall = overallConfidence(profile, load, recovery, missingData);
  const permissions = permissionAnalysis(profile);
  const recommendations = recommendationList(stage, goal, load, availability, recovery, missingData);

  return {
    version: ATHLETE_ANALYSIS_VERSION,
    analysisDate: clock.day,
    stage,
    goal,
    load,
    availability,
    recovery,
    missingData,
    overallConfidence: overall,
    permissions,
    recommendations,
    recommendationFrame: {
      status: recovery.safetyBlocked ? "safety_stop" : missingData.blocking.length ? "blocked" : "ready_for_conservative_plan",
      explanation: recovery.safetyBlocked
        ? "Safety rules pause training prescription regardless of model output."
        : "The plan engine may create a conservative proposal inside the declared time, recovery, data, and approval constraints."
    },
    guardrails: {
      deterministicBaseline: true,
      safetyOverridesRecommendation: true,
      modelCanOverrideSafety: false,
      modelCanChangeStage: false,
      modelCanChangePermissions: false,
      modelEnrichmentAllowed: ["summary", "explanations", "researchNotes"]
    }
  };
}

function safeText(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export function applyModelEnrichment(baseline, enrichment = {}) {
  const safe = {
    summary: safeText(enrichment.summary, 800),
    explanations: Array.isArray(enrichment.explanations)
      ? enrichment.explanations.slice(0, 12).map((item) => safeText(item, 500)).filter(Boolean)
      : [],
    researchNotes: Array.isArray(enrichment.researchNotes)
      ? enrichment.researchNotes.slice(0, 12).map((item) => safeText(item, 500)).filter(Boolean)
      : []
  };
  const allowed = new Set(["summary", "explanations", "researchNotes"]);
  const ignoredFields = Object.keys(enrichment).filter((key) => !allowed.has(key));
  return {
    ...baseline,
    enrichment: {
      ...safe,
      ignoredFields,
      explanation: "Model text is attached as non-authoritative context. Deterministic safety, stage, permissions, and recommendation values are unchanged."
    }
  };
}

import crypto from "node:crypto";

export const TRAINING_PLAN_VERSION = "2026-07-18";

const DAY_MS = 86_400_000;
const dayOrder = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const advancedMethodRequests = new Set(["threshold", "norwegian_inspired", "custom_research"]);

const evidence = [
  {
    id: "nhs_couch_to_5k",
    title: "NHS Couch to 5K",
    url: "https://www.nhs.uk/better-health/get-active/get-running-with-couch-to-5k/couch-to-5k-running-plan/",
    scope: "Supports a comfortable beginner run/walk route with three weekly sessions and recovery between runs."
  },
  {
    id: "hhs_activity_guidelines",
    title: "Physical Activity Guidelines for Americans",
    url: "https://odphp.health.gov/our-work/nutrition-physical-activity/physical-activity-guidelines/current-guidelines/top-10-things-know",
    scope: "Supports starting small, building aerobic activity over time, and including muscle-strengthening work."
  },
  {
    id: "return_to_sport_consensus",
    title: "Bern return-to-sport consensus",
    url: "https://bjsm.bmj.com/content/50/14/853",
    scope: "Supports individualized, graded return decisions rather than a generic post-injury calendar."
  },
  {
    id: "running_session_spikes",
    title: "Running session distance cohort study",
    url: "https://bjsm.bmj.com/content/59/17/1203",
    scope: "Supports avoiding abrupt single-session spikes; it does not make any percentage automatically safe."
  },
  {
    id: "strength_running_economy",
    title: "Strength training and running economy meta-analysis",
    url: "https://pubmed.ncbi.nlm.nih.gov/38165636/",
    scope: "Supports strength as a useful part of runner development while dose and method remain athlete-specific."
  }
];

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function isoWeekStart(value) {
  const date = value instanceof Date ? new Date(value) : new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime())) throw new TypeError("Training plan startDate must be YYYY-MM-DD.");
  const daysUntilMonday = (8 - date.getUTCDay()) % 7;
  return new Date(date.getTime() + (daysUntilMonday * DAY_MS)).toISOString().slice(0, 10);
}

function addDays(date, days) {
  const start = new Date(`${date}T00:00:00.000Z`);
  return new Date(start.getTime() + (days * DAY_MS)).toISOString().slice(0, 10);
}

function human(value) {
  return String(value || "").replaceAll("_", " ");
}

function confidence(label, explanation) {
  const scores = { low: 0.42, medium: 0.66, high: 0.86 };
  return { label, score: scores[label], explanation };
}

function pathFor(profile) {
  const goal = profile.goals?.primary;
  if (goal === "couch_to_active") return "couch_to_active";
  if (goal === "return_to_running") return "return_to_running";
  if (["finish_race", "race_performance", "trail"].includes(goal)) {
    const distance = profile.goals?.eventDistance || "event";
    return `race_${distance}`;
  }
  if (goal === "running_habit") return "running_habit";
  return "general_cardio";
}

function methodFor(profile, analysis) {
  const requested = profile.preferences?.trainingStyle || "recommend_for_me";
  const custom = String(profile.preferences?.customStyle || "").trim();
  const stage = analysis.stage.value;
  const researchRequired = advancedMethodRequests.has(requested) || Boolean(custom);
  let selected;
  if (requested === "recommend_for_me") selected = stage === "starter" ? "run_walk" : stage === "established" ? "polarized_base" : "easy_volume";
  else if (researchRequired) selected = stage === "starter" ? "run_walk" : "easy_volume";
  else selected = requested;
  const culturalLabel = /african|kenyan|ethiopian/i.test(custom);
  return {
    requested,
    custom: custom || null,
    selectedBaseline: selected,
    researchRequired,
    status: researchRequired ? "research_required_before_method_specific_plan" : "baseline_selected",
    explanation: culturalLabel
      ? "The named regional tradition is not treated as one universal system. Research the exact coach, group, population, altitude, volume, and recovery context before adapting it."
      : researchRequired
        ? `The request for ${custom || human(requested)} triggers a suitability research pass. This block uses a conservative baseline until that research is reviewed.`
        : `The ${human(selected)} baseline fits the current ${stage} starting stage and can be revised from feedback.`,
    modelMayOverride: false
  };
}

function frequencyFor(profile, analysis) {
  const stage = analysis.stage.value;
  const available = clamp(Math.round(finite(profile.schedule?.daysPerWeek, 3)), 1, 7);
  const desiredRuns = stage === "starter" ? 3 : stage === "returning" ? 3 : stage === "building" ? 4 : 5;
  const runs = Math.max(1, Math.min(available, desiredRuns));
  const strength = available <= 2 ? 1 : 2;
  return { availableDays: available, runs, strength };
}

function preferredDays(profile, count) {
  const selected = Array.isArray(profile.schedule?.preferredDays) ? profile.schedule.preferredDays.filter((day) => dayOrder.includes(day)) : [];
  const unique = [...new Set(selected)].sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));
  if (unique.length >= count) return unique.slice(0, count);
  for (const day of dayOrder) if (!unique.includes(day)) unique.push(day);
  return unique.slice(0, Math.max(count, unique.length));
}

function spreadSelection(days, count) {
  if (count >= days.length) return days.slice();
  if (count === 1) return [days[0]];
  const indexes = [];
  for (let index = 0; index < count; index += 1) indexes.push(Math.round(index * (days.length - 1) / (count - 1)));
  return [...new Set(indexes.map((index) => days[index]))];
}

function equipmentExercises(profile) {
  const equipment = Array.isArray(profile.strength?.equipment) ? profile.strength.equipment : ["none"];
  const gym = equipment.some((item) => ["dumbbells", "kettlebells", "barbell_rack", "machines", "full_gym"].includes(item));
  if (gym) return ["Squat pattern", "Romanian deadlift or hinge", "Row", "Push", "Calf raise", "Carry or anti-rotation trunk work"];
  return ["Sit-to-stand or squat", "Supported hip hinge", "Incline push-up", "Band or towel row", "Calf raise", "Suitcase carry or dead-bug"];
}

function strengthSession({ profile, week, index, stage, recoveryWeek }) {
  const beginner = ["never", "beginner"].includes(profile.strength?.experience);
  const duration = beginner ? 22 : stage === "established" ? 38 : 30;
  const sets = recoveryWeek ? "1-2 comfortable sets" : beginner ? "1-2 comfortable sets" : "2-3 controlled sets";
  return {
    id: `w${week}_strength_${index + 1}`,
    type: "strength",
    title: beginner ? "Technique-first full body" : "Runner strength",
    durationMinutes: recoveryWeek ? Math.round(duration * 0.8) : duration,
    intensity: { rpe: beginner ? "4-6" : "5-7", rule: "Finish each set with clean technique and repetitions still available." },
    steps: equipmentExercises(profile).map((name) => ({ name, dose: `${sets}; 6-10 controlled reps or 20-40 seconds` })),
    explanation: beginner
      ? "Strength starts with short technique-focused exposures because movement confidence matters more than load."
      : "Strength stays in the block to support general capacity and runner resilience without competing with key running days.",
    modification: profile.strength?.limitations
      ? `Modify or omit anything that conflicts with: ${String(profile.strength.limitations).slice(0, 220)}`
      : "Stop or modify any movement that causes pain or changes normal technique."
  };
}

function runWalkSession({ week, index, recoveryWeek, weekdayMinutes }) {
  const patterns = [
    { run: 1, walk: 2, repeats: 6 },
    { run: 1.5, walk: 2, repeats: 6 },
    { run: 2, walk: 1.5, repeats: 6 },
    { run: 1.5, walk: 2, repeats: 5 }
  ];
  const pattern = patterns[week - 1];
  const computed = Math.round(10 + ((pattern.run + pattern.walk) * pattern.repeats));
  return {
    id: `w${week}_run_${index + 1}`,
    type: "run_walk",
    title: recoveryWeek ? "Recovery run / walk" : "Comfortable run / walk",
    durationMinutes: Math.min(Math.max(20, computed), weekdayMinutes),
    intensity: { rpe: "2-4", talkTest: "Full sentences; slow down before breathing becomes strained." },
    steps: [
      { name: "Warm-up walk", minutes: 5 },
      { name: "Repeat", detail: `${pattern.repeats} × ${pattern.run} min easy run + ${pattern.walk} min walk` },
      { name: "Cool-down walk", minutes: 5 }
    ],
    explanation: "Short run/walk repetitions build consistency without requiring pace knowledge. A recovery day should separate running sessions."
  };
}

function continuousRunSession({ week, index, runCount, stage, profile, analysis, recoveryWeek, allowQuality }) {
  const weekdayMinutes = clamp(finite(profile.schedule?.minutesWeekday, 30), 15, 180);
  const weekendMinutes = clamp(finite(profile.schedule?.minutesWeekend, weekdayMinutes), 20, 240);
  const base = stage === "returning" ? 28 : stage === "building" ? 36 : 45;
  const progression = [1, 1.06, 1.1, 0.85][week - 1];
  const longRun = index === runCount - 1 && runCount >= 3;
  const quality = allowQuality && index === 1 && [2, 3].includes(week) && runCount >= 4;
  const ceiling = longRun ? weekendMinutes : weekdayMinutes;
  const duration = Math.round(Math.min(ceiling, base * progression * (longRun ? 1.35 : 1)));
  if (quality) return {
    id: `w${week}_run_${index + 1}`,
    type: "controlled_quality",
    title: "Controlled aerobic intervals",
    durationMinutes: duration,
    intensity: { rpe: "6", talkTest: "Short phrases during work; fully controlled, never all-out." },
    steps: [
      { name: "Easy warm-up", minutes: 10 },
      { name: "Controlled repetitions", detail: "4-6 × 3 minutes controlled with 2 minutes very easy" },
      { name: "Easy cool-down", minutes: 8 }
    ],
    explanation: "One controlled quality exposure is enough for this week. It is included only for a building or established athlete with no current recovery hold."
  };
  return {
    id: `w${week}_run_${index + 1}`,
    type: longRun ? "long_easy" : "easy_run",
    title: recoveryWeek ? "Reduced easy run" : longRun ? "Long easy run" : "Easy aerobic run",
    durationMinutes: duration,
    intensity: { rpe: "2-4", talkTest: "Full sentences and relaxed form." },
    steps: [
      { name: "Settle in", detail: "Begin easier than expected for 8-10 minutes." },
      { name: "Easy running", detail: "Stay conversational; walking breaks are allowed." },
      { name: "Finish", detail: "Stop with enough energy to repeat the session in a few days." }
    ],
    explanation: longRun
      ? "The longest session develops time-on-feet but remains bounded by the athlete's weekend availability and current evidence."
      : "Easy aerobic work carries most of the block because consistency and recovery are the current priority.",
    evidenceBasis: analysis.load.basis
  };
}

function restSession(week, day) {
  return {
    id: `w${week}_${day}_rest`,
    type: "rest",
    title: "Recovery / normal life",
    durationMinutes: 0,
    intensity: null,
    steps: [],
    explanation: "No catch-up workout is assigned. Normal walking and comfortable daily movement are optional."
  };
}

function mobilitySession(week) {
  return {
    id: `w${week}_mobility`,
    type: "mobility",
    title: "Optional mobility reset",
    durationMinutes: 10,
    intensity: { rpe: "1-2", rule: "Comfortable range only." },
    steps: [
      { name: "Ankles and calves", detail: "Gentle controlled range" },
      { name: "Hips and trunk", detail: "Easy rotations and position changes" }
    ],
    explanation: "This is optional recovery support, not a corrective or medical treatment."
  };
}

function crossTrainingSession(week, profile) {
  const surfaces = Array.isArray(profile.schedule?.surfaces) ? profile.schedule.surfaces : [];
  const mode = surfaces.includes("bike") ? "bike" : surfaces.includes("pool") ? "swim or pool movement" : "brisk walk";
  return {
    id: `w${week}_cross_training`,
    type: "cross_training",
    title: `Optional easy ${mode}`,
    durationMinutes: 25,
    intensity: { rpe: "2-3", talkTest: "Full sentences." },
    steps: [{ name: "Easy continuous movement", detail: "Keep impact and effort lower than a running day." }],
    explanation: "Cross-training is optional variety for general cardio; it never replaces a missed key session automatically."
  };
}

function weekPlan({ week, startDate, profile, analysis, path, method, frequency }) {
  const recoveryWeek = week === 4;
  const available = preferredDays(profile, frequency.availableDays);
  const runDays = spreadSelection(available, frequency.runs);
  const days = dayOrder.map((day, index) => ({ day, date: addDays(startDate, ((week - 1) * 7) + index), sessions: [] }));
  const stage = analysis.stage.value;
  const qualityMethod = ["polarized", "polarized_base", "pace_based", "trail_hills"].includes(method.selectedBaseline);
  const noQuality = !qualityMethod || method.researchRequired || ["watch", "progression_hold", "safety_stop"].includes(analysis.recovery.status) || ["unknown", "avoid_for_now", "recover_poorly"].includes(profile.preferences?.intensityTolerance);
  const runWalk = stage === "starter" || path === "couch_to_active" || method.selectedBaseline === "run_walk";
  const weekdayMinutes = clamp(finite(profile.schedule?.minutesWeekday, 30), 20, 120);

  runDays.forEach((day, index) => {
    const target = days.find((item) => item.day === day);
    target.sessions.push(runWalk
      ? runWalkSession({ week, index, recoveryWeek, weekdayMinutes })
      : continuousRunSession({ week, index, runCount: runDays.length, stage, profile, analysis, recoveryWeek, allowQuality: !noQuality && ["building", "established"].includes(stage) }));
  });

  const strengthTargets = available.filter((day) => !runDays.includes(day)).slice(0, frequency.strength);
  while (strengthTargets.length < frequency.strength) {
    const candidate = runDays.find((day, index) => !strengthTargets.includes(day) && (index < runDays.length - 1 || runDays.length < 3));
    if (!candidate) break;
    strengthTargets.push(candidate);
  }
  strengthTargets.forEach((day, index) => days.find((item) => item.day === day).sessions.push(strengthSession({ profile, week, index, stage, recoveryWeek })));

  if (path === "general_cardio" && week <= 3) {
    const target = days.find((item) => item.sessions.length === 0);
    if (target) target.sessions.push(crossTrainingSession(week, profile));
  }
  const mobilityTarget = days.find((item) => item.sessions.length === 0);
  if (mobilityTarget) mobilityTarget.sessions.push(mobilitySession(week));
  days.forEach((day) => { if (!day.sessions.length) day.sessions.push(restSession(week, day.day)); });
  const activeMinutes = days.flatMap((day) => day.sessions).reduce((sum, session) => sum + session.durationMinutes, 0);
  return {
    week,
    startDate: addDays(startDate, (week - 1) * 7),
    recoveryWeek,
    activeMinutes,
    explanation: recoveryWeek
      ? "Week 4 reduces running and strength volume to absorb the first three weeks and collect feedback before the next block."
      : "Running, strength, optional support, and real recovery days are arranged inside the athlete's selected availability.",
    days
  };
}

function blockedPlan({ profile, analysis, startDate, path, method, reason }) {
  return {
    version: TRAINING_PLAN_VERSION,
    id: `plan_blocked_${startDate}`,
    status: "blocked",
    startDate,
    path,
    method,
    confidence: confidence("high", "The stop is determined by explicit safety or pain rules, not model judgment."),
    explanation: reason,
    weeks: [],
    evidence,
    approval: { status: "not_available", explanation: "A blocked plan cannot be approved." }
  };
}

function stablePlanId(plan) {
  const hash = crypto.createHash("sha256").update(JSON.stringify(plan)).digest("hex").slice(0, 12);
  return `plan_${plan.startDate}_${hash}`;
}

export function buildTrainingPlan({ profile = {}, analysis, startDate } = {}) {
  if (!analysis?.stage?.value || !analysis?.guardrails?.deterministicBaseline) throw new TypeError("Training plan requires a deterministic athlete analysis.");
  const safeStart = isoWeekStart(startDate || analysis.analysisDate);
  const path = pathFor(profile);
  const method = methodFor(profile, analysis);
  if (analysis.recovery.safetyBlocked || analysis.recommendationFrame.status === "safety_stop") {
    return blockedPlan({ profile, analysis, startDate: safeStart, path, method, reason: "Training prescription is paused until the active safety review is resolved." });
  }
  if (analysis.recovery.status === "progression_hold") {
    return blockedPlan({ profile, analysis, startDate: safeStart, path, method, reason: "Current pain feedback holds progression. Reassess before creating a new running or strength block." });
  }

  const frequency = frequencyFor(profile, analysis);
  const weeks = [1, 2, 3, 4].map((week) => weekPlan({ week, startDate: safeStart, profile, analysis, path, method, frequency }));
  const basePlan = {
    version: TRAINING_PLAN_VERSION,
    status: "proposal",
    startDate: safeStart,
    endDate: addDays(safeStart, 27),
    path,
    stage: analysis.stage.value,
    goalFeasibility: analysis.goal.feasibility,
    method,
    frequency,
    confidence: confidence(analysis.overallConfidence.label, `Plan confidence inherits the athlete analysis: ${analysis.overallConfidence.explanation}`),
    explanation: `This four-week ${human(path)} block is a proposal built inside ${frequency.availableDays} realistic training days. It does not promise race readiness or an injury-free outcome.`,
    weeks,
    progressionRules: [
      { id: "feedback_gate", rule: "Progress only when pain, energy, sleep feel, and recent session effort support it.", explanation: "Calendar completion alone does not prove readiness for more load." },
      { id: "single_session", rule: "Avoid an abrupt jump beyond the longest recent comparable session.", explanation: "No fixed percentage is presented as automatically safe." },
      { id: "recovery_week", rule: "Week 4 reduces volume before the next block is proposed.", explanation: "A planned reduction creates space to absorb training and review evidence." }
    ],
    adaptationRules: [
      { trigger: "pain changes movement, chest discomfort, dizziness, fainting, or unusual breathlessness", action: "stop the normal plan path and use the safety review route", authority: "deterministic" },
      { trigger: "pain 1-3/10 without changed movement", action: "remove quality, shorten the session, and request a new check-in", authority: "proposal" },
      { trigger: "very high RPE, low energy, or poor sleep feel", action: "keep effort easy and reduce planned duration by about 20%", authority: "proposal" },
      { trigger: "one missed session", action: "skip it or move it only when recovery spacing remains; never double the next day", authority: "deterministic" },
      { trigger: "two or more missed sessions in a week", action: "repeat or simplify the week instead of catching up", authority: "deterministic" }
    ],
    evidence,
    approval: {
      status: analysis.permissions.trainingPlanChanges === "disabled" ? "disabled" : "required",
      explanation: analysis.permissions.trainingPlanChanges === "disabled"
        ? "The athlete selected read-only delivery, so this preview cannot be activated."
        : "Creating this preview changes nothing. Activating it requires an explicit approval recorded in the decision ledger."
    }
  };
  return { id: stablePlanId(basePlan), ...basePlan };
}

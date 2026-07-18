import fs from "node:fs";

const schemaUrl = new URL("../rules/onboarding-schema.json", import.meta.url);

const connectorCatalog = [
  { id: "garmin", label: "Garmin Connect", route: "bridge", status: "available_with_setup", canRead: true, canWrite: true, note: "Production cloud access needs an approved Garmin integration. Workout writes remain approval-gated." },
  { id: "strava", label: "Strava", route: "oauth", status: "planned", canRead: true, canWrite: false, note: "Useful cross-device activity source; not a complete recovery record." },
  { id: "apple_health", label: "Apple Health / Watch", route: "ios_companion", status: "planned_native_app", canRead: true, canWrite: false, note: "HealthKit access must run through an authorized iOS app, export, or relay such as Strava." },
  { id: "health_connect", label: "Android Health Connect", route: "android_companion", status: "planned_native_app", canRead: true, canWrite: false, note: "Requires an Android app and per-type permissions." },
  { id: "fitbit", label: "Fitbit", route: "oauth", status: "planned", canRead: true, canWrite: false, note: "Planned connector; not active in the first local release." },
  { id: "oura", label: "Oura", route: "oauth", status: "planned", canRead: true, canWrite: false, note: "Planned recovery source; not a full training record by itself." },
  { id: "whoop", label: "WHOOP", route: "oauth", status: "planned", canRead: true, canWrite: false, note: "Planned recovery and workout source." },
  { id: "polar", label: "Polar", route: "oauth", status: "planned", canRead: true, canWrite: false, note: "Planned AccessLink connector." },
  { id: "coros", label: "COROS", route: "partner_or_relay", status: "planned", canRead: true, canWrite: false, note: "May require partner access; Strava or file import is the current fallback." },
  { id: "suunto", label: "Suunto", route: "partner_or_relay", status: "planned", canRead: true, canWrite: false, note: "May require partner access; Strava or file import is the current fallback." },
  { id: "file_import", label: "FIT / GPX / TCX / CSV", route: "local_import", status: "planned", canRead: true, canWrite: false, note: "Point-in-time import that the athlete refreshes." },
  { id: "manual", label: "Manual check-ins", route: "built_in", status: "available", canRead: true, canWrite: false, note: "Pain, effort, energy, sleep feel, schedule, and context remain first-class data." },
  { id: "none", label: "No device", route: "manual", status: "available", canRead: true, canWrite: false, note: "A safe starter plan can use answers and short manual check-ins." }
];

const safetyLabels = {
  currentPain: "pain that changes movement",
  chestPain: "chest discomfort",
  dizzinessOrFainting: "dizziness or fainting",
  unusualBreathlessness: "unusual breathlessness",
  recentInjuryOrSurgery: "recent injury or surgery",
  knownCondition: "a known condition that may affect exercise",
  medicationConsideration: "a medication consideration"
};

export function loadOnboardingSchema() {
  return JSON.parse(fs.readFileSync(schemaUrl, "utf8"));
}

export function listConnectors() {
  return connectorCatalog.map((connector) => ({ ...connector }));
}

function isBlank(value) {
  return value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
}

function fieldValue(profile, sectionId, fieldId) {
  return profile?.[sectionId]?.[fieldId];
}

function normalizeField(field, value) {
  if (value === undefined || value === null) return undefined;
  if (["text", "textarea", "single", "date", "time", "timezone"].includes(field.type)) return String(value).trim();
  if (field.type === "number") {
    if (value === "") return undefined;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : value;
  }
  if (field.type === "boolean") return typeof value === "boolean" ? value : value;
  if (field.type === "multi") return Array.isArray(value) ? [...new Set(value.map((item) => String(item).trim()).filter(Boolean))] : value;
  return value;
}

export function normalizeProfile(input = {}) {
  const schema = loadOnboardingSchema();
  const profile = {};
  for (const section of schema.sections) {
    const source = input?.[section.id];
    if (!source || typeof source !== "object" || Array.isArray(source)) continue;
    const normalized = {};
    for (const field of section.fields) {
      const value = normalizeField(field, source[field.id]);
      if (value !== undefined) normalized[field.id] = value;
    }
    if (Object.keys(normalized).length) profile[section.id] = normalized;
  }
  return profile;
}

export function validateProfile(input = {}, { complete = false } = {}) {
  const schema = loadOnboardingSchema();
  const profile = normalizeProfile(input);
  const errors = [];
  const missing = [];

  for (const section of schema.sections) {
    for (const field of section.fields) {
      const value = fieldValue(profile, section.id, field.id);
      const path = `${section.id}.${field.id}`;
      if (field.required && isBlank(value)) {
        if (complete) missing.push(path);
        continue;
      }
      if (isBlank(value)) continue;
      if (field.type === "boolean" && typeof value !== "boolean") errors.push({ path, message: "Choose yes or no." });
      if (field.type === "number") {
        if (typeof value !== "number" || !Number.isFinite(value)) errors.push({ path, message: "Enter a valid number." });
        else if (field.min !== undefined && value < field.min) errors.push({ path, message: `Minimum is ${field.min}.` });
        else if (field.max !== undefined && value > field.max) errors.push({ path, message: `Maximum is ${field.max}.` });
      }
      if (["text", "textarea", "timezone"].includes(field.type) && field.maxLength && String(value).length > field.maxLength) errors.push({ path, message: `Keep this under ${field.maxLength} characters.` });
      if (field.options && field.type === "single" && !field.options.includes(value)) errors.push({ path, message: "Choose one of the available options." });
      if (field.options && field.type === "multi" && (!Array.isArray(value) || value.some((item) => !field.options.includes(item)))) errors.push({ path, message: "Choose only available options." });
    }
  }

  return { profile, valid: errors.length === 0 && (!complete || missing.length === 0), errors, missing };
}

function completeness(profile) {
  const required = loadOnboardingSchema().sections.flatMap((section) => section.fields.filter((field) => field.required).map((field) => [section.id, field.id]));
  const answered = required.filter(([sectionId, fieldId]) => !isBlank(fieldValue(profile, sectionId, fieldId))).length;
  return { answered, required: required.length, percent: Math.round((answered / required.length) * 100) };
}

function startingStage(profile) {
  const activity = profile.baseline?.activityLevel;
  const history = profile.baseline?.runningHistory;
  const weeklyKm = Number(profile.baseline?.currentWeeklyKm || 0);
  if (["never", "new"].includes(history) || ["mostly_inactive", "some_walking"].includes(activity) || weeklyKm === 0) return "starter";
  if (history === "returning" || profile.baseline?.lastConsistentTraining === "over_1_year") return "returning";
  if (["structured", "competitive"].includes(history) || activity === "structured_training" || weeklyKm >= 35) return "established";
  return "building";
}

function safetyAnalysis(profile) {
  const signals = Object.entries(safetyLabels).filter(([key]) => profile.safety?.[key] === true).map(([, label]) => label);
  const clearance = profile.safety?.clearanceStatus;
  const blocked = signals.length > 0 && clearance !== "cleared";
  return {
    status: blocked ? "review_required" : signals.length ? "cleared_with_context" : "clear",
    blocked,
    signals,
    recommendation: blocked
      ? "Save the profile, pause automated prescription, and complete the official PAR-Q+ follow-up or consult a qualified exercise or health professional before increasing training."
      : "No onboarding safety stop is active. Continue to monitor pain, symptoms, and recovery before each session.",
    parqUrl: "https://eparmedx.com/"
  };
}

function dataAnalysis(profile) {
  const requested = Array.isArray(profile.data?.sources) ? profile.data.sources : [];
  const primaryId = profile.data?.primarySource || requested[0] || "manual";
  const primary = connectorCatalog.find((connector) => connector.id === primaryId) || connectorCatalog.find((connector) => connector.id === "manual");
  const selected = requested.map((id) => connectorCatalog.find((connector) => connector.id === id)).filter(Boolean);
  const activeNow = selected.filter((connector) => ["available", "available_with_setup"].includes(connector.status));
  return {
    primary,
    selected,
    activeNow,
    needsFallback: !["manual", "none"].includes(primary.id) && !["available", "available_with_setup"].includes(primary.status),
    fallback: primary.id === "manual" || primary.id === "none" ? "manual" : "manual_or_file_import",
    note: ["apple_health", "health_connect"].includes(primary.id)
      ? "This source needs a native companion app. Start with manual check-ins, file import, or Strava while that connector is unavailable."
      : primary.note
  };
}

function strengthAnalysis(profile, stage, safety) {
  const experience = profile.strength?.experience || "never";
  const current = Number(profile.strength?.sessionsPerWeek || 0);
  const availableDays = Number(profile.schedule?.daysPerWeek || 3);
  const target = availableDays <= 2 ? 1 : 2;
  if (safety.blocked) return {
    sessionsPerWeek: 0,
    phase: "hold",
    recommendation: "Do not start a new strength prescription until the safety review is resolved. Preserve only activity already cleared for you."
  };
  if (["never", "beginner"].includes(experience)) return {
    sessionsPerWeek: target,
    phase: "technique_first",
    recommendation: target === 1
      ? "Start with one short full-body technique session and build toward two when recovery and schedule allow."
      : "Start with two short, non-consecutive full-body sessions focused on squat, hinge, push, pull, carry, calf, and trunk patterns at comfortable effort."
  };
  if (stage === "established" || ["consistent", "advanced"].includes(experience)) return {
    sessionsPerWeek: Math.max(1, Math.min(2, current || 2)),
    phase: "integrated",
    recommendation: "Keep two strength exposures when recovery allows, reducing volume around key races or unusually hard running blocks rather than removing strength automatically."
  };
  return {
    sessionsPerWeek: Math.max(1, Math.min(2, current || target)),
    phase: "rebuild",
    recommendation: "Rebuild strength with one to two full-body sessions, conservative volume, and movement modifications from your onboarding notes."
  };
}

function trainingAnalysis(profile, stage, safety) {
  const requested = profile.preferences?.trainingStyle || "recommend_for_me";
  let recommended = requested;
  let researchRequired = requested === "custom_research" || Boolean(profile.preferences?.customStyle);
  let note = "The requested approach fits the current starting stage. Reassess after the first two weeks of feedback.";

  if (requested === "recommend_for_me") recommended = stage === "starter" ? "run_walk" : stage === "established" ? "polarized" : "easy_volume";
  if (["threshold", "norwegian_inspired"].includes(requested) && ["starter", "returning"].includes(stage)) {
    recommended = stage === "starter" ? "run_walk" : "easy_volume";
    researchRequired = true;
    note = "Threshold-heavy methods are not the starting default for this profile. Build consistency and tolerance first, then research and reassess the named method.";
  } else if (requested === "recommend_for_me") {
    note = `StrideOS selected ${recommended.replaceAll("_", " ")} as the safest useful starting model for a ${stage} athlete.`;
  }

  const availableDays = Number(profile.schedule?.daysPerWeek || 3);
  const runSessions = stage === "starter" ? Math.min(3, availableDays) : stage === "returning" ? Math.min(4, availableDays) : Math.min(stage === "established" ? 5 : 4, availableDays);
  return {
    requested,
    recommended,
    researchRequired,
    runSessionsPerWeek: safety.blocked ? 0 : Math.max(1, runSessions),
    note: safety.blocked ? "Training prescription is paused until the safety review is resolved." : note
  };
}

function nutritionAnalysis(profile) {
  const mode = profile.nutrition?.numberFreePreferred ? "number_free" : profile.nutrition?.mode || "off";
  if (mode === "off") return { mode, recommendation: "Nutrition coaching stays off. The athlete can enable it later." };
  if (mode === "number_free") return { mode, recommendation: "Use meal rhythm, food variety, hydration, and training-fuel cues without calorie, weight-target, or macro numbers." };
  return { mode, recommendation: "Start with normal meals, hydration, and training context. Treat photo and macro outputs as estimates that require confirmation, and review supplements rather than assuming they are needed." };
}

function automationAnalysis(profile) {
  const proposals = [];
  if (profile.delivery?.morningBrief) proposals.push({ id: "morning_brief", label: "Morning readiness brief", requiresScheduleApproval: true });
  if (profile.delivery?.preWorkoutBrief) proposals.push({ id: "pre_workout", label: "Pre-workout check", requiresScheduleApproval: true });
  if (profile.delivery?.weeklyReview) proposals.push({ id: "weekly_review", label: "Weekly review and plan proposal", requiresScheduleApproval: true });
  return { proposals, scheduled: false, note: "These are proposals only. Test each prompt manually before creating a scheduled task." };
}

export function buildOnboardingAnalysis(input = {}) {
  const profile = normalizeProfile(input);
  const progress = completeness(profile);
  const stage = startingStage(profile);
  const safety = safetyAnalysis(profile);
  const data = dataAnalysis(profile);
  const strength = strengthAnalysis(profile, stage, safety);
  const training = trainingAnalysis(profile, stage, safety);
  const nutrition = nutritionAnalysis(profile);
  const automation = automationAnalysis(profile);

  return {
    schemaVersion: loadOnboardingSchema().version,
    completeness: progress,
    stage,
    safety,
    data,
    strength,
    training,
    nutrition,
    automation,
    dashboardRecommended: profile.delivery?.dashboard !== false,
    summary: safety.blocked
      ? "Profile saved. A safety review is needed before StrideOS creates the initial training week."
      : `${stage[0].toUpperCase()}${stage.slice(1)} profile: ${training.runSessionsPerWeek} running or run/walk sessions and ${strength.sessionsPerWeek} strength session${strength.sessionsPerWeek === 1 ? "" : "s"} per week as the starting frame.`
  };
}

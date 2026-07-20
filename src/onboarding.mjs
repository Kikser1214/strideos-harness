import fs from "node:fs";
import { listConnectors as connectorCatalog } from "./connectors.mjs";
import { analyzeAthlete } from "./athlete-analysis.mjs";

const schemaUrl = new URL("../rules/onboarding-schema.json", import.meta.url);

const safetyLabels = {
  currentPain: "pain that changes movement",
  chestPain: "chest discomfort",
  dizzinessOrFainting: "dizziness or fainting",
  unusualBreathlessness: "unusual breathlessness",
  recentInjuryOrSurgery: "recent injury or surgery",
  knownCondition: "a known condition that may affect exercise",
  medicationConsideration: "a medication consideration"
};
const hardSafetyFields = new Set(["chestPain", "dizzinessOrFainting", "unusualBreathlessness"]);

export function loadOnboardingSchema() {
  return JSON.parse(fs.readFileSync(schemaUrl, "utf8"));
}

export function listConnectors() {
  return connectorCatalog();
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

  if (complete && profile.delivery?.workoutDelivery === true && isBlank(profile.delivery?.workoutDeliveryTarget)) {
    missing.push("delivery.workoutDeliveryTarget");
  }
  if (complete && profile.delivery?.workoutDelivery === true && isBlank(profile.delivery?.connectorSetupMode)) {
    missing.push("delivery.connectorSetupMode");
  }

  return { profile, valid: errors.length === 0 && (!complete || missing.length === 0), errors, missing };
}

function completeness(profile) {
  const required = loadOnboardingSchema().sections.flatMap((section) => section.fields.filter((field) => field.required).map((field) => [section.id, field.id]));
  const answered = required.filter(([sectionId, fieldId]) => !isBlank(fieldValue(profile, sectionId, fieldId))).length;
  return { answered, required: required.length, percent: Math.round((answered / required.length) * 100) };
}

function safetyAnalysis(profile) {
  const active = Object.entries(safetyLabels).filter(([key]) => profile.safety?.[key] === true);
  const signals = active.map(([, label]) => label);
  const clearance = profile.safety?.clearanceStatus;
  const hardStop = active.some(([key]) => hardSafetyFields.has(key));
  const blocked = hardStop || (signals.length > 0 && clearance !== "cleared");
  return {
    status: blocked ? "review_required" : signals.length ? "cleared_with_context" : "clear",
    blocked,
    hardStop,
    signals,
    recommendation: blocked
      ? "Save the profile, pause automated prescription, and complete the official PAR-Q+ follow-up or consult a qualified exercise or health professional before increasing training."
      : "No onboarding safety stop is active. Continue to monitor pain, symptoms, and recovery before each session.",
    parqUrl: "https://eparmedx.com/"
  };
}

function dataAnalysis(profile) {
  const connectors = connectorCatalog();
  const requested = Array.isArray(profile.data?.sources) ? profile.data.sources : [];
  const primaryId = profile.data?.primarySource || requested[0] || "manual";
  const primary = connectors.find((connector) => connector.id === primaryId) || connectors.find((connector) => connector.id === "manual");
  const selected = requested.map((id) => connectors.find((connector) => connector.id === id)).filter(Boolean);
  const activeNow = selected.filter((connector) => connector.canRead && connector.status === "available");
  return {
    primary,
    selected,
    activeNow,
    needsFallback: !["manual", "none"].includes(primary.id) && !(primary.canRead && primary.status === "available"),
    fallback: primary.id === "manual" || primary.id === "none" ? "manual" : "manual_or_file_import",
    note: ["apple_health", "health_connect"].includes(primary.id)
      ? "This source needs an authorized native companion. Start with an official provider export or manual check-ins until that route is ready."
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
    note = stage === "starter"
      ? "StrideOS recommends three separated run-walk-run sessions and two short technique-first strength sessions when schedule and safety allow. Easy running intervals grow gradually while walking intervals shrink only when pain, recovery, and recent effort support it; easy cycling is an optional low-impact alternative when bike access and recovery allow."
      : `StrideOS selected ${recommended.replaceAll("_", " ")} as the safest useful starting model for a ${stage} athlete.`;
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
  const protectedTracking = ["previous_or_current_concern", "clinician_guided"].includes(profile.nutrition?.trackingRelationship) || profile.personal?.ageGroup === "under_18";
  const mode = profile.nutrition?.numberFreePreferred || profile.nutrition?.trackingRelationship === "prefer_no_numbers" || protectedTracking ? "number_free" : profile.nutrition?.mode || "off";
  if (mode === "off") return { mode, recommendation: "Nutrition coaching stays off. The athlete can enable it later." };
  if (mode === "number_free") return { mode, recommendation: "Use meal rhythm, food variety, hydration, and training-fuel cues without calorie, weight-target, or macro numbers. Relevant tracking concerns stay outside automated diet targets." };
  return { mode, recommendation: "Start with normal meals, hydration, and training context. Treat photo and macro outputs as estimates that require confirmation, and review supplements rather than assuming they are needed." };
}

function automationAnalysis(profile) {
  const proposals = [];
  if (profile.delivery?.morningBrief) proposals.push({ id: "morning_brief", label: "Morning readiness brief", requiresScheduleApproval: true });
  if (profile.delivery?.preWorkoutBrief) proposals.push({ id: "pre_workout", label: "Pre-workout check", requiresScheduleApproval: true });
  if (profile.delivery?.postWorkoutReflection) proposals.push({ id: "post_workout", label: "Post-workout reflection", requiresScheduleApproval: true });
  if (profile.delivery?.weeklyReview) proposals.push({ id: "weekly_review", label: "Weekly review and plan proposal", requiresScheduleApproval: true });
  return { proposals, scheduled: false, note: "These are proposals only. Test each prompt manually before creating a scheduled task." };
}

function workoutDeliveryAnalysis(profile) {
  const requested = profile.delivery?.workoutDelivery === true;
  const target = profile.delivery?.workoutDeliveryTarget || null;
  const setupMode = profile.delivery?.connectorSetupMode || "not_now";
  const connectorId = target === "apple_watch" ? "apple_health" : target;
  const connector = connectorCatalog().find((item) => item.id === connectorId) || null;
  const attendedAvailable = connector?.workoutDelivery?.attendedOnly === true;
  return {
    requested,
    target,
    setupMode,
    agentMayGuide: setupMode !== "not_now",
    agentMayPerformLocalSetup: setupMode === "allow_local_setup_after_review",
    connector,
    canPushNow: false,
    approval: requested ? "Every exact workout write still requires its own approval." : "Workout delivery is off.",
    note: !requested
      ? "Keep workouts inside StrideOS until the athlete enables device delivery."
      : !connector
        ? "Research the selected provider's official routes or use a capability the athlete explicitly selects on the current host; do not claim that StrideOS bundles device delivery."
        : attendedAvailable
          ? "The current host may offer an attended provider session. The user signs in; the agent may act only after a dry-run preview and one exact write approval."
          : connector.workoutDelivery?.supportedHere === false
            ? "This catalog has no official self-service workout-write recommendation. A user-selected host capability remains outside the catalog; otherwise keep the structured workout local and use a manual destination workflow."
            : "Guide the athlete through an official individual route. Setup permission does not authorize credentials, account changes, or workout writes."
  };
}

export function buildOnboardingAnalysis(input = {}, { imports = [], checkins = [], now } = {}) {
  const profile = normalizeProfile(input);
  const progress = completeness(profile);
  const athlete = analyzeAthlete({ profile, imports, checkins, now });
  const stage = athlete.stage.value;
  const safety = safetyAnalysis(profile);
  const data = dataAnalysis(profile);
  const strength = strengthAnalysis(profile, stage, safety);
  const training = trainingAnalysis(profile, stage, safety);
  const nutrition = nutritionAnalysis(profile);
  const automation = automationAnalysis(profile);
  const workoutDelivery = workoutDeliveryAnalysis(profile);

  return {
    schemaVersion: loadOnboardingSchema().version,
    completeness: progress,
    stage,
    athlete,
    safety,
    data,
    strength,
    training,
    nutrition,
    automation,
    workoutDelivery,
    dashboardRecommended: profile.delivery?.dashboard !== false,
    summary: safety.blocked
      ? "Profile saved. A safety review is needed before StrideOS creates the initial training week."
      : `${stage[0].toUpperCase()}${stage.slice(1)} profile: ${training.runSessionsPerWeek} running or run/walk sessions and ${strength.sessionsPerWeek} strength session${strength.sessionsPerWeek === 1 ? "" : "s"} per week as the starting frame.`
  };
}

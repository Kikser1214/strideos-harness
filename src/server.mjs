import "./env.mjs";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { garminStatus, pushWorkout } from "./garmin.mjs";
import { analyzeMeal, coach } from "./openai.mjs";
import { buildDecision, buildProviderWriteStateBinding, demoCoachDecision, loadPolicy, messageHasSafetySignal, providerWritePayloadHash, validateProviderWriteApproval, workoutResourceFromDashboard } from "./harness.mjs";
import { buildOnboardingAnalysis, listConnectors, loadOnboardingSchema, validateProfile } from "./onboarding.mjs";
import { connectorFreshnessPolicy, filterProviderEvidenceForModelContext, isAttendedBrowserRouteType, loadConnectorPlaybooks, resolveProviderRoutes, sourcePriority } from "./connectors.mjs";
import { analyzeAthlete } from "./athlete-analysis.mjs";
import { buildTrainingPlan } from "./training-plan.mjs";
import { applyMealPolicy, buildNutritionCompanion } from "./nutrition.mjs";
import { buildDashboard } from "./dashboard.mjs";
import { buildAutomationSetup, normalizeAutomationOverride, runAutomationPreview } from "./automations.mjs";
import { ImportError, normalizeCheckin, parseActivityFile } from "./imports.mjs";
import { buildWorkoutAdjustment, FeedbackError, normalizeWorkoutFeedback, workoutFeedbackCoachPrompt } from "./feedback.mjs";
import { activatePlan, claimDecisionExecution, confirmMeal, declineMeal, declinePlan, deleteCheckin, deleteImport, deleteMeal, deleteWorkoutFeedback, findDecision, findPlan, findWorkoutFeedback, getActivePlan, getAutomationState, getOnboarding, listCheckins, listImports, listMeals, listPlans, listWorkoutFeedback, readState, recentDecisions, resetOnboarding, saveAutomationOverride, saveAutomationTest, saveCheckin, saveDecision, saveImportedActivities, saveMealDraft, saveOnboarding, savePlanProposal, saveWorkoutFeedback, updateDecision } from "./store.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(root, "../public");
const demoAthlete = JSON.parse(fs.readFileSync(new URL("../data/demo-athlete.json", import.meta.url), "utf8"));

const types = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".webmanifest": "application/manifest+json"
};

function securityHeaders() {
  return {
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    "permissions-policy": "camera=(), microphone=(), geolocation=()",
    "content-security-policy": "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self' https://api.openai.com"
  };
}

function json(res, status, data, headers = {}) {
  res.writeHead(status, { ...securityHeaders(), "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers });
  res.end(JSON.stringify(data));
}

function accessRequired() {
  return Boolean(process.env.STRIDEOS_ACCESS_TOKEN);
}

function accessAuthorized(req) {
  const expected = process.env.STRIDEOS_ACCESS_TOKEN;
  if (!expected) return true;
  const supplied = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  return expectedBuffer.length === suppliedBuffer.length && crypto.timingSafeEqual(expectedBuffer, suppliedBuffer);
}

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

async function readJson(req, maxBytes = 12_000_000) {
  if (!String(req.headers["content-type"] || "").toLowerCase().startsWith("application/json")) {
    throw new HttpError(415, "Send JSON with content-type application/json.");
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) throw new HttpError(413, "Request is too large.");
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); }
  catch { throw new HttpError(400, "Request body is not valid JSON."); }
}

function validateImage(dataUrl) {
  const match = /^data:image\/(png|jpeg|webp);base64,([a-z0-9+/=]+)$/i.exec(dataUrl || "");
  if (!match) throw new HttpError(400, "Choose a valid PNG, JPG, or WEBP meal photo.");
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length > 8_000_000) throw new HttpError(413, "Choose an image smaller than 8 MB.");
  const png = match[1].toLowerCase() === "png" && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const jpeg = match[1].toLowerCase() === "jpeg" && bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const webp = match[1].toLowerCase() === "webp" && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  if (!png && !jpeg && !webp) throw new HttpError(400, "The uploaded bytes do not match the declared image type.");
}

function currentAthleteAnalysis(onboarding = getOnboarding(), imports = listImports(), checkins = listCheckins()) {
  if (!onboarding?.profile) return null;
  return analyzeAthlete({ profile: onboarding.profile, imports, checkins });
}

function currentNutritionCompanion(onboarding = getOnboarding()) {
  if (!onboarding?.profile) return null;
  return buildNutritionCompanion({ profile: onboarding.profile, activePlan: getActivePlan() });
}

function visibleMeals(companion) {
  return listMeals().map((meal) => ({
    ...meal,
    estimate: !companion || companion.status === "off" || !companion.numberPolicy.showEnergy
      ? { ...meal.estimate, caloriesRange: null, proteinRange: null, carbsRange: null, numberPolicy: companion?.numberPolicy || meal.estimate?.numberPolicy }
      : meal.estimate
  }));
}

function currentNutritionData(onboarding = getOnboarding()) {
  const companion = currentNutritionCompanion(onboarding);
  return companion ? { companion, meals: visibleMeals(companion) } : null;
}

function currentDashboard(onboarding = getOnboarding(), { imports = listImports(), checkins = listCheckins() } = {}) {
  return buildDashboard({
    onboarding,
    analysis: currentAthleteAnalysis(onboarding, imports, checkins),
    activePlan: getActivePlan(),
    plans: listPlans(),
    imports,
    checkins,
    workoutFeedback: listWorkoutFeedback(),
    nutrition: currentNutritionData(onboarding),
    connectors: { garmin: garminStatus() },
    decisions: recentDecisions()
  });
}

export function currentProviderWriteStateBinding() {
  const state = readState();
  return buildProviderWriteStateBinding({
    athleteState: {
      onboarding: state.onboarding,
      imports: state.imports,
      checkins: state.checkins,
      workoutFeedback: state.workoutFeedback
    },
    planState: { plans: state.plans, activePlanId: state.activePlanId }
  });
}

export function currentModelAthleteContext(onboarding = getOnboarding()) {
  if (!onboarding?.profile) return null;
  const allImports = listImports();
  const policy = filterProviderEvidenceForModelContext(allImports);
  const checkins = listCheckins();
  return {
    profile: onboarding.profile,
    analysis: currentAthleteAnalysis(onboarding, policy.included, checkins),
    dashboard: currentDashboard(onboarding, { imports: policy.included, checkins }),
    modelContextEvidence: {
      includedImportCount: policy.included.length,
      excludedImportCount: policy.excluded.length,
      excludedReasons: [...new Set(policy.excluded.map((item) => item.reason))]
    }
  };
}

function currentAutomationSetup(onboarding = getOnboarding()) {
  return buildAutomationSetup({ profile: onboarding?.completedAt ? onboarding.profile : null, automationState: getAutomationState() });
}

async function api(req, res, pathname, runtime = {}) {
  if (req.method === "GET" && pathname === "/api/access") {
    return json(res, 200, { required: accessRequired(), mode: accessRequired() ? "private_companion" : "local" });
  }

  if (req.method === "GET" && pathname === "/api/health") {
    return json(res, 200, { ok: true });
  }

  if (req.method === "GET" && pathname === "/api/bootstrap") {
    const onboarding = getOnboarding();
    return json(res, 200, {
      mode: process.env.OPENAI_API_KEY ? "live" : "demo",
      model: process.env.OPENAI_MODEL || "gpt-5.6",
      athlete: demoAthlete,
      policy: loadPolicy(),
      connectors: { garmin: garminStatus(), catalog: listConnectors() },
      onboarding,
      athleteAnalysis: currentAthleteAnalysis(onboarding),
      training: { activePlan: getActivePlan(), proposals: listPlans(4) },
      nutrition: currentNutritionData(onboarding),
      dashboard: currentDashboard(onboarding),
      workoutFeedback: listWorkoutFeedback(20),
      automations: currentAutomationSetup(onboarding),
      companion: { protected: accessRequired(), publicUrl: process.env.STRIDEOS_PUBLIC_URL || null },
      needsOnboarding: !onboarding?.completedAt,
      decisions: recentDecisions()
    });
  }

  if (req.method === "GET" && pathname === "/api/connectors") {
    const onboarding = getOnboarding();
    return json(res, 200, {
      connectors: listConnectors(),
      sourcePriority: sourcePriority(onboarding),
      freshnessPolicy: connectorFreshnessPolicy(),
      imports: listImports(),
      checkins: listCheckins(),
      storage: { mode: "local_state", rawActivityFilesStored: false, deleteAvailable: true }
    });
  }

  if (req.method === "GET" && pathname === "/api/onboarding/schema") {
    return json(res, 200, { schema: loadOnboardingSchema(), connectors: listConnectors() });
  }

  if (req.method === "GET" && pathname === "/api/athlete-analysis") {
    const analysis = currentAthleteAnalysis();
    if (!analysis) throw new HttpError(409, "Start athlete onboarding before requesting analysis.");
    return json(res, 200, { analysis });
  }

  if (req.method === "GET" && pathname === "/api/nutrition") {
    const onboarding = getOnboarding();
    if (!onboarding?.completedAt) throw new HttpError(409, "Complete athlete onboarding before opening nutrition support.");
    return json(res, 200, currentNutritionData(onboarding));
  }

  if (req.method === "GET" && pathname === "/api/dashboard") {
    return json(res, 200, { dashboard: currentDashboard() });
  }

  if (req.method === "GET" && pathname === "/api/workout-feedback") {
    return json(res, 200, { feedback: listWorkoutFeedback(), dashboard: currentDashboard() });
  }

  if (req.method === "POST" && pathname === "/api/workout-feedback") {
    const onboarding = getOnboarding();
    if (!onboarding?.completedAt) throw new HttpError(409, "Complete athlete onboarding before annotating a workout.");
    const body = await readJson(req, 25_000);
    const dashboard = currentDashboard(onboarding);
    const feedback = saveWorkoutFeedback(normalizeWorkoutFeedback(body, dashboard));
    return json(res, 201, { feedback, dashboard: currentDashboard(onboarding), coachPrompt: workoutFeedbackCoachPrompt(feedback) });
  }

  const feedbackProposal = /^\/api\/workout-feedback\/([a-f0-9-]+)\/proposal$/i.exec(pathname);
  if (req.method === "POST" && feedbackProposal) {
    const feedback = findWorkoutFeedback(feedbackProposal[1]);
    if (!feedback) throw new HttpError(404, "Workout annotation not found.");
    const plan = buildWorkoutAdjustment({ activePlan: getActivePlan(), feedback });
    const existing = findPlan(plan.id);
    if (existing?.status === "awaiting_approval") throw new HttpError(409, "This exact workout revision is already awaiting approval.");
    if (existing?.status === "active") throw new HttpError(409, "This exact workout revision is already active.");
    const decision = buildDecision({
      evidence: [
        `Athlete annotation: ${feedback.disposition.replaceAll("_", " ")}`,
        `Reasons: ${feedback.reasons.map((item) => item.replaceAll("_", " ")).join(", ") || "athlete note"}`,
        `Requested direction: ${feedback.requestedChange.replaceAll("_", " ")}`,
        `Current block: ${plan.adjustment.sourcePlanId}`
      ],
      action: "change_training_plan",
      context: { confidence: 0.86 },
      proposal: `${plan.adjustment.explanation} Approve this revised block?`,
      resource: { type: "training_plan", id: plan.id }
    });
    saveDecision(decision);
    const savedPlan = savePlanProposal(plan, decision.id);
    return json(res, 201, { plan: savedPlan, decision, feedback });
  }

  const feedbackDelete = /^\/api\/workout-feedback\/([a-f0-9-]+)$/i.exec(pathname);
  if (req.method === "DELETE" && feedbackDelete) {
    if (!deleteWorkoutFeedback(feedbackDelete[1])) throw new HttpError(404, "Workout annotation not found.");
    return json(res, 200, { deleted: true, dashboard: currentDashboard() });
  }

  if (req.method === "GET" && pathname === "/api/automations") {
    return json(res, 200, currentAutomationSetup());
  }

  if (req.method === "POST" && pathname === "/api/automations/config") {
    const onboarding = getOnboarding();
    if (!onboarding?.completedAt) throw new HttpError(409, "Complete athlete onboarding before configuring scheduled-brief proposals.");
    const body = await readJson(req);
    let override;
    try { override = normalizeAutomationOverride(body.id, body); }
    catch (error) { throw new HttpError(422, error.message); }
    saveAutomationOverride(body.id, override);
    return json(res, 200, currentAutomationSetup(onboarding));
  }

  if (req.method === "POST" && pathname === "/api/automations/test") {
    const onboarding = getOnboarding();
    if (!onboarding?.completedAt) throw new HttpError(409, "Complete athlete onboarding before testing a scheduled brief.");
    const body = await readJson(req);
    const setup = currentAutomationSetup(onboarding);
    if (!setup.tasks.some((task) => task.id === body.id)) throw new HttpError(422, "Choose a known automation proposal.");
    const preview = runAutomationPreview({ id: body.id, dashboard: currentDashboard(onboarding), imports: listImports(), checkins: listCheckins() });
    saveAutomationTest(body.id, preview.status);
    return json(res, 200, { preview, setup: currentAutomationSetup(onboarding) });
  }

  if (req.method === "GET" && pathname === "/api/training-plan") {
    const onboarding = getOnboarding();
    if (!onboarding?.completedAt) throw new HttpError(409, "Complete athlete onboarding before creating a training plan.");
    const analysis = currentAthleteAnalysis(onboarding);
    const preview = buildTrainingPlan({ profile: onboarding.profile, analysis });
    return json(res, 200, { preview, activePlan: getActivePlan(), proposals: listPlans(4) });
  }

  if (req.method === "POST" && pathname === "/api/training-plan/proposals") {
    const onboarding = getOnboarding();
    if (!onboarding?.completedAt) throw new HttpError(409, "Complete athlete onboarding before creating a training plan.");
    const body = await readJson(req, 20_000);
    const startDate = body.startDate === undefined ? undefined : String(body.startDate).slice(0, 10);
    const analysis = currentAthleteAnalysis(onboarding);
    const plan = buildTrainingPlan({ profile: onboarding.profile, analysis, startDate });
    if (plan.status === "blocked") return json(res, 409, { error: plan.explanation, plan });
    if (plan.approval.status === "disabled") return json(res, 403, { error: plan.approval.explanation, plan });
    const existing = findPlan(plan.id);
    if (existing?.status === "active") return json(res, 409, { error: "This exact training block is already active.", plan: existing });
    if (existing?.status === "awaiting_approval") return json(res, 409, { error: "This exact training block is already awaiting approval.", plan: existing });
    const decision = buildDecision({
      evidence: [
        `${analysis.stage.value} starting stage · ${analysis.stage.confidence.label} confidence`,
        `${analysis.goal.feasibility} goal window · ${analysis.goal.confidence.label} confidence`,
        `${analysis.load.basis} load basis · ${analysis.load.planningWeeklyKm} km/week`,
        `${analysis.recovery.status} recovery posture · ${analysis.recovery.confidence.label} confidence`,
        `${plan.frequency.runs} running and ${plan.frequency.strength} strength sessions per week`
      ],
      action: "change_training_plan",
      context: { confidence: plan.confidence.score },
      proposal: `Activate the ${plan.startDate} to ${plan.endDate} ${plan.path.replaceAll("_", " ")} block?`,
      resource: { type: "training_plan", id: plan.id }
    });
    saveDecision(decision);
    const savedPlan = savePlanProposal(plan, decision.id);
    return json(res, 201, { plan: savedPlan, decision });
  }

  if (req.method === "POST" && pathname === "/api/onboarding") {
    const body = await readJson(req, 250_000);
    const complete = body.complete === true;
    const validation = validateProfile(body.profile, { complete });
    if (validation.errors.length) throw new HttpError(422, "Some onboarding answers are invalid.");
    if (complete && validation.missing.length) {
      return json(res, 422, { error: "Finish the required onboarding questions first.", missing: validation.missing });
    }
    const analysis = buildOnboardingAnalysis(validation.profile, { imports: listImports(), checkins: listCheckins() });
    const onboarding = saveOnboarding({ profile: validation.profile, analysis, complete });
    return json(res, complete ? 201 : 200, { onboarding, analysis, missing: validation.missing });
  }

  if (req.method === "DELETE" && pathname === "/api/onboarding") {
    resetOnboarding();
    return json(res, 200, { reset: true });
  }

  if (req.method === "POST" && pathname === "/api/imports/preview") {
    const body = await readJson(req);
    return json(res, 200, parseActivityFile({
      fileName: body.fileName,
      dataBase64: body.dataBase64,
      providerId: body.providerId,
      routeId: body.routeId,
      modelContextDisclosureAccepted: body.modelContext?.disclosureAccepted === true,
      modelContextConsentRecorded: body.modelContext?.consentRecorded === true
    }));
  }

  if (req.method === "POST" && pathname === "/api/imports") {
    const body = await readJson(req);
    if (body.consent !== true) throw new HttpError(422, "Confirm local summary storage before importing.");
    const preview = parseActivityFile({
      fileName: body.fileName,
      dataBase64: body.dataBase64,
      providerId: body.providerId,
      routeId: body.routeId,
      modelContextDisclosureAccepted: body.modelContext?.disclosureAccepted === true,
      modelContextConsentRecorded: body.modelContext?.consentRecorded === true
    });
    const activities = saveImportedActivities(preview.activities);
    return json(res, 201, { activities, file: preview.file, rawStored: false });
  }

  const importDelete = /^\/api\/imports\/([a-z0-9-]+)$/i.exec(pathname);
  if (req.method === "DELETE" && importDelete) {
    if (!deleteImport(importDelete[1])) throw new HttpError(404, "Imported activity not found.");
    return json(res, 200, { deleted: true });
  }

  if (req.method === "POST" && pathname === "/api/checkins") {
    const body = await readJson(req, 20_000);
    return json(res, 201, { checkin: saveCheckin(normalizeCheckin(body)) });
  }

  const checkinDelete = /^\/api\/checkins\/([a-z0-9-]+)$/i.exec(pathname);
  if (req.method === "DELETE" && checkinDelete) {
    if (!deleteCheckin(checkinDelete[1])) throw new HttpError(404, "Manual check-in not found.");
    return json(res, 200, { deleted: true });
  }

  if (req.method === "POST" && pathname === "/api/coach") {
    const body = await readJson(req);
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) throw new HttpError(400, "Write a message first.");
    if (message.length > 2_000) throw new HttpError(400, "Keep the message under 2,000 characters.");
    const deterministicSafetyStop = messageHasSafetySignal(message);
    const onboarding = getOnboarding();
    const personal = onboarding?.completedAt ? currentModelAthleteContext(onboarding) : null;
    if (!deterministicSafetyStop && process.env.OPENAI_API_KEY && !personal) throw new HttpError(409, "Complete athlete onboarding before live coaching.");
    if (!deterministicSafetyStop && process.env.OPENAI_API_KEY && onboarding.profile.delivery?.cloudProcessing !== true) throw new HttpError(403, "Enable cloud processing in Athlete setup before sending personal coaching context to GPT-5.6.");
    const result = deterministicSafetyStop ? null : await coach({ message, athlete: personal || demoAthlete });
    const athleteId = personal?.profile?.personal?.preferredName || "local-athlete";
    const exactWorkout = workoutResourceFromDashboard(personal?.dashboard, athleteId);
    let decision;
    if (deterministicSafetyStop) decision = demoCoachDecision(message, personal?.dashboard || null, athleteId);
    else if (result) {
      const requestedGarminWrite = result.action === "push_garmin_workout";
      const action = requestedGarminWrite && !exactWorkout ? "read_training_data" : result.action;
      const proposal = requestedGarminWrite
        ? exactWorkout
          ? `Review ${exactWorkout.workout.name} for ${exactWorkout.workout.durationMinutes} minutes as an exact local Garmin-entry preview.`
          : "No server-authorized running session is scheduled today, so no Garmin write was created."
        : result.proposal;
      decision = buildDecision({
        evidence: requestedGarminWrite && !exactWorkout ? [...result.evidence, "No server-authorized running session is scheduled today."] : result.evidence,
        action,
        context: { confidence: result.confidence },
        proposal,
        resource: requestedGarminWrite ? exactWorkout : null
      });
    } else decision = demoCoachDecision(message, personal?.dashboard || null, athleteId);
    const garminDeliveryAllowed = !personal || (
      garminStatus().workoutDeliverySupported === true
      && personal.profile.delivery?.workoutDelivery === true
      && personal.profile.delivery?.workoutDeliveryTarget === "garmin"
      && personal.profile.delivery?.approvalMode !== "read_only"
    );
    if (decision.gate.action === "push_garmin_workout" && !garminDeliveryAllowed) {
      decision = buildDecision({
        evidence: [...decision.evidence, garminStatus().workoutDeliverySupported === true ? "Garmin workout delivery is not enabled in the completed athlete profile." : "The optional reference runtime does not include a live Garmin workout-write executor."],
        action: "read_training_data",
        context: {},
        proposal: garminStatus().workoutDeliverySupported !== true
          ? "Keep the exact structured workout in StrideOS and use it as a manual reference. An explicitly chosen browser, script, or plugin action remains outside this runtime and is delegated to the current host."
          : personal.profile.delivery?.workoutDelivery
          ? `Keep the workout in StrideOS. The selected destination is ${personal.profile.delivery.workoutDeliveryTarget.replaceAll("_", " ")}, not Garmin.`
          : "Keep the workout in StrideOS. Device delivery is off and no external write was created."
      });
    }
    saveDecision(decision);
    return json(res, 200, { decision, mode: deterministicSafetyStop ? "deterministic_safety" : result ? "live" : "demo" });
  }

  if (req.method === "POST" && pathname === "/api/food") {
    const body = await readJson(req);
    validateImage(body.imageDataUrl);
    const onboarding = getOnboarding();
    if (!onboarding?.completedAt) throw new HttpError(409, "Complete athlete onboarding before using meal support.");
    const companion = currentNutritionCompanion(onboarding);
    if (companion.status === "off") throw new HttpError(403, "Nutrition support is off. Enable it in Athlete setup before analyzing meals.");
    if (!companion.photo.enabled) throw new HttpError(403, "Meal and fridge photos are disabled in Athlete setup.");
    if (process.env.OPENAI_API_KEY && onboarding.profile.delivery?.cloudProcessing !== true) throw new HttpError(403, "Enable cloud processing in Athlete setup before sending a photo to GPT-5.6.");
    const note = String(body.note || "").slice(0, 500);
    const result = await analyzeMeal({
      imageDataUrl: body.imageDataUrl,
      note,
      nutritionContext: {
        mode: companion.effectiveMode,
        numberFree: companion.numberPolicy.numberFree,
        dietaryPattern: companion.constraints.dietaryPattern,
        declaredAllergies: companion.constraints.declaredAllergies || "none supplied"
      }
    });
    const rawMeal = result || {
      summary: "Sample meal estimate (demo mode)",
      items: [
        { name: "Rice", portion: "about 1.5 cups", confidence: 0.74 },
        { name: "Grilled chicken", portion: "about 140 g", confidence: 0.78 },
        { name: "Mixed vegetables", portion: "about 1 cup", confidence: 0.81 }
      ],
      caloriesRange: "620–790 kcal", proteinRange: "42–55 g", carbsRange: "72–96 g",
      questions: ["Was there oil or butter in the rice?", "How much sauce did you use?"], confidence: 0.7
    };
    const meal = applyMealPolicy(rawMeal, companion);
    const draft = saveMealDraft({ estimate: meal, note, mode: companion.effectiveMode, source: result ? "gpt_5_6_meal_photo" : "synthetic_demo_estimate" });
    const decision = buildDecision({
      evidence: [
        result ? "Meal image analyzed by GPT-5.6" : "Synthetic demo estimate; image was not inspected",
        `Estimate confidence: ${Math.round(meal.confidence * 100)}%`,
        `${companion.effectiveMode} nutrition mode`,
        companion.constraints.declaredAllergies ? "Declared allergy or intolerance note requires ingredient verification" : "No allergy or intolerance note supplied"
      ],
      action: "log_food", context: { confidence: meal.confidence },
      proposal: `Confirm the detected foods and portions before adding “${meal.summary}” to the local fuel log.`,
      resource: { type: "meal_draft", id: draft.id }
    });
    saveDecision(decision);
    return json(res, 200, {
      meal, draft, decision, companion, mode: result ? "live" : "demo",
      disclosure: result ? null : "Demo mode uses a fixed sample estimate. Add an OpenAI API key for real image analysis."
    });
  }

  const mealDelete = /^\/api\/meals\/([a-f0-9-]+)$/i.exec(pathname);
  if (req.method === "DELETE" && mealDelete) {
    if (!deleteMeal(mealDelete[1])) throw new HttpError(404, "Meal record not found.");
    return json(res, 200, { deleted: true });
  }

  if (req.method === "POST" && pathname === "/api/decisions/approve") {
    const body = await readJson(req);
    const decision = findDecision(body.id);
    if (!decision) throw new HttpError(404, "Decision not found. Create a new trace first.");
    if (decision.status !== "awaiting_approval") throw new HttpError(409, "This decision is no longer awaiting approval.");

    let actionResult;
    if (decision.gate.action === "write_provider_session") {
      let approval;
      let executionStarted = false;
      let executionResult = null;
      try {
        approval = validateProviderWriteApproval(decision, {
          approvalNonce: body.approvalNonce,
          scopeHash: body.scopeHash
        });
      } catch (error) {
        if (error?.code === "expired") {
          updateDecision(decision.id, { status: "expired", result: { performed: false, message: error.message } });
        } else if (error?.code !== "approval_mismatch") {
          updateDecision(decision.id, { status: "stopped", result: { performed: false, message: "The provider-write envelope is no longer valid. Create a fresh preview." } });
        }
        throw new HttpError(error?.code === "approval_mismatch" ? 422 : 409, error.message);
      }

      const executor = runtime.providerWriteExecutor;
      if (!executor || typeof executor.inspect !== "function" || typeof executor.execute !== "function" || typeof executor.verify !== "function") {
        updateDecision(decision.id, { status: "stopped", result: { performed: false, message: "No attended provider-write executor with read-back verification is enabled." } });
        throw new HttpError(409, "No attended provider-write executor with read-back verification is enabled.");
      }

      const playbooks = runtime.connectorPlaybooks || loadConnectorPlaybooks();
      const expectedContext = approval.resource.browserContext;
      const route = resolveProviderRoutes({
        providerId: approval.resource.providerId,
        capability: approval.resource.capability,
        surface: expectedContext.surface,
        attended: expectedContext.attended,
        scheduled: expectedContext.scheduled,
        headless: expectedContext.headless,
        browserToolAvailable: true,
        playbooks
      }).find((item) => item.id === approval.resource.routeId && isAttendedBrowserRouteType(item.type) && item.selectable);
      if (!route) {
        updateDecision(decision.id, { status: "stopped", result: { performed: false, message: "The current host no longer exposes the exact attended route from this approval." } });
        throw new HttpError(409, "The current host no longer exposes the exact attended route from this approval.");
      }

      const currentStateBinding = currentProviderWriteStateBinding();
      if (currentStateBinding.athleteStateVersion !== approval.resource.stateBinding.athleteStateVersion
        || currentStateBinding.planStateVersion !== approval.resource.stateBinding.planStateVersion) {
        updateDecision(decision.id, { status: "stopped", result: { performed: false, message: "Athlete evidence or the training plan changed after preview. Review a fresh provider-write proposal." } });
        throw new HttpError(409, "Athlete evidence or the training plan changed after preview. Review a fresh provider-write proposal.");
      }

      const claimedAt = new Date().toISOString();
      const claimed = claimDecisionExecution(decision.id, {
        approvalNonce: approval.envelope.nonce,
        update: { executionClaimedAt: claimedAt, approvalNonceClaimed: approval.envelope.nonce }
      });
      if (!claimed) throw new HttpError(409, "This provider-write approval could not be claimed.");

      try {
        const actual = await executor.inspect({
          decision: structuredClone(claimed),
          envelope: structuredClone(approval.envelope),
          resource: structuredClone(approval.resource)
        });
        const provider = playbooks.providers.find((item) => item.id === approval.resource.providerId);
        const actualPage = actual?.pageUrl ? new URL(actual.pageUrl) : null;
        const providerPage = provider?.webAppUrl ? new URL(provider.webAppUrl) : null;
        const contextMatches = actual?.surface === expectedContext.surface && actual?.attended === true && actual?.scheduled === false && actual?.headless === false;
        const scopeMatches = actual?.providerId === approval.resource.providerId
          && actual?.routeId === approval.resource.routeId
          && actual?.accountBinding === approval.resource.accountBinding
          && actual?.capability === approval.resource.capability
          && actual?.operation === approval.resource.operation
          && actual?.target === approval.resource.target;
        const originMatches = actualPage?.protocol === "https:" && providerPage && actualPage.origin === providerPage.origin;
        if (!contextMatches || !scopeMatches || !originMatches) {
          throw new HttpError(409, "The visible provider session no longer matches the approved account, route, target, operation, and attended context.");
        }

        const stateAfterInspection = currentProviderWriteStateBinding();
        if (stateAfterInspection.athleteStateVersion !== approval.resource.stateBinding.athleteStateVersion
          || stateAfterInspection.planStateVersion !== approval.resource.stateBinding.planStateVersion) {
          throw new HttpError(409, "Athlete evidence or the training plan changed while the provider preview was being checked.");
        }

        executionStarted = true;
        const result = await executor.execute({
          decision: structuredClone(claimed),
          envelope: structuredClone(approval.envelope),
          providerId: approval.resource.providerId,
          routeId: approval.resource.routeId,
          accountBinding: approval.resource.accountBinding,
          capability: approval.resource.capability,
          operation: approval.resource.operation,
          target: approval.resource.target,
          stateBinding: structuredClone(approval.resource.stateBinding),
          payload: structuredClone(approval.resource.payload),
          payloadHash: providerWritePayloadHash(approval.resource.payload),
          maxWrites: 1
        });
        executionResult = result;
        if (result?.performed !== true || result?.writeCount !== 1 || typeof result?.providerRecordId !== "string" || !result.providerRecordId.trim()) {
          throw new HttpError(409, "The provider executor did not return one completed write with a provider record identifier.");
        }

        const verification = await executor.verify({
          decision: structuredClone(claimed),
          envelope: structuredClone(approval.envelope),
          resource: structuredClone(approval.resource),
          execution: structuredClone(result)
        });
        const verifiedPage = verification?.pageUrl ? new URL(verification.pageUrl) : null;
        const verifiedOriginMatches = verifiedPage?.protocol === "https:" && providerPage && verifiedPage.origin === providerPage.origin;
        const verifiedScopeMatches = verification?.providerId === approval.resource.providerId
          && verification?.routeId === approval.resource.routeId
          && verification?.accountBinding === approval.resource.accountBinding
          && verification?.capability === approval.resource.capability
          && verification?.operation === approval.resource.operation
          && verification?.target === approval.resource.target
          && verification?.providerRecordId === result.providerRecordId;
        let verifiedPayloadMatches = false;
        try {
          verifiedPayloadMatches = providerWritePayloadHash(verification?.observedPayload) === providerWritePayloadHash(approval.resource.payload);
        } catch {
          verifiedPayloadMatches = false;
        }
        const verifiedAt = new Date(verification?.verifiedAt || "");
        const verificationTimeMatches = !Number.isNaN(verifiedAt.getTime())
          && verifiedAt.getTime() >= new Date(claimedAt).getTime()
          && verifiedAt.getTime() <= Date.now() + 5_000;
        if (verification?.verified !== true
          || verification?.matchingWriteCount !== 1
          || !verifiedOriginMatches
          || !verifiedScopeMatches
          || !verifiedPayloadMatches
          || !verificationTimeMatches) {
          throw new HttpError(409, "The completed provider write could not be verified by a separate visible read-back.");
        }
        actionResult = {
          performed: true,
          simulated: false,
          writeCount: 1,
          providerRecordId: result.providerRecordId,
          verifiedAt: verifiedAt.toISOString(),
          message: String(verification.message || result.message || "One attended provider write completed and was verified.").slice(0, 500)
        };
      } catch (error) {
        if (executionStarted) {
          const providerRecordId = typeof executionResult?.providerRecordId === "string" && executionResult.providerRecordId.trim()
            ? executionResult.providerRecordId.trim()
            : null;
          updateDecision(decision.id, {
            status: "verification_required",
            approvalConsumedAt: claimedAt,
            result: {
              performed: null,
              writeMayHaveOccurred: true,
              providerRecordId,
              message: "The attended provider write may have occurred, but exact read-back verification did not complete. Reconcile the provider state before creating or approving any retry."
            }
          });
          throw new HttpError(409, "The provider write may have occurred but could not be verified. Reconcile the provider state before approving any retry.");
        }
        updateDecision(decision.id, { status: "stopped", approvalConsumedAt: claimedAt, result: { performed: false, writeMayHaveOccurred: false, message: "The attended provider write stopped before execution and this approval cannot be replayed." } });
        if (error instanceof HttpError) throw error;
        throw new HttpError(409, "The attended provider write stopped and this approval cannot be replayed.");
      }
    } else if (decision.gate.action === "push_garmin_workout") {
      const onboarding = getOnboarding();
      if (decision.resource?.workout?.source === "approved_training_plan" && (
        onboarding?.profile?.delivery?.workoutDelivery !== true
        || onboarding.profile.delivery.workoutDeliveryTarget !== "garmin"
        || onboarding.profile.delivery.approvalMode === "read_only"
      )) throw new HttpError(403, "Enable Garmin workout delivery in Athlete setup before approving a Garmin write.");
      const source = decision.resource?.workout?.source;
      if (decision.resource?.type !== "workout" || !["approved_training_plan", "synthetic_judge_fixture"].includes(source)) {
        throw new HttpError(409, "The approved decision has no exact server-authored workout to send.");
      }
      if (source === "approved_training_plan") {
        if (garminStatus().workoutDeliverySupported !== true) {
          throw new HttpError(409, "The optional reference runtime does not include a live Garmin workout-write executor; a user-selected host action is outside this endpoint.");
        }
        const onboarding = getOnboarding();
        const athleteId = onboarding?.profile?.personal?.preferredName || "local-athlete";
        const currentResource = onboarding?.completedAt ? workoutResourceFromDashboard(currentDashboard(onboarding), athleteId) : null;
        if (!currentResource || JSON.stringify(currentResource) !== JSON.stringify(decision.resource)) {
          updateDecision(decision.id, { status: "stopped", result: { performed: false, message: "The workout is no longer current. Review the latest plan, pain, and recovery evidence." } });
          throw new HttpError(409, "The workout is no longer current. Review the latest plan, pain, and recovery evidence.");
        }
      }
      const claimed = updateDecision(decision.id, { status: "executing", executionClaimedAt: new Date().toISOString() });
      if (!claimed) throw new HttpError(409, "This provider-write approval could not be claimed.");
      try {
        actionResult = await pushWorkout({ decision: claimed });
      } catch (error) {
        updateDecision(decision.id, { status: "stopped", result: { performed: false, message: "The provider action stopped before any external change." } });
        throw error;
      }
    }
    else if (decision.gate.action === "change_training_plan") {
      const plan = decision.resource?.type === "training_plan" ? activatePlan(decision.resource.id) : null;
      if (!plan) throw new HttpError(409, "This training-plan proposal is no longer available for activation.");
      actionResult = { performed: true, simulated: false, planId: plan.id, message: `Training block starting ${plan.startDate} is now active.` };
    } else if (decision.gate.action === "log_food" && decision.resource?.type === "meal_draft") {
      if (body.mealConfirmation?.confirmed !== true) throw new HttpError(422, "Confirm the meal estimate before logging it.");
      const meal = confirmMeal(decision.resource.id, { corrections: body.mealConfirmation.corrections });
      if (!meal) throw new HttpError(409, "This meal estimate is no longer awaiting confirmation.");
      actionResult = { performed: true, simulated: false, mealId: meal.id, message: "Confirmed estimate added to the local fuel log." };
    } else {
      throw new HttpError(409, "This action has no enabled executor.");
    }

    const updated = updateDecision(decision.id, { status: "approved", approvalConsumedAt: decision.gate.action === "write_provider_session" ? new Date().toISOString() : undefined, result: actionResult });
    return json(res, 200, { decision: updated, result: actionResult.message, simulated: actionResult.simulated });
  }

  if (req.method === "POST" && pathname === "/api/decisions/decline") {
    const body = await readJson(req);
    const decision = findDecision(body.id);
    if (!decision) throw new HttpError(404, "Decision not found.");
    if (decision.status !== "awaiting_approval") throw new HttpError(409, "This decision is no longer awaiting approval.");
    if (decision.gate.action === "change_training_plan" && decision.resource?.type === "training_plan") declinePlan(decision.resource.id);
    if (decision.gate.action === "log_food" && decision.resource?.type === "meal_draft") declineMeal(decision.resource.id);
    const updated = updateDecision(decision.id, { status: "declined", result: { performed: false, message: "Action declined. Nothing changed." } });
    return json(res, 200, { decision: updated, result: updated.result.message });
  }

  return json(res, 404, { error: "Not found." });
}

function staticFile(res, pathname) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const file = path.resolve(publicDir, `.${requested}`);
  if (!file.startsWith(`${publicDir}${path.sep}`) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return false;
  res.writeHead(200, { ...securityHeaders(), "content-type": types[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
  return true;
}

export function createServer({ providerWriteExecutor = null, connectorPlaybooks = null } = {}) {
  const runtime = { providerWriteExecutor, connectorPlaybooks };
  return http.createServer(async (req, res) => {
    const pathname = new URL(req.url, `http://${req.headers.host || "localhost"}`).pathname;
    try {
      if (pathname.startsWith("/api/")) {
        const publicEndpoint = req.method === "GET" && ["/api/access", "/api/health"].includes(pathname);
        if (!publicEndpoint && !accessAuthorized(req)) return json(res, 401, { error: "Enter the private companion access key." }, { "www-authenticate": "Bearer realm=\"StrideOS\"" });
        return await api(req, res, pathname, runtime);
      }
      if (staticFile(res, pathname)) return;
      res.writeHead(404, { ...securityHeaders(), "content-type": "text/plain; charset=utf-8" });
      res.end("Not found");
    } catch (error) {
      const status = error instanceof HttpError || error instanceof ImportError || error instanceof FeedbackError ? error.status : 500;
      if (status === 500) console.error(error);
      json(res, status, { error: status === 500 ? "The optional StrideOS reference runtime could not complete that request." : error.message });
    }
  });
}

export function validateRuntimeAccess(host = "127.0.0.1", token = "") {
  const local = ["127.0.0.1", "localhost", "::1"].includes(String(host).trim());
  if (!local && String(token).length < 16) throw new Error("Refusing to expose StrideOS without STRIDEOS_ACCESS_TOKEN of at least 16 characters.");
  return { local, protected: Boolean(token) };
}

export function startServer(port = Number(process.env.PORT || 4173), host = process.env.HOST || "127.0.0.1") {
  validateRuntimeAccess(host, process.env.STRIDEOS_ACCESS_TOKEN || "");
  const server = createServer();
  return server.listen(port, host, () => {
    const address = process.env.STRIDEOS_PUBLIC_URL || `http://${host === "0.0.0.0" || host === "::" ? "localhost" : host}:${server.address().port}`;
    console.log(`StrideOS running at ${address}${accessRequired() ? " (private companion access enabled)" : ""}`);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) startServer();

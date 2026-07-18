import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { freshnessFor } from "./imports.mjs";

const defaultFile = path.join(os.tmpdir(), "strideos-harness-state.json");

function stateFile() {
  return process.env.STRIDEOS_STATE_FILE || defaultFile;
}

function emptyState() {
  return { version: 5, decisions: [], onboarding: null, imports: [], checkins: [], plans: [], activePlanId: null, meals: [] };
}

function migrateState(value) {
  const state = value && typeof value === "object" && !Array.isArray(value) ? value : emptyState();
  return {
    version: 5,
    decisions: Array.isArray(state.decisions) ? state.decisions : [],
    onboarding: state.onboarding && typeof state.onboarding === "object" ? state.onboarding : null,
    imports: Array.isArray(state.imports) ? state.imports : [],
    checkins: Array.isArray(state.checkins) ? state.checkins : [],
    plans: Array.isArray(state.plans) ? state.plans : [],
    activePlanId: typeof state.activePlanId === "string" ? state.activePlanId : null,
    meals: Array.isArray(state.meals) ? state.meals : []
  };
}

export function readState() {
  try {
    return migrateState(JSON.parse(fs.readFileSync(stateFile(), "utf8")));
  } catch (error) {
    if (error?.code === "ENOENT") return emptyState();
    throw error;
  }
}

function writeState(state) {
  const file = stateFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(state, null, 2));
  fs.renameSync(temporary, file);
}

export function saveDecision(decision) {
  const state = readState();
  const decisions = state.decisions.filter((item) => item.id !== decision.id);
  decisions.unshift(decision);
  state.decisions = decisions.slice(0, 30);
  writeState(state);
  return decision;
}

export function findDecision(id) {
  return readState().decisions.find((item) => item.id === id) || null;
}

export function updateDecision(id, update) {
  const state = readState();
  const index = state.decisions.findIndex((item) => item.id === id);
  if (index < 0) return null;
  state.decisions[index] = { ...state.decisions[index], ...update, updatedAt: new Date().toISOString() };
  writeState(state);
  return state.decisions[index];
}

export function recentDecisions(limit = 8) {
  return readState().decisions.slice(0, limit);
}

export function getOnboarding() {
  return readState().onboarding;
}

export function saveOnboarding({ profile, analysis, complete = false }) {
  const state = readState();
  const now = new Date().toISOString();
  const profileChanged = state.onboarding?.profile && JSON.stringify(state.onboarding.profile) !== JSON.stringify(profile);
  if (profileChanged) {
    state.plans = state.plans.map((plan) => {
      if (plan.status === "active") return { ...plan, status: "review_required", reviewReason: "Athlete profile changed after activation.", reviewRequiredAt: now };
      if (plan.status === "awaiting_approval") return { ...plan, status: "stale", reviewReason: "Athlete profile changed before approval.", reviewRequiredAt: now };
      return plan;
    });
    state.activePlanId = null;
    state.meals = state.meals.map((meal) => meal.status === "awaiting_confirmation"
      ? { ...meal, status: "stale", staleAt: now, staleReason: "Athlete profile changed before meal confirmation." }
      : meal);
  }
  state.onboarding = {
    profile,
    analysis,
    startedAt: state.onboarding?.startedAt || now,
    updatedAt: now,
    completedAt: complete ? (state.onboarding?.completedAt || now) : null
  };
  writeState(state);
  return state.onboarding;
}

export function resetOnboarding() {
  const state = readState();
  state.onboarding = null;
  state.plans = [];
  state.activePlanId = null;
  state.meals = [];
  writeState(state);
}

export function listPlans(limit = 12) {
  return readState().plans.slice(0, limit);
}

export function findPlan(id) {
  return readState().plans.find((plan) => plan.id === id) || null;
}

export function getActivePlan() {
  const state = readState();
  return state.plans.find((plan) => plan.id === state.activePlanId && plan.status === "active") || null;
}

export function savePlanProposal(plan, decisionId) {
  const state = readState();
  const saved = { ...plan, status: "awaiting_approval", decisionId, proposedAt: new Date().toISOString() };
  state.plans = [saved, ...state.plans.filter((item) => item.id !== plan.id)].slice(0, 12);
  writeState(state);
  return saved;
}

export function activatePlan(id) {
  const state = readState();
  const target = state.plans.find((plan) => plan.id === id);
  if (!target || target.status !== "awaiting_approval") return null;
  const activatedAt = new Date().toISOString();
  state.plans = state.plans.map((plan) => {
    if (plan.id === id) return { ...plan, status: "active", activatedAt };
    if (plan.status === "active") return { ...plan, status: "superseded", supersededAt: activatedAt };
    return plan;
  });
  state.activePlanId = id;
  writeState(state);
  return state.plans.find((plan) => plan.id === id);
}

export function declinePlan(id) {
  const state = readState();
  const target = state.plans.find((plan) => plan.id === id);
  if (!target || target.status !== "awaiting_approval") return null;
  state.plans = state.plans.map((plan) => plan.id === id ? { ...plan, status: "declined", declinedAt: new Date().toISOString() } : plan);
  writeState(state);
  return state.plans.find((plan) => plan.id === id);
}

export function listMeals(limit = 50) {
  return readState().meals.slice(0, limit);
}

export function findMeal(id) {
  return readState().meals.find((meal) => meal.id === id) || null;
}

export function saveMealDraft({ estimate, note = "", mode = "loose", source = "meal_photo" }) {
  const state = readState();
  const saved = {
    id: crypto.randomUUID(),
    status: "awaiting_confirmation",
    source,
    mode,
    estimate,
    athleteNote: String(note).trim().slice(0, 500),
    imageStored: false,
    createdAt: new Date().toISOString()
  };
  state.meals = [saved, ...state.meals].slice(0, 100);
  writeState(state);
  return saved;
}

export function confirmMeal(id, { corrections = "" } = {}) {
  const state = readState();
  const target = state.meals.find((meal) => meal.id === id);
  if (!target || target.status !== "awaiting_confirmation") return null;
  const confirmedAt = new Date().toISOString();
  state.meals = state.meals.map((meal) => meal.id === id ? {
    ...meal,
    status: "logged",
    corrections: String(corrections).trim().slice(0, 500),
    confirmedAt
  } : meal);
  writeState(state);
  return state.meals.find((meal) => meal.id === id);
}

export function declineMeal(id) {
  const state = readState();
  const target = state.meals.find((meal) => meal.id === id);
  if (!target || target.status !== "awaiting_confirmation") return null;
  state.meals = state.meals.map((meal) => meal.id === id ? { ...meal, status: "declined", declinedAt: new Date().toISOString() } : meal);
  writeState(state);
  return state.meals.find((meal) => meal.id === id);
}

export function deleteMeal(id) {
  const state = readState();
  const before = state.meals.length;
  state.meals = state.meals.filter((meal) => meal.id !== id);
  if (state.meals.length === before) return false;
  writeState(state);
  return true;
}

export function listImports(limit = 100) {
  return readState().imports.slice(0, limit).map((activity) => ({ ...activity, freshness: freshnessFor(activity.activityAt) }));
}

export function saveImportedActivities(activities) {
  const state = readState();
  const importedAt = new Date().toISOString();
  const saved = activities.map((activity) => ({ ...activity, id: crypto.randomUUID(), importedAt }));
  state.imports = [...saved, ...state.imports].slice(0, 200);
  writeState(state);
  return saved;
}

export function deleteImport(id) {
  const state = readState();
  const before = state.imports.length;
  state.imports = state.imports.filter((activity) => activity.id !== id);
  if (state.imports.length === before) return false;
  writeState(state);
  return true;
}

export function listCheckins(limit = 100) {
  return readState().checkins.slice(0, limit).map((checkin) => ({ ...checkin, freshness: freshnessFor(checkin.capturedAt) }));
}

export function saveCheckin(checkin) {
  const state = readState();
  const saved = { ...checkin, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  state.checkins = [saved, ...state.checkins].slice(0, 200);
  if (saved.pain >= 4 && state.activePlanId) {
    state.plans = state.plans.map((plan) => plan.id === state.activePlanId
      ? { ...plan, status: "review_required", reviewReason: `Pain check-in ${saved.pain}/10 holds progression.`, reviewRequiredAt: saved.createdAt }
      : plan);
    state.activePlanId = null;
  }
  writeState(state);
  return saved;
}

export function deleteCheckin(id) {
  const state = readState();
  const before = state.checkins.length;
  state.checkins = state.checkins.filter((checkin) => checkin.id !== id);
  if (state.checkins.length === before) return false;
  writeState(state);
  return true;
}

export function resetState() {
  writeState(emptyState());
}

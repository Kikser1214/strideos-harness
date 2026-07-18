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
  return { version: 3, decisions: [], onboarding: null, imports: [], checkins: [] };
}

function migrateState(value) {
  const state = value && typeof value === "object" && !Array.isArray(value) ? value : emptyState();
  return {
    version: 3,
    decisions: Array.isArray(state.decisions) ? state.decisions : [],
    onboarding: state.onboarding && typeof state.onboarding === "object" ? state.onboarding : null,
    imports: Array.isArray(state.imports) ? state.imports : [],
    checkins: Array.isArray(state.checkins) ? state.checkins : []
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
  writeState(state);
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

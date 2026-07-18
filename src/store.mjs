import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const defaultFile = path.join(os.tmpdir(), "strideos-harness-state.json");

function stateFile() {
  return process.env.STRIDEOS_STATE_FILE || defaultFile;
}

function emptyState() {
  return { version: 2, decisions: [], onboarding: null };
}

function migrateState(value) {
  const state = value && typeof value === "object" && !Array.isArray(value) ? value : emptyState();
  return {
    version: 2,
    decisions: Array.isArray(state.decisions) ? state.decisions : [],
    onboarding: state.onboarding && typeof state.onboarding === "object" ? state.onboarding : null
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

export function resetState() {
  writeState(emptyState());
}

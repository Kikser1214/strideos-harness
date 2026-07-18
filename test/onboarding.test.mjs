import test from "node:test";
import assert from "node:assert/strict";
import { buildOnboardingAnalysis, listConnectors, loadOnboardingSchema, validateProfile } from "../src/onboarding.mjs";
import { completeProfile } from "./fixtures.mjs";

test("schema makes strength a first-class onboarding section", () => {
  const schema = loadOnboardingSchema();
  const strength = schema.sections.find((section) => section.id === "strength");
  assert.ok(strength);
  assert.ok(strength.fields.some((field) => field.id === "experience" && field.required));
  assert.ok(strength.fields.some((field) => field.id === "equipment" && field.required));
});

test("schema defaults an unfamiliar athlete to a recommendation instead of method jargon", () => {
  const schema = loadOnboardingSchema();
  const preferences = schema.sections.find((section) => section.id === "preferences");
  const trainingStyle = preferences.fields.find((field) => field.id === "trainingStyle");
  assert.equal(trainingStyle.default, "recommend_for_me");
  assert.match(preferences.description, /recommends the starting approach by default/i);
});

test("complete beginner profile validates and receives running plus strength guidance", () => {
  const validation = validateProfile(completeProfile(), { complete: true });
  assert.equal(validation.valid, true);
  const analysis = buildOnboardingAnalysis(validation.profile);
  assert.equal(analysis.completeness.percent, 100);
  assert.equal(analysis.stage, "starter");
  assert.equal(analysis.training.recommended, "run_walk");
  assert.equal(analysis.training.runSessionsPerWeek, 3);
  assert.equal(analysis.strength.sessionsPerWeek, 2);
  assert.equal(analysis.strength.phase, "technique_first");
  assert.match(analysis.training.note, /three separated run-walk-run sessions/i);
  assert.match(analysis.training.note, /easy cycling is an optional/i);
});

test("safety signals pause both running and strength prescription", () => {
  const profile = completeProfile({ safety: { chestPain: true, clearanceStatus: "not_sure" } });
  const analysis = buildOnboardingAnalysis(profile);
  assert.equal(analysis.safety.blocked, true);
  assert.equal(analysis.training.runSessionsPerWeek, 0);
  assert.equal(analysis.strength.sessionsPerWeek, 0);
  assert.match(analysis.safety.recommendation, /PAR-Q\+/i);
});

test("current red-flag symptoms remain a stop even when old clearance is selected", () => {
  const profile = completeProfile({ safety: { chestPain: true, clearanceStatus: "cleared" } });
  const analysis = buildOnboardingAnalysis(profile);
  assert.equal(analysis.safety.blocked, true);
  assert.equal(analysis.safety.hardStop, true);
  assert.equal(analysis.athlete.recovery.status, "safety_stop");
});

test("advanced named methods are not blindly assigned to a starter", () => {
  const profile = completeProfile({ preferences: { trainingStyle: "norwegian_inspired" } });
  const analysis = buildOnboardingAnalysis(profile);
  assert.equal(analysis.training.requested, "norwegian_inspired");
  assert.equal(analysis.training.recommended, "run_walk");
  assert.equal(analysis.training.researchRequired, true);
});

test("Apple Health is labeled as a native companion route", () => {
  const apple = listConnectors().find((connector) => connector.id === "apple_health");
  assert.equal(apple.route, "ios_companion");
  assert.equal(apple.status, "companion_required");
});

test("completion validation reports missing required paths", () => {
  const validation = validateProfile({ personal: { preferredName: "Alex" } }, { complete: true });
  assert.equal(validation.valid, false);
  assert.ok(validation.missing.includes("strength.experience"));
  assert.ok(validation.missing.includes("data.primarySource"));
});

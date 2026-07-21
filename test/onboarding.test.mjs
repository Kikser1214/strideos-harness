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

test("grouped conversational onboarding covers every granular field exactly once", () => {
  const schema = loadOnboardingSchema();
  assert.equal(schema.conversation.mode, "grouped_natural_language");
  assert.equal(schema.conversation.targetRounds, 8);
  const schemaPaths = schema.sections.flatMap((section) => section.fields.map((field) => `${section.id}.${field.id}`)).sort();
  const groupedPaths = schema.conversation.groups.flatMap((group) => group.fieldPaths).sort();
  assert.deepEqual(groupedPaths, schemaPaths);
  assert.equal(new Set(groupedPaths).size, groupedPaths.length);
  assert.ok(schema.conversation.rules.some((rule) => /ask only for required/i.test(rule)));
});

test("provider reads record exact per-provider scopes and timing", () => {
  const scoped = completeProfile({
    data: {
      sources: ["garmin", "strava"], primarySource: "garmin", historyWindow: "12_weeks", manualCheckins: true,
      authorizedRead: true, readTiming: "now_before_plan",
      providerScopes: { garmin: ["activities", "workout_details", "sleep"], strava: ["activities", "route_elevation"] }
    }
  });
  const validation = validateProfile(scoped, { complete: true });
  assert.equal(validation.valid, true);
  const analysis = buildOnboardingAnalysis(validation.profile);
  assert.equal(analysis.data.readBeforePlan, true);
  assert.deepEqual(analysis.data.providerScopes.garmin, ["activities", "workout_details", "sleep"]);

  const incomplete = validateProfile(completeProfile({
    data: {
      sources: ["garmin", "strava"], primarySource: "garmin", historyWindow: "12_weeks", manualCheckins: true,
      authorizedRead: true, readTiming: "now_before_plan", providerScopes: { garmin: ["activities"] }
    }
  }), { complete: true });
  assert.equal(incomplete.valid, false);
  assert.ok(incomplete.missing.includes("data.providerScopes.strava"));
});

test("photo retention is fixed to no retention and only applies when photo nutrition is enabled", () => {
  const schema = loadOnboardingSchema();
  const nutrition = schema.sections.find((section) => section.id === "nutrition");
  const photoRetention = nutrition.fields.find((field) => field.id === "photoRetention");
  assert.deepEqual(photoRetention.options, ["do_not_retain"]);
  assert.deepEqual(photoRetention.showWhen, { field: "photoMode", equals: true });

  const withoutPhotos = validateProfile(completeProfile({ nutrition: { photoMode: false, photoRetention: "do_not_retain" } }), { complete: true });
  assert.equal(withoutPhotos.valid, true);
  assert.equal(withoutPhotos.profile.nutrition.photoRetention, undefined);

  const missingRule = validateProfile(completeProfile({ nutrition: { photoMode: true, photoRetention: undefined } }), { complete: true });
  assert.equal(missingRule.valid, false);
  assert.ok(missingRule.missing.includes("nutrition.photoRetention"));
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
  assert.equal(apple.route, "native_companion");
  assert.equal(apple.status, "companion_required");
});

test("completion validation reports missing required paths", () => {
  const validation = validateProfile({ personal: { preferredName: "Alex" } }, { complete: true });
  assert.equal(validation.valid, false);
  assert.ok(validation.missing.includes("strength.experience"));
  assert.ok(validation.missing.includes("data.primarySource"));
});

test("device workout delivery requires a target and preserves separate setup consent", () => {
  const missingTarget = validateProfile(completeProfile({ delivery: { workoutDelivery: true, connectorSetupMode: "guide_only" } }), { complete: true });
  assert.equal(missingTarget.valid, false);
  assert.ok(missingTarget.missing.includes("delivery.workoutDeliveryTarget"));
  assert.equal(missingTarget.missing.includes("delivery.connectorSetupMode"), false);

  const profile = completeProfile({ delivery: { workoutDelivery: true, workoutDeliveryTarget: "garmin", connectorSetupMode: "allow_local_setup_after_review" } });
  const analysis = buildOnboardingAnalysis(profile);
  assert.equal(analysis.workoutDelivery.requested, true);
  assert.equal(analysis.workoutDelivery.agentMayPerformLocalSetup, true);
  assert.equal(analysis.workoutDelivery.canPushNow, false);
  assert.match(analysis.workoutDelivery.approval, /every exact workout/i);
  assert.match(analysis.workoutDelivery.note, /current host may offer an attended provider session/i);
  assert.doesNotMatch(analysis.workoutDelivery.note, /No provider-permitted/i);
});

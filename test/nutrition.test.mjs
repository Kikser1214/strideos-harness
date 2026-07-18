import test from "node:test";
import assert from "node:assert/strict";
import { applyMealPolicy, buildNutritionCompanion } from "../src/nutrition.mjs";
import { completeProfile } from "./fixtures.mjs";

const meal = {
  summary: "Rice bowl",
  items: [{ name: "Rice", portion: "about 2 cups", confidence: 0.7 }, { name: "Tofu", portion: "about 120 g", confidence: 0.65 }],
  caloriesRange: "600–800 kcal",
  proteinRange: "25–35 g",
  carbsRange: "80–110 g",
  questions: ["Was oil added?"],
  confidence: 0.68
};

test("nutrition off remains a complete opt-out", () => {
  const companion = buildNutritionCompanion({ profile: completeProfile({ nutrition: { mode: "off", photoMode: true } }) });
  assert.equal(companion.status, "off");
  assert.equal(companion.photo.enabled, false);
  assert.deepEqual(companion.framework, []);
});

test("loose guidance stays useful without calorie or macro displays", () => {
  const companion = buildNutritionCompanion({ profile: completeProfile() });
  assert.equal(companion.effectiveMode, "loose");
  assert.equal(companion.numberPolicy.showEnergy, false);
  assert.ok(companion.framework.some((item) => item.id === "protein_anchor"));
  const estimate = applyMealPolicy(meal, companion);
  assert.equal(estimate.caloriesRange, null);
  assert.equal(estimate.proteinRange, null);
});

test("detailed adult tracking may expose a bounded optional protein range", () => {
  const profile = completeProfile({
    personal: { weight: 70, weightContext: "context_only" },
    nutrition: { mode: "detailed", numberFreePreferred: false, trackingRelationship: "comfortable_with_numbers" }
  });
  const companion = buildNutritionCompanion({ profile });
  assert.equal(companion.numberPolicy.showMacros, true);
  assert.equal(companion.target.protein.range, "84–112 g/day");
  assert.equal(applyMealPolicy(meal, companion).caloriesRange, "600–800 kcal");
});

test("number-free preference and tracking concerns override detailed mode", () => {
  const preferred = buildNutritionCompanion({ profile: completeProfile({ nutrition: { mode: "detailed", numberFreePreferred: true } }) });
  assert.equal(preferred.effectiveMode, "number_free");
  assert.equal(preferred.target.status, "not_used");

  const relationshipPreference = buildNutritionCompanion({ profile: completeProfile({ nutrition: { mode: "detailed", numberFreePreferred: false, trackingRelationship: "prefer_no_numbers" } }) });
  assert.equal(relationshipPreference.effectiveMode, "number_free");

  const concern = buildNutritionCompanion({ profile: completeProfile({ nutrition: { mode: "detailed", numberFreePreferred: false, trackingRelationship: "previous_or_current_concern" } }) });
  assert.equal(concern.status, "protected");
  assert.equal(concern.numberPolicy.numberFree, true);
  assert.match(concern.boundaries.join(" "), /qualified eating-disorder support/i);
});

test("minors and clinician-prescribed diets keep automated targets protected", () => {
  const minor = buildNutritionCompanion({ profile: completeProfile({ personal: { ageGroup: "under_18", weight: 55 }, nutrition: { mode: "detailed", numberFreePreferred: false } }) });
  assert.equal(minor.status, "protected");
  assert.equal(minor.numberPolicy.showMacros, false);
  assert.ok(minor.supplements.every((item) => item.automaticRecommendation === false));

  const medical = buildNutritionCompanion({ profile: completeProfile({ nutrition: { mode: "guided", medicalDiet: true } }) });
  assert.match(medical.boundaries[0], /preserve the clinician-prescribed diet/i);
});

test("declared allergies are warnings, never image-based safety claims", () => {
  const companion = buildNutritionCompanion({ profile: completeProfile({ nutrition: { allergiesIntolerances: "Peanut allergy", mode: "guided" } }) });
  const estimate = applyMealPolicy(meal, companion);
  assert.match(estimate.questions.join(" "), /Peanut allergy/);
  assert.match(estimate.warnings.join(" "), /cannot establish allergen safety/i);
  assert.equal(estimate.rawImageStored, false);
});

test("nutrition companion is deterministic and never auto-prescribes supplements", () => {
  const profile = completeProfile({ nutrition: { proteinPowder: "considering", creatine: "considering", caffeine: "high", supplements: "Iron 18 mg" } });
  const first = buildNutritionCompanion({ profile });
  const second = buildNutritionCompanion({ profile });
  assert.deepEqual(first, second);
  assert.ok(first.supplements.every((item) => item.automaticRecommendation === false));
  assert.match(first.supplements.find((item) => item.id === "caffeine").guidance, /Do not add more/i);
});

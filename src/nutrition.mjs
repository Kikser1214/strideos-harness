export const NUTRITION_VERSION = "2026-07-18";

export const nutritionEvidence = [
  {
    id: "dga_2025_2030",
    title: "Dietary Guidelines for Americans, 2025–2030",
    url: "https://cdn.realfood.gov/DGA_508.pdf",
    scope: "Supports varied nutrient-dense foods, hydration, and adapting intake to the individual rather than a generic calorie target."
  },
  {
    id: "nih_performance_supplements",
    title: "NIH ODS exercise and athletic performance fact sheet",
    url: "https://ods.od.nih.gov/factsheets/ExerciseAndAthleticPerformance-Consumer/",
    scope: "Supports evidence-aware discussion of protein, creatine, caffeine, and other performance supplements without assuming every athlete needs them."
  },
  {
    id: "nih_supplement_safety",
    title: "NIH ODS dietary supplement safety guide",
    url: "https://ods.od.nih.gov/factsheets/WYNTK-Consumer/",
    scope: "Supports keeping a product, dose, timing, and medicine inventory and reviewing safety and quality with a qualified professional."
  },
  {
    id: "fda_food_allergens",
    title: "FDA food allergy guidance",
    url: "https://www.fda.gov/food/buy-store-serve-safe-food/food-allergies-what-you-need-know",
    scope: "Supports treating declared allergies as hard exclusions and never inferring allergen safety from a photo."
  },
  {
    id: "nice_eating_disorders",
    title: "NICE eating-disorder recognition and treatment guideline",
    url: "https://www.nice.org.uk/guidance/ng69",
    scope: "Supports routing relevant concerns to qualified care instead of intensifying calorie, weight, or macro tracking."
  }
];

const concernStates = new Set(["previous_or_current_concern", "clinician_guided"]);

function clean(value, max = 500) {
  return String(value || "").trim().slice(0, max);
}

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function proteinTarget(profile) {
  const weight = finite(profile.personal?.weight);
  if (!weight || weight <= 0 || profile.personal?.weightContext === "do_not_use") return null;
  const kg = profile.personal?.units === "imperial" ? weight / 2.2046226218 : weight;
  if (kg < 25 || kg > 350) return null;
  return {
    range: `${Math.round(kg * 1.2)}–${Math.round(kg * 1.6)} g/day`,
    basis: "Optional planning range from body weight; distribute across familiar meals and revise for the person, diet, training, and clinical context.",
    modelMayOverride: false
  };
}

function mealFramework(profile) {
  const patterns = Array.isArray(profile.nutrition?.dietPattern) ? profile.nutrition.dietPattern : [];
  const plantOnly = patterns.includes("vegan");
  const vegetarian = plantOnly || patterns.includes("vegetarian");
  return [
    {
      id: "carbohydrate_base",
      label: "Training energy",
      cue: "Include a familiar carbohydrate source around running days, scaled by appetite, session duration, and tolerance.",
      examples: ["oats", "rice", "potatoes", "bread", "pasta", "fruit"]
    },
    {
      id: "protein_anchor",
      label: "Recovery anchor",
      cue: "Include a protein food across the day; a powder is convenience, not an automatic requirement.",
      examples: plantOnly
        ? ["beans", "lentils", "tofu", "tempeh", "soy yogurt"]
        : vegetarian
          ? ["beans", "lentils", "tofu", "eggs", "yogurt"]
          : ["beans", "lentils", "eggs", "yogurt", "fish", "meat"]
    },
    {
      id: "produce_variety",
      label: "Everyday variety",
      cue: "Add vegetables or fruit across meals in forms that fit budget, access, culture, and digestion.",
      examples: ["fresh", "frozen", "canned", "dried"]
    },
    {
      id: "hydration",
      label: "Hydration cue",
      cue: "Start normally hydrated, keep water accessible, and use thirst, conditions, session length, and usual sweat response as context.",
      examples: []
    }
  ];
}

function supplementReview(profile, protectedContext) {
  const nutrition = profile.nutrition || {};
  const prefix = protectedContext
    ? "Keep the current clinician plan unchanged and review any change with the appropriate qualified professional."
    : "Review purpose, product, dose, timing, tolerance, medicines, and independent quality testing before changing use.";
  return [
    {
      id: "protein_powder",
      reportedUse: nutrition.proteinPowder || "not_reported",
      automaticRecommendation: false,
      guidance: `${prefix} Protein powder is an optional convenience when ordinary food does not fit the day; declared allergens and total diet still matter.`
    },
    {
      id: "creatine",
      reportedUse: nutrition.creatine || "not_reported",
      automaticRecommendation: false,
      guidance: `${prefix} Creatine evidence is task-specific and does not make it necessary for a runner.`
    },
    {
      id: "caffeine",
      reportedUse: nutrition.caffeine || "not_reported",
      automaticRecommendation: false,
      guidance: nutrition.caffeine === "high"
        ? "Do not add more automatically. Review total intake, sleep, side effects, medicines, and event rules before any performance use."
        : `${prefix} Responses vary, and sleep or side effects can outweigh a possible performance benefit.`
    },
    {
      id: "other",
      reportedUse: clean(nutrition.supplements, 1000) || "none_reported",
      automaticRecommendation: false,
      guidance: `${prefix} Keep a complete supplement and medicine record; a marketing claim is not proof of benefit or safety.`
    }
  ];
}

function sessionFuelCues(activePlan) {
  const types = new Set(activePlan?.weeks?.flatMap((week) => week.days.flatMap((day) => day.sessions.map((session) => session.type))) || []);
  const cues = [
    { id: "ordinary_day", label: "Ordinary or rest day", cue: "Keep a regular meal rhythm that supports appetite, energy, and recovery. No catch-up restriction is attached to food." },
    { id: "easy_short", label: "Short easy or run/walk day", cue: "A normal meal pattern and accessible water are usually the starting point; use a familiar snack when timing or hunger calls for it." }
  ];
  if (["long_easy", "controlled_quality"].some((type) => types.has(type))) cues.push({
    id: "long_or_quality",
    label: "Longer or quality day",
    cue: "Plan familiar carbohydrate-containing food before the session, practice what is tolerated, and follow with a normal meal containing carbohydrate, protein, and fluid. Event fueling needs an individual rehearsal."
  });
  if (types.has("strength")) cues.push({
    id: "strength_day",
    label: "Strength day",
    cue: "Avoid treating strength as a supplement problem. A normal meal pattern with protein foods, carbohydrate, and enough total food is the baseline."
  });
  return cues;
}

export function buildNutritionCompanion({ profile = {}, activePlan = null } = {}) {
  const nutrition = profile.nutrition || {};
  const requestedMode = nutrition.mode || "off";
  const trackingConcern = concernStates.has(nutrition.trackingRelationship);
  const under18 = profile.personal?.ageGroup === "under_18";
  const protectedContext = Boolean(nutrition.medicalDiet || trackingConcern || under18);
  const numberFree = Boolean(
    nutrition.numberFreePreferred ||
    requestedMode === "number_free" ||
    nutrition.trackingRelationship === "prefer_no_numbers" ||
    trackingConcern ||
    under18 ||
    profile.personal?.weightContext === "do_not_use"
  );
  const effectiveMode = requestedMode === "off" ? "off" : numberFree ? "number_free" : requestedMode;
  const numbersAllowed = effectiveMode === "detailed" && !protectedContext;
  const photoEnabled = requestedMode !== "off" && nutrition.photoMode === true;
  const target = numbersAllowed ? proteinTarget(profile) : null;
  const boundaries = [
    "Meal-photo outputs are estimates. A photo cannot verify ingredients, allergens, cross-contact, cooking fats, or exact portions.",
    "Logging requires explicit confirmation; the selected image is not retained by the included server.",
    "No supplement is automatically prescribed, and no supplement replaces an ordinary varied diet.",
    "StrideOS does not diagnose, treat, or replace a registered dietitian or clinician."
  ];
  if (nutrition.medicalDiet) boundaries.unshift("Preserve the clinician-prescribed diet. StrideOS may organize questions and routines but must not contradict or replace that plan.");
  if (trackingConcern) boundaries.unshift("Keep support number-free and avoid calorie, macro, body-weight, or compensatory targets; offer qualified eating-disorder support when appropriate.");
  if (under18) boundaries.unshift("Keep guidance food-first and non-restrictive; supplement or body-composition changes require an appropriate adult and qualified professional context.");

  return {
    version: NUTRITION_VERSION,
    status: requestedMode === "off" ? "off" : protectedContext ? "protected" : "ready",
    requestedMode,
    effectiveMode,
    goal: nutrition.goal || "not_sure",
    numberPolicy: {
      numberFree,
      showEnergy: numbersAllowed,
      showMacros: numbersAllowed,
      explanation: numbersAllowed
        ? "Detailed tracking was selected without a current number-free or protected-context rule. Estimates remain ranges and require confirmation."
        : "Use food, meal-rhythm, appetite, hydration, and training-context cues without calorie or macro targets."
    },
    target: target ? { status: "optional_range", protein: target, energy: null, carbohydrate: null } : { status: numbersAllowed ? "needs_context" : "not_used", protein: null, energy: null, carbohydrate: null },
    framework: requestedMode === "off" ? [] : mealFramework(profile),
    sessionFuel: requestedMode === "off" ? [] : sessionFuelCues(activePlan),
    constraints: {
      dietaryPattern: Array.isArray(nutrition.dietPattern) ? nutrition.dietPattern : [],
      declaredAllergies: clean(nutrition.allergiesIntolerances),
      medicalDiet: Boolean(nutrition.medicalDiet),
      cookingAccess: nutrition.cookingAccess || "not_reported",
      budget: nutrition.budget || "not_reported",
      hydration: nutrition.hydration || "not_reported",
      trackingRelationship: nutrition.trackingRelationship || "not_reported"
    },
    supplements: requestedMode === "off" ? [] : supplementReview(profile, protectedContext),
    photo: {
      enabled: photoEnabled,
      retention: "do_not_retain",
      rawImageStored: false,
      explanation: photoEnabled
        ? "A selected meal or fridge image may be analyzed for the current request. The raw image is not written to the local state file."
        : "Photo analysis is disabled by the athlete's onboarding choice."
    },
    boundaries,
    evidence: nutritionEvidence,
    modelMayOverrideSafetyOrNumberPolicy: false
  };
}

export function applyMealPolicy(meal = {}, companion) {
  if (!companion || companion.status === "off") throw new TypeError("Nutrition companion must be enabled before applying meal policy.");
  const items = Array.isArray(meal.items) ? meal.items.slice(0, 20).map((item) => ({
    name: clean(item?.name, 100) || "Unclear item",
    portion: clean(item?.portion, 100) || "portion unclear",
    confidence: Math.min(1, Math.max(0, finite(item?.confidence) ?? 0))
  })) : [];
  const declared = companion.constraints.declaredAllergies;
  const questions = Array.isArray(meal.questions) ? meal.questions.map((question) => clean(question, 240)).filter(Boolean).slice(0, 6) : [];
  if (!questions.some((question) => /ingredient|allergen|sauce|oil|portion/i.test(question))) questions.unshift("Confirm ingredients, cooking fats, sauces, and portions that the image cannot show.");
  if (declared) questions.unshift(`Confirm this meal against the declared allergy or intolerance note: ${declared}`);
  const showNumbers = companion.numberPolicy.showEnergy && companion.numberPolicy.showMacros;
  return {
    summary: clean(meal.summary, 240) || "Meal estimate",
    items,
    caloriesRange: showNumbers ? clean(meal.caloriesRange, 80) || "unclear" : null,
    proteinRange: showNumbers ? clean(meal.proteinRange, 80) || "unclear" : null,
    carbsRange: showNumbers ? clean(meal.carbsRange, 80) || "unclear" : null,
    questions: questions.slice(0, 8),
    warnings: [
      "Photo estimates cannot establish allergen safety or cross-contact safety.",
      declared ? `Declared athlete note: ${declared}` : "No allergy or intolerance note was supplied; this is not proof that none exists."
    ],
    confidence: Math.min(1, Math.max(0, finite(meal.confidence) ?? 0)),
    numberPolicy: companion.numberPolicy,
    rawImageStored: false
  };
}

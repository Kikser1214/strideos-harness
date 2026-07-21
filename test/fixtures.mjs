export function completeProfile(overrides = {}) {
  const base = {
    personal: { preferredName: "Alex", ageGroup: "30_39", units: "metric", timezone: "Europe/Skopje" },
    baseline: { activityLevel: "some_walking", runningHistory: "never", currentWeeklyKm: 0 },
    safety: {
      currentPain: false, chestPain: false, dizzinessOrFainting: false, unusualBreathlessness: false,
      recentInjuryOrSurgery: false, knownCondition: false, medicationConsideration: false, clearanceStatus: "not_needed"
    },
    goals: { primary: "couch_to_active", why: "I want more energy.", successInTwelveWeeks: "Move consistently without dreading it." },
    strength: { experience: "never", sessionsPerWeek: 0, equipment: ["none"], movementConfidence: "need_guidance", preference: "recommend_for_me" },
    schedule: { daysPerWeek: 4, preferredDays: ["monday", "wednesday", "friday", "sunday"], minutesWeekday: 30, minutesWeekend: 45, stressLevel: "moderate", surfaces: ["road", "home"] },
    data: { sources: ["none", "manual"], primarySource: "manual", historyWindow: "none", manualCheckins: true, authorizedRead: true, readTiming: "now_before_plan" },
    preferences: { trainingStyle: "recommend_for_me", intensityTolerance: "unknown", coachingTone: "adaptive", explanationDepth: "why_it_matters" },
    nutrition: { mode: "loose", numberFreePreferred: false, photoMode: true, photoRetention: "do_not_retain" },
    delivery: { dashboard: true, workoutDelivery: false, connectorSetupMode: "not_now", morningBrief: true, preWorkoutBrief: true, postWorkoutReflection: true, weeklyReview: true, approvalMode: "ask_every_time", cloudProcessing: false }
  };
  return Object.fromEntries(Object.entries(base).map(([section, values]) => [section, { ...values, ...(overrides[section] || {}) }]));
}

import "./env.mjs";
import { analyzeAthlete } from "./athlete-analysis.mjs";
import { buildAutomationSetup, runAutomationPreview } from "./automations.mjs";
import { buildDashboard } from "./dashboard.mjs";
import { garminStatus } from "./garmin.mjs";
import { buildNutritionCompanion } from "./nutrition.mjs";
import { getActivePlan, getAutomationState, getOnboarding, listCheckins, listImports, listMeals, listPlans, recentDecisions } from "./store.mjs";

const kindIndex = process.argv.indexOf("--kind");
const id = kindIndex >= 0 ? process.argv[kindIndex + 1] : null;
const onboarding = getOnboarding();

if (!onboarding?.completedAt) {
  console.log(JSON.stringify({ id, status: "needs_onboarding", summary: "Complete the athlete map before running a personal scheduled brief." }, null, 2));
  process.exitCode = 2;
} else {
  const imports = listImports();
  const checkins = listCheckins();
  const activePlan = getActivePlan();
  const analysis = analyzeAthlete({ profile: onboarding.profile, imports, checkins });
  const companion = buildNutritionCompanion({ profile: onboarding.profile, activePlan });
  const dashboard = buildDashboard({
    onboarding, analysis, activePlan, plans: listPlans(), imports, checkins,
    nutrition: { companion, meals: listMeals() }, connectors: { garmin: garminStatus() }, decisions: recentDecisions()
  });
  const setup = buildAutomationSetup({ profile: onboarding.profile, automationState: getAutomationState() });
  const task = setup.tasks.find((item) => item.id === id);
  if (!task) {
    console.log(JSON.stringify({ id, status: "invalid_kind", allowed: setup.tasks.map((item) => item.id) }, null, 2));
    process.exitCode = 2;
  } else if (!task.enabled) {
    console.log(JSON.stringify({ id, status: "disabled", summary: "This automation is off in the local StrideOS proposal settings." }, null, 2));
  } else {
    console.log(JSON.stringify({ task: { id: task.id, label: task.label, schedule: task.schedule, permissions: task.permissions }, preview: runAutomationPreview({ id, dashboard, imports, checkins }) }, null, 2));
  }
}


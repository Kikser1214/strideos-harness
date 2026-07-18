const $ = (selector) => document.querySelector(selector);
const state = {
  bootstrap: null, currentDecision: null, imageDataUrl: null, trace: 0, busy: false,
  onboardingSchema: null, onboardingConnectors: [], onboardingProfile: {}, onboardingStep: 0, onboardingAnalysis: null,
  dataSetup: null, activityFile: null, activityFileBase64: null, importPreview: null,
  planData: null, planWeek: 0, nutrition: null, dashboard: null, automationData: null
};

function escapeHtml(value = "") { return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]); }
function toast(message) { const el = $("#toast"); el.textContent = message; el.classList.add("show"); window.setTimeout(() => el.classList.remove("show"), 3200); }
async function request(url, options) { const response = await fetch(url, options); const data = await response.json().catch(() => ({})); if (!response.ok) { const error = new Error(data.error || "The request failed."); error.data = data; error.status = response.status; throw error; } return data; }
function setBusy(busy) { state.busy = busy; $("#coachInput").disabled = busy; $("#sendCoach").disabled = busy; document.querySelectorAll("[data-prompt]").forEach((button) => { button.disabled = busy; }); }

const dashboardStatusLabels = {
  needs_onboarding: "Athlete setup needed",
  safety_stop: "Safety review",
  awaiting_approval: "Approval needed",
  review_required: "Plan review needed",
  ready: "Ready"
};

function formatDashboardDate(value) {
  if (!value) return "No session date";
  const date = new Date(`${value}T12:00:00`);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat(undefined, { weekday: "long", month: "short", day: "numeric" }).format(date) : value;
}

function renderDashboard(dashboard) {
  if (!dashboard) return;
  state.dashboard = dashboard;
  const statusLabel = dashboardStatusLabels[dashboard.status] || humanize(dashboard.status);
  const attention = ["safety_stop", "awaiting_approval", "review_required"].includes(dashboard.status);
  const signalWord = dashboard.status === "needs_onboarding" ? "SETUP" : dashboard.status === "safety_stop" ? "STOP" : dashboard.status === "review_required" ? "REVIEW" : dashboard.status === "awaiting_approval" ? "PLAN" : "READY";
  const pain = dashboard.recovery?.pain;
  const evidenceStatus = dashboard.sources?.status || "unknown";
  const observedDistance = Number(dashboard.week?.observedDistanceKm || 0);
  const observedCount = Number(dashboard.week?.observedActivities || 0);
  const plannedSessions = Number(dashboard.week?.plannedSessions || 0);
  const plannedMinutes = Number(dashboard.week?.plannedMinutes || 0);
  const plannedStrength = Number(dashboard.week?.plannedStrength || 0);
  const loggedMeals = Number(dashboard.fuel?.loggedMeals || 0);

  $("#readinessValue").textContent = signalWord;
  $("#readinessValue").classList.add("status-word");
  $("#readinessUnit").textContent = statusLabel;
  $("#signalTitle").textContent = dashboard.today?.date === dashboard.date ? "TODAY" : dashboard.today?.date ? "NEXT ACTIVE DAY" : "CURRENT STATE";
  $("#signalOneLabel").textContent = "Plan";
  $("#sleepValue").textContent = humanize(dashboard.plan?.status || "unavailable");
  $("#signalTwoLabel").textContent = dashboard.goal?.label || "Goal";
  $("#hrvValue").textContent = dashboard.goal?.value || "Not set";
  $("#signalThreeLabel").textContent = "Pain";
  $("#painValue").textContent = pain === null || pain === undefined ? "No check-in" : `${pain}/10`;
  $("#signalFourLabel").textContent = "Evidence";
  $("#rpeValue").textContent = humanize(evidenceStatus);
  $("#instrumentNote").innerHTML = `<span></span> ${escapeHtml(dashboard.explanation)}`;

  $("#dashboardStatusCard").dataset.state = attention ? "attention" : dashboard.status === "ready" ? "ready" : "empty";
  $("#dashboardStatus").textContent = statusLabel;
  $("#dashboardExplanation").textContent = dashboard.explanation;
  $("#dashboardRecovery").textContent = humanize(dashboard.recovery?.status || "unknown");
  $("#dashboardRecoveryNote").textContent = pain === null || pain === undefined ? "No current pain check-in." : `Pain ${pain}/10${dashboard.recovery.rpe === null || dashboard.recovery.rpe === undefined ? "" : ` / RPE ${dashboard.recovery.rpe}`}.`;
  $("#dashboardWeek").textContent = dashboard.week?.number ? `Week ${dashboard.week.number} / ${plannedMinutes} min` : "No active week";
  $("#dashboardWeekNote").textContent = dashboard.week?.number ? `${plannedSessions} planned sessions / ${plannedStrength} strength.` : "Planned work appears only after approval.";
  $("#dashboardObserved").textContent = `${observedCount} activit${observedCount === 1 ? "y" : "ies"}`;
  $("#dashboardObservedNote").textContent = `${observedDistance.toFixed(1)} km observed. Never auto-matched to plan completion.`;
  $("#dashboardFuel").textContent = humanize(dashboard.fuel?.mode || "off");
  $("#dashboardFuelNote").textContent = `${loggedMeals} confirmed meal${loggedMeals === 1 ? "" : "s"} / optional support.`;
  $("#dashboardFreshness").textContent = humanize(evidenceStatus);
  $("#dashboardFreshnessNote").textContent = dashboard.sources?.explanation || "No source loaded.";

  $(".today-panel").dataset.state = dashboard.today?.state || dashboard.status;
  $("#dashboardDate").textContent = `${formatDashboardDate(dashboard.today?.date || dashboard.date)}${dashboard.week?.number ? ` / Week ${dashboard.week.number}` : ""}`;
  $("#workoutName").textContent = dashboard.today?.title || "No current recommendation";
  $("#distanceValue").textContent = dashboard.today?.primaryMetric || "-";
  $("#workoutUnit").textContent = dashboard.today?.primaryUnit || "";
  $("#workoutTarget").textContent = dashboard.today?.target || dashboard.today?.explanation || "No recommendation available.";
  $("#weekPlanned").textContent = dashboard.week?.number ? `${plannedMinutes} min / ${plannedSessions} sessions` : "No approved block";
  $("#weekCompleted").textContent = `${observedCount} activit${observedCount === 1 ? "y" : "ies"} / ${observedDistance.toFixed(1)} km`;
  $("#goalLabel").textContent = dashboard.goal?.label || "Goal";
  $("#daysToRace").textContent = dashboard.goal?.value || "Not set";
  $("#calendarStatus").textContent = dashboard.sources?.primary || "No evidence source";
  $("#connectorNote").textContent = dashboard.connector?.configured
    ? `${dashboard.connector.label}. External writes still require the rule gate and athlete approval.`
    : `${dashboard.connector?.label || "No wearable bridge"}. Files and manual check-ins remain available; no external write is implied.`;
  $("#sourceButtonNote").textContent = dashboard.sources?.signals?.length ? `${dashboard.sources.signals.length} visible signal${dashboard.sources.signals.length === 1 ? "" : "s"} / ${humanize(evidenceStatus)}` : "Files + manual check-ins available";
}

async function refreshDashboard() {
  const result = await request("/api/dashboard");
  renderDashboard(result.dashboard);
  if (state.bootstrap) state.bootstrap.dashboard = result.dashboard;
  return result.dashboard;
}

function renderBootstrap(data) {
  state.bootstrap = data;
  $("#modeLabel").textContent = data.mode === "live" ? "GPT-5.6 live reasoning" : "Transparent demo mode";
  $("#modelLabel").textContent = data.model;
  $("#traceMode").textContent = data.mode === "live" ? "● LIVE MODEL" : "● DEMO TRACE";
  renderDashboard(data.dashboard);
  const personalDashboard = !data.needsOnboarding;
  $("#consoleDisclosure").textContent = data.mode === "live"
    ? "GPT-5.6 receives only the personal context permitted in Athlete setup; the deterministic harness still controls actions."
    : personalDashboard
      ? "Deterministic demo reasoning now uses your local athlete dashboard. No personal context is sent to OpenAI and external writes remain simulated."
      : "The no-setup judge path uses labeled synthetic data. Complete Athlete setup for personal local demo reasoning, or add an OpenAI key for GPT-5.6.";
  $("#initialMessageMode").textContent = personalDashboard ? "Personal local dashboard · no external writes" : "Synthetic athlete · no external writes";
  $("#initialMessageText").textContent = personalDashboard
    ? "Ask about today to reason from the approved plan, recovery, and source freshness. Demo mode stays local and Garmin writes remain simulated."
    : "This workspace starts safely: ask a question to create a labeled synthetic decision trace. Garmin writes are simulated.";
  $("#openOnboarding").textContent = data.needsOnboarding ? "Athlete setup" : "Athlete setup ✓";
  updatePlanEntry(data.training);
  state.automationData = data.automations;
  updateAutomationEntry(data.automations);
  state.nutrition = data.nutrition;
  updateFuelEntry(data.nutrition);
  if (data.decisions.length) { state.trace = data.decisions.length; renderLedger(data.decisions[0], { restored: true }); } else renderEmptyLedger();
}

function addMessage(role, html, extraClass = "") { const article = document.createElement("div"); article.className = `message ${role} ${extraClass}`; article.innerHTML = html; $("#conversation").append(article); $("#conversation").scrollTop = $("#conversation").scrollHeight; return article; }
function renderEmptyLedger() { state.currentDecision = null; $("#traceId").textContent = "NO TRACE"; $("#ledger").innerHTML = `<div class="empty-ledger"><strong>Ask the coach to create a trace.</strong><p>Evidence, the rule gate, and any proposed action will appear here.</p></div>`; $("#approvalCard").hidden = true; $("#mealConfirmation").hidden = true; }

function renderLedger(decision, { restored = false } = {}) {
  state.currentDecision = decision; if (!restored) state.trace += 1; $("#traceId").textContent = `TRACE ${String(state.trace || 1).padStart(3, "0")}`;
  const isStop = decision.status === "stopped"; const isAuto = decision.status === "completed"; const isResolved = ["approved", "declined"].includes(decision.status); const evidence = decision.evidence.map(escapeHtml).join(" · ");
  const gateLabel = decision.gate.mode === "confirm" ? "Approval boundary reached" : decision.gate.mode === "stop" ? "Safety stop triggered" : "Autonomous action allowed";
  let actionTitle = isStop ? "Action stopped" : isAuto ? "Action completed" : "Waiting for the athlete"; let actionDetail = decision.gate.action.replaceAll("_", " ");
  if (decision.status === "approved") { actionTitle = decision.result?.message || "Action approved"; actionDetail = decision.result?.simulated ? "Simulation only — no external calendar changed." : "Recorded and completed."; }
  if (decision.status === "declined") { actionTitle = "Action declined"; actionDetail = "Nothing changed."; }
  $("#ledger").innerHTML = `<article class="ledger-step complete"><span>1</span><div><small>EVIDENCE</small><strong>${decision.evidence.length} signal${decision.evidence.length === 1 ? "" : "s"} loaded</strong><p>${evidence}</p></div><b>✓</b></article><article class="ledger-step complete"><span>2</span><div><small>REASON</small><strong>Proposal grounded in athlete data</strong><p>No unsupported metric was introduced.</p></div><b>✓</b></article><article class="ledger-step ${isAuto || isResolved ? "complete" : "active"}"><span>3</span><div><small>RULE GATE</small><strong>${gateLabel}</strong><p>${escapeHtml(decision.gate.reason)}</p></div><b>${isStop ? "×" : isAuto || isResolved ? "✓" : "!"}</b></article><article class="ledger-step ${isAuto || isResolved ? "complete" : "waiting"}"><span>4</span><div><small>ACTION</small><strong>${escapeHtml(actionTitle)}</strong><p>${escapeHtml(actionDetail)}</p></div><b>${isAuto || decision.status === "approved" ? "✓" : decision.status === "declined" || isStop ? "×" : "…"}</b></article>`;
  $("#proposalText").textContent = decision.proposal; $("#approvalCard").hidden = decision.status !== "awaiting_approval";
  const mealApproval = decision.status === "awaiting_approval" && decision.gate.action === "log_food" && decision.resource?.type === "meal_draft";
  $("#mealConfirmation").hidden = !mealApproval;
  if (!mealApproval) $("#mealCorrections").value = "";
  if (decision.status === "awaiting_approval") $("#approveDecision").textContent = mealApproval ? "Confirm and log" : state.bootstrap?.connectors.garmin.configured || decision.gate.action !== "push_garmin_workout" ? "Approve action" : "Approve simulation";
}

async function sendCoachMessage(message) {
  if (state.busy) return; setBusy(true); addMessage("user", `<p>${escapeHtml(message)}</p>`); const pending = addMessage("assistant", "<p>Reading the signals and checking the action boundary…</p>");
  try { const result = await request("/api/coach", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message }) }); pending.remove(); const modeNote = result.mode === "live" ? "" : `<small class="message-mode">Deterministic demo response</small>`; addMessage("assistant", `${modeNote}<p>${escapeHtml(result.decision.proposal)}</p><button class="inline-action" data-scroll="ledger">See why →</button>`); renderLedger(result.decision); toast(result.mode === "live" ? "Reasoned live with GPT-5.6" : "Demo trace created and saved"); }
  catch (error) { pending.classList.add("error"); pending.innerHTML = `<p>${escapeHtml(error.message)}</p>`; } finally { setBusy(false); }
}

$("#coachForm").addEventListener("submit", (event) => { event.preventDefault(); const input = $("#coachInput"); const message = input.value.trim(); if (!message) return; input.value = ""; sendCoachMessage(message); });
document.addEventListener("click", (event) => { const prompt = event.target.closest("[data-prompt]"); if (prompt) sendCoachMessage(prompt.dataset.prompt); const scroll = event.target.closest("[data-scroll]"); if (scroll) document.getElementById(scroll.dataset.scroll)?.scrollIntoView({ behavior: "smooth", block: "center" }); });

$("#approveDecision").addEventListener("click", async () => {
  if (!state.currentDecision) return toast("Create a trace before approving an action.");
  try {
    const action = state.currentDecision.gate.action;
    const approval = { id: state.currentDecision.id };
    if (action === "log_food" && state.currentDecision.resource?.type === "meal_draft") approval.mealConfirmation = { confirmed: true, corrections: $("#mealCorrections").value };
    const result = await request("/api/decisions/approve", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(approval) });
    renderLedger(result.decision, { restored: true });
    if (action === "change_training_plan") await refreshPlanData(false);
    if (action === "log_food") await refreshNutrition(false);
    if (!['change_training_plan', 'log_food'].includes(action)) await refreshDashboard();
    toast(result.result);
  } catch (error) { toast(error.message); }
});
$("#declineDecision").addEventListener("click", async () => {
  if (!state.currentDecision) return;
  try {
    const action = state.currentDecision.gate.action;
    const result = await request("/api/decisions/decline", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: state.currentDecision.id }) });
    renderLedger(result.decision, { restored: true });
    if (action === "change_training_plan") await refreshPlanData(false);
    if (action === "log_food") await refreshNutrition(false);
    if (!['change_training_plan', 'log_food'].includes(action)) await refreshDashboard();
    toast(result.result);
  } catch (error) { toast(error.message); }
});

function updateFuelEntry(data = state.nutrition) {
  const companion = data?.companion;
  const logged = data?.meals?.filter((meal) => meal.status === "logged").length || 0;
  $("#fuelButtonTitle").textContent = companion?.status === "off" ? "Fuel support off" : companion?.effectiveMode === "number_free" ? "Number-free fuel" : "Fuel companion";
  $("#fuelButtonNote").textContent = state.bootstrap?.needsOnboarding
    ? "Complete setup to choose support"
    : !companion
      ? "Optional guidance + meal photos"
      : companion.status === "off"
        ? "Enable later in Athlete setup"
        : `${humanize(companion.effectiveMode)} · ${logged} confirmed estimate${logged === 1 ? "" : "s"}`;
}

function renderMealHistory(meals = []) {
  const visible = meals.filter((meal) => ["logged", "awaiting_confirmation", "declined", "stale"].includes(meal.status));
  $("#mealHistory").innerHTML = visible.length ? visible.map((meal) => `<article class="meal-record ${escapeHtml(meal.status)}">
    <i></i><div><strong>${escapeHtml(meal.estimate?.summary || "Meal estimate")}</strong><p>${escapeHtml(humanize(meal.status))} · ${escapeHtml(new Date(meal.confirmedAt || meal.createdAt).toLocaleDateString())}${meal.corrections ? ` · ${escapeHtml(meal.corrections)}` : ""}</p></div>
    <button type="button" data-delete-meal="${escapeHtml(meal.id)}">Delete</button>
  </article>`).join("") : `<div class="empty-data"><strong>No local fuel records</strong><p>A photo estimate appears here only after analysis; it becomes logged athlete data only after confirmation.</p></div>`;
}

function renderNutrition(data) {
  state.nutrition = data;
  updateFuelEntry(data);
  const companion = data.companion;
  if (companion.status === "off") {
    $("#fuelState").hidden = false;
    $("#fuelState").className = "fuel-state error";
    $("#fuelState").innerHTML = `<span>Nutrition support is off</span><strong>Your training plan works without food tracking.</strong><p>Enable loose, guided, detailed, or number-free support later in Athlete setup.</p>`;
    $("#fuelOverview").hidden = true;
    return;
  }
  $("#fuelState").hidden = true;
  $("#fuelOverview").hidden = false;
  const target = companion.target.protein?.range || (companion.numberPolicy.numberFree ? "No numeric target" : "Food-first baseline");
  $("#fuelSummary").innerHTML = `
    <div><small>Support mode</small><strong>${escapeHtml(humanize(companion.effectiveMode))}</strong><p>${escapeHtml(humanize(companion.goal))}</p></div>
    <div><small>Numbers</small><strong>${companion.numberPolicy.showMacros ? "Visible ranges" : "Hidden"}</strong><p>${escapeHtml(companion.numberPolicy.explanation)}</p></div>
    <div><small>Planning anchor</small><strong>${escapeHtml(target)}</strong><p>${companion.target.protein ? escapeHtml(companion.target.protein.basis) : "No generic calorie target is calculated."}</p></div>
    <div><small>Meal photos</small><strong>${companion.photo.enabled ? "Optional" : "Disabled"}</strong><p>Raw image stored: no · ${escapeHtml(humanize(companion.photo.retention))}</p></div>`;
  $("#fuelFramework").innerHTML = companion.framework.map((item) => `<div class="fuel-card"><strong>${escapeHtml(item.label)}</strong><p>${escapeHtml(item.cue)}</p>${item.examples.length ? `<small>${item.examples.map(escapeHtml).join(" · ")}</small>` : ""}</div>`).join("");
  $("#fuelSessionCues").innerHTML = companion.sessionFuel.map((item) => `<div class="fuel-card"><strong>${escapeHtml(item.label)}</strong><p>${escapeHtml(item.cue)}</p></div>`).join("");
  $("#supplementReview").innerHTML = companion.supplements.map((item) => `<div class="supplement-item"><span>No automatic prescription</span><strong>${escapeHtml(humanize(item.id))} · ${escapeHtml(humanize(item.reportedUse))}</strong><p>${escapeHtml(item.guidance)}</p></div>`).join("");
  $("#fuelBoundaries").innerHTML = companion.boundaries.map((boundary) => `<li>${escapeHtml(boundary)}</li>`).join("");
  $("#photoAnalyzer").hidden = !companion.photo.enabled;
  $("#photoPolicy").textContent = companion.photo.explanation;
  renderMealHistory(data.meals);
}

async function refreshNutrition(render = true) {
  const data = await request("/api/nutrition");
  state.nutrition = data;
  updateFuelEntry(data);
  if (render) renderNutrition(data);
  await refreshDashboard();
  return data;
}

async function openFoodDialog() {
  if (state.bootstrap?.needsOnboarding) return openAthleteSetup({ firstRun: false });
  $("#foodDialog").showModal();
  $("#fuelState").hidden = false;
  $("#fuelState").className = "fuel-state";
  $("#fuelState").innerHTML = "<span>Loading</span><strong>Reading your nutrition choices…</strong>";
  $("#fuelOverview").hidden = true;
  try { await refreshNutrition(true); }
  catch (error) { $("#fuelState").className = "fuel-state error"; $("#fuelState").innerHTML = `<span>Could not load</span><strong>${escapeHtml(error.message)}</strong>`; }
}
$("#openFood").addEventListener("click", openFoodDialog); $("#quickFood").addEventListener("click", openFoodDialog);
$("#foodImage").addEventListener("change", (event) => { const file = event.target.files?.[0]; if (!file) return; if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return toast("Choose a PNG, JPG, or WEBP image."); if (file.size > 8_000_000) return toast("Choose an image smaller than 8 MB."); const reader = new FileReader(); reader.addEventListener("load", () => { state.imageDataUrl = reader.result; $("#foodPreview").src = reader.result; $("#dropZone").classList.add("has-image"); $("#mealResult").hidden = true; }); reader.readAsDataURL(file); });
$("#analyzeFood").addEventListener("click", async () => {
  if (!state.imageDataUrl) return toast("Choose a meal photo first."); const button = $("#analyzeFood"); button.disabled = true; button.textContent = "Checking image + rules…";
  try {
    const result = await request("/api/food", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ imageDataUrl: state.imageDataUrl, note: $("#foodNote").value }) });
    const meal = result.meal;
    state.nutrition = { companion: result.companion, meals: [result.draft, ...(state.nutrition?.meals || []).filter((item) => item.id !== result.draft.id)] };
    updateFuelEntry(state.nutrition);
    renderMealHistory(state.nutrition.meals);
    const ranges = meal.caloriesRange ? `<div class="meal-macros"><div><span>Energy</span><strong>${escapeHtml(meal.caloriesRange)}</strong></div><div><span>Protein</span><strong>${escapeHtml(meal.proteinRange)}</strong></div><div><span>Carbs</span><strong>${escapeHtml(meal.carbsRange)}</strong></div></div>` : `<p class="estimate-warning"><strong>Number-free display:</strong> foods, portions, uncertainty, and questions are shown without calorie or macro ranges.</p>`;
    $("#mealResult").hidden = false;
    $("#mealResult").innerHTML = `${result.disclosure ? `<p class="demo-disclosure"><strong>Demo disclosure:</strong> ${escapeHtml(result.disclosure)}</p>` : ""}<h3>${escapeHtml(meal.summary)}</h3><p>${meal.items.map((item) => `${escapeHtml(item.name)} — ${escapeHtml(item.portion)}`).join(" · ")}</p>${ranges}<ul>${meal.warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}</ul><p><strong>Confirm before logging:</strong> ${meal.questions.map(escapeHtml).join(" ")}</p><button type="button" class="approve" id="reviewMeal">Review and correct in the decision ledger →</button>`;
    $("#reviewMeal").addEventListener("click", () => { renderLedger(result.decision); $("#foodDialog").close(); $("#ledger").scrollIntoView({ behavior: "smooth", block: "center" }); });
    toast(result.mode === "live" ? "Meal analyzed by GPT-5.6" : "Demo sample ready — image not inspected");
  }
  catch (error) { toast(error.message); } finally { button.disabled = false; button.textContent = "Analyze with the harness"; }
});

$("#mealHistory").addEventListener("click", async (event) => {
  const button = event.target.closest("[data-delete-meal]");
  if (!button) return;
  try { await request(`/api/meals/${encodeURIComponent(button.dataset.deleteMeal)}`, { method: "DELETE" }); await refreshNutrition(true); toast("Local meal record deleted"); }
  catch (error) { toast(error.message); }
});

const optionLabels = {
  "18_29": "18–29", "30_39": "30–39", "40_49": "40–49", "50_59": "50–59", "60_69": "60–69", "70_plus": "70+",
  "5k": "5K", "10k": "10K", "half_marathon": "Half marathon", "barbell_rack": "Barbell + rack",
  hrv: "HRV", gpx: "GPX", tcx: "TCX", csv: "CSV", ios_companion: "iOS companion", android_companion: "Android companion",
  apple_health: "Apple Health / Watch", health_connect: "Android Health Connect", file_import: "FIT / GPX / TCX / CSV",
  recommend_for_me: "Recommend for me", norwegian_inspired: "Norwegian-inspired", run_walk: "Run / walk", number_free: "Number-free support",
  couch_to_active: "Couch to active", body_composition_support: "Body-composition support", return_to_running: "Return to running",
  prefer_not_to_say: "Prefer not to say", do_not_use: "Do not use it", context_only: "Context only", track_trend: "Track the trend",
  support_change: "Support a change", not_applicable: "Not applicable", not_needed: "Not needed", not_sure: "Not sure",
  comfortable_with_numbers: "Comfortable with numbers", prefer_no_numbers: "Prefer no numbers", previous_or_current_concern: "Past or current concern", clinician_guided: "Clinician-guided",
  completed_no_followup: "Completed — no follow-up", followup_indicated: "Follow-up indicated", prefer_later: "Prefer to do it later",
  fixed_event: "Fixed event", no_deadline: "No deadline", currentPain: "Current pain", full_gym: "Full gym",
  need_guidance: "I need guidance", some_confidence: "Some confidence", coach_supervised: "Coach supervised",
  runner_resilience: "Runner resilience", muscle_gain: "Muscle gain", minimal_maintenance: "Minimal maintenance",
  manual_work: "Physical work", yoga_mobility: "Yoga / mobility", regular_unstructured: "Regular, unstructured",
  structured_training: "Structured training", some_walking: "Some walking", mostly_inactive: "Mostly inactive",
  inconsistent_training: "Inconsistent training", under_3_months: "Under 3 months", "3_to_12_months": "3–12 months", over_1_year: "Over 1 year",
  general_health: "General health", finish_race: "Finish a race", race_performance: "Race performance", time_goal: "Time goal",
  full_kitchen: "Full kitchen", mostly_prepared_food: "Mostly prepared food", training_fuel: "Training fuel",
  rarely_track: "Rarely think about it", ask_every_time: "Ask every time", ask_for_plan_and_writes: "Ask for plans and external writes",
  read_only: "Read-only coaching", do_not_retain: "Do not retain", retain_local: "Retain locally", ask_each_time: "Ask each time",
  easy_volume: "Easy-volume first", pace_based: "Pace-based", trail_hills: "Trail / hills", custom_research: "Research a custom method",
  avoid_for_now: "Avoid for now", recover_poorly: "I recover poorly", why_it_matters: "Explain why it matters", deep_dive: "Deep dive",
  manual: "Manual check-ins", none: "No device", "4_weeks": "4 weeks", "12_weeks": "12 weeks", "6_months": "6 months", "1_year": "1 year",
  do_not_retain: "Do not retain"
};

function humanize(value) {
  if (optionLabels[value]) return optionLabels[value];
  return String(value).replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function updatePlanEntry(training = state.planData) {
  const active = training?.activePlan;
  const pending = training?.proposals?.find((plan) => plan.status === "awaiting_approval");
  $("#planButtonTitle").textContent = active ? "Active training block" : pending ? "Plan awaiting approval" : "Training plan";
  $("#planButtonNote").textContent = active
    ? `${active.startDate} → ${active.endDate} · ${humanize(active.path)}`
    : pending
      ? `${pending.startDate} · decision ledger ready`
      : state.bootstrap?.needsOnboarding ? "Complete setup to build a proposal" : "Four-week running + strength proposal";
  $("#openPlan").textContent = active ? "Plan active ✓" : pending ? "Plan pending" : "Training plan";
}

function shortPlanDate(value) {
  const [year, month, day] = String(value).split("-");
  return year && month && day ? `${day}.${month}` : value;
}

function sessionSummary(session) {
  const effort = session.intensity?.rpe ? ` · RPE ${session.intensity.rpe}` : "";
  return `${session.durationMinutes ? `${session.durationMinutes} min` : "No session"}${effort}`;
}

function renderPlanWeek(index) {
  const plan = state.planData?.preview;
  const week = plan?.weeks?.[index];
  if (!week) return;
  state.planWeek = index;
  document.querySelectorAll("[data-plan-week]").forEach((button) => button.classList.toggle("active", Number(button.dataset.planWeek) === index));
  const days = week.days.map((day) => `<article class="plan-day">
    <b>${escapeHtml(day.day.slice(0, 3))}</b>
    <div><small>${escapeHtml(day.day)}</small><strong>${escapeHtml(shortPlanDate(day.date))}</strong></div>
    <div class="day-sessions">${day.sessions.map((session) => `<div class="plan-session" data-type="${escapeHtml(session.type)}"><small>${escapeHtml(humanize(session.type))}</small><strong>${escapeHtml(session.title)}</strong><p>${escapeHtml(sessionSummary(session))}. ${escapeHtml(session.explanation)}</p></div>`).join("")}</div>
  </article>`).join("");
  $("#planWeek").innerHTML = `<header class="plan-week-head"><strong>Week ${week.week}${week.recoveryWeek ? " · recovery" : ""}</strong><p>${escapeHtml(week.explanation)}</p></header><div class="plan-days">${days}</div>`;
}

function renderTrainingPlan(data) {
  state.planData = data;
  updatePlanEntry(data);
  const plan = data.preview;
  if (plan.status === "blocked") {
    $("#planState").hidden = false;
    $("#planState").className = "plan-state error";
    $("#planState").innerHTML = `<span>Plan held by the rules</span><strong>${escapeHtml(plan.explanation)}</strong>`;
    $("#planOverview").hidden = true;
    return;
  }
  $("#planState").hidden = true;
  $("#planOverview").hidden = false;
  const active = data.activePlan?.id === plan.id;
  const pending = data.proposals?.find((item) => item.id === plan.id && item.status === "awaiting_approval");
  $("#planSummary").innerHTML = `
    <div><small>${active ? "Active block" : pending ? "Awaiting approval" : "Draft proposal"}</small><strong>${escapeHtml(humanize(plan.path))}</strong><p>${escapeHtml(plan.explanation)}</p></div>
    <div><small>Window</small><strong>${escapeHtml(shortPlanDate(plan.startDate))} → ${escapeHtml(shortPlanDate(plan.endDate))}</strong><p>Four weeks</p></div>
    <div><small>Starting stage</small><strong>${escapeHtml(humanize(plan.stage))}</strong><p>${escapeHtml(plan.confidence.label)} confidence</p></div>
    <div><small>Weekly frame</small><strong>${plan.frequency.runs} run · ${plan.frequency.strength} strength</strong><p>${plan.frequency.availableDays} realistic days</p></div>
    <div><small>Method baseline</small><strong>${escapeHtml(humanize(plan.method.selectedBaseline))}</strong><p>${plan.method.researchRequired ? "Research gate active" : "Deterministic baseline"}</p></div>`;
  $("#planWeekTabs").innerHTML = plan.weeks.map((week, index) => `<button type="button" data-plan-week="${index}"><small>${week.recoveryWeek ? "Reduced load" : `${week.activeMinutes} active min`}</small><strong>Week ${week.week} · ${escapeHtml(shortPlanDate(week.startDate))}</strong></button>`).join("");
  $("#progressionRules").innerHTML = plan.progressionRules.map((item) => `<li><strong>${escapeHtml(item.rule)}</strong><br />${escapeHtml(item.explanation)}</li>`).join("");
  $("#adaptationRules").innerHTML = plan.adaptationRules.map((item) => `<li><strong>${escapeHtml(humanize(item.trigger))}:</strong> ${escapeHtml(item.action)}</li>`).join("");
  $("#methodResearch").innerHTML = `<strong>${plan.method.researchRequired ? "Research gate active" : "Method baseline selected"}</strong><p>${escapeHtml(plan.method.explanation)}</p>`;
  $("#planApprovalNote").textContent = active ? "This exact block is active." : pending ? "This exact block is waiting in the decision ledger." : plan.approval.explanation;
  $("#proposePlan").disabled = active || Boolean(pending) || plan.approval.status !== "required";
  $("#proposePlan").textContent = active ? "Plan is active" : pending ? "Awaiting approval" : plan.approval.status === "disabled" ? "Read-only mode" : "Send plan to approval";
  renderPlanWeek(Math.min(state.planWeek, plan.weeks.length - 1));
}

async function refreshPlanData(render = true) {
  const data = await request("/api/training-plan");
  state.planData = data;
  updatePlanEntry(data);
  if (render) renderTrainingPlan(data);
  await refreshDashboard();
  return data;
}

async function openTrainingPlan() {
  $("#planDialog").showModal();
  $("#planState").hidden = false;
  $("#planState").className = "plan-state";
  $("#planState").innerHTML = "<span>Loading</span><strong>Building the conservative baseline…</strong>";
  $("#planOverview").hidden = true;
  try { await refreshPlanData(true); }
  catch (error) {
    $("#planDialog").close();
    if (error.status === 409) { toast(error.message); openAthleteSetup({ firstRun: false }); }
    else toast(error.message);
  }
}

$("#openPlan").addEventListener("click", openTrainingPlan);
$("#openPlanPanel").addEventListener("click", openTrainingPlan);
$("#closePlanDialog").addEventListener("click", () => $("#planDialog").close());
$("#planDialog").addEventListener("click", (event) => { if (event.target === $("#planDialog")) $("#planDialog").close(); });
$("#planWeekTabs").addEventListener("click", (event) => { const button = event.target.closest("[data-plan-week]"); if (button) renderPlanWeek(Number(button.dataset.planWeek)); });
$("#proposePlan").addEventListener("click", async () => {
  const button = $("#proposePlan");
  button.disabled = true;
  button.textContent = "Creating approval trace…";
  try {
    const result = await request("/api/training-plan/proposals", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ startDate: state.planData.preview.startDate }) });
    state.planData.proposals = [result.plan, ...(state.planData.proposals || []).filter((plan) => plan.id !== result.plan.id)];
    renderLedger(result.decision);
    updatePlanEntry(state.planData);
    await refreshDashboard();
    $("#planDialog").close();
    $("#ledger").scrollIntoView({ behavior: "smooth", block: "center" });
    toast("Plan proposal added to the approval ledger");
  } catch (error) { toast(error.message); button.disabled = false; button.textContent = "Send plan to approval"; }
});

function onboardingSteps() {
  if (!state.onboardingSchema) return [];
  return [...state.onboardingSchema.sections, { id: "review", title: "Your starting map", description: "Review what StrideOS understood before it creates a dashboard or proposes a schedule.", fields: [] }];
}

function onboardingValue(sectionId, fieldId) {
  return state.onboardingProfile?.[sectionId]?.[fieldId];
}

function answered(value) {
  return value !== undefined && value !== null && value !== "" && (!Array.isArray(value) || value.length > 0);
}

function sectionProgress(section) {
  const required = section.fields.filter((field) => field.required);
  const complete = required.filter((field) => answered(onboardingValue(section.id, field.id))).length;
  return { complete, required: required.length, done: required.length === 0 || complete === required.length };
}

function totalOnboardingProgress() {
  const fields = state.onboardingSchema.sections.flatMap((section) => section.fields.filter((field) => field.required).map((field) => [section.id, field.id]));
  const complete = fields.filter(([sectionId, fieldId]) => answered(onboardingValue(sectionId, fieldId))).length;
  return Math.round((complete / fields.length) * 100);
}

function renderOnboardingNav() {
  const steps = onboardingSteps();
  const percent = totalOnboardingProgress();
  $("#onboardingProgress").textContent = `${percent}% mapped`;
  $("#onboardingProgressBar").style.width = `${percent}%`;
  $("#onboardingNav").innerHTML = steps.map((step, index) => {
    const progress = step.id === "review" ? { done: percent === 100 } : sectionProgress(step);
    const status = index === state.onboardingStep ? "active" : progress.done ? "done" : "";
    return `<button class="map-step ${status}" type="button" data-onboarding-step="${index}" ${index === state.onboardingStep ? 'aria-current="step"' : ""}><b>${String(index + 1).padStart(2, "0")}</b><span>${escapeHtml(step.title)}</span><small>${progress.done ? "READY" : ""}</small></button>`;
  }).join("");
}

function fieldHint(section, field) {
  if (section.id === "safety" && field.id === "parqStatus") return 'Use the current official form at <a href="https://eparmedx.com/" target="_blank" rel="noreferrer">ePARmed-X+ ↗</a>.';
  if (section.id === "strength" && field.id === "experience") return "Strength is part of the recommendation even when you have never lifted before.";
  if (section.id === "data" && field.id === "sources") return "Apple Health and Health Connect need native companion apps. Garmin needs bridge setup. Manual check-ins work now.";
  if (section.id === "preferences" && field.id === "trainingStyle") return "New to training methods? Keep Recommend for me. A starter will normally begin with three separated run / walk sessions, two short technique-first strength sessions, and optional easy cycling when it fits.";
  if (section.id === "nutrition" && field.id === "supplements") return "Include product, dose, and timing when known. StrideOS reviews context; it does not assume a supplement is needed.";
  if (section.id === "delivery" && ["morningBrief", "preWorkoutBrief", "postWorkoutReflection", "weeklyReview"].includes(field.id)) return "This proposes a schedule only. Nothing is created until you test the prompt and create it in Scheduled.";
  return "";
}

function fieldMarkup(section, field) {
  const value = onboardingValue(section.id, field.id);
  const name = `${section.id}.${field.id}`;
  const inputId = `onboarding-${section.id}-${field.id}`;
  const required = field.required ? '<span class="required-dot" aria-label="required">●</span>' : "";
  const hint = fieldHint(section, field);
  const wide = ["textarea", "multi"].includes(field.type) || ["sources", "preferredDays", "surfaces", "equipment"].includes(field.id);
  let control = "";

  if (field.type === "boolean") {
    control = `<fieldset><legend>${escapeHtml(field.label)}${required}</legend><div class="choice-grid"><label class="choice-card"><input type="radio" name="${name}" value="true" ${value === true ? "checked" : ""}>Yes</label><label class="choice-card"><input type="radio" name="${name}" value="false" ${value === false ? "checked" : ""}>No</label></div></fieldset>`;
  } else if (field.type === "multi") {
    const selected = Array.isArray(value) ? value : [];
    control = `<fieldset><legend>${escapeHtml(field.label)}${required}</legend><div class="choice-grid multi-grid">${field.options.map((option) => { const label = section.id === "strength" && field.id === "equipment" && option === "none" ? "No equipment" : humanize(option); return `<label class="choice-card"><input type="checkbox" name="${name}" value="${escapeHtml(option)}" ${selected.includes(option) ? "checked" : ""}>${escapeHtml(label)}</label>`; }).join("")}</div></fieldset>`;
  } else if (field.type === "single") {
    control = `<label for="${inputId}">${escapeHtml(field.label)}${required}</label><select id="${inputId}" name="${name}"><option value="">Choose one</option>${field.options.map((option) => `<option value="${escapeHtml(option)}" ${value === option ? "selected" : ""}>${escapeHtml(humanize(option))}</option>`).join("")}</select>`;
  } else if (field.type === "textarea") {
    control = `<label for="${inputId}">${escapeHtml(field.label)}${required}</label><textarea id="${inputId}" name="${name}" ${field.maxLength ? `maxlength="${field.maxLength}"` : ""}>${escapeHtml(value || "")}</textarea>`;
  } else {
    const type = field.type === "timezone" ? "text" : field.type;
    control = `<label for="${inputId}">${escapeHtml(field.label)}${required}</label><input id="${inputId}" name="${name}" type="${type}" value="${escapeHtml(value ?? "")}" ${field.min !== undefined ? `min="${field.min}"` : ""} ${field.max !== undefined ? `max="${field.max}"` : ""} ${field.maxLength ? `maxlength="${field.maxLength}"` : ""}>`;
  }
  return `<div class="onboarding-field ${wide ? "wide" : ""}" data-field="${field.id}">${control}${hint ? `<p class="field-hint">${hint}</p>` : ""}</div>`;
}

function showOnboardingNotice(message) {
  const notice = $("#onboardingNotice");
  notice.hidden = !message;
  notice.textContent = message || "";
}

function renderOnboardingStep() {
  const steps = onboardingSteps();
  const step = steps[state.onboardingStep];
  const review = step.id === "review";
  $("#onboardingStepLabel").textContent = review ? "Review" : `Step ${state.onboardingStep + 1}`;
  $("#onboardingStepCount").textContent = `${String(state.onboardingStep + 1).padStart(2, "0")} / ${String(steps.length).padStart(2, "0")}`;
  $("#onboardingTitle").textContent = step.title;
  $("#onboardingDescription").textContent = step.description;
  $("#onboardingBack").disabled = state.onboardingStep === 0;
  $("#onboardingNext").textContent = review ? "Create my athlete map" : "Save and continue";
  showOnboardingNotice("");
  renderOnboardingNav();
  if (review) renderOnboardingReview();
  else $("#onboardingFields").innerHTML = step.fields.map((field) => fieldMarkup(step, field)).join("");
  $(".onboarding-stage").scrollTop = 0;
}

function captureOnboardingStep() {
  const step = onboardingSteps()[state.onboardingStep];
  if (!step || step.id === "review") return;
  const formData = new FormData($("#onboardingForm"));
  const section = { ...(state.onboardingProfile[step.id] || {}) };
  for (const field of step.fields) {
    const name = `${step.id}.${field.id}`;
    let value;
    if (field.type === "multi") value = formData.getAll(name);
    else value = formData.get(name);
    if (field.type === "boolean" && value !== null) value = value === "true";
    if (field.type === "number" && value !== null && value !== "") value = Number(value);
    if (value === null || value === "" || (Array.isArray(value) && value.length === 0)) delete section[field.id];
    else section[field.id] = value;
  }
  state.onboardingProfile[step.id] = section;
}

function validateCurrentOnboardingStep() {
  const step = onboardingSteps()[state.onboardingStep];
  if (!step || step.id === "review") return true;
  $("#onboardingFields").querySelectorAll(".field-error").forEach((node) => node.remove());
  const missing = step.fields.filter((field) => field.required && !answered(onboardingValue(step.id, field.id)));
  for (const field of missing) {
    const wrapper = $("#onboardingFields").querySelector(`[data-field="${field.id}"]`);
    if (wrapper) wrapper.insertAdjacentHTML("beforeend", '<p class="field-error">Choose or enter an answer before continuing.</p>');
  }
  if (missing.length) showOnboardingNotice(`Finish ${missing.length} required answer${missing.length === 1 ? "" : "s"} in this step.`);
  return missing.length === 0;
}

async function saveOnboardingDraft() {
  $("#onboardingSaveState").textContent = "Saving local draft…";
  const result = await request("/api/onboarding", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ profile: state.onboardingProfile, complete: false }) });
  state.onboardingProfile = result.onboarding.profile;
  state.onboardingAnalysis = result.analysis;
  $("#onboardingSaveState").textContent = "Draft saved on this device.";
  return result;
}

async function renderOnboardingReview() {
  $("#onboardingFields").innerHTML = '<div class="review-grid"><article class="review-card review-full"><small>Building analysis</small><strong>Checking your athlete map…</strong><p>Nothing is being connected or scheduled.</p></article></div>';
  try {
    const result = await saveOnboardingDraft();
    const analysis = result.analysis;
    const athlete = analysis.athlete;
    const connectorChips = analysis.data.selected.length
      ? analysis.data.selected.map((connector) => `<span>${escapeHtml(connector.label)} · ${escapeHtml(humanize(connector.status))}</span>`).join("")
      : "<span>Manual only</span>";
    const automations = analysis.automation.proposals.length ? analysis.automation.proposals.map((proposal) => `<li>${escapeHtml(proposal.label)} — proposal only</li>`).join("") : "<li>No scheduled briefs selected</li>";
    const evidenceGaps = [...athlete.missingData.blocking, ...athlete.missingData.important, ...athlete.missingData.helpful].slice(0, 4);
    const gapList = evidenceGaps.length ? evidenceGaps.map((gap) => `<li>${escapeHtml(gap.explanation)}</li>`).join("") : "<li>No important gap before a conservative first plan.</li>";
    $("#onboardingFields").innerHTML = `<div class="review-grid">
      <article class="review-card ${analysis.safety.blocked ? "alert" : "good"}"><small>Safety gate</small><strong>${escapeHtml(humanize(analysis.safety.status))}</strong><p>${escapeHtml(analysis.safety.recommendation)}</p></article>
      <article class="review-card"><small>Starting point <span class="analysis-confidence">${escapeHtml(athlete.stage.confidence.label)} confidence</span></small><strong>${escapeHtml(humanize(analysis.stage))}</strong><p>${escapeHtml(athlete.stage.confidence.explanation)}</p></article>
      <article class="review-card"><small>Goal window <span class="analysis-confidence">${escapeHtml(athlete.goal.confidence.label)} confidence</span></small><strong>${escapeHtml(humanize(athlete.goal.feasibility))}</strong><p>${escapeHtml(athlete.goal.explanation)}</p></article>
      <article class="review-card"><small>Current running load <span class="analysis-confidence">${escapeHtml(athlete.load.confidence.label)} confidence</span></small><strong>${athlete.load.band === "none" ? "No running yet" : escapeHtml(humanize(athlete.load.band))} · ${athlete.load.planningWeeklyKm} km/wk</strong><p>${escapeHtml(athlete.load.confidence.explanation)}</p></article>
      <article class="review-card"><small>Weekly room <span class="analysis-confidence">${escapeHtml(athlete.availability.confidence.label)} confidence</span></small><strong>${athlete.availability.daysPerWeek} days · ${athlete.availability.estimatedWeeklyMinutes} min</strong><p>${escapeHtml(athlete.availability.explanation)}</p></article>
      <article class="review-card ${["safety_stop", "progression_hold"].includes(athlete.recovery.status) ? "alert" : ""}"><small>Recovery posture <span class="analysis-confidence">${escapeHtml(athlete.recovery.confidence.label)} confidence</span></small><strong>${escapeHtml(humanize(athlete.recovery.status))}</strong><p>${escapeHtml(athlete.recovery.explanation)}</p></article>
      <article class="review-card"><small>Running frame</small><strong>${analysis.training.runSessionsPerWeek} sessions / week</strong><p>${escapeHtml(humanize(analysis.training.recommended))}. ${analysis.training.researchRequired ? "The requested method needs a suitability research pass." : "The method can be refined from your feedback."}</p></article>
      <article class="review-card"><small>Strength frame</small><strong>${analysis.strength.sessionsPerWeek} sessions / week</strong><p>${escapeHtml(analysis.strength.recommendation)}</p></article>
      <article class="review-card review-full"><small>Evidence route</small><strong>${escapeHtml(analysis.data.primary.label)}</strong><p>${escapeHtml(analysis.data.note)}</p><div class="connector-truth">${connectorChips}</div></article>
      <article class="review-card review-full"><small>What would improve confidence</small><strong>${escapeHtml(humanize(athlete.missingData.status))}</strong><ul>${gapList}</ul></article>
      <article class="review-card"><small>Fuel support</small><strong>${escapeHtml(humanize(analysis.nutrition.mode))}</strong><p>${escapeHtml(analysis.nutrition.recommendation)}</p></article>
      <article class="review-card"><small>Automation proposals</small><strong>${analysis.automation.proposals.length} selected</strong><ul>${automations}</ul></article>
      <article class="review-card review-full"><small>First recommendation · ${escapeHtml(athlete.overallConfidence.label)} overall confidence</small><strong>${escapeHtml(analysis.summary)}</strong><p>${escapeHtml(athlete.permissions.explanation)}</p></article>
    </div>`;
    renderOnboardingNav();
  } catch (error) {
    showOnboardingNotice(error.message);
  }
}

async function finishOnboarding() {
  $("#onboardingNext").disabled = true;
  $("#onboardingNext").textContent = "Creating athlete map…";
  try {
    const result = await request("/api/onboarding", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ profile: state.onboardingProfile, complete: true }) });
    state.onboardingProfile = result.onboarding.profile;
    state.onboardingAnalysis = result.analysis;
    state.bootstrap.onboarding = result.onboarding;
    state.bootstrap.needsOnboarding = false;
    state.bootstrap.training = { activePlan: null, proposals: [] };
    state.bootstrap.nutrition = null;
    state.nutrition = null;
    updatePlanEntry(state.bootstrap.training);
    updateFuelEntry(null);
    $("#openOnboarding").textContent = "Athlete setup ✓";
    $("#onboardingDialog").close();
    await refreshDashboard();
    await refreshAutomations(false);
    addMessage("assistant", `<small class="message-mode">Athlete map ready</small><p>${escapeHtml(result.analysis.summary)}</p>`);
    toast(result.analysis.safety.blocked ? "Profile saved — safety review needed before a plan" : "Athlete map ready");
  } catch (error) {
    const firstMissing = error.data?.missing?.[0];
    if (firstMissing) {
      const sectionId = firstMissing.split(".")[0];
      const index = onboardingSteps().findIndex((step) => step.id === sectionId);
      if (index >= 0) state.onboardingStep = index;
      renderOnboardingStep();
      showOnboardingNotice("Some required answers are still missing. Continue from this step.");
    } else showOnboardingNotice(error.message);
  } finally {
    $("#onboardingNext").disabled = false;
    $("#onboardingNext").textContent = onboardingSteps()[state.onboardingStep]?.id === "review" ? "Create my athlete map" : "Save and continue";
  }
}

async function moveOnboarding(direction) {
  captureOnboardingStep();
  if (direction > 0 && !validateCurrentOnboardingStep()) return;
  if (direction > 0) {
    try { await saveOnboardingDraft(); }
    catch (error) { showOnboardingNotice(error.message); return; }
  }
  state.onboardingStep = Math.max(0, Math.min(onboardingSteps().length - 1, state.onboardingStep + direction));
  renderOnboardingStep();
}

function firstIncompleteStep() {
  const index = state.onboardingSchema.sections.findIndex((section) => !sectionProgress(section).done);
  return index < 0 ? onboardingSteps().length - 1 : index;
}

function openAthleteSetup({ firstRun = false } = {}) {
  state.onboardingStep = state.bootstrap?.onboarding?.completedAt ? onboardingSteps().length - 1 : firstIncompleteStep();
  renderOnboardingStep();
  if (!$("#onboardingDialog").open) $("#onboardingDialog").showModal();
  if (firstRun) toast("Start with what you know. You can change every answer later.");
}

async function initializeOnboarding(bootstrap) {
  const result = await request("/api/onboarding/schema");
  state.onboardingSchema = result.schema;
  state.onboardingConnectors = result.connectors;
  state.onboardingProfile = bootstrap.onboarding?.profile || {};
  state.onboardingProfile.strength = { preference: "recommend_for_me", ...(state.onboardingProfile.strength || {}) };
  state.onboardingProfile.preferences = { trainingStyle: "recommend_for_me", intensityTolerance: "unknown", ...(state.onboardingProfile.preferences || {}) };
  if (!state.onboardingProfile.personal?.timezone) {
    state.onboardingProfile.personal = { ...(state.onboardingProfile.personal || {}), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Skopje", units: state.onboardingProfile.personal?.units || "metric" };
  }
  if (bootstrap.needsOnboarding) openAthleteSetup({ firstRun: true });
}

$("#onboardingForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (onboardingSteps()[state.onboardingStep]?.id === "review") await finishOnboarding();
  else await moveOnboarding(1);
});
$("#onboardingBack").addEventListener("click", () => moveOnboarding(-1));
$("#openOnboarding").addEventListener("click", () => openAthleteSetup());
$("#exploreDemo").addEventListener("click", () => { captureOnboardingStep(); saveOnboardingDraft().catch(() => {}); $("#onboardingDialog").close(); toast("Synthetic demo opened. Athlete setup is still incomplete."); });
$("#onboardingNav").addEventListener("click", async (event) => {
  const button = event.target.closest("[data-onboarding-step]");
  if (!button) return;
  captureOnboardingStep();
  try { await saveOnboardingDraft(); } catch {}
  state.onboardingStep = Number(button.dataset.onboardingStep);
  renderOnboardingStep();
});

const connectorStatusLabels = {
  available: "Available now",
  adapter_configured: "Adapter configured",
  oauth_setup_ready: "OAuth setup ready",
  setup_required: "Setup needed",
  companion_required: "Native app required",
  planned: "Planned"
};

function connectorStatusClass(status) {
  if (status === "available") return "ready";
  if (["adapter_configured", "oauth_setup_ready"].includes(status)) return "configured";
  if (["setup_required", "companion_required"].includes(status)) return "setup";
  return "planned";
}

function connectorSetupMarkup(connector) {
  if (connector.setup?.requiredEnvironment?.length) {
    return `<details><summary>Setup contract</summary><p>Add server-side environment values: <code>${connector.setup.requiredEnvironment.map(escapeHtml).join(" · ")}</code>${connector.setup.optionalEnvironment?.length ? `<br>Optional: <code>${connector.setup.optionalEnvironment.map(escapeHtml).join(" · ")}</code>` : ""}. Secrets never go in the browser.</p></details>`;
  }
  if (connector.setup?.kind === "native_companion") {
    return `<details><summary>Why a companion?</summary><p>${escapeHtml(connector.setup.platform)} health data requires system permission inside a native app. This web page cannot bypass that boundary.</p></details>`;
  }
  if (connector.setup?.formats) return `<p class="connector-capability">Reads ${connector.setup.formats.map((format) => format.toUpperCase()).join(" · ")} locally</p>`;
  return "";
}

function relativeTime(value) {
  if (!value) return "time unknown";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "time unknown";
  const hours = Math.max(0, (Date.now() - date.getTime()) / 3_600_000);
  if (hours < 1) return "less than an hour ago";
  if (hours < 48) return `${Math.round(hours)}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function renderSavedImports(imports) {
  $("#importedActivities").innerHTML = imports.length ? `<div class="saved-heading"><strong>Saved activity summaries</strong><span>${imports.length} local</span></div>${imports.map((activity) => `<article class="saved-row">
    <i class="freshness ${escapeHtml(activity.freshness?.status || "unknown")}"></i>
    <div><strong>${escapeHtml(activity.name)}</strong><p>${escapeHtml(activity.summary)} · ${escapeHtml(activity.format)} · ${escapeHtml(relativeTime(activity.activityAt))}</p></div>
    <button type="button" data-delete-import="${escapeHtml(activity.id)}" aria-label="Delete ${escapeHtml(activity.name)}">Delete</button>
  </article>`).join("")}` : '<div class="empty-data"><strong>No saved activity files.</strong><p>Previewing never stores a file. Confirm only the summaries you want.</p></div>';
}

function renderManualCheckins(checkins) {
  $("#manualCheckins").innerHTML = checkins.length ? `<div class="saved-heading"><strong>Recent manual signals</strong><span>${checkins.length} local</span></div>${checkins.map((checkin) => `<article class="saved-row">
    <i class="freshness ${escapeHtml(checkin.freshness?.status || "fresh")}"></i>
    <div><strong>Pain ${escapeHtml(checkin.pain)}/10 · Energy ${escapeHtml(checkin.energy)}/5 · Sleep ${escapeHtml(checkin.sleepFeel)}/5</strong><p>${checkin.rpe ? `RPE ${escapeHtml(checkin.rpe)} · ` : ""}${escapeHtml(checkin.note || "No extra context")} · ${escapeHtml(relativeTime(checkin.capturedAt))}</p></div>
    <button type="button" data-delete-checkin="${escapeHtml(checkin.id)}" aria-label="Delete manual check-in">Delete</button>
  </article>`).join("")}` : '<div class="empty-data"><strong>No manual check-ins yet.</strong><p>This is the complete fallback when no wearable is available.</p></div>';
}

function renderDataSetup(data) {
  state.dataSetup = data;
  const byId = new Map(data.connectors.map((connector) => [connector.id, connector]));
  $("#sourcePriority").innerHTML = data.sourcePriority.map((id, index) => `<li><b>${String(index + 1).padStart(2, "0")}</b><span>${escapeHtml(byId.get(id)?.label || humanize(id))}</span></li>`).join("");
  const visibleConnectors = data.connectors.filter((connector) => connector.id !== "none");
  const active = visibleConnectors.filter((connector) => connector.status === "available").length;
  $("#connectorCount").textContent = `${active} usable now · ${visibleConnectors.length} routes`;
  $("#connectorGrid").innerHTML = visibleConnectors.map((connector) => `<article class="connector-card ${connectorStatusClass(connector.status)}">
    <header><span>${escapeHtml(connector.label)}</span><b>${escapeHtml(connectorStatusLabels[connector.status] || humanize(connector.status))}</b></header>
    <p>${escapeHtml(connector.truth || connector.note)}</p>
    ${connector.truth ? `<small>${escapeHtml(connector.note)}</small>` : ""}
    ${connectorSetupMarkup(connector)}
  </article>`).join("");
  renderSavedImports(data.imports);
  renderManualCheckins(data.checkins);
}

async function refreshDataSetup() {
  const data = await request("/api/connectors");
  renderDataSetup(data);
  await refreshDashboard();
  return data;
}

async function openDataSetup() {
  if (!$("#dataDialog").open) $("#dataDialog").showModal();
  try { await refreshDataSetup(); }
  catch (error) { toast(error.message); }
}

$("#openDataSources").addEventListener("click", openDataSetup);
$("#openDataSourcesPanel").addEventListener("click", openDataSetup);
$("#closeDataDialog").addEventListener("click", () => $("#dataDialog").close());

$("#activityFile").addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  state.activityFile = null;
  state.activityFileBase64 = null;
  state.importPreview = null;
  $("#importPreview").hidden = true;
  $("#importConsentLabel").hidden = true;
  $("#confirmImport").hidden = true;
  $("#importConsent").checked = false;
  if (!file) return;
  if (!/\.(fit|gpx|tcx|csv)$/i.test(file.name)) return toast("Choose a FIT, GPX, TCX, or CSV file.");
  if (file.size > 8_000_000) return toast("Choose an activity file smaller than 8 MB.");
  state.activityFile = file;
  $("#activityFileName").textContent = `${file.name} · ${(file.size / 1024).toFixed(1)} KB`;
  const reader = new FileReader();
  reader.addEventListener("load", () => { state.activityFileBase64 = String(reader.result).split(",")[1] || ""; });
  reader.readAsDataURL(file);
});

$("#previewImport").addEventListener("click", async () => {
  if (!state.activityFile || !state.activityFileBase64) return toast("Choose an activity file first.");
  const button = $("#previewImport");
  button.disabled = true;
  button.textContent = "Parsing on this server…";
  try {
    const preview = await request("/api/imports/preview", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ fileName: state.activityFile.name, dataBase64: state.activityFileBase64 }) });
    state.importPreview = preview;
    $("#importPreview").hidden = false;
    $("#importPreview").innerHTML = `<div class="preview-head"><span>${escapeHtml(preview.file.format)} · ${preview.activityCount} activit${preview.activityCount === 1 ? "y" : "ies"}</span><b>RAW STORED: NO</b></div>${preview.activities.map((activity) => `<article><strong>${escapeHtml(activity.name)}</strong><p>${escapeHtml(activity.summary)} · ${escapeHtml(activity.activityAt ? new Date(activity.activityAt).toLocaleString() : "date unknown")}</p>${activity.warnings.length ? `<small>${activity.warnings.map(escapeHtml).join(" ")}</small>` : ""}</article>`).join("")}`;
    $("#importConsentLabel").hidden = false;
    $("#confirmImport").hidden = false;
    $("#confirmImport").disabled = true;
  } catch (error) { toast(error.message); }
  finally { button.disabled = false; button.textContent = "Preview normalized data"; }
});

$("#importConsent").addEventListener("change", (event) => { $("#confirmImport").disabled = !event.target.checked || !state.importPreview; });

$("#confirmImport").addEventListener("click", async () => {
  if (!state.activityFile || !state.activityFileBase64 || !$("#importConsent").checked) return;
  const button = $("#confirmImport");
  button.disabled = true;
  button.textContent = "Saving summaries…";
  try {
    const result = await request("/api/imports", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ fileName: state.activityFile.name, dataBase64: state.activityFileBase64, consent: true }) });
    toast(`${result.activities.length} activity summar${result.activities.length === 1 ? "y" : "ies"} saved locally`);
    state.activityFile = null; state.activityFileBase64 = null; state.importPreview = null;
    $("#activityFile").value = ""; $("#activityFileName").textContent = "Choose an activity export"; $("#importPreview").hidden = true; $("#importConsentLabel").hidden = true; button.hidden = true;
    await refreshDataSetup();
  } catch (error) { toast(error.message); button.disabled = false; button.textContent = "Confirm local import"; }
});

$("#checkinForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const values = Object.fromEntries(new FormData(form));
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    await request("/api/checkins", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(values) });
    form.elements.rpe.value = ""; form.elements.note.value = "";
    toast("Manual check-in saved locally");
    await refreshDataSetup();
  } catch (error) { toast(error.message); }
  finally { button.disabled = false; }
});

$("#dataDialog").addEventListener("click", async (event) => {
  const importButton = event.target.closest("[data-delete-import]");
  const checkinButton = event.target.closest("[data-delete-checkin]");
  try {
    if (importButton) {
      await request(`/api/imports/${encodeURIComponent(importButton.dataset.deleteImport)}`, { method: "DELETE" });
      toast("Imported summary deleted");
      await refreshDataSetup();
    }
    if (checkinButton) {
      await request(`/api/checkins/${encodeURIComponent(checkinButton.dataset.deleteCheckin)}`, { method: "DELETE" });
      toast("Manual check-in deleted");
      await refreshDataSetup();
    }
  } catch (error) { toast(error.message); }
});

const automationDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

function updateAutomationEntry(data = state.automationData) {
  const enabled = data?.tasks?.filter((task) => task.enabled).length || 0;
  const tested = data?.tasks?.filter((task) => task.testedAt).length || 0;
  $("#automationButtonTitle").textContent = state.bootstrap?.needsOnboarding ? "Scheduled briefs" : enabled ? `${enabled} brief proposal${enabled === 1 ? "" : "s"}` : "Scheduled briefs off";
  $("#automationButtonNote").textContent = state.bootstrap?.needsOnboarding ? "Complete setup to choose briefs" : `${tested} tested / none installed automatically`;
  $("#openAutomations").textContent = enabled ? `Automations ${tested}/${enabled}` : "Automations";
}

function renderAutomationPreview(preview) {
  $("#automationPreview").hidden = false;
  $("#automationPreview").innerHTML = `<small>Manual test / ${escapeHtml(humanize(preview.status))}</small><strong>${escapeHtml(preview.title)}</strong><p>${escapeHtml(preview.summary)}</p>${preview.evidence?.length ? `<p><b>Evidence:</b> ${preview.evidence.map(escapeHtml).join(" · ")}</p>` : ""}${preview.questions?.length ? `<ul>${preview.questions.map((question) => `<li>${escapeHtml(question)}</li>`).join("")}</ul>` : ""}<p><b>External actions:</b> none. This test did not schedule or change anything.</p>`;
  $("#automationPreview").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function renderAutomationSetup(data) {
  state.automationData = data;
  updateAutomationEntry(data);
  if (data.status === "needs_onboarding") {
    $("#automationState").innerHTML = "<span>Setup needed</span><strong>Complete the athlete map first.</strong>";
    $("#automationList").innerHTML = "";
    return;
  }
  const enabled = data.tasks.filter((task) => task.enabled).length;
  $("#automationState").innerHTML = `<span>Proposal only · scheduled: no</span><strong>${enabled} of ${data.tasks.length} workflows enabled in ${escapeHtml(data.timezone)}</strong>`;
  $("#automationList").innerHTML = data.tasks.map((task) => `<article class="automation-card ${task.enabled ? "" : "disabled"} ${task.testedAt ? "tested" : ""}" data-automation-card="${escapeHtml(task.id)}">
    <header><div><small>${escapeHtml(task.cadence)} · ${task.testedAt ? "manually tested" : "not tested"}</small><strong>${escapeHtml(task.label)}</strong></div><label class="automation-toggle"><input type="checkbox" data-auto-enabled ${task.enabled ? "checked" : ""}> Enabled</label></header>
    <p>${escapeHtml(task.description)}</p>
    <div class="automation-controls">
      <label>Local time<input type="time" data-auto-time value="${escapeHtml(task.schedule.time)}"></label>
      ${task.cadence === "weekly" ? `<label>Day<select data-auto-day>${automationDays.map((day) => `<option value="${day}" ${task.schedule.day === day ? "selected" : ""}>${escapeHtml(humanize(day))}</option>`).join("")}</select></label>` : ""}
    </div>
    <p class="automation-schedule">${escapeHtml(task.schedule.label)} · ${escapeHtml(task.schedule.timezone)}<br>${escapeHtml(task.schedule.rrule)}</p>
    <details><summary>Exact durable prompt</summary><pre>${escapeHtml(task.prompt)}</pre></details>
    <div class="automation-actions"><button type="button" data-auto-save>Save proposal</button><button type="button" class="test-automation" data-auto-test>Test now</button><button type="button" data-auto-copy>Copy prompt + RRULE</button></div>
    <span class="automation-test-state">${task.testedAt ? `Last test: ${escapeHtml(humanize(task.lastTestStatus))} · ${escapeHtml(new Date(task.testedAt).toLocaleString())}` : "Manual test required before scheduling"}</span>
  </article>`).join("");
}

async function refreshAutomations(render = true) {
  const data = await request("/api/automations");
  state.automationData = data;
  updateAutomationEntry(data);
  if (render) renderAutomationSetup(data);
  return data;
}

async function openAutomationDialog() {
  if (state.bootstrap?.needsOnboarding) return openAthleteSetup({ firstRun: false });
  if (!$("#automationDialog").open) $("#automationDialog").showModal();
  $("#automationState").innerHTML = "<span>Loading</span><strong>Building read-only proposals…</strong>";
  $("#automationList").innerHTML = "";
  $("#automationPreview").hidden = true;
  try { await refreshAutomations(true); }
  catch (error) { $("#automationState").innerHTML = `<span>Could not load</span><strong>${escapeHtml(error.message)}</strong>`; }
}

$("#openAutomations").addEventListener("click", openAutomationDialog);
$("#openAutomationsPanel").addEventListener("click", openAutomationDialog);
$("#closeAutomationDialog").addEventListener("click", () => $("#automationDialog").close());
$("#automationDialog").addEventListener("click", async (event) => {
  if (event.target === $("#automationDialog")) return $("#automationDialog").close();
  const card = event.target.closest("[data-automation-card]");
  if (!card) return;
  const id = card.dataset.automationCard;
  const task = state.automationData?.tasks?.find((item) => item.id === id);
  if (!task) return;
  const saveButton = event.target.closest("[data-auto-save]");
  const testButton = event.target.closest("[data-auto-test]");
  const copyButton = event.target.closest("[data-auto-copy]");
  try {
    if (saveButton) {
      saveButton.disabled = true;
      const payload = { id, enabled: card.querySelector("[data-auto-enabled]").checked, time: card.querySelector("[data-auto-time]").value };
      const day = card.querySelector("[data-auto-day]")?.value;
      if (day) payload.day = day;
      const setup = await request("/api/automations/config", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      renderAutomationSetup(setup);
      toast("Automation proposal saved locally · nothing scheduled");
    }
    if (testButton) {
      testButton.disabled = true;
      testButton.textContent = "Testing read-only…";
      const result = await request("/api/automations/test", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
      renderAutomationSetup(result.setup);
      renderAutomationPreview(result.preview);
      toast("Manual preview complete · no external actions");
    }
    if (copyButton) {
      const copy = `${task.prompt}\n\nTimezone: ${task.schedule.timezone}\nSchedule: ${task.schedule.rrule}`;
      await navigator.clipboard.writeText(copy);
      toast("Prompt and RRULE copied · paste into Scheduled after testing");
    }
  } catch (error) { toast(error.message); }
  finally {
    if (saveButton?.isConnected) saveButton.disabled = false;
    if (testButton?.isConnected) { testButton.disabled = false; testButton.textContent = "Test now"; }
  }
});

request("/api/bootstrap").then(async (data) => { renderBootstrap(data); await initializeOnboarding(data); }).catch((error) => toast(error.message));

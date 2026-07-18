const $ = (selector) => document.querySelector(selector);
const state = {
  bootstrap: null, currentDecision: null, imageDataUrl: null, trace: 0, busy: false,
  onboardingSchema: null, onboardingConnectors: [], onboardingProfile: {}, onboardingStep: 0, onboardingAnalysis: null,
  dataSetup: null, activityFile: null, activityFileBase64: null, importPreview: null
};

function escapeHtml(value = "") { return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]); }
function toast(message) { const el = $("#toast"); el.textContent = message; el.classList.add("show"); window.setTimeout(() => el.classList.remove("show"), 3200); }
async function request(url, options) { const response = await fetch(url, options); const data = await response.json().catch(() => ({})); if (!response.ok) { const error = new Error(data.error || "The request failed."); error.data = data; error.status = response.status; throw error; } return data; }
function setBusy(busy) { state.busy = busy; $("#coachInput").disabled = busy; $("#sendCoach").disabled = busy; document.querySelectorAll("[data-prompt]").forEach((button) => { button.disabled = busy; }); }

function renderBootstrap(data) {
  state.bootstrap = data;
  const { today, workout, week, athlete } = data.athlete;
  $("#modeLabel").textContent = data.mode === "live" ? "GPT-5.6 live reasoning" : "Transparent demo mode";
  $("#modelLabel").textContent = data.model;
  $("#traceMode").textContent = data.mode === "live" ? "● LIVE MODEL" : "● DEMO TRACE";
  $("#readinessValue").textContent = today.readiness; $("#sleepValue").textContent = `${today.sleepHours}h`; $("#hrvValue").textContent = `${today.hrvMs}ms`; $("#painValue").textContent = `${today.pain}/10`; $("#rpeValue").textContent = `RPE ${today.rpeYesterday}`;
  $("#workoutName").textContent = workout.name; $("#distanceValue").textContent = workout.distanceKm.toFixed(1); $("#workoutTarget").textContent = workout.target; $("#weekCompleted").textContent = week.completedKm; $("#weekPlanned").textContent = week.plannedKm; $("#daysToRace").textContent = `${athlete.daysToRace} days`;
  $("#calendarStatus").textContent = data.connectors.garmin.label;
  $("#connectorNote").textContent = data.connectors.garmin.configured ? "External writes go through your configured bridge after approval." : "No Garmin account is connected. Approved workout writes are safely simulated.";
  $("#sourceButtonNote").textContent = data.connectors.garmin.configured ? "Garmin adapter + local fallback" : "Files + manual check-ins available";
  $("#openOnboarding").textContent = data.needsOnboarding ? "Athlete setup" : "Athlete setup ✓";
  if (data.decisions.length) { state.trace = data.decisions.length; renderLedger(data.decisions[0], { restored: true }); } else renderEmptyLedger();
}

function addMessage(role, html, extraClass = "") { const article = document.createElement("div"); article.className = `message ${role} ${extraClass}`; article.innerHTML = html; $("#conversation").append(article); $("#conversation").scrollTop = $("#conversation").scrollHeight; return article; }
function renderEmptyLedger() { state.currentDecision = null; $("#traceId").textContent = "NO TRACE"; $("#ledger").innerHTML = `<div class="empty-ledger"><strong>Ask the coach to create a trace.</strong><p>Evidence, the rule gate, and any proposed action will appear here.</p></div>`; $("#approvalCard").hidden = true; }

function renderLedger(decision, { restored = false } = {}) {
  state.currentDecision = decision; if (!restored) state.trace += 1; $("#traceId").textContent = `TRACE ${String(state.trace || 1).padStart(3, "0")}`;
  const isStop = decision.status === "stopped"; const isAuto = decision.status === "completed"; const isResolved = ["approved", "declined"].includes(decision.status); const evidence = decision.evidence.map(escapeHtml).join(" · ");
  const gateLabel = decision.gate.mode === "confirm" ? "Approval boundary reached" : decision.gate.mode === "stop" ? "Safety stop triggered" : "Autonomous action allowed";
  let actionTitle = isStop ? "Action stopped" : isAuto ? "Action completed" : "Waiting for the athlete"; let actionDetail = decision.gate.action.replaceAll("_", " ");
  if (decision.status === "approved") { actionTitle = decision.result?.message || "Action approved"; actionDetail = decision.result?.simulated ? "Simulation only — no external calendar changed." : "Recorded and completed."; }
  if (decision.status === "declined") { actionTitle = "Action declined"; actionDetail = "Nothing changed."; }
  $("#ledger").innerHTML = `<article class="ledger-step complete"><span>1</span><div><small>EVIDENCE</small><strong>${decision.evidence.length} signal${decision.evidence.length === 1 ? "" : "s"} loaded</strong><p>${evidence}</p></div><b>✓</b></article><article class="ledger-step complete"><span>2</span><div><small>REASON</small><strong>Proposal grounded in athlete data</strong><p>No unsupported metric was introduced.</p></div><b>✓</b></article><article class="ledger-step ${isAuto || isResolved ? "complete" : "active"}"><span>3</span><div><small>RULE GATE</small><strong>${gateLabel}</strong><p>${escapeHtml(decision.gate.reason)}</p></div><b>${isStop ? "×" : isAuto || isResolved ? "✓" : "!"}</b></article><article class="ledger-step ${isAuto || isResolved ? "complete" : "waiting"}"><span>4</span><div><small>ACTION</small><strong>${escapeHtml(actionTitle)}</strong><p>${escapeHtml(actionDetail)}</p></div><b>${isAuto || decision.status === "approved" ? "✓" : decision.status === "declined" || isStop ? "×" : "…"}</b></article>`;
  $("#proposalText").textContent = decision.proposal; $("#approvalCard").hidden = decision.status !== "awaiting_approval";
  if (decision.status === "awaiting_approval") $("#approveDecision").textContent = state.bootstrap?.connectors.garmin.configured || decision.gate.action !== "push_garmin_workout" ? "Approve action" : "Approve simulation";
}

async function sendCoachMessage(message) {
  if (state.busy) return; setBusy(true); addMessage("user", `<p>${escapeHtml(message)}</p>`); const pending = addMessage("assistant", "<p>Reading the signals and checking the action boundary…</p>");
  try { const result = await request("/api/coach", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message }) }); pending.remove(); const modeNote = result.mode === "live" ? "" : `<small class="message-mode">Deterministic demo response</small>`; addMessage("assistant", `${modeNote}<p>${escapeHtml(result.decision.proposal)}</p><button class="inline-action" data-scroll="ledger">See why →</button>`); renderLedger(result.decision); toast(result.mode === "live" ? "Reasoned live with GPT-5.6" : "Demo trace created and saved"); }
  catch (error) { pending.classList.add("error"); pending.innerHTML = `<p>${escapeHtml(error.message)}</p>`; } finally { setBusy(false); }
}

$("#coachForm").addEventListener("submit", (event) => { event.preventDefault(); const input = $("#coachInput"); const message = input.value.trim(); if (!message) return; input.value = ""; sendCoachMessage(message); });
document.addEventListener("click", (event) => { const prompt = event.target.closest("[data-prompt]"); if (prompt) sendCoachMessage(prompt.dataset.prompt); const scroll = event.target.closest("[data-scroll]"); if (scroll) document.getElementById(scroll.dataset.scroll)?.scrollIntoView({ behavior: "smooth", block: "center" }); });

$("#approveDecision").addEventListener("click", async () => { if (!state.currentDecision) return toast("Create a trace before approving an action."); try { const result = await request("/api/decisions/approve", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: state.currentDecision.id }) }); renderLedger(result.decision, { restored: true }); toast(result.result); } catch (error) { toast(error.message); } });
$("#declineDecision").addEventListener("click", async () => { if (!state.currentDecision) return; try { const result = await request("/api/decisions/decline", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: state.currentDecision.id }) }); renderLedger(result.decision, { restored: true }); toast(result.result); } catch (error) { toast(error.message); } });

function openFoodDialog() { $("#foodDialog").showModal(); } $("#openFood").addEventListener("click", openFoodDialog); $("#quickFood").addEventListener("click", openFoodDialog);
$("#foodImage").addEventListener("change", (event) => { const file = event.target.files?.[0]; if (!file) return; if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return toast("Choose a PNG, JPG, or WEBP image."); if (file.size > 8_000_000) return toast("Choose an image smaller than 8 MB."); const reader = new FileReader(); reader.addEventListener("load", () => { state.imageDataUrl = reader.result; $("#foodPreview").src = reader.result; $("#dropZone").classList.add("has-image"); $("#mealResult").hidden = true; }); reader.readAsDataURL(file); });
$("#analyzeFood").addEventListener("click", async () => {
  if (!state.imageDataUrl) return toast("Choose a meal photo first."); const button = $("#analyzeFood"); button.disabled = true; button.textContent = "Checking image + rules…";
  try { const result = await request("/api/food", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ imageDataUrl: state.imageDataUrl, note: $("#foodNote").value }) }); const meal = result.meal; $("#mealResult").hidden = false; $("#mealResult").innerHTML = `${result.disclosure ? `<p class="demo-disclosure"><strong>Demo disclosure:</strong> ${escapeHtml(result.disclosure)}</p>` : ""}<h3>${escapeHtml(meal.summary)}</h3><p>${meal.items.map((item) => `${escapeHtml(item.name)} — ${escapeHtml(item.portion)}`).join(" · ")}</p><div class="meal-macros"><div><span>Energy</span><strong>${escapeHtml(meal.caloriesRange)}</strong></div><div><span>Protein</span><strong>${escapeHtml(meal.proteinRange)}</strong></div><div><span>Carbs</span><strong>${escapeHtml(meal.carbsRange)}</strong></div></div><p><strong>Before logging:</strong> ${meal.questions.map(escapeHtml).join(" ")}</p><button type="button" class="approve" id="reviewMeal">Review in the decision ledger →</button>`; $("#reviewMeal").addEventListener("click", () => { renderLedger(result.decision); $("#foodDialog").close(); $("#ledger").scrollIntoView({ behavior: "smooth", block: "center" }); }); toast(result.mode === "live" ? "Meal analyzed by GPT-5.6" : "Demo sample ready — image not inspected"); }
  catch (error) { toast(error.message); } finally { button.disabled = false; button.textContent = "Analyze with the harness"; }
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
  if (section.id === "preferences" && field.id === "trainingStyle") return "A named style is a preference, not automatic permission to use an advanced method.";
  if (section.id === "nutrition" && field.id === "supplements") return "Include product, dose, and timing when known. StrideOS reviews context; it does not assume a supplement is needed.";
  if (section.id === "delivery" && field.id === "morningBrief") return "This proposes a schedule only. Nothing is created until you approve it.";
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
    const connectorChips = analysis.data.selected.length
      ? analysis.data.selected.map((connector) => `<span>${escapeHtml(connector.label)} · ${escapeHtml(humanize(connector.status))}</span>`).join("")
      : "<span>Manual only</span>";
    const automations = analysis.automation.proposals.length ? analysis.automation.proposals.map((proposal) => `<li>${escapeHtml(proposal.label)} — proposal only</li>`).join("") : "<li>No scheduled briefs selected</li>";
    $("#onboardingFields").innerHTML = `<div class="review-grid">
      <article class="review-card ${analysis.safety.blocked ? "alert" : "good"}"><small>Safety gate</small><strong>${escapeHtml(humanize(analysis.safety.status))}</strong><p>${escapeHtml(analysis.safety.recommendation)}</p></article>
      <article class="review-card"><small>Starting point</small><strong>${escapeHtml(humanize(analysis.stage))}</strong><p>${escapeHtml(analysis.training.note)}</p></article>
      <article class="review-card"><small>Running frame</small><strong>${analysis.training.runSessionsPerWeek} sessions / week</strong><p>${escapeHtml(humanize(analysis.training.recommended))}. ${analysis.training.researchRequired ? "The requested method needs a suitability research pass." : "The method can be refined from your feedback."}</p></article>
      <article class="review-card"><small>Strength frame</small><strong>${analysis.strength.sessionsPerWeek} sessions / week</strong><p>${escapeHtml(analysis.strength.recommendation)}</p></article>
      <article class="review-card review-full"><small>Evidence route</small><strong>${escapeHtml(analysis.data.primary.label)}</strong><p>${escapeHtml(analysis.data.note)}</p><div class="connector-truth">${connectorChips}</div></article>
      <article class="review-card"><small>Fuel support</small><strong>${escapeHtml(humanize(analysis.nutrition.mode))}</strong><p>${escapeHtml(analysis.nutrition.recommendation)}</p></article>
      <article class="review-card"><small>Automation proposals</small><strong>${analysis.automation.proposals.length} selected</strong><ul>${automations}</ul></article>
      <article class="review-card review-full"><small>First recommendation</small><strong>${escapeHtml(analysis.summary)}</strong><p>Your dashboard, schedule proposals, and any external writes remain under the approval rule you selected.</p></article>
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
    $("#openOnboarding").textContent = "Athlete setup ✓";
    $("#onboardingDialog").close();
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

request("/api/bootstrap").then(async (data) => { renderBootstrap(data); await initializeOnboarding(data); }).catch((error) => toast(error.message));

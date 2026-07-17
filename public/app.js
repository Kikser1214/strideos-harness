const $ = (selector) => document.querySelector(selector);
const state = { bootstrap: null, currentDecision: null, imageDataUrl: null, trace: 0, busy: false };

function escapeHtml(value = "") { return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]); }
function toast(message) { const el = $("#toast"); el.textContent = message; el.classList.add("show"); window.setTimeout(() => el.classList.remove("show"), 3200); }
async function request(url, options) { const response = await fetch(url, options); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || "The request failed."); return data; }
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

request("/api/bootstrap").then(renderBootstrap).catch((error) => toast(error.message));

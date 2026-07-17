const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const state = { bootstrap: null, currentDecision: null, imageDataUrl: null, trace: 1 };

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}

function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  window.setTimeout(() => el.classList.remove("show"), 2800);
}

async function request(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "The request failed.");
  return data;
}

function renderBootstrap(data) {
  state.bootstrap = data;
  const { today, workout, week, athlete } = data.athlete;
  $("#modeLabel").textContent = data.mode === "live" ? "GPT-5.6 live" : "Judge demo";
  $("#modelLabel").textContent = data.model;
  $("#readinessValue").textContent = today.readiness;
  $("#sleepValue").textContent = `${today.sleepHours}h`;
  $("#hrvValue").textContent = `${today.hrvMs}ms`;
  $("#painValue").textContent = `${today.pain}/10`;
  $("#rpeValue").textContent = `RPE ${today.rpeYesterday}`;
  $("#workoutName").textContent = workout.name;
  $("#distanceValue").textContent = workout.distanceKm.toFixed(1);
  $("#workoutTarget").textContent = workout.target;
  $("#weekCompleted").textContent = week.completedKm;
  $("#weekPlanned").textContent = week.plannedKm;
  $("#daysToRace").textContent = `${athlete.daysToRace} days`;
}

function addMessage(role, html, extraClass = "") {
  const article = document.createElement("div");
  article.className = `message ${role} ${extraClass}`;
  article.innerHTML = html;
  $("#conversation").append(article);
  $("#conversation").scrollTop = $("#conversation").scrollHeight;
  return article;
}

function renderLedger(decision) {
  state.currentDecision = decision;
  state.trace += 1;
  $("#traceId").textContent = `TRACE ${String(state.trace).padStart(3, "0")}`;
  const isStop = decision.status === "stopped";
  const isAuto = decision.status === "completed";
  const evidence = decision.evidence.map(escapeHtml).join(" · ");
  const gateLabel = decision.gate.mode === "confirm" ? "Approval boundary reached" : decision.gate.mode === "stop" ? "Safety stop triggered" : "Autonomous action allowed";
  $("#ledger").innerHTML = `
    <article class="ledger-step complete"><span>1</span><div><small>EVIDENCE</small><strong>${decision.evidence.length} signal${decision.evidence.length === 1 ? "" : "s"} loaded</strong><p>${evidence}</p></div><b>✓</b></article>
    <article class="ledger-step complete"><span>2</span><div><small>REASON</small><strong>Proposal grounded in athlete data</strong><p>No unsupported metric was introduced.</p></div><b>✓</b></article>
    <article class="ledger-step ${isAuto ? "complete" : "active"}"><span>3</span><div><small>RULE GATE</small><strong>${gateLabel}</strong><p>${escapeHtml(decision.gate.reason)}</p></div><b>${isStop ? "×" : isAuto ? "✓" : "!"}</b></article>
    <article class="ledger-step ${isAuto ? "complete" : "waiting"}"><span>4</span><div><small>ACTION</small><strong>${isStop ? "Action stopped" : isAuto ? "Action completed" : "Waiting for the athlete"}</strong><p>${escapeHtml(decision.gate.action.replaceAll("_", " "))}</p></div><b>${isAuto ? "✓" : "…"}</b></article>`;
  $("#proposalText").textContent = decision.proposal;
  $("#approvalCard").hidden = decision.gate.mode !== "confirm";
}

async function sendCoachMessage(message) {
  addMessage("user", `<p>${escapeHtml(message)}</p>`);
  const pending = addMessage("assistant", "<p>Reading the signals and checking the action boundary…</p>");
  try {
    const result = await request("/api/coach", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message })
    });
    pending.remove();
    addMessage("assistant", `<p>${escapeHtml(result.decision.proposal)}</p><button class="inline-action" data-scroll="ledger">See why →</button>`);
    renderLedger(result.decision);
    toast(result.mode === "live" ? "Reasoned live with GPT-5.6" : "Judge demo trace created");
  } catch (error) {
    pending.classList.add("error");
    pending.innerHTML = `<p>${escapeHtml(error.message)}</p>`;
  }
}

$("#coachForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = $("#coachInput");
  const message = input.value.trim();
  if (!message) return;
  input.value = "";
  sendCoachMessage(message);
});

document.addEventListener("click", (event) => {
  const prompt = event.target.closest("[data-prompt]");
  if (prompt) sendCoachMessage(prompt.dataset.prompt);
  const scroll = event.target.closest("[data-scroll]");
  if (scroll) document.getElementById(scroll.dataset.scroll)?.scrollIntoView({ behavior: "smooth", block: "center" });
});

$("#approveDecision").addEventListener("click", async () => {
  if (!state.currentDecision) return;
  try {
    const result = await request("/api/decisions/approve", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: state.currentDecision.id, action: state.currentDecision.gate.action })
    });
    $("#approvalCard").hidden = true;
    const finalStep = $("#ledger .ledger-step:last-child");
    finalStep.className = "ledger-step complete";
    finalStep.querySelector("strong").textContent = result.result;
    finalStep.querySelector("b").textContent = "✓";
    toast(result.demo ? `${result.result} (simulated)` : result.result);
  } catch (error) { toast(error.message); }
});

$("#declineDecision").addEventListener("click", () => {
  $("#approvalCard").hidden = true;
  toast("Action declined. Nothing changed.");
});

function openFoodDialog() { $("#foodDialog").showModal(); }
$("#openFood").addEventListener("click", openFoodDialog);
$("#quickFood").addEventListener("click", openFoodDialog);

$("#foodImage").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (file.size > 8_000_000) return toast("Choose an image smaller than 8 MB.");
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    state.imageDataUrl = reader.result;
    $("#foodPreview").src = reader.result;
    $("#dropZone").classList.add("has-image");
    $("#mealResult").hidden = true;
  });
  reader.readAsDataURL(file);
});

$("#analyzeFood").addEventListener("click", async () => {
  if (!state.imageDataUrl) return toast("Choose a meal photo first.");
  const button = $("#analyzeFood");
  button.disabled = true;
  button.textContent = "Checking image + rules…";
  try {
    const result = await request("/api/food", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ imageDataUrl: state.imageDataUrl, note: $("#foodNote").value })
    });
    const meal = result.meal;
    $("#mealResult").hidden = false;
    $("#mealResult").innerHTML = `
      <h3>${escapeHtml(meal.summary)}</h3>
      <p>${meal.items.map((item) => `${escapeHtml(item.name)} — ${escapeHtml(item.portion)}`).join(" · ")}</p>
      <div class="meal-macros"><div><span>Energy</span><strong>${escapeHtml(meal.caloriesRange)}</strong></div><div><span>Protein</span><strong>${escapeHtml(meal.proteinRange)}</strong></div><div><span>Carbs</span><strong>${escapeHtml(meal.carbsRange)}</strong></div></div>
      <p><strong>Before logging:</strong> ${meal.questions.map(escapeHtml).join(" ")}</p>
      <button type="button" class="approve" id="reviewMeal">Review in the decision ledger →</button>`;
    $("#reviewMeal").addEventListener("click", () => {
      renderLedger(result.decision);
      $("#foodDialog").close();
      $("#ledger").scrollIntoView({ behavior: "smooth", block: "center" });
    });
    toast(result.mode === "live" ? "Meal analyzed by GPT-5.6" : "Demo meal estimate ready");
  } catch (error) { toast(error.message); }
  finally { button.disabled = false; button.textContent = "Analyze with the harness"; }
});

request("/api/bootstrap").then(renderBootstrap).catch((error) => toast(error.message));

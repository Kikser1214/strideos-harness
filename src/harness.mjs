import fs from "node:fs";

const policyUrl = new URL("../rules/harness-policy.json", import.meta.url);

export function loadPolicy() {
  return JSON.parse(fs.readFileSync(policyUrl, "utf8"));
}

export function gateAction(action, context = {}) {
  const policy = loadPolicy();
  const boundary = policy.boundaries.find((item) => item.action === action);
  if (!boundary) {
    return {
      action,
      mode: "stop",
      allowed: false,
      reason: "Unknown actions are stopped by default."
    };
  }

  if (action === "log_food" && Number(context.confidence ?? 0) < 0.72) {
    return {
      ...boundary,
      allowed: false,
      mode: "confirm",
      reason: "The meal estimate is below the 72% confidence threshold. Confirm the foods and portions first."
    };
  }

  return {
    ...boundary,
    allowed: boundary.mode === "autonomous"
  };
}

export function buildDecision({ evidence, action, context, proposal, resource = null }) {
  const gate = gateAction(action, context);
  return {
    id: `decision_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    evidence,
    gate,
    proposal,
    resource,
    status: gate.mode === "autonomous" ? "completed" : gate.mode === "confirm" ? "awaiting_approval" : "stopped"
  };
}

const runningSessionTypes = new Set(["run_walk", "easy_run", "long_easy", "controlled_quality"]);

export function workoutResourceFromDashboard(dashboard, athleteId = "local-athlete") {
  if (dashboard?.today?.state !== "scheduled") return null;
  const session = dashboard.today.sessions?.find((item) => runningSessionTypes.has(item.type));
  const durationMinutes = Number(session?.durationMinutes);
  if (!session?.id || !session?.title || !Number.isFinite(durationMinutes) || durationMinutes <= 0) return null;
  const safeAthleteId = String(athleteId || "local-athlete").trim().slice(0, 80) || "local-athlete";
  return {
    type: "workout",
    athleteId: safeAthleteId,
    workout: {
      source: "approved_training_plan",
      planId: dashboard.plan?.id || null,
      sessionId: session.id,
      name: session.title,
      sport: "running",
      type: session.type,
      scheduledDate: dashboard.today.date,
      durationMinutes,
      target: session.intensity?.talkTest || session.intensity?.rule || `RPE ${session.intensity?.rpe || "easy"}`,
      intensity: session.intensity || null,
      steps: Array.isArray(session.steps) ? session.steps : []
    }
  };
}

export function demoCoachDecision(message = "", dashboard = null, athleteId = "local-athlete") {
  const normalized = message.toLowerCase();
  const wantsFood = /food|meal|lunch|breakfast|dinner|eat|photo/.test(normalized);
  const mentionsPain = /pain|sharp|dizzy|chest|faint/.test(normalized);

  if (mentionsPain) {
    return buildDecision({
      evidence: ["Athlete message contains a possible symptom or pain signal."],
      action: "medical_red_flag",
      context: {},
      proposal: "Pause the workout. If symptoms are severe, sudden, or worsening, seek qualified medical care."
    });
  }

  if (wantsFood) {
    return buildDecision({
      evidence: ["Meal photo received", "Estimated portion confidence: 68%"],
      action: "log_food",
      context: { confidence: 0.68 },
      proposal: "I see rice, grilled chicken, mixed vegetables, and a light sauce. Confirm the portion sizes before I add the estimate to today's fuel log."
    });
  }

  if (dashboard?.status === "safety_stop") {
    return buildDecision({
      evidence: ["The personal dashboard has an active safety stop."],
      action: "medical_red_flag",
      context: {},
      proposal: "Pause the normal workout path and follow the safety guidance. Seek qualified care for urgent or worsening symptoms."
    });
  }

  if (dashboard) {
    const running = dashboard.today?.sessions?.find((session) => ["run_walk", "easy_run", "long_easy", "controlled_quality"].includes(session.type));
    const evidence = [
      dashboard.plan.label,
      `Recovery: ${dashboard.recovery.status}`,
      dashboard.recovery.pain === null ? "No fresh pain check-in" : `Pain: ${dashboard.recovery.pain}/10`,
      `Data freshness: ${dashboard.sources.status}`
    ];
    if (dashboard.today?.state === "scheduled" && running) {
      const resource = workoutResourceFromDashboard(dashboard, athleteId);
      if (resource) return buildDecision({
        evidence,
        action: "push_garmin_workout",
        context: {},
        proposal: `Keep ${resource.workout.name} for ${resource.workout.durationMinutes} minutes at RPE ${resource.workout.intensity?.rpe || "easy"}. Push this approved session to Garmin?`,
        resource
      });
    }
    return buildDecision({
      evidence,
      action: "read_training_data",
      context: {},
      proposal: dashboard.today?.target || "No active personal session is available today."
    });
  }

  return buildDecision({
    evidence: ["Readiness 74/100", "7.6 h sleep", "No pain reported", "Yesterday RPE 2.5/10"],
    action: "push_garmin_workout",
    context: {},
    proposal: "Keep today's 8 km aerobic run. Start very easy for 10 minutes, then settle into conversational effort. Push it to Garmin?",
    resource: {
      type: "workout",
      athleteId: "demo-alex",
      workout: {
        source: "synthetic_judge_fixture",
        sessionId: "demo_aerobic_rhythm",
        name: "Aerobic rhythm",
        sport: "running",
        type: "easy_run",
        scheduledDate: null,
        distanceKm: 8,
        durationMinutes: null,
        target: "Easy conversational effort",
        intensity: { rpe: "2-4", talkTest: "Full sentences and relaxed form." },
        steps: []
      }
    }
  });
}

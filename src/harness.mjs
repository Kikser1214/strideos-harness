import fs from "node:fs";
import crypto from "node:crypto";

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

  if (action === "write_provider_session" && context.providerRoutePermitted === true && context.executorEnabled === true) {
    return {
      ...boundary,
      allowed: false,
      mode: "confirm",
      reason: "One exact, expiring approval authorizes one attended provider write. Account, route, operation, and payload are bound to the envelope."
    };
  }

  return {
    ...boundary,
    allowed: boundary.mode === "autonomous"
  };
}

function newDecisionId(now = Date.now()) {
  return `decision_${now}_${crypto.randomBytes(4).toString("hex")}`;
}

function asDate(value, label) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) throw new TypeError(`${label} must be a valid date.`);
  return date;
}

function exactText(value, label, maxLength = 160) {
  const text = String(value || "").trim();
  if (!text || text.length > maxLength) throw new TypeError(`${label} must be between 1 and ${maxLength} characters.`);
  return text;
}

const forbiddenProviderPayloadKeys = new Set([
  "password", "passcode", "mfacode", "otp", "cookie", "authorization", "accesstoken", "refreshtoken",
  "sessiontoken", "credential", "credentials", "clientsecret", "secret"
]);

function canonicalApprovalValue(value, path = "payload") {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError(`${path} contains a non-finite number.`);
    return value;
  }
  if (Array.isArray(value)) return value.map((item, index) => canonicalApprovalValue(item, `${path}[${index}]`));
  if (!value || typeof value !== "object" || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    throw new TypeError(`${path} must contain only JSON-safe values.`);
  }
  return Object.fromEntries(Object.keys(value).sort().map((key) => {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (forbiddenProviderPayloadKeys.has(normalizedKey)) {
      throw new TypeError(`${path}.${key} may not contain credentials or session material.`);
    }
    if (value[key] === undefined) throw new TypeError(`${path}.${key} may not be undefined.`);
    return [key, canonicalApprovalValue(value[key], `${path}.${key}`)];
  }));
}

export function providerWriteScopeHash(resource) {
  const canonical = canonicalApprovalValue(resource, "provider write resource");
  return crypto.createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

export function providerWritePayloadHash(payload) {
  const canonical = canonicalApprovalValue(payload, "provider write payload");
  return crypto.createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

export function buildProviderWriteStateBinding({ athleteState = null, planState = null } = {}) {
  return {
    athleteStateVersion: providerWritePayloadHash(athleteState),
    planStateVersion: providerWritePayloadHash(planState)
  };
}

function approvalEnvelopeError(code, message) {
  const error = new TypeError(message);
  error.code = code;
  return error;
}

export function buildDecision({ evidence, action, context, proposal, resource = null, approvalEnvelope = null, id = null, createdAt = null }) {
  let gate = gateAction(action, context);
  if (action === "write_provider_session" && (!approvalEnvelope || approvalEnvelope.kind !== "provider_write_v1")) {
    gate = { ...gate, allowed: false, mode: "stop", reason: "Provider writes stop unless an exact server-authored approval envelope is present." };
  }
  const timestamp = createdAt ? asDate(createdAt, "Decision creation time").toISOString() : new Date().toISOString();
  return {
    id: id || newDecisionId(new Date(timestamp).getTime()),
    createdAt: timestamp,
    evidence,
    gate,
    proposal,
    resource,
    ...(approvalEnvelope ? { approvalEnvelope } : {}),
    status: gate.mode === "autonomous" ? "completed" : gate.mode === "confirm" ? "awaiting_approval" : "stopped"
  };
}

export function buildProviderWriteDecision({
  evidence,
  proposal,
  providerId,
  routeId,
  accountBinding,
  capability,
  operation,
  target,
  stateBinding,
  payload,
  browserContext,
  now = new Date(),
  ttlMs = 5 * 60_000
} = {}) {
  const created = asDate(now, "Approval creation time");
  if (!Number.isInteger(ttlMs) || ttlMs < 1_000 || ttlMs > 15 * 60_000) {
    throw new TypeError("Provider-write approval lifetime must be between 1 second and 15 minutes.");
  }
  const context = {
    surface: browserContext?.surface,
    attended: browserContext?.attended,
    scheduled: browserContext?.scheduled,
    headless: browserContext?.headless
  };
  if (context.surface !== "codex_desktop" || context.attended !== true || context.scheduled !== false || context.headless !== false) {
    throw new TypeError("Provider-write approvals require an explicit attended Codex desktop context.");
  }

  const id = newDecisionId(created.getTime());
  const athleteStateVersion = exactText(stateBinding?.athleteStateVersion, "Athlete state version", 128);
  const planStateVersion = exactText(stateBinding?.planStateVersion, "Plan state version", 128);
  if (!/^[a-f0-9]{64}$/i.test(athleteStateVersion) || !/^[a-f0-9]{64}$/i.test(planStateVersion)) {
    throw new TypeError("Provider-write state versions must be SHA-256 fingerprints.");
  }
  const resource = {
    type: "provider_write",
    providerId: exactText(providerId, "Provider id"),
    routeId: exactText(routeId, "Route id"),
    accountBinding: exactText(accountBinding, "Account binding", 240),
    capability: exactText(capability, "Write capability"),
    operation: exactText(operation, "Write operation"),
    target: exactText(target, "Write target", 240),
    stateBinding: { athleteStateVersion, planStateVersion },
    browserContext: { surface: "codex_desktop", attended: true, scheduled: false, headless: false },
    payload: canonicalApprovalValue(payload, "provider write payload")
  };
  if (!resource.capability.startsWith("write_")) throw new TypeError("Provider-write capability must be a write capability.");
  const scopeHash = providerWriteScopeHash(resource);
  const approvalEnvelope = {
    kind: "provider_write_v1",
    decisionId: id,
    nonce: crypto.randomUUID(),
    scopeHash,
    createdAt: created.toISOString(),
    expiresAt: new Date(created.getTime() + ttlMs).toISOString(),
    maxWrites: 1
  };
  return buildDecision({
    evidence,
    action: "write_provider_session",
    context: { providerRoutePermitted: true, executorEnabled: true },
    proposal,
    resource,
    approvalEnvelope,
    id,
    createdAt: created
  });
}

export function validateProviderWriteApproval(decision, { approvalNonce, scopeHash, now = new Date() } = {}) {
  if (decision?.gate?.action !== "write_provider_session" || decision?.status !== "awaiting_approval") {
    throw approvalEnvelopeError("not_awaiting", "This provider-write decision is not awaiting approval.");
  }
  const envelope = decision.approvalEnvelope;
  const resource = decision.resource;
  if (envelope?.kind !== "provider_write_v1" || resource?.type !== "provider_write") {
    throw approvalEnvelopeError("invalid_envelope", "The provider-write approval envelope is missing or invalid.");
  }
  if (!resource.target || !/^[a-f0-9]{64}$/i.test(resource.stateBinding?.athleteStateVersion || "") || !/^[a-f0-9]{64}$/i.test(resource.stateBinding?.planStateVersion || "")) {
    throw approvalEnvelopeError("invalid_envelope", "The provider-write target or athlete/plan state binding is missing.");
  }
  if (envelope.decisionId !== decision.id || envelope.maxWrites !== 1 || !envelope.nonce || !envelope.scopeHash) {
    throw approvalEnvelopeError("invalid_envelope", "The provider-write approval envelope is not bound to exactly one decision and write.");
  }
  if (approvalNonce !== envelope.nonce || scopeHash !== envelope.scopeHash) {
    throw approvalEnvelopeError("approval_mismatch", "Approve the exact provider-write preview; its one-use proof does not match.");
  }
  if (providerWriteScopeHash(resource) !== envelope.scopeHash) {
    throw approvalEnvelopeError("payload_changed", "The provider-write payload changed after preview and needs a new approval.");
  }

  const created = asDate(envelope.createdAt, "Approval creation time");
  const expires = asDate(envelope.expiresAt, "Approval expiry time");
  const current = asDate(now, "Approval validation time");
  if (created.toISOString() !== decision.createdAt || expires.getTime() <= created.getTime() || expires.getTime() - created.getTime() > 15 * 60_000) {
    throw approvalEnvelopeError("invalid_envelope", "The provider-write approval lifetime is invalid.");
  }
  if (current.getTime() >= expires.getTime()) {
    throw approvalEnvelopeError("expired", "This provider-write approval expired. Create and review a fresh preview.");
  }
  return { envelope, resource };
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

  if (/review my (?:saved )?annotation/.test(normalized) && dashboard?.feedback?.latest) {
    return buildDecision({
      evidence: ["A server-stored workout annotation is available on the personal dashboard."],
      action: "read_training_data",
      context: {},
      proposal: "Use Ask coach to revise in the Coach's margin to create an exact, approvable training-block revision from this annotation. The current plan remains unchanged."
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
      if (resource && dashboard.connector?.workoutDeliverySupported !== true) return buildDecision({
        evidence,
        action: "read_training_data",
        context: {},
        proposal: `Keep ${resource.workout.name} for ${resource.workout.durationMinutes} minutes at RPE ${resource.workout.intensity?.rpe || "easy"}. Garmin agent delivery is unavailable under the current provider-permitted route policy; use the exact local workout as a manual reference.`
      });
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
    proposal: "Keep today's 8 km aerobic run. Start very easy for 10 minutes, then settle into conversational effort. Approve a labeled Garmin-shaped simulation?",
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

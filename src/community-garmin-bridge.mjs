import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

const MAX_BODY_BYTES = 256_000;
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);

export function communityBridgeConfig(env = process.env) {
  const host = env.GARMIN_COMMUNITY_BRIDGE_HOST || "127.0.0.1";
  const port = Number(env.GARMIN_COMMUNITY_BRIDGE_PORT || 8787);
  const pushScript = env.GARMIN_COMMUNITY_PUSH_SCRIPT ? path.resolve(env.GARMIN_COMMUNITY_PUSH_SCRIPT) : null;
  return {
    host,
    port,
    pushScript,
    python: env.GARMIN_COMMUNITY_PYTHON || (process.platform === "win32" ? "python" : "python3"),
    tokenDir: env.GARMIN_COMMUNITY_TOKEN_DIR ? path.resolve(env.GARMIN_COMMUNITY_TOKEN_DIR) : null,
    bridgeToken: env.GARMIN_BRIDGE_TOKEN || null,
    timeoutMs: Number(env.GARMIN_COMMUNITY_TIMEOUT_MS || 45_000)
  };
}

export function validateCommunityBridgeConfig(config) {
  const errors = [];
  if (!LOOPBACK_HOSTS.has(config.host)) errors.push("The community bridge is local-only; use 127.0.0.1, ::1, or localhost.");
  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) errors.push("GARMIN_COMMUNITY_BRIDGE_PORT must be a valid port.");
  if (!config.pushScript) errors.push("Set GARMIN_COMMUNITY_PUSH_SCRIPT to your reviewed Python workout-push script.");
  else if (!fs.existsSync(config.pushScript)) errors.push("GARMIN_COMMUNITY_PUSH_SCRIPT does not exist.");
  if (!config.tokenDir) errors.push("Set GARMIN_COMMUNITY_TOKEN_DIR to the local token directory created by your connector authentication step.");
  if (!Number.isFinite(config.timeoutMs) || config.timeoutMs < 5_000 || config.timeoutMs > 180_000) errors.push("GARMIN_COMMUNITY_TIMEOUT_MS must be between 5000 and 180000.");
  return errors;
}

export function validateWorkoutRequest(body) {
  const workout = body?.workout;
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new TypeError("Expected a JSON object.");
  if (!body.decisionId || !body.athleteId) throw new TypeError("decisionId and athleteId are required.");
  if (!workout || typeof workout !== "object" || Array.isArray(workout)) throw new TypeError("An exact workout object is required.");
  if (workout.source !== "approved_training_plan") throw new TypeError("Only an approved StrideOS training-plan workout may leave simulation.");
  if (!workout.planId || !workout.sessionId || !workout.name || !workout.scheduledDate) throw new TypeError("Workout planId, sessionId, name, and scheduledDate are required.");
  if (!['running', 'run', 'strength', 'gym'].includes(String(workout.sport || workout.type || "").toLowerCase())) throw new TypeError("Only running and strength workout payloads are supported by this bridge.");
  return workout;
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("Request body is too large."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); }
      catch { reject(new Error("Request body must be valid JSON.")); }
    });
    req.on("error", reject);
  });
}

function send(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "content-length": Buffer.byteLength(body), "cache-control": "no-store" });
  res.end(body);
}

function authorized(req, bridgeToken) {
  if (!bridgeToken) return true;
  return req.headers.authorization === `Bearer ${bridgeToken}`;
}

function resultFromStdout(stdout) {
  const lines = stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    try { return JSON.parse(lines[index]); } catch {}
  }
  return null;
}

export async function runCommunityPush({ config, workout }) {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "strideos-garmin-"));
  const workoutFile = path.join(temporaryRoot, "workout.json");
  fs.writeFileSync(workoutFile, JSON.stringify(workout), { encoding: "utf8", mode: 0o600 });
  const args = [config.pushScript, workoutFile, "--token-dir", config.tokenDir, "--date", workout.scheduledDate];

  try {
    const output = await new Promise((resolve, reject) => {
      const child = spawn(config.python, args, {
        windowsHide: true,
        env: { ...process.env, GARMIN_TOKEN_DIR: config.tokenDir },
        stdio: ["ignore", "pipe", "ignore"]
      });
      let stdout = "";
      const timeout = setTimeout(() => child.kill(), config.timeoutMs);
      child.stdout.on("data", (chunk) => { if (stdout.length < 1_000_000) stdout += chunk; });
      child.once("error", (error) => { clearTimeout(timeout); reject(error); });
      child.once("close", (code) => {
        clearTimeout(timeout);
        if (code !== 0) return reject(new Error(`Community push script exited with code ${code}. Review the connector directly in its private terminal.`));
        resolve(stdout);
      });
    });
    const result = resultFromStdout(output);
    if (!result || result.success !== true) throw new Error(result?.error || "Community push script did not return a successful JSON result.");
    return {
      performed: true,
      provider: "garmin_community_local",
      workoutId: result.garmin_workout_id || null,
      scheduledFor: result.scheduled_for || workout.scheduledDate
    };
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

export function createCommunityBridge(config = communityBridgeConfig()) {
  const errors = validateCommunityBridgeConfig(config);
  if (errors.length) throw new Error(errors.join(" "));
  return http.createServer(async (req, res) => {
    if (req.method === "GET" && req.url === "/health") return send(res, 200, { ok: true, mode: "garmin_community_local", connected: false });
    if (req.method !== "POST" || req.url !== "/workouts") return send(res, 404, { error: "Not found." });
    if (!authorized(req, config.bridgeToken)) return send(res, 401, { error: "Unauthorized." });
    try {
      const body = await readJson(req);
      const workout = validateWorkoutRequest(body);
      const result = await runCommunityPush({ config, workout });
      return send(res, 200, result);
    } catch (error) {
      return send(res, error instanceof TypeError ? 422 : 502, { error: error.message });
    }
  });
}

function start() {
  const config = communityBridgeConfig();
  const server = createCommunityBridge(config);
  server.listen(config.port, config.host, () => {
    console.log(`StrideOS Garmin community bridge listening on http://${config.host}:${config.port}.`);
    console.log("Local adapter ready. Athlete connection is not asserted; test authentication separately before approving a write.");
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) start();

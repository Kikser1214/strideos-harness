import "./env.mjs";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { garminStatus, pushWorkout } from "./garmin.mjs";
import { analyzeMeal, coach } from "./openai.mjs";
import { buildDecision, demoCoachDecision, loadPolicy } from "./harness.mjs";
import { findDecision, recentDecisions, saveDecision, updateDecision } from "./store.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(root, "../public");
const demoAthlete = JSON.parse(fs.readFileSync(new URL("../data/demo-athlete.json", import.meta.url), "utf8"));

const types = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png"
};

function securityHeaders() {
  return {
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    "permissions-policy": "camera=(), microphone=(), geolocation=()",
    "content-security-policy": "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self' https://api.openai.com"
  };
}

function json(res, status, data) {
  res.writeHead(status, { ...securityHeaders(), "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(data));
}

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

async function readJson(req, maxBytes = 12_000_000) {
  if (!String(req.headers["content-type"] || "").toLowerCase().startsWith("application/json")) {
    throw new HttpError(415, "Send JSON with content-type application/json.");
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) throw new HttpError(413, "Request is too large.");
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); }
  catch { throw new HttpError(400, "Request body is not valid JSON."); }
}

function validateImage(dataUrl) {
  const match = /^data:image\/(png|jpeg|webp);base64,([a-z0-9+/=]+)$/i.exec(dataUrl || "");
  if (!match) throw new HttpError(400, "Choose a valid PNG, JPG, or WEBP meal photo.");
  if (Buffer.byteLength(match[2], "base64") > 8_000_000) throw new HttpError(413, "Choose an image smaller than 8 MB.");
}

async function api(req, res, pathname) {
  if (req.method === "GET" && pathname === "/api/health") {
    return json(res, 200, { ok: true, openai: Boolean(process.env.OPENAI_API_KEY), garmin: garminStatus() });
  }

  if (req.method === "GET" && pathname === "/api/bootstrap") {
    return json(res, 200, {
      mode: process.env.OPENAI_API_KEY ? "live" : "demo",
      model: process.env.OPENAI_MODEL || "gpt-5.6",
      athlete: demoAthlete,
      policy: loadPolicy(),
      connectors: { garmin: garminStatus() },
      decisions: recentDecisions()
    });
  }

  if (req.method === "POST" && pathname === "/api/coach") {
    const body = await readJson(req);
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) throw new HttpError(400, "Write a message first.");
    if (message.length > 2_000) throw new HttpError(400, "Keep the message under 2,000 characters.");
    const result = await coach({ message, athlete: demoAthlete });
    const decision = result ? buildDecision({
      evidence: result.evidence, action: result.action,
      context: { confidence: result.confidence }, proposal: result.proposal
    }) : demoCoachDecision(message);
    saveDecision(decision);
    return json(res, 200, { decision, mode: result ? "live" : "demo" });
  }

  if (req.method === "POST" && pathname === "/api/food") {
    const body = await readJson(req);
    validateImage(body.imageDataUrl);
    const result = await analyzeMeal({ imageDataUrl: body.imageDataUrl, note: String(body.note || "").slice(0, 500) });
    const meal = result || {
      summary: "Sample meal estimate (demo mode)",
      items: [
        { name: "Rice", portion: "about 1.5 cups", confidence: 0.74 },
        { name: "Grilled chicken", portion: "about 140 g", confidence: 0.78 },
        { name: "Mixed vegetables", portion: "about 1 cup", confidence: 0.81 }
      ],
      caloriesRange: "620–790 kcal", proteinRange: "42–55 g", carbsRange: "72–96 g",
      questions: ["Was there oil or butter in the rice?", "How much sauce did you use?"], confidence: 0.7
    };
    const decision = buildDecision({
      evidence: [result ? "Meal image analyzed" : "Synthetic demo estimate; image was not inspected", `Estimate confidence: ${Math.round(meal.confidence * 100)}%`],
      action: "log_food", context: { confidence: meal.confidence },
      proposal: "Confirm the detected foods and portions before adding this estimate to today's fuel log."
    });
    saveDecision(decision);
    return json(res, 200, {
      meal, decision, mode: result ? "live" : "demo",
      disclosure: result ? null : "Demo mode uses a fixed sample estimate. Add an OpenAI API key for real image analysis."
    });
  }

  if (req.method === "POST" && pathname === "/api/decisions/approve") {
    const body = await readJson(req);
    const decision = findDecision(body.id);
    if (!decision) throw new HttpError(404, "Decision not found. Create a new trace first.");
    if (decision.status !== "awaiting_approval") throw new HttpError(409, "This decision is no longer awaiting approval.");

    let actionResult;
    if (decision.gate.action === "push_garmin_workout") actionResult = await pushWorkout({ decision, athlete: demoAthlete });
    else actionResult = { performed: true, simulated: !process.env.OPENAI_API_KEY, message: "Estimate added to the local fuel log." };

    const updated = updateDecision(decision.id, { status: "approved", result: actionResult });
    return json(res, 200, { decision: updated, result: actionResult.message, simulated: actionResult.simulated });
  }

  if (req.method === "POST" && pathname === "/api/decisions/decline") {
    const body = await readJson(req);
    const decision = findDecision(body.id);
    if (!decision) throw new HttpError(404, "Decision not found.");
    if (decision.status !== "awaiting_approval") throw new HttpError(409, "This decision is no longer awaiting approval.");
    const updated = updateDecision(decision.id, { status: "declined", result: { performed: false, message: "Action declined. Nothing changed." } });
    return json(res, 200, { decision: updated, result: updated.result.message });
  }

  return json(res, 404, { error: "Not found." });
}

function staticFile(res, pathname) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const file = path.resolve(publicDir, `.${requested}`);
  if (!file.startsWith(`${publicDir}${path.sep}`) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return false;
  res.writeHead(200, { ...securityHeaders(), "content-type": types[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
  return true;
}

export function createServer() {
  return http.createServer(async (req, res) => {
    const pathname = new URL(req.url, `http://${req.headers.host || "localhost"}`).pathname;
    try {
      if (pathname.startsWith("/api/")) return await api(req, res, pathname);
      if (staticFile(res, pathname)) return;
      res.writeHead(404, { ...securityHeaders(), "content-type": "text/plain; charset=utf-8" });
      res.end("Not found");
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      if (status === 500) console.error(error);
      json(res, status, { error: status === 500 ? "The harness could not complete that request." : error.message });
    }
  });
}

export function startServer(port = Number(process.env.PORT || 4173)) {
  const server = createServer();
  return server.listen(port, () => console.log(`StrideOS running at http://localhost:${server.address().port}`));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) startServer();

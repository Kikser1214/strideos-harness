import "./env.mjs";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeMeal, coach } from "./openai.mjs";
import { buildDecision, demoCoachDecision, loadPolicy } from "./harness.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(root, "../public");
const demoAthlete = JSON.parse(fs.readFileSync(new URL("../data/demo-athlete.json", import.meta.url), "utf8"));
const port = Number(process.env.PORT || 4173);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png"
};

function json(res, status, data) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

async function readJson(req, maxBytes = 12_000_000) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) throw new Error("Request is too large.");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

async function api(req, res, pathname) {
  if (req.method === "GET" && pathname === "/api/bootstrap") {
    return json(res, 200, {
      mode: process.env.OPENAI_API_KEY ? "live" : "demo",
      model: process.env.OPENAI_MODEL || "gpt-5.6",
      athlete: demoAthlete,
      policy: loadPolicy()
    });
  }

  if (req.method === "POST" && pathname === "/api/coach") {
    const body = await readJson(req);
    if (!body.message?.trim()) return json(res, 400, { error: "Write a message first." });
    const result = await coach({ message: body.message, athlete: demoAthlete });
    if (!result) return json(res, 200, { decision: demoCoachDecision(body.message), mode: "demo" });
    return json(res, 200, {
      decision: buildDecision({
        evidence: result.evidence,
        action: result.action,
        context: { confidence: result.confidence },
        proposal: result.proposal
      }),
      mode: "live"
    });
  }

  if (req.method === "POST" && pathname === "/api/food") {
    const body = await readJson(req);
    if (!body.imageDataUrl) return json(res, 400, { error: "Choose a meal photo first." });
    const result = await analyzeMeal(body);
    const meal = result || {
      summary: "Rice bowl with grilled chicken, mixed vegetables, and a light sauce",
      items: [
        { name: "Rice", portion: "about 1.5 cups", confidence: 0.74 },
        { name: "Grilled chicken", portion: "about 140 g", confidence: 0.78 },
        { name: "Mixed vegetables", portion: "about 1 cup", confidence: 0.81 }
      ],
      caloriesRange: "620–790 kcal",
      proteinRange: "42–55 g",
      carbsRange: "72–96 g",
      questions: ["Was there oil or butter in the rice?", "How much sauce did you use?"],
      confidence: 0.7
    };
    return json(res, 200, {
      meal,
      decision: buildDecision({
        evidence: ["Meal image analyzed", `Overall estimate confidence: ${Math.round(meal.confidence * 100)}%`],
        action: "log_food",
        context: { confidence: meal.confidence },
        proposal: "Confirm the detected foods and portions before adding this estimate to today's fuel log."
      }),
      mode: result ? "live" : "demo"
    });
  }

  if (req.method === "POST" && pathname === "/api/decisions/approve") {
    const body = await readJson(req);
    return json(res, 200, {
      id: body.id,
      status: "approved",
      result: body.action === "push_garmin_workout" ? "Workout queued for Garmin." : "Estimate added to today's demo log.",
      demo: !process.env.OPENAI_API_KEY
    });
  }

  return json(res, 404, { error: "Not found." });
}

function staticFile(res, pathname) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const file = path.resolve(publicDir, `.${requested}`);
  if (!file.startsWith(publicDir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return false;
  res.writeHead(200, { "content-type": types[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
  return true;
}

const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url, `http://${req.headers.host || "localhost"}`).pathname;
  try {
    if (pathname.startsWith("/api/")) return await api(req, res, pathname);
    if (staticFile(res, pathname)) return;
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
  } catch (error) {
    json(res, 500, { error: error instanceof Error ? error.message : "Unexpected error." });
  }
});

server.listen(port, () => {
  console.log(`StrideOS running at http://localhost:${port} (${process.env.OPENAI_API_KEY ? "GPT-5.6 live" : "judge demo"} mode)`);
});

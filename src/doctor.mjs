import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { validateProfile } from "./onboarding.mjs";

function envKeys(file) {
  const seen = new Set();
  const invalid = [];
  if (!fs.existsSync(file)) return { exists: false, seen, invalid };
  for (const [index, raw] of fs.readFileSync(file, "utf8").split(/\r?\n/).entries()) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const match = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line);
    if (!match) invalid.push(index + 1);
    else seen.add(match[1]);
  }
  return { exists: true, seen, invalid };
}

function writableAncestor(target) {
  let current = path.resolve(target);
  while (!fs.existsSync(current)) {
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
  try { fs.accessSync(current, fs.constants.W_OK); return current; }
  catch { return null; }
}

async function portAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.once("error", () => resolve(false));
    server.listen(port, "127.0.0.1", () => server.close(() => resolve(true)));
  });
}

export async function runDoctor({ root = path.resolve(path.dirname(new URL(import.meta.url).pathname), ".."), env = process.env, inspectPort = true } = {}) {
  const normalizedRoot = process.platform === "win32" && /^\/[A-Za-z]:/.test(root) ? root.slice(1) : root;
  const checks = [];
  const add = (id, status, message) => checks.push({ id, status, message });

  const major = Number(process.versions.node.split(".")[0]);
  add("node", major >= 20 ? "pass" : "fail", `Node ${process.versions.node}; StrideOS requires Node 20 or newer.`);

  const packageFile = path.join(normalizedRoot, "package.json");
  add("workspace", fs.existsSync(packageFile) ? "pass" : "fail", fs.existsSync(packageFile) ? `StrideOS workspace found at ${normalizedRoot}.` : "Run the doctor from the StrideOS repository root.");

  let dependencyReady = false;
  if (fs.existsSync(packageFile)) {
    try { createRequire(packageFile).resolve("@garmin/fitsdk"); dependencyReady = true; } catch {}
  }
  add("dependency", dependencyReady ? "pass" : "fail", dependencyReady ? "Garmin FIT SDK dependency is installed." : "Dependency missing. Run npm install or npm run setup.");

  const localEnv = envKeys(path.join(normalizedRoot, ".env"));
  add("env", localEnv.invalid.length ? "fail" : localEnv.exists ? "pass" : "info", localEnv.invalid.length ? `.env has invalid lines: ${localEnv.invalid.join(", ")}.` : localEnv.exists ? ".env syntax looks valid; secret values were not printed." : "No .env file; deterministic local demo mode is available.");
  add("openai", localEnv.seen.has("OPENAI_API_KEY") || env.OPENAI_API_KEY ? "pass" : "info", localEnv.seen.has("OPENAI_API_KEY") || env.OPENAI_API_KEY ? "OpenAI key variable is configured server-side." : "OPENAI_API_KEY is optional; GPT-5.6 live calls remain off.");

  const stateTarget = env.STRIDEOS_STATE_FILE || path.join(os.tmpdir(), "strideos-harness-state.json");
  const writable = writableAncestor(path.dirname(stateTarget));
  add("state", writable ? "pass" : "fail", writable ? `Local state parent is writable: ${writable}.` : `State path is not writable: ${stateTarget}.`);

  const port = Number(env.PORT || 4173);
  if (!Number.isInteger(port) || port < 1 || port > 65535) add("port", "fail", "PORT must be an integer from 1 to 65535.");
  else if (inspectPort) {
    const available = await portAvailable(port);
    add("port", available ? "pass" : "fail", `Port ${port} is ${available ? "available" : "already in use"}.`);
  }
  else add("port", "info", `Port check skipped; configured port is ${port}.`);

  const ignoreFile = path.join(normalizedRoot, ".gitignore");
  const ignore = fs.existsSync(ignoreFile) ? fs.readFileSync(ignoreFile, "utf8") : "";
  const requiredIgnores = [".env", "node_modules/", "data/private/", "uploads/", "*.log", "output/"];
  const missingIgnores = requiredIgnores.filter((entry) => !ignore.split(/\r?\n/).includes(entry));
  add("gitignore", missingIgnores.length ? "fail" : "pass", missingIgnores.length ? `Missing private/runtime ignores: ${missingIgnores.join(", ")}.` : "Secrets, dependencies, uploads, logs, and runtime output are ignored.");

  const sampleFile = path.join(normalizedRoot, "data", "sample-profile.json");
  try {
    const sample = JSON.parse(fs.readFileSync(sampleFile, "utf8"));
    const validation = validateProfile(sample);
    add("sample", validation.valid ? "pass" : "fail", validation.valid ? "Synthetic sample profile passes the current onboarding schema." : `Sample profile is missing: ${validation.missing.join(", ")}.`);
  } catch (error) { add("sample", "fail", `Sample profile could not be read: ${error.message}`); }

  for (const file of ["LICENSE", "PRIVACY.md", "docs/INSTALL.md"]) add(`file:${file}`, fs.existsSync(path.join(normalizedRoot, file)) ? "pass" : "fail", `${file} ${fs.existsSync(path.join(normalizedRoot, file)) ? "is present" : "is missing"}.`);

  const failed = checks.filter((check) => check.status === "fail");
  return { ok: failed.length === 0, mode: localEnv.seen.has("OPENAI_API_KEY") || env.OPENAI_API_KEY ? "live-capable" : "demo", checks, failed: failed.length };
}

function print(report) {
  console.log("StrideOS setup doctor\n");
  for (const check of report.checks) console.log(`${check.status === "pass" ? "[OK]" : check.status === "fail" ? "[FAIL]" : "[INFO]"} ${check.message}`);
  console.log(`\n${report.ok ? `Ready in ${report.mode} mode. Start with npm start and open http://localhost:${process.env.PORT || 4173}.` : `${report.failed} blocking setup check${report.failed === 1 ? "" : "s"} failed.`}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const report = await runDoctor({ root: process.cwd() });
  print(report);
  if (!report.ok) process.exitCode = 1;
}

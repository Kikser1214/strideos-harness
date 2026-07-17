import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createServer } from "../src/server.mjs";
import { resetState } from "../src/store.mjs";

const stateFile = path.join(os.tmpdir(), `strideos-test-${process.pid}.json`);
process.env.STRIDEOS_STATE_FILE = stateFile;
delete process.env.OPENAI_API_KEY;
delete process.env.GARMIN_BRIDGE_URL;

async function withServer(run) {
  resetState();
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try { await run(base); }
  finally { await new Promise((resolve) => server.close(resolve)); }
}

async function post(base, pathname, body) {
  return fetch(`${base}${pathname}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}

test("bootstrap reports connector truthfully", () => withServer(async (base) => {
  const response = await fetch(`${base}/api/bootstrap`);
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.mode, "demo");
  assert.equal(data.connectors.garmin.mode, "simulation");
  assert.equal(data.connectors.garmin.configured, false);
}));

test("decision approval is server-authoritative and survives bootstrap", () => withServer(async (base) => {
  const coached = await post(base, "/api/coach", { message: "Should I run today?" });
  const { decision } = await coached.json();
  const approved = await post(base, "/api/decisions/approve", { id: decision.id, action: "erase_everything" });
  const result = await approved.json();
  assert.equal(approved.status, 200);
  assert.equal(result.simulated, true);
  assert.match(result.result, /no external calendar changed/i);

  const bootstrap = await (await fetch(`${base}/api/bootstrap`)).json();
  assert.equal(bootstrap.decisions[0].id, decision.id);
  assert.equal(bootstrap.decisions[0].status, "approved");
}));

test("unknown and duplicate approvals are rejected", () => withServer(async (base) => {
  const missing = await post(base, "/api/decisions/approve", { id: "missing" });
  assert.equal(missing.status, 404);
  const coached = await (await post(base, "/api/coach", { message: "Should I run today?" })).json();
  assert.equal((await post(base, "/api/decisions/approve", { id: coached.decision.id })).status, 200);
  assert.equal((await post(base, "/api/decisions/approve", { id: coached.decision.id })).status, 409);
}));

test("safety decisions cannot be approved", () => withServer(async (base) => {
  const coached = await (await post(base, "/api/coach", { message: "I have sharp chest pain and feel dizzy." })).json();
  assert.equal(coached.decision.status, "stopped");
  assert.equal((await post(base, "/api/decisions/approve", { id: coached.decision.id })).status, 409);
}));

test("meal upload rejects non-image data", () => withServer(async (base) => {
  const response = await post(base, "/api/food", { imageDataUrl: "data:text/plain;base64,SGVsbG8=" });
  assert.equal(response.status, 400);
}));

test.after(() => { try { fs.rmSync(stateFile); } catch {} });

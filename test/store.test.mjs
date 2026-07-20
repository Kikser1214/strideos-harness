import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { claimDecisionExecution, readState, resetState, saveDecision, updateDecision } from "../src/store.mjs";

const directory = fs.mkdtempSync(path.join(os.tmpdir(), "strideos-store-test-"));
const file = path.join(directory, "state.json");
process.env.STRIDEOS_STATE_FILE = file;

test("malformed local state is preserved as a recoverable backup", () => {
  fs.writeFileSync(file, "{not valid json", "utf8");
  const recovered = readState();
  assert.equal(recovered.version, 7);
  assert.equal(recovered.onboarding, null);
  assert.equal(fs.existsSync(file), false);
  const backups = fs.readdirSync(directory).filter((name) => name.startsWith("state.corrupt-") && name.endsWith(".json"));
  assert.equal(backups.length, 1);
  assert.equal(fs.readFileSync(path.join(directory, backups[0]), "utf8"), "{not valid json");
  resetState();
  assert.equal(readState().version, 7);
});

test("provider execution claims remain one-use even if state is accidentally rewound", () => {
  resetState();
  const decision = { id: "decision-atomic", status: "awaiting_approval", approvalEnvelope: { nonce: "one-use-nonce" } };
  saveDecision(decision);
  const first = claimDecisionExecution(decision.id, { approvalNonce: "one-use-nonce", update: { executionClaimedAt: "2026-07-20T05:00:00.000Z" } });
  assert.equal(first.status, "executing");
  updateDecision(decision.id, { status: "awaiting_approval" });
  const replay = claimDecisionExecution(decision.id, { approvalNonce: "one-use-nonce" });
  assert.equal(replay, null);
});

test.after(() => fs.rmSync(directory, { recursive: true, force: true }));

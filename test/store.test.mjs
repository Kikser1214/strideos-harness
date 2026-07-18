import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { readState, resetState } from "../src/store.mjs";

const directory = fs.mkdtempSync(path.join(os.tmpdir(), "strideos-store-test-"));
const file = path.join(directory, "state.json");
process.env.STRIDEOS_STATE_FILE = file;

test("malformed local state is preserved as a recoverable backup", () => {
  fs.writeFileSync(file, "{not valid json", "utf8");
  const recovered = readState();
  assert.equal(recovered.version, 6);
  assert.equal(recovered.onboarding, null);
  assert.equal(fs.existsSync(file), false);
  const backups = fs.readdirSync(directory).filter((name) => name.startsWith("state.corrupt-") && name.endsWith(".json"));
  assert.equal(backups.length, 1);
  assert.equal(fs.readFileSync(path.join(directory, backups[0]), "utf8"), "{not valid json");
  resetState();
  assert.equal(readState().version, 6);
});

test.after(() => fs.rmSync(directory, { recursive: true, force: true }));

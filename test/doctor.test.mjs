import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runDoctor } from "../src/doctor.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("setup doctor validates the checked-in clean-clone contract", async () => {
  const report = await runDoctor({ root, env: {}, inspectPort: false });
  assert.equal(report.ok, true, report.checks.filter((check) => check.status === "fail").map((check) => check.message).join("\n"));
  assert.equal(report.mode, "demo");
  assert.ok(report.checks.some((check) => check.id === "sample" && check.status === "pass"));
  assert.ok(report.checks.some((check) => check.id === "gitignore" && check.status === "pass"));
});

import test from "node:test";
import assert from "node:assert/strict";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  findProhibitedRouteRecipes,
  parseStrictYaml,
  validatePlugin
} from "../scripts/validate-plugin.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pluginRoot = join(root, "plugins", "strideos");
const manifestPath = join(pluginRoot, ".codex-plugin", "plugin.json");
const marketplacePath = join(root, ".agents", "plugins", "marketplace.json");
const expectedSkills = [
  "build-coach-room",
  "coach-athlete",
  "plan-training",
  "schedule-coaching",
  "support-fueling",
  "use-training-data"
];

function textFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory)) {
    const absolute = join(directory, entry);
    if (statSync(absolute).isDirectory()) files.push(...textFiles(absolute));
    else if (/\.(?:json|md|ya?ml)$/i.test(entry)) files.push(absolute);
  }
  return files;
}

function frontmatter(markdown, label) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  assert.ok(match, "SKILL.md must begin with YAML frontmatter");
  return parseStrictYaml(match[1], label);
}

test("portable release validator accepts the complete plugin package", () => {
  assert.deepEqual(validatePlugin(pluginRoot), []);
});

test("portable YAML parser rejects duplicate keys and malformed nesting", () => {
  assert.throws(
    () => parseStrictYaml("name: one\nname: two", "fixture.yaml"),
    /duplicates key name/
  );
  assert.throws(
    () => parseStrictYaml("interface:\n   display_name: Bad", "fixture.yaml"),
    /indentation must use two-space levels/
  );
});

test("portable validator rejects invalid schema, paths, prompts, and agent YAML", () => {
  const temporaryRoot = mkdtempSync(join(tmpdir(), "strideos-plugin-test-"));
  const fixtureRoot = join(temporaryRoot, "strideos");
  try {
    cpSync(pluginRoot, fixtureRoot, { recursive: true });
    const fixtureManifestPath = join(fixtureRoot, ".codex-plugin", "plugin.json");
    const manifest = JSON.parse(readFileSync(fixtureManifestPath, "utf8"));
    manifest.hooks = "./hooks.json";
    manifest.interface.logo = "../outside.svg";
    manifest.interface.defaultPrompt = ["one", "two", "three", "four"];
    manifest.mcpServers = { broken: "not-an-object" };
    writeFileSync(fixtureManifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

    const agentPath = join(fixtureRoot, "skills", "coach-athlete", "agents", "openai.yaml");
    writeFileSync(agentPath, `${readFileSync(agentPath, "utf8")}\ninterface:\n  display_name: Duplicate\n`);

    const errors = validatePlugin(fixtureRoot).join("\n");
    assert.match(errors, /field `hooks` is not accepted/);
    assert.match(errors, /logo must be a \.\/-relative POSIX path/);
    assert.match(errors, /defaultPrompt must contain 1-3/);
    assert.match(errors, /mcpServers\.broken must be an object/);
    assert.match(errors, /duplicates key interface/);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("StrideOS plugin manifest describes a distributable skill package", () => {
  assert.ok(existsSync(manifestPath));
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

  assert.equal(manifest.name, "strideos");
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
  assert.equal(manifest.skills, "./skills/");
  assert.equal(manifest.license, "MIT");
  assert.equal(manifest.interface.displayName, "StrideOS");
  assert.ok(Array.isArray(manifest.interface.defaultPrompt));
  assert.ok(manifest.interface.defaultPrompt.length >= 1 && manifest.interface.defaultPrompt.length <= 3);
  assert.ok(manifest.interface.capabilities.includes("Interactive"));

  for (const assetField of ["composerIcon", "logo"]) {
    const relative = manifest.interface[assetField];
    assert.match(relative, /^\.\//);
    assert.ok(existsSync(join(pluginRoot, relative.slice(2))), `${assetField} must exist`);
  }

  assert.equal("mcpServers" in manifest, false, "do not claim an MCP server that is not packaged");
  assert.equal("apps" in manifest, false, "do not claim an app that is not packaged");
});

test("repository marketplace exposes StrideOS to supported plugin browsers", () => {
  assert.ok(existsSync(marketplacePath));
  const marketplace = JSON.parse(readFileSync(marketplacePath, "utf8"));
  assert.equal(marketplace.name, "strideos");
  assert.equal(marketplace.interface?.displayName, "StrideOS");
  assert.equal(marketplace.plugins?.length, 1);
  const entry = marketplace.plugins[0];
  assert.equal(entry.name, "strideos");
  assert.deepEqual(entry.source, { source: "local", path: "./plugins/strideos" });
  assert.equal(entry.policy?.installation, "AVAILABLE");
  assert.equal(entry.policy?.authentication, "ON_INSTALL");
  assert.equal(entry.category, "Health & Fitness");
});

test("StrideOS exposes the complete focused skill set", () => {
  const skillsRoot = join(pluginRoot, "skills");
  const actual = readdirSync(skillsRoot)
    .filter((entry) => statSync(join(skillsRoot, entry)).isDirectory())
    .sort();
  assert.deepEqual(actual, expectedSkills);

  for (const skill of actual) {
    const skillPath = join(skillsRoot, skill, "SKILL.md");
    const agentPath = join(skillsRoot, skill, "agents", "openai.yaml");
    const referenceRoot = join(skillsRoot, skill, "references");
    assert.ok(existsSync(skillPath), `${skill} is missing SKILL.md`);
    assert.ok(existsSync(agentPath), `${skill} is missing agents/openai.yaml`);
    assert.ok(existsSync(referenceRoot), `${skill} is missing references`);
    assert.ok(readdirSync(referenceRoot).some((entry) => entry.endsWith(".md")), `${skill} needs a reference`);

    const markdown = readFileSync(skillPath, "utf8");
    const metadata = frontmatter(markdown, skillPath);
    assert.deepEqual(Object.keys(metadata).sort(), ["description", "name"]);
    assert.equal(metadata.name, skill);
    assert.ok(metadata.description.length >= 80, `${skill} needs a trigger-rich description`);
    assert.ok(markdown.split(/\r?\n/).length < 500, `${skill} should stay concise`);
    assert.doesNotMatch(markdown, /\[TODO:|TODO\b/);

    const yaml = parseStrictYaml(readFileSync(agentPath, "utf8"), agentPath);
    assert.equal(typeof yaml.interface, "object");
    assert.match(yaml.interface.default_prompt, new RegExp(`\\$${skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`));
    assert.equal(yaml.policy.allow_implicit_invocation, false);
  }
});

test("plugin guidance contains no prohibited provider-route recipe", () => {
  const combined = textFiles(pluginRoot)
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");

  assert.deepEqual(findProhibitedRouteRecipes(combined), []);
  assert.match(combined, /recommendations? (?:is|are) not an allowlist/i);
  assert.match(combined, /(?:steps? aside|outside (?:the )?plugin scope)/i);
  assert.match(combined, /One approval (?:authorizes|means) one write/i);
  assert.match(combined, /initial request establishes intent; it is not approval/i);
  assert.match(combined, /manual (?:entry|check-in)/i);
  assert.doesNotMatch(combined, /StrideOS (?:policy|plugin) (?:forbids|prohibits|blocks)/i);
  assert.doesNotMatch(combined, /cannot (?:override|use)[^.\n]{0,80}(?:StrideOS|plugin) policy/i);
});

test("prohibited-route guard catches actionable recipes but permits safety statements", () => {
  const actionable = [
    "Run `pip install python-garminconnect` and import the client.",
    "Use Playwright to scrape Garmin Connect workouts from the signed-in page.",
    "Configure an unofficial Strava adapter as a personal bridge.",
    "```sh\nnpx playwright codegen https://connect.garmin.com/modern/workouts\n```"
  ];
  for (const recipe of actionable) {
    assert.notDeepEqual(findProhibitedRouteRecipes(recipe, "fixture"), [], recipe);
  }

  const safetyStatements = [
    "Never teach prohibited or unofficial routes.",
    "StrideOS does not ship unofficial provider connectors.",
    "Official recommendations are not an allowlist.",
    "A user-selected host capability is outside plugin scope."
  ];
  for (const statement of safetyStatements) {
    assert.deepEqual(findProhibitedRouteRecipes(statement, "fixture"), [], statement);
  }
});

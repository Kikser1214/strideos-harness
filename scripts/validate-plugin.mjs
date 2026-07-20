#!/usr/bin/env node

import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultPluginRoot = join(repositoryRoot, "plugins", "strideos");
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const PLUGIN_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const TOP_LEVEL_FIELDS = new Set([
  "id", "name", "version", "description", "skills", "apps", "mcpServers",
  "interface", "author", "homepage", "repository", "license", "keywords"
]);
const INTERFACE_FIELDS = new Set([
  "displayName", "shortDescription", "longDescription", "developerName", "category",
  "capabilities", "websiteURL", "privacyPolicyURL", "termsOfServiceURL", "brandColor",
  "composerIcon", "logo", "logoDark", "screenshots", "defaultPrompt", "default_prompt"
]);
const SKILL_FIELDS = new Set(["name", "description", "license", "allowed-tools", "metadata"]);
const AGENT_FIELDS = new Set(["interface", "policy", "dependencies"]);
const AGENT_INTERFACE_FIELDS = new Set([
  "display_name", "short_description", "icon_small", "icon_large", "brand_color", "default_prompt"
]);
const PROVIDERS = "garmin(?: connect)?|strava|whoop|oura|fitbit|polar|coros|suunto|apple health|health connect";
const NEGATIVE_SAFETY = /\b(?:never|must not|do not|don't|cannot|can't|prohibit(?:ed|s)?|not (?:offered|allowed|permitted|supported|available)|unavailable|fail(?:s|ed)? closed|no actionable|without teaching)\b/i;
const EXECUTABLE_MARKER = /(?:`{3}|\bpip(?:3)?\s+install\b|\bnpm\s+(?:i|install)\b|\bimport\s+[\w.-]+|\brequire\s*\(|\bpython(?:3)?\s+\S+|\bnpx\s+\S+|\bplaywright\s+(?:codegen|open|test)\b|\bhttps?:\/\/\S+(?:login|connect|api|workout|calendar)|\b(?:click|fill|submit|save)\s+(?:the\s+)?(?:button|form|workout|calendar)\b)/i;
const ACTIONABLE_ROUTE_PATTERNS = [
  new RegExp(`\\b(?:python[-_. ]?garminconnect|garminconnect(?:\\.py|\\s+(?:client|library|module|python)))\\b`, "i"),
  new RegExp(`\\b(?:playwright|selenium|puppeteer)\\b.{0,100}\\b(?:${PROVIDERS})\\b|\\b(?:${PROVIDERS})\\b.{0,100}\\b(?:playwright|selenium|puppeteer)\\b`, "i"),
  new RegExp(`\\b(?:scrap(?:e|ing)|crawl(?:ing)?|reverse[- ]engineer(?:ing)?|intercept(?:ing)?|browser extraction|automate(?:d|s|ing)? (?:the )?(?:signed[- ]in|login|web))\\b.{0,100}\\b(?:${PROVIDERS})\\b|\\b(?:${PROVIDERS})\\b.{0,100}\\b(?:scrap(?:e|ing)|crawl(?:ing)?|reverse[- ]engineer(?:ing)?|intercept(?:ing)?|browser extraction)\\b`, "i"),
  new RegExp(`\\b(?:unofficial|community[- ]maintained|personal)\\s+(?:${PROVIDERS}\\s+)?(?:api|client|adapter|bridge|connector|route|script)\\b`, "i"),
  new RegExp(`\\b(?:${PROVIDERS})\\b.{0,80}\\b(?:unofficial|community[- ]maintained|personal)\\s+(?:api|client|adapter|bridge|connector|route|script)\\b`, "i")
];

function fail(errors, message) {
  errors.push(message);
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function rejectUnknown(object, allowed, label, errors) {
  for (const key of Object.keys(object)) {
    if (!allowed.has(key)) fail(errors, `${label} field \`${key}\` is not accepted`);
  }
}

function requireString(object, key, label, errors) {
  const value = object?.[key];
  if (typeof value !== "string" || value.trim() === "") {
    fail(errors, `${label}.${key} must be a non-empty string`);
    return null;
  }
  return value;
}

function validateHttps(value, label, errors) {
  if (value === undefined) return;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !url.hostname) throw new Error("not https");
  } catch {
    fail(errors, `${label} must be an absolute https:// URL`);
  }
}

function readJsonObject(path, label, errors) {
  let payload;
  try {
    payload = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    fail(errors, `${label} must contain valid JSON`);
    return null;
  }
  if (!isObject(payload)) {
    fail(errors, `${label} must contain a JSON object`);
    return null;
  }
  return payload;
}

function validateMcpEntries(entries, label, errors) {
  if (!isObject(entries)) {
    fail(errors, `${label} must be an object`);
    return;
  }
  for (const [name, config] of Object.entries(entries)) {
    if (!name.trim() || !isObject(config)) fail(errors, `${label}.${name || "<empty>"} must be an object`);
  }
}

function validateAppCompanion(path, errors) {
  const payload = readJsonObject(path, ".app.json", errors);
  if (!payload) return;
  rejectUnknown(payload, new Set(["apps"]), ".app.json", errors);
  if (!isObject(payload.apps)) {
    fail(errors, ".app.json.apps must be an object");
    return;
  }
  for (const [name, app] of Object.entries(payload.apps)) {
    if (!isObject(app)) {
      fail(errors, `.app.json.apps.${name} must be an object`);
      continue;
    }
    rejectUnknown(app, new Set(["id", "category"]), `.app.json.apps.${name}`, errors);
    requireString(app, "id", `.app.json.apps.${name}`, errors);
    if (app.category !== undefined) requireString(app, "category", `.app.json.apps.${name}`, errors);
  }
}

function validateMcpCompanion(path, errors) {
  const payload = readJsonObject(path, ".mcp.json", errors);
  if (!payload) return;
  rejectUnknown(payload, new Set(["mcpServers"]), ".mcp.json", errors);
  validateMcpEntries(payload.mcpServers, ".mcp.json.mcpServers", errors);
}

function inside(root, candidate) {
  const rel = relative(realpathSync(root), realpathSync(candidate));
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel));
}

function resolveArchivePath(pluginRoot, rawPath, label, errors, { directory = false, extension } = {}) {
  if (typeof rawPath !== "string" || !rawPath.startsWith("./") || rawPath.includes("\\")) {
    fail(errors, `${label} must be a ./-relative POSIX path`);
    return null;
  }
  const normalized = directory ? rawPath.slice(2).replace(/\/$/, "") : rawPath.slice(2);
  const parts = normalized.split("/");
  if (parts.some((part) => part === "" || part === "." || part === "..")) {
    fail(errors, `${label} must stay inside the plugin archive`);
    return null;
  }
  const candidate = resolve(pluginRoot, ...parts);
  if (!existsSync(candidate)) {
    fail(errors, `${label} points to a missing path`);
    return null;
  }
  try {
    if (!inside(pluginRoot, candidate)) {
      fail(errors, `${label} resolves outside the plugin archive`);
      return null;
    }
    const stat = lstatSync(candidate);
    if (stat.isSymbolicLink()) {
      fail(errors, `${label} must not be a symbolic link`);
      return null;
    }
    if (directory ? !stat.isDirectory() : !stat.isFile()) {
      fail(errors, `${label} must point to a ${directory ? "directory" : "file"}`);
      return null;
    }
    if (extension && extname(candidate).toLowerCase() !== extension) {
      fail(errors, `${label} must use the ${extension} extension`);
      return null;
    }
  } catch {
    fail(errors, `${label} could not be inspected`);
    return null;
  }
  return candidate;
}

function parseScalar(raw, label) {
  const value = raw.trim();
  if (value === "") throw new Error(`${label} has an empty scalar`);
  if (/^"/.test(value)) {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed !== "string") throw new Error();
      return parsed;
    } catch {
      throw new Error(`${label} has an invalid double-quoted string`);
    }
  }
  if (/^'/.test(value)) {
    if (!value.endsWith("'") || value.length < 2) throw new Error(`${label} has an invalid single-quoted string`);
    return value.slice(1, -1).replace(/''/g, "'");
  }
  if (/^(?:true|false)$/i.test(value)) return value.toLowerCase() === "true";
  if (/^(?:null|~)$/i.test(value)) return null;
  if (/^[&*!>|[\]{}]/.test(value)) throw new Error(`${label} uses unsupported YAML syntax`);
  return value;
}

export function parseStrictYaml(source, label = "YAML") {
  const normalized = source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  if (normalized.includes("\t")) throw new Error(`${label} must not contain tabs`);
  const root = {};
  const stack = [{ indent: -2, object: root }];
  for (const [index, rawLine] of normalized.split("\n").entries()) {
    if (/^\s*(?:#.*)?$/.test(rawLine)) continue;
    const indent = rawLine.match(/^ */)[0].length;
    if (indent % 2 !== 0) throw new Error(`${label}:${index + 1} indentation must use two-space levels`);
    const content = rawLine.slice(indent);
    const match = content.match(/^([A-Za-z0-9_-]+):(?:\s+(.*))?$/);
    if (!match) throw new Error(`${label}:${index + 1} must be a mapping entry`);
    while (stack.at(-1).indent >= indent) stack.pop();
    const parent = stack.at(-1);
    if (!parent || indent !== parent.indent + 2) throw new Error(`${label}:${index + 1} has invalid nesting`);
    const [, key, rawValue] = match;
    if (Object.hasOwn(parent.object, key)) throw new Error(`${label}:${index + 1} duplicates key ${key}`);
    if (rawValue === undefined) {
      const nested = {};
      parent.object[key] = nested;
      stack.push({ indent, object: nested });
    } else {
      parent.object[key] = parseScalar(rawValue, `${label}:${index + 1}`);
    }
  }
  return root;
}

function readSkillFrontmatter(skillPath, errors) {
  const markdown = readFileSync(skillPath, "utf8").replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const match = markdown.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  if (!match) {
    fail(errors, `${skillPath} must begin with closed YAML frontmatter`);
    return { markdown, metadata: null };
  }
  try {
    return { markdown, metadata: parseStrictYaml(match[1], skillPath) };
  } catch (error) {
    fail(errors, error.message);
    return { markdown, metadata: null };
  }
}

function validateSkill(pluginRoot, skillRoot, errors) {
  const skillName = skillRoot.split(/[\\/]/).at(-1);
  const skillPath = join(skillRoot, "SKILL.md");
  if (!existsSync(skillPath)) {
    fail(errors, `skill ${skillName} is missing SKILL.md`);
    return;
  }
  const { markdown, metadata } = readSkillFrontmatter(skillPath, errors);
  if (/\[TODO:/i.test(markdown)) fail(errors, `skill ${skillName} contains a TODO placeholder`);
  if (!metadata) return;
  rejectUnknown(metadata, SKILL_FIELDS, `skill ${skillName} frontmatter`, errors);
  const name = requireString(metadata, "name", `skill ${skillName} frontmatter`, errors);
  const description = requireString(metadata, "description", `skill ${skillName} frontmatter`, errors);
  if (name && (name !== skillName || !PLUGIN_NAME.test(name) || name.length > 64)) {
    fail(errors, `skill ${skillName} frontmatter name must match its kebab-case directory name`);
  }
  if (description && (description.length > 1024 || /[<>]/.test(description))) {
    fail(errors, `skill ${skillName} description must be at most 1024 characters and contain no angle brackets`);
  }

  const agentPath = join(skillRoot, "agents", "openai.yaml");
  if (!existsSync(agentPath)) {
    fail(errors, `skill ${skillName} is missing agents/openai.yaml`);
    return;
  }
  let agent;
  try {
    agent = parseStrictYaml(readFileSync(agentPath, "utf8"), agentPath);
  } catch (error) {
    fail(errors, error.message);
    return;
  }
  rejectUnknown(agent, AGENT_FIELDS, `skill ${skillName} agent`, errors);
  if (!isObject(agent.interface)) {
    fail(errors, `skill ${skillName} agent.interface must be an object`);
    return;
  }
  rejectUnknown(agent.interface, AGENT_INTERFACE_FIELDS, `skill ${skillName} agent.interface`, errors);
  requireString(agent.interface, "display_name", `skill ${skillName} agent.interface`, errors);
  requireString(agent.interface, "short_description", `skill ${skillName} agent.interface`, errors);
  const prompt = requireString(agent.interface, "default_prompt", `skill ${skillName} agent.interface`, errors);
  if (prompt && !prompt.includes(`$${skillName}`)) fail(errors, `skill ${skillName} default_prompt must invoke $${skillName}`);
  if (agent.interface.brand_color !== undefined && !HEX_COLOR.test(agent.interface.brand_color)) {
    fail(errors, `skill ${skillName} agent.interface.brand_color must use #RRGGBB`);
  }
  for (const icon of ["icon_small", "icon_large"]) {
    if (agent.interface[icon] !== undefined) resolveArchivePath(pluginRoot, agent.interface[icon], `skill ${skillName} ${icon}`, errors);
  }
  if (agent.policy !== undefined) {
    if (!isObject(agent.policy)) fail(errors, `skill ${skillName} agent.policy must be an object`);
    else {
      rejectUnknown(agent.policy, new Set(["allow_implicit_invocation"]), `skill ${skillName} agent.policy`, errors);
      if (agent.policy.allow_implicit_invocation !== undefined && typeof agent.policy.allow_implicit_invocation !== "boolean") {
        fail(errors, `skill ${skillName} policy.allow_implicit_invocation must be boolean`);
      }
    }
  }
  if (agent.dependencies !== undefined && !isObject(agent.dependencies)) fail(errors, `skill ${skillName} agent.dependencies must be an object`);
  else if (agent.dependencies !== undefined) rejectUnknown(agent.dependencies, new Set(["tools"]), `skill ${skillName} agent.dependencies`, errors);
}

function validateManifest(pluginRoot, manifest, errors) {
  rejectUnknown(manifest, TOP_LEVEL_FIELDS, "plugin.json", errors);
  const name = requireString(manifest, "name", "plugin.json", errors);
  const version = requireString(manifest, "version", "plugin.json", errors);
  requireString(manifest, "description", "plugin.json", errors);
  if (name && (!PLUGIN_NAME.test(name) || name.length > 64 || name !== pluginRoot.split(/[\\/]/).at(-1))) {
    fail(errors, "plugin.json.name must match the kebab-case plugin directory name");
  }
  if (version && !SEMVER.test(version)) fail(errors, "plugin.json.version must be strict semver");
  if (manifest.id !== undefined) requireString(manifest, "id", "plugin.json", errors);
  if (!isObject(manifest.author)) fail(errors, "plugin.json.author must be an object");
  else {
    rejectUnknown(manifest.author, new Set(["name", "email", "url"]), "plugin.json.author", errors);
    requireString(manifest.author, "name", "plugin.json.author", errors);
    if (manifest.author.email !== undefined) requireString(manifest.author, "email", "plugin.json.author", errors);
    validateHttps(manifest.author.url, "plugin.json.author.url", errors);
  }
  for (const key of ["homepage", "repository"]) validateHttps(manifest[key], `plugin.json.${key}`, errors);
  if (manifest.license !== undefined) requireString(manifest, "license", "plugin.json", errors);
  if (manifest.keywords !== undefined && (!Array.isArray(manifest.keywords) || manifest.keywords.length === 0 || manifest.keywords.some((item) => typeof item !== "string" || !item.trim()))) {
    fail(errors, "plugin.json.keywords must be a non-empty array of non-empty strings");
  }

  if (manifest.skills !== undefined) {
    const path = resolveArchivePath(pluginRoot, manifest.skills, "plugin.json.skills", errors, { directory: true });
    if (path && resolve(path) !== resolve(pluginRoot, "skills")) fail(errors, "plugin.json.skills must resolve to ./skills/");
  }
  if (manifest.apps !== undefined) {
    const path = resolveArchivePath(pluginRoot, manifest.apps, "plugin.json.apps", errors);
    if (path && resolve(path) !== resolve(pluginRoot, ".app.json")) fail(errors, "plugin.json.apps must resolve to ./.app.json");
    else if (path) validateAppCompanion(path, errors);
  }
  if (manifest.mcpServers !== undefined && typeof manifest.mcpServers !== "string" && !isObject(manifest.mcpServers)) {
    fail(errors, "plugin.json.mcpServers must be a relative path or object");
  } else if (typeof manifest.mcpServers === "string") {
    const path = resolveArchivePath(pluginRoot, manifest.mcpServers, "plugin.json.mcpServers", errors);
    if (path && resolve(path) !== resolve(pluginRoot, ".mcp.json")) fail(errors, "plugin.json.mcpServers must resolve to ./.mcp.json");
    else if (path) validateMcpCompanion(path, errors);
  } else if (isObject(manifest.mcpServers)) {
    validateMcpEntries(manifest.mcpServers, "plugin.json.mcpServers", errors);
  }

  if (!isObject(manifest.interface)) {
    fail(errors, "plugin.json.interface must be an object");
    return;
  }
  const ui = manifest.interface;
  rejectUnknown(ui, INTERFACE_FIELDS, "plugin.json.interface", errors);
  for (const key of ["displayName", "shortDescription", "longDescription", "developerName", "category"]) {
    requireString(ui, key, "plugin.json.interface", errors);
  }
  if (!Array.isArray(ui.capabilities) || ui.capabilities.length === 0 || ui.capabilities.some((item) => typeof item !== "string" || !item.trim()) || new Set(ui.capabilities).size !== ui.capabilities.length) {
    fail(errors, "plugin.json.interface.capabilities must be a non-empty array of unique strings");
  }
  for (const key of ["websiteURL", "privacyPolicyURL", "termsOfServiceURL"]) validateHttps(ui[key], `plugin.json.interface.${key}`, errors);
  if (ui.brandColor !== undefined && !HEX_COLOR.test(ui.brandColor)) fail(errors, "plugin.json.interface.brandColor must use #RRGGBB");
  if (ui.defaultPrompt !== undefined && ui.default_prompt !== undefined) fail(errors, "plugin.json.interface must not define both defaultPrompt and default_prompt");
  const prompts = ui.defaultPrompt ?? ui.default_prompt;
  if (!Array.isArray(prompts) || prompts.length < 1 || prompts.length > 3 || prompts.some((prompt) => typeof prompt !== "string" || !prompt.trim() || prompt.length > 128)) {
    fail(errors, "plugin.json.interface.defaultPrompt must contain 1-3 non-empty strings of at most 128 characters");
  }
  for (const key of ["composerIcon", "logo", "logoDark"]) {
    if (ui[key] !== undefined) resolveArchivePath(pluginRoot, ui[key], `plugin.json.interface.${key}`, errors);
  }
  if (ui.screenshots !== undefined) {
    if (!Array.isArray(ui.screenshots)) fail(errors, "plugin.json.interface.screenshots must be an array");
    else for (const [index, screenshot] of ui.screenshots.entries()) {
      if (typeof screenshot !== "string" || !screenshot.startsWith("./assets/")) fail(errors, `plugin.json.interface.screenshots[${index}] must be under ./assets/`);
      else resolveArchivePath(pluginRoot, screenshot, `plugin.json.interface.screenshots[${index}]`, errors, { extension: ".png" });
    }
  }
}

function textFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...textFiles(path));
    else if (/\.(?:json|md|ya?ml)$/i.test(entry.name)) files.push(path);
  }
  return files;
}

export function findProhibitedRouteRecipes(source, label = "plugin guidance") {
  const findings = [];
  let inFence = false;
  for (const [index, line] of source.replace(/\r\n?/g, "\n").split("\n").entries()) {
    if (/^\s*```/.test(line)) inFence = !inFence;
    const pattern = ACTIONABLE_ROUTE_PATTERNS.find((candidate) => candidate.test(line));
    if (!pattern) continue;
    const explicitlyNegative = NEGATIVE_SAFETY.test(line);
    const executable = inFence || EXECUTABLE_MARKER.test(line);
    if (!explicitlyNegative || executable) findings.push(`${label}:${index + 1}`);
  }
  return findings;
}

export function validatePlugin(pluginRoot = defaultPluginRoot) {
  const root = resolve(pluginRoot);
  const errors = [];
  const manifestPath = join(root, ".codex-plugin", "plugin.json");
  if (!existsSync(manifestPath)) return ["missing .codex-plugin/plugin.json"];
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    return [".codex-plugin/plugin.json must contain valid JSON"];
  }
  if (!isObject(manifest)) return [".codex-plugin/plugin.json must contain a JSON object"];
  if (JSON.stringify(manifest).includes("[TODO:")) fail(errors, "plugin.json contains a TODO placeholder");
  validateManifest(root, manifest, errors);

  const skillsRoot = join(root, "skills");
  if (!existsSync(skillsRoot)) fail(errors, "plugin is missing skills/");
  else {
    const skillDirectories = readdirSync(skillsRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory() && !entry.name.startsWith("."));
    if (skillDirectories.length === 0) fail(errors, "plugin skills/ contains no skills");
    for (const entry of skillDirectories) validateSkill(root, join(skillsRoot, entry.name), errors);
  }

  for (const file of textFiles(root)) {
    const findings = findProhibitedRouteRecipes(readFileSync(file, "utf8"), relative(root, file).replaceAll("\\", "/"));
    for (const finding of findings) fail(errors, `${finding} contains an actionable prohibited provider route`);
  }
  return errors;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const pluginRoot = resolve(process.argv[2] ?? defaultPluginRoot);
  const errors = validatePlugin(pluginRoot);
  if (errors.length > 0) {
    console.error("Plugin validation failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log(`Plugin validation passed: ${pluginRoot}`);
  }
}

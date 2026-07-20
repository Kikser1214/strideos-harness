import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { assistedBrowsingAvailable, browserReadProvenance, evaluateModelContextPolicy, filterProviderEvidenceForModelContext, loadConnectorPlaybooks, resolveProviderRoute, resolveProviderRoutes } from "../src/connectors.mjs";

const permittedBrowserFixture = {
  routePrecedence: ["official_mcp", "official_api", "native_companion", "assisted_browsing", "file_import", "manual"],
  assistedBrowsingContract: { executorEnabled: true },
  providers: [{
    id: "fixture_web",
    label: "Synthetic permitted web provider",
    assistedBrowsingClassification: "permitted",
    webAppUrl: "https://provider.invalid/",
    permittedRoutes: [
      { id: "fixture_api", type: "official_api", providerPermittedForIndividual: true, status: "setup_required", capabilities: ["read_activity"] },
      { id: "fixture_browser", type: "assisted_browsing", providerPermittedForIndividual: true, status: "available_attended", executorImplemented: true, capabilities: ["read_activity", "write_workout"] },
      { id: "fixture_export", type: "file_import", providerPermittedForIndividual: true, status: "available", capabilities: ["read_activity"] }
    ]
  }]
};

test("playbooks expose only provider-permitted individual routes", () => {
  const playbooks = loadConnectorPlaybooks();
  assert.deepEqual(playbooks.routePrecedence, ["official_mcp", "official_api", "native_companion", "assisted_browsing", "file_import", "manual"]);
  for (const provider of playbooks.providers) {
    assert.ok(provider.officialSources.length > 0, `${provider.id} needs official sources`);
    assert.match(provider.reviewedAt, /^\d{4}-\d{2}-\d{2}$/, `${provider.id} needs a review date`);
    assert.ok(playbooks.policy.assistedBrowsingClassifications.includes(provider.assistedBrowsingClassification), `${provider.id} needs an assisted-browser classification`);
    assert.ok(provider.permittedRoutes.length > 0, `${provider.id} needs a permitted fallback`);
    assert.equal(provider.permittedRoutes.every((route) => route.providerPermittedForIndividual === true), true);
  }
});

test("resolver prefers official self-service routes, then attended browsing, then files and manual", () => {
  assert.equal(resolveProviderRoute({ providerId: "fitbit", capability: "read_activity" }).type, "official_api");
  assert.equal(resolveProviderRoute({ providerId: "coros", capability: "read_activity" }).type, "official_mcp");
  assert.deepEqual(
    resolveProviderRoutes({ providerId: "garmin", capability: "read_activity" }).map((route) => route.type),
    ["file_import"]
  );
  assert.equal(resolveProviderRoute({ providerId: "garmin", capability: "write_workout" }), null);
});

test("model-context route selection requires the provider-specific purpose, disclosure, and consent", () => {
  assert.equal(resolveProviderRoute({ providerId: "fitbit", capability: "read_activity", purpose: "model_inference" }), null);
  assert.equal(resolveProviderRoute({ providerId: "fitbit", capability: "read_activity", purpose: "model_inference", disclosureAccepted: true }), null);
  assert.equal(resolveProviderRoute({
    providerId: "fitbit",
    capability: "read_activity",
    purpose: "model_inference",
    disclosureAccepted: true,
    consentRecorded: true
  }).id, "google_health_api");
  assert.equal(evaluateModelContextPolicy({ providerId: "oura", routeId: "oura_export" }).allowed, false);
  assert.equal(evaluateModelContextPolicy({ providerId: "whoop", routeId: "whoop_export" }).allowed, false);
  assert.equal(evaluateModelContextPolicy({ providerId: "unknown", routeId: "unknown_export" }).reason, "unknown_provider");
  assert.equal(evaluateModelContextPolicy({ providerId: "garmin", routeId: "garmin_export", purpose: "model_training" }).allowed, false);
  assert.equal(evaluateModelContextPolicy({ providerId: "garmin", routeId: "garmin_export", purpose: "typo" }).reason, "unknown_purpose");
});

test("provider evidence filtering fails closed for unknown and restricted exports", () => {
  const records = [
    { id: "garmin", providerId: "garmin", routeId: "garmin_export", provenance: "file_import", ingestionRoute: "file_import", modelContext: {} },
    { id: "unknown", providerId: "unknown", routeId: null, provenance: "file_import", ingestionRoute: "file_import", modelContext: {} },
    { id: "oura", providerId: "oura", routeId: "oura_export", provenance: "file_import", ingestionRoute: "file_import", modelContext: {} },
    { id: "whoop", providerId: "whoop", routeId: "whoop_export", provenance: "file_import", ingestionRoute: "file_import", modelContext: {} },
    { id: "fitbit-blocked", providerId: "fitbit", routeId: "fitbit_export", provenance: "file_import", ingestionRoute: "file_import", modelContext: {} },
    { id: "fitbit-allowed", providerId: "fitbit", routeId: "fitbit_export", provenance: "file_import", ingestionRoute: "file_import", modelContext: { disclosureAccepted: true, consentRecorded: true } },
    { id: "missing-provenance", providerId: "garmin", routeId: "garmin_export", modelContext: {} }
  ];
  const filtered = filterProviderEvidenceForModelContext(records);
  assert.deepEqual(filtered.included.map((item) => item.id), ["garmin", "fitbit-allowed"]);
  assert.deepEqual(filtered.excluded.map((item) => item.id), ["unknown", "oura", "whoop", "fitbit-blocked", "missing-provenance"]);
});

test("the universal assisted-browser tier requires explicit permission and an attended Codex desktop", () => {
  assert.equal(assistedBrowsingAvailable({ classification: "permitted" }), false);
  assert.equal(assistedBrowsingAvailable({ classification: "permitted", executorImplemented: true, surface: "codex_desktop", attended: true }), true);
  assert.equal(assistedBrowsingAvailable({ classification: "not_established" }), false);
  assert.equal(assistedBrowsingAvailable({ classification: "prohibited" }), false);
  assert.equal(assistedBrowsingAvailable({ classification: "permitted", executorImplemented: false, surface: "codex_desktop", attended: true }), false);
  assert.equal(assistedBrowsingAvailable({ classification: "permitted", executorImplemented: true, surface: "codex_desktop", attended: false }), false);
  assert.equal(assistedBrowsingAvailable({ classification: "permitted", executorImplemented: true, surface: "codex_desktop", attended: true, scheduled: true }), false);
  assert.equal(assistedBrowsingAvailable({ classification: "permitted", executorImplemented: true, surface: "codex_desktop", attended: true, headless: true }), false);
  assert.equal(assistedBrowsingAvailable({ classification: "permitted", executorImplemented: true, surface: "work_web", attended: true }), false);
  assert.equal(resolveProviderRoutes({ providerId: "garmin" }).some((route) => route.type === "assisted_browsing"), false);
});

test("permitted assisted browsing is an explicit attended fallback, never an ambient default", () => {
  assert.deepEqual(
    resolveProviderRoutes({ providerId: "fixture_web", capability: "read_activity", playbooks: permittedBrowserFixture }).map((route) => route.type),
    ["official_api", "file_import"]
  );
  assert.deepEqual(
    resolveProviderRoutes({ providerId: "fixture_web", capability: "read_activity", surface: "codex_desktop", attended: true, playbooks: permittedBrowserFixture }).map((route) => route.type),
    ["official_api", "assisted_browsing", "file_import"]
  );
  assert.equal(resolveProviderRoute({ providerId: "fixture_web", capability: "write_workout", playbooks: permittedBrowserFixture }), null);
  assert.equal(resolveProviderRoute({ providerId: "fixture_web", capability: "write_workout", surface: "codex_desktop", attended: true, playbooks: permittedBrowserFixture }).id, "fixture_browser");
  assert.equal(resolveProviderRoute({ providerId: "fixture_web", capability: "write_workout", surface: "codex_desktop", attended: true, scheduled: true, playbooks: permittedBrowserFixture }), null);
  assert.equal(resolveProviderRoute({ providerId: "fixture_web", capability: "write_workout", surface: "codex_desktop", attended: true, headless: true, playbooks: permittedBrowserFixture }), null);
  assert.equal(resolveProviderRoute({ providerId: "fixture_web", capability: "write_workout", surface: "codex_desktop", attended: true, playbooks: { ...permittedBrowserFixture, assistedBrowsingContract: { executorEnabled: false } } }), null);
});

test("browser-read provenance binds the exact permitted route and visible provider origin", () => {
  const record = browserReadProvenance({
    providerId: "fixture_web",
    routeId: "fixture_browser",
    observedAt: "2026-07-20T05:00:00.000Z",
    retrievedAt: "2026-07-20T05:01:00.000Z",
    pageUrl: "https://provider.invalid/activities/42?private=1#details",
    surface: "codex_desktop",
    attended: true,
    playbooks: permittedBrowserFixture
  });
  assert.equal(record.source, "fixture_web");
  assert.equal(record.routeId, "fixture_browser");
  assert.equal(record.capability, "read_activity");
  assert.equal(record.provenance, "browser_read");
  assert.equal(record.page, "https://provider.invalid/activities/42");
  assert.deepEqual(record.browserContext, { surface: "codex_desktop", attended: true, scheduled: false, headless: false });
  assert.equal(record.rawHtmlStored, false);
  assert.equal(record.sessionMaterialStored, false);
  assert.throws(() => browserReadProvenance({ providerId: "fixture_web", routeId: "fixture_browser", surface: "codex_desktop", attended: true, scheduled: true, playbooks: permittedBrowserFixture }), /not a permitted route/i);
  assert.throws(() => browserReadProvenance({ providerId: "fixture_web", routeId: "fixture_browser", surface: "codex_desktop", attended: true, playbooks: permittedBrowserFixture }), /visible provider page URL/i);
  assert.throws(() => browserReadProvenance({ providerId: "fixture_web", routeId: "fixture_browser", surface: "codex_desktop", attended: true, pageUrl: "https://example.com/activities/42", playbooks: permittedBrowserFixture }), /permitted provider web app/i);
  assert.throws(() => browserReadProvenance({
    providerId: "fixture_web", routeId: "fixture_browser", surface: "codex_desktop", attended: true,
    observedAt: "2026-07-20T05:02:00.000Z", retrievedAt: "2026-07-20T05:01:00.000Z",
    pageUrl: "https://provider.invalid/activities/42", playbooks: permittedBrowserFixture
  }), /cannot be later/i);
});

test("Strava policy blocks both API-to-AI and browser automation", () => {
  const routes = resolveProviderRoutes({ providerId: "strava" });
  assert.deepEqual(routes.map((route) => route.type), ["file_import", "manual"]);
  assert.equal(routes.some((route) => route.type === "official_api" || route.type === "assisted_browsing"), false);
});

test("COROS uses its official read-only MCP and blocks browser writes", () => {
  assert.equal(resolveProviderRoute({ providerId: "coros", capability: "read_recovery" }).type, "official_mcp");
  assert.equal(resolveProviderRoute({ providerId: "coros", capability: "write_workout" }), null);
  assert.equal(resolveProviderRoutes({ providerId: "coros" }).some((route) => route.type === "assisted_browsing"), false);
});

test("native health stores do not masquerade as desktop or supported file routes", () => {
  const playbooks = loadConnectorPlaybooks();
  const apple = playbooks.providers.find((provider) => provider.id === "apple_health");
  const android = playbooks.providers.find((provider) => provider.id === "health_connect");
  assert.equal(apple.permittedRoutes.find((route) => route.id === "apple_export").status, "format_adapter_required");
  assert.equal(android.permittedRoutes.find((route) => route.id === "health_connect_export").status, "format_validation_required");
  assert.equal(resolveProviderRoutes({ providerId: "apple_health" }).some((route) => route.type === "assisted_browsing"), false);
  assert.equal(resolveProviderRoutes({ providerId: "health_connect" }).some((route) => route.type === "assisted_browsing"), false);
});

test("wellness-provider AI restrictions fail closed", () => {
  const playbooks = loadConnectorPlaybooks();
  const oura = playbooks.providers.find((provider) => provider.id === "oura");
  const whoop = playbooks.providers.find((provider) => provider.id === "whoop");
  assert.equal(resolveProviderRoute({ providerId: "oura", capability: "read_activity" }), null);
  assert.equal(resolveProviderRoute({ providerId: "whoop", capability: "read_activity" }), null);
  assert.equal(oura.permittedRoutes.find((route) => route.id === "oura_export").modelContextPolicy, "blocked_for_llm_context");
  assert.equal(whoop.permittedRoutes.find((route) => route.id === "whoop_export").modelContextPolicy, "local_only_until_policy_review");
  assert.equal(resolveProviderRoutes({ providerId: "oura" }).some((route) => route.type === "assisted_browsing"), false);
  assert.equal(resolveProviderRoutes({ providerId: "whoop" }).some((route) => route.type === "assisted_browsing"), false);
});

test("browser-read contract is local and every current unpermitted provider fails closed", () => {
  const playbooks = loadConnectorPlaybooks();
  assert.equal(playbooks.assistedBrowsingContract.readProvenance, "browser_read");
  assert.equal(playbooks.assistedBrowsingContract.executorEnabled, false);
  assert.equal(playbooks.assistedBrowsingContract.rawHtmlStored, false);
  assert.equal(playbooks.assistedBrowsingContract.sessionMaterialStored, false);
  assert.throws(() => browserReadProvenance({ providerId: "garmin", routeId: "garmin_browser", surface: "codex_desktop", attended: true }), /not a permitted route/i);
  assert.throws(() => browserReadProvenance({ providerId: "strava", routeId: "strava_browser", surface: "codex_desktop", attended: true }), /not a permitted route/i);
});

test("public connector policy contains no removed route instructions", () => {
  const files = [
    "AGENTS.md", ".env.example", "README.md", "DEVPOST.md", "HACKATHON_CHECKLIST.md", "PRIVACY.md",
    "docs/BUILD_PLAN.md", "docs/SELF_SERVICE_CONNECTORS.md", "docs/DATA_CONNECTIONS.md", "docs/INSTALL.md",
    "docs/VIDEO_SCRIPT.md", "sites/strideos-landing/app/page.tsx", "public/app.js", "package.json"
  ];
  const banned = /community garmin|community bridge|garmin_community|garmin-local-community|garmin_attended_web|python connector|unofficial (?:route|connector|bridge)/i;
  for (const file of files) {
    const content = fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(content, banned, file);
  }
});

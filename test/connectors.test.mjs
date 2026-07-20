import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { assistedBrowsingAvailable, browserReadProvenance, evaluateModelContextPolicy, filterProviderEvidenceForModelContext, loadConnectorPlaybooks, resolveProviderRoute, resolveProviderRouteDecision, resolveProviderRoutes } from "../src/connectors.mjs";

const permittedBrowserFixture = {
  routePrecedence: ["official_mcp", "official_api", "native_companion", "assisted_browsing", "file_import", "manual"],
  assistedBrowsingContract: { executorEnabled: true },
  providers: [{
    id: "fixture_web",
    label: "Synthetic permitted web provider",
    webAppUrl: "https://provider.invalid/",
    permittedRoutes: [
      { id: "fixture_api", type: "official_api", providerPermittedForIndividual: true, status: "setup_required", capabilities: ["read_activity"] },
      { id: "fixture_browser", type: "assisted_browsing", providerPermittedForIndividual: true, status: "available_attended", executorImplemented: true, capabilities: ["read_activity", "write_workout"] },
      { id: "fixture_export", type: "file_import", providerPermittedForIndividual: true, status: "available", capabilities: ["read_activity"] }
    ]
  }]
};

test("playbooks expose documented official individual routes as non-exclusive recommendations", () => {
  const playbooks = loadConnectorPlaybooks();
  assert.deepEqual(playbooks.routePrecedence, ["official_mcp", "official_api", "native_companion", "assisted_browsing", "file_import", "manual"]);
  for (const provider of playbooks.providers) {
    assert.ok(provider.officialSources.length > 0, `${provider.id} needs official sources`);
    assert.match(provider.reviewedAt, /^\d{4}-\d{2}-\d{2}$/, `${provider.id} needs a review date`);
    assert.equal("assistedBrowsingClassification" in provider, false, `${provider.id} must not classify host browser/computer use`);
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

test("provider evidence filtering excludes unknown and restricted upstream export records", () => {
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

test("the universal assisted-browser tier follows host capability and attended-session boundaries, not provider classifications", () => {
  assert.equal(assistedBrowsingAvailable({ surface: "desktop", attended: true }), false);
  assert.equal(assistedBrowsingAvailable({ surface: "desktop", attended: true, browserToolAvailable: true }), true);
  assert.equal(assistedBrowsingAvailable({ surface: "work_web", attended: true, browserToolAvailable: true }), true);
  assert.equal(assistedBrowsingAvailable({ surface: "desktop", attended: false, browserToolAvailable: true }), false);
  assert.equal(assistedBrowsingAvailable({ surface: "desktop", attended: true, scheduled: true, browserToolAvailable: true }), false);
  assert.equal(assistedBrowsingAvailable({ surface: "desktop", attended: true, headless: true, browserToolAvailable: true }), false);
  assert.equal(assistedBrowsingAvailable({ surface: "desktop", attended: true, browserToolAvailable: true, loginOwner: "agent" }), false);
  assert.equal(assistedBrowsingAvailable({ surface: "desktop", attended: true, browserToolAvailable: true, credentialHandling: "agent" }), false);
  assert.equal(resolveProviderRoutes({ providerId: "garmin" }).some((route) => route.type === "assisted_browsing"), false);
});

test("host-assisted browsing sits after official routes and before files without becoming an allowlist", () => {
  assert.deepEqual(
    resolveProviderRoutes({ providerId: "fixture_web", capability: "read_activity", playbooks: permittedBrowserFixture }).map((route) => route.type),
    ["official_api", "file_import"]
  );
  assert.deepEqual(
    resolveProviderRoutes({ providerId: "fixture_web", capability: "read_activity", surface: "codex_desktop", attended: true, browserToolAvailable: true, playbooks: permittedBrowserFixture }).map((route) => route.type),
    ["official_api", "assisted_browsing", "file_import"]
  );
  assert.equal(resolveProviderRoute({ providerId: "fixture_web", capability: "write_workout", playbooks: permittedBrowserFixture }), null);
  const writeRoute = resolveProviderRoute({ providerId: "fixture_web", capability: "write_workout", surface: "codex_desktop", attended: true, browserToolAvailable: true, playbooks: permittedBrowserFixture });
  assert.equal(writeRoute.id, "fixture_browser");
  assert.deepEqual(writeRoute.writeContract, { dryRunRequired: true, approval: "exact_one_time_expiring", maxWritesPerApproval: 1, verificationRequired: true });
  assert.equal(writeRoute.recommendationNonExclusive, true);
  assert.equal(resolveProviderRoute({ providerId: "fixture_web", capability: "write_workout", surface: "codex_desktop", attended: true, scheduled: true, browserToolAvailable: true, playbooks: permittedBrowserFixture }), null);
  assert.equal(resolveProviderRoute({ providerId: "fixture_web", capability: "write_workout", surface: "codex_desktop", attended: true, headless: true, browserToolAvailable: true, playbooks: permittedBrowserFixture }), null);
  assert.equal(resolveProviderRoute({ providerId: "fixture_web", capability: "write_workout", surface: "codex_desktop", attended: true, browserToolAvailable: false, playbooks: permittedBrowserFixture }), null);
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
    browserToolAvailable: true,
    playbooks: permittedBrowserFixture
  });
  assert.equal(record.source, "fixture_web");
  assert.equal(record.routeId, "fixture_browser");
  assert.equal(record.capability, "read_activity");
  assert.equal(record.provenance, "browser_read");
  assert.equal(record.freshnessTimestamp, "2026-07-20T05:01:00.000Z");
  assert.equal(record.policyProvenance.scope, "upstream_recommendation_catalog");
  assert.equal(record.page, "https://provider.invalid/activities/42");
  assert.deepEqual(record.browserContext, { surface: "codex_desktop", attended: true, scheduled: false, headless: false });
  assert.equal(record.rawHtmlStored, false);
  assert.equal(record.sessionMaterialStored, false);
  assert.throws(() => browserReadProvenance({ providerId: "fixture_web", routeId: "fixture_browser", surface: "codex_desktop", attended: true, scheduled: true, browserToolAvailable: true, playbooks: permittedBrowserFixture }), /current host does not expose/i);
  assert.throws(() => browserReadProvenance({ providerId: "fixture_web", routeId: "fixture_browser", surface: "codex_desktop", attended: true, browserToolAvailable: true, playbooks: permittedBrowserFixture }), /visible provider page URL/i);
  assert.throws(() => browserReadProvenance({ providerId: "fixture_web", routeId: "fixture_browser", surface: "codex_desktop", attended: true, browserToolAvailable: true, pageUrl: "https://example.com/activities/42", playbooks: permittedBrowserFixture }), /configured provider web-app origin/i);
  assert.throws(() => browserReadProvenance({
    providerId: "fixture_web", routeId: "fixture_browser", surface: "codex_desktop", attended: true,
    observedAt: "2026-07-20T05:02:00.000Z", retrievedAt: "2026-07-20T05:01:00.000Z",
    pageUrl: "https://provider.invalid/activities/42", browserToolAvailable: true, playbooks: permittedBrowserFixture
  }), /cannot be later/i);
});

test("Strava recommends its official MCP first and host browsing remains a non-exclusive attended option", () => {
  const routes = resolveProviderRoutes({ providerId: "strava" });
  assert.deepEqual(routes.map((route) => route.type), ["official_mcp", "file_import", "manual"]);
  assert.equal(routes.some((route) => route.type === "official_api" || route.type === "assisted_browsing"), false);
  assert.deepEqual(
    resolveProviderRoutes({ providerId: "strava", surface: "desktop", attended: true, hostCapabilities: { computerUse: true } }).map((route) => route.type),
    ["official_mcp", "assisted_browsing", "file_import", "manual"]
  );
});

test("COROS recommends its official read-only MCP without inventing an upstream write route", () => {
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

test("wellness-provider upstream recommendations respect model-context restrictions", () => {
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

test("browser-read contract is host-detected, attended, and unavailable without a host capability", () => {
  const playbooks = loadConnectorPlaybooks();
  assert.equal(playbooks.assistedBrowsingContract.readProvenance, "browser_read");
  assert.equal(playbooks.assistedBrowsingContract.surface, "host_capability_detected");
  assert.equal(playbooks.assistedBrowsingContract.referenceRuntimeExecutorIncluded, false);
  assert.equal(playbooks.assistedBrowsingContract.providerClassificationGatesSelection, false);
  assert.equal(playbooks.assistedBrowsingContract.rawHtmlStored, false);
  assert.equal(playbooks.assistedBrowsingContract.sessionMaterialStored, false);
  assert.throws(() => browserReadProvenance({ providerId: "garmin", routeId: "garmin_assisted_browser", surface: "codex_desktop", attended: true }), /current host does not expose/i);
  assert.throws(() => browserReadProvenance({ providerId: "strava", routeId: "strava_assisted_browser", surface: "codex_desktop", attended: true }), /current host does not expose/i);
});

test("Garmin attended browser reads and writes are host-capability recommendations with exact contracts", () => {
  const routes = resolveProviderRoutes({
    providerId: "garmin",
    capability: "write_workout",
    surface: "desktop_with_browser",
    attended: true,
    hostCapabilities: { assistedBrowsing: true }
  });
  assert.deepEqual(routes.map((route) => route.type), ["assisted_browsing"]);
  const route = routes[0];
  assert.equal(route.routeClass, "assisted_browser");
  assert.equal(route.routeOrigin, "host_assisted_browser");
  assert.equal(route.executionAuthority, "host");
  assert.equal(route.policyProvenance.scope, "current_host_session");
  assert.equal(route.browserContract.loginOwner, "user");
  assert.equal(route.browserContract.credentialHandling, "forbidden");
  assert.equal(route.browserContract.supportsScheduled, false);
  assert.deepEqual(route.writeContract, { dryRunRequired: true, approval: "exact_one_time_expiring", maxWritesPerApproval: 1, verificationRequired: true });

  const record = browserReadProvenance({
    providerId: "garmin",
    routeId: "garmin_assisted_browser",
    observedAt: "2026-07-20T06:00:00.000Z",
    retrievedAt: "2026-07-20T06:01:00.000Z",
    pageUrl: "https://connect.garmin.com/modern/activity/42?token=discarded",
    surface: "desktop_with_browser",
    attended: true,
    hostCapabilities: { assistedBrowsing: true }
  });
  assert.equal(record.provenance, "browser_read");
  assert.equal(record.freshnessTimestamp, record.retrievedAt);
  assert.equal(record.page, "https://connect.garmin.com/modern/activity/42");
  assert.deepEqual(filterProviderEvidenceForModelContext([{ id: "browser", ...record }]).included.map((item) => item.id), ["browser"]);
});

test("a host-supplied provider page enables the universal attended route without a catalog URL or classification gate", () => {
  const hostCapabilities = { computerUse: true, providerWebAppUrl: "https://app.whoop.com/" };
  const routes = resolveProviderRoutes({
    providerId: "whoop",
    capability: "read_recovery",
    surface: "host_with_computer_use",
    attended: true,
    hostCapabilities
  });
  const browser = routes.find((route) => route.type === "assisted_browsing");
  assert.ok(browser);
  assert.equal(browser.selectable, true);
  assert.equal(browser.routeOrigin, "host_assisted_browser");
  assert.equal(browser.providerPermissionClaim, "not_evaluated_by_plugin");

  const record = browserReadProvenance({
    providerId: "whoop",
    routeId: "whoop_assisted_browser",
    capability: "read_recovery",
    observedAt: "2026-07-20T06:00:00.000Z",
    retrievedAt: "2026-07-20T06:01:00.000Z",
    pageUrl: "https://app.whoop.com/recovery?private=1",
    providerWebAppUrl: "https://app.whoop.com/",
    surface: "host_with_computer_use",
    attended: true,
    hostCapabilities
  });
  assert.equal(record.page, "https://app.whoop.com/recovery");
  assert.deepEqual(filterProviderEvidenceForModelContext([{ id: "whoop-browser", ...record }]).included.map((item) => item.id), ["whoop-browser"]);
});

test("resolver decisions classify recommendation gaps without claiming enforcement authority", () => {
  const missing = resolveProviderRouteDecision({ providerId: "apple_health", capability: "read_activity", requestedRouteId: "apple_export" });
  assert.equal(missing.outcome, "no_recommendation");
  assert.equal(missing.reasonClassification, "missing_implementation");
  assert.equal(missing.enforcement, false);

  const local = resolveProviderRouteDecision({
    providerId: "coros",
    capability: "read_activity",
    requestedRouteId: "coros_mcp",
    recommendationPreferences: { disabledRouteIds: ["coros_mcp"] }
  });
  assert.equal(local.reasonClassification, "recommendation_omitted_by_local_preference");
  assert.equal(local.enforcement, false);

  const absent = resolveProviderRouteDecision({ providerId: "garmin", capability: "write_unknown" });
  assert.equal(absent.reasonClassification, "upstream_route_not_established");

  const providerRestrictedFixture = {
    routePrecedence: permittedBrowserFixture.routePrecedence,
    schemaVersion: "fixture-v1",
    providers: [{
      id: "restricted",
      reviewedAt: "2026-07-20",
      modelContextPolicy: { status: "mcp_only", allowedRoutes: ["restricted_mcp"] },
      permittedRoutes: [{ id: "restricted_api", type: "official_api", providerPermittedForIndividual: true, status: "available", capabilities: ["read_activity"] }]
    }]
  };
  const prohibited = resolveProviderRouteDecision({
    providerId: "restricted",
    capability: "read_activity",
    requestedRouteId: "restricted_api",
    purpose: "model_inference",
    playbooks: providerRestrictedFixture
  });
  assert.equal(prohibited.reasonClassification, "upstream_route_not_recommended");
  assert.match(prohibited.message, /not a StrideOS enforcement decision/i);
});

test("explicit scripts and other plugins are delegated to the host, never selected or vetoed as StrideOS routes", () => {
  const decision = resolveProviderRouteDecision({
    providerId: "garmin",
    capability: "write_workout",
    userDirectedCapability: { explicit: true, kind: "script", id: "user-local-tool", operation: "write" }
  });
  assert.equal(decision.outcome, "delegate_to_host");
  assert.equal(decision.reasonClassification, "outside_plugin_scope");
  assert.equal(decision.enforcement, false);
  assert.equal(decision.route, null);
  assert.equal(decision.hostRequirements.permissionOwner, "host");
  assert.equal(decision.hostRequirements.credentialsOrMfaHandledByPlugin, false);
  assert.equal(decision.hostRequirements.maxWritesPerApproval, 1);
  assert.match(decision.message, /neither approves nor vetoes/i);
});

test("public connector policy contains no removed route instructions", () => {
  const files = [
    "AGENTS.md", ".env.example", "README.md", "DEVPOST.md", "HACKATHON_CHECKLIST.md", "PRIVACY.md",
    "docs/BUILD_PLAN.md", "docs/SELF_SERVICE_CONNECTORS.md", "docs/DATA_CONNECTIONS.md", "docs/INSTALL.md",
    "docs/VIDEO_SCRIPT.md", "sites/strideos-landing/app/page.tsx", "public/app.js", "package.json"
  ];
  const banned = /community garmin|community bridge|garmin_community|garmin-local-community|garmin_attended_web|python connector|use (?:an? )?unofficial (?:route|connector|bridge)|unofficial (?:route|connector|bridge).{0,40}(?:setup|install|run|command)/i;
  for (const file of files) {
    const content = fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(content, banned, file);
  }
});

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const playbooks = JSON.parse(
  fs.readFileSync(new URL("../rules/connector-playbooks.json", import.meta.url), "utf8")
);

const selectableStatuses = new Set([
  "available",
  "available_attended",
  "setup_required",
  "companion_required"
]);

const provider = (id) => {
  const match = playbooks.providers.find((candidate) => candidate.id === id);
  assert.ok(match, `missing ${id} provider policy`);
  return match;
};

const route = (providerPolicy, id) => {
  const match = providerPolicy.permittedRoutes.find((candidate) => candidate.id === id);
  assert.ok(match, `missing ${providerPolicy.id}.${id} route`);
  return match;
};

const assertNoAttendedRoute = (providerPolicy) => {
  assert.equal(
    providerPolicy.permittedRoutes.some((candidate) => candidate.type === "assisted_browsing"),
    false,
    `${providerPolicy.id} must not expose attended browsing`
  );
};

const assertSource = (providerPolicy, source) => {
  assert.ok(providerPolicy.officialSources.includes(source), `${providerPolicy.id} needs ${source}`);
};

test("Google Health uses only documented API/export routes with explicit AI constraints", () => {
  const fitbit = provider("fitbit");

  assert.equal(fitbit.assistedBrowsingClassification, "not_established");
  assertNoAttendedRoute(fitbit);
  assert.deepEqual(fitbit.modelContextPolicy, {
    status: "conditional",
    allowedRoutes: ["google_health_api", "fitbit_export"],
    inference: "visible_health_or_fitness_feature_with_disclosure_and_consent",
    training: "not_established",
    evaluation: "not_established"
  });
  assert.equal(route(fitbit, "google_health_api").status, "setup_required");
  assert.equal(route(fitbit, "fitbit_export").status, "available");
  assertSource(fitbit, "https://developers.google.com/health/setup");
  assertSource(fitbit, "https://developers.google.com/health/policies/health-api-developer-user-data-policy");
  assertSource(fitbit, "https://developers.google.com/health/policies/health-api-developer-terms-and-conditions");
  assertSource(fitbit, "https://support.google.com/accounts/answer/3024190");
});

test("Oura data is MCP-only for LLM use and every undocumented read route fails closed", () => {
  const oura = provider("oura");
  const mcp = route(oura, "oura_mcp");
  const api = route(oura, "oura_api");
  const exportRoute = route(oura, "oura_export");

  assert.equal(oura.assistedBrowsingClassification, "prohibited");
  assertNoAttendedRoute(oura);
  assert.equal(oura.modelContextPolicy.status, "mcp_only");
  assert.deepEqual(oura.modelContextPolicy.allowedRoutes, ["oura_mcp"]);
  assert.equal(oura.modelContextPolicy.training, "prohibited");
  assert.equal(oura.modelContextPolicy.evaluation, "prohibited");
  assert.equal(mcp.modelContextPolicy, "mcp_only");
  assert.equal(selectableStatuses.has(mcp.status), false, "Oura MCP needs documented setup before selection");
  assert.equal(selectableStatuses.has(api.status), false, "Oura API must not enter model context");
  assert.equal(selectableStatuses.has(exportRoute.status), false, "Oura exports must not enter model context");
  assert.equal(api.modelContextPolicy, "blocked_for_llm_context");
  assert.equal(exportRoute.modelContextPolicy, "blocked_for_llm_context");
  assertSource(oura, "https://cloud.ouraring.com/legal/api-agreement");
  assertSource(oura, "https://cloud.ouraring.com/docs/authentication");
});

test("WHOOP prohibits attended browsing and has no selectable model-context data route", () => {
  const whoop = provider("whoop");
  const oauth = route(whoop, "whoop_oauth");
  const exportRoute = route(whoop, "whoop_export");

  assert.equal(whoop.assistedBrowsingClassification, "prohibited");
  assertNoAttendedRoute(whoop);
  assert.equal(whoop.modelContextPolicy.status, "not_established");
  assert.deepEqual(whoop.modelContextPolicy.allowedRoutes, []);
  assert.equal(selectableStatuses.has(oauth.status), false);
  assert.equal(selectableStatuses.has(exportRoute.status), false);
  assert.equal(oauth.modelContextPolicy, "policy_review_required");
  assert.equal(exportRoute.modelContextPolicy, "local_only_until_policy_review");
  assertSource(whoop, "https://www.whoop.com/us/en/whoop-terms-of-use/");
  assertSource(whoop, "https://developer.whoop.com/api-terms-of-use/");
});

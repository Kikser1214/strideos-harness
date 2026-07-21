import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the plugin-first StrideOS landing page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>StrideOS - Six-skill endurance coaching plugin<\/title>/i);
  assert.match(html, /Six-skill ChatGPT \+ Codex plugin/i);
  assert.match(html, /Train with AI\./);
  assert.match(html, /Keep your people in the loop\./);
  assert.match(html, /installs six focused endurance-coaching skills/i);
  assert.match(html, /Training Circle/i);
  assert.doesNotMatch(html, /(?:private )?coach room/i);
  assert.match(html, /codex plugin marketplace add Kikser1214\/strideos-harness --ref main/i);
  assert.match(html, /codex plugin add strideos@strideos/i);
  assert.match(html, /@strideos Build my athlete map/i);
  assert.match(html, /Plugins Directory/i);
  for (const skill of ["coach-athlete", "plan-training", "use-training-data", "support-fueling", "schedule-coaching", "build-coach-room"]) assert.match(html, new RegExp(skill));
  assert.match(html, /Prepare read-only morning, workout, and weekly rhythms/i);
  assert.match(html, /dashboard-plan\.png/);
  assert.match(html, /LIVE REFERENCE VIEW/);
  assert.match(html, /Install the plugin/);
  assert.match(html, /Open the live demo/);
  assert.match(html, /Invite privately/);
  assert.match(html, /only the athlete can activate a change/i);
  assert.match(html, /The agent can propose/);
  assert.match(html, /Only you can approve/);
  assert.match(html, /Apple Health XML import is not implemented/i);
  assert.match(html, /Health Connect backup import is not implemented/i);
  assert.match(html, /recommendations are not an allowlist/i);
  assert.match(html, /Garmin session you signed into/i);
  assert.match(html, /one approval for one visible action/i);
  assert.match(html, /never disables another tool you choose/i);
  assert.match(html, /Post-Build Week roadmap/i);
  assert.match(html, /The next loop[\s\S]*is longer/i);
  assert.match(html, /Not in the current release/i);
  assert.match(html, /Longitudinal athlete memory/i);
  assert.match(html, /Running form over time/i);
  assert.match(html, /Flexible fueling and body context/i);
  assert.match(html, /without inferring body fat, health, or potential from appearance/i);
  assert.doesNotMatch(html, /community bridge|unofficial/i);
  assert.doesNotMatch(html, /private endpoint|credential replay|workout builder|one-use Garmin/i);
  assert.doesNotMatch(html, /Threshold intervals|react-loading-skeleton|Your site is taking shape/i);
});

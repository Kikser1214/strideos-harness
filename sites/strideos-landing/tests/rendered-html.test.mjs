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
  assert.match(html, /<title>StrideOS - Five-skill endurance coaching plugin<\/title>/i);
  assert.match(html, /Five-skill ChatGPT \+ Codex plugin/i);
  assert.match(html, /Train with AI\./);
  assert.match(html, /Keep your people in the loop\./);
  assert.match(html, /installs five focused endurance-coaching skills/i);
  assert.match(html, /private coach room/i);
  assert.match(html, /npx plugins add \.\/plugins\/strideos --target codex/i);
  for (const skill of ["coach-athlete", "plan-training", "use-training-data", "support-fueling", "build-coach-room"]) assert.match(html, new RegExp(skill));
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
  assert.match(html, /Agent browsing and watch delivery remain unavailable/i);
  assert.match(html, /approval alone can never make the route available/i);
  assert.doesNotMatch(html, /community bridge|unofficial/i);
  assert.doesNotMatch(html, /Approve one Garmin write|Garmin Connect tab|workout builder|watch calendar|one-use Garmin/i);
  assert.doesNotMatch(html, /Threshold intervals|react-loading-skeleton|Your site is taking shape/i);
});

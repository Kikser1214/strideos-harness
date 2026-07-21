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
  assert.match(html, /<p class="eyebrow hero-eyebrow">Six-skill ChatGPT \+ Codex plugin<\/p>/i);
  assert.doesNotMatch(html, /<p class="[^"]*\beyebrow\b[^"]*">\s*<span/i);
  assert.match(html, /The AI coach that asks first\./i);
  assert.match(html, /Your training\. Your data\. Your call\./i);
  assert.match(html, /installs six coaching skills in ChatGPT and Codex/i);
  assert.match(html, /nothing activates and nothing[\s\S]*reaches your watch without your explicit yes/i);
  assert.match(html, /invite your real coach or a trusted friend to review and suggest/i);
  assert.match(html, /Training Circle/i);
  assert.doesNotMatch(html, /(?:private )?coach room/i);
  assert.match(html, /codex plugin marketplace add Kikser1214\/strideos-harness --ref main/i);
  assert.match(html, /codex plugin add strideos@strideos/i);
  assert.match(html, /@strideos Build my training profile/i);
  assert.match(html, /Plugins Directory/i);
  for (const skill of ["coach-athlete", "plan-training", "use-training-data", "support-fueling", "schedule-coaching", "build-coach-room"]) assert.match(html, new RegExp(skill));
  assert.match(html, /Prepare optional morning, workout, and weekly check-ins/i);
  assert.match(html, /It knows where you are\.[\s\S]*It tells you what(?:&#x27;|')s next\./i);
  assert.match(html, /What it knows, what it thinks, what it(?:&#x27;|')s allowed to do, and what it actually did[\s\S]*always kept separate, always visible/i);
  assert.match(html, /01[\s\S]*Listen[\s\S]*Only the training data you choose to share/i);
  assert.match(html, /02[\s\S]*Understand[\s\S]*It builds the full picture of your training/i);
  assert.match(html, /03[\s\S]*Ask[\s\S]*Your explicit yes, every time/i);
  assert.match(html, /04[\s\S]*Confirm[\s\S]*checks the result actually landed/i);
  assert.match(html, /dashboard-plan\.png/);
  assert.match(html, /LIVE REFERENCE VIEW/);
  assert.match(html, /Install the plugin/);
  assert.match(html, /Open the live demo/);
  assert.match(html, /Invite privately/);
  assert.match(html, /only you can accept a change/i);
  assert.match(html, /The agent can propose/);
  assert.match(html, /Only you can approve/);
  assert.match(html, /Apple Health XML import is not implemented/i);
  assert.match(html, /Health Connect backup import is not implemented/i);
  assert.match(html, /Garmin page you signed into/i);
  assert.match(html, /one visible action at a time/i);
  assert.match(html, /you can still use any other tool you want/i);
  assert.match(html, /Post-Build Week roadmap/i);
  assert.match(html, /The next loop[\s\S]*is longer/i);
  assert.match(html, /Not in the current release/i);
  assert.match(html, /Training history that remembers/i);
  assert.match(html, /Running form over time/i);
  assert.match(html, /Flexible fueling history/i);
  assert.match(html, /as simple or detailed as the athlete wants/i);
  assert.doesNotMatch(html, /community bridge|unofficial/i);
  assert.doesNotMatch(html, /private endpoint|credential replay|workout builder|one-use Garmin/i);
  assert.doesNotMatch(html, /athlete map|deterministic authority|evidence routes|provenance|control plane|allowlist/i);
  assert.doesNotMatch(html, /Threshold intervals|react-loading-skeleton|Your site is taking shape/i);
});

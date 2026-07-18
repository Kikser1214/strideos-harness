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

test("server-renders the StrideOS landing page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>StrideOS — Open-source agentic coaching<\/title>/i);
  assert.match(html, /Your training,/);
  assert.match(html, /finally connected\./);
  assert.match(html, /Open the live coach/);
  assert.match(html, /Explore on GitHub/);
  assert.match(html, /Coach Mode/);
  assert.match(html, /Invite privately/);
  assert.match(html, /Bring the people you trust into the loop/);
  assert.match(html, /Only the athlete activates plan changes/);
  assert.match(html, /The agent can propose/);
  assert.match(html, /Only you can approve/);
  assert.match(html, /Built for the OpenAI Buildathon/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

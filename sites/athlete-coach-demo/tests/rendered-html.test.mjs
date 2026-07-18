import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("https://stride-demo.example/", {
      headers: {
        accept: "text/html",
        host: "stride-demo.example",
        "x-forwarded-host": "stride-demo.example",
        "x-forwarded-proto": "https",
      },
    }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the synthetic StrideOS dashboard", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /StrideOS/);
  assert.match(html, /SYNTHETIC DEMO/);
  assert.match(html, /Good morning, Milan/);
  assert.match(html, /3:20:00/);
  assert.match(html, /One concern, one precise proposal/);
  assert.doesNotMatch(html, /codex-preview/);
  assert.doesNotMatch(html, /Your site is taking shape/);
});

test("includes the share card and removes the disposable starter", async () => {
  const [layout, page, packageJson] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  await access(new URL("../public/og.png", import.meta.url));
  await assert.rejects(access(new URL("../app/_sites-preview/SkeletonPreview.tsx", import.meta.url)));
  assert.match(layout, /summary_large_image/);
  assert.match(layout, /x-forwarded-host/);
  assert.match(page, /Athlete in control/);
  assert.match(page, /Onboarding replay/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});

test("ships as an unbound Sites template", async () => {
  const hosting = JSON.parse(await readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"));
  assert.deepEqual(hosting, { d1: null, r2: null });
  await access(new URL("dist/server/index.js", projectRoot));
});

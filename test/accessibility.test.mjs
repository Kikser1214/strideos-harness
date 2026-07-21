import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const html = fs.readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const app = fs.readFileSync(new URL("../public/app.js", import.meta.url), "utf8");

function matches(pattern) {
  return [...html.matchAll(pattern)];
}

test("static interface has unique IDs and labelled dialogs", () => {
  const ids = matches(/\bid="([^"]+)"/g).map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, "Duplicate HTML id found");
  const idSet = new Set(ids);
  for (const [, attributes] of matches(/<dialog\b([^>]*)>/g)) {
    const label = /\baria-labelledby="([^"]+)"/.exec(attributes)?.[1];
    assert.ok(label, "Every dialog needs aria-labelledby");
    assert.ok(idSet.has(label), `Dialog label target #${label} does not exist`);
  }
});

test("static images and buttons have accessible names", () => {
  for (const [, attributes] of matches(/<img\b([^>]*)>/g)) {
    assert.match(attributes, /\balt="[^"]*"/, "Every image needs alt text");
  }
  for (const [, attributes, content] of matches(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)) {
    const aria = /\baria-label="([^"]+)"/.exec(attributes)?.[1]?.trim();
    const text = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    assert.ok(aria || text, "Every button needs visible text or aria-label");
  }
  assert.match(html, /<textarea\b[^>]*id="coachInput"[^>]*aria-label="[^"]+"/);
});

test("automation UI copies a human-readable schedule instead of a raw recurrence rule", () => {
  assert.match(app, /Copy setup prompt/);
  assert.doesNotMatch(app, /Copy prompt \+ RRULE|task\.schedule\.rrule/);
});

test("reference UI presents host browsing as an option rather than a plugin veto", () => {
  assert.match(app, /user-selected host tools remain available/i);
  assert.match(app, /Attended host option/i);
  assert.doesNotMatch(app, /no permitted browser-agent route|No reviewed browser executor|No attended-browser provider write is enabled/i);
  assert.match(html, /catalog never becomes an allowlist/i);
  assert.doesNotMatch(html, /currently available permitted routes|Provider writes stay blocked/i);
});

test("reference UI distinguishes an uncertain provider write from a safe retry", () => {
  assert.match(app, /verification_required/);
  assert.match(app, /Write outcome needs reconciliation/);
  assert.match(app, /Check the provider before creating any retry/);
});

// Real mouse drags of every chip onto every drop place, printing the query after each: node scripts/check-drag.mjs (dev server on :5173)
import { chromium } from "playwright-core";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(4000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
const q = () => page.evaluate(() => new URLSearchParams(location.hash.split("?")[1] ?? "").get("q"));
const state = () => page.evaluate(() => ({ dragging: !!document.querySelector(".search.dragging"), tabs: document.querySelectorAll(".or-tab").length, ghosts: document.querySelectorAll(".drag-ghost").length }));
const base = "open-source -business ui";
async function tryDrag(name, sourceText, to) {
  await page.goto("about:blank");
  await page.goto("http://localhost:5173/#/?q=" + encodeURIComponent(base));
  await page.waitForTimeout(300);
  const a = await page.locator(".search .chip", { hasText: sourceText }).first().boundingBox();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 15, a.y + 5, { steps: 3 });
  await page.waitForTimeout(80);
  const b = await to();
  await page.mouse.move(b.x, b.y, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(250);
  console.log(name.padEnd(28), "->", JSON.stringify(await q()), JSON.stringify(await state()));
}
const center = async (loc) => { const b = await loc.boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
for (const src of ["open-source", "business", "ui"]) {
  await tryDrag(`${src} -> or tab 0`, src, () => center(page.locator(".or-tab").first()));
  await tryDrag(`${src} -> or tab last`, src, () => center(page.locator(".or-tab").last()));
  await tryDrag(`${src} -> and tab 0`, src, () => center(page.locator(".and-tab").first()));
  await tryDrag(`${src} -> without`, src, () => center(page.locator(".drop-zone", { hasText: "Without" })));
  await tryDrag(`${src} -> only`, src, () => center(page.locator(".drop-zone", { hasText: "Only" })));
  await tryDrag(`${src} -> back on itself`, src, async () => ({ x: 300, y: 600 }));
  await tryDrag(`${src} -> out`, src, async () => ({ x: 700, y: 880 }));
}
// inside an "or" group, the "and" tab over an alternative makes (it and the tag)
await page.goto("about:blank");
await page.goto("http://localhost:5173/#/?q=" + encodeURIComponent("model:claude || harness"));
await page.waitForTimeout(300);
const tag = await page.locator(".hero-cloud .tag", { hasText: "agents" }).first().boundingBox();
await page.mouse.move(tag.x + 10, tag.y + 8);
await page.mouse.down();
await page.mouse.move(tag.x + 30, tag.y - 20, { steps: 3 });
await page.waitForTimeout(80);
const tab = await page.locator(".and-tab").nth(1).boundingBox();
await page.mouse.move(tab.x + tab.width / 2, tab.y + tab.height / 2, { steps: 5 });
await page.waitForTimeout(100);
await page.screenshot({ path: "/tmp/and-tabs.png", clip: { x: 0, y: 470, width: 1000, height: 260 } });
await page.mouse.up();
await page.waitForTimeout(250);
console.log("tag -> and tab over harness".padEnd(28), "->", JSON.stringify(await q()));
console.log("errors:", errors);
await browser.close();

// an "and" group whose "or" partner leaves falls apart into plain chips, all still draggable
{
  const browser2 = await chromium.launch();
  const p2 = await browser2.newPage({ viewport: { width: 1440, height: 900 } });
  await p2.goto("http://localhost:5173/#/?q=" + encodeURIComponent("model:claude || (harness agents)"));
  await p2.waitForTimeout(300);
  const a = await p2.locator(".search .chip", { hasText: "model:claude" }).first().boundingBox();
  await p2.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await p2.mouse.down();
  await p2.mouse.move(a.x + a.width / 2 + 15, a.y + 5, { steps: 3 });
  const add = await p2.locator(".drop-zone", { hasText: "Add" }).boundingBox();
  await p2.mouse.move(add.x + add.width / 2, add.y + add.height / 2, { steps: 5 });
  await p2.mouse.up();
  await p2.waitForTimeout(250);
  const q2 = await p2.evaluate(() => new URLSearchParams(location.hash.split("?")[1] ?? "").get("q"));
  console.log("partner leaves the group".padEnd(28), "->", JSON.stringify(q2), await p2.locator(".search .chip").allTextContents(), "raw:", await p2.locator(".search .chip.raw").count());
  await browser2.close();
}

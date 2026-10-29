// Finger drags on a phone (390px, touch events through CDP, as Chrome's device mode sends them),
// printing the query and the scroll after each: node scripts/check-touch.mjs (dev server on :5173)
import { chromium } from "playwright-core";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const cdp = await ctx.newCDPSession(page);
const touch = (type, x, y) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
const base = "workflow || model:claude";
const open = async () => {
  await page.goto("about:blank");
  await page.goto("http://localhost:5173/#/?q=" + encodeURIComponent(base));
  await page.waitForTimeout(400);
};
const read = () =>
  page.evaluate(() => ({
    q: new URLSearchParams(location.hash.split("?")[1] ?? "").get("q"),
    scrollY: Math.round(scrollY),
    row: Math.round(document.querySelector(".hero-cloud .cloud-tags")?.scrollLeft ?? 0),
    menu: !!document.querySelector('[role="menu"]'),
    left: document.querySelectorAll("[data-held], [data-drag-source], .drag-ghost").length,
  }));
const center = async (loc) => { const b = await loc.boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
async function drag(name, from, to, holdMs = 0) {
  await open();
  const s = await center(from());
  await touch("touchStart", s.x, s.y);
  if (holdMs) await page.waitForTimeout(holdMs);
  // the zones show once the drag starts, so the target is found after the first moves
  for (let i = 1; i <= 3; i++) { await touch("touchMove", s.x + i * 4, s.y - i * 6); await page.waitForTimeout(16); }
  const dragging = await page.locator(".search.dragging").count();
  const b = dragging || !to ? await (to ?? (async () => ({ x: s.x, y: s.y - 300 })))() : { x: s.x, y: s.y - 300 };
  const from2 = { x: s.x + 12, y: s.y - 18 };
  for (let i = 1; i <= 10; i++) { await touch("touchMove", from2.x + ((b.x - from2.x) * i) / 10, from2.y + ((b.y - from2.y) * i) / 10); await page.waitForTimeout(16); }
  await touch("touchEnd");
  await page.waitForTimeout(300);
  console.log(name.padEnd(30), "dragging:", !!dragging, "->", JSON.stringify(await read()));
}
const tag = (t) => () => page.locator(".hero-cloud .tag", { hasText: t }).first();
const chip = (t) => () => page.locator(".search .chip", { hasText: t }).first();
const zone = (t) => () => center(page.locator(".drop-zone", { hasText: t }));
await drag("chip workflow hold -> Without", chip("workflow"), zone("Without"), 600);
await drag("chip workflow hold -> out", chip("workflow"), async () => ({ x: 200, y: 800 }), 600);
await drag("tag swipe up (page scrolls)", tag("kind:post"), null);
await drag("tag hold -> Add", tag("kind:post"), zone("Add"), 600);
await drag("tag hold -> Without", tag("kind:post"), zone("Without"), 600);
await drag("tag hold -> or under group", tag("kind:post"), () => center(page.locator(".or-tab").first()), 600);
await drag("tag hold -> and over claude", tag("kind:post"), () => center(page.locator(".and-tab").nth(1)), 600);
// a swipe along a tag row scrolls the row
{
  await open();
  const s = await center(tag("agents")());
  await touch("touchStart", s.x, s.y);
  for (let i = 1; i <= 10; i++) { await touch("touchMove", s.x - i * 20, s.y); await page.waitForTimeout(16); }
  await touch("touchEnd");
  await page.waitForTimeout(400);
  console.log("tag row swipe left".padEnd(30), "->", JSON.stringify(await read()));
}
// a swipe along the chips scrolls their one row, nothing is dragged
{
  await page.goto("about:blank");
  await page.goto("http://localhost:5173/#/?q=" + encodeURIComponent("date:2026-10-29 weight:>=1 sort:views agents product:t3-code open-source harness business ui"));
  await page.waitForTimeout(400);
  const before = await page.evaluate(() => document.querySelector(".chips").scrollLeft);
  const s = await center(chip("weight")());
  await touch("touchStart", s.x, s.y);
  for (let i = 1; i <= 10; i++) { await touch("touchMove", s.x - i * 20, s.y); await page.waitForTimeout(16); }
  await touch("touchEnd");
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => document.querySelector(".chips").scrollLeft);
  console.log("chip row swipe left".padEnd(30), "-> scrollLeft", before, "->", after, JSON.stringify(await read()));
}
// a hold let go in place opens the tag menu, and the tag does not also search
{
  await open();
  const s = await center(tag("kind:post")());
  await touch("touchStart", s.x, s.y);
  await page.waitForTimeout(600);
  await touch("touchEnd");
  await page.waitForTimeout(300);
  console.log("tag hold, let go".padEnd(30), "->", JSON.stringify(await read()));
}
console.log("errors:", errors);
await browser.close();

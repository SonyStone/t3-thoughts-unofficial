// The phone's search editing screen with Back and with the phone turned: Back closes the screen
// as Done does and keeps the query as edited; a session on the screen is one step in the history
// (none when nothing changed); a phone on its side (915x412) gets the screen too; turning it with
// the field focused opens or closes the screen cleanly; a screen too short for its zones keeps the
// bar in sight: node scripts/check-back.mjs (dev server on :5173)
import { chromium } from "playwright-core";
// the dev server: SITE=http://localhost:5174 node scripts/... for another one
const SITE = process.env.SITE ?? "http://localhost:5173";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const start = "product:t3-code";
const state = () =>
  page.evaluate(() => {
    const box = (sel) => {
      const el = document.querySelector(sel);
      if (!el || getComputedStyle(el).visibility === "hidden") return null;
      const r = el.getBoundingClientRect();
      return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)];
    };
    return {
      q: new URLSearchParams(location.hash.split("?")[1] ?? "").get("q"),
      editing: !!document.querySelector(".search.editing"),
      focused: document.activeElement === document.querySelector(".search-field input"),
      frozen: document.body.style.position === "fixed",
      scrollY: Math.round(scrollY),
      history: history.length,
      drop: box(".search-drop"),
    };
  });
const log = async (what, extra) => console.log(what.padEnd(34), "->", JSON.stringify({ ...(await state()), ...extra }));

async function open(query = start, y = 200) {
  await page.goto("about:blank");
  await page.goto(SITE + "/#/?q=" + encodeURIComponent(query));
  await page.waitForTimeout(800);
  await page.evaluate((y) => window.scrollTo(0, y), y);
  await page.waitForTimeout(150);
}
async function edit() {
  const f = await page.locator(".search-field").boundingBox();
  // the search icon: a tap anywhere on the box but a chip focuses the field
  await page.touchscreen.tap(f.x + 18, f.y + f.height / 2);
  await page.waitForTimeout(400);
}
/** Taps the nth tag of the list on the screen: a link, which changes the query. */
async function tapTag(n) {
  const t = await page.locator(".search-drop .tag:not(.active)").nth(n).boundingBox();
  await page.touchscreen.tap(t.x + t.width / 2, t.y + t.height / 2);
  await page.waitForTimeout(300);
}
const back = async () => {
  await page.goBack({ waitUntil: "commit" }).catch(() => {});
  await page.waitForTimeout(400);
};

// Back while editing: the screen closes, the query stays as edited (in place of the one before
// the session, so the next Back goes to what was before the page: here, off the site)
await open();
await log("page");
await edit();
await log("editing");
await tapTag(0);
await tapTag(0);
await log("two tags picked");
await back();
await log("Back: closed, query kept");
await back();
await log("Back again: the page before");

// typed text not yet a chip goes into the same step
await open();
await edit();
await tapTag(0);
await page.keyboard.type("zzqx");
await back();
await log("Back with text typed");
await back();
await log("Back again: the page before");

// Done after changes: one step; Done with nothing changed: none, Back leaves the page
await open();
await edit();
await tapTag(0);
await page.locator(".search-done").tap();
await page.waitForTimeout(300);
await log("Done after a change");
await back();
await log("Back: before the session");
await open();
await edit();
await page.locator(".search-done").tap();
await page.waitForTimeout(400);
await log("Done, nothing changed");
await back();
await log("Back: off the site", { url: page.url() });
// Back with nothing changed: closes, and the screen's step is gone
await open();
await edit();
await back();
await log("Back, nothing changed");
await back();
await log("Back again: off the site", { url: page.url() });

const board = () =>
  page.evaluate(() => {
    const r = (sel) => {
      const el = document.querySelector(sel);
      if (!el || getComputedStyle(el).visibility === "hidden") return null;
      const b = el.getBoundingClientRect();
      return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)];
    };
    return { screen: r(".search.editing"), bar: r(".search.editing .search-field"), board: r(".search.editing .drop-board") };
  });

// on its side: the screen all the same, the zones across it
await page.setViewportSize({ width: 915, height: 412 });
await open();
await edit();
await log("915x412: editing", await board());
await page.locator(".search-done").tap();
await page.waitForTimeout(300);
await log("915x412: done");

// turned with the field focused: portrait, side, a tablet's side (no screen), portrait
await page.setViewportSize({ width: 390, height: 844 });
await open();
await edit();
await log("390x844: editing");
for (const [width, height] of [
  [915, 412],
  [915, 600],
  [390, 844],
  [915, 600],
]) {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(400);
  await log(`turned to ${width}x${height}`, await board());
}
await page.keyboard.press("Escape");
await page.waitForTimeout(300);
await log("Escape");

// little room over the keyboard (the window made short under an open screen): the bar stays in
// sight, the zones give way to the tags until a drag
for (const [width, height] of [
  [915, 412],
  [915, 71],
  [915, 160],
  [390, 150],
  [390, 400],
]) {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(300);
  if (width === 915 && height === 412) {
    await open();
    await edit();
  }
  await log(`${width}x${height}: editing`, await board());
}
console.log("errors:", errors);
await browser.close();

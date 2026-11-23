// The phone's search editing screen (390px, touch through CDP): it opens on focus with the page
// frozen, keeps the focus while tags are picked up, docks the zones at the bottom, and Done puts
// the page back where it was: node scripts/check-edit.mjs (dev server on :5173)
import { chromium } from "playwright-core";
// the dev server: SITE=http://localhost:5174 node scripts/... for another one
const SITE = process.env.SITE ?? "http://localhost:5173";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const cdp = await ctx.newCDPSession(page);
const touch = (type, x, y) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
const q = () => page.evaluate(() => new URLSearchParams(location.hash.split("?")[1] ?? "").get("q"));
const state = () =>
  page.evaluate(() => ({
    editing: !!document.querySelector(".search.editing"),
    active: document.activeElement?.tagName,
    frozen: document.body.style.position === "fixed",
    scrollY: Math.round(scrollY),
  }));

async function edit() {
  await page.goto("about:blank");
  await page.goto(SITE + "/#/?q=" + encodeURIComponent("product:t3-code agents"));
  await page.waitForTimeout(800);
  await page.evaluate(() => window.scrollTo(0, 200));
  await page.waitForTimeout(150);
  const f = await page.locator(".search-field").boundingBox();
  // the search icon: a tap anywhere on the box but a chip focuses the field
  await page.touchscreen.tap(f.x + 18, f.y + f.height / 2);
  await page.waitForTimeout(400);
}

/** Holds a tag of the list, moves along `path` (a function of the screen once the drag is on), lets go. */
async function hold(text, path) {
  // a tag by its text, or the lowest one wholly in sight in the list, right over the zones
  const t = text
    ? await page.locator(".search-drop .tag", { hasText: text }).first().boundingBox()
    : await page.evaluate(() => {
        const list = document.querySelector(".search-drop").getBoundingClientRect();
        const boxes = [...document.querySelectorAll(".search-drop .tag")].map((el) => el.getBoundingClientRect().toJSON());
        return boxes.filter((b) => b.bottom < list.bottom - 2).sort((a, b) => b.bottom - a.bottom)[0];
      });
  const s = { x: t.x + t.width / 2, y: t.y + t.height / 2 };
  await touch("touchStart", s.x, s.y);
  await page.waitForTimeout(350);
  // far enough to start the drag, so the targets are found where the drag puts them
  for (let i = 1; i <= 3; i++) {
    await touch("touchMove", s.x + i * 4, s.y - i * 6);
    await page.waitForTimeout(16);
  }
  await page.waitForTimeout(300);
  for (const p of await path(s)) {
    await touch("touchMove", p.x, p.y);
    await page.waitForTimeout(30);
  }
  await touch("touchEnd");
  await page.waitForTimeout(800);
}

await edit();
console.log("opened".padEnd(30), "->", JSON.stringify(await state()));

// a long press focuses a link on a phone: the field takes the focus back
await page.evaluate(() => document.querySelector(".search-drop .tag").focus());
await page.waitForTimeout(100);
console.log("a tag takes the focus".padEnd(30), "->", JSON.stringify(await state()));

// a tag into the gap after the first chip; the field keeps the focus (the keyboard stays)
await hold("model:claude", async (s) => {
  const b = await page.locator(".search .chips > .clause").first().boundingBox();
  const to = { x: b.x + b.width + 4, y: b.y + b.height / 2 };
  return Array.from({ length: 10 }, (_, i) => ({ x: s.x + ((to.x - s.x) * (i + 1)) / 10, y: s.y + ((to.y - s.y) * (i + 1)) / 10 }));
});
console.log("tag -> gap".padEnd(30), "->", JSON.stringify(await q()), JSON.stringify(await state()));

// the lowest tag in sight, right over the zones: let go in place, nothing happens
await edit();
await hold(undefined, async (s) => [{ x: s.x + 2, y: s.y - 2 }]);
console.log("let go under the dock".padEnd(30), "->", JSON.stringify(await q()));

// out of the zone and back: then it takes it
await edit();
await hold(undefined, async (s) => {
  const only = await page.locator(".drop-zone", { hasText: "Only" }).boundingBox();
  return [
    { x: s.x, y: s.y - 200 },
    { x: s.x, y: s.y - 100 },
    { x: only.x + only.width / 2, y: only.y + only.height / 2 },
  ];
});
console.log("out and back to Only".padEnd(30), "->", JSON.stringify(await q()));

// a chip tapped on the page: the editing screen (the box has no free room to tap); on the
// screen, the chip's menu, in sight
await page.locator(".search-done").tap();
await page.waitForTimeout(300);
await page.locator(".search .chip").first().tap();
await page.waitForTimeout(400);
console.log("tap a chip on the page".padEnd(30), "->", JSON.stringify(await state()), "menu:", await page.locator(".tag-menu").count());
await page.locator(".search .chip").first().tap();
await page.waitForTimeout(400);
console.log("tap a chip, editing".padEnd(30), "->", JSON.stringify(await state()), "menu:", await page.locator(".tag-menu").count());
await page.keyboard.press("Escape");
await page.waitForTimeout(200);
await page.locator(".search-field").click({ position: { x: 18, y: 20 } });
await page.waitForTimeout(300);

// Done: the screen goes, the page is back where it was
await page.locator(".search-done").tap();
await page.waitForTimeout(300);
console.log("done".padEnd(30), "->", JSON.stringify(await state()));
console.log("errors:", errors);
await browser.close();

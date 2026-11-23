// Suggestions under the search field: a tag there is picked up and held as on the page (dragged
// onto a zone or among the chips, held for its menu), one in the search already is framed and a
// tap takes it out; on a phone (touch through CDP) and with the mouse: node scripts/check-suggest.mjs
// (dev server on :5173)
import { chromium } from "playwright-core";
// the dev server: SITE=http://localhost:5174 node scripts/... for another one
const SITE = process.env.SITE ?? "http://localhost:5173";
const browser = await chromium.launch();
const errors = [];
// phone
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
const page = await ctx.newPage();
page.on("pageerror", (e) => errors.push(e.message));
const cdp = await ctx.newCDPSession(page);
const touch = (type, x, y) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
const q = (p = page) => p.evaluate(() => new URLSearchParams(location.hash.split("?")[1] ?? "").get("q"));
const st = (p = page) => p.evaluate(() => ({ draft: document.querySelector(".search-field input").value, active: document.activeElement.tagName, editing: !!document.querySelector(".search.editing"), menu: !!document.querySelector(".tag-menu"), rows: [...document.querySelectorAll(".suggestions li")].map((li) => li.querySelector("span").textContent + (li.classList.contains("used") ? "*" : "") + (li.classList.contains("excluded") ? "-" : "")).slice(0, 4).join(",") }));
async function open(query, typed) {
  await page.goto("about:blank");
  await page.goto(SITE + "/#/?q=" + encodeURIComponent(query));
  await page.waitForTimeout(700);
  const f = await page.locator(".search-field").boundingBox();
  await page.touchscreen.tap(f.x + 18, f.y + f.height / 2);
  await page.waitForTimeout(400);
  await page.keyboard.type(typed);
  await page.waitForTimeout(200);
}
async function hold(text, to) {
  const b = await page.locator(".suggestions li", { hasText: text }).first().boundingBox();
  const s = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  await touch("touchStart", s.x, s.y);
  await page.waitForTimeout(350);
  if (to) {
    for (let i = 1; i <= 3; i++) { await touch("touchMove", s.x + i * 3, s.y + i * 5); await page.waitForTimeout(16); }
    await page.waitForTimeout(100);
    const z = await to();
    console.log("   ghost:", await page.evaluate(() => { const g = document.querySelector(".drag-ghost"); if (!g) return null; const r = g.getBoundingClientRect(); return `${g.className} ${Math.round(r.width)}x${Math.round(r.height)} "${g.textContent}"`; }));
    for (let i = 1; i <= 8; i++) { await touch("touchMove", s.x + ((z.x - s.x) * i) / 8, s.y + ((z.y - s.y) * i) / 8); await page.waitForTimeout(30); }
    await page.waitForTimeout(150);
  }
  await touch("touchEnd");
  await page.waitForTimeout(700);
}
const zone = (name) => async () => { const b = await page.locator(".drop-zone", { hasText: name }).boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };

await open("product:t3-code agents", "op")
console.log("typed op".padEnd(28), JSON.stringify(await st()));
await hold("open-source", zone("Without"));
console.log("hold -> Without".padEnd(28), JSON.stringify(await q()), JSON.stringify(await st()));

await open("product:t3-code agents", "op")
await hold("open-source", zone("Only"));
console.log("hold -> Only".padEnd(28), JSON.stringify(await q()), JSON.stringify(await st()));

await open("product:t3-code agents", "op")
await hold("open-source", async () => { const b = await page.locator(".search .chips > .clause").first().boundingBox(); return { x: b.x + b.width + 4, y: b.y + b.height / 2 }; });
console.log("hold -> gap after first".padEnd(28), JSON.stringify(await q()), JSON.stringify(await st()));

await open("product:t3-code agents", "op")
await hold("open-source");
console.log("hold, let go (menu)".padEnd(28), JSON.stringify(await q()), JSON.stringify(await st()));
await page.locator(".tag-menu button[title='Without']").tap();
await page.waitForTimeout(400);
console.log("menu: Without".padEnd(28), JSON.stringify(await q()), JSON.stringify(await st()));

await open("product:t3-code open-source", "op");
console.log("used marked".padEnd(28), JSON.stringify(await st()));
await page.locator(".suggestions li", { hasText: "open-source" }).first().tap();
await page.waitForTimeout(400);
console.log("tap used -> removed".padEnd(28), JSON.stringify(await q()), JSON.stringify(await st()));
await open("product:t3-code -open-source", "op");
console.log("excluded marked".padEnd(28), JSON.stringify(await st()));
await open("product:t3-code", "op");
await page.locator(".suggestions li", { hasText: "open-source" }).first().tap();
await page.waitForTimeout(400);
console.log("tap -> added".padEnd(28), JSON.stringify(await q()), JSON.stringify(await st()));
await open("product:t3-code", "op");
await page.locator(".suggestions li", { hasText: "Search the text" }).first().tap();
await page.waitForTimeout(400);
console.log("tap text option".padEnd(28), JSON.stringify(await q()), JSON.stringify(await st()));

// desktop, the mouse
const d = await browser.newPage({ viewport: { width: 1280, height: 800 } });
d.on("pageerror", (e) => errors.push(e.message));
for (const [label, dest] of [["click", null], ["drag -> Only", "Only"], ["drag -> Without", "Without"]]) {
  await d.goto("about:blank");
  await d.goto(SITE + "/#/?q=" + encodeURIComponent("product:t3-code agents"));
  await d.waitForTimeout(700);
  await d.locator(".search-field").first().click({ position: { x: 30, y: 30 } });
  await d.keyboard.type("op");
  await d.waitForTimeout(200);
  const b = await d.locator(".suggestions li", { hasText: "open-source" }).first().boundingBox();
  if (!dest) await d.mouse.click(b.x + 30, b.y + b.height / 2);
  else {
    await d.mouse.move(b.x + 30, b.y + b.height / 2);
    await d.mouse.down();
    await d.mouse.move(b.x + 40, b.y + b.height / 2 + 10, { steps: 3 });
    const z = await d.locator(".drop-zone", { hasText: dest }).boundingBox();
    await d.mouse.move(z.x + z.width / 2, z.y + z.height / 2, { steps: 10 });
    await d.waitForTimeout(100);
    await d.mouse.up();
  }
  await d.waitForTimeout(600);
  console.log(("desktop " + label).padEnd(28), JSON.stringify(await q(d)), JSON.stringify(await st(d)));
}
console.log("errors:", errors);
await browser.close();

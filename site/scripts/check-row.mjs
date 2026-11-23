// The row of chips as a tab bar: with a mouse, arrows over its ends show on hover (only where
// chips are past the end) and page it without taking the focus; leaving the search takes the row
// back to its start, a chip clicked for its menu does not; a chip reached with Tab stands clear
// of the end; the tag menu has "Remove" by the tag. On a phone: no arrows, Done takes the row
// back to its start, the menu there has "Remove" too: node scripts/check-row.mjs (dev server on :5173)
import { chromium } from "playwright-core";
// the dev server: SITE=http://localhost:5174 node scripts/... for another one
const SITE = process.env.SITE ?? "http://localhost:5173";
// the tag cloud is in the search's dropdown, which a focused field opens (the page has none)
const cloudTag = async (p, text) => {
  if (!(await p.locator(".search-drop .cloud").count())) {
    await p.locator(".search-field input").focus();
    await p.waitForTimeout(250);
  }
  return text === undefined ? p.locator(".search-drop .tag") : p.locator(".search-drop .tag", { hasText: text }).first();
};
const browser = await chromium.launch();
const errors = [];
const long = "product:t3-code agents open-source harness business ui fleet workflow -competition model:claude";
const url = (query) => SITE + "/#/?q=" + encodeURIComponent(query);
const q = (p) => p.evaluate(() => new URLSearchParams(location.hash.split("?")[1] ?? "").get("q"));
const row = (p) =>
  p.evaluate(() => {
    const r = document.querySelector(".search .chips");
    const shown = (side) => {
      const el = document.querySelector(`.row-arrow.${side}`);
      const s = el && getComputedStyle(el);
      return s ? (s.display === "none" ? "none" : Number(s.opacity) > 0.5 ? "on" : "hidden") : "absent";
    };
    return {
      left: Math.round(r.scrollLeft),
      max: r.scrollWidth - r.clientWidth,
      arrows: `${shown("left")}/${shown("right")}`,
      active: document.activeElement.tagName + (document.activeElement.className ? "." + document.activeElement.className.split(" ")[0] : ""),
    };
  });
const menuOf = (p) =>
  p.evaluate(() => {
    const m = document.querySelector(".tag-menu");
    if (!m) return null;
    return {
      remove: !!m.querySelector(".tag-menu-remove"),
      items: [...m.querySelectorAll(".tag-menu-actions button")].map((b) => b.getAttribute("aria-label")),
    };
  });
const line = (name, ...rest) => console.log(name.padEnd(30), "->", ...rest.map((v) => (typeof v === "string" ? v : JSON.stringify(v))));

// mouse
{
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 800 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url(long));
  await page.waitForTimeout(800);
  const field = page.locator(".search-field");
  await field.scrollIntoViewIfNeeded();
  line("opened", await row(page));
  const f = await field.boundingBox();
  await page.mouse.move(f.x + f.width / 2, f.y + f.height / 2);
  await page.waitForTimeout(250);
  line("hover", await row(page));
  await page.locator(".row-arrow.right").click();
  await page.waitForTimeout(600);
  line("right arrow", await row(page), "q kept:", (await q(page)) === long);
  await page.locator(".row-arrow.left").click();
  await page.waitForTimeout(600);
  line("left arrow", await row(page));
  await page.mouse.move(f.x + f.width / 2, f.y - 200);
  await page.waitForTimeout(250);
  line("hover off", await row(page));

  // typing at the end, then leaving the search: the row goes back to its start
  await page.locator(".search-field input").focus();
  await page.waitForTimeout(300);
  line("focused", await row(page));
  // above the box: under it is the dropdown with the tags now
  await page.mouse.click(f.x + f.width / 2, f.y - 60);
  await page.waitForTimeout(300);
  line("clicked away", await row(page));

  // a chip clicked for its menu while typing: the row stays where it is
  await page.locator(".search-field input").focus();
  await page.waitForTimeout(300);
  const before = (await row(page)).left;
  await page.locator(".search .chip", { hasText: "model:claude" }).click();
  await page.waitForTimeout(300);
  // the field gives up its room when it loses the focus, so "where it was" is the end of what is left
  const after = await row(page);
  line("chip menu while typing", after, "stayed:", before > 0 && after.left === after.max, await menuOf(page));
  await page.locator(".tag-menu-remove").click();
  await page.waitForTimeout(300);
  line("menu: remove", await q(page), await menuOf(page));

  // Shift+Tab from the field reaches the chips from the end: each one in sight, clear of the end
  await page.goto("about:blank");
  await page.goto(url(long));
  await page.waitForTimeout(800);
  await page.locator(".search-field input").focus();
  await page.waitForTimeout(300);
  const clear = [];
  for (let i = 0; i < 9; i++) {
    await page.keyboard.press("Shift+Tab");
    await page.waitForTimeout(150);
    clear.push(
      await page.evaluate(() => {
        const el = document.activeElement;
        if (!el.matches(".search .chip")) return "-";
        const r = document.querySelector(".search .chips").getBoundingClientRect();
        const c = el.getBoundingClientRect();
        return Math.round(Math.min(c.left - r.left, r.right - c.right));
      }),
    );
  }
  line("shift+tab: room to the end", clear.join(" "));

  // a tag not in the search: no Remove
  await page.goto("about:blank");
  await page.goto(url("agents"));
  await page.waitForTimeout(800);
  await (await cloudTag(page, "harness")).click({ button: "right" });
  await page.waitForTimeout(300);
  line("menu of a tag not in it", await menuOf(page));
  await page.keyboard.press("Escape");
  await page.locator(".search .chip", { hasText: "agents" }).click();
  await page.waitForTimeout(300);
  line("menu of the last chip", await menuOf(page));
  await page.locator(".tag-menu-remove").click();
  await page.waitForTimeout(300);
  line("its remove", JSON.stringify(await q(page)));
  await ctx.close();
}

// phone
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url(long));
  await page.waitForTimeout(800);
  const f = await page.locator(".search-field").boundingBox();
  await page.touchscreen.tap(f.x + 18, f.y + f.height / 2);
  await page.waitForTimeout(500);
  line("phone: editing", await row(page));
  await page.locator(".search .chip", { hasText: "model:claude" }).tap();
  await page.waitForTimeout(300);
  line("phone: chip menu", await menuOf(page));
  await page.locator(".tag-menu-remove").tap();
  await page.waitForTimeout(400);
  line("phone: remove", await q(page), await row(page));
  await page.locator(".search-done").tap();
  await page.waitForTimeout(500);
  line("phone: done", await row(page));
  await ctx.close();
}
console.log("errors:", errors);
await browser.close();

// Screenshots of the main views for design review: node scripts/shots.mjs <out-dir> [base-url]
// Desktop 1440 and phone 390, up to three screens each, with the header video paused on one frame.
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const out = process.argv[2] ?? "shots";
const base = process.argv[3] ?? "http://localhost:5173/";
mkdirSync(out, { recursive: true });

// [name, hash, what to do once the page is there]
const views = [
  ["feed", "#/"],
  ["feed-search", "#/?q=product:t3-code%20(mood:hype%20||%20mood:salty)%20-kind:reply"],
  ["feed-list", "#/", async (page) => {
    await page.getByRole("radio", { name: /List|Список/ }).click();
  }],
  ["tag-menu", "#/?q=product:t3-code", async (page) => {
    const tag = page.locator(".hero-cloud .tag").nth(3);
    await tag.scrollIntoViewIfNeeded();
    await tag.click({ button: "right" });
    await page.locator('[role="menu"]').waitFor();
    await page.waitForTimeout(150);
  }],
  ["entry", "#/", async (page) => {
    // the first tile of the feed, opened the way a reader opens it
    await page.locator(".tile .entry-title a").first().click();
    await page.locator(".post-page").waitFor();
  }],
  ["tags", "#/tags"],
  ["stats", "#/stats"],
];
const sizes = [
  ["desktop", { width: 1440, height: 900 }, 1],
  ["phone", { width: 390, height: 844 }, 2],
];

const browser = await chromium.launch();
for (const [size, viewport, scale] of sizes) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: scale });
  for (const [name, hash, act] of views) {
    await page.goto("about:blank");
    await page.goto(base + hash);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState("networkidle");
    if (act) await act(page);
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => document.querySelectorAll("video").forEach((v) => v.pause()));
    await page.waitForTimeout(400);
    // the top of the page, up to three screens: enough to judge, small enough to read
    // a menu is fixed to the screen, so it is shot as the screen; pages as up to three screens
    const fixed = name === "tag-menu";
    const height = Math.min(await page.evaluate(() => document.documentElement.scrollHeight), viewport.height * 3);
    await page.screenshot(
      fixed
        ? { path: `${out}/${name}-${size}.png` }
        : { path: `${out}/${name}-${size}.png`, fullPage: true, clip: { x: 0, y: 0, width: viewport.width, height } },
    );
  }
  await page.close();
}
await browser.close();
console.log(`saved to ${out}`);

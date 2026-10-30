// Frames of the drag motion (lift, tabs, landing, going home, fading out) and the end states: node scripts/check-motion.mjs [out dir] (dev server on :5173)
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
const out = process.argv[2] ?? "/tmp/motion";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(4000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
const q = () => page.evaluate(() => new URLSearchParams(location.hash.split("?")[1] ?? "").get("q"));
const center = async (loc) => {
  const b = await loc.boundingBox();
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};
const base = "open-source (-business || harness) ui";
let clip;
const shot = (name) => page.screenshot({ path: `${out}/${name}.png`, clip });

async function open() {
  await page.goto("about:blank");
  await page.goto("http://localhost:5173/#/?q=" + encodeURIComponent(base));
  await page.waitForTimeout(400);
  const box = await page.locator(".search").boundingBox();
  clip = { x: box.x - 10, y: box.y - 70, width: box.width + 20, height: box.height + 140 };
}

/** Picks a chip up, takes frames on the way, lets go on `to`, takes frames of the landing. */
async function run(name, grab, to) {
  await open();
  const a = await center(grab());
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(a.x + 10, a.y + 4, { steps: 2 });
  await page.waitForTimeout(40);
  await shot(`${name}-1-lift`);
  await page.waitForTimeout(200);
  await shot(`${name}-2-lifted`);
  const b = await to();
  await page.mouse.move(b.x, b.y, { steps: 12 });
  await shot(`${name}-3-over`);
  await page.mouse.up();
  for (const ms of [60, 120, 240]) {
    await page.waitForTimeout(ms === 60 ? 60 : ms / 2);
    await shot(`${name}-4-land-${ms}`);
  }
  await page.waitForTimeout(800);
  const state = await page.evaluate(() => ({
    ghosts: document.querySelectorAll(".drag-ghost").length,
    dimmed: [...document.querySelectorAll(".search [data-flip]")].filter((el) => getComputedStyle(el).opacity !== "1").length,
  }));
  await shot(`${name}-5-end`);
  console.log(name.padEnd(24), "->", JSON.stringify(await q()), JSON.stringify(state));
}

const chip = (text) => () => page.locator(".search [data-flip]", { hasText: text }).first();
await run("or-tab", chip("open-source"), () => center(page.locator(".or-tab").last()));
await run("trace", chip("ui"), () => center(chip("ui")()));
await run("nowhere", chip("ui"), async () => ({ x: 700, y: 120 }));
await run("out", chip("ui"), async () => ({ x: 700, y: 880 }));
await run("without", chip("open-source"), () => center(page.locator(".drop-zone", { hasText: "Without" })));
await run("and-tab", chip("ui"), () => center(page.locator(".and-tab").first()));
console.log("errors:", errors);
await browser.close();

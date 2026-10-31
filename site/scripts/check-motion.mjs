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

const chip = (text) => () => page.locator(".search .chip[data-flip]", { hasText: text }).first();
await run("or-tab", chip("open-source"), () => center(page.locator(".or-tab").last()));
await run("trace", chip("ui"), () => center(chip("ui")()));
await run("nowhere", chip("ui"), async () => ({ x: 700, y: 120 }));
await run("out", chip("ui"), async () => ({ x: 700, y: 880 }));
await run("without", chip("open-source"), () => center(page.locator(".drop-zone.negate")));
await run("and-tab", chip("ui"), () => center(page.locator(".and-tab").first()));
// a negated chip: the zone that negates offers to take its minus off
await run("neg-include", chip("business"), () => center(page.locator(".drop-zone.negate")));

// a tag from the cloud: over "Add" a preview of it opens after the last chip; between two
// chips it opens there, and the drop puts the tag there
{
  const q3 = "company:anthropic -harness -competition";
  await page.goto("about:blank");
  await page.goto("http://localhost:5173/#/?q=" + encodeURIComponent(q3));
  await page.waitForTimeout(400);
  const box = await page.locator(".search").boundingBox();
  clip = { x: box.x - 10, y: box.y - 70, width: box.width + 20, height: box.height + 140 };
  const slot = () => page.evaluate(() => {
    const el = document.querySelector(".search .slot");
    if (!el) return null;
    const row = [...el.parentElement.children].filter((c) => getComputedStyle(c).display !== "none").sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
    return row.map((c) => (c === el ? `[${c.textContent}]` : c.textContent.replace(/\s+/g, " ").trim())).join(" ");
  });
  const t = await center(page.locator(".hero-cloud .tag", { hasText: "model:claude" }).first());
  await page.mouse.move(t.x, t.y);
  await page.mouse.down();
  await page.mouse.move(t.x + 10, t.y - 10, { steps: 3 });
  const add = await center(page.locator(".drop-add"));
  await page.mouse.move(add.x, add.y, { steps: 10 });
  await page.waitForTimeout(250);
  await shot("gap-1-add");
  console.log("over add".padEnd(24), "->", await slot());
  const harness = await page.locator(".search .clause", { hasText: "harness" }).boundingBox();
  const competition = await page.locator(".search .clause", { hasText: "competition" }).boundingBox();
  const between = { x: (harness.x + harness.width + competition.x) / 2, y: harness.y + harness.height / 2 };
  await page.mouse.move(between.x, between.y, { steps: 10 });
  await page.waitForTimeout(250);
  await shot("gap-2-between");
  console.log("between".padEnd(24), "->", await slot());
  // standing still there, the preview stays put (no flicker between two gaps)
  const seen = new Set();
  for (let i = 0; i < 8; i++) {
    await page.mouse.move(between.x + (i % 2), between.y);
    await page.waitForTimeout(40);
    seen.add(await slot());
  }
  console.log("still".padEnd(24), "->", [...seen]);
  await page.mouse.up();
  await page.waitForTimeout(800);
  await shot("gap-3-dropped");
  console.log("dropped between".padEnd(24), "->", JSON.stringify(await q()));
}
console.log("errors:", errors);
await browser.close();

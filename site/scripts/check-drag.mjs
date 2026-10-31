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
  // no "or" group here, so no "and" tabs: a lone chip has "Add (and)"
  const andTabs = await page.locator(".and-tab").count();
  if (andTabs) console.log("  !! and tabs outside an or group:", andTabs);
  await page.mouse.up();
  await page.waitForTimeout(700);
  console.log(name.padEnd(28), "->", JSON.stringify(await q()), JSON.stringify(await state()));
}
const center = async (loc) => { const b = await loc.boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
for (const src of ["open-source", "business", "ui"]) {
  await tryDrag(`${src} -> or tab 0`, src, () => center(page.locator(".or-tab").first()));
  await tryDrag(`${src} -> or tab last`, src, () => center(page.locator(".or-tab").last()));
  await tryDrag(`${src} -> without`, src, () => center(page.locator(".drop-zone", { hasText: "Without" })));
  await tryDrag(`${src} -> only`, src, () => center(page.locator(".drop-zone", { hasText: "Only" })));
  // the field between chips: the gap there (x 300 is between the first two)
  await tryDrag(`${src} -> gap at x 300`, src, async () => ({ x: 300, y: 600 }));
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

// many chips: they wrap onto rows with room for the tabs between them, the zones keep the right side
{
  const browser3 = await chromium.launch();
  const p3 = await browser3.newPage({ viewport: { width: 1340, height: 900 } });
  const many = "(model:claude || company:anthropic) prompts-vs-features harness open-source -ui business agents company:openai sort:views weight:>=1";
  const read = () => p3.evaluate(() => new URLSearchParams(location.hash.split("?")[1] ?? "").get("q"));
  async function dragTag(name, text, to) {
    await p3.goto("about:blank");
    await p3.goto("http://localhost:5173/#/?q=" + encodeURIComponent(many));
    await p3.waitForTimeout(300);
    const t = await p3.locator(".hero-cloud .tag", { hasText: text }).first().boundingBox();
    await p3.mouse.move(t.x + 10, t.y + 8);
    await p3.mouse.down();
    await p3.mouse.move(t.x + 30, t.y - 20, { steps: 3 });
    await p3.waitForTimeout(80);
    const dimmed = await p3.locator("[data-drag-source]").count();
    // nothing on the board may hide another place: the middle of each place must be that place
    // (places scrolled past an end of the row are out of sight on purpose)
    const hidden = await p3.evaluate(() =>
      [...document.querySelectorAll(".search [data-drop]")]
        .filter((el) => el.dataset.drop !== "field")
        .filter((el) => { const r = el.getBoundingClientRect(), row = document.querySelector(".chips").getBoundingClientRect(); return !el.closest(".chips") || (r.left >= row.left && r.right <= row.right); })
        .filter((el) => { const r = el.getBoundingClientRect(); return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest("[data-drop]") !== el; })
        .map((el) => el.dataset.drop),
    );
    const b = await to();
    await p3.mouse.move(b.x, b.y, { steps: 5 });
    await p3.mouse.up();
    await p3.waitForTimeout(250);
    console.log(name.padEnd(28), "->", JSON.stringify(await read()), "dimmed:", dimmed, "hidden:", hidden, "left dimmed:", await p3.locator("[data-drag-source]").count());
  }
  const mid = async (loc) => { const b = await loc.boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
  await dragTag("many: tag -> without", "workflow", () => mid(p3.locator(".drop-zone", { hasText: "Without" })));
  await dragTag("many: tag -> or under harness", "workflow", () => mid(p3.locator(".or-tab").nth(2)));
  await dragTag("many: and tab in group", "workflow", async () => {
    console.log("  and tabs over:", await p3.evaluate(() => [...document.querySelectorAll(".and-tab")].map((el) => el.nextElementSibling?.textContent)));
    return mid(p3.locator(".and-tab").nth(1));
  });
  // the last chips are past the right end: held at that end, the row scrolls to them
  await dragTag("many: scroll right, or last", "workflow", async () => {
    const row = await p3.locator(".chips").boundingBox();
    const before = await p3.evaluate(() => document.querySelector(".chips").scrollLeft);
    await p3.mouse.move(row.x + row.width - 12, row.y + row.height / 2, { steps: 5 });
    await p3.waitForTimeout(1500);
    console.log("  row scrollLeft:", before, "->", await p3.evaluate(() => document.querySelector(".chips").scrollLeft));
    return mid(p3.locator(".or-tab").last());
  });
  // an excluded tag counts as used in the cloud
  console.log("excluded ui marked used".padEnd(28), "->", await p3.locator(".hero-cloud .tag.active.excluded", { hasText: "ui" }).count());
  // a chip carried out of a group of two leaves no "or" behind it, so no "and" tabs either
  await p3.goto("about:blank");
  await p3.goto("http://localhost:5173/#/?q=" + encodeURIComponent("(model:claude || company:anthropic) harness"));
  await p3.waitForTimeout(300);
  const c = await p3.locator(".search .chip", { hasText: "model:claude" }).first().boundingBox();
  await p3.mouse.move(c.x + c.width / 2, c.y + c.height / 2);
  await p3.mouse.down();
  await p3.mouse.move(c.x + c.width / 2 + 15, c.y + 40, { steps: 3 });
  await p3.waitForTimeout(80);
  console.log("carried out of pair".padEnd(28), "-> and tabs:", await p3.locator(".and-tab").count());
  await p3.keyboard.press("Escape");
  await browser3.close();
}

// one tag out of an "and" group at a time: the group stays, less that tag
{
  const browser4 = await chromium.launch();
  const p4 = await browser4.newPage({ viewport: { width: 1340, height: 900 } });
  const grouped = "open-source (kind:repost || (ui prompts-vs-features)) agents";
  const read = () => p4.evaluate(() => new URLSearchParams(location.hash.split("?")[1] ?? "").get("q"));
  async function dragPart(name, grab, to, shot) {
    await p4.goto("about:blank");
    await p4.goto("http://localhost:5173/#/?q=" + encodeURIComponent(grouped));
    await p4.waitForTimeout(300);
    const a = await grab().boundingBox();
    await p4.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await p4.mouse.down();
    await p4.mouse.move(a.x + a.width / 2 + 15, a.y + 60, { steps: 3 });
    await p4.waitForTimeout(80);
    const left = (await p4.locator(".search .chip.compound").allInnerTexts()).join(" | ") || "(no group)";
    if (shot) await p4.screenshot({ path: shot, clip: { x: 0, y: 380, width: 1340, height: 300 } });
    const b = await to();
    await p4.mouse.move(b.x, b.y, { steps: 5 });
    await p4.mouse.up();
    await p4.waitForTimeout(250);
    console.log(name.padEnd(28), "->", JSON.stringify(await read()), "while carried:", JSON.stringify(left));
  }
  const mid = async (loc) => { const b = await loc.boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
  const part = (text) => () => p4.locator(".search .part", { hasText: text }).first();
  const fromCloud = (text) => () => p4.locator(".hero-cloud .tag", { hasText: text }).first();
  await dragPart("part ui -> add", part("ui"), () => mid(p4.locator(".drop-zone", { hasText: "Add" })), "/tmp/part-drag.png");
  await dragPart("part ui -> without", part("ui"), () => mid(p4.locator(".drop-zone", { hasText: "Without" })));
  await dragPart("part ui -> only", part("ui"), () => mid(p4.locator(".drop-zone", { hasText: "Only" })));
  await dragPart("part ui -> out", part("ui"), async () => ({ x: 700, y: 880 }));
  await dragPart("part ui -> own or", part("ui"), () => mid(p4.locator(".or-tab").nth(1)));
  await dragPart("part ui -> or of agents", part("ui"), () => mid(p4.locator(".or-tab").last()));
  await dragPart("part ui -> and kind:repost", part("ui"), () => mid(p4.locator(".and-tab").first()));
  await dragPart("part p-v-f -> add", part("prompts-vs-features"), () => mid(p4.locator(".drop-zone", { hasText: "Add" })));
  await dragPart("cloud ui (a part) -> add", fromCloud("ui"), () => mid(p4.locator(".drop-zone", { hasText: "Add" })));
  // a click on a part opens the menu for that tag, not for the group
  await p4.goto("http://localhost:5173/#/?q=" + encodeURIComponent(grouped));
  await p4.waitForTimeout(300);
  await part("ui")().click();
  console.log("click on part ui".padEnd(28), "-> menu:", JSON.stringify((await p4.locator('[role="menu"]').innerText()).split("\n")[0]));
  await browser4.close();
}

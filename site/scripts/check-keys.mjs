// Phone keyboard input, including separators delivered without a keydown.
import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const SITE = process.env.SITE ?? "http://localhost:5173";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const input = page.locator(".search-field input");
const cdp = await page.context().newCDPSession(page);
const type = (text) => cdp.send("Input.insertText", { text });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

async function open(query = "") {
  await page.goto("about:blank");
  await page.goto(SITE + "/#/?q=" + encodeURIComponent(query));
  await input.focus();
}

async function check(label, query, draft, focused = true) {
  const actual = await input.evaluate((el) => [
    new URLSearchParams(location.hash.split("?")[1]).get("q") ?? "", el.value, document.activeElement === el,
  ]);
  console.log(label, JSON.stringify(actual));
  if (JSON.stringify(actual) !== JSON.stringify([query, draft, focused])) errors.push(label);
}

try {
  await open();
  const hints = await input.evaluate((el) => ["autocapitalize", "autocorrect", "enterkeyhint"].map((attr) => el.getAttribute(attr)));
  console.log("keyboard hints", hints);
  if (hints.join() !== "none,off,search") errors.push("keyboard hints");
  await type("ui");
  await type(" ");
  await type("fle");
  await check("IME space", "ui", "fle");

  await open();
  await type("unknown");
  await type(" ");
  await type("phrase");
  await check("space inside phrase", "", "unknown phrase");
  await type(",");
  await check("IME comma", 'text:"unknown phrase"', "");

  await open();
  await type('"ui');
  await type(" ");
  await type(",");
  await check("open quote", "", '"ui ,');

  await open();
  await page.keyboard.type("ui ");
  await check("keyboard space", "ui", "");
  await page.keyboard.type("fle,");
  await check("keyboard comma", 'ui text:"fle"', "");

  for (const key of ["Enter", "Tab"]) {
    await open("model:claude");
    await type("mode");
    await page.keyboard.press(key);
    await check("used suggestion + " + key, "model:claude", "");
  }

  await open();
  await type("unfinished");
  await page.locator(".search-done").focus();
  await check("blur", 'text:"unfinished"', "", false);

  await open("ui");
  await page.locator(".search-clear").tap();
  await check("tap clear", "", "");
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}

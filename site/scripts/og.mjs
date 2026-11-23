// The link preview image (public/og.jpg, 1200×630) and the icons, drawn in a headless browser
// from the header's bow frame and the site's own fonts: node scripts/og.mjs (from site/)
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright-core";

const site = resolve(import.meta.dirname, "..");
const out = resolve(site, "public");
mkdirSync(out, { recursive: true });

const data = (path, type) => `data:${type};base64,${readFileSync(resolve(site, path)).toString("base64")}`;
const display = data("node_modules/@fontsource-variable/unbounded/files/unbounded-latin-wght-normal.woff2", "font/woff2");
const text = data("node_modules/@fontsource-variable/golos-text/files/golos-text-latin-wght-normal.woff2", "font/woff2");
const frame = data("../assets/header/poster-loop-1280.jpg", "image/jpeg");

const base = `
  @font-face { font-family: Display; src: url(${display}); font-weight: 100 900; }
  @font-face { font-family: Text; src: url(${text}); font-weight: 100 900; }
  * { box-sizing: border-box; margin: 0; }
  body { background: #0d0b10; color: #ece8f1; overflow: hidden; }
`;

const og = `<style>${base}
  .card { position: relative; width: 1200px; height: 630px; overflow: hidden; }
  .card img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 50% 20%; filter: saturate(0.9); }
  .card::after { content: ""; position: absolute; inset: 0;
    background: linear-gradient(180deg, rgba(13,11,16,0.35) 0%, transparent 30%, rgba(13,11,16,0.75) 72%, #0d0b10 100%); }
  .text { position: absolute; left: 64px; right: 64px; bottom: 64px; z-index: 1; text-shadow: 0 2px 18px rgba(0,0,0,0.7); }
  h1 { font-family: Display; font-weight: 800; font-size: 112px; line-height: 1; letter-spacing: -0.02em; }
  p { margin-top: 18px; font-family: Text; font-size: 34px; opacity: 0.9; }
  .ribbon-box { position: absolute; top: 0; right: 0; z-index: 2; width: 300px; height: 300px; overflow: hidden; }
  .ribbon { position: absolute; top: 62px; right: -92px; width: 400px; padding: 12px 0; transform: rotate(45deg);
    background: #e8262b; box-shadow: 0 0 26px rgba(232,38,43,0.55); color: #fff; text-align: center;
    font-family: Text; font-weight: 900; font-size: 26px; letter-spacing: 0.22em; }
</style>
<div class="card">
  <img src="${frame}" />
  <div class="text"><h1>T3 Thoughts</h1><p>An unofficial digest of Theo Browne's posts and videos</p></div>
  <div class="ribbon-box"><div class="ribbon">UNOFFICIAL</div></div>
</div>`;

const icon = (size) => `<style>${base}
  .icon { width: ${size}px; height: ${size}px; display: grid; place-items: center; border-radius: ${size * 0.22}px;
    background: #17141c; color: #ff4fa3; font-family: Display; font-weight: 800; font-size: ${size * 0.46}px; letter-spacing: -0.04em; }
</style><div class="icon">T3</div>`;

const browser = await chromium.launch();
const shoot = async (html, width, height, name, transparent = false) => {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  if (transparent) await page.addStyleTag({ content: "body { background: transparent; }" });
  const jpeg = name.endsWith(".jpg");
  await page.screenshot({ path: resolve(out, name), omitBackground: transparent, ...(jpeg ? { type: "jpeg", quality: 85 } : {}) });
  await page.close();
};
await shoot(og, 1200, 630, "og.jpg");
await shoot(icon(180), 180, 180, "apple-touch-icon.png");
await shoot(icon(64), 64, 64, "favicon.png", true);
await browser.close();
console.log("wrote public/og.jpg, apple-touch-icon.png, favicon.png");

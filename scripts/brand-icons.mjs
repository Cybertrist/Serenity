/**
 * Regenerates the PNG app icons from the two SVG cuts of the mark (web/public/*.svg), so the
 * brand lives in one place. Run through scripts/brand-icons.sh, which brings Chromium.
 */
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";

const DIR = "/public";
const JOBS = [
  ["icon.svg", 192, "icon-192.png"],
  ["icon.svg", 512, "icon-512.png"],
  ["icon.svg", 180, "apple-touch-icon.png"],
  ["maskable.svg", 512, "maskable-512.png"],
];

const browser = await chromium.launch();
for (const [svg, size, out] of JOBS) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  const art = readFileSync(`${DIR}/${svg}`, "utf8");
  await page.setContent(
    `<style>html,body{margin:0;padding:0}svg{display:block;width:${size}px;height:${size}px}</style>${art}`,
  );
  writeFileSync(`${DIR}/${out}`, await page.screenshot({ omitBackground: true }));
  await page.close();
  console.log(`${out} ← ${svg} (${size}px)`);
}
await browser.close();

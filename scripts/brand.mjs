/**
 * Regenerates everything drawn from the mark: the PNG app icons, cut from the two SVG files
 * (web/public/*.svg), and the social banner. The brand lives in one place, this script makes
 * the files. Run through scripts/brand.sh, which brings Chromium.
 */
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";

const DIR = "/repo/web/public";
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
  console.log(`${out} <- ${svg} (${size}px)`);
}

// The social banner: an HTML page that borrows the app's own tokens, shot at GitHub's size.
const banner = await browser.newPage({ viewport: { width: 1280, height: 640 } });
await banner.goto("file:///repo/scripts/banniere.html");
await banner.evaluate(() => document.fonts.ready);
writeFileSync("/repo/docs/img/social-preview.png", await banner.screenshot());
console.log("docs/img/social-preview.png <- scripts/banniere.html (1280x640)");
await banner.close();

await browser.close();

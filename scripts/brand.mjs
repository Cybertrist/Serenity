/**
 * Regenerates everything drawn from the mark: the PNG app icons, cut from the ribbon S
 * (docs/logo.png), and the social banner. The brand lives in one place, this script makes
 * the files. Run through scripts/brand.sh, which brings Chromium.
 */
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";

const LOGO = `data:image/png;base64,${readFileSync("/repo/docs/logo.png").toString("base64")}`;
/** Night blue of the logo's own background: the maskable icon bleeds into it. */
const NIGHT = "#00071a";
// [output, size, mode]: "round" clips the tile, "square" leaves it whole (iOS rounds it),
// "mask" shrinks the tile into the maskable safe zone, over the night blue.
const JOBS = [
  ["web/public/icon-192.png", 192, "round"],
  ["web/public/icon-512.png", 512, "round"],
  ["web/public/favicon.png", 64, "round"],
  ["web/public/apple-touch-icon.png", 180, "square"],
  ["web/public/maskable-512.png", 512, "mask"],
  ["web/public/logo.png", 256, "square"],
  ["desktop/build/icon.png", 512, "round"],
  ["desktop/src/logo.png", 128, "square"],
];

const browser = await chromium.launch();
for (const [out, size, mode] of JOBS) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  const scale = mode === "mask" ? 0.68 : 1;
  const tile = Math.round(size * scale);
  const radius = mode === "square" ? 0 : Math.round(tile * 0.225);
  await page.setContent(
    `<style>html,body{margin:0;background:${mode === "mask" ? NIGHT : "transparent"}}
      body{width:${size}px;height:${size}px;display:grid;place-items:center}
      img{width:${tile}px;height:${tile}px;border-radius:${radius}px;display:block}</style>
     <img src="${LOGO}">`,
  );
  await page.evaluate(() => document.images[0].decode());
  writeFileSync(`/repo/${out}`, await page.screenshot({ omitBackground: mode !== "mask" }));
  await page.close();
  console.log(`${out} <- docs/logo.png (${size}px, ${mode})`);
}

// The social banner: an HTML page that borrows the app's own tokens, shot at GitHub's size.
const banner = await browser.newPage({ viewport: { width: 1280, height: 640 } });
await banner.goto("file:///repo/scripts/banniere.html");
await banner.evaluate(() => document.fonts.ready);
writeFileSync("/repo/docs/img/social-preview.png", await banner.screenshot());
console.log("docs/img/social-preview.png <- scripts/banniere.html (1280x640)");
await banner.close();

await browser.close();

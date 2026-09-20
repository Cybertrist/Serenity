/**
 * The film: the agent changing a real password on a real site, recorded in one take.
 *
 * Nothing here is staged except the pace. The vault is a real vault, the breach is found by the
 * real watch, the rotation is decided by the agent's own scheduler, and the executor drives a
 * real browser against the demo site. The last scene proves it from outside: the old password
 * is refused, the new one opens the door.
 *
 * Run through scripts/film.sh, which brings the stack up and turns the recording into a GIF.
 */
import { chromium } from "playwright";
import { createHmac } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, symlinkSync } from "node:fs";

const BASE = process.env.FILM_BASE ?? "http://127.0.0.1:8080";
const SITE = process.env.FILM_SITE ?? "http://demo.serenity.test:8000";
const API = process.env.FILM_API ?? "http://api:8000";
const OUT = process.env.FILM_OUT ?? "/out";
const USER = "tristan";
const MASTER = "une phrase de passe de test";
const SITE_USER = "tristan@exemple.fr";
const WEAK = "password123";

const FONT = readFileSync("/repo/web/public/fonts/chakra-petch-500-latin.woff2").toString("base64");
const STENCIL = readFileSync("/repo/web/public/fonts/black-ops-one-latin.woff2").toString("base64");

function base32(s) {
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0,
    v = 0;
  const out = [];
  for (const c of s.replace(/\s/g, "").toUpperCase()) {
    v = (v << 5) | A.indexOf(c);
    bits += 5;
    if (bits >= 8) {
      out.push((v >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}
function totp(secret, t) {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(Math.floor(t / 30)));
  const mac = createHmac("sha1", base32(secret)).update(msg).digest();
  const o = mac[mac.length - 1] & 15;
  return String((mac.readUInt32BE(o) & 0x7fffffff) % 1e6).padStart(6, "0");
}
const tick = async () => (await (await fetch(API + "/__test/tick", { method: "POST" })).json()).now;

/**
 * Subtitles are never painted on the app: they are cues, and the band under the picture is
 * drawn afterwards. Nothing of the interface is ever hidden by a word.
 */
const cues = [];
function say(page, text, kicker = "") {
  cues.push({ at: Date.now() / 1000, text, kicker });
  return Promise.resolve();
}

const beat = (page, ms) => page.waitForTimeout(ms);

// --- Set the stage, off camera -------------------------------------------------------------
const browser = await chromium.launch({ args: ["--force-color-profile=srgb"] });
const wings = await browser.newContext({ viewport: { width: 1280, height: 720 }, locale: "fr-FR" });
const setup = await wings.newPage();
await setup.goto(BASE);
await setup.getByLabel("Identifiant").fill(USER);
await setup.getByLabel("Mot de passe maître", { exact: true }).fill(MASTER);
await setup.getByLabel("Confirme le mot de passe maître").fill(MASTER);
await setup.getByRole("button", { name: "Continuer" }).click();
await setup.getByLabel("Code à 6 chiffres").waitFor({ timeout: 20000 });
const secret = (await setup.locator("[data-totp-secret]").innerText()).replace(/\s/g, "");
await setup.getByLabel("Code à 6 chiffres").fill(totp(secret, await tick()));
await setup.getByRole("button", { name: "Vérifier" }).click();
await setup.getByText("Ton kit de récupération").waitFor();
await setup.getByText("Je l'ai noté dans un endroit sûr.").click();
await setup.getByRole("button", { name: "Ouvrir mon coffre" }).click();
await setup.getByText("Ton coffre est vide.").waitFor({ timeout: 20000 });

// One entry, pointing at the demo site, with the password the site really holds.
await setup.getByRole("button", { name: "Ajouter une entrée" }).first().click();
await setup.getByLabel("Nom").fill("Démo");
await setup.getByLabel("Identifiant sur le site").fill(SITE_USER);
await setup.getByLabel("Mot de passe", { exact: true }).fill(WEAK);
await setup.getByLabel("Adresse du site").fill(`${SITE}/connexion`);
await setup.getByRole("button", { name: "Enregistrer" }).click();
await setup.getByRole("dialog").waitFor({ state: "detached" });
await setup.getByRole("button", { name: /Démo/ }).click();
await setup.getByRole("button", { name: "Confier à l'agent" }).click();
await setup.getByRole("button", { name: "Confier", exact: true }).click();
await setup.getByRole("dialog").waitFor({ state: "detached" });
await setup.keyboard.press("Escape");
// The watch runs in the browser: it is what finds the password in a known breach.
await setup.getByLabel("Navigation principale").getByRole("button", { name: "Fuites" }).click();
await setup.getByText(/à surveiller|Tout va bien/).first().waitFor();
await setup.waitForTimeout(3000);
// The agent's own scheduler turns that breach into a rotation to approve.
await fetch(API + "/__test/schedule", { method: "POST" });
await wings.close();

// --- Roll camera ---------------------------------------------------------------------------
mkdirSync(OUT, { recursive: true });
const stage = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  // Twice the pixels: the film is shot at 2560 x 1440 and printed at 1280 x 720, which is what
  // makes the text sharp instead of merely present.
  deviceScaleFactor: 2,
  locale: "fr-FR",
  colorScheme: "dark",
  permissions: ["clipboard-read", "clipboard-write"],
});
const page = await stage.newPage();

/*
 * Frames, not a video file. Playwright records a low-bitrate VP8 that turns crisp text into
 * mush; the screencast hands over the real pixels, and ffmpeg builds the film from them with
 * each frame's own timestamp.
 */
mkdirSync(`${OUT}/frames`, { recursive: true });
const shots = [];
const cdp = await stage.newCDPSession(page);
cdp.on("Page.screencastFrame", async ({ data, sessionId, metadata }) => {
  const name = `f${String(shots.length).padStart(5, "0")}.png`;
  writeFileSync(`${OUT}/frames/${name}`, Buffer.from(data, "base64"));
  shots.push({ name, at: metadata.timestamp });
  try {
    await cdp.send("Page.screencastFrameAck", { sessionId });
  } catch {
    // The page navigated while a frame was in flight: the next one will come.
  }
});
const roll = () =>
  cdp.send("Page.startScreencast", {
    format: "png",
    maxWidth: 2560,
    maxHeight: 1440,
    everyNthFrame: 1,
  });
await roll();

await page.goto(BASE);
await page.getByLabel("Identifiant").waitFor({ timeout: 20000 });
// The rule for every cue below: the screen shows it first, the line comes after, and it
// describes what is on screen now. Never an announcement of what is about to happen.
await say(page, "Ton coffre est verrouillé.", "Serenity");
await beat(page, 1500);

await page.getByLabel("Identifiant").type(USER, { delay: 60 });
await page.getByLabel("Mot de passe maître").type(MASTER, { delay: 22 });
await say(page, "Ton mot de passe maître ne sort pas de l'appareil.", "Déverrouillage");
await beat(page, 1400);
await page.getByRole("button", { name: "Continuer" }).click();
await page.getByLabel("Code à 6 chiffres").fill(totp(secret, await tick()));
await beat(page, 500);
await page.getByRole("button", { name: "Déverrouiller" }).click();
await say(page, "");
await page.getByText("Protégé par toi").waitFor({ timeout: 20000 });
await beat(page, 700);
await say(page, "Le coffre est ouvert. Tout est déchiffré ici.", "Coffre");
await beat(page, 2000);

await page.getByLabel("Navigation principale").getByRole("button", { name: "Fuites" }).click();
await page.getByText(/mot de passe exposé/).first().waitFor({ timeout: 20000 });
await beat(page, 500);
await say(page, "La veille a trouvé ce mot de passe dans une fuite connue.", "Fuites");
await beat(page, 2600);

await page.getByLabel("Navigation principale").getByRole("button", { name: "Agent" }).click();
await page.getByRole("button", { name: "Approuver" }).first().waitFor({ timeout: 20000 });
await beat(page, 500);
await say(page, "L'agent propose de le changer. Il attend ton accord.", "Agent");
await beat(page, 2600);

await page.getByRole("button", { name: "Approuver" }).first().click();
await beat(page, 900);
await say(page, "Tu approuves.", "Agent");
await beat(page, 1400);

const run = fetch(API + "/__test/rotate", { method: "POST" }).then((r) => r.json());
await say(page, "L'agent ouvre le site dans un vrai navigateur et change le mot de passe.", "Rotation");
await beat(page, 4200);
const report = await run;
console.log("rotation:", JSON.stringify(report));
await say(page, "Il se reconnecte pour vérifier, puis valide le coffre.", "Rotation");
await beat(page, 2600);

await page.getByLabel("Navigation principale").getByRole("button", { name: "Coffre" }).click();
await beat(page, 500);
await page.getByRole("button", { name: /Démo/ }).click();
await page.getByRole("dialog").waitFor();
await page.getByRole("button", { name: "Afficher le mot de passe" }).click();
await beat(page, 700);
await say(page, "Le coffre a déjà le nouveau mot de passe.", "Coffre");
await beat(page, 2400);
// Read it off the screen, where the viewer reads it too.
await page.getByRole("button", { name: "Copier le mot de passe" }).click();
await beat(page, 800);
const shown = await page
  .locator('xpath=//span[text()="Mot de passe"]/following-sibling::span[1]')
  .first()
  .innerText();
const copied = await page.evaluate(() => navigator.clipboard.readText().catch(() => ""));
const fresh = shown.trim() || copied.trim();
console.log("password on screen:", JSON.stringify(shown), "clipboard:", copied.length, "chars");
if (!fresh || fresh === WEAK || fresh.startsWith("•")) {
  throw new Error(`the vault still shows the old password: ${JSON.stringify(fresh)}`);
}

// --- Last scene: ask the site itself --------------------------------------------------------
await page.goto(`${SITE}/connexion`);
await roll(); // a cross-origin navigation stops the screencast
await say(page, "Le vrai site, maintenant. On essaie l'ancien mot de passe.", "Preuve");
await page.locator("#username").type(SITE_USER, { delay: 40 });
await page.locator("#password").type(WEAK, { delay: 40 });
await beat(page, 600);
await page.locator("#login").click();
await page.getByText(/incorrects/).first().waitFor({ timeout: 10000 });
await beat(page, 400);
await say(page, "Refusé : il ne marche plus.", "Preuve");
await beat(page, 2000);

await page.locator("#username").fill(SITE_USER);
await page.locator("#password").type(fresh, { delay: 26 });
await beat(page, 400);
await page.locator("#login").click();
await page.getByText(/Connecté en tant que/).first().waitFor({ timeout: 10000 });
await beat(page, 400);
await say(page, "Celui de l'agent ouvre le compte. Le site et le coffre sont d'accord.", "Preuve");
await beat(page, 3000);
await say(page, "Pas d'humain dans la boucle. Un humain informé.", "Serenity");
await beat(page, 2400);
await say(page, "");
await beat(page, 300);

await cdp.send("Page.stopScreencast").catch(() => {});
await stage.close();

/*
 * A fixed cadence, built here rather than left to ffmpeg. The screencast only speaks when the
 * page changes, and the concat demuxer rounds every short gap up to its own frame duration,
 * which stretched the film by a sixth and slid the subtitles off what they describe. So each
 * of the 25 slots per second points at the frame that was on screen at that instant.
 */
const FPS = 25;
mkdirSync(`${OUT}/cfr`, { recursive: true });
let cut = 0;
let slots = 0;
if (shots.length) {
  const first = shots[0].at;
  const last = shots[shots.length - 1].at;
  for (let t = first; t <= last + 0.2; t += 1 / FPS) {
    while (cut + 1 < shots.length && shots[cut + 1].at <= t) cut += 1;
    symlinkSync(`../frames/${shots[cut].name}`, `${OUT}/cfr/c${String(slots).padStart(5, "0")}.png`);
    slots += 1;
  }
}
writeFileSync(`${OUT}/fps.txt`, String(FPS));
const span = shots.length ? shots[shots.length - 1].at - shots[0].at : 0;
console.log(`film: ${String(shots.length)} images, ${String(slots)} vues, ${span.toFixed(1)} s`);

/*
 * The subtitle band, drawn once per cue, out of the picture. Same typefaces as the app, taken
 * from the repository rather than from a page, so the band owes nothing to the site it follows.
 */
const BAND_W = 1280;
const BAND_H = 112;
const bands = await browser.newContext({
  viewport: { width: BAND_W, height: BAND_H },
  deviceScaleFactor: 2,
});
const card = await bands.newPage();
const start = shots.length ? shots[0].at : 0;
const timed = [];
for (let i = 0; i < cues.length; i += 1) {
  const cue = cues[i];
  const from = Math.max(0, cue.at - start);
  const to = i + 1 < cues.length ? Math.max(from, cues[i + 1].at - start) : span;
  if (!cue.text || to - from < 0.25) continue;
  const file = `band-${String(timed.length).padStart(3, "0")}.png`;
  await card.setContent(`<style>
    @font-face { font-family: "T"; src: url(data:font/woff2;base64,${FONT}) format("woff2"); font-weight: 500; }
    @font-face { font-family: "K"; src: url(data:font/woff2;base64,${STENCIL}) format("woff2"); }
    html, body { margin: 0; height: 100%; }
    body { background: #05070c; display: flex; flex-direction: column; align-items: center;
           justify-content: center; gap: 5px; font-family: "T", sans-serif;
           font-variant-ligatures: none; -webkit-font-smoothing: antialiased; }
    .k { font-family: "K", sans-serif; font-size: 12px; letter-spacing: 0.24em;
         text-transform: uppercase; color: #5b8def; }
    .t { font-size: 26px; color: #f2f4f8; }
    .f { position: fixed; left: 0; right: 0; bottom: 0; height: 4px;
         background: linear-gradient(90deg, #3b7dd8 0 33.34%, #f2f4f8 33.34% 66.67%, #e8434b 66.67% 100%); }
  </style>
  <div class="k">${cue.kicker}</div><div class="t">${cue.text}</div><div class="f"></div>`);
  await card.evaluate(() => document.fonts.ready);
  await card.screenshot({ path: `${OUT}/${file}` });
  timed.push({ file, from, to });
}
await bands.close();
await browser.close();

// The filter graph: print the picture, add the band under it, then each subtitle in its turn.
const parts = [
  `[0:v]scale=1280:720:flags=lanczos,pad=1280:${String(720 + BAND_H)}:0:0:color=#05070c[bg]`,
];
timed.forEach((cue, i) => {
  parts.push(`[${String(i + 1)}:v]scale=${String(BAND_W)}:${String(BAND_H)}[b${String(i)}]`);
  const from = i === 0 ? "[bg]" : `[v${String(i - 1)}]`;
  const to = i === timed.length - 1 ? "[out]" : `[v${String(i)}]`;
  parts.push(
    `${from}[b${String(i)}]overlay=0:720:enable='between(t,${cue.from.toFixed(2)},${cue.to.toFixed(2)})'${to}`,
  );
});
if (!timed.length) parts.push("[bg]null[out]");
writeFileSync(`${OUT}/filter.txt`, parts.join(";\n"));
// Relative names: ffmpeg runs with the working directory set to this folder.
writeFileSync(`${OUT}/bands.txt`, timed.map((c) => `-i ${c.file}`).join(" "));
console.log(`film: ${String(timed.length)} sous-titres, hors champ`);

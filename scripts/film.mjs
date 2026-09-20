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
import { readFileSync, renameSync, mkdirSync } from "node:fs";

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

/** The subtitle bar, injected into whatever page is on screen. No voice, just a line. */
async function say(page, text, kicker = "") {
  await page.evaluate(
    ({ text, kicker, font, stencil }) => {
      let bar = document.getElementById("film-sub");
      if (!bar) {
        const style = document.createElement("style");
        style.textContent = `
          @font-face { font-family: "FilmText"; src: url(data:font/woff2;base64,${font}) format("woff2"); font-weight: 500; }
          @font-face { font-family: "FilmTitle"; src: url(data:font/woff2;base64,${stencil}) format("woff2"); }
          #film-sub {
            position: fixed; left: 0; right: 0; bottom: 16px; z-index: 2147483647;
            padding: 0 24px; pointer-events: none;
            font-family: "FilmText", system-ui, sans-serif; font-variant-ligatures: none;
            display: flex; justify-content: center;
            opacity: 0; transition: opacity 260ms ease;
          }
          #film-sub .box {
            display: flex; flex-direction: column; align-items: center; gap: 3px;
            padding: 9px 20px 11px; border-radius: 16px;
            background: rgb(5 8 14 / 0.94); border: 1px solid rgb(255 255 255 / 0.16);
            box-shadow: 0 14px 40px -12px rgb(0 0 0 / 0.8);
          }
          #film-sub .k {
            font-family: "FilmTitle", sans-serif; font-size: 11px; letter-spacing: 0.22em;
            text-transform: uppercase; color: #5b8def;
          }
          #film-sub .t { font-size: 21px; color: #f2f4f8; text-align: center; }
          #film-flag { position: fixed; left: 0; right: 0; bottom: 0; height: 4px; z-index: 2147483647;
            background: linear-gradient(90deg, #3b7dd8 0 33.34%, #f2f4f8 33.34% 66.67%, #e8434b 66.67% 100%); }
        `;
        document.head.appendChild(style);
        bar = document.createElement("div");
        bar.id = "film-sub";
        bar.innerHTML = '<div class="box"><span class="k"></span><span class="t"></span></div>';
        document.body.appendChild(bar);
        const flag = document.createElement("div");
        flag.id = "film-flag";
        document.body.appendChild(flag);
      }
      bar.querySelector(".k").textContent = kicker;
      bar.querySelector(".t").textContent = text;
      bar.style.opacity = text ? "1" : "0";
    },
    { text, kicker, font: FONT, stencil: STENCIL },
  );
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
  locale: "fr-FR",
  colorScheme: "dark",
  permissions: ["clipboard-read", "clipboard-write"],
  // The subtitles are injected into the page; the app's own CSP forbids an inline stylesheet,
  // which is exactly what it should do. Only this recording browser looks the other way.
  bypassCSP: true,
  recordVideo: { dir: OUT, size: { width: 1280, height: 720 } },
});
const page = await stage.newPage();

await page.goto(BASE);
await page.getByLabel("Identifiant").waitFor({ timeout: 20000 });
await say(page, "Un coffre chiffré, chez toi.", "Serenity");
await beat(page, 1200);

await page.getByLabel("Identifiant").type(USER, { delay: 60 });
await page.getByLabel("Mot de passe maître").type(MASTER, { delay: 22 });
await say(page, "Le mot de passe maître ne quitte jamais l'appareil.", "Déverrouillage");
await beat(page, 700);
await page.getByRole("button", { name: "Continuer" }).click();
await page.getByLabel("Code à 6 chiffres").fill(totp(secret, await tick()));
await beat(page, 400);
await page.getByRole("button", { name: "Déverrouiller" }).click();
await say(page, "");
await page.getByText("Protégé par toi").waitFor({ timeout: 20000 });
await beat(page, 900);

await say(page, "Un compte confié à l'agent, et son mot de passe a fuité.", "Veille");
await page.getByLabel("Navigation principale").getByRole("button", { name: "Fuites" }).click();
await beat(page, 2300);

await say(page, "L'agent propose de le changer. Tu décides.", "Agent");
await page.getByLabel("Navigation principale").getByRole("button", { name: "Agent" }).click();
await beat(page, 1800);
await page.getByRole("button", { name: "Approuver" }).first().click();
await beat(page, 1000);

await say(page, "Nouveau mot de passe enregistré avant de toucher au site.", "Rotation");
const run = fetch(API + "/__test/rotate", { method: "POST" }).then((r) => r.json());
await beat(page, 3500);
const report = await run;
console.log("rotation:", JSON.stringify(report));
await say(page, "Le site a changé, le coffre a validé.", "Rotation");
await beat(page, 1800);

await say(page, "Le coffre tient le nouveau mot de passe.", "Coffre");
await page.getByLabel("Navigation principale").getByRole("button", { name: "Coffre" }).click();
await beat(page, 600);
await page.getByRole("button", { name: /Démo/ }).click();
await page.getByRole("dialog").waitFor();
await page.getByRole("button", { name: "Afficher le mot de passe" }).click();
await beat(page, 1800);
// Read it off the screen, where the viewer reads it too.
await page.getByRole("button", { name: "Copier le mot de passe" }).click();
await beat(page, 700);
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
await say(page, "");

// --- Last scene: ask the site itself --------------------------------------------------------
await page.goto(`${SITE}/connexion`);
await say(page, "L'ancien mot de passe, sur le vrai site.", "Preuve");
await page.locator("#username").type(SITE_USER, { delay: 40 });
await page.locator("#password").type(WEAK, { delay: 40 });
await beat(page, 400);
await page.locator("#login").click();
await beat(page, 1500);
await say(page, "Refusé. Celui que l'agent a posé :", "Preuve");
await page.locator("#username").fill(SITE_USER);
await page.locator("#password").type(fresh, { delay: 26 });
await beat(page, 400);
await page.locator("#login").click();
await beat(page, 1800);
await say(page, "Pas d'humain dans la boucle. Un humain informé.", "Serenity");
await beat(page, 2200);
await say(page, "");
await beat(page, 300);

await stage.close();
await browser.close();

// Playwright names the file after the page: give the film its own name.
const { readdirSync } = await import("node:fs");
const webm = readdirSync(OUT).find((f) => f.endsWith(".webm"));
if (webm) renameSync(`${OUT}/${webm}`, `${OUT}/film.webm`);
console.log("film:", `${OUT}/film.webm`);

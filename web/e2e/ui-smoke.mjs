/**
 * UI smoke test (make ui-smoke, CI): the production web image (nginx + strict CSP) against a
 * throwaway test API. Walks every screen on a phone-sized viewport, saves screenshots, and
 * fails on any page error, console error or CSP violation.
 */
import { chromium } from "playwright";
import { createHmac } from "node:crypto";
import { mkdirSync } from "node:fs";

const BASE = process.env.UI_BASE ?? "http://127.0.0.1:8080";
const API = process.env.UI_API ?? "http://api:8000";
const shots = process.env.UI_SHOTS ?? "/work/shots";
mkdirSync(shots, { recursive: true });
const problems = [];
// Expected: the app checks for an existing session at start-up (401 without one).
const EXPECTED = [/status of 401/, /ERR_INTERNET_DISCONNECTED/, /Failed to fetch/];

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
async function tick() {
  return (await (await fetch(API + "/__test/tick", { method: "POST" })).json()).now;
}

await fetch(API + "/__test/reset", { method: "POST" });
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  locale: "fr-FR",
});
const page = await context.newPage();
page.on("console", (m) => {
  const text = m.text();
  if (
    (m.type() === "error" || /Refused|Content Security/.test(text)) &&
    !EXPECTED.some((r) => r.test(text))
  ) {
    problems.push(`console: ${text}`);
  }
});
page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
const shot = async (name) => {
  await page.waitForTimeout(450);
  await page.screenshot({ path: `${shots}/${name}.png` });
};

await page.goto(BASE);
await page.getByLabel("Identifiant").waitFor();
await shot("01-bienvenue");
await page.getByLabel("Identifiant").fill("tristan");
await page.getByLabel("Mot de passe maître", { exact: true }).fill("une phrase de passe de test");
await page.getByLabel("Confirme le mot de passe maître").fill("une phrase de passe de test");
await page.getByRole("button", { name: "Continuer" }).click();
await page.getByLabel("Code à 6 chiffres").waitFor({ timeout: 20000 });
await shot("02-totp");
const secret = (await page.locator("p.font-mono").first().innerText()).replace(/\s/g, "");
await page.getByLabel("Code à 6 chiffres").fill(totp(secret, await tick()));
await page.getByRole("button", { name: "Vérifier" }).click();
await page.getByText("Ton kit de récupération").waitFor();
await shot("03-kit");
await page.getByText("Je l'ai noté dans un endroit sûr.").click();
await page.getByRole("button", { name: "Ouvrir mon coffre" }).click();
await page.getByText("Ton coffre est vide.").waitFor({ timeout: 20000 });
await shot("04-coffre-vide");

const add = async (name, user, pwd, url) => {
  await page.getByRole("button", { name: "Ajouter une entrée" }).first().click();
  await page.getByLabel("Nom").fill(name);
  await page.getByLabel("Identifiant sur le site").fill(user);
  await page.getByLabel("Mot de passe", { exact: true }).fill(pwd);
  await page.getByLabel("Adresse du site").fill(url);
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.getByRole("dialog").waitFor({ state: "detached" });
};
await add("Banque", "tristan.j", "k9#Lm2$pQ7!xZ4&wY8", "https://www.banque.fr");
await add("Netflix", "tristan@exemple.fr", "password123", "https://www.netflix.com");
await add("Spotify", "tristanj", "x7Kq-m2Pz-9Lw4-rT8v", "https://open.spotify.com");
await shot("05-coffre");
await page.getByRole("button", { name: /Netflix/ }).click();
await page.getByRole("dialog").waitFor();
await shot("06-fiche");
await page.getByRole("button", { name: "Confier à l'agent" }).click();
await shot("07-confier");
await page.getByRole("button", { name: "Confier", exact: true }).click();
await page.getByRole("dialog").waitFor({ state: "detached" });
await shot("08-coffre-delegue");
await page.getByLabel("Navigation principale").getByRole("button", { name: "Fuites" }).click();
await page
  .getByText(/à surveiller|Tout va bien/)
  .first()
  .waitFor();
await page.waitForTimeout(2500);
await shot("09-fuites");
await page.getByLabel("Navigation principale").getByRole("button", { name: "Journal" }).click();
await page.waitForTimeout(800);
await shot("10-journal");
await page.getByLabel("Navigation principale").getByRole("button", { name: "Agent" }).click();
await page.waitForTimeout(800);
await shot("11-agent");
await page.getByRole("button", { name: "Réglages" }).first().click();
await page.getByRole("dialog").waitFor();
await shot("12-reglages");
await page.keyboard.press("Escape");
await page.getByRole("button", { name: "Réglages" }).first().click();
await page.getByRole("button", { name: "Verrouiller maintenant" }).click();
await page.getByText(/Bon retour/).waitFor();
await shot("13-deverrouillage");
await page.getByLabel("Mot de passe maître").fill("une phrase de passe de test");
await page.getByRole("button", { name: "Déverrouiller" }).click();
await page.getByText("Protégé par toi").waitFor({ timeout: 20000 });
await shot("14-deverrouille");

// Offline: the service worker serves the app, the encrypted cache is unlocked locally, read-only.
await page.getByRole("button", { name: "Réglages" }).first().click();
await page.getByRole("button", { name: "Verrouiller maintenant" }).click();
await page.getByText(/Bon retour/).waitFor();
await context.setOffline(true);
await page.reload();
await page.getByText(/Bon retour/).waitFor({ timeout: 20000 });
await page.getByLabel("Mot de passe maître").fill("une phrase de passe de test");
await page.getByRole("button", { name: "Déverrouiller" }).click();
await page.getByText("Hors ligne : lecture seule.").waitFor({ timeout: 20000 });
await page.getByText("Netflix").first().waitFor();
await shot("15-hors-ligne");
await context.setOffline(false);
await browser.close();
if (problems.length) {
  console.error("UI smoke: problems found\n" + problems.join("\n"));
  process.exit(1);
}
console.log(`UI smoke: OK, screenshots in ${shots}`);

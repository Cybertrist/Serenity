/**
 * UI smoke test (make ui-smoke, CI): the production web image (nginx + strict CSP) against a
 * throwaway test API. Walks every screen on a phone, then on a desktop viewport, then a
 * light-theme pass,
 * saves screenshots, and fails on any page error, console error or CSP violation.
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
// The first two passes pin the dark theme: the app follows the system, and Playwright's
// default system is light. The third pass is the one that asks for light.
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  locale: "fr-FR",
  colorScheme: "dark",
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
  // Long enough for the lock-opening sequence to have cleared.
  await page.waitForTimeout(4000);
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
const secret = (await page.locator("[data-totp-secret]").innerText()).replace(/\s/g, "");
await page.getByLabel("Code à 6 chiffres").fill(totp(secret, await tick()));
await page.getByRole("button", { name: "Vérifier" }).click();
await page.getByText("Ton kit de récupération").waitFor();
await shot("03-kit");
await page.getByText("Je l'ai noté dans un endroit sûr.").click();
await page.getByRole("button", { name: "Ouvrir mon coffre" }).click();
await page.getByText("Ton coffre est vide.").waitFor({ timeout: 20000 });
await shot("04-coffre-vide");

const add = async (name, user, pwd, url, totp) => {
  await page.getByRole("button", { name: "Ajouter une entrée" }).first().click();
  await page.getByLabel("Nom").fill(name);
  await page.getByLabel("Identifiant sur le site").fill(user);
  await page.getByLabel("Mot de passe", { exact: true }).fill(pwd);
  await page.getByLabel("Adresse du site").fill(url);
  // A throwaway RFC 6238 test secret: it gives the Codes screen a real code to draw.
  if (totp) await page.getByLabel("Clé TOTP (facultatif)").fill(totp);
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.getByRole("dialog").waitFor({ state: "detached" });
};
await add("Banque", "tristan.j", "k9#Lm2$pQ7!xZ4&wY8", "https://www.banque.fr");
await add(
  "Netflix",
  "tristan@exemple.fr",
  "password123",
  "https://www.netflix.com",
  "JBSWY3DPEHPK3PXP",
);
await add("Spotify", "tristanj", "x7Kq-m2Pz-9Lw4-rT8v", "https://open.spotify.com");
// Two marks simple-icons does not carry, kept by hand in web/assets/logos (ADR-021). They
// stay in the personal zone: nothing is fetched for them, the pack answers on its own.
await add("La Poste", "tristan.j", "R4m!7pQw2#Lz9", "https://www.laposte.fr");
await add("Cinéville", "tristanj", "T8v-w3Nq-5Kp2", "https://www.cineville.fr");
await shot("05-coffre");
await page.getByRole("button", { name: /Netflix/ }).click();
await page.getByRole("dialog").waitFor();
await shot("06-fiche");
await page.getByRole("button", { name: "Confier à l'agent" }).click();
await shot("07-confier");
await page.getByRole("button", { name: "Confier", exact: true }).click();
await page.getByRole("dialog").waitFor({ state: "detached" });
await shot("08-coffre-delegue");
// An entry the logo pack does not know, confided to the agent: the agent fetches its real
// favicon, encrypts it with AK, and the browser decrypts it to draw the row (ADR-020).
await add("Ma banque", "tristan", "9Yb!q4Wm2#zL7v", "https://ma-banque.test");
await page.getByRole("button", { name: /Ma banque/ }).click();
await page.getByRole("dialog").waitFor();
await page.getByRole("button", { name: "Confier à l'agent" }).click();
await page.getByRole("button", { name: "Confier", exact: true }).click();
await page.getByRole("dialog").waitFor({ state: "detached" });
const icons = await (await fetch(API + "/__test/icons", { method: "POST" })).json();
// Two entries live in the agent zone by now: Netflix and this one. Netflix keeps its pack
// logo on screen, since the pack comes first, but the agent fetched an icon for both.
if (icons.fetched !== 2) problems.push(`icon pass fetched ${icons.fetched}, expected 2`);
// Reload: the keys live in memory only, so this also proves the icon is decrypted afresh.
await page.reload();
await page.getByText(/Ton coffre est verrouillé/).waitFor({ timeout: 20000 });
await page.getByLabel("Mot de passe maître").fill("une phrase de passe de test");
await page.getByRole("button", { name: "Déverrouiller" }).click();
await page.getByText("Confié à l'agent").waitFor({ timeout: 20000 });
await page.waitForTimeout(500);
await shot("08c-icone-agent");

await page.getByLabel("Navigation principale").getByRole("button", { name: "Codes" }).click();
// The row is named after its entry; the code itself changes every 30 s.
await page
  .getByRole("button", { name: /Netflix/ })
  .first()
  .waitFor();
await shot("08b-codes");
await page.getByLabel("Navigation principale").getByRole("button", { name: "Fuites" }).click();
await page
  .getByText(/à surveiller|Tout va bien/)
  .first()
  .waitFor();
await page.waitForTimeout(2500);
await shot("09-fuites");
await page.getByLabel("Navigation principale").getByRole("button", { name: "Agent" }).click();
await page.waitForTimeout(800);
await shot("11-agent");
// The journal is not a tab any more: it is a section of the settings.
await page.getByRole("button", { name: "Voir le journal" }).click();
await page.getByRole("dialog").waitFor();
await shot("10-journal");
await page.keyboard.press("Escape");
// The dialog lives inside the square now: let it finish leaving before the next one opens.
await page.getByRole("dialog").waitFor({ state: "detached" });
await page.getByRole("button", { name: "Réglages" }).first().click();
await page.getByRole("dialog").waitFor();
await shot("12-reglages");
await page.getByRole("button", { name: "Verrouillage" }).click();
await page.getByRole("button", { name: "Verrouiller maintenant" }).click();
await page.getByText(/Ton coffre est verrouillé/).waitFor();
await shot("13-deverrouillage");
await page.getByLabel("Mot de passe maître").fill("une phrase de passe de test");
await page.getByRole("button", { name: "Déverrouiller" }).click();
await page.getByText("Protégé par toi").waitFor({ timeout: 20000 });
await shot("14-deverrouille");

// Offline: the service worker serves the app, the encrypted cache is unlocked locally, read-only.
await page.getByRole("button", { name: "Réglages" }).first().click();
await page.getByRole("dialog").waitFor();
await page.getByRole("button", { name: "Verrouiller maintenant" }).click();
await page.getByText(/Ton coffre est verrouillé/).waitFor();
await context.setOffline(true);
await page.reload();
await page.getByText(/Ton coffre est verrouillé/).waitFor({ timeout: 20000 });
await page.getByLabel("Mot de passe maître").fill("une phrase de passe de test");
await page.getByRole("button", { name: "Déverrouiller" }).click();
await page.getByText(/Hors ligne : tu peux lire ton coffre/).waitFor({ timeout: 20000 });
await page.getByText("Netflix").first().waitFor();
await shot("15-hors-ligne");
await context.setOffline(false);
await context.close();

// Desktop: a second browser context logs in from scratch, sidebar layout, centred dialogs.
const wide = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  locale: "fr-FR",
  colorScheme: "dark",
});
const big = await wide.newPage();
big.on("console", (m) => {
  const text = m.text();
  if (
    (m.type() === "error" || /Refused|Content Security/.test(text)) &&
    !EXPECTED.some((r) => r.test(text))
  ) {
    problems.push(`console (bureau): ${text}`);
  }
});
big.on("pageerror", (e) => problems.push(`pageerror (bureau): ${e.message}`));
const wideShot = async (name) => {
  await big.waitForTimeout(4000);
  await big.screenshot({ path: `${shots}/${name}.png` });
};

/** On failure, say what the page was showing: a bare timeout is useless in CI. */
async function report(page, step, run) {
  try {
    await run();
  } catch (error) {
    const text = await page.locator("body").innerText();
    console.error(`UI smoke: step "${step}" failed.\nPage said:\n${text}\n`);
    if (problems.length) console.error("Console problems:\n" + problems.join("\n"));
    throw error;
  }
}

await big.goto(BASE);
await big.getByRole("button", { name: "Continuer" }).waitFor({ timeout: 20000 });
await big.getByLabel("Identifiant").fill("tristan");
await big.getByLabel("Mot de passe maître").fill("une phrase de passe de test");
await wideShot("16-bureau-cadenas");
await big.getByRole("button", { name: "Continuer" }).click();
await wideShot("17-bureau-code");
await big.getByLabel("Code à 6 chiffres").fill(totp(secret, await tick()));
await report(big, "connexion sur le cadenas", async () => {
  await big.getByRole("button", { name: "Déverrouiller" }).click();
  await big.getByText("Protégé par toi").waitFor({ timeout: 20000 });
});
await wideShot("18-bureau-coffre");
await big.getByRole("button", { name: /Banque/ }).click();
await big.getByRole("dialog").waitFor();
await wideShot("19-bureau-fiche");
await big.keyboard.press("Escape");
await big.getByRole("dialog").waitFor({ state: "detached" });
await big.getByLabel("Navigation principale").getByRole("button", { name: "Agent" }).click();
await big.waitForTimeout(500);
await wideShot("20-bureau-agent");
await big.getByRole("button", { name: "Notifications" }).click();
await big.getByRole("dialog").waitFor();
await wideShot("21-bureau-notifications");
await big.keyboard.press("Escape");
await big.getByRole("dialog").waitFor({ state: "detached" });
await big.getByRole("button", { name: "Réglages" }).click();
await big.getByRole("dialog").waitFor();
await big.getByRole("button", { name: "Corbeille" }).click();
await wideShot("22-bureau-reglages");
await big.getByRole("button", { name: "Import et export" }).click();
await big.getByText("Importer mes mots de passe").waitFor();
await wideShot("22b-bureau-import");
// The AGPL asks a web app to offer its source: the link has to be there, and to work offline.
await big.getByRole("button", { name: "À propos" }).click();
await big.getByRole("link", { name: "Code source" }).waitFor();
await wideShot("23-bureau-a-propos");
await big.keyboard.press("Escape");
// Light theme: a third context whose system is set to light, so the app resolves to it.
const day = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  locale: "fr-FR",
  colorScheme: "light",
});
const sun = await day.newPage();
sun.on("console", (m) => {
  const text = m.text();
  if (
    (m.type() === "error" || /Refused|Content Security/.test(text)) &&
    !EXPECTED.some((r) => r.test(text))
  ) {
    problems.push(`console (clair): ${text}`);
  }
});
sun.on("pageerror", (e) => problems.push(`pageerror (clair): ${e.message}`));
const dayShot = async (name) => {
  await sun.waitForTimeout(4000);
  await sun.screenshot({ path: `${shots}/${name}.png` });
};

await sun.goto(BASE);
await sun.getByRole("button", { name: "Continuer" }).waitFor({ timeout: 20000 });
await sun.getByLabel("Identifiant").fill("tristan");
await sun.getByLabel("Mot de passe maître").fill("une phrase de passe de test");
await dayShot("24-clair-cadenas");
await sun.getByRole("button", { name: "Continuer" }).click();
await sun.getByLabel("Code à 6 chiffres").fill(totp(secret, await tick()));
await report(sun, "connexion en thème clair", async () => {
  await sun.getByRole("button", { name: "Déverrouiller" }).click();
  // Caught mid-fall: the rain has to read as ink on paper, not as a white-out.
  await sun.waitForTimeout(700);
  await sun.screenshot({ path: `${shots}/25-clair-pluie.png` });
  await sun.getByText("Protégé par toi").waitFor({ timeout: 20000 });
});
await dayShot("26-clair-coffre");
await sun.getByRole("button", { name: /Banque/ }).click();
await sun.getByRole("dialog").waitFor();
await dayShot("27-clair-fiche");
await sun.keyboard.press("Escape");
await sun.getByRole("dialog").waitFor({ state: "detached" });
await sun.getByRole("button", { name: "Réglages" }).click();
await sun.getByRole("dialog").waitFor();
await sun.getByRole("button", { name: "Apparence" }).click();
await dayShot("28-clair-apparence");
// The padlock cinema is the piece the light theme could ruin: lock, and look at it.
await sun.getByRole("button", { name: "Verrouillage" }).click();
await sun.getByRole("button", { name: "Verrouiller maintenant" }).click();
await report(sun, "verrouillage en thème clair", async () => {
  await sun.getByRole("button", { name: "Déverrouiller" }).waitFor({ timeout: 20000 });
});
await dayShot("29-clair-verrouille");

await browser.close();
if (problems.length) {
  console.error("UI smoke: problems found\n" + problems.join("\n"));
  process.exit(1);
}
console.log(`UI smoke: OK, screenshots in ${shots}`);

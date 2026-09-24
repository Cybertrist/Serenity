#!/bin/bash
# Every figure in the README: the banner, the six section banners, the two
# grids, the agent sequence and the diagram of the two vault zones.
#
# The screenshots under docs/img/ are real captures of the app, no script
# redraws them.
#
# Each string carries both languages, t <french> <english>. The English is
# not a calque: a turn of phrase that lands in French falls flat translated
# word for word, so it is rewritten.
D="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$D/cartes.sh"   >/dev/null 2>&1
source "$D/bandeaux.sh" >/dev/null 2>&1
source "$D/grille.sh"   >/dev/null 2>&1
source "$D/sequence.sh" >/dev/null 2>&1
mkdir -p "$D/sere$SUF"

AC="#4D8DFF"

# ------------------------------------------------------------ the banner
# Same card template as the other projects. The neon frame of the logo
# fills only 87 % of the file, and its stroke shrunk to the plate size
# would come out jagged: the logo is framed past its edge, at 176 px, and
# the outline is redrawn in CSS.
ban serenity "#4D8EF7" "#E8434B" "#050A18" \
"<div class='crop' style='border:1.5px solid #4D8EF7C0;box-shadow:0 0 7px #4D8EF730, 0 12px 34px rgba(0,0,0,.5)'><img src='file:///$B/../logo.png' style='width:176px;height:176px'></div>" \
'Seren<em>ity</em>' \
"$(t 'Ton coffre de mots de passe, chez toi. Un agent surveille' 'Your password vault, hosted at home. An agent watches')" \
"$(t 'les fuites, et change ceux que tu lui confies.' 'for breaches, and rotates the ones you trust it with.')" \
"$(P "$(t 'ZÉRO CONNAISSANCE' 'ZERO KNOWLEDGE')" 'LIBSODIUM' "$(t 'AUTO-HÉBERGÉ' 'SELF-HOSTED')" 'AGPL V3')" \
"$(C 'WEB' 'MOBILE' "$(t 'SÉCURITÉ' 'SECURITY')")" ""

# --------------------------------------------------- the section banners
rep serenity "$AC" \
"$(t 'Le coffre' 'The vault')" \
"$(t "L'agent" 'The agent')" \
"$(t 'Ce que fait la V1' 'What V1 does')" \
"$(t 'En chiffres' 'In numbers')" \
"$(t 'Installation' 'Installation')" \
"$(t 'Sécurité et licence' 'Security and licence')"

# --------------------------------------------------- the agent sequence
seqfig sere-agent "$AC" \
"$(t 'Une fuite sort' 'A breach lands')|$(t "Pwned Passwords signale le mot de passe, en k-anonymat : il ne quitte jamais l'appareil." 'Pwned Passwords flags the password, under k-anonymity: it never leaves the device.')" \
"$(t "L'agent propose" 'The agent proposes')|$(t 'Il prépare la rotation, sans rien déclencher. Le kill switch est vérifié avant chaque action.' 'It prepares the rotation without triggering anything. The kill switch is checked before every action.')" \
"$(t 'Tu approuves' 'You approve')|$(t "Rien ne bouge sans ce geste. Pas d'humain dans la boucle, mais un humain informé." 'Nothing moves without that gesture. Not a human in the loop, but a human who knows.')" \
"$(t 'Le site change' 'The site changes')|$(t 'Nouvelle révision en attente, ancienne conservée, reconnexion pour preuve, retour arrière si elle échoue.' 'New revision pending, the old one kept, a re-login as proof, a rollback if it fails.')"

# ----------------------------------------------------- what V1 delivers
grid sere-v1 "$AC" 2 \
"$(t 'Coffre chiffré dans le navigateur' 'Vault encrypted in the browser')|$(t 'Argon2id pour la dérivation, XChaCha20-Poly1305 pour les entrées, et un kit de récupération montré une seule fois.' 'Argon2id for derivation, XChaCha20-Poly1305 for the entries, and a recovery kit shown exactly once.')" \
"$(t 'Application installable' 'Installable app')|$(t "Une PWA en thème clair ou sombre, pensée d'abord pour le mobile." 'A PWA in light or dark theme, designed for mobile first.')" \
"$(t "Import depuis l'existant" 'Import from what you have')|$(t "Mots de passe Google en CSV, codes d'Authenticator ou export Bitwarden, chiffrés sur place dans le navigateur." 'Google passwords as CSV, Authenticator codes or a Bitwarden export, encrypted on the spot in the browser.')" \
"$(t 'Veille des fuites' 'Breach watch')|$(t 'Pwned Passwords en k-anonymat, plus la détection des mots de passe réutilisés, faibles ou anciens.' 'Pwned Passwords under k-anonymity, plus detection of reused, weak or ageing passwords.')" \
"$(t 'Codes à deux facteurs' 'Two-factor codes')|$(t 'Tous les codes sur un écran, calculés dans le navigateur, hors ligne compris.' 'Every code on one screen, computed in the browser, offline included.')" \
"$(t 'Rotation réelle' 'Real rotation')|$(t 'Un conteneur isolé avec navigateur, une recette par site, et une transaction qui sert le coffre avant le site.' 'An isolated container with a browser, one recipe per site, and a transaction that serves the vault before the site.')" \
"$(t 'Notifications maison' 'Home-made notifications')|$(t "Un centre de notifications en temps réel dans l'application, sans passer par un service tiers." 'A realtime notification centre inside the app, with no third-party service in between.')" \
"$(t 'Sauvegarde vérifiée' 'Verified backup')|$(t "restic chaque nuit sur la base et les clés, avec un exercice de restauration rejoué en intégration continue." 'restic nightly over the database and the keys, with a restore drill replayed in CI.')"

# ---------------------------------------------------------- in numbers
grid sere-chiffres "$AC" 2 \
"Tests|$(t '163 côté Python, 43 côté TypeScript, et 14 parcours bout en bout joués contre le vrai serveur.' '163 on the Python side, 43 on the TypeScript side, and 14 end-to-end journeys played against the real server.')" \
"$(t 'Intégration continue' 'Continuous integration')|$(t '8 jobs par pull request, dont un navigateur qui parcourt tous les écrans et un coffre jetable réellement détruit puis restauré.' '8 jobs per pull request, including a browser walking every screen and a throwaway vault genuinely destroyed then restored.')" \
"Code|$(t 'Environ 9 900 lignes de Python et 9 600 de TypeScript.' 'About 9,900 lines of Python and 9,600 of TypeScript.')" \
"$(t 'Cryptographie' 'Cryptography')|$(t 'Une seule bibliothèque, libsodium, et des vecteurs de test que Python et TypeScript doivent tous deux valider.' 'A single library, libsodium, and test vectors that both Python and TypeScript have to satisfy.')" \
"Documentation|$(t "11 pages de phase, 17 décisions d'architecture, une spécification cryptographique de 600 lignes, un changelog." '11 phase pages, 17 architecture decisions, a 600-line cryptographic specification, a changelog.')" \
"$(t 'État' 'Status')|$(t 'Version 0.1.0 en approche. Aucun audit externe à ce jour.' 'Version 0.1.0 approaching. No external audit to date.')"

# ------------------------------------------------- the two vault zones
Z1="$(t 'Zone personnelle' 'Personal zone')";  S1="$(t 'ZÉRO CONNAISSANCE' 'ZERO KNOWLEDGE')"
Z2="$(t 'Zone agent' 'Agent zone')";           S2="$(t 'DÉLÉGATION EXPLICITE' 'EXPLICIT DELEGATION')"
KC="$(t 'CONTENU' 'CONTENTS')"; KQ="$(t 'QUI LIT' 'WHO READS')"; KA="$(t "L'AGENT" 'THE AGENT')"
A1="$(t 'Les comptes critiques : banque, messagerie principale, tout ce qui ne se délègue pas.' 'The critical accounts: bank, main mailbox, everything that cannot be delegated.')"
A2="$(t 'Toi seul, depuis un client déverrouillé par le mot de passe maître.' 'You alone, from a client unlocked by the master password.')"
A3="$(t 'Ne lit rien. Il prévient, c&#39;est tout.' 'Reads nothing. It warns you, that is all.')"
AF="$(t 'Le serveur ne stocke que des blocs chiffrés. Sans mot de passe maître ni kit de récupération, cette zone est perdue : <b>c&#39;est voulu</b>.' 'The server stores encrypted blocks and nothing else. Without the master password or the recovery kit, this zone is lost: <b>that is the point</b>.')"
B1="$(t 'Les comptes que tu confies, un par un, avec confirmation à chaque fois.' 'The accounts you hand over, one at a time, with a confirmation each time.')"
B2="$(t "Toi, et l'agent côté serveur, par une clé distincte rangée hors de la base." 'You, and the agent on the server, through a separate key kept outside the database.')"
B3="$(t 'Surveille les fuites et fait tourner les mots de passe.' 'Watches for breaches and rotates the passwords.')"
BF="$(t 'Par défaut, <b>toute entrée va dans la zone personnelle</b>. Déléguer est un geste, jamais un réglage par défaut.' 'By default, <b>every entry lands in the personal zone</b>. Delegating is a gesture, never a default setting.')"

cat > "$D/html$SUF/s-sere-coffre.html" <<HTML
<!doctype html><html lang="$LG"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@800&family=Space+Grotesk:wght@400;500&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1280px;height:376px;overflow:hidden;background:#0D1117}
.w{width:1280px;height:376px;background:#0D1117;display:flex;gap:30px;padding:26px 56px}
.p{flex:1;background:#131A24;border:1px solid #1F2833;border-radius:13px;
   padding:22px 24px;display:flex;flex-direction:column;position:relative;overflow:hidden}
.p::after{content:"";position:absolute;left:0;top:22px;bottom:22px;width:3px;border-radius:0 3px 3px 0}
.a::after{background:#F2F4F8}.b::after{background:#4D8DFF}
.hd{display:flex;align-items:center;gap:13px;margin-bottom:14px}
.ic{width:42px;height:42px;flex-shrink:0;display:flex;align-items:center;justify-content:center;border-radius:10px}
.a .ic{background:#F2F4F812;border:1px solid #F2F4F82E}
.b .ic{background:#4D8DFF16;border:1px solid #4D8DFF33}
h3{font-family:Syne,sans-serif;font-weight:800;font-size:19px;color:#F0F4F8;line-height:1.2}
.sub{font-family:'JetBrains Mono',monospace;font-size:10.5px;letter-spacing:1.6px;color:#5E6B7B;margin-top:4px}
.l{display:flex;align-items:flex-start;gap:11px;margin-top:12px}
.k{font-family:'JetBrains Mono',monospace;font-size:10.5px;letter-spacing:1.2px;color:#6E7B8A;
   width:96px;flex-shrink:0;padding-top:2px}
.l p{font-family:'Space Grotesk',sans-serif;font-size:13.5px;line-height:1.45;color:#96A3B2}
.ft{margin-top:auto;padding-top:14px;border-top:1px solid #1F2833;
    font-family:'Space Grotesk',sans-serif;font-size:13px;line-height:1.45;color:#7E8B9A}
b{color:#E6EDF5;font-weight:500}
</style></head><body><div class="w">

<div class="p a">
  <div class="hd">
    <div class="ic"><svg width="21" height="21" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="10.5" width="16" height="10.5" rx="2.6" stroke="#F2F4F8" stroke-width="1.8"/>
      <path d="M7.8 10.5V7.3a4.2 4.2 0 018.4 0v3.2" stroke="#F2F4F8" stroke-width="1.8" stroke-linecap="round"/>
      <circle cx="12" cy="15.4" r="1.7" fill="#F2F4F8"/></svg></div>
    <div><h3>$Z1</h3><div class="sub">$S1</div></div>
  </div>
  <div class="l"><div class="k">$KC</div><p>$A1</p></div>
  <div class="l"><div class="k">$KQ</div><p>$A2</p></div>
  <div class="l"><div class="k">$KA</div><p>$A3</p></div>
  <div class="ft">$AF</div>
</div>

<div class="p b">
  <div class="hd">
    <div class="ic"><svg width="21" height="21" viewBox="0 0 24 24" fill="none">
      <rect x="4.5" y="7.5" width="15" height="12" rx="3" stroke="#4D8DFF" stroke-width="1.8"/>
      <path d="M12 4.5v3M9 12.5v1.5M15 12.5v1.5" stroke="#4D8DFF" stroke-width="1.8" stroke-linecap="round"/>
      <circle cx="12" cy="3.4" r="1.4" fill="#4D8DFF"/>
      <path d="M9.5 16.5h5" stroke="#4D8DFF" stroke-width="1.8" stroke-linecap="round"/></svg></div>
    <div><h3>$Z2</h3><div class="sub">$S2</div></div>
  </div>
  <div class="l"><div class="k">$KC</div><p>$B1</p></div>
  <div class="l"><div class="k">$KQ</div><p>$B2</p></div>
  <div class="l"><div class="k">$KA</div><p>$B3</p></div>
  <div class="ft">$BF</div>
</div>

</div></body></html>
HTML
"$CH" --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=11000 --force-device-scale-factor=2 \
  --screenshot="$B/sere$SUF/coffre.png" --window-size=1280,376 "file:///$B/html$SUF/s-sere-coffre.html" >/dev/null 2>&1
echo "  coffre.png"

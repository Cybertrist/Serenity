// The roadmap, stacked (docs/00-vue-ensemble.md, "Les quatre versions").
//
// At the bottom, what never moves: the cryptography and the AGPL v3
// licence. On it, V1 drops into place: it is built. Then the v0.1.0 tag,
// not placed yet, with the four items of docs/10-securite.md ("Avant d'y
// mettre de vrais comptes"): one done, three open. Above, V2, V3 and V4
// come in as outlines, without a date. On the left, the timeline: done,
// next, later.
module.exports = (O) => {
  const A = require('./_ecrans-archi.js')(O);
  const { t, svg, texte, entete, entre, visible, fondu, icone, paragraphe, lignes,
    CARTE, BORD, TITRE, TEXTE, DISCRET, FIL, ACCENT, ACCENT_TEXTE, VERT, MONO } = O;
  const C = 30, FIN = 0.975;
  const L = 1280, H = 770;

  let corps = entete(t('LES VERSIONS', 'VERSIONS'),
    t('La V1 est construite. La v0.1.0 attend trois choses. Les suivantes viendront, sans date promise.',
      'V1 is built. The v0.1.0 tag waits on three things. The next ones will come, with no promised date.'));

  const PX = 170, PL = 1232 - PX;
  const COLS = [PX + 262, PX + 262 + 200, PX + 262 + 400, PX + 262 + 600];
  const T_V1 = 0.05, T_TAG = 0.2, T_V2 = 0.46, T_V3 = 0.56, T_V4 = 0.66, T_SOCLE = 0.78;

  /// Up to four points in columns, each wrapped on two lines at most.
  const points = (y, h, liste, couleur = TEXTE) => liste.map((p, j) => {
    const l = lignes(p, 12.5, 176);
    const y0 = y + h / 2 - (l.length - 1) * 9 + 4;
    return `<circle cx="${COLS[j]}" cy="${y0 - 4}" r="2.5" fill="${ACCENT}"/>` +
      l.map((ll, k) => texte(COLS[j] + 10, y0 + k * 18, ll, { taille: 12.5, couleur })).join('');
  }).join('');
  /// The name block of a version: tile, name, one line under it.
  const nom = (y, h, ic, titre, sous, { fantome = false } = {}) =>
    `<rect x="${PX + 20}" y="${y + h / 2 - 19}" width="38" height="38" rx="11" fill="${ACCENT}" fill-opacity="${fantome ? 0.06 : 0.14}" stroke="${ACCENT}" stroke-opacity="${fantome ? 0.25 : 0.45}"/>` +
    icone(ic, PX + 29, y + h / 2 - 10, 20, fantome ? DISCRET : ACCENT_TEXTE) +
    texte(PX + 74, y + h / 2 - 3, titre, { taille: 15.5, couleur: TITRE, poids: 600 }) +
    texte(PX + 74, y + h / 2 + 17, sous, { taille: 12.5, couleur: fantome ? DISCRET : TEXTE });

  // ------------------------------------------------------------ the base
  const SY = 632, SH = 84, SW = (PL - 20) / 2;
  const socle = (x, ic, titre, l1, l2) => A.cadre(x, SY, SW, SH, C, [[T_SOCLE, FIN]]) +
    `<rect x="${x + 20}" y="${SY + 23}" width="38" height="38" rx="11" fill="${ACCENT}" fill-opacity="0.14" stroke="${ACCENT}" stroke-opacity="0.45"/>` +
    icone(ic, x + 29, SY + 32, 20, ACCENT_TEXTE) +
    texte(x + 74, SY + 34, titre, { taille: 14.5, couleur: TITRE, poids: 600 }) +
    texte(x + 74, SY + 54, l1, { taille: 12.5, couleur: TEXTE }) + texte(x + 74, SY + 72, l2, { taille: 12.5, couleur: TEXTE });
  corps += socle(PX, 'Key', t('La cryptographie ne bouge pas', 'The cryptography stays put'),
    t('libsodium des deux côtés, Argon2id, XChaCha20-Poly1305', 'libsodium on both sides, Argon2id, XChaCha20-Poly1305'),
    t('deux zones, clés en mémoire, aucune primitive maison', 'two zones, keys in memory, no home-made primitive'));
  corps += socle(PX + SW + 20, 'Scroll', t('La licence non plus : AGPL v3', 'Nor does the licence: AGPL v3'),
    t('le code reste ouvert, même servi par le web', 'the code stays open, even when served over the web'),
    t('l’appli donne le lien vers ses sources, hors ligne compris', 'the app links to its source, offline included'));

  // ------------------------------------------------------------ V1
  const V1Y = 514, V1H = 100;
  let v1 = A.cadre(PX, V1Y, PL, V1H, C, [[T_V1 + 0.05, T_TAG]]);
  v1 += nom(V1Y, V1H, 'Vault', t('V1 : Coffre maison', 'V1: Home-made vault'), t('construite, rien de publié', 'built, nothing released yet'));
  v1 += points(V1Y, V1H, [
    t('Coffre chiffré, API et appli web installable', 'Encrypted vault, API and installable web app'),
    t('Import Bitwarden, veille des fuites, délégation', 'Bitwarden import, breach watch, delegation'),
    t('Rappels, notifications maison, rotation sur le site de démo', 'Reminders, home-made notifications, rotation on the demo site'),
    t('Sauvegardes restic, appli de bureau Windows et Linux', 'restic backups, desktop app for Windows and Linux'),
  ], TITRE);
  corps += `<g opacity="0">${visible(C, T_V1, FIN, 0.008)}<g><animateTransform attributeName="transform" type="translate" dur="${C}s" repeatCount="indefinite"
    keyTimes="0;${T_V1};${T_V1 + 0.05};1" values="0 -60;0 -60;0 0;0 0" keySplines="0 0 1 1;0.3 0 0.2 1;0 0 1 1" calcMode="spline"/>${v1}</g></g>`;

  // ------------------------------------------------------------ v0.1.0
  const TY = 394, TH = 100;
  let tag = `<rect x="${PX}" y="${TY}" width="${PL}" height="${TH}" rx="14" fill="${CARTE}" stroke="${ACCENT}" stroke-opacity="0.55" stroke-dasharray="6 5"/>`;
  tag += nom(TY, TH, 'Hash', t('v0.1.0, le premier tag', 'v0.1.0, the first tag'), t('ce qui la bloque encore', 'what still holds it back'));
  const CHECK = [
    [true, t('Clés de développement renouvelées, le 20 septembre', 'Development keys renewed, on 20 September')],
    [false, t('Dépôt restic déporté hors de la VM', 'restic repository moved off the VM')],
    [false, t('Relecture extérieure, crypto.md d’abord', 'An outside review, crypto.md first')],
    [false, t('Taguer la v0.1.0', 'Tag v0.1.0')],
  ];
  CHECK.forEach(([fait, s], j) => {
    const x = COLS[j] - 6, de = T_TAG + 0.05 + j * 0.05;
    const l = lignes(s, 12.5, 160);
    const y0 = TY + TH / 2 - (l.length - 1) * 9 + 4;
    tag += `<rect x="${x}" y="${y0 - 13}" width="16" height="16" rx="5" fill="none" stroke="${FIL}" stroke-width="1.5"/>`;
    if (fait) tag += `<g opacity="0">${visible(C, de, FIN, 0.006)}<rect x="${x}" y="${y0 - 13}" width="16" height="16" rx="5" fill="${VERT}" fill-opacity="0.18" stroke="${VERT}" stroke-width="1.5"/>${icone('Check', x + 2, y0 - 11, 12, VERT, 'bold')}</g>`;
    else tag += `<rect x="${x - 3}" y="${y0 - 16}" width="22" height="22" rx="7" fill="none" stroke="${ACCENT}" stroke-width="1.5" opacity="0">${visible(C, de, de + 0.05, 0.006)}</rect>`;
    tag += l.map((ll, k) => texte(x + 24, y0 + k * 18, ll, { taille: 12.5, couleur: fait ? TITRE : TEXTE })).join('');
  });
  corps += entre(C, T_TAG, FIN, tag, 0.01);

  // ------------------------------------------------------------ V2, V3, V4
  const FUTURES = [
    [T_V2, 290, 'DeviceMobile', t('V2 : Appli Android', 'V2: Android app'), [
      t('Native, en Kotlin, avec libsodium', 'Native, in Kotlin, with libsodium'),
      t('Notifications avec Approuver et Refuser', 'Notifications with Approve and Refuse'),
      t('Sans service tiers ni icône permanente', 'No third party, no permanent icon'),
      t('Son code installé ne vient plus de la VM', 'Its installed code no longer comes from the VM')]],
    [T_V3, 194, 'Globe', t('V3 : Tes vrais sites', 'V3: Your real sites'), [
      t('Une recette par site réel, pour le rotateur', 'One recipe per real site, for the rotator'),
      t('L’inspection de page qui aide à l’écrire', 'Page inspection that helps write it'),
      t('Une extension navigateur', 'A browser extension'),
      t('Et avec elle, une défense contre l’hameçonnage', 'And with it, a defence against phishing')]],
    [T_V4, 98, 'Robot', t('V4 : Agent LLM', 'V4: LLM agent'), [
      t('Un agent plus autonome', 'A more autonomous agent'),
      t('Toujours encadré par des règles', 'Still held by rules'),
      t('Vérifiées par le code, jamais par un LLM', 'Checked by code, never by an LLM'),
      t('Le kill switch, avant chaque action', 'The kill switch, before every action')]],
  ];
  const FH = 80;
  FUTURES.forEach(([de, y, ic, titre, pts]) => {
    let c = `<rect x="${PX}" y="${y}" width="${PL}" height="${FH}" rx="14" fill="${CARTE}" fill-opacity="0.6" stroke="${FIL}" stroke-dasharray="6 5"/>`;
    c += nom(y, FH, ic, titre, t('à venir', 'to come'), { fantome: true });
    c += points(y, FH, pts);
    corps += `<g opacity="0">${visible(C, de, FIN, 0.01)}<g><animateTransform attributeName="transform" type="translate" dur="${C}s" repeatCount="indefinite"
      keyTimes="0;${de};${de + 0.04};1" values="0 -24;0 -24;0 0;0 0" keySplines="0 0 1 1;0.3 0 0.2 1;0 0 1 1" calcMode="spline"/>${c}</g></g>`;
  });

  // ------------------------------------------------------------ the timeline
  const FX = 96;
  const mid = (y, h) => y + h / 2;
  corps += `<line x1="${FX}" y1="${SY + SH / 2}" x2="${FX}" y2="${mid(98, FH)}" stroke="${FIL}" stroke-width="2" stroke-dasharray="3 5"/>
    <path d="M${FX - 6} ${mid(98, FH) - 2} L${FX} ${mid(98, FH) - 12} L${FX + 6} ${mid(98, FH) - 2}" fill="none" stroke="${FIL}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
  // The solid line climbs up to what is built.
  corps += `<line x1="${FX}" x2="${FX}" y1="${SY + SH / 2}" y2="${SY + SH / 2}" stroke="${VERT}" stroke-width="2.5" stroke-linecap="round">
    ${fondu('y2', C, [[0, SY + SH / 2], [T_V1, SY + SH / 2], [T_V1 + 0.05, mid(V1Y, V1H)], [FIN, mid(V1Y, V1H)], [FIN + 0.015, SY + SH / 2], [1, SY + SH / 2]])}</line>`;
  const jalon = (y, de, mot, couleur, plein) => entre(C, de, FIN,
    `<circle cx="${FX}" cy="${y}" r="6" fill="${plein ? couleur : CARTE}" stroke="${couleur}" stroke-width="2"/>` +
    texte(FX - 16, y + 4, mot, { taille: 12.5, couleur, poids: 600, ancre: 'end' }), 0.008);
  corps += jalon(SY + SH / 2, 0, t('socle', 'base'), ACCENT_TEXTE, true);
  corps += jalon(mid(V1Y, V1H), T_V1 + 0.05, t('fait', 'done'), VERT, true);
  corps += jalon(mid(TY, TH), T_TAG + 0.01, t('ensuite', 'next'), ACCENT_TEXTE, false);
  FUTURES.forEach(([de, y]) => { corps += jalon(mid(y, FH), de + 0.04, t('plus tard', 'later'), DISCRET, false); });

  corps += texte(L / 2, H - 22, t('Pas de date : chaque version sort quand elle est prête. Tant que la v0.1.0 n’est pas taguée, le CHANGELOG range tout sous « Non publié ».',
    'No dates: each version ships when it is ready. Until v0.1.0 is tagged, the CHANGELOG keeps everything under “Unreleased”.'), { taille: 12.5, couleur: DISCRET, ancre: 'middle' });

  svg('versions.svg', L, H, corps, t(
    'La feuille de route de Serenity, empilée. En bas, le socle qui ne bouge pas : la cryptographie, libsodium des deux côtés, Argon2id, XChaCha20-Poly1305, deux zones, des clés en mémoire et aucune primitive maison ; et la licence AGPL v3, qui garde le code ouvert même servi par le web, l’appli donnant le lien vers ses sources, hors ligne compris. Dessus tombe la V1, Coffre maison, construite mais rien de publié : coffre chiffré, API et appli web installable ; import Bitwarden, veille des fuites, délégation ; rappels, notifications maison, rotation sur le site de démo ; sauvegardes restic et appli de bureau Windows et Linux. Au-dessus, la v0.1.0, le premier tag, et ce qui la bloque encore : les clés de développement renouvelées le 20 septembre, cochées ; le dépôt restic à déporter hors de la VM ; une relecture extérieure, crypto.md d’abord ; et le tag lui-même. Tant qu’il manque, le CHANGELOG range tout sous « Non publié ». Puis arrivent, en pointillés et sans date, la V2, appli Android native en Kotlin avec libsodium, notifications avec Approuver et Refuser, sans service tiers ni icône permanente, et dont le code installé ne vient plus de la VM ; la V3, tes vrais sites, avec une recette par site pour le rotateur, l’inspection de page qui aide à l’écrire, une extension navigateur et avec elle une défense contre l’hameçonnage ; la V4, un agent LLM plus autonome, toujours encadré par des règles vérifiées par le code, jamais par un LLM, avec le kill switch avant chaque action. À gauche, la frise : socle, fait, ensuite, plus tard.',
    'The Serenity roadmap, stacked. At the bottom, the base that stays put: the cryptography, libsodium on both sides, Argon2id, XChaCha20-Poly1305, two zones, keys in memory and no home-made primitive; and the AGPL v3 licence, which keeps the code open even when served over the web, the app linking to its source, offline included. On it drops V1, the home-made vault, built but nothing released yet: encrypted vault, API and installable web app; Bitwarden import, breach watch, delegation; reminders, home-made notifications, rotation on the demo site; restic backups and a desktop app for Windows and Linux. Above it, v0.1.0, the first tag, and what still holds it back: the development keys renewed on 20 September, ticked; the restic repository to move off the VM; an outside review, crypto.md first; and the tag itself. Until then, the CHANGELOG keeps everything under “Unreleased”. Then come, dashed and without a date, V2, a native Android app in Kotlin with libsodium, notifications with Approve and Refuse, no third party and no permanent icon, whose installed code no longer comes from the VM; V3, your real sites, with one recipe per site for the rotator, page inspection that helps write it, a browser extension and with it a defence against phishing; V4, a more autonomous LLM agent, still held by rules checked by code, never by an LLM, with the kill switch before every action. On the left, the timeline: base, done, next, later.'));
};

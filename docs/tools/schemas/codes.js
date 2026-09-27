// The two-factor codes: computed on the device, copied in one touch.
//
// On the left, the phone plays the real screens (08b-codes, 08a-fiche-confiee):
// the Codes screen and its countdown, a touch that copies the code (toast,
// then a check), the 30 s window that rolls over into a new code, the entry
// opened on the same code, then the Codes screen again. The seconds are real
// seconds: the cycle is 36 s, and every countdown ticks with it.
//
// On the right, RFC 6238 as web/src/lib/totp.ts computes it, with the true
// values for a test secret (JBSWY3DPEHPK3PXP, the textbook one) at
// t = 1790510421 then 1790510430: base32, counter, HMAC-SHA1, dynamic
// truncation, six digits. Below, the clipboard emptied 30 s after the copy
// (web/src/app/clipboard.ts), and the agent zone, whose code the server can
// compute too (docs/07-interface.md).
module.exports = (O) => {
  const E = require('./_ecrans.js')(O);
  const { t, svg, texte, paragraphe, entete, rubrique, paliers, fondu, entre, toucher, carte, legendes, icone, monogramme,
    telephone, aurore, enteteMobile, ongletsBas, champ, verre, puceZone, toast, ENTREES, APP, MONO, SANS,
    CARTE, BORD, TITRE, TEXTE, DISCRET, ACCENT, ACCENT_TEXTE, VERT } = O;
  const C = 36;
  const f = (s) => s / C; // seconds to a fraction of the cycle

  // ------------------------------------------------------------ the clock
  // At the start of the cycle, 21 s of the current 30 s window have gone.
  const T0 = 1790510421;
  const reste = (s) => 30 - ((21 + Math.floor(s)) % 30);
  const CODE_A = '098 234', CODE_B = '448 518';
  const BASCULE = 9; // the second the window rolls over
  const code = (s) => (s < BASCULE ? CODE_A : CODE_B);

  // The phone, step by step (in seconds, real ones).
  const COPIE = 2, OUVRE = 14.6, FICHE = 15, FERME = 26.5, RETOUR = 27, VIDE = 32;
  const FIN = 0.985;

  /// Shows fn(s) during each whole second s in [de, a), merging runs that
  /// draw the same thing. fn must not create ids.
  function parSeconde(de, a, fn) {
    let out = '', cour = null, debut = de;
    const pose = (d, b, m) => {
      const etapes = d <= 0 ? [[0, 1]] : [[0, 0], [f(d), 1]];
      if (b < C) etapes.push([f(b), 0]);
      out += `<g opacity="${d <= 0 ? 1 : 0}">${paliers('opacity', C, etapes)}${m}</g>`;
    };
    for (let s = de; s < a; s++) {
      const m = fn(s);
      if (m !== cour) { if (cour !== null) pose(debut, s, cour); cour = m; debut = s; }
    }
    if (cour !== null) pose(debut, a, cour);
    return out;
  }

  /// The seconds ring (SecondsRing): blue, amber for the last five. [rest]
  /// gives the seconds left at a given second of the cycle.
  function anneauSecondes(cx, cy, taille, de, a, rest = reste, ambre = true) {
    const r = (9.5 * taille) / 24, w = (2.4 * taille) / 24;
    const circ = 2 * Math.PI * r;
    const off = (n) => (circ * (1 - n / 30)).toFixed(2);
    const etapes = [];
    for (let s = de; s <= a; s++) etapes.push([f(s), off(rest(s))]);
    if (etapes[0][0] > 0) etapes.unshift([0, etapes[0][1]]);
    if (etapes[etapes.length - 1][0] < 1) etapes.push([1, etapes[etapes.length - 1][1]]);
    const couleurs = [];
    for (let s = de; s < a; s++) {
      const c = ambre && rest(s) <= 5 ? APP.warn : APP.accent;
      if (!couleurs.length || couleurs[couleurs.length - 1][1] !== c) couleurs.push([s === de ? 0 : f(s), c]);
    }
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${APP.track}" stroke-opacity="0.3" stroke-width="${w}"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${APP.accent}" stroke-width="${w}" stroke-linecap="round"
        stroke-dasharray="${circ.toFixed(2)}" stroke-dashoffset="${etapes[0][1]}" transform="rotate(-90 ${cx} ${cy})">
        ${fondu('stroke-dashoffset', C, etapes)}${couleurs.length > 1 ? paliers('stroke', C, couleurs) : ''}</circle>`;
  }

  let corps = entete(t('LES CODES 2FA', 'THE 2FA CODES'),
    t('Calculés sur ton appareil, copiés d’un toucher, effacés tout seuls.',
      'Computed on your device, copied in one touch, cleared on their own.'));

  // ------------------------------------------------------------ the phone
  const T = telephone(48, 88, 640);
  corps += T.cadre;

  // The Codes screen (08b-codes), what does not move.
  const e = ENTREES.netflix;
  const fixe = () => {
  let fixe = aurore(390, 844, 'calm');
  fixe += enteteMobile(t('Codes 2FA', '2FA codes'), {
    actions: ['MagnifyingGlass', 'Bell'],
    sous: t('Calculés ici, même hors ligne. Touche un code pour le copier.', 'Computed here, even offline. Tap a code to copy it.'),
  });
  fixe += champ(18, 120, 354, t('Chercher un code', 'Search a code'), { icone: 'MagnifyingGlass', touche: '/', h: 38 });
  fixe += verre(18, 170, 354, 44, { rx: 14 });
  fixe += verre(18, 234, 354, 163, { opacite: 0.6 });
  fixe += monogramme(e.nom, 34, 249, 36);
  fixe += texte(82, 263, e.nom, { taille: 14, couleur: APP.text, poids: 500 });
  fixe += texte(82, 281, e.id, { taille: 12, couleur: APP.faint });
  fixe += icone('ArrowSquareOut', 338, 252, 18, APP.muted);
  fixe += `<line x1="34" y1="347" x2="356" y2="347" stroke="${APP.line}" stroke-opacity="0.1"/>`;
  fixe += puceZone(34, 358, 'agent', { taille: 11.5, h: 22 }).svg;
  fixe += texte(356, 374, t('Le serveur peut aussi le calculer', 'The server can compute it too'), { taille: 12, couleur: APP.faint, ancre: 'end' });
  fixe += `<rect x="18.5" y="408.5" width="353" height="119" rx="16" fill="none" stroke="${APP.line}" stroke-opacity="0.22" stroke-dasharray="4 4"/>`;
  fixe += icone('QrCode', 184, 444, 22, APP.muted);
  fixe += texte(195, 489, t('Importer depuis Authenticator', 'Import from Authenticator'), { taille: 13.5, couleur: APP.muted, ancre: 'middle' });
  fixe += paragraphe(22, 562, t('1 code est dans la zone agent : le serveur peut les calculer aussi, c’est ce qui lui permet de se reconnecter à ta place.',
    '1 code is in the agent zone: the server can compute it too, which is what lets it sign back in for you.'), { taille: 12, max: 346, couleur: APP.faint, interligne: 18 });
  fixe += ongletsBas('codes');
  return fixe;
  };

  // What moves on it: the countdown, the code, its ring, the copy button.
  const vivant = () => {
    let s = anneauSecondes(42, 192, 20, 0, C);
    s += parSeconde(0, C, (k) => {
      const n = String(reste(k));
      const debut = t('Nouveaux codes dans ', 'New codes in ');
      const x2 = 62 + O.largeur(debut, 13) + 3;
      return texte(62, 197, debut, { taille: 13, couleur: APP.muted }) +
        texte(x2, 197, n, { taille: 13, couleur: APP.text, poids: 600 }) +
        texte(x2 + O.largeur(n, 13, { poids: 600 }) + 4, 197, 's', { taille: 13, couleur: APP.muted });
    });
    s += parSeconde(0, C, (k) => texte(34, 327, code(k), {
      taille: 32, couleur: reste(k) <= 5 ? APP.warnText : APP.text, police: MONO, poids: 500, espace: 1.9,
    }));
    s += anneauSecondes(343, 316, 26, 0, C);
    // The copy button turns into a check for 1.6 s after the touch.
    s += entre(C, 0, f(COPIE), icone('Copy', 292, 308, 17, APP.faint), 0.003);
    s += entre(C, f(COPIE), f(COPIE + 1.6), `<rect x="284" y="300" width="32" height="32" rx="9" fill="${APP.ok}" fill-opacity="0.14"/>` +
      icone('Check', 292, 308, 17, APP.ok, 'bold'), 0.003);
    s += entre(C, f(COPIE + 1.6), 2, icone('Copy', 292, 308, 17, APP.faint), 0.003);
    return s;
  };
  let ecran = '';
  ecran += entre(C, 0, f(FICHE), fixe() + vivant() +
    toucher(170, 318, C, f(COPIE)) +
    entre(C, f(COPIE + 0.1), f(6), toast(195, 716, t('Code de Netflix copié. Effacé dans 30 s.', 'Netflix code copied. Cleared in 30 s.'))) +
    toucher(347, 261, C, f(OUVRE)), 0.006);

  // The entry (08a-fiche-confiee): the same code, the same countdown. The
  // shared screen draws a still code; it is taken out and drawn live here.
  const fiche = E.fiche({ zone: 'agent', code: 'CODE', secondes: 99 })
    .replace('>CODE<', '><')
    .replace('>99 s<', '><')
    .replace(/<circle cx="152" cy="314" r="9" fill="none" stroke="#3B82F6"[^>]*\/>/, '');
  if (fiche.includes('CODE') || fiche.includes('99 s')) throw new Error('codes : la fiche a changé, revoir le remplacement');
  let ficheVive = anneauSecondes(152, 314, 22.7, FICHE - 1, RETOUR + 1);
  ficheVive += parSeconde(Math.floor(FICHE), Math.ceil(RETOUR), (k) =>
    texte(35, 322, code(k), { taille: 23, couleur: reste(k) <= 5 ? APP.warnText : APP.text, poids: 600, espace: 1 }) +
    texte(172, 319, `${reste(k)} s`, { taille: 12.5, couleur: APP.faint }));
  ecran += entre(C, f(FICHE), f(RETOUR), fiche + ficheVive + toucher(360, 31, C, f(FERME)), 0.006);
  ecran += entre(C, f(RETOUR), FIN, fixe() + vivant(), 0.006);
  corps += T.ecran(ecran);

  // ------------------------------------------------ RFC 6238, step by step
  const X0 = 420, W = 820, VX = X0 + 330;
  corps += rubrique(X0, 106, t('RFC 6238, CALCULÉ DANS TON NAVIGATEUR', 'RFC 6238, COMPUTED IN YOUR BROWSER'));
  const horsLigne = t('Rien demandé au serveur : ça marche hors ligne.', 'Nothing asked of the server: it works offline.');
  corps += icone('CloudSlash', X0 + W - O.largeur(horsLigne, 12.5) - 24, 93, 17, DISCRET) +
    texte(X0 + W, 106, horsLigne, { taille: 12.5, couleur: TEXTE, ancre: 'end' });

  // The bytes of the HMAC, the four at the offset lit.
  const octets = (hex, depuis = -1, n = 0, dernier = true) => {
    const b = hex.match(/../g);
    return b.map((o, i) => {
      const c = i >= depuis && i < depuis + n ? ACCENT_TEXTE : dernier && i === b.length - 1 ? TITRE : DISCRET;
      return `<tspan fill="${c}">${o}</tspan>`;
    }).join(' ');
  };
  const mono = (x, y, contenu, { taille = 13, couleur = TITRE } = {}) =>
    `<text x="${x}" y="${y}" font-family="${MONO}" font-size="${taille}" fill="${couleur}" xml:space="preserve">${contenu}</text>`;
  const A = {
    t: 1790510421, c: 59683680, msg: '00 00 00 00 03 8e b3 60', mac: '6ff79fb50f1a493dd87d565039baf14c6ba2254a', off: 10,
    dernier: '4a', quatre: '56 50 39 ba', bin: 1448098234, code: CODE_A,
  };
  const B = {
    t: 1790510430, c: 59683681, msg: '00 00 00 00 03 8e b3 61', mac: 'd181dc47a3a281dbefe5867597b0c14eed326487', off: 7,
    dernier: '87', quatre: 'db ef e5 86', bin: 1542448518, code: CODE_B,
  };
  const rangs = [
    [t('Le secret', 'The secret'), t('base32, rangé dans l’entrée', 'base32, kept in the entry'), () =>
      mono(VX, 0, 'JBSW Y3DP EHPK 3PXP') +
      mono(VX, 20, `48 65 6c 6c 6f 21 de ad be ef   <tspan fill="${DISCRET}">${t('10 octets', '10 bytes')}</tspan>`, { taille: 12, couleur: TEXTE })],
    [t('Le compteur', 'The counter'), t('floor(temps / 30), sur 8 octets', 'floor(time / 30), as 8 bytes'), (v) =>
      mono(VX, 0, `t = ${v.t} s   <tspan fill="${DISCRET}">floor(t / 30) =</tspan> ${v.c}`) +
      mono(VX, 20, v.msg, { taille: 12, couleur: TEXTE })],
    ['HMAC-SHA1', t('Web Crypto, avec le secret pour clé', 'Web Crypto, keyed with the secret'), (v) =>
      mono(VX, 0, octets(v.mac, v.off, 4)) +
      mono(VX, 20, t(`dernier octet ${v.dernier}, ses 4 bits bas : décalage ${v.off}`, `last byte ${v.dernier}, its low 4 bits: offset ${v.off}`), { taille: 12, couleur: TEXTE })],
    [t('La troncature', 'Truncation'), t('4 octets au décalage, sans le signe', '4 bytes at the offset, no sign bit'), (v) =>
      mono(VX, 0, `<tspan fill="${ACCENT_TEXTE}">${v.quatre}</tspan>  &amp;  7f ff ff ff`) +
      mono(VX, 20, `= ${v.bin}`, { taille: 12, couleur: TEXTE })],
    [t('Le code', 'The code'), t('les 6 derniers chiffres', 'the last 6 digits'), (v) =>
      mono(VX, 10, `${v.bin} % 1000000 =`, { taille: 12, couleur: TEXTE }) +
      texte(VX + 180, 12, v.code, { taille: 22, couleur: TITRE, police: MONO, poids: 600, espace: 1 })],
  ];
  const RY = 122, RH = 66, RG = 8;
  const cascade = [0, 0, 0.6, 1.2, 1.8].map((d) => BASCULE + d);
  rangs.forEach(([titre, sous, valeur], i) => {
    const y = RY + i * (RH + RG);
    corps += carte(X0, y, W, RH, { allume: [f(cascade[i]), f(cascade[i] + 5)], cycle: C, rx: 12 });
    corps += texte(X0 + 20, y + 29, titre, { taille: 14.5, couleur: TITRE, poids: 600, police: i === 2 ? MONO : SANS });
    corps += texte(X0 + 20, y + 49, sous, { taille: 12, couleur: DISCRET });
    const pose = (v) => `<g transform="translate(0 ${y + 28})">${valeur(v)}</g>`;
    if (i === 0) corps += pose(B);
    else {
      corps += entre(C, 0, f(cascade[i]), pose(A), 0.004);
      corps += entre(C, f(cascade[i]), FIN, pose(B), 0.004);
    }
  });

  // ------------------------------------------------ the two cards below
  const CY = 504, CH = 180, CL = 405;
  const tete = (x, ic, titre) => `<rect x="${x + 20}" y="${CY + 20}" width="34" height="34" rx="9" fill="${ACCENT}" fill-opacity="0.12"/>` +
    icone(ic, x + 27, CY + 27, 20, ACCENT_TEXTE) + texte(x + 66, CY + 42, titre, { taille: 15, couleur: TITRE, poids: 600 });
  const boite = (x) => `<rect x="${x + 20}" y="${CY + 70}" width="${CL - 40}" height="42" rx="10" fill="${O.FOND}" stroke="${BORD}"/>`;

  // The clipboard: empty, the copied code with its 30 s, then emptied.
  const PX = X0;
  corps += carte(PX, CY, CL, CH, { allume: [f(COPIE), f(COPIE + 5)], cycle: C });
  corps += carte(PX, CY, CL, CH, { allume: [f(VIDE), FIN], cycle: C, fond: 'none' });
  corps += tete(PX, 'CopySimple', t('Le presse-papiers', 'The clipboard'));
  corps += boite(PX);
  corps += entre(C, 0, f(COPIE), texte(PX + 36, CY + 96, t('vide', 'empty'), { taille: 13, couleur: DISCRET }), 0.004);
  corps += entre(C, f(COPIE), f(VIDE), texte(PX + 36, CY + 97, CODE_A, { taille: 16, couleur: TITRE, police: MONO, poids: 600, espace: 1 }) +
    anneauSecondes(PX + CL - 48, CY + 91, 20, COPIE, VIDE, (s) => VIDE - Math.floor(s), false) +
    parSeconde(COPIE, VIDE, (k) => texte(PX + CL - 66, CY + 96, t(`effacé dans ${VIDE - k} s`, `cleared in ${VIDE - k} s`), { taille: 12.5, couleur: TEXTE, ancre: 'end' })), 0.004);
  corps += entre(C, f(VIDE), FIN, icone('CheckCircle', PX + 34, CY + 82, 18, VERT, 'fill') +
    texte(PX + 60, CY + 96, t('vidé, 30 s après la copie', 'emptied, 30 s after the copy'), { taille: 13, couleur: TITRE }), 0.004);
  corps += paragraphe(PX + 20, CY + 138, t('Si la page n’a plus la main à ce moment, il est vidé dès qu’elle la reprend. Au verrouillage aussi.',
    'If the page has lost focus by then, it is emptied as soon as it gets it back. On lock too.'), { taille: 12.5, max: CL - 40, couleur: TEXTE, interligne: 19 });

  // The agent zone: the server computes the very same code.
  const ZX = X0 + CL + 10;
  corps += carte(ZX, CY, CL, CH, { allume: [f(RETOUR), f(VIDE)], cycle: C });
  corps += tete(ZX, 'Sparkle', t('Zone agent : le serveur aussi', 'Agent zone: the server too'));
  corps += boite(ZX);
  const egal = (v) => texte(ZX + 36, CY + 96, t('ton appareil', 'your device'), { taille: 12, couleur: DISCRET }) +
    texte(ZX + 124, CY + 97, v, { taille: 15, couleur: TITRE, police: MONO, poids: 600 }) +
    texte(ZX + CL / 2 + 8, CY + 96, '=', { taille: 15, couleur: ACCENT_TEXTE, police: MONO, ancre: 'middle' }) +
    texte(ZX + CL - 36 - 70 - 10, CY + 96, t('le serveur', 'the server'), { taille: 12, couleur: DISCRET, ancre: 'end' }) +
    texte(ZX + CL - 36, CY + 97, v, { taille: 15, couleur: TITRE, police: MONO, poids: 600, ancre: 'end' });
  corps += entre(C, 0, f(BASCULE + 1.8), egal(CODE_A), 0.004);
  corps += entre(C, f(BASCULE + 1.8), FIN, egal(CODE_B), 0.004);
  corps += paragraphe(ZX + 20, CY + 138, t('Le serveur lit le secret d’une entrée confiée : l’agent peut se reconnecter pendant une rotation.',
    'The server reads the secret of an entry handed over: the agent can sign back in during a rotation.'), { taille: 12.5, max: CL - 40, couleur: TEXTE, interligne: 19 });

  // ------------------------------------------------ what is happening now
  corps += legendes(X0, 726, C, [
    [0, f(COPIE), t('Le code se calcule sur ton appareil, à partir du secret rangé dans l’entrée.', 'The code is computed on your device, from the secret kept in the entry.')],
    [f(COPIE), f(BASCULE), t('Un toucher copie le code. Le presse-papiers se videra tout seul dans 30 s.', 'One touch copies the code. The clipboard will empty itself in 30 s.')],
    [f(BASCULE), f(FICHE), t('Toutes les 30 s, le compteur avance d’un cran : nouveau HMAC, nouveau code.', 'Every 30 s the counter moves on by one: new HMAC, new code.')],
    [f(FICHE), f(RETOUR), t('La fiche de l’entrée montre le même code, avec le même compte à rebours.', 'The entry shows the same code, with the same countdown.')],
    [f(RETOUR), f(VIDE), t('Netflix est confié à l’agent : le serveur peut calculer ce code lui aussi.', 'Netflix is handed to the agent: the server can compute this code too.')],
    [f(VIDE), FIN, t('30 s après la copie, le presse-papiers est vidé.', '30 s after the copy, the clipboard is emptied.'), VERT],
  ], { max: 800 });

  svg('codes.svg', 1280, 768, corps, t(
    'Les codes à deux facteurs, calculés sur ton appareil. À gauche, le téléphone rejoue les vrais écrans en temps réel : l’écran Codes 2FA, « Calculés ici, même hors ligne. Touche un code pour le copier. », avec son compte à rebours « Nouveaux codes dans 9 s » et la tuile de Netflix, marquée « Confié à l’agent » et « Le serveur peut aussi le calculer », qui affiche 098 234 ; un toucher copie le code, le bouton devient une coche et un message dit « Code de Netflix copié. Effacé dans 30 s. » ; les cinq dernières secondes passent en ambre, puis la fenêtre de 30 s bascule et le code devient 448 518 ; la fiche de Netflix, ouverte, montre le même code et le même compte à rebours ; puis retour à l’écran Codes, où une phrase dit que le serveur peut calculer les codes de la zone agent pour se reconnecter à ta place. À droite, le calcul RFC 6238 de web/src/lib/totp.ts avec un secret d’essai, rien demandé au serveur, ce qui marche hors ligne, en cinq cartes : le secret base32 JBSW Y3DP EHPK 3PXP, soit 10 octets ; le compteur, floor(t / 30), soit 59683681 pour t = 1790510430, écrit sur 8 octets ; le HMAC-SHA1 de Web Crypto avec le secret pour clé, 20 octets dont le dernier, 87, donne le décalage 7 ; la troncature, les 4 octets db ef e5 86 pris à ce décalage, sans le bit de signe, soit 1542448518 ; et les 6 derniers chiffres, 448 518. Les cartes s’allument l’une après l’autre quand le compteur avance. En bas, deux cartes : le presse-papiers, vide, puis le code copié avec « effacé dans 30 s » qui décompte, puis vidé 30 s après la copie, ou dès que la page reprend la main, et au verrouillage ; la zone agent, où ton appareil et le serveur calculent le même code, parce que le serveur lit le secret d’une entrée confiée, ce qui permet à l’agent de se reconnecter pendant une rotation.',
    'Two-factor codes, computed on your device. On the left, the phone replays the real screens in real time: the 2FA codes screen, “Computed here, even offline. Tap a code to copy it.”, with its “New codes in 9 s” countdown and the Netflix tile, marked “Handed to the agent” and “The server can compute it too”, showing 098 234; a touch copies the code, the button turns into a check and a message says “Netflix code copied. Cleared in 30 s.”; the last five seconds turn amber, then the 30 s window rolls over and the code becomes 448 518; the Netflix entry, opened, shows the same code and the same countdown; then back to the Codes screen, where a sentence says the server can compute the agent zone codes to sign back in for you. On the right, the RFC 6238 computation of web/src/lib/totp.ts with a test secret, nothing asked of the server, which works offline, in five cards: the base32 secret JBSW Y3DP EHPK 3PXP, that is 10 bytes; the counter, floor(t / 30), that is 59683681 for t = 1790510430, written as 8 bytes; the Web Crypto HMAC-SHA1 keyed with the secret, 20 bytes whose last one, 87, gives offset 7; the truncation, the 4 bytes db ef e5 86 taken at that offset, without the sign bit, that is 1542448518; and the last 6 digits, 448 518. The cards light up one after another when the counter moves on. At the bottom, two cards: the clipboard, empty, then the copied code with “cleared in 30 s” counting down, then emptied 30 s after the copy, or as soon as the page gets focus back, and on lock; the agent zone, where your device and the server compute the same code, because the server reads the secret of an entry handed over, which lets the agent sign back in during a rotation.'));
};

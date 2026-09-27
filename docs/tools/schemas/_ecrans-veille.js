// Screens of the watch and of the agent, shared by fuites.js, cadence.js
// and proposition.js. Drawn in app units from the real screenshots
// (serenity-shots/final: 09-fuites, 20d-bureau-fuites, 20-bureau-agent,
// 21-bureau-notifications), the phone at 390 x 844, the desktop at
// 1280 x 800 (the 1440 x 900 captures scaled by 0.889).
//
// No screen here paints the Aurora light: a diagram draws it once under
// every state, so a change of mood glides instead of blinking.
//
// The app draws a red bar on the left of a breach card. The diagrams never
// do (a bar on the side of a card reads as generated): a thin border all
// around carries the tone instead.
module.exports = (O) => {
  const { t, texte, paragraphe, lignes, icone, verre, monogramme, anneau, puce, boutonPrimaire, bouton, touches, kbd,
    enteteMobile, ongletsBas, barreTitre, barreLaterale, orbe, largeur, APP, MONO } = O;

  // ------------------------------------------------------------ phone

  /// The Breaches tab on the phone (09-fuites). [etat] 'sain' before the
  /// scan found anything, 'fuite' once the Netflix alert is open. [verif]
  /// the sentence under the title.
  function fuitesMobile({ etat = 'fuite', verif = 'instant' } = {}) {
    const fuite = etat === 'fuite';
    let s = enteteMobile(t('Fuites', 'Breaches'), { actions: ['ArrowsClockwise', 'MagnifyingGlass', 'Bell'], pointCloche: fuite ? APP.warn : null });
    s += texte(18, 76, t('Ce que la veille a trouvé sur tes comptes.', 'What the watch found on your accounts.'), { taille: 14, couleur: APP.muted });
    s += texte(18, 96, verif === 'encours' ? t('Vérification en cours…', 'Checking…') : t('Dernière vérification à l’instant.', 'Last checked just now.'), { taille: 14, couleur: APP.faint });

    // The health card, halo in the colour of the mood.
    s += verre(18, 120, 354, 156, { halo: fuite ? APP.warn : APP.accent });
    if (fuite) s += `<rect x="18" y="120" width="354" height="156" rx="16" fill="none" stroke="${APP.warn}" stroke-opacity="0.3"/>`;
    s += anneau(76, 198, 86, fuite ? 67 : 100);
    s += texte(133, 146, t('SANTÉ DU COFFRE', 'VAULT HEALTH'), { taille: 11, couleur: APP.faint, poids: 600, espace: 1 });
    if (fuite) {
      s += paragraphe(133, 171, t('Une chose demande ton attention.', 'One thing needs your attention.'), { taille: 17, max: 225, couleur: APP.text, poids: 700, interligne: 22 });
      s += paragraphe(133, 216, t('Netflix est dans une fuite connue : c’est le premier à changer.', 'Netflix is in a known breach: it is the first to change.'), { taille: 13, max: 225, couleur: APP.muted, interligne: 18 });
      s += `<circle cx="136" cy="256" r="3" fill="${APP.warn}"/>` + texte(144, 260, t('1 entrée touchée.', '1 entry affected.'), { taille: 13, couleur: APP.faint });
    } else {
      s += texte(133, 171, t('Tout va bien.', 'All is well.'), { taille: 17, couleur: APP.text, poids: 700 });
      s += paragraphe(133, 194, t('Aucun mot de passe dans une fuite connue, aucun réutilisé, aucun trop faible ou trop ancien.',
        'No password in a known breach, none reused, none too weak or too old.'), { taille: 13, max: 225, couleur: APP.muted, interligne: 18 });
    }

    // The five counters.
    const compteurs = [
      [t('Fuites', 'Leaks'), fuite ? 1 : 0, APP.crit],
      [t('Réutil.', 'Reused'), 0],
      [t('Faibles', 'Weak'), fuite ? 1 : 0, APP.warn],
      [t('Anciens', 'Old'), 0],
      [t('E-mails', 'Emails'), 0],
    ];
    compteurs.forEach(([mot, n, c], i) => {
      const x = 18 + i * 72.5;
      s += verre(x, 292, 64, 63, { rx: 14 });
      s += texte(x + 10, 315, mot, { taille: 10.5, couleur: APP.muted, poids: 500 });
      s += texte(x + 10, 343, String(n), { taille: 24, couleur: n && c ? c : APP.text, poids: 600 });
    });

    if (fuite) {
      s += texte(22, 383, t('1 ALERTE', '1 ALERT'), { taille: 11, couleur: APP.faint, poids: 600, espace: 1 });
      s += texte(368, 383, t('Les plus graves d’abord', 'Worst first'), { taille: 11, couleur: APP.faint, ancre: 'end' });
      s += carteAlerteMobile();
    } else {
      s += verre(18, 398, 354, 236);
      s += `<rect x="163" y="420" width="64" height="64" rx="20" fill="${APP.ok}" fill-opacity="0.13"/>` + icone('SealCheck', 180, 437, 30, APP.ok, 'duotone');
      s += texte(195, 518, t('Rien à signaler', 'Nothing to report'), { taille: 20, couleur: APP.text, poids: 700, ancre: 'middle' });
      lignes(t('Aucun mot de passe dans une fuite connue, aucun réutilisé, aucun trop faible ni trop ancien.',
        'No password in a known breach, none reused, none too weak or too old.'), 14, 300).forEach((l, i) => {
        s += texte(195, 546 + i * 20, l, { taille: 14, couleur: APP.muted, ancre: 'middle' });
      });
      s += texte(195, 608, t('La veille repasse d’elle-même.', 'The watch comes back on its own.'), { taille: 12.5, couleur: APP.faint, ancre: 'middle' });
    }

    // "How the watch checks", cut by the tab bar like on the screenshot.
    const y = fuite ? 654 : 650;
    s += verre(18, y, 354, 200);
    s += texte(34, y + 31, t('Comment la veille vérifie', 'How the watch checks'), { taille: 16, couleur: APP.text, poids: 600 });
    s += `<rect x="34" y="${y + 47}" width="22" height="22" rx="7" fill="#94A3C4" fill-opacity="0.07" stroke="${APP.line}" stroke-opacity="0.22"/>` +
      texte(45, y + 62, '1', { taille: 11, couleur: APP.faint, police: MONO, ancre: 'middle' });
    s += paragraphe(68, y + 62, t('Ton appareil calcule l’empreinte SHA-1 de chaque mot de passe.', 'Your device computes the SHA-1 hash of each password.'), { taille: 13, max: 285, couleur: APP.muted, interligne: 18 });
    s += ongletsBas('fuites', { badges: fuite ? { fuites: 1, agent: 1 } : {} });
    return s;
  }

  /// The Netflix alert on the phone, with a full thin border.
  function carteAlerteMobile() {
    let s = verre(18, 398, 354, 240);
    s += `<rect x="18" y="398" width="354" height="240" rx="16" fill="none" stroke="${APP.crit}" stroke-opacity="0.3"/>`;
    s += monogramme('Netflix', 38, 413, 44);
    s += texte(95, 430, 'Netflix', { taille: 16, couleur: APP.text, poids: 600 });
    const p1 = puce(158, 414, t('Vu dans une fuite', 'Seen in a breach'), 'crit', { icone: 'WarningCircle', taille: 11.5, h: 22 });
    s += p1.svg;
    s += puce(158 + p1.l + 6, 414, t('Faible', 'Weak'), 'warn', { icone: 'ShieldWarning', taille: 11.5, h: 22 }).svg;
    s += puce(95, 440, t('Confié à l’agent', 'Handed to the agent'), 'violet', { icone: 'Sparkle', taille: 11.5, h: 22 }).svg;
    s += paragraphe(95, 485, t('Ce mot de passe est apparu dans une fuite connue. L’agent a préparé une rotation, elle attend ton accord. Il est aussi trop faible.',
      'This password showed up in a known breach. The agent has prepared a rotation, it waits for your consent. It is also too weak.'), { taille: 14, max: 262, couleur: APP.muted, interligne: 21 });
    s += boutonPrimaire(95, 566, 150, 28, t('Voir la proposition', 'See the proposal'), { icone: 'ArrowRight', taille: 12.5, rx: 8 });
    s += texte(105, 618, t('Changer moi-même', 'Change it myself'), { taille: 13, couleur: APP.text, poids: 500 });
    s += texte(250, 618, t('Mettre de côté', 'Set aside'), { taille: 13, couleur: APP.text, poids: 500 });
    return s;
  }

  // ---------------------------------------------------------- desktop

  /// The status bar of the desktop window, as on the screenshots:
  /// agent, last watch, health, pending rotations, then the lock.
  function barreEtatVeille({ veille = t('il y a 2 minutes', '2 minutes ago'), sante = 67, attente = 1 } = {}) {
    const y = 776;
    let s = `<rect x="248" y="${y}" width="1032" height="24" fill="${APP.surface}" fill-opacity="0.92"/>
      <line x1="248" y1="${y}" x2="1280" y2="${y}" stroke="${APP.line}" stroke-opacity="0.1"/>`;
    let x = 263;
    const mot = (m, c = APP.muted, p = 400) => { s += texte(x, y + 16, m, { taille: 12, couleur: c, poids: p }); x += largeur(m, 12, { poids: p }); };
    s += `<circle cx="${x + 3}" cy="${y + 12}" r="3" fill="${APP.ok}"/>`; x += 11;
    mot(t('Agent actif', 'Agent on')); x += 20;
    mot(t('Veille', 'Watch')); x += 6; mot(veille, APP.text, 500); x += 20;
    s += `<circle cx="${x + 3}" cy="${y + 12}" r="3" fill="${sante >= 85 ? APP.ok : APP.warn}"/>`; x += 11;
    mot(t('Santé', 'Health')); x += 6; mot(String(sante), APP.text, 500); x += 20;
    if (attente) { mot(String(attente), APP.text, 500); x += 6; mot(t('rotation en attente', 'rotation pending')); }
    const k = touches(1136, y + 4, ['Ctrl', 'K'], { h: 16, taille: 10 });
    s += texte(1076, y + 16, '14:56', { taille: 12, couleur: APP.text, poids: 500, ancre: 'end' });
    s += texte(1076 - largeur('14:56', 12, { poids: 500 }) - 6, y + 16, t('Verrouillage dans', 'Locks in'), { taille: 12, couleur: APP.muted, ancre: 'end' });
    s += k.svg + texte(1136 + k.l + 7, y + 16, t('commandes', 'commands'), { taille: 12, couleur: APP.muted });
    return s;
  }

  /// The chrome of the desktop app: title bar, sidebar, status bar.
  function chrome(actif, { point = APP.warn, veille, sante = 67, attente = 1 } = {}) {
    return barreTitre({ point }) + barreLaterale(actif, attente ? {} : {
      agentSous: t('Rotation en cours', 'Rotation under way'), comptes: { coffre: 3, codes: 1, fuites: 1, agent: null, toi: 2, confie: 1 },
    }) + barreEtatVeille({ veille, sante, attente });
  }

  /// A small eyebrow in the app: spaced capitals.
  const sourcil = (x, y, s, { couleur = APP.faint, ancre = 'start', taille = 10.5 } = {}) =>
    texte(x, y, s, { taille, couleur, poids: 600, espace: 1, ancre });

  /// The Breaches screen of the desktop app (20d-bureau-fuites), content
  /// only (x 248 to 1280, y 36 to 776). [verif] the sentence after the
  /// subtitle, [presse] lights the "Check now" button.
  function bureauFuites({ verif = 'instant' } = {}) {
    let s = texte(254, 83, t('Fuites', 'Breaches'), { taille: 30, couleur: APP.text, poids: 700, espace: -0.6 });
    const sous = t('Ce que la veille a trouvé sur tes comptes.', 'What the watch found on your accounts.');
    s += texte(254, 104, sous, { taille: 13, couleur: APP.muted });
    if (verif) s += texte(254 + largeur(sous, 13) + 5, 104, verif === 'encours' ? t('Vérification en cours…', 'Checking…') : t('Dernière vérification à l’instant.', 'Last checked just now.'), { taille: 13, couleur: APP.faint });
    // "Check now", with its key.
    const mot = t('Vérifier maintenant', 'Check now');
    const lb = largeur(mot, 13, { poids: 500 }) + 70;
    const xb = 1246 - lb;
    s += `<rect x="${xb}" y="78" width="${lb}" height="30" rx="9" fill="${APP.glass2}" fill-opacity="0.66" stroke="${APP.line}" stroke-opacity="0.22"/>`;
    s += icone('ArrowsClockwise', xb + 13, 85, 16, APP.text) + texte(xb + 36, 97.5, mot, { taille: 13, couleur: APP.text, poids: 500 });
    s += kbd(1246 - 28, 84, 'R', { h: 18 }).svg;

    // Health.
    s += verre(254, 129, 992, 140, { halo: APP.warn });
    s += `<rect x="254" y="129" width="992" height="140" rx="16" fill="none" stroke="${APP.warn}" stroke-opacity="0.3"/>`;
    s += anneau(324, 198, 100, 67);
    s += sourcil(395, 166, t('SANTÉ DU COFFRE', 'VAULT HEALTH'));
    s += texte(395, 192, t('Une chose demande ton attention.', 'One thing needs your attention.'), { taille: 21, couleur: APP.text, poids: 700 });
    s += texte(395, 216, t('Netflix est dans une fuite connue : c’est le premier à changer.', 'Netflix is in a known breach: it is the first to change.'), { taille: 12, couleur: APP.muted });
    s += `<circle cx="398" cy="233" r="2.5" fill="${APP.warn}"/>` + texte(405, 237, t('1 entrée touchée.', '1 entry affected.'), { taille: 11.5, couleur: APP.faint });

    // Counters.
    const compteurs = [
      ['WarningCircle', t('Dans une fuite', 'In a breach'), 1, 'Pwned Passwords', APP.crit],
      ['CopySimple', t('Réutilisés', 'Reused'), 0, t('même mot de passe', 'same password')],
      ['ShieldWarning', t('Faibles', 'Weak'), 1, t('trop courts ou simples', 'too short or simple'), APP.warn],
      ['Clock', t('Anciens', 'Old'), 0, t('plus d’un an', 'over a year')],
      ['At', t('Adresses', 'Addresses'), 0, t('exposées', 'exposed')],
    ];
    compteurs.forEach(([ic, mot2, n, indice, c], i) => {
      const x = 254 + i * 200.5;
      s += verre(x, 287, 190, 85, { rx: 14 });
      s += icone(ic, x + 13, 301, 13, APP.muted) + texte(x + 30, 311.5, mot2, { taille: 12, couleur: APP.muted, poids: 500 });
      if (n && c) s += `<circle cx="${x + 176}" cy="307" r="2.6" fill="${c}"/>`;
      s += texte(x + 13, 342, String(n), { taille: 24, couleur: n && c ? c : APP.text, poids: 600 });
      s += texte(x + 13, 360, indice, { taille: 10.5, couleur: APP.faint });
    });

    // The alert, full thin border.
    s += sourcil(257, 399, t('1 ALERTE', '1 ALERT'));
    s += texte(942, 399, t('Les plus graves d’abord', 'Worst first'), { taille: 10.5, couleur: APP.faint, ancre: 'end' });
    s += verre(254, 412, 691, 131);
    s += `<rect x="254" y="412" width="691" height="131" rx="16" fill="none" stroke="${APP.crit}" stroke-opacity="0.3"/>`;
    s += monogramme('Netflix', 275, 429, 39);
    s += texte(325, 444, 'Netflix', { taille: 14, couleur: APP.text, poids: 600 });
    let px = 325 + largeur('Netflix', 14, { poids: 600 }) + 8;
    for (const [m, ton, ic] of [[t('Vu dans une fuite', 'Seen in a breach'), 'crit', 'WarningCircle'], [t('Faible', 'Weak'), 'warn', 'ShieldWarning'], [t('Confié à l’agent', 'Handed to the agent'), 'violet', 'Sparkle']]) {
      const p = puce(px, 430, m, ton, { icone: ic, taille: 10.5, h: 18 });
      s += p.svg; px += p.l + 6;
    }
    s += paragraphe(325, 467, t('Ce mot de passe est apparu dans une fuite connue. L’agent a préparé une rotation, elle attend ton accord. Il est aussi trop faible.',
      'This password showed up in a known breach. The agent has prepared a rotation, it waits for your consent. It is also too weak.'), { taille: 13, max: 590, couleur: APP.muted, interligne: 19 });
    s += boutonPrimaire(325, 503, 136, 23, t('Voir la proposition', 'See the proposal'), { icone: 'ArrowRight', taille: 11.5, rx: 7 });
    s += texte(475, 519, t('Changer moi-même', 'Change it myself'), { taille: 11.5, couleur: APP.text, poids: 500 });
    s += texte(475 + largeur(t('Changer moi-même', 'Change it myself'), 11.5, { poids: 500 }) + 26, 519, t('Mettre de côté', 'Set aside'), { taille: 11.5, couleur: APP.text, poids: 500 });

    // How the watch checks, with the app's own example hash.
    s += verre(963, 389, 283, 285);
    s += texte(979, 416, t('Comment la veille vérifie', 'How the watch checks'), { taille: 14, couleur: APP.text, poids: 600 });
    const etapes = [
      t('Ton appareil calcule l’empreinte SHA-1 de chaque mot de passe.', 'Your device computes the SHA-1 hash of each password.'),
      t('Il n’envoie que les 5 premiers caractères à Pwned Passwords, qui renvoie des centaines de suffixes possibles.', 'It only sends the first 5 characters to Pwned Passwords, which returns hundreds of possible suffixes.'),
      t('La comparaison se fait ici. Ton mot de passe ne sort jamais, même haché.', 'The comparison happens here. Your password never leaves, not even hashed.'),
    ];
    let ye = 440;
    etapes.forEach((e, i) => {
      s += `<rect x="979" y="${ye - 13}" width="18" height="18" rx="5" fill="#94A3C4" fill-opacity="0.07" stroke="${APP.line}" stroke-opacity="0.22"/>` +
        texte(988, ye, String(i + 1), { taille: 10, couleur: APP.faint, police: MONO, ancre: 'middle' });
      const ls = lignes(e, 11.5, 212);
      ls.forEach((l, k) => { s += texte(1008, ye + k * 16, l, { taille: 11.5, couleur: APP.muted }); });
      ye += ls.length * 16 + 12;
    });
    s += `<rect x="979" y="${ye}" width="251" height="64" rx="10" fill="#94A3C4" fill-opacity="0.06" stroke="${APP.line}" stroke-opacity="0.12"/>`;
    const H = '940C0F26FD5A30775BB1CBD1F6840398D39BB813';
    s += `<rect x="988" y="${ye + 9}" width="${5 * 6.6 + 4}" height="16" rx="3" fill="${APP.accent}" fill-opacity="0.16"/>`;
    s += texte(990, ye + 21, H.slice(0, 5), { taille: 11, couleur: APP.accentText, police: MONO, poids: 600 });
    s += texte(990 + 5 * 6.6 + 4, ye + 21, H.slice(5, 29), { taille: 11, couleur: APP.faint, police: MONO });
    s += texte(990, ye + 36, H.slice(29), { taille: 11, couleur: APP.faint, police: MONO });
    s += texte(990, ye + 53, t('Seul le début en couleur quitte ton appareil.', 'Only the coloured start leaves your device.'), { taille: 10, couleur: APP.faint });

    // Watched addresses, cut by the status bar.
    s += verre(963, 689, 283, 120);
    s += texte(979, 716, t('Adresses surveillées', 'Watched addresses'), { taille: 14, couleur: APP.text, poids: 600 });
    s += texte(1230, 716, t('Gérer', 'Manage'), { taille: 12, couleur: APP.accentText, ancre: 'end' });
    s += paragraphe(979, 742, t('L’agent cherche aussi tes adresses dans les fuites publiées.', 'The agent also looks for your addresses in published breaches.'), { taille: 11.5, max: 250, couleur: APP.muted, interligne: 16 });
    return s;
  }

  /// The Agent screen of the desktop app (20-bureau-agent), content only.
  /// [bas] 'proposition' shows the pending rotation, 'approuvee' the
  /// running card that replaces it once approved.
  function bureauAgent({ bas = 'proposition' } = {}) {
    let s = texte(254, 83, t('Agent', 'Agent'), { taille: 30, couleur: APP.text, poids: 700, espace: -0.6 });
    s += texte(254, 104, t('Ce qu’il surveille, ce qu’il te propose, et ce qu’il a fait.', 'What it watches, what it proposes, and what it did.'), { taille: 13, couleur: APP.muted });
    s += bouton(1124, 78, 122, 30, t('Voir le journal', 'See the log'), { icone: 'TerminalWindow', taille: 12.5, rx: 9 });

    // Kill switch card.
    s += verre(254, 129, 399, 216, { halo: APP.violet });
    s += `<rect x="254" y="129" width="399" height="216" rx="16" fill="none" stroke="${APP.violet}" stroke-opacity="0.3"/>`;
    s += orbe(298, 174, 40);
    s += sourcil(338, 155, t('KILL SWITCH', 'KILL SWITCH')) + sourcil(338 + largeur(t('KILL SWITCH', 'KILL SWITCH'), 10.5, { poids: 600 }) + 20, 155, t('EN MARCHE', 'RUNNING'), { couleur: APP.ok });
    s += texte(338, 178, t('L’agent veille', 'The agent is watching'), { taille: 20, couleur: APP.text, poids: 700 });
    s += texte(338, 197, t('Il surveille 1 entrée confiée et prépare les rotations.', 'It watches 1 entry handed over and prepares the rotations.'), { taille: 11.5, couleur: APP.muted });
    s += `<rect x="271" y="216" width="365" height="46" rx="11" fill="${APP.glass}" fill-opacity="0.6" stroke="${APP.line}" stroke-opacity="0.12"/>`;
    s += `<rect x="277" y="222" width="173" height="34" rx="8" fill="${APP.glassHi}" fill-opacity="0.8" stroke="${APP.line}" stroke-opacity="0.22"/>`;
    s += icone('Power', 333, 232, 13, APP.ok) + texte(352, 243, t('MARCHE', 'ON'), { taille: 10, couleur: APP.text, poids: 600, espace: 1 });
    s += texte(543, 243, t('ARRÊT', 'OFF'), { taille: 10, couleur: APP.faint, poids: 600, espace: 1, ancre: 'middle' });
    s += texte(271, 280, t('MAINTIENS 1 S POUR ARRÊTER', 'HOLD 1 S TO STOP'), { taille: 9.5, couleur: APP.faint, police: MONO, espace: 1 });
    s += paragraphe(271, 307, t('Ce switch est relu avant chaque action : coupé, l’agent s’arrête net. Tes entrées ne changent pas.',
      'This switch is read before every action: off, the agent stops dead. Your entries do not change.'), { taille: 11.5, max: 360, couleur: APP.muted, interligne: 16 });

    // Activity card: the last 24 hours, the proposal at the right end.
    s += verre(671, 129, 575, 216);
    s += sourcil(687, 154, t('ACTIVITÉ · 24 H', 'ACTIVITY · 24 H'));
    let lx = 1231;
    const legende = [[t('Veille', 'Watch'), 'o'], [t('Proposition', 'Proposal'), 'd'], [t('Fuite', 'Breach'), APP.crit], ['Rotation', APP.ok]];
    for (const [m, c] of legende) {
      s += texte(lx, 154, m, { taille: 10, couleur: APP.faint, ancre: 'end' });
      lx -= largeur(m, 10) + 10;
      if (c === 'o') s += `<circle cx="${lx}" cy="150.5" r="3" fill="none" stroke="${APP.faint}"/>`;
      else if (c === 'd') s += `<rect x="${lx - 3}" y="147.5" width="6" height="6" fill="${APP.warn}" transform="rotate(45 ${lx} 150.5)"/>`;
      else s += `<circle cx="${lx}" cy="150.5" r="3" fill="${c}"/>`;
      lx -= 14;
    }
    s += `<line x1="690" y1="205" x2="1227" y2="205" stroke="${APP.line}" stroke-opacity="0.22"/>`;
    for (let i = 0; i <= 24; i++) s += `<line x1="${690 + i * 22.4}" y1="${i % 6 ? 203 : 200}" x2="${690 + i * 22.4}" y2="${i % 6 ? 207 : 210}" stroke="${APP.line}" stroke-opacity="0.3"/>`;
    ['00h', '06h', '12h', '18h'].forEach((h, i) => { s += texte(764 + i * 134.4, 225, h, { taille: 9.5, couleur: APP.faint, police: MONO, ancre: 'middle' }); });
    s += texte(1213, 225, '20:40', { taille: 9.5, couleur: APP.accentText, police: MONO, poids: 600, ancre: 'middle' });
    s += `<rect x="1177" y="173" width="46" height="16" rx="4" fill="none" stroke="${APP.line}" stroke-opacity="0.22"/>` + texte(1200, 184.5, 'NETFLIX', { taille: 8.5, couleur: APP.muted, police: MONO, ancre: 'middle' });
    s += `<rect x="1221" y="199" width="11" height="11" fill="${APP.warn}" transform="rotate(45 1226.5 204.5)"/>`;
    s += `<rect x="687" y="245" width="543" height="55" rx="10" fill="none" stroke="${APP.line}" stroke-opacity="0.12"/>`;
    const stats = [[t('SURVEILLÉES', 'WATCHED'), '1', t('entrées', 'entries')], [t('ROTATIONS 30 J', 'ROTATIONS 30 D'), '0'], [t('EN ATTENTE', 'PENDING'), bas === 'proposition' ? '1' : '0', null, bas === 'proposition' ? APP.warn : null], [t('ÉCHECS 30 J', 'FAILURES 30 D'), '0']];
    stats.forEach(([m, v, u, c], i) => {
      const x = 700 + i * 135.5;
      if (i) s += `<line x1="${x - 13}" y1="245" x2="${x - 13}" y2="300" stroke="${APP.line}" stroke-opacity="0.12"/>`;
      s += texte(x, 264, m, { taille: 9.5, couleur: APP.muted, poids: 600, espace: 0.8 });
      s += texte(x, 288, v, { taille: 19, couleur: c || APP.text, poids: 600 });
      if (u) s += texte(x + 16, 288, u, { taille: 10, couleur: APP.faint });
    });

    if (bas === 'proposition') s += propositionBureau();
    else s += rotationEnCours();
    return s;
  }

  /// The pending proposal, as on 20-bureau-agent.
  function propositionBureau() {
    let s = `<circle cx="259" cy="365" r="2.6" fill="${APP.warn}"/>` + sourcil(271, 369, t('EN ATTENTE DE TON ACCORD', 'WAITING FOR YOUR CONSENT'));
    s += texte(1243, 369, t('Rien ne bouge tant que tu n’as pas répondu', 'Nothing moves until you answer'), { taille: 10, couleur: APP.faint, ancre: 'end' });
    s += verre(254, 387, 992, 292, { halo: APP.violet });
    s += `<rect x="254" y="387" width="992" height="292" rx="16" fill="none" stroke="${APP.violet}" stroke-opacity="0.25"/>`;
    s += monogramme('Netflix', 271, 402, 39);
    s += texte(322, 417, t('Changer le mot de passe de Netflix', 'Change the Netflix password'), { taille: 14, couleur: APP.text, poids: 600 });
    s += texte(322, 435, t('Proposée à l’instant, après une fuite.', 'Proposed just now, after a breach.'), { taille: 11.5, couleur: APP.muted });
    const pil = t('En attente de ton accord', 'Waiting for your consent');
    const pl = largeur(pil, 11, { poids: 500 }) + 16;
    s += `<rect x="${1229 - pl}" y="404" width="${pl}" height="19" rx="7" fill="${APP.violet}" fill-opacity="0.15"/>` + texte(1229 - pl / 2, 417.5, pil, { taille: 11, couleur: APP.violetText, poids: 500, ancre: 'middle' });
    s += `<rect x="271" y="455" width="958" height="32" rx="9" fill="${APP.warn}" fill-opacity="0.12"/>`;
    s += icone('SealWarning', 282, 463, 15, APP.warnText) + texte(304, 475, t('Le mot de passe actuel est apparu dans une fuite connue. Plus vite il change, mieux c’est.',
      'The current password showed up in a known breach. The sooner it changes, the better.'), { taille: 11.5, couleur: APP.text });
    s += sourcil(271, 510, t('CE QUE L’AGENT FERA', 'WHAT THE AGENT WILL DO'));
    const etapes = [
      [t('Générer', 'Generate'), t('Un mot de passe neuf de 24 caractères, gardé en révision en attente.', 'A new 24 character password, kept as a pending revision.')],
      [t('Changer', 'Change'), t('Ce site n’est pas dans l’allowlist : tu feras le changement toi-même, guidé.', 'This site is not on the allowlist: you will make the change yourself, guided.')],
      [t('Prouver', 'Prove'), t('Reconnexion avec le nouveau : l’ancien doit être refusé.', 'Sign in again with the new one: the old one must be refused.')],
      [t('Valider', 'Confirm'), t('La révision devient la bonne. Sinon, retour à l’ancien.', 'The revision becomes the real one. Otherwise, back to the old one.')],
    ];
    etapes.forEach(([ti, tx], i) => {
      const x = 271 + i * 241;
      s += `<rect x="${x}" y="518" width="234" height="95" rx="11" fill="#94A3C4" fill-opacity="0.05" stroke="${APP.line}" stroke-opacity="0.12"/>`;
      s += texte(x + 12, 541, `0${i + 1}`, { taille: 10, couleur: APP.violetText, police: MONO, poids: 600 });
      s += texte(x + 12, 561, ti, { taille: 13, couleur: APP.text, poids: 600 });
      s += paragraphe(x + 12, 580, tx, { taille: 11.5, max: 212, couleur: APP.muted, interligne: 16 });
    });
    s += `<line x1="254" y1="627" x2="1246" y2="627" stroke="${APP.line}" stroke-opacity="0.12"/>`;
    s += icone('HandPalm', 272, 645, 14, APP.faint) + texte(292, 656, t('Rien ne bouge tant que tu n’as pas répondu.', 'Nothing moves until you answer.'), { taille: 11.5, couleur: APP.faint });
    s += icone('X', 983, 645, 14, APP.text) + texte(1003, 656, t('Refuser', 'Refuse'), { taille: 13, couleur: APP.text, poids: 500 });
    s += boutonPrimaire(1067, 638, 162, 30, t('Approuver', 'Approve'), { icone: 'Check', taille: 13, touche: t('Entrée', 'Enter'), rx: 8 });
    // The rest of the screen, under the card.
    s += sourcil(257, 705, t('PROCHAINES ROTATIONS', 'NEXT ROTATIONS')) + texte(739, 705, t('Zone agent, à la date prévue', 'Agent zone, on the set date'), { taille: 10, couleur: APP.faint, ancre: 'end' });
    s += sourcil(762, 705, t('GARDE-FOUS', 'GUARDRAILS')) + texte(1243, 705, t('Vérifiés par le code, à chaque action', 'Checked by the code, at every action'), { taille: 10, couleur: APP.faint, ancre: 'end' });
    s += `<rect x="255" y="719" width="487" height="80" rx="16" fill="none" stroke="${APP.line}" stroke-opacity="0.22" stroke-dasharray="4 4"/>`;
    s += verre(758, 719, 488, 80);
    s += `<rect x="774" y="734" width="24" height="24" rx="7" fill="${APP.ok}" fill-opacity="0.13"/>` + icone('ShieldCheck', 779, 739, 14, APP.ok);
    s += texte(810, 745, t('3 rotations au maximum par jour', '3 rotations a day at most'), { taille: 12.5, couleur: APP.text, poids: 500 });
    s += texte(810, 762, t('Au-delà, l’agent attend le lendemain.', 'Beyond that, the agent waits for the next day.'), { taille: 11, couleur: APP.muted });
    return s;
  }

  /// Once approved: the running card (Running in AgentScreen.tsx).
  function rotationEnCours() {
    let s = sourcil(257, 369, t('ROTATIONS EN COURS', 'ROTATIONS UNDER WAY'));
    s += texte(1243, 369, t('Une par une, au passage de l’agent', 'One at a time, when the agent passes'), { taille: 10, couleur: APP.faint, ancre: 'end' });
    s += verre(254, 387, 992, 84);
    s += monogramme('Netflix', 271, 403, 32);
    s += texte(314, 416, t('Netflix : approuvée', 'Netflix: approved'), { taille: 13, couleur: APP.text, poids: 600 });
    s += texte(314, 433, t('Étape 1 sur 4 : elle part au prochain passage de l’agent.', 'Step 1 of 4: it starts on the agent’s next pass.'), { taille: 11.5, couleur: APP.muted });
    s += `<rect x="271" y="451" width="958" height="5" rx="2.5" fill="${APP.track}" fill-opacity="0.35"/>`;
    const g = O.id('prog');
    s += `<linearGradient id="${g}" x1="0" x2="1"><stop offset="0" stop-color="${APP.accent}"/><stop offset="1" stop-color="${APP.violet}"/></linearGradient>`;
    s += `<rect x="271" y="451" width="${958 * 0.18}" height="5" rx="2.5" fill="url(#${g})"/>`;
    s += sourcil(257, 500, t('PROCHAINES ROTATIONS', 'NEXT ROTATIONS')) + texte(739, 500, t('Zone agent, à la date prévue', 'Agent zone, on the set date'), { taille: 10, couleur: APP.faint, ancre: 'end' });
    s += sourcil(762, 500, t('GARDE-FOUS', 'GUARDRAILS')) + texte(1243, 500, t('Vérifiés par le code, à chaque action', 'Checked by the code, at every action'), { taille: 10, couleur: APP.faint, ancre: 'end' });
    s += `<rect x="255" y="514" width="487" height="150" rx="16" fill="none" stroke="${APP.line}" stroke-opacity="0.22" stroke-dasharray="4 4"/>`;
    s += icone('ArrowsClockwise', 486, 560, 24, APP.faint);
    s += texte(498, 612, t('Aucune rotation prévue.', 'No rotation planned.'), { taille: 13, couleur: APP.text, poids: 500, ancre: 'middle' });
    s += verre(758, 514, 488, 80);
    s += `<rect x="774" y="529" width="24" height="24" rx="7" fill="${APP.ok}" fill-opacity="0.13"/>` + icone('ShieldCheck', 779, 534, 14, APP.ok);
    s += texte(810, 540, t('3 rotations au maximum par jour', '3 rotations a day at most'), { taille: 12.5, couleur: APP.text, poids: 500 });
    s += texte(810, 557, t('Au-delà, l’agent attend le lendemain.', 'Beyond that, the agent waits for the next day.'), { taille: 11, couleur: APP.muted });
    return s;
  }

  /// The notification centre over the dimmed desktop (21-bureau-notifications).
  /// Returns { svg, pt } with the centre of each row, for a click.
  function notifications() {
    let s = `<rect x="0" y="0" width="1280" height="800" fill="#03050A" fill-opacity="0.62"/>`;
    s += `<rect x="444" y="169" width="392" height="462" rx="20" fill="${APP.panel}" fill-opacity="0.97" stroke="${APP.line}" stroke-opacity="0.16" filter="url(#ombreFlottante)"/>`;
    s += `<rect x="465" y="187" width="29" height="29" rx="8" fill="${APP.accent}" fill-opacity="0.15"/>` + icone('Bell', 471, 193, 17, APP.accentText);
    s += texte(505, 204, 'Notifications', { taille: 17, couleur: APP.text, poids: 700 });
    s += texte(505, 220, t('3 non lues', '3 unread'), { taille: 11.5, couleur: APP.muted });
    s += icone('X', 800, 191, 15, APP.muted);
    s += sourcil(468, 252, t('NON LUES', 'UNREAD'), { taille: 10 });
    const lg = largeur(t('NON LUES', 'UNREAD'), 10, { poids: 600 }) + 22;
    s += `<line x1="${468 + lg}" y1="249" x2="796" y2="249" stroke="${APP.line}" stroke-opacity="0.16"/>` + texte(810, 252, '3', { taille: 10, couleur: APP.faint, ancre: 'end' });
    s += `<rect x="465" y="262" width="351" height="231" rx="12" fill="${APP.glass}" fill-opacity="0.6" stroke="${APP.line}" stroke-opacity="0.12"/>`;
    const items = [
      ['ArrowsClockwise', APP.violet, APP.violetText, [t('Une rotation attend ton accord.', 'A rotation waits for your consent.')], 262, 72],
      ['SealWarning', APP.crit, APP.crit, [t('Mot de passe exposé. Vu dans une fuite connue.', 'Password exposed. Seen in a known breach.'), t('Change-le dès que possible.', 'Change it as soon as you can.')], 334, 88],
      ['SealWarning', APP.warn, APP.warnText, [t('Mot de passe faible. Trop court ou trop simple.', 'Weak password. Too short or too simple.')], 422, 71],
    ];
    items.forEach(([ic, fond, encre, textes, y, h], i) => {
      if (i) s += `<line x1="465" y1="${y}" x2="816" y2="${y}" stroke="${APP.line}" stroke-opacity="0.1"/>`;
      s += `<rect x="477" y="${y + 12}" width="27" height="27" rx="8" fill="${fond}" fill-opacity="0.15"/>` + icone(ic, 483, y + 18, 15, encre);
      s += texte(514, y + 23, 'Netflix', { taille: 12.5, couleur: APP.text, poids: 600 });
      textes.forEach((l, k) => { s += texte(514, y + 41 + k * 16, l, { taille: 11.5, couleur: APP.text }); });
      s += texte(514, y + 41 + textes.length * 16 + 1, t('Non lue · à l’instant', 'Unread · just now'), { taille: 10, couleur: APP.faint });
      s += `<circle cx="799" cy="${y + 20}" r="3.2" fill="${APP.accent}"/>`;
    });
    s += `<rect x="465" y="507" width="351" height="50" rx="10" fill="#94A3C4" fill-opacity="0.06"/>` + icone('Info', 477, 517, 14, APP.muted);
    s += paragraphe(499, 527, t('Le serveur ne garde que le type de l’alerte et l’identifiant de l’entrée : jamais son nom, jamais son mot de passe.',
      'The server keeps only the kind of alert and the id of the entry: never its name, never its password.'), { taille: 11, max: 300, couleur: APP.text, interligne: 16 });
    s += `<line x1="444" y1="573" x2="836" y2="573" stroke="${APP.line}" stroke-opacity="0.12"/>`;
    s += bouton(465, 587, 351, 29, t('Tout marquer comme lu', 'Mark all as read'), { icone: 'Check', taille: 12, rx: 8 });
    return { svg: s, lignes: [297, 378, 457] };
  }

  /// Where the checked sentence of bureauFuites() starts, to draw it apart.
  const xVerif = () => 254 + largeur(t('Ce que la veille a trouvé sur tes comptes.', 'What the watch found on your accounts.'), 13) + 5;

  /// The title of a diagram, like O.entete(), but the sentence starts after
  /// the real width of the spaced mono title (13 px mono advances 7.8 px,
  /// plus 3 px of letter spacing), so a long title never touches it.
  const enTete = (titre, phrase, { x = 48, y = 54 } = {}) =>
    texte(x, y, titre, { taille: 13, couleur: O.ACCENT_TEXTE, police: MONO, poids: 600, espace: 3 }) +
    texte(Math.round(x + titre.length * 10.8 + 20), y, phrase, { taille: 14.5, couleur: O.TEXTE });

  return { enTete, fuitesMobile, bureauFuites, bureauAgent, notifications, chrome, sourcil, xVerif };
};

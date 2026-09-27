// Screens of the feature tour (fonctionnalites.js) that the shared
// _ecrans.js does not draw: the lock screen, Breaches, Agent and Codes on
// the phone (390 x 844), and the desktop app (1280 x 800) for the kill
// switch, the palette, the import and the lock. Drawn in app units from
// serenity-shots/final (13, 09, 11, 08b, 20, 20b, 18b, 18c, 31, 32, 22b,
// 30, 34), with the wording of web/src.
//
// Each function returns plain SVG, or pieces of it when a diagram swaps
// one part while the rest stays: the tour animates on top.
module.exports = (O) => {
  const { t, texte, paragraphe, lignes, icone, verre, monogramme, anneau, orbe, puce, puceZone, kbd, touches, boutonPrimaire,
    bouton, boutonIcone, champ, segmente, force, aurore, rubans, logo, marque, enteteMobile, ongletsBas, barreTitre,
    barreLaterale, barreEtat, ENTREES, ligneEntree, enteteZone, largeur, APP, MONO } = O;

  /// An eyebrow: small spaced capitals.
  const sourcil = (x, y, s, { couleur = APP.faint, taille = 11, ancre = 'start', police } = {}) =>
    texte(x, y, s, { taille, couleur, poids: 600, espace: 1.1, ancre, ...(police ? { police } : {}) });
  const ligne = (x1, y1, x2, y2, a = 0.1) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${APP.line}" stroke-opacity="${a}"/>`;

  // =================================================================== phone

  /// The lock screen (13-deverrouillage), without its button: the tour
  /// swaps a disabled one for the live one once the password is typed.
  function verrouTel() {
    let s = `<rect width="390" height="844" fill="${APP.bg}"/>`;
    s += `<circle cx="195" cy="80" r="110" fill="${APP.accent}" opacity="0.16" filter="url(#flou36)"/>`;
    s += rubans(390, 330, { amplitude: 110 });
    s += logo(195, 70, 60, { halo: true });
    s += marque(195, 142, 38, { ancre: 'middle' });
    s += texte(195, 183, t('Bon retour, Tristan.', 'Welcome back, Tristan.'), { taille: 22, couleur: APP.text, poids: 700, ancre: 'middle', espace: -0.3 });
    s += texte(195, 210, t('Ton coffre est verrouillé. Tout reste chiffré ici.', 'Your vault is locked. Everything stays encrypted here.'), { taille: 13.5, couleur: APP.muted, ancre: 'middle' });
    s += verre(15, 550, 360, 158, { rx: 20, opacite: 0.85 });
    s += `<rect x="15.5" y="550.5" width="359" height="157" rx="20" fill="none" stroke="${APP.accent}" stroke-opacity="0.28"/>`;
    s += champ(34, 572, 322, '', { label: t('Mot de passe maître', 'Master password'), focus: true, oeil: true, h: 42 });
    // The two links under the card, centred as a pair.
    const l1 = t('Oublié ? Utilise ton kit', 'Forgot it? Use your kit'), l2 = t('Changer de compte', 'Switch account');
    const w1 = 22 + largeur(l1, 13.5, { poids: 500 }), w2 = 22 + largeur(l2, 13.5, { poids: 500 });
    const x0 = 195 - (w1 + 22 + w2) / 2;
    s += icone('Lifebuoy', x0, 737, 17, APP.accentText) + texte(x0 + 22, 750, l1, { taille: 13.5, couleur: APP.accentText, poids: 500 });
    s += icone('ArrowsLeftRight', x0 + w1 + 22, 737, 17, APP.accentText) + texte(x0 + w1 + 44, 750, l2, { taille: 13.5, couleur: APP.accentText, poids: 500 });
    s += texte(195, 777, t('Il se referme seul après 15 min sans activité.', 'It locks itself after 15 min of inactivity.'), { taille: 12, couleur: APP.faint, ancre: 'middle' });
    const pied = t('Déchiffré ici, jamais sur le serveur.', 'Decrypted here, never on the server.');
    const lp = largeur(pied, 12) + 19;
    s += icone('LockSimple', 195 - lp / 2, 805, 13, APP.faint) + texte(195 - lp / 2 + 19, 816, pied, { taille: 12, couleur: APP.faint });
    return s;
  }
  /// The Unlock button, disabled until a password is typed.
  function boutonVerrou(actif) {
    if (actif) return boutonPrimaire(34, 649, 322, 41, t('Déverrouiller', 'Unlock'), { icone: 'LockOpen', taille: 15 });
    const mot = t('Déverrouiller', 'Unlock');
    const l = largeur(mot, 15, { poids: 600 }) + 25;
    return `<rect x="34" y="649" width="322" height="41" rx="10" fill="${APP.glass2}" fill-opacity="0.45" stroke="${APP.line}" stroke-opacity="0.12"/>
      ${icone('LockOpen', 195 - l / 2, 660, 18, APP.faint)}${texte(195 - l / 2 + 25, 675, mot, { taille: 15, couleur: APP.faint, poids: 600 })}`;
  }

  /// Breaches (09-fuites): the header, then the state before the watch
  /// runs (all well) and after (Netflix found). The tour swaps the two.
  function fuitesTel() {
    const tete = enteteMobile(t('Fuites', 'Breaches'), {
      actions: ['ArrowsClockwise', 'MagnifyingGlass', 'Bell'],
      sous: t('Ce que la veille a trouvé sur tes comptes. Dernière vérification à l’instant.', 'What the watch found on your accounts. Last checked just now.'),
    });
    const noms = [t('Fuites', 'Breaches'), t('Réutil.', 'Reused'), t('Faibles', 'Weak'), t('Anciens', 'Old'), t('E-mails', 'Emails')];
    const compteurs = (vals) => {
      let s = '';
      noms.forEach((n, i) => {
        const x = 18 + i * 72.5;
        s += verre(x, 292, 64, 64, { rx: 14, opacite: 0.6 });
        s += texte(x + 11, 313, n, { taille: 11, couleur: APP.muted });
        const [v, c] = vals[i];
        s += texte(x + 11, 344, String(v), { taille: 23, couleur: c || APP.text, poids: 600 });
      });
      return s;
    };
    const eyebrow = sourcil(133, 144, t('SANTÉ DU COFFRE', 'VAULT HEALTH'));

    // Before: all well, and the empty state with its button.
    let avant = verre(18, 120, 354, 156, { rx: 18 });
    avant += anneau(76, 198, 84, 100) + eyebrow;
    avant += texte(133, 170, t('Tout va bien.', 'All is well.'), { taille: 18, couleur: APP.text, poids: 700 });
    avant += paragraphe(133, 193, t('Aucun mot de passe dans une fuite connue, aucun réutilisé, aucun trop faible ou trop ancien.',
      'No password in a known breach, none reused, none too weak or too old.'), { taille: 13, max: 222, couleur: APP.muted, interligne: 18 });
    avant += compteurs([[0], [0], [0], [0], [0]]);
    avant += verre(18, 380, 354, 290, { rx: 18, opacite: 0.6 });
    avant += `<rect x="163" y="408" width="64" height="64" rx="20" fill="${APP.ok}" fill-opacity="0.12"/>` + icone('SealCheck', 180, 425, 30, APP.ok, 'fill');
    avant += texte(195, 506, t('Rien à signaler', 'Nothing to report'), { taille: 21, couleur: APP.text, poids: 700, ancre: 'middle' });
    lignes(t('Aucun mot de passe dans une fuite connue, aucun réutilisé, aucun trop faible ni trop ancien.',
      'No password in a known breach, none reused, none too weak or too old.'), 14, 300).forEach((l, i) => {
      avant += texte(195, 534 + i * 21, l, { taille: 14, couleur: APP.muted, ancre: 'middle' });
    });
    avant += bouton(107, 600, 176, 38, t('Vérifier maintenant', 'Check now'), { icone: 'ArrowsClockwise', taille: 14 });

    // After: one thing needs attention, and the alert card. The app marks
    // that card with a red bar on its left edge; the diagrams never draw
    // one, so the whole border is drawn instead, thin.
    let apres = verre(18, 120, 354, 156, { rx: 18, halo: APP.warn });
    apres += `<rect x="18.5" y="120.5" width="353" height="155" rx="18" fill="none" stroke="${APP.warn}" stroke-opacity="0.35"/>`;
    apres += anneau(76, 198, 84, 67) + eyebrow;
    apres += texte(133, 170, t('Une chose demande', 'One thing needs'), { taille: 18, couleur: APP.text, poids: 700 });
    apres += texte(133, 192, t('ton attention.', 'your attention.'), { taille: 18, couleur: APP.text, poids: 700 });
    apres += paragraphe(133, 215, t('Netflix est dans une fuite connue : c’est le premier à changer.', 'Netflix is in a known breach: it is the first to change.'), { taille: 13, max: 222, couleur: APP.muted, interligne: 18 });
    apres += `<circle cx="137" cy="256" r="3.5" fill="${APP.warn}"/>` + texte(146, 260.5, t('1 entrée touchée.', '1 entry affected.'), { taille: 13, couleur: APP.muted });
    apres += compteurs([[1, APP.crit], [0], [1, APP.warnText], [0], [0]]);
    apres += sourcil(22, 380, t('1 ALERTE', '1 ALERT'), { couleur: APP.muted });
    apres += texte(368, 380, t('Les plus graves d’abord', 'Most serious first'), { taille: 11, couleur: APP.faint, ancre: 'end' });
    apres += verre(18, 397, 354, 242, { rx: 18, opacite: 0.65 });
    apres += `<rect x="18.5" y="397.5" width="353" height="241" rx="18" fill="none" stroke="${APP.crit}" stroke-opacity="0.35"/>`;
    apres += monogramme('Netflix', 38, 413, 44);
    apres += texte(95, 430, 'Netflix', { taille: 15.5, couleur: APP.text, poids: 600 });
    const p1 = puce(160, 413, t('Vu dans une fuite', 'Seen in a breach'), 'crit', { icone: 'SealWarning', taille: 11.5, h: 23 });
    apres += p1.svg;
    const p2x = 160 + p1.l + 6;
    const p2 = puce(p2x, 413, t('Faible', 'Weak'), 'warn', { icone: 'ShieldWarning', taille: 11.5, h: 23 });
    apres += p2x + p2.l <= 362 ? p2.svg : puce(95, 441, t('Faible', 'Weak'), 'warn', { icone: 'ShieldWarning', taille: 11.5, h: 23 }).svg;
    apres += puceZone(p2x + p2.l <= 362 ? 95 : 95 + 70, 441, 'agent', { taille: 11.5, h: 23 }).svg;
    apres += paragraphe(95, 489, t('Ce mot de passe est apparu dans une fuite connue. L’agent a préparé une rotation, elle attend ton accord. Il est aussi trop faible.',
      'This password showed up in a known breach. The agent has prepared a rotation, it is waiting for your go-ahead. It is also too weak.'), { taille: 14, max: 262, couleur: APP.muted, interligne: 21 });
    apres += boutonPrimaire(95, 563, 148, 27, t('Voir la proposition', 'See the proposal'), { icone: 'ArrowRight', taille: 12.5, rx: 8 });
    apres += texte(106, 615, t('Changer moi-même', 'Change it myself'), { taille: 13.5, couleur: APP.muted, poids: 500 });
    apres += texte(249, 615, t('Mettre de côté', 'Set aside'), { taille: 13.5, couleur: APP.muted, poids: 500 });
    apres += verre(18, 655, 354, 180, { rx: 18, opacite: 0.6 });
    apres += texte(34, 686, t('Comment la veille vérifie', 'How the watch checks'), { taille: 15, couleur: APP.text, poids: 600 });
    apres += `<rect x="34" y="700" width="22" height="22" rx="7" fill="#94A3C4" fill-opacity="0.08" stroke="${APP.line}" stroke-opacity="0.22"/>` + texte(45, 715, '1', { taille: 11, couleur: APP.faint, police: MONO, ancre: 'middle' });
    apres += paragraphe(67, 715, t('Ton appareil calcule l’empreinte SHA-1 de chaque mot de passe.', 'Your device computes the SHA-1 fingerprint of each password.'), { taille: 13, max: 290, couleur: APP.muted, interligne: 18 });
    return { tete, avant, apres };
  }

  /// Agent (11-agent): the rotation waiting for approval, its four steps,
  /// then the top of the kill switch card under it.
  function agentTel() {
    let s = aurore(390, 844, 'agent');
    s += enteteMobile(t('Agent', 'Agent'), {
      actions: ['TerminalWindow', 'MagnifyingGlass', 'Bell'], pointCloche: APP.warn,
      sous: t('Ce qu’il surveille, ce qu’il te propose, et ce qu’il a fait.', 'What it watches, proposes and has done.'),
    });
    s += `<circle cx="24" cy="105" r="3" fill="${APP.warn}"/>` + sourcil(39, 109.5, t('EN ATTENTE DE TON ACCORD', 'WAITING FOR YOUR GO-AHEAD'));
    s += verre(18, 122, 354, 574, { rx: 18, opacite: 0.7 });
    s += monogramme('Netflix', 34, 138, 44);
    s += texte(91, 154, t('Changer le mot de passe de Netflix', 'Change the Netflix password'), { taille: 14.5, couleur: APP.text, poids: 600 });
    s += texte(91, 174, t('Proposée à l’instant, après une fuite.', 'Proposed just now, after a breach.'), { taille: 12.5, couleur: APP.muted });
    s += `<rect x="34" y="197" width="322" height="55" rx="11" fill="${APP.warn}" fill-opacity="0.1"/>` + icone('WarningCircle', 45, 207, 18, APP.warnText);
    s += paragraphe(71, 220, t('Le mot de passe actuel est apparu dans une fuite connue. Plus vite il change, mieux c’est.',
      'The current password showed up in a known breach. The sooner it changes, the better.'), { taille: 12.5, max: 276, couleur: APP.text, interligne: 18 });
    s += sourcil(34, 278, t('CE QUE L’AGENT FERA', 'WHAT THE AGENT WILL DO'));
    etapesAgent().forEach(([n, titre, phrase], i) => {
      const y = 287 + i * 83;
      s += `<rect x="34" y="${y}" width="322" height="76" rx="12" fill="${APP.glass2}" fill-opacity="0.55" stroke="${APP.line}" stroke-opacity="0.12"/>`;
      s += texte(46, y + 25, n, { taille: 11, couleur: APP.violetText, police: MONO, poids: 600 });
      s += texte(72, y + 26, titre, { taille: 14, couleur: APP.text, poids: 600 });
      s += paragraphe(72, y + 45, phrase, { taille: 12.5, max: 272, couleur: APP.muted, interligne: 18 });
    });
    s += ligne(18, 630, 372, 630, 0.12);
    s += `<rect x="30" y="642" width="120" height="41" rx="10" fill="none" stroke="${APP.line}" stroke-opacity="0.22"/>`;
    s += icone('X', 51, 653, 18, APP.text) + texte(76, 668, t('Refuser', 'Refuse'), { taille: 14.5, couleur: APP.text, poids: 500 });
    s += boutonPrimaire(158, 642, 202, 41, t('Approuver', 'Approve'), { icone: 'Check', taille: 14.5, touche: t('Entrée', 'Enter') });
    s += verre(18, 714, 354, 120, { rx: 18, opacite: 0.7 });
    s += `<circle cx="64" cy="770" r="30" fill="#94A3C4" fill-opacity="0.07"/>` + orbe(64, 770, 40);
    s += sourcil(110, 738, 'KILL SWITCH') + sourcil(110 + largeur('KILL SWITCH', 11, { poids: 600 }) + 22, 738, t('EN MARCHE', 'RUNNING'), { couleur: APP.ok });
    s += texte(110, 763, t('L’agent veille', 'The agent is watching'), { taille: 21, couleur: APP.text, poids: 700 });
    s += ongletsBas('agent', { badges: { fuites: 1, agent: 1 } });
    return s;
  }
  /// The four steps of a rotation, as the Agent screen words them for a
  /// site outside the allowlist (the case of the screenshots).
  function etapesAgent() {
    return [
      ['01', t('Générer', 'Generate'), t('Un mot de passe neuf de 24 caractères, gardé en révision en attente.', 'A new 24-character password, kept as a pending revision.')],
      ['02', t('Changer', 'Change'), t('Ce site n’est pas dans l’allowlist : tu feras le changement toi-même, guidé.', 'This site is not on the allowlist: you will make the change yourself, guided.')],
      ['03', t('Prouver', 'Prove'), t('Reconnexion avec le nouveau : l’ancien doit être refusé.', 'Sign in again with the new one: the old one must be refused.')],
      ['04', t('Valider', 'Confirm'), t('La révision devient la bonne. Sinon, retour à l’ancien.', 'The revision becomes the right one. If not, back to the old one.')],
    ];
  }

  /// Codes (08b-codes), without the code itself and its countdown: the
  /// tour draws those, second by second.
  function codesTel() {
    let s = aurore(390, 844, 'calm');
    s += enteteMobile(t('Codes 2FA', '2FA codes'), {
      actions: ['MagnifyingGlass', 'Bell'],
      sous: t('Calculés ici, même hors ligne. Touche un code pour le copier.', 'Computed here, even offline. Tap a code to copy it.'),
    });
    s += champ(18, 120, 354, t('Chercher un code', 'Search a code'), { icone: 'MagnifyingGlass', touche: '/', h: 38 });
    s += verre(18, 170, 354, 44, { rx: 14, opacite: 0.6 });
    s += verre(18, 233, 354, 164, { rx: 18, opacite: 0.7 });
    s += monogramme('Netflix', 34, 249, 36);
    s += texte(82, 263, 'Netflix', { taille: 15, couleur: APP.text, poids: 500 });
    s += texte(82, 281, 'tristan@exemple.fr', { taille: 12.5, couleur: APP.faint });
    s += icone('ArrowSquareOut', 337, 252, 18, APP.muted);
    s += icone('Copy', 298, 306, 18, APP.muted);
    s += ligne(34, 347, 356, 347, 0.12);
    s += puceZone(34, 359, 'agent', { taille: 12, h: 24 }).svg;
    s += texte(356, 375, t('Le serveur peut aussi le calculer', 'The server can compute it too'), { taille: 12.5, couleur: APP.muted, ancre: 'end' });
    s += `<rect x="18.5" y="408.5" width="353" height="119" rx="18" fill="none" stroke="${APP.line}" stroke-opacity="0.22" stroke-dasharray="4 4"/>`;
    s += icone('QrCode', 185, 445, 20, APP.muted);
    s += texte(195, 488, t('Importer depuis Authenticator', 'Import from Authenticator'), { taille: 13.5, couleur: APP.muted, ancre: 'middle' });
    s += paragraphe(22, 560, t('1 code est dans la zone agent : le serveur peut les calculer aussi, c’est ce qui lui permet de se reconnecter à ta place.',
      '1 code is in the agent zone: the server can compute these too, which is what lets it sign in for you.'), { taille: 13, max: 346, couleur: APP.muted, interligne: 18 });
    s += ongletsBas('codes');
    return s;
  }

  // ================================================================= desktop

  /// The window around a desktop screen: the light, then [contenu], then
  /// the sidebar, the title bar and the status bar over it.
  const fondBureau = (humeur = 'leak', cycle = 10) => aurore(1280, 800, humeur, { cycle, opacite: 0.38, hauteur: 520 });
  /// The chrome over a desktop screen: sidebar, title bar, status bar.
  function chromeBureau({ actif = 'coffre', eteint = false, reglages = false } = {}) {
    let s = barreLaterale(actif, eteint ? { agentEteint: true, agentMot: t('Agent arrêté', 'Agent stopped'), agentSous: t('Kill switch enclenché', 'Kill switch engaged') } : {});
    if (reglages) {
      s += `<rect x="9" y="701" width="229" height="33" rx="8" fill="${APP.glassHi}" fill-opacity="0.7" stroke="${APP.line}" stroke-opacity="0.16"/>`;
      s += icone('SlidersHorizontal', 19, 708, 18, APP.accentText, 'fill') + texte(46, 722, t('Réglages', 'Settings'), { taille: 14, couleur: APP.text, poids: 500 });
    }
    s += barreTitre({ point: APP.warn });
    s += barreEtat([
      [eteint ? APP.faint : APP.ok, eteint ? t('Agent arrêté', 'Agent stopped') : t('Agent actif', 'Agent active'), null],
      [null, t('Veille', 'Watch'), t('il y a 2 minutes', '2 minutes ago')],
      [APP.warn, t('Santé', 'Health'), '67'],
      [null, t('1 rotation en attente', '1 rotation pending'), null],
    ]);
    return s;
  }
  /// The heading of a desktop screen: title, then its sentence.
  const titreBureau = (titre, phrase) =>
    texte(286, 92, titre, { taille: 31, couleur: APP.text, poids: 700, espace: -0.6 }) +
    texte(286, 119, phrase, { taille: 14, couleur: APP.muted });

  /// The Agent screen of the desktop app (20-bureau-agent), running or
  /// stopped (20b). Returns the parts that change apart.
  function agentBureau() {
    let fixe = titreBureau(t('Agent', 'Agent'), t('Ce qu’il surveille, ce qu’il te propose, et ce qu’il a fait.', 'What it watches, proposes and has done.'));
    fixe += bouton(1100, 96, 143, 34, t('Voir le journal', 'See the log'), { icone: 'TerminalWindow', taille: 13 });
    // The kill switch card, its frame.
    fixe += verre(286, 140, 414, 244, { rx: 16, opacite: 0.72 });
    fixe += `<circle cx="336" cy="190" r="30" fill="#94A3C4" fill-opacity="0.07"/>`;
    fixe += sourcil(384, 174, 'KILL SWITCH');
    fixe += `<rect x="304" y="244" width="378" height="50" rx="14" fill="#94A3C4" fill-opacity="0.06" stroke="${APP.line}" stroke-opacity="0.12"/>`;
    fixe += paragraphe(304, 350, t('Ce switch est relu avant chaque action : coupé, l’agent s’arrête net. Tes entrées ne changent pas.',
      'This switch is read again before every action: off, the agent stops dead. Your entries do not change.'), { taille: 12.5, max: 376, couleur: APP.muted, interligne: 18 });
    // Activity over 24 hours, and the counters.
    fixe += verre(718, 140, 525, 244, { rx: 16, opacite: 0.72 });
    fixe += sourcil(738, 170, t('ACTIVITÉ · 24 H', 'ACTIVITY · 24 H'), { couleur: APP.muted });
    let lx = 1225;
    [[t('Veille', 'Watch'), 'ring'], [t('Proposition', 'Proposal'), APP.warn], [t('Fuite', 'Breach'), APP.crit], [t('Rotation', 'Rotation'), APP.ok]].forEach(([m, c]) => {
      const w = largeur(m, 11.5);
      fixe += texte(lx, 170, m, { taille: 11.5, couleur: APP.muted, ancre: 'end' });
      fixe += c === 'ring' ? `<circle cx="${lx - w - 9}" cy="166" r="3.5" fill="none" stroke="${APP.muted}"/>` : `<circle cx="${lx - w - 9}" cy="166" r="3.5" fill="${c}"/>`;
      lx -= w + 26;
    });
    fixe += ligne(738, 224, 1222, 224, 0.3);
    for (let i = 0; i <= 24; i++) fixe += ligne(738 + i * 20.2, 220, 738 + i * 20.2, 228, 0.22);
    ['00h', '06h', '12h', '18h'].forEach((h, i) => { fixe += texte(795 + i * 134, 250, h, { taille: 10.5, couleur: APP.faint, police: MONO, ancre: 'middle' }); });
    fixe += texte(1222, 250, '20:40', { taille: 10.5, couleur: APP.accentText, police: MONO, poids: 600, ancre: 'end' });
    fixe += `<path d="M1222 217 L1229 224 L1222 231 L1215 224 Z" fill="${APP.warn}"/>`;
    fixe += `<rect x="738" y="276" width="487" height="62" rx="12" fill="none" stroke="${APP.line}" stroke-opacity="0.16"/>`;
    [[t('SURVEILLÉES', 'WATCHED'), '1', t('entrées', 'entries')], [t('ROTATIONS 30 J', 'ROTATIONS 30 D'), '0'], [t('EN ATTENTE', 'PENDING'), '1', null, APP.warnText], [t('ÉCHECS 30 J', 'FAILURES 30 D'), '0']].forEach(([m, v, u, c], i) => {
      const x = 738 + i * 121.75;
      if (i) fixe += ligne(x, 276, x, 338, 0.16);
      fixe += sourcil(x + 13, 298, m, { taille: 10, couleur: APP.muted });
      fixe += texte(x + 13, 327, v, { taille: 22, couleur: c || APP.text, poids: 600 });
      if (u) fixe += texte(x + 30, 326, u, { taille: 11, couleur: APP.muted });
    });
    // The rotation waiting for approval.
    fixe += `<circle cx="292" cy="410" r="3" fill="${APP.warn}"/>` + sourcil(304, 414, t('EN ATTENTE DE TON ACCORD', 'WAITING FOR YOUR GO-AHEAD'), { couleur: APP.muted });
    fixe += texte(1243, 414, t('Rien ne bouge tant que tu n’as pas répondu', 'Nothing moves until you answer'), { taille: 11.5, couleur: APP.faint, ancre: 'end' });
    fixe += verre(286, 428, 957, 330, { rx: 16, opacite: 0.72 });
    fixe += monogramme('Netflix', 304, 446, 40);
    fixe += texte(356, 462, t('Changer le mot de passe de Netflix', 'Change the Netflix password'), { taille: 15, couleur: APP.text, poids: 600 });
    fixe += texte(356, 482, t('Proposée il y a 2 minutes, après une fuite.', 'Proposed 2 minutes ago, after a breach.'), { taille: 12.5, couleur: APP.muted });
    const pa = t('En attente de ton accord', 'Waiting for your go-ahead');
    const pl = largeur(pa, 12, { poids: 500 }) + 18;
    fixe += `<rect x="${1225 - pl}" y="452" width="${pl}" height="22" rx="8" fill="${APP.violet}" fill-opacity="0.15"/>` + texte(1225 - pl / 2, 467, pa, { taille: 12, couleur: APP.violetText, poids: 500, ancre: 'middle' });
    fixe += `<rect x="304" y="498" width="921" height="34" rx="10" fill="${APP.warn}" fill-opacity="0.1"/>` + icone('WarningCircle', 316, 507, 16, APP.warnText);
    fixe += texte(341, 520, t('Le mot de passe actuel est apparu dans une fuite connue. Plus vite il change, mieux c’est.', 'The current password showed up in a known breach. The sooner it changes, the better.'), { taille: 12.5, couleur: APP.text });
    fixe += sourcil(304, 558, t('CE QUE L’AGENT FERA', 'WHAT THE AGENT WILL DO'), { couleur: APP.muted });
    etapesAgent().forEach(([n, titre, phrase], i) => {
      const x = 304 + i * 232;
      fixe += `<rect x="${x}" y="568" width="224" height="98" rx="12" fill="${APP.glass2}" fill-opacity="0.55" stroke="${APP.line}" stroke-opacity="0.12"/>`;
      fixe += texte(x + 13, 590, n, { taille: 10.5, couleur: APP.violetText, police: MONO, poids: 600 });
      fixe += texte(x + 13, 612, titre, { taille: 14, couleur: APP.text, poids: 600 });
      fixe += paragraphe(x + 13, 632, phrase, { taille: 12, max: 198, couleur: APP.muted, interligne: 17 });
    });
    fixe += ligne(286, 682, 1243, 682, 0.12);
    fixe += icone('X', 988, 704, 15, APP.text) + texte(1010, 716, t('Refuser', 'Refuse'), { taille: 13.5, couleur: APP.text, poids: 500 });

    // Running: the violet orb, "EN MARCHE", the switch on its left half.
    let marche = orbe(336, 190, 40);
    marche += sourcil(384 + largeur('KILL SWITCH', 11, { poids: 600 }) + 12, 174, t('EN MARCHE', 'RUNNING'), { couleur: APP.ok });
    marche += texte(384, 200, t('L’agent veille', 'The agent is watching'), { taille: 21, couleur: APP.text, poids: 700 });
    marche += texte(384, 223, t('Il surveille 1 entrée confiée et prépare les rotations.', 'It watches 1 handed-over entry and prepares rotations.'), { taille: 12.5, couleur: APP.muted });
    marche += sourcil(304, 318, t('MAINTIENS 1 S POUR ARRÊTER', 'HOLD 1 S TO STOP'), { taille: 10, couleur: APP.faint, police: MONO });
    marche += icone('Clock', 304, 704, 15, APP.muted) + texte(326, 716, t('Rien ne bouge tant que tu n’as pas répondu.', 'Nothing moves until you answer.'), { taille: 12.5, couleur: APP.muted });
    marche += boutonPrimaire(1067, 699, 158, 34, t('Approuver', 'Approve'), { icone: 'Check', taille: 13, touche: t('Entrée', 'Enter'), rx: 9 });

    // Stopped: the grey orb, "ARRÊTÉ", approval off.
    let arret = orbe(336, 190, 40, { eteint: true });
    arret += sourcil(384 + largeur('KILL SWITCH', 11, { poids: 600 }) + 12, 174, t('ARRÊTÉ', 'STOPPED'), { couleur: APP.warnText });
    arret += texte(384, 200, t('L’agent est arrêté', 'The agent is stopped'), { taille: 21, couleur: APP.text, poids: 700 });
    arret += paragraphe(384, 223, t('Kill switch enclenché à l’instant. Plus aucune veille ni rotation.', 'Kill switch engaged just now. No more watching, no more rotations.'), { taille: 12.5, max: 298, couleur: APP.muted, interligne: 18 });
    arret += sourcil(304, 318, t('MAINTIENS 1 S POUR RELANCER', 'HOLD 1 S TO RESTART'), { taille: 10, couleur: APP.faint, police: MONO });
    arret += icone('HandPalm', 304, 704, 15, APP.muted) + texte(326, 716, t('Relance l’agent pour approuver.', 'Restart the agent to approve.'), { taille: 12.5, couleur: APP.muted });
    arret += `<rect x="1067" y="699" width="158" height="34" rx="9" fill="${APP.glass2}" fill-opacity="0.5" stroke="${APP.line}" stroke-opacity="0.16"/>`;
    arret += icone('Check', 1084, 708, 15, APP.faint) + texte(1106, 721, t('Approuver', 'Approve'), { taille: 13, couleur: APP.faint, poids: 600 });
    arret += kbd(1106 + largeur(t('Approuver', 'Approve'), 13, { poids: 600 }) + 10, 707, t('Entrée', 'Enter'), { h: 18, taille: 10.5 }).svg;
    return { fixe, marche, arret };
  }
  /// The hold switch's two labels, and its sliding thumb (drawn by the tour).
  function interrupteur() {
    const m = t('MARCHE', 'ON'), a = t('ARRÊT', 'OFF');
    return {
      libelles: texte(398, 274, m, { taille: 11, couleur: APP.muted, police: MONO, poids: 600, espace: 1.1, ancre: 'middle' }) +
        texte(588, 274, a, { taille: 11, couleur: APP.muted, police: MONO, poids: 600, espace: 1.1, ancre: 'middle' }),
      pouce: (actif) => `<rect x="309" y="249" width="180" height="40" rx="10" fill="${APP.panel}" stroke="${APP.line}" stroke-opacity="0.22" filter="url(#ombreFlottante)"/>
        ${icone('Power', 399 - largeur(actif ? m : a, 11, { police: MONO }) / 2 - 20, 261, 14, actif ? APP.ok : APP.text)}
        ${texte(399 + 4, 274, actif ? m : a, { taille: 11, couleur: APP.text, police: MONO, poids: 600, espace: 1.1, ancre: 'middle' })}`,
    };
  }

  /// The vault of the desktop app (31-appli-coffre): the list, and the
  /// Bank entry open on the right.
  function coffreBureau() {
    let s = texte(286, 92, t('Coffre', 'Vault'), { taille: 31, couleur: APP.text, poids: 700, espace: -0.6 });
    s += `<circle cx="291" cy="112" r="3.5" fill="${APP.warn}"/>` + texte(302, 117, t('Une chose demande ton attention.', 'One thing needs your attention.'), { taille: 14, couleur: APP.text, poids: 500 });
    s += texte(286, 140, t('Netflix est apparu dans une fuite : l’agent attend ton accord pour le changer.', 'Netflix showed up in a breach: the agent is waiting for your go-ahead to change it.'), { taille: 13.5, couleur: APP.warnText });
    s += bouton(901, 111, 107, 34, t('Importer', 'Import'), { icone: 'DownloadSimple', taille: 13.5 });
    s += boutonPrimaire(1016, 111, 227, 34, t('Nouvelle entrée', 'New entry'), { icone: 'Plus', taille: 13.5, touche: 'Ctrl N', rx: 9 });
    // The list.
    s += verre(286, 168, 380, 584, { rx: 16, opacite: 0.72 });
    s += champ(298, 180, 355, t('Filtrer le coffre', 'Filter the vault'), { icone: 'MagnifyingGlass', touche: '/', h: 38, taille: 14 });
    s += segmente(298, 228, 355, [[t('Tout', 'All'), 3], [t('Toi', 'You'), 2], [t('Agent', 'Agent'), 1]], 0, { h: 34 });
    s += ligne(286, 275, 666, 275, 0.1);
    s += enteteZone(302, 302, 348, 'toi', 2, { taille: 13 });
    s += ligneEntree(292, 311, 368, ENTREES.banque, { h: 52, choisi: true, chevron: false, taille: 14 });
    s += ligneEntree(292, 363, 368, ENTREES.spotify, { h: 52, chevron: false, taille: 14 });
    s += enteteZone(302, 441, 348, 'agent', 1, { taille: 13 });
    s += ligneEntree(292, 450, 368, ENTREES.netflix, { h: 52, chevron: false, taille: 14,
      droite: [['Warning', APP.warn], ['ClockCountdown', APP.faint]] });
    s += `<circle cx="586" cy="476" r="4" fill="${APP.violet}"/>`;
    s += ligne(286, 718, 666, 718, 0.1);
    let hx = 300;
    [[['↑', '↓'], t('naviguer', 'browse')], [[t('Entrée', 'Enter')], t('ouvrir', 'open')], [['Ctrl', 'C'], t('copier', 'copy')]].forEach(([k, m]) => {
      const r = touches(hx, 727, k, { h: 18, taille: 10.5 });
      s += r.svg + texte(hx + r.l + 8, 740, m, { taille: 12, couleur: APP.muted });
      hx += r.l + 8 + largeur(m, 12) + 20;
    });
    // The Bank entry.
    s += verre(684, 168, 559, 584, { rx: 16, opacite: 0.72 });
    s += monogramme(ENTREES.banque.nom, 712, 194, 54, { cle: 'Banque' });
    s += texte(781, 216, ENTREES.banque.nom, { taille: 26, couleur: APP.text, poids: 700, espace: -0.4 });
    s += puceZone(781, 229, 'toi', { taille: 12, h: 22 }).svg;
    s += icone('Globe', 908, 233, 14, APP.muted) + texte(927, 245, 'banque.fr', { taille: 13, couleur: APP.muted });
    s += bouton(1112, 204, 103, 34, t('Modifier', 'Edit'), { icone: 'PencilSimple', taille: 13.5 });
    s += `<rect x="712" y="270" width="503" height="184" rx="14" fill="${APP.glass2}" fill-opacity="0.35" stroke="${APP.line}" stroke-opacity="0.12"/>`;
    s += texte(728, 302, t('Identifiant', 'Username'), { taille: 13, couleur: APP.muted }) + texte(889, 303, 'tristan.j', { taille: 14.5, couleur: APP.text, poids: 500 }) + icone('Copy', 1183, 290, 17, APP.muted);
    s += ligne(712, 327, 1215, 327, 0.1);
    s += texte(728, 366, t('Mot de passe', 'Password'), { taille: 13, couleur: APP.muted });
    s += texte(889, 354, '• • • • • • • • • • • • • • • •', { taille: 10, couleur: APP.muted, espace: 1.4 });
    s += force(889, 374, 4, { l: 97 }) + texte(995, 381, t('Robuste, 18 caractères', 'Strong, 18 characters'), { taille: 12.5, couleur: APP.muted });
    s += icone('Eye', 1150, 354, 19, APP.muted) + icone('Copy', 1183, 355, 17, APP.muted);
    s += ligne(712, 397, 1215, 397, 0.1);
    s += texte(728, 430, 'Site', { taille: 13, couleur: APP.muted }) + texte(889, 430, 'banque.fr', { taille: 14.5, couleur: APP.accentText }) + icone('ArrowSquareOut', 1183, 417, 17, APP.muted);
    s += `<rect x="712" y="474" width="503" height="164" rx="14" fill="${APP.glass2}" fill-opacity="0.35" stroke="${APP.line}" stroke-opacity="0.12"/>`;
    s += `<rect x="731" y="492" width="30" height="30" rx="8" fill="${APP.accent}" fill-opacity="0.15"/>` + icone('ShieldCheck', 737, 498, 18, APP.accentText);
    s += texte(770, 513, t('Protégé par toi', 'Protected by you'), { taille: 15, couleur: APP.text, poids: 600 });
    s += paragraphe(731, 544, t('Chiffré avec ta clé, qui ne quitte jamais tes appareils. L’agent te prévient en cas de fuite mais ne lit rien ici.',
      'Encrypted with your key, which never leaves your devices. The agent warns you of a breach but reads nothing here.'), { taille: 13.5, max: 466, couleur: APP.muted, interligne: 21 });
    s += bouton(731, 585, 157, 34, t('Confier à l’agent', 'Hand to the agent'), { icone: 'Sparkle', taille: 13.5 });
    s += `<rect x="712" y="658" width="503" height="66" rx="14" fill="${APP.glass2}" fill-opacity="0.35" stroke="${APP.line}" stroke-opacity="0.12"/>`;
    s += `<rect x="728" y="675" width="30" height="30" rx="8" fill="${APP.accent}" fill-opacity="0.15"/>` + icone('ArrowsClockwise', 734, 681, 18, APP.accentText);
    s += texte(769, 686, t('Aucun rappel', 'No reminder'), { taille: 14.5, couleur: APP.text, poids: 500 });
    s += texte(769, 705, t('Régler un rappel pour le changer', 'Set a reminder to change it'), { taille: 12.5, couleur: APP.muted });
    s += icone('CaretDown', 1181, 682, 17, APP.muted);
    return s;
  }

  /// The command palette (32-appli-palette), open and empty.
  function paletteBureau() {
    let s = `<rect x="0" y="37" width="1280" height="763" fill="#03050A" fill-opacity="0.72"/>`;
    s += `<rect x="330" y="126" width="620" height="560" rx="16" fill="${APP.panel}" fill-opacity="0.98" stroke="${APP.line}" stroke-opacity="0.18" filter="url(#ombreFlottante)"/>`;
    s += icone('MagnifyingGlass', 344, 141, 20, APP.muted);
    s += ligne(330, 178, 950, 178, 0.12);
    s += kbd(888, 142, t('Échap', 'Esc'), { h: 19 }).svg;
    s += sourcil(345, 202, 'SUGGESTIONS');
    const rangee = (y, ic, mot, { indice = null, keys = null, choisi = false, tuile = false } = {}) => {
      let r = '';
      if (choisi) r += `<rect x="337" y="${y}" width="606" height="42" rx="9" fill="${APP.glassHi}" fill-opacity="0.8" stroke="${APP.line}" stroke-opacity="0.2"/>`;
      if (tuile) r += `<rect x="345" y="${y + 8}" width="26" height="26" rx="7" fill="${APP.accent}" fill-opacity="0.2"/>`;
      r += icone(ic, 350, y + 13, 16, tuile ? APP.accentText : APP.muted);
      r += texte(382, y + 26, mot, { taille: 14.5, couleur: APP.text });
      if (indice) r += texte(382 + largeur(mot, 14.5) + 12, y + 25.5, indice, { taille: 12.5, couleur: APP.faint });
      if (keys) { const k = touches(0, 0, keys, { h: 18, taille: 10.5 }); r += touches(935 - k.l, y + 12, keys, { h: 18, taille: 10.5 }).svg; }
      return r;
    };
    s += rangee(210, 'Sparkle', t('Examiner 1 rotation en attente', 'Review 1 pending rotation'), { indice: t('L’agent attend ton accord', 'The agent is waiting for your go-ahead'), choisi: true, tuile: true });
    s += rangee(252, 'Target', t('Voir 1 compte à surveiller', 'See 1 account to watch'));
    s += sourcil(345, 312, 'ACTIONS');
    [['Plus', t('Nouvelle entrée', 'New entry'), ['Ctrl', 'N']], ['MagicWand', t('Générer un mot de passe', 'Generate a password')],
      ['LockSimple', t('Verrouiller le coffre', 'Lock the vault'), ['Ctrl', 'L']], ['Sun', t('Passer en thème clair', 'Switch to light theme')],
      ['SlidersHorizontal', t('Réglages', 'Settings'), ['Ctrl', ',']], ['Bell', t('Notifications', 'Notifications')],
      ['Scroll', t('Journal d’activité', 'Activity log')]].forEach(([ic, m, k], i) => { s += rangee(320 + i * 42, ic, m, { keys: k }); });
    s += ligne(330, 614, 950, 614, 0.12);
    s += pied(645, [[['↑', '↓'], t('choisir', 'choose')], [[t('Entrée', 'Enter')], t('lancer', 'run')]]);
    return s;
  }
  /// The palette once "net" is typed (18c): one entry left.
  function paletteRecherche() {
    let s = `<rect x="0" y="37" width="1280" height="763" fill="#03050A" fill-opacity="0.72"/>`;
    s += `<rect x="330" y="126" width="620" height="172" rx="16" fill="${APP.panel}" fill-opacity="0.98" stroke="${APP.line}" stroke-opacity="0.18" filter="url(#ombreFlottante)"/>`;
    s += icone('MagnifyingGlass', 344, 141, 20, APP.muted);
    s += texte(374, 157, 'net', { taille: 16, couleur: APP.text });
    s += kbd(888, 142, t('Échap', 'Esc'), { h: 19 }).svg;
    s += ligne(330, 178, 950, 178, 0.12);
    s += sourcil(345, 202, t('ENTRÉES', 'ENTRIES'));
    s += `<rect x="337" y="210" width="606" height="42" rx="9" fill="${APP.glassHi}" fill-opacity="0.8" stroke="${APP.line}" stroke-opacity="0.2"/>`;
    s += monogramme('Netflix', 345, 218, 26);
    s += `<text x="382" y="236" font-family="${O.SANS}" font-size="14.5" font-weight="600" fill="${APP.accentText}">Net<tspan fill="${APP.text}" font-weight="500">flix</tspan></text>`;
    s += texte(382 + largeur('Netflix', 14.5, { poids: 600 }) + 12, 235.5, 'tristan@exemple.fr', { taille: 12.5, couleur: APP.faint });
    s += kbd(935 - 48, 222, t('Entrée', 'Enter'), { h: 18, taille: 10.5 }).svg;
    s += ligne(330, 262, 950, 262, 0.12);
    s += pied(274, [[['↑', '↓'], t('choisir', 'choose')], [[t('Entrée', 'Enter')], t('ouvrir', 'open')], [['Ctrl', t('Entrée', 'Enter')], t('copier le mot de passe', 'copy the password')]]);
    return s;
  }
  /// The foot of the palette: hints on the left, "Ctrl K close" on the right.
  function pied(y, liste) {
    let s = '', x = 345;
    liste.forEach(([k, m]) => {
      const r = touches(x, y, k, { h: 18, taille: 10.5 });
      s += r.svg + texte(x + r.l + 8, y + 13, m, { taille: 12.5, couleur: APP.muted });
      x += r.l + 8 + largeur(m, 12.5) + 18;
    });
    const f = t('fermer', 'close');
    const lf = largeur(f, 12.5);
    const k = touches(0, 0, ['Ctrl', 'K'], { h: 18, taille: 10.5 });
    s += touches(935 - lf - 8 - k.l, y, ['Ctrl', 'K'], { h: 18, taille: 10.5 }).svg + texte(935, y + 13, f, { taille: 12.5, couleur: APP.muted, ancre: 'end' });
    return s;
  }

  /// Settings, Import and export (22b-bureau-import, in the desktop app's
  /// layout). [apercu]: the preview of a Google file about to be imported.
  function importBureau({ apercu = false } = {}) {
    let s = titreBureau(t('Réglages', 'Settings'), t('Ce coffre, ses appareils et la façon dont il se protège.', 'This vault, its devices and the way it protects itself.'));
    const nav = [
      [t('CET APPAREIL', 'THIS DEVICE')], ['LockSimple', t('Verrouillage', 'Lock')], ['PencilSimple', t('Apparence', 'Appearance')],
      [t('COFFRE', 'VAULT')], ['Binoculars', t('Veille', 'Watch')], ['ArrowsLeftRight', t('Import et export', 'Import and export'), true],
      ['Trash', t('Corbeille', 'Bin')], ['TerminalWindow', t('Journal', 'Log')],
      [t('COMPTE', 'ACCOUNT')], ['Key', t('Kit de récupération', 'Recovery kit')], ['Devices', t('Appareils', 'Devices')],
      ['UserCircle', t('Compte', 'Account')], ['Info', t('À propos', 'About')],
    ];
    let y = 150;
    nav.forEach(([a, b, choisi]) => {
      if (b === undefined) { s += sourcil(295, y + 4, a); y += 22; return; }
      if (choisi) s += `<rect x="286" y="${y - 3}" width="228" height="33" rx="8" fill="${APP.glassHi}" fill-opacity="0.7" stroke="${APP.line}" stroke-opacity="0.16"/>`;
      s += icone(a, 295, y + 5, 16, choisi ? APP.text : APP.muted) + texte(321, y + 18, b, { taille: 14, couleur: choisi ? APP.text : APP.muted, poids: choisi ? 500 : 400 });
      y += 35;
      if (b === t('Apparence', 'Appearance') || b === t('Journal', 'Log')) y += 8;
    });
    s += `<rect x="555" y="146" width="34" height="34" rx="9" fill="${APP.accent}" fill-opacity="0.14"/>` + icone('ArrowsLeftRight', 563, 154, 18, APP.accentText);
    s += texte(600, 161, t('Import et export', 'Import and export'), { taille: 16.5, couleur: APP.text, poids: 600 });
    s += texte(600, 179, t('Faire entrer tes mots de passe, en garder une copie chiffrée.', 'Bring your passwords in, keep an encrypted copy.'), { taille: 12.5, couleur: APP.muted });
    const hI = apercu ? 342 : 216;
    s += verre(551, 204, 692, hI, { rx: 16, opacite: 0.72 });
    s += texte(571, 234, t('Importer', 'Import'), { taille: 15, couleur: APP.text, poids: 600 });
    s += paragraphe(571, 257, t('Le fichier est lu et chiffré sur cet appareil : son contenu en clair ne part jamais vers le serveur. Tout arrive dans « Protégé par toi ».',
      'The file is read and encrypted on this device: its plain content never goes to the server. Everything lands in “Protected by you”.'), { taille: 12.5, max: 650, couleur: APP.muted, interligne: 18 });
    [['FileCsv', t('Mots de passe Google', 'Google passwords'), t('Fichier .csv exporté de Chrome', '.csv file exported from Chrome')],
      ['QrCode', 'Google Authenticator', t('Le lien du QR code de transfert', 'The link of the transfer QR code')],
      ['Vault', 'Bitwarden', t('Export .json non chiffré', 'Unencrypted .json export')]].forEach(([ic, a, b], i) => {
      const x = 571 + i * 221;
      s += `<rect x="${x}" y="298" width="211" height="100" rx="12" fill="${APP.glass2}" fill-opacity="0.55" stroke="${APP.line}" stroke-opacity="0.16"/>`;
      s += `<rect x="${x + 14}" y="313" width="30" height="30" rx="8" fill="${APP.accent}" fill-opacity="0.14"/>` + icone(ic, x + 21, 320, 16, APP.accentText);
      s += texte(x + 14, 365, a, { taille: 13.5, couleur: APP.text, poids: 500 }) + texte(x + 14, 383, b, { taille: 11.5, couleur: APP.faint });
    });
    if (apercu) {
      s += `<rect x="571" y="412" width="652" height="118" rx="12" fill="#94A3C4" fill-opacity="0.07"/>`;
      s += texte(586, 437, t('3 entrées prêtes à importer. Tout arrivera dans « Protégé par toi ».', '3 entries ready to import. Everything will land in “Protected by you”.'), { taille: 14, couleur: APP.text });
      s += bouton(586, 451, 307, 36, t('Annuler', 'Cancel'), { taille: 14 });
      s += boutonPrimaire(901, 451, 307, 36, t('Importer', 'Import'), { taille: 14 });
      s += texte(586, 512, t('Pense à supprimer le fichier d’export de ton disque ensuite.', 'Remember to delete the export file from your disk afterwards.'), { taille: 12.5, couleur: APP.muted });
    }
    const yE = 204 + hI + 16;
    s += verre(551, yE, 692, 250, { rx: 16, opacite: 0.72 });
    s += texte(571, yE + 30, t('Exporter', 'Export'), { taille: 15, couleur: APP.text, poids: 600 });
    s += paragraphe(571, yE + 53, t('Un fichier chiffré par une phrase de passe que tu choisis ici, produit sur cet appareil. Les deux zones y sont, chacune marquée.',
      'A file encrypted with a passphrase you choose here, made on this device. Both zones are in it, each one marked.'), { taille: 12.5, max: 650, couleur: APP.muted, interligne: 18 });
    s += champ(571, yE + 84, 548, '', { label: t('Phrase de passe de l’export', 'Export passphrase'), oeil: true, h: 40 });
    s += bouton(1127, yE + 106, 96, 40, t('Exporter', 'Export'), { icone: 'DownloadSimple', taille: 13.5 });
    return s;
  }

  /// The unlock screen of the desktop app, after Ctrl L: the same card as
  /// on the phone, in the middle of the night (30-appli-connexion).
  function verrouBureau() {
    let s = `<rect width="1280" height="800" fill="${APP.bg}"/>`;
    s += `<circle cx="640" cy="110" r="130" fill="${APP.accent}" opacity="0.14" filter="url(#flou36)"/>`;
    s += `<g transform="translate(0 40)">${rubans(1280, 620, { amplitude: 150 })}</g>`;
    s += `<path d="M1160 18.5 H1170" stroke="${APP.muted}" stroke-width="1.2"/><rect x="1206" y="13.5" width="10" height="10" fill="none" stroke="${APP.muted}" stroke-width="1.2"/><path d="M1253 13.5 L1263 23.5 M1263 13.5 L1253 23.5" stroke="${APP.muted}" stroke-width="1.2"/>`;
    s += logo(640, 100, 82, { halo: true });
    s += marque(640, 192, 42, { ancre: 'middle' });
    s += texte(640, 250, t('Bon retour, Tristan.', 'Welcome back, Tristan.'), { taille: 23, couleur: APP.text, poids: 700, ancre: 'middle', espace: -0.3 });
    s += texte(640, 277, t('Ton coffre est verrouillé. Tout reste chiffré ici.', 'Your vault is locked. Everything stays encrypted here.'), { taille: 14, couleur: APP.muted, ancre: 'middle' });
    s += verre(440, 306, 400, 172, { rx: 18, opacite: 0.85 });
    s += champ(460, 324, 360, '', { label: t('Mot de passe maître', 'Master password'), focus: true, oeil: true, h: 42 });
    s += `<rect x="460" y="404" width="360" height="42" rx="10" fill="${APP.glass2}" fill-opacity="0.45" stroke="${APP.line}" stroke-opacity="0.12"/>`;
    const mot = t('Déverrouiller', 'Unlock');
    const l = largeur(mot, 15, { poids: 600 }) + 25;
    s += icone('LockOpen', 640 - l / 2, 416, 18, APP.faint) + texte(640 - l / 2 + 25, 430, mot, { taille: 15, couleur: APP.faint, poids: 600 });
    const l1 = t('Oublié ? Utilise ton kit', 'Forgot it? Use your kit'), l2 = t('Changer de compte', 'Switch account');
    const w1 = 22 + largeur(l1, 13.5, { poids: 500 }), w2 = 22 + largeur(l2, 13.5, { poids: 500 });
    const x0 = 640 - (w1 + 24 + w2) / 2;
    s += `<rect x="${x0 - 16}" y="496" width="${w1 + w2 + 56}" height="60" rx="16" fill="${APP.bg}" fill-opacity="0.62"/>`;
    s += icone('Lifebuoy', x0, 505, 17, APP.accentText) + texte(x0 + 22, 518, l1, { taille: 13.5, couleur: APP.accentText, poids: 500 });
    s += icone('ArrowsLeftRight', x0 + w1 + 24, 505, 17, APP.accentText) + texte(x0 + w1 + 46, 518, l2, { taille: 13.5, couleur: APP.accentText, poids: 500 });
    s += texte(640, 543, t('Il se referme seul après 15 min sans activité.', 'It locks itself after 15 min of inactivity.'), { taille: 12, couleur: APP.faint, ancre: 'middle' });
    const pied2 = t('Déchiffré sur cet appareil. Le serveur ne voit que des blocs chiffrés.', 'Decrypted on this device. The server only sees encrypted blocks.');
    const lp = largeur(pied2, 12.5) + 20;
    s += icone('LockSimple', 640 - lp / 2, 760, 13, APP.faint) + texte(640 - lp / 2 + 20, 771, pied2, { taille: 12.5, couleur: APP.faint });
    return s;
  }

  return { sourcil, verrouTel, boutonVerrou, fuitesTel, agentTel, codesTel, fondBureau, chromeBureau, agentBureau, interrupteur, coffreBureau, paletteBureau, paletteRecherche, importBureau, verrouBureau };
};

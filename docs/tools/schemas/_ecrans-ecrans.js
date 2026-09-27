// Screens of the "forms" and "install" diagrams, drawn in app units from
// the real screenshots (serenity-shots/final): phone screens at 390 x 844,
// wide ones at 1280 x 800. Plain SVG, no animation: the diagrams fade them.
//
//   const W = require('./_ecrans-ecrans.js')(O);
//   T.ecran(W.codes())
module.exports = (O) => {
  const { t, texte, paragraphe, icone, verre, monogramme, anneau, puce, puceZone, boutonPrimaire, bouton, boutonIcone,
    champ, segmente, force, aurore, rubans, logo, marque, touches, kbd, enteteMobile, ongletsBas, barreTitre, barreLaterale,
    barreEtat, ENTREES, ligneEntree, enteteZone, largeur, APP, MONO } = O;

  // ---------------------------------------------------------- phone screens

  /// The 2FA codes tab (08b-codes): the Netflix code, handed to the agent.
  function codes() {
    let s = aurore(390, 844, 'calm');
    s += enteteMobile(t('Codes 2FA', '2FA codes'), {
      actions: ['MagnifyingGlass', 'Bell'],
      sous: t('Calculés ici, même hors ligne. Touche un code pour le copier.', 'Computed here, even offline. Tap a code to copy it.'),
    });
    s += champ(18, 120, 354, t('Chercher un code', 'Search a code'), { icone: 'MagnifyingGlass', touche: '/', h: 38 });
    s += verre(18, 170, 354, 44);
    s += `<circle cx="42" cy="192" r="8" fill="none" stroke="${APP.track}" stroke-opacity="0.3" stroke-width="2.2"/>
      <circle cx="42" cy="192" r="8" fill="none" stroke="${APP.warn}" stroke-width="2.2" stroke-dasharray="9 50.3" transform="rotate(-90 42 192)"/>`;
    s += texte(60, 197, t('Nouveaux codes dans 5 s', 'New codes in 5 s'), { taille: 14, couleur: APP.muted });
    s += verre(18, 233, 354, 164);
    s += monogramme('Netflix', 34, 249, 36);
    s += texte(82, 263, 'Netflix', { taille: 15, couleur: APP.text, poids: 500 });
    s += texte(82, 282, 'tristan@exemple.fr', { taille: 12.5, couleur: APP.faint });
    s += icone('ArrowSquareOut', 338, 252, 18, APP.muted);
    s += texte(34, 331, '933  532', { taille: 30, couleur: APP.warn, poids: 500, espace: 1 });
    s += icone('Copy', 298, 306, 18, APP.muted);
    s += `<circle cx="343" cy="316" r="11" fill="none" stroke="${APP.track}" stroke-opacity="0.3" stroke-width="2.2"/>
      <circle cx="343" cy="316" r="11" fill="none" stroke="${APP.warn}" stroke-width="2.2" stroke-dasharray="12 69.1" transform="rotate(-90 343 316)"/>`;
    s += `<line x1="34" y1="347" x2="356" y2="347" stroke="${APP.line}" stroke-opacity="0.12"/>`;
    s += puceZone(34, 359, 'agent', { taille: 12, h: 22 }).svg;
    s += texte(355, 374, t('Le serveur peut aussi le calculer', 'The server can compute it'), { taille: 12, couleur: APP.faint, ancre: 'end' });
    s += `<rect x="18.5" y="409.5" width="353" height="118" rx="14" fill="none" stroke="${APP.line}" stroke-opacity="0.22" stroke-dasharray="4 4"/>`;
    s += icone('QrCode', 185, 446, 20, APP.muted);
    s += texte(195, 489, t('Importer depuis Authenticator', 'Import from Authenticator'), { taille: 14, couleur: APP.muted, ancre: 'middle' });
    s += paragraphe(22, 562, t('1 code est dans la zone agent : le serveur peut les calculer aussi, c’est ce qui lui permet de se reconnecter à ta place.',
      '1 code is in the agent zone: the server can compute it too, which is how it signs in again for you.'), { taille: 13, max: 346, couleur: APP.muted, interligne: 19 });
    s += ongletsBas('codes', { badges: { fuites: 1, agent: 1 } });
    return s;
  }

  /// The sign-in screen of a new device (Login.tsx), phone size.
  function connexionMobile({ identifiant = '', motDePasse = false } = {}) {
    let s = aurore(390, 844, 'calm', { opacite: 0.3 });
    s += rubans(390, 240, { amplitude: 70 });
    s += logo(195, 70, 60, { halo: true });
    s += marque(195, 140, 34, { ancre: 'middle' });
    s += verre(15, 272, 360, 470, { rx: 22, opacite: 0.8 });
    s += `<rect x="34" y="292" width="157" height="3" rx="1.5" fill="${APP.accent}"/><rect x="199" y="292" width="157" height="3" rx="1.5" fill="${APP.track}" fill-opacity="0.3"/>`;
    s += texte(34, 314, t('Mot de passe', 'Password'), { taille: 12, couleur: APP.text, poids: 500 });
    s += texte(199, 314, t('Vérification', 'Verification'), { taille: 12, couleur: APP.faint });
    s += texte(34, 352, t('Connexion', 'Sign in'), { taille: 22, couleur: APP.text, poids: 700 });
    s += texte(34, 377, t('Sur un nouvel appareil, ou tous les 60 jours.', 'On a new device, or every 60 days.'), { taille: 13.5, couleur: APP.muted });
    s += champ(34, 398, 322, '', { label: t('Identifiant', 'Username'), valeur: identifiant || null, h: 42 });
    s += champ(34, 478, 322, '', { label: t('Mot de passe maître', 'Master password'), valeur: motDePasse ? '• • • • • • • • • • • • • •' : null, oeil: true, h: 42, focus: motDePasse });
    s += boutonPrimaire(34, 562, 322, 42, t('Continuer', 'Continue'), { icone: 'ArrowRight', taille: 15 });
    s += `<rect x="34" y="620" width="322" height="60" rx="10" fill="${APP.glass2}" fill-opacity="0.6"/>`;
    s += icone('Info', 46, 632, 16, APP.muted);
    s += paragraphe(70, 645, t('Ton mot de passe maître est dérivé ici et ne quitte pas cet appareil.', 'Your master password is derived here and never leaves this device.'),
      { taille: 12.5, max: 272, couleur: APP.muted, interligne: 18 });
    s += icone('LockSimple', 102, 801, 14, APP.faint);
    s += texte(122, 812, t('Déchiffré ici, jamais sur le serveur.', 'Decrypted here, never on the server.'), { taille: 12.5, couleur: APP.faint });
    return s;
  }

  // ----------------------------------------------------------- wide screens

  /// The web top bar (TopBar.tsx): the search that opens the palette, then
  /// guide, theme and bell. Drawn over the content, right of the sidebar.
  function barreHaut() {
    let s = `<rect x="272" y="11" width="440" height="34" rx="9" fill="#94A3C4" fill-opacity="0.07" stroke="${APP.line}" stroke-opacity="0.16"/>`;
    s += icone('MagnifyingGlass', 283, 20, 16, APP.faint);
    s += texte(308, 32.5, t('Rechercher une entrée ou une action', 'Search an entry or an action'), { taille: 13, couleur: APP.faint });
    s += touches(648, 19, ['Ctrl', 'K'], { h: 18, taille: 10.5 }).svg;
    s += icone('Question', 1162, 19, 18, APP.muted) + icone('Sun', 1198, 19, 18, APP.muted) + icone('Bell', 1234, 19, 18, APP.muted);
    s += `<circle cx="1249" cy="21" r="3.5" fill="${APP.warn}"/>`;
    return s;
  }

  /// The open vault on a wide window (18-bureau-coffre, 31-appli-coffre):
  /// sidebar, list and entry side by side, status bar. [forme] is 'web'
  /// (logo in the sidebar, search in a top bar) or 'bureau' (the app's own
  /// title bar carries logo and search).
  function coffreLarge({ forme = 'web' } = {}) {
    const bureau = forme === 'bureau';
    let s = aurore(1280, 800, 'leak', { opacite: 0.36 });
    if (bureau) {
      s += barreLaterale('coffre', { y0: 36 });
    } else {
      s += `<rect x="0" y="0" width="248" height="49" fill="${APP.surface}" fill-opacity="0.85"/>`;
      s += barreLaterale('coffre', { y0: 49 });
      s += logo(30, 27, 26) + marque(51, 36, 22);
      s += barreHaut();
    }
    // Heading, the attention line and the two buttons.
    s += texte(286, 91, t('Coffre', 'Vault'), { taille: 30, couleur: APP.text, poids: 700, espace: -0.6 });
    s += `<circle cx="290" cy="112" r="3.5" fill="${APP.warn}"/>`;
    s += texte(302, 117, t('Une chose demande ton attention.', 'One thing needs your attention.'), { taille: 14, couleur: APP.text, poids: 500 });
    s += texte(286, 140, t('Netflix est apparu dans une fuite : l’agent attend ton accord pour le changer.', 'Netflix showed up in a breach: the agent waits for your approval to change it.'),
      { taille: 13.5, couleur: APP.warnText });
    s += bouton(901, 111, 107, 34, t('Importer', 'Import'), { icone: 'DownloadSimple', taille: 13.5 });
    s += boutonPrimaire(1016, 111, 227, 34, t('Nouvelle entrée', 'New entry'), { icone: 'Plus', taille: 13.5, touche: 'Ctrl N' });
    // The list.
    s += verre(287, 169, 378, 583, { opacite: 0.6 });
    s += champ(298, 180, 355, t('Filtrer le coffre', 'Filter the vault'), { icone: 'MagnifyingGlass', touche: '/', h: 38, taille: 14 });
    s += segmente(298, 228, 355, [[t('Tout', 'All'), 3], [t('Toi', 'You'), 2], [t('Agent', 'Agent'), 1]], 0, { h: 34 });
    s += `<line x1="287" y1="274" x2="665" y2="274" stroke="${APP.line}" stroke-opacity="0.1"/>`;
    s += enteteZone(303, 301, 347, 'toi', 2, { taille: 13 });
    s += ligneEntree(290, 311, 372, ENTREES.banque, { h: 52, choisi: true, chevron: false, taille: 14 });
    s += ligneEntree(290, 364, 372, ENTREES.spotify, { h: 52, chevron: false, taille: 14 });
    s += enteteZone(303, 440, 347, 'agent', 1, { taille: 13 });
    s += ligneEntree(290, 450, 372, ENTREES.netflix, { h: 52, chevron: false, taille: 14, droite: [['Warning', APP.warn], ['ClockCountdown', APP.faint]] });
    s += `<line x1="287" y1="718" x2="665" y2="718" stroke="${APP.line}" stroke-opacity="0.1"/>`;
    s += kbd(300, 727, '↑', { h: 18 }).svg + kbd(322, 727, '↓', { h: 18 }).svg + texte(349, 740, t('naviguer', 'move'), { taille: 12, couleur: APP.faint });
    s += kbd(410, 727, t('Entrée', 'Enter'), { h: 18 }).svg + texte(471, 740, t('ouvrir', 'open'), { taille: 12, couleur: APP.faint });
    s += touches(516, 727, ['Ctrl', 'C'], { h: 18 }).svg + texte(583, 740, t('copier', 'copy'), { taille: 12, couleur: APP.faint });
    // The entry.
    s += verre(685, 169, 558, 583, { opacite: 0.6 });
    s += monogramme(ENTREES.banque.nom, 712, 194, 54, { cle: ENTREES.banque.cle });
    s += texte(781, 216, ENTREES.banque.nom, { taille: 26, couleur: APP.text, poids: 700, espace: -0.4 });
    const z = puceZone(781, 229, 'toi', { taille: 12, h: 22 });
    s += z.svg + icone('Globe', 781 + z.l + 8, 233, 14, APP.muted) + texte(781 + z.l + 27, 245, 'banque.fr', { taille: 13, couleur: APP.muted });
    s += bouton(1112, 204, 103, 34, t('Modifier', 'Edit'), { icone: 'PencilSimple', taille: 13.5 });
    s += verre(712, 270, 503, 184);
    const sep = (y) => `<line x1="712" y1="${y}" x2="1215" y2="${y}" stroke="${APP.line}" stroke-opacity="0.1"/>`;
    s += texte(728, 302, t('Identifiant', 'Username'), { taille: 13, couleur: APP.muted }) + texte(889, 304, 'tristan.j', { taille: 15, couleur: APP.text, poids: 500 });
    s += icone('Copy', 1183, 290, 17, APP.muted) + sep(327);
    s += texte(728, 366, t('Mot de passe', 'Password'), { taille: 13, couleur: APP.muted });
    s += texte(889, 355, '• • • • • • • • • • • • • • • •', { taille: 10, couleur: APP.muted, espace: 1.6 });
    s += force(889, 375, 4, { l: 97 }) + texte(995, 381, t('Robuste, 18 caractères', 'Strong, 18 characters'), { taille: 12.5, couleur: APP.muted });
    s += icone('Eye', 1150, 353, 19, APP.muted) + icone('Copy', 1183, 354, 17, APP.muted) + sep(397);
    s += texte(728, 430, 'Site', { taille: 13, couleur: APP.muted }) + texte(889, 431, 'banque.fr', { taille: 15, couleur: APP.accentText });
    s += icone('ArrowSquareOut', 1183, 417, 17, APP.muted);
    s += verre(712, 474, 503, 163);
    s += `<rect x="731" y="492" width="30" height="30" rx="8" fill="${APP.accent}" fill-opacity="0.15"/>` + icone('ShieldCheck', 737, 498, 18, APP.accentText);
    s += texte(770, 513, t('Protégé par toi', 'Protected by you'), { taille: 16, couleur: APP.text, poids: 600 });
    s += paragraphe(731, 544, t('Chiffré avec ta clé, qui ne quitte jamais tes appareils. L’agent te prévient en cas de fuite mais ne lit rien ici.',
      'Encrypted with your key, which never leaves your devices. The agent warns you of a breach but reads nothing here.'), { taille: 14, max: 460, couleur: APP.muted, interligne: 22 });
    s += bouton(731, 585, 157, 34, t('Confier à l’agent', 'Hand to the agent'), { icone: 'Sparkle', taille: 13.5 });
    s += verre(712, 657, 503, 67);
    s += `<rect x="728" y="675" width="30" height="30" rx="8" fill="${APP.accent}" fill-opacity="0.15"/>` + icone('ArrowsClockwise', 734, 681, 18, APP.accentText);
    s += texte(769, 686, t('Aucun rappel', 'No reminder'), { taille: 15, couleur: APP.text, poids: 600 });
    s += texte(769, 705, t('Régler un rappel pour le changer', 'Set a reminder to change it'), { taille: 13, couleur: APP.muted });
    s += icone('CaretDown', 1181, 681, 18, APP.muted);
    s += barreEtat([
      [APP.ok, t('Agent actif', 'Agent active'), null],
      [null, t('Veille', 'Watch'), t('il y a 4 minutes', '4 minutes ago')],
      [APP.warn, t('Santé', 'Health'), '67'],
      [null, t('1 rotation en attente', '1 rotation pending'), null],
    ]);
    if (bureau) s += barreTitre({ point: APP.warn });
    return s;
  }

  /// The command palette (18b-bureau-palette) over a dimmed window.
  function palette() {
    let s = `<rect width="1280" height="800" fill="#03050A" fill-opacity="0.62"/>`;
    const x = 330, y = 88, l = 620;
    s += `<rect x="${x}" y="${y}" width="${l}" height="520" rx="14" fill="${APP.panel}" fill-opacity="0.97" stroke="${APP.line}" stroke-opacity="0.18" filter="url(#ombreFlottante)"/>`;
    s += icone('MagnifyingGlass', x + 16, y + 17, 18, APP.muted);
    s += texte(x + 44, y + 32, t('Cherche une entrée ou tape une action', 'Find an entry or type an action'), { taille: 16, couleur: APP.faint });
    s += kbd(x + l - 64, y + 16, t('Échap', 'Esc'), { h: 20 }).svg;
    s += `<line x1="${x}" y1="${y + 52}" x2="${x + l}" y2="${y + 52}" stroke="${APP.line}" stroke-opacity="0.12"/>`;
    const titreGroupe = (yy, mot) => texte(x + 15, yy, mot, { taille: 11, couleur: APP.faint, poids: 600, espace: 1 });
    const ligne = (yy, ic, mot, { choisi = false, apres = null, keys = null, couleur = APP.muted } = {}) => {
      let r = '';
      if (choisi) r += `<rect x="${x + 6}" y="${yy - 20}" width="${l - 12}" height="40" rx="8" fill="${APP.glassHi}" fill-opacity="0.8" stroke="${APP.line}" stroke-opacity="0.2"/>`;
      r += `<rect x="${x + 15}" y="${yy - 12}" width="24" height="24" rx="6" fill="#94A3C4" fill-opacity="${choisi ? 0.12 : 0.06}"/>` + icone(ic, x + 20, yy - 7, 14, couleur);
      r += texte(x + 52, yy + 5, mot, { taille: 14, couleur: APP.text });
      if (apres) r += texte(x + 60 + largeur(mot, 14), yy + 4.5, apres, { taille: 12, couleur: APP.faint });
      if (keys) { const k = touches(0, 0, keys, { h: 18 }); r += touches(x + l - 16 - k.l, yy - 9, keys, { h: 18 }).svg; }
      return r;
    };
    s += titreGroupe(y + 78, t('SUGGESTIONS', 'SUGGESTIONS'));
    s += ligne(y + 104, 'Sparkle', t('Examiner 1 rotation en attente', 'Review 1 pending rotation'), { choisi: true, apres: t('L’agent attend ton accord', 'The agent waits for you'), couleur: APP.violetText });
    s += ligne(y + 146, 'Target', t('Voir 1 compte à surveiller', 'See 1 account to watch'));
    s += titreGroupe(y + 186, t('ACTIONS', 'ACTIONS'));
    [
      ['Plus', t('Nouvelle entrée', 'New entry'), ['Ctrl', 'N']],
      ['MagicWand', t('Générer un mot de passe', 'Generate a password'), null],
      ['LockSimple', t('Verrouiller le coffre', 'Lock the vault'), ['Ctrl', 'L']],
      ['Sun', t('Passer en thème clair', 'Switch to the light theme'), null],
      ['SlidersHorizontal', t('Réglages', 'Settings'), ['Ctrl', ',']],
      ['Bell', t('Notifications', 'Notifications'), null],
      ['Scroll', t('Journal d’activité', 'Activity log'), null],
    ].forEach(([ic, mot, keys], i) => { s += ligne(y + 212 + i * 42, ic, mot, { keys }); });
    s += `<line x1="${x}" y1="${y + 486}" x2="${x + l}" y2="${y + 486}" stroke="${APP.line}" stroke-opacity="0.12"/>`;
    s += kbd(x + 14, y + 494, '↑', { h: 18 }).svg + kbd(x + 36, y + 494, '↓', { h: 18 }).svg + texte(x + 63, y + 507, t('choisir', 'pick'), { taille: 12, couleur: APP.faint });
    s += kbd(x + 118, y + 494, t('Entrée', 'Enter'), { h: 18 }).svg + texte(x + 179, y + 507, t('lancer', 'run'), { taille: 12, couleur: APP.faint });
    s += touches(x + l - 110, y + 494, ['Ctrl', 'K'], { h: 18 }).svg + texte(x + l - 44, y + 507, t('fermer', 'close'), { taille: 12, couleur: APP.faint });
    return s;
  }

  /// The three window buttons the desktop app keeps on its entry screens.
  const boutonsFenetre = () => `<path d="M1160 18.5 H1170" stroke="${APP.muted}" stroke-width="1.2"/>
    <rect x="1206" y="13.5" width="10" height="10" fill="none" stroke="${APP.muted}" stroke-width="1.2"/>
    <path d="M1253 13.5 L1263 23.5 M1263 13.5 L1253 23.5" stroke="${APP.muted}" stroke-width="1.2"/>`;

  /// The locked vault in the desktop app: only the window buttons stay.
  function verrouLarge() {
    let s = aurore(1280, 800, 'calm', { opacite: 0.26 });
    s += rubans(1280, 600, { amplitude: 90 });
    s += boutonsFenetre();
    s += logo(640, 150, 84, { halo: true });
    s += marque(640, 250, 46, { ancre: 'middle' });
    s += texte(640, 304, t('Bon retour, Tristan.', 'Welcome back, Tristan.'), { taille: 26, couleur: APP.text, poids: 700, ancre: 'middle' });
    s += texte(640, 334, t('Ton coffre est verrouillé. Tout reste chiffré ici.', 'Your vault is locked. Everything stays encrypted here.'), { taille: 15, couleur: APP.muted, ancre: 'middle' });
    s += verre(460, 380, 360, 172, { rx: 18, opacite: 0.8 });
    s += champ(480, 398, 320, '', { label: t('Mot de passe maître', 'Master password'), oeil: true, focus: true, h: 42 });
    s += bouton(480, 482, 320, 42, t('Déverrouiller', 'Unlock'), { icone: 'LockOpen', couleur: APP.faint });
    s += icone('LockSimple', 522, 757, 14, APP.faint);
    s += texte(542, 768, t('Déchiffré ici, jamais sur le serveur.', 'Decrypted here, never on the server.'), { taille: 13, couleur: APP.faint });
    return s;
  }

  /// First launch of the desktop app (desktop/src/setup.html): the server
  /// address. The field is drawn empty: the diagram lays the placeholder,
  /// the typed text and the error on top (see premierLancementParts).
  function premierLancement({ attente = false } = {}) {
    let s = `<rect width="1280" height="800" fill="${APP.bg}"/>`;
    s += `<ellipse cx="640" cy="300" rx="460" ry="260" fill="#1E40AF" opacity="0.22" filter="url(#flou36)"/>`;
    s += rubans(1280, 600, { amplitude: 90 });
    s += boutonsFenetre();
    s += logo(640, 136, 84, { halo: true });
    s += marque(640, 236, 44, { ancre: 'middle' });
    s += texte(640, 276, t('Bienvenue. Indique l’adresse de ton serveur Serenity pour ouvrir ton coffre.', 'Welcome. Enter the address of your Serenity server to open your vault.'),
      { taille: 15, couleur: APP.muted, ancre: 'middle' });
    s += verre(440, 306, 400, 272, { rx: 18, opacite: 0.85 });
    s += champ(460, 326, 360, '', { label: t('Adresse du serveur', 'Server address'), focus: true, h: 42 });
    s += paragraphe(462, 412, t('En https. C’est l’adresse privée de ton serveur, jamais une adresse publique.', 'In https. It is the private address of your server, never a public one.'),
      { taille: 13, max: 356, couleur: APP.faint, interligne: 18 });
    s += boutonPrimaire(460, 514, 360, 44, attente ? t('Connexion…', 'Connecting…') : t('Ouvrir mon coffre', 'Open my vault'), { taille: 15 });
    s += texte(640, 768, t('Cette fenêtre ne parle qu’à ton serveur. Tu pourras changer d’adresse plus tard.', 'This window only talks to your server. You can change the address later.'),
      { taille: 13, couleur: APP.faint, ancre: 'middle' });
    return s;
  }
  /// Where the parts of the first-launch screen go, for the overlays.
  const premierLancementParts = {
    saisie: [474, 374.4],          // baseline of the text in the field
    erreur: [462, 466],            // first line of the error
    erreurTexte: t('Il faut une adresse en https, par exemple https://coffre.exemple.fr.', 'The address must be https, for example https://coffre.exemple.fr.'),
    bouton: [640, 536],            // centre of the button
  };

  /// Sign in on the desktop app (30-appli-connexion).
  function connexionLarge() {
    let s = aurore(1280, 800, 'calm', { opacite: 0.26 });
    s += rubans(1280, 600, { amplitude: 90 });
    s += boutonsFenetre();
    s += logo(640, 100, 80, { halo: true });
    s += marque(640, 192, 40, { ancre: 'middle' });
    s += verre(441, 225, 398, 421, { rx: 18, opacite: 0.8 });
    s += `<rect x="460" y="246" width="176" height="3" rx="1.5" fill="${APP.accent}"/><rect x="644" y="246" width="176" height="3" rx="1.5" fill="${APP.track}" fill-opacity="0.3"/>`;
    s += texte(460, 269, t('Mot de passe', 'Password'), { taille: 12, couleur: APP.text, poids: 500 });
    s += texte(644, 269, t('Vérification', 'Verification'), { taille: 12, couleur: APP.faint });
    s += texte(460, 309, t('Connexion', 'Sign in'), { taille: 21, couleur: APP.text, poids: 700 });
    s += texte(460, 334, t('Sur un nouvel appareil, ou tous les 60 jours.', 'On a new device, or every 60 days.'), { taille: 13.5, couleur: APP.muted });
    s += champ(460, 352, 360, '', { label: t('Identifiant', 'Username'), valeur: 'tristan', h: 42, taille: 14 });
    s += champ(460, 433, 360, '', { label: t('Mot de passe maître', 'Master password'), oeil: true, h: 42, focus: true });
    s += boutonPrimaire(460, 516, 360, 40, t('Continuer', 'Continue'), { icone: 'ArrowRight', taille: 14.5 });
    s += `<rect x="460" y="572" width="360" height="54" rx="10" fill="${APP.glass2}" fill-opacity="0.6"/>`;
    s += icone('Info', 472, 583, 15, APP.muted);
    s += paragraphe(496, 595, t('Ton mot de passe maître est dérivé ici et ne quitte pas cet appareil.', 'Your master password is derived here and never leaves this device.'),
      { taille: 12.5, max: 310, couleur: APP.muted, interligne: 18 });
    s += icone('LockSimple', 443, 763, 13, APP.faint);
    s += texte(461, 774, t('Déchiffré sur cet appareil. Le serveur ne voit que des blocs chiffrés.', 'Decrypted on this device. The server only sees encrypted blocks.'), { taille: 12.5, couleur: APP.faint });
    return s;
  }

  // ------------------------------------------------ diagram-scale devices

  /// A browser window [l] wide in the diagram: a thin address strip, then
  /// the page at 1280 x 800 app units. Same shape as fenetre(): cadre,
  /// ecran(contenu), pt(), plus h, the full height.
  function navigateur(x, y, l, adresse, { barre = 30 } = {}) {
    const k = l / 1280;
    const h = barre + 800 * k;
    const c = O.id('nav');
    const pl = Math.min(260, l - 120);
    const px = x + (l - pl) / 2;
    return {
      x, y, l, h, k,
      pt: (ax, ay) => [x + ax * k, y + barre + ay * k],
      cadre: `<rect x="${x}" y="${y}" width="${l}" height="${h}" rx="10" fill="${APP.bg}" filter="url(#ombreFlottante)"/>
  <clipPath id="${c}"><rect x="${x}" y="${y}" width="${l}" height="${h}" rx="10"/></clipPath>
  <g clip-path="url(#${c})"><rect x="${x}" y="${y}" width="${l}" height="${barre}" fill="#151B26"/>
  <line x1="${x}" y1="${y + barre - 0.5}" x2="${x + l}" y2="${y + barre - 0.5}" stroke="#2A3342"/></g>
  <rect x="${px}" y="${y + 6}" width="${pl}" height="${barre - 12}" rx="9" fill="#0B1019" stroke="#2A3342"/>
  ${icone('LockSimple', px + 10, y + 10, 11, '#6B7888')}
  ${texte(px + 27, y + barre / 2 + 4.3, adresse, { taille: 12, couleur: '#8F9BAC' })}`,
      ecran: (contenu) => `<g clip-path="url(#${c})"><g transform="translate(${x} ${y + barre}) scale(${Math.round(k * 10000) / 10000})">${contenu}</g></g>
  <rect x="${x + 0.5}" y="${y + 0.5}" width="${l - 1}" height="${h - 1}" rx="10" fill="none" stroke="#3A4556" stroke-opacity="0.9"/>`,
    };
  }

  return { codes, connexionMobile, coffreLarge, palette, verrouLarge, premierLancement, premierLancementParts, connexionLarge, boutonsFenetre, navigateur };
};

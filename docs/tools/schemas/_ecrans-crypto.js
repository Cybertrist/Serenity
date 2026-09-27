// Phone screens of the entry flows (AuthShell and its screens), shared by
// the diagrams of the cryptography and sign-in chapter: cles, bloc,
// inscription, deverrouillage. Drawn in app units (390 x 844) from the
// real screenshots (serenity-shots/final 01, 02, 03, 13, 13b, 15) and from
// web/src/features/account/screens.
//
// Every screen is plain SVG. The diagrams animate what changes (typing,
// ticks, the opening) on top, at the positions exported in P.
module.exports = (O) => {
  const { t, texte, paragraphe, icone, verre, champ, boutonPrimaire, bouton, logo, marque, aurore, enteteMobile,
    segmente, anneau, ligneEntree, enteteZone, ongletsBas, ENTREES, id, APP, MONO } = O;

  // --------------------------------------------------------- the frame
  // The narrow ribbon of Ribbons.tsx, in the 390 x 844 box of the phone:
  // same three paths, same widths (ribbons-narrow), same gradient.
  const RUBAN = [
    'M-80 360 C 40 270 150 450 250 330 S 380 190 480 250',
    'M-80 415 C 60 325 170 495 270 385 S 390 245 480 305',
    'M-80 315 C 50 225 140 405 240 285 S 370 145 480 205',
  ];
  function ruban({ large = 0.3 } = {}) {
    const g = id('rbg');
    const f = id('rbf');
    return `<linearGradient id="${g}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="390" y2="0">
      <stop offset="0" stop-color="#1D4ED8" stop-opacity="0"/><stop offset=".22" stop-color="#2563EB"/>
      <stop offset=".48" stop-color="#DBEAFE"/><stop offset=".56" stop-color="#FFFFFF"/>
      <stop offset=".78" stop-color="#3B82F6"/><stop offset="1" stop-color="#6D28D9" stop-opacity="0"/></linearGradient>
      <filter id="${f}" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="22"/></filter>
      <g fill="none" stroke="url(#${g})" stroke-linecap="round">
        <path d="${RUBAN[0]}" stroke-width="44" opacity="${large}" filter="url(#${f})"/>
        <path d="${RUBAN[1]}" stroke-width="10" opacity="0.55"/>
        <path d="${RUBAN[0]}" stroke-width="2.6" opacity="0.95"/>
        <path d="${RUBAN[2]}" stroke-width="1.2" opacity="0.5"/>
      </g>`;
  }

  /// The night behind the entry screens: radial glow of the calm mood
  /// (AuthShell's background), without the ribbon.
  function nuit() {
    const g = id('nuit');
    return `<radialGradient id="${g}" cx="195" cy="321" r="400" gradientUnits="userSpaceOnUse" gradientTransform="translate(195 321) scale(0.7 1.16) translate(-195 -321)">
      <stop offset="0" stop-color="#0C1634"/><stop offset="1" stop-color="${APP.bg}"/></radialGradient>
      <rect width="390" height="844" fill="${APP.bg}"/><rect width="390" height="844" fill="url(#${g})"/>`;
  }

  /// Logo with its halo, then the logotype, like AuthShell on a phone.
  const tete = () => logo(195, 70, 62, { halo: true }) + marque(195, 141, 30, { ancre: 'middle' });

  /// The line at the foot of every entry screen.
  const pied = () => {
    const s = t('Déchiffré ici, jamais sur le serveur.', 'Decrypted here, never on the server.');
    const l = O.largeur(s, 12) + 19;
    return icone('LockSimple', 195 - l / 2, 808, 13, APP.faint) + texte(195 - l / 2 + 19, 819, s, { taille: 12, couleur: APP.faint });
  };

  /// The glass card of the entry screens, 16 px from the edges.
  const carteAuth = (y, h, { halo = null } = {}) => verre(16, y, 358, h, { rx: 18, opacite: 0.78, halo });

  /// The steps bar at the top of a card (Steps in AuthShell).
  function etapes(y, noms, courant) {
    let s = '';
    const w = (322 - 8 * (noms.length - 1)) / noms.length;
    noms.forEach((nom, i) => {
      const x = 34 + i * (w + 8);
      const fait = i + 1 < courant, ici = i + 1 === courant;
      s += `<rect x="${x}" y="${y}" width="${w}" height="4" rx="2" fill="${fait || ici ? APP.accent : APP.track}" fill-opacity="${fait || ici ? 1 : 0.3}"/>`;
      let tx = x;
      if (fait) { s += icone('Check', x, y + 8, 11, APP.accentText, 'bold'); tx += 15; }
      s += texte(tx, y + 18, nom, { taille: 11.5, couleur: ici ? APP.text : fait ? APP.muted : APP.faint, poids: 500 });
    });
    return s;
  }

  /// Title and sentence at the top of a card. The app sets the title in
  /// Syne; the diagrams keep Syne for the logotype only, so Geist 700.
  function titre(y, s, sous) {
    return texte(34, y, s, { taille: 21, couleur: APP.text, poids: 700, espace: -0.2 }) +
      paragraphe(34, y + 26, sous, { taille: 13.5, max: 322, couleur: APP.muted, interligne: 21 });
  }

  /// The six boxes of CodeField, empty; the digits are drawn by the diagram
  /// at P.chiffre(i, y).
  function cases(y, { focus = 0 } = {}) {
    let s = '';
    for (let i = 0; i < 6; i++) {
      const x = 34 + i * 55;
      s += `<rect x="${x}" y="${y}" width="47" height="53" rx="10" fill="${APP.bg}" fill-opacity="0.55" stroke="${i === focus ? APP.accent : APP.line}" stroke-opacity="${i === focus ? 0.9 : 0.22}"/>`;
    }
    return s;
  }
  const chiffre = (i, y, c) => texte(34 + i * 55 + 23.5, y + 35, c, { taille: 22, couleur: APP.text, poids: 500, ancre: 'middle' });

  /// A primary button still shut (disabled): glass, faint text.
  function boutonEteint(y, s, ic) {
    const l = O.largeur(s, 15, { poids: 600 }) + 26;
    return `<rect x="34" y="${y}" width="322" height="40" rx="11" fill="${APP.glass2}" fill-opacity="0.5" stroke="${APP.line}" stroke-opacity="0.1"/>` +
      icone(ic, 195 - l / 2, y + 11, 18, APP.faint) + texte(195 - l / 2 + 26, y + 25.5, s, { taille: 15, couleur: APP.faint, poids: 600 });
  }
  const boutonAllume = (y, s, ic) => boutonPrimaire(34, y, 322, 40, s, { icone: ic, taille: 15, rx: 11 });

  /// A link button (variant="link"): icon and blue text.
  function lien(x, y, s, ic, { ancre = 'start', taille = 13 } = {}) {
    const l = O.largeur(s, taille, { poids: 500 }) + 21;
    const x0 = ancre === 'middle' ? x - l / 2 : x;
    return icone(ic, x0, y - 12, 16, APP.accentText) + texte(x0 + 21, y, s, { taille, couleur: APP.accentText, poids: 500 });
  }

  /// A note (Note.tsx) at [y], [l] lines of text.
  function note(y, lignesTexte, { ton = 'neutre', ic = 'Info', h = null } = {}) {
    const c = ton === 'warn' ? APP.warn : ton === 'crit' ? APP.crit : null;
    const hh = h || lignesTexte.length * 19 + 22;
    let s = `<rect x="34" y="${y}" width="322" height="${hh}" rx="12" fill="${c || '#94A3C4'}" fill-opacity="${c ? 0.12 : 0.06}"/>`;
    s += icone(ic, 46, y + 12, 17, c ? (ton === 'warn' ? APP.warnText : APP.crit) : APP.muted);
    lignesTexte.forEach((l, i) => { s += texte(72, y + 25 + i * 19, l, { taille: 13, couleur: c ? APP.text : APP.muted }); });
    return s;
  }

  // ------------------------------------------------------------ screens

  // Where the diagrams put what they animate.
  const P = {
    // 01-bienvenue
    bienvenue: { identifiant: [48, 466], mdp: [48, 572], confirme: [48, 694], continuer: [195, 747], indice: 608 },
    // 02-totp
    totp: { cases: 618, verifier: 687 },
    // 03-kit
    kit: { coche: [53, 795], telecharger: [112, 641], ouvrir: 832 },
    // 13-deverrouillage
    verrou: { mdp: [48, 619], bouton: 649, oublie: [120, 749] },
    // 13b-recuperation
    recup: { cle: [48, 544], cases: 602, continuer: 671 },
    // Login on a phone (Login.tsx inside AuthShell, narrow)
    connexion: { mdp: [48, 593], continuer: 618, cases: 603, deverrouiller: 672 },
    chiffre,
  };

  /// 01-bienvenue: the first step of the account creation, fields empty.
  function bienvenue({ solide = false } = {}) {
    let s = nuit() + ruban() + tete();
    s += carteAuth(272, 514);
    s += etapes(292, [t('Compte', 'Account'), t('Vérification', 'Verification'), t('Récupération', 'Recovery')], 1);
    s += titre(352, t('Bienvenue.', 'Welcome.'), t('Crée ton coffre. Ton mot de passe maître ne quitte jamais cet appareil.', 'Create your vault. Your master password never leaves this device.'));
    s += champ(34, 419, 322, null, { label: t('Identifiant', 'Username'), h: 41 });
    s += texte(36, 503, t('Un nom simple ou ton adresse e-mail.', 'A plain name or your email address.'), { taille: 12.5, couleur: APP.faint });
    s += champ(34, 525, 322, null, { label: t('Mot de passe maître', 'Master password'), h: 41, oeil: true });
    if (!solide) {
      s += paragraphe(36, 608, t('12 caractères au moins. Une phrase de 4 ou 5 mots est idéale.', '12 characters at least. A phrase of 4 or 5 words is ideal.'), { taille: 12.5, max: 318, couleur: APP.faint, interligne: 18 });
    } else s += texte(36, 608, t('Solide.', 'Strong.'), { taille: 12.5, couleur: APP.faint });
    s += champ(34, 647, 322, null, { label: t('Confirme le mot de passe maître', 'Confirm the master password'), h: 41, oeil: true });
    s += boutonAllume(727, t('Continuer', 'Continue'), 'ArrowRight');
    return s + pied();
  }

  /// 02-totp: the authenticator key, the six boxes, the note.
  function totp({ pret = false } = {}) {
    let s = nuit() + ruban() + tete();
    s += carteAuth(242, 574);
    s += etapes(262, [t('Compte', 'Account'), t('Vérification', 'Verification'), t('Récupération', 'Recovery')], 2);
    s += titre(321, t('La double vérification', 'Two-step verification'), t('Ajoute Serenity à ton appli d’authentification, puis tape le code qu’elle affiche.', 'Add Serenity to your authenticator app, then type the code it shows.'));
    s += `<rect x="34" y="389" width="322" height="131" rx="14" fill="#94A3C4" fill-opacity="0.06" stroke="${APP.line}" stroke-opacity="0.1"/>`;
    s += texte(47, 414, t('Clé à saisir dans ton appli d’authentification', 'Key to enter in your authenticator app'), { taille: 12.5, couleur: APP.muted });
    s += texte(47, 442, 'EZH6 M3RW GGEN KXKI CZEO 2ISW', { taille: 14.5, couleur: APP.text, police: MONO, poids: 500, espace: 1.2 });
    s += texte(47, 465, 'DYKR EIED', { taille: 14.5, couleur: APP.text, police: MONO, poids: 500, espace: 1.2 });
    s += lien(47, 497, t('Copier la clé', 'Copy the key'), 'Copy') + lien(155, 497, 'QR code', 'QrCode');
    s += bouton(34, 536, 322, 40, t('Ouvrir dans l’appli d’authentification', 'Open in the authenticator app'), { icone: 'ArrowSquareOut', taille: 14 });
    s += texte(36, 605, t('Code à 6 chiffres', '6-digit code'), { taille: 13, couleur: APP.muted, poids: 500 });
    s += cases(618, { focus: pret ? -1 : 0 });
    s += pret ? boutonAllume(687, t('Vérifier', 'Verify'), 'ShieldCheck') : boutonEteint(687, t('Vérifier', 'Verify'), 'ShieldCheck');
    s += note(743, [t('Le code sera redemandé sur un nouvel appareil,', 'The code is asked again on a new device,'), t('puis tous les 60 jours.', 'then every 60 days.')]);
    return s + pied();
  }

  // A recovery kit sheet: 8 groups and the check group (RecoveryKitPanel).
  const KIT = ['VW98', 'P2G6', 'J2TG', 'RXA5', '5M8P', 'D9B0', 'PBN9', '1WJV', 'KHZQ'];
  const KIT_NEUF = ['Q4TM', '8XHD', 'N2VR', '7KCE', 'WB3J', '5FZP', 'A9GS', '6YDN', 'M2KX'];
  function feuille(y, groupes, date) {
    let s = `<rect x="34" y="${y}" width="322" height="220" rx="14" fill="${APP.warn}" fill-opacity="0.05" stroke="${APP.warn}" stroke-opacity="0.45"/>`;
    s += icone('Key', 49, y + 14, 17, APP.warnText);
    s += texte(73, y + 27, t('KIT DE RÉCUPÉRATION', 'RECOVERY KIT'), { taille: 12, couleur: APP.warnText, poids: 600, espace: 1.3 });
    s += texte(340, y + 27, 'tristan', { taille: 12, couleur: APP.muted, police: MONO, ancre: 'end' });
    groupes.forEach((g, i) => {
      const x = 48 + (i % 3) * 100, yy = y + 43 + Math.floor(i / 3) * 47;
      s += `<rect x="${x}" y="${yy}" width="93" height="41" rx="8" fill="${APP.glass2}" fill-opacity="0.8" stroke="${APP.line}" stroke-opacity="0.12"/>`;
      s += texte(x + 7, yy + 12, String(i + 1), { taille: 9, couleur: APP.faint });
      s += texte(x + 25, yy + 27, g, { taille: 16, couleur: i === 8 ? APP.muted : APP.text, police: MONO, poids: 500, espace: 2 });
    });
    s += texte(50, y + 203, date, { taille: 11.5, couleur: APP.faint });
    return s;
  }
  function enjeux(y) {
    const l = [
      ['EyeSlash', [t('Il ne sera plus jamais affiché.', 'It will never be shown again.')]],
      ['CloudSlash', [t('Le serveur n’en garde aucune copie lisible.', 'The server keeps no readable copy of it.')]],
      ['Lifebuoy', [t('Avec ton code à deux facteurs, il rouvre ton coffre', 'With your two-factor code, it opens your vault'), t('si tu oublies ton mot de passe maître.', 'again if you forget your master password.')]],
    ];
    let s = '', yy = y;
    for (const [ic, lg] of l) {
      s += icone(ic, 34, yy - 13, 16, APP.warnText, 'bold');
      lg.forEach((x, i) => { s += texte(60, yy + i * 18, x, { taille: 12.5, couleur: APP.muted }); });
      yy += 26 + (lg.length - 1) * 18;
    }
    return s;
  }
  function coche(y, cochee) {
    let s = `<rect x="34" y="${y}" width="322" height="41" rx="11" fill="#94A3C4" fill-opacity="0.06"/>`;
    s += `<rect x="45" y="${y + 12}" width="17" height="17" rx="4" fill="${cochee ? APP.accent : 'none'}" stroke="${cochee ? APP.accent : APP.line}" stroke-opacity="${cochee ? 1 : 0.4}" stroke-width="1.5"/>`;
    if (cochee) s += icone('Check', 47.5, y + 14.5, 12, '#FFFFFF', 'bold');
    s += texte(75, y + 25, t('Je l’ai noté dans un endroit sûr.', 'I wrote it down somewhere safe.'), { taille: 14, couleur: APP.text });
    return s;
  }

  /// 03-kit: the recovery kit, shown once. [coche]: the box is ticked, and
  /// "Open my vault" (below the fold at 832) lights up.
  function kit({ cochee = false } = {}) {
    let s = nuit() + ruban() + tete();
    s += carteAuth(242, 680, { halo: APP.warn });
    s += `<rect x="16" y="242" width="358" height="680" rx="18" fill="none" stroke="${APP.warn}" stroke-opacity="0.28"/>`;
    s += etapes(262, [t('Compte', 'Account'), t('Vérification', 'Verification'), t('Récupération', 'Recovery')], 3);
    s += titre(321, t('Ton kit de récupération', 'Your recovery kit'), t('Ta seule issue si tu oublies ton mot de passe maître. Prends une minute pour le mettre à l’abri.', 'Your only way back if you forget your master password. Take a minute to put it somewhere safe.'));
    s += feuille(388, KIT, t('Créé le 27 septembre 2026. Affiché une seule fois.', 'Created on September 27, 2026. Shown only once.'));
    s += bouton(34, 624, 156, 34, t('Télécharger', 'Download'), { icone: 'DownloadSimple', taille: 14 });
    s += bouton(199, 624, 157, 34, t('Copier', 'Copy'), { icone: 'Copy', taille: 14 });
    s += enjeux(686);
    s += coche(775, cochee);
    s += cochee ? boutonAllume(832, t('Ouvrir mon coffre', 'Open my vault'), 'CheckCircle') : boutonEteint(832, t('Ouvrir mon coffre', 'Open my vault'), 'CheckCircle');
    return s;
  }

  /// 13-deverrouillage: the lock screen. [pret]: a password is typed, the
  /// button is lit.
  function verrou({ pret = false } = {}) {
    let s = nuit() + ruban() + tete();
    s += texte(195, 181, t('Bon retour, Tristan.', 'Welcome back, Tristan.'), { taille: 22, couleur: APP.text, poids: 700, ancre: 'middle', espace: -0.2 });
    s += texte(195, 209, t('Ton coffre est verrouillé. Tout reste chiffré ici.', 'Your vault is locked. Everything stays encrypted here.'), { taille: 13.5, couleur: APP.muted, ancre: 'middle' });
    s += carteAuth(551, 157, { halo: APP.accent });
    s += champ(34, 571, 322, null, { label: t('Mot de passe maître', 'Master password'), h: 40, focus: !pret, oeil: true });
    s += pret ? boutonAllume(649, t('Déverrouiller', 'Unlock'), 'LockOpen') : boutonEteint(649, t('Déverrouiller', 'Unlock'), 'LockOpen');
    const a = t('Oublié ? Utilise ton kit', 'Forgot it? Use your kit');
    const b = t('Changer de compte', 'Switch account');
    const la = O.largeur(a, 13, { poids: 500 }) + 21, lb = O.largeur(b, 13, { poids: 500 }) + 21;
    const x0 = 195 - (la + 20 + lb) / 2;
    s += lien(x0, 749, a, 'Lifebuoy') + lien(x0 + la + 20, 749, b, 'ArrowsLeftRight');
    s += texte(195, 777, t('Il se referme seul après 15 min sans activité.', 'It locks itself after 15 min of inactivity.'), { taille: 12, couleur: APP.faint, ancre: 'middle' });
    return s + pied();
  }
  const oublieX = () => {
    const a = t('Oublié ? Utilise ton kit', 'Forgot it? Use your kit');
    const b = t('Changer de compte', 'Switch account');
    const la = O.largeur(a, 13, { poids: 500 }) + 21, lb = O.largeur(b, 13, { poids: 500 }) + 21;
    return 195 - (la + 20 + lb) / 2 + la / 2;
  };

  /// Login on a phone (Login.tsx, step 1): username filled, password empty.
  function connexion({ pret = false } = {}) {
    let s = nuit() + ruban() + tete();
    s += carteAuth(340, 408);
    s += etapes(360, [t('Mot de passe', 'Password'), t('Vérification', 'Verification')], 1);
    s += titre(419, t('Connexion', 'Sign in'), t('Sur un nouvel appareil, ou tous les 60 jours.', 'On a new device, or every 60 days.'));
    s += champ(34, 466, 322, null, { label: t('Identifiant', 'Username'), h: 40, valeur: 'tristan' });
    s += champ(34, 546, 322, null, { label: t('Mot de passe maître', 'Master password'), h: 40, focus: !pret, oeil: true });
    s += pret ? boutonAllume(P.connexion.continuer, t('Continuer', 'Continue'), 'ArrowRight') : boutonEteint(P.connexion.continuer, t('Continuer', 'Continue'), 'ArrowRight');
    s += note(674, [t('Ton mot de passe maître est dérivé ici et ne', 'Your master password is derived here and never'), t('quitte pas cet appareil.', 'leaves this device.')]);
    s += lien(195, 787, t('Oublié ? Utilise ton kit de récupération', 'Forgot it? Use your recovery kit'), 'Lifebuoy', { ancre: 'middle' });
    return s + pied();
  }
  /// Login on a phone, step 2: the code.
  function connexionCode({ pret = false } = {}) {
    let s = nuit() + ruban() + tete();
    s += carteAuth(442, 312);
    s += etapes(462, [t('Mot de passe', 'Password'), t('Vérification', 'Verification')], 2);
    s += titre(521, t('La double vérification', 'Two-step verification'), t('Le code à 6 chiffres que montre ton appli d’authentification.', 'The 6-digit code your authenticator app shows.'));
    s += texte(36, 590, t('Code à 6 chiffres', '6-digit code'), { taille: 13, couleur: APP.muted, poids: 500 });
    s += cases(603, { focus: pret ? -1 : 0 });
    s += pret ? boutonAllume(672, t('Déverrouiller', 'Unlock'), 'LockOpen') : boutonEteint(672, t('Déverrouiller', 'Unlock'), 'LockOpen');
    s += lien(195, 787, t('Revenir au mot de passe', 'Back to the password'), 'ArrowLeft', { ancre: 'middle' });
    return s + pied();
  }

  /// 13b-recuperation: the proof step of a recovery.
  function recuperation({ pret = false } = {}) {
    let s = nuit() + ruban() + tete();
    s += carteAuth(268, 462);
    s += etapes(288, [t('Preuve', 'Proof'), t('Mot de passe', 'Password'), t('Nouveau kit', 'New kit')], 1);
    s += titre(347, t('Récupération', 'Recovery'), t('Ton kit et un code prouvent que c’est toi. Ensuite, tu choisis un nouveau mot de passe maître.', 'Your kit and a code prove it is you. Then you pick a new master password.'));
    s += champ(34, 415, 322, null, { label: t('Identifiant', 'Username'), h: 41, valeur: 'tristan' });
    s += champ(34, 496, 322, null, { label: t('Clé de récupération', 'Recovery key'), h: 41, focus: !pret });
    s += texte(36, 589, t('Code à 6 chiffres', '6-digit code'), { taille: 13, couleur: APP.muted, poids: 500 });
    s += cases(602, { focus: -1 });
    s += pret ? boutonAllume(671, t('Continuer', 'Continue'), 'ArrowRight') : boutonEteint(671, t('Continuer', 'Continue'), 'ArrowRight');
    s += lien(195, 771, t('Retour', 'Back'), 'ArrowLeft', { ancre: 'middle' });
    return s + pied();
  }

  /// The last step of a recovery: a brand new kit (Recovery.tsx, step 3).
  function nouveauKit() {
    let s = nuit() + ruban() + tete();
    s += carteAuth(200, 700, { halo: APP.warn });
    s += `<rect x="16" y="200" width="358" height="700" rx="18" fill="none" stroke="${APP.warn}" stroke-opacity="0.28"/>`;
    s += etapes(220, [t('Preuve', 'Proof'), t('Mot de passe', 'Password'), t('Nouveau kit', 'New kit')], 3);
    s += titre(279, t('Ton nouveau kit', 'Your new kit'), t('L’ancien ne fonctionne plus. Garde celui-ci à l’abri avant d’ouvrir ton coffre.', 'The old one no longer works. Put this one somewhere safe before you open your vault.'));
    s += note(346, [t('Tes autres appareils ont été déconnectés.', 'Your other devices have been signed out.')], { ton: 'warn', ic: 'Warning' });
    s += feuille(403, KIT_NEUF, t('Créé le 27 septembre 2026. Affiché une seule fois.', 'Created on September 27, 2026. Shown only once.'));
    s += bouton(34, 639, 156, 34, t('Télécharger', 'Download'), { icone: 'DownloadSimple', taille: 14 });
    s += bouton(199, 639, 157, 34, t('Copier', 'Copy'), { icone: 'Copy', taille: 14 });
    s += enjeux(701);
    s += coche(790, false);
    return s;
  }

  // ------------------------------------------------------- vault states

  /// 15-hors-ligne: the vault read offline, nothing can change.
  function coffreHorsLigne() {
    let s = aurore(390, 844, 'calm');
    s += enteteMobile(t('Coffre', 'Vault'), { actions: ['MagnifyingGlass', 'Bell'] });
    s += `<rect x="18" y="69" width="354" height="55" rx="12" fill="${APP.warn}" fill-opacity="0.12"/>`;
    s += icone('CloudSlash', 28, 78, 18, APP.warnText);
    s += texte(55, 92, t('Hors ligne : tu peux lire ton coffre, mais rien n’y est', 'Offline: you can read your vault, but nothing in it'), { taille: 13, couleur: APP.text });
    s += texte(55, 110, t('modifiable tant que le serveur n’est pas joignable.', 'can change until the server can be reached.'), { taille: 13, couleur: APP.text });
    s += champ(18, 139, 354, t('Chercher dans 3 entrées', 'Search 3 entries'), { icone: 'MagnifyingGlass', touche: '/', h: 38 });
    s += verre(18, 192, 354, 68);
    s += anneau(54, 226, 44, null);
    s += texte(90, 221, t('Hors ligne.', 'Offline.'), { taille: 15, couleur: APP.text, poids: 600 });
    s += texte(90, 242, t('Ton coffre reste lisible, rien n’y est modifiable.', 'Your vault stays readable, nothing can change.'), { taille: 13, couleur: APP.muted });
    s += segmente(18, 275, 354, [[t('Tout', 'All'), 3], [t('Toi', 'You'), 2], [t('Agent', 'Agent'), 1]], 0);
    s += enteteZone(22, 344, 347, 'toi', 2);
    s += verre(18, 356, 354, 124, { opacite: 0.6 });
    s += ligneEntree(18, 356, 354, ENTREES.banque) + ligneEntree(18, 418, 354, ENTREES.spotify);
    s += enteteZone(22, 517, 347, 'agent', 1);
    s += verre(18, 529, 354, 62, { opacite: 0.6 });
    s += ligneEntree(18, 529, 354, ENTREES.netflix, { droite: [['ClockCountdown', APP.faint]] });
    return s + ongletsBas('coffre');
  }

  /// The vault when blocks do not decrypt (VaultScreen's "illisible"
  /// note): the entries that failed are hidden. [caches]: their keys.
  function coffreIllisible(caches) {
    const n = caches.length;
    const toi = ['banque', 'netflix', 'spotify'].filter((k) => !caches.includes(k));
    let s = aurore(390, 844, 'calm');
    s += enteteMobile(t('Coffre', 'Vault'), { actions: [['Plus', { primaire: true }], 'MagnifyingGlass', 'Bell'] });
    const lignesNote = n > 1
      ? [t('2 entrées illisibles : elles ne se déchiffrent pas', '2 unreadable entries: they do not decrypt with'), t('avec tes clés et restent masquées. Si ça dure,', 'your keys and stay hidden. If it goes on, tell'), t('préviens l’administrateur du serveur.', 'the administrator of the server.')]
      : [t('1 entrée illisible : elles ne se déchiffrent pas', '1 unreadable entry: they do not decrypt with'), t('avec tes clés et restent masquées. Si ça dure,', 'your keys and stay hidden. If it goes on, tell'), t('préviens l’administrateur du serveur.', 'the administrator of the server.')];
    s += `<rect x="18" y="69" width="354" height="79" rx="12" fill="${APP.crit}" fill-opacity="0.12"/>`;
    s += icone('Warning', 28, 78, 18, APP.crit);
    lignesNote.forEach((l, i) => { s += texte(55, 92 + i * 19, l, { taille: 13, couleur: APP.text }); });
    const m = 3 - n;
    s += champ(18, 164, 354, m > 1 ? t(`Chercher dans ${m} entrées`, `Search ${m} entries`) : t('Chercher dans 1 entrée', 'Search 1 entry'), { icone: 'MagnifyingGlass', touche: '/', h: 38 });
    s += verre(18, 218, 354, 68);
    s += anneau(54, 252, 44, 100);
    s += texte(90, 247, t('Tout va bien.', 'All is well.'), { taille: 15, couleur: APP.text, poids: 600 });
    s += texte(90, 268, t('Rien à signaler.', 'Nothing to report.'), { taille: 13, couleur: APP.muted });
    s += segmente(18, 302, 354, [[t('Tout', 'All'), m], [t('Toi', 'You'), toi.length], [t('Agent', 'Agent'), 0]], 0);
    s += enteteZone(22, 371, 347, 'toi', toi.length);
    s += verre(18, 383, 354, toi.length * 62, { opacite: 0.6 });
    toi.forEach((k, i) => { s += ligneEntree(18, 383 + i * 62, 354, ENTREES[k]); });
    const yA = 383 + toi.length * 62 + 31;
    s += enteteZone(22, yA, 347, 'agent', 0);
    s += `<rect x="18.5" y="${yA + 12.5}" width="353" height="77" rx="14" fill="none" stroke="${APP.line}" stroke-opacity="0.22" stroke-dasharray="4 4"/>`;
    s += icone('Sparkle', 32, yA + 27, 17, APP.faint);
    s += paragraphe(58, yA + 40, t('Rien de confié. Ouvre une entrée, puis « Confier à l’agent » : c’est toujours ton choix, entrée par entrée.',
      'Nothing handed over. Open an entry, then “Hand to the agent”: always your call, one entry at a time.'), { taille: 13, max: 296, couleur: APP.muted, interligne: 18 });
    return s + ongletsBas('coffre');
  }

  /// 04-coffre-vide: a brand new vault.
  function coffreVide() {
    let s = aurore(390, 844, 'calm');
    s += enteteMobile(t('Coffre', 'Vault'), { actions: [['Plus', { primaire: true }], 'MagnifyingGlass', 'Bell'], sous: t('Tes comptes, rangés dans leurs deux zones.', 'Your accounts, sorted into their two zones.') });
    s += `<rect x="18.5" y="100.5" width="353" height="342" rx="16" fill="none" stroke="${APP.line}" stroke-opacity="0.22" stroke-dasharray="4 4"/>`;
    s += `<rect x="169" y="131" width="52" height="52" rx="16" fill="${APP.glass2}" fill-opacity="0.8" stroke="${APP.line}" stroke-opacity="0.16"/>` + icone('Vault', 183, 145, 24, APP.muted);
    s += texte(195, 216, t('Ton coffre est vide.', 'Your vault is empty.'), { taille: 15, couleur: APP.text, poids: 600, ancre: 'middle' });
    const l = O.lignes(t('Ajoute un compte, ou importe tes mots de passe depuis Google, Bitwarden ou Authenticator. Tout arrive d’abord dans ta zone personnelle.',
      'Add an account, or import your passwords from Google, Bitwarden or Authenticator. Everything lands in your personal zone first.'), 13, 290);
    l.forEach((x, i) => { s += texte(195, 240 + i * 18, x, { taille: 13, couleur: APP.muted, ancre: 'middle' }); });
    s += boutonPrimaire(97, 295, 196, 34, t('Ajouter une entrée', 'Add an entry'), { icone: 'Plus', taille: 14 });
    s += bouton(97, 337, 196, 34, t('Importer', 'Import'), { icone: 'DownloadSimple', taille: 14 });
    s += icone('Question', 111, 386, 16, APP.muted) + texte(135, 399, t('Comment ça marche ?', 'How does it work?'), { taille: 13.5, couleur: APP.muted, poids: 500 });
    return s + ongletsBas('coffre');
  }

  // --------------------------------------------------------- the opening

  /// The opening (Opening.tsx) over the phone, from [de]: "cover" (the
  /// veil comes in, the ribbon swells and rises, the beam sweeps 1.25 s),
  /// "hold", then "lift" at [leve] (the ribbon flies up, the veil opens)
  /// until [fin]. Seconds are turned into fractions of [cycle].
  function ouverture(cycle, de, leve, fin) {
    const s = (sec) => sec / cycle;
    const voile = O.fondu('opacity', cycle, [[0, 0], [de, 0], [de + s(0.35), 1], [leve, 1], [Math.min(fin, leve + s(0.6)), 0], [1, 0]]);
    const g = id('voile');
    const b = id('faisceau');
    // The ribbon rises and swells about the middle of the screen.
    const monte = O.glisse(cycle, [[0, '0 0'], [de, '0 0'], [de + s(0.8), '0 -118'], [leve, '0 -118'], [Math.min(fin, leve + s(0.8)), '0 -506'], [1, '0 -506']]);
    const gonfle = `<animateTransform attributeName="transform" type="scale" dur="${cycle}s" repeatCount="indefinite" keyTimes="${[0, de, de + s(0.8), leve, Math.min(fin, leve + s(0.8)), 1].map((v) => Math.round(v * 10000) / 10000).join(';')}" values="1 1;1 1;1 1.35;1 1.35;1 1.6;1 1.6"/>`;
    const ruOp = O.fondu('opacity', cycle, [[0, 0], [de, 0], [de + s(0.2), 1], [leve, 1], [Math.min(fin, leve + s(0.7)), 0], [1, 0]]);
    const passe = O.glisse(cycle, [[0, '-110 0'], [de + s(0.1), '-110 0'], [de + s(1.35), '400 0'], [1, '400 0']]);
    const passeOp = O.fondu('opacity', cycle, [[0, 0], [de + s(0.1), 0], [de + s(0.3), 1], [de + s(1.2), 1], [de + s(1.35), 0], [1, 0]]);
    return `<radialGradient id="${g}" cx="195" cy="321" r="400" gradientUnits="userSpaceOnUse" gradientTransform="translate(195 321) scale(0.7 1.16) translate(-195 -321)">
        <stop offset="0" stop-color="#0C1634"/><stop offset="1" stop-color="${APP.bg}"/></radialGradient>
      <radialGradient id="${b}" cx="0.5" cy="0.62" r="0.55"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.8"/><stop offset="0.45" stop-color="#BFDBFE" stop-opacity="0.35"/><stop offset="1" stop-color="#BFDBFE" stop-opacity="0"/></radialGradient>
      <g opacity="0">${voile}<rect width="390" height="844" fill="${APP.bg}"/><rect width="390" height="844" fill="url(#${g})"/></g>
      <g opacity="0">${ruOp}<g>${monte}<g transform="translate(0 422)"><g>${gonfle}<g transform="translate(0 -422)">${ruban({ large: 0.6 })}</g></g></g></g></g>
      <g opacity="0">${passeOp}<g>${passe}<rect x="0" y="-84" width="101" height="1012" fill="url(#${b})"/></g></g>`;
  }

  return {
    P, KIT, KIT_NEUF, nuit, ruban, tete, pied, carteAuth, etapes, titre, cases, chiffre, boutonEteint, boutonAllume, lien, note,
    bienvenue, totp, kit, verrou, oublieX, connexion, connexionCode, recuperation, nouveauKit,
    coffreHorsLigne, coffreIllisible, coffreVide, ouverture,
  };
};

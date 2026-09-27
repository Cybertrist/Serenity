// Phone screens shared by several diagrams, drawn in app units (390 x 844)
// from the real screenshots (serenity-shots/final, docs/img). Each takes
// the tools of outils.js, and returns a function per screen.
//
//   const E = require('./_ecrans.js')(O);
//   T.ecran(E.coffre({ netflix: 'agent' }))
//
// A screen is plain SVG, without animation: a diagram fades screens in and
// out with entre(), and animates what changes inside on its own.
module.exports = (O) => {
  const { t, texte, paragraphe, icone, verre, monogramme, anneau, puce, puceZone, boutonPrimaire, bouton, boutonIcone,
    champ, segmente, force, aurore, enteteMobile, ongletsBas, ENTREES, ligneEntree, enteteZone, largeur, APP, SANS } = O;

  /// The vault (05-coffre, 08-coffre-delegue). [netflix] is the zone the
  /// Netflix entry sits in; [etat] the sentence of the health card.
  function coffre({ netflix = 'toi', sante = 100, humeur = 'calm', titreEtat = null, sousEtat = null,
    alerte = false, badges = {}, choisi = null } = {}) {
    const toi = netflix === 'toi' ? ['banque', 'netflix', 'spotify'] : ['banque', 'spotify'];
    const agent = netflix === 'agent' ? ['netflix'] : [];
    let s = aurore(390, 844, humeur);
    s += enteteMobile(t('Coffre', 'Vault'), { actions: [['Plus', { primaire: true }], 'MagnifyingGlass', 'Bell'] });
    s += champ(18, 69, 354, t('Chercher dans 3 entrées', 'Search 3 entries'), { icone: 'MagnifyingGlass', touche: '/', h: 38 });
    s += verre(18, 122, 354, 68);
    s += anneau(54, 156, 44, sante);
    s += texte(90, 151, titreEtat || t('Tout va bien.', 'All is well.'), { taille: 15, couleur: APP.text, poids: 600 });
    s += texte(90, 172, sousEtat || t('Rien à signaler.', 'Nothing to report.'), { taille: 13, couleur: APP.muted });
    s += segmente(18, 205, 354, [[t('Tout', 'All'), 3], [t('Toi', 'You'), toi.length], [t('Agent', 'Agent'), agent.length]], 0);
    s += enteteZone(22, 274, 347, 'toi', toi.length);
    const hToi = toi.length * 62;
    s += verre(18, 286, 354, hToi, { opacite: 0.6 });
    toi.forEach((k, i) => {
      const droite = k === 'netflix' ? [['ClockCountdown', APP.faint]] : [];
      s += ligneEntree(18, 286 + i * 62, 354, ENTREES[k], { droite, choisi: choisi === k });
    });
    const yA = 286 + hToi + 31;
    s += enteteZone(22, yA, 347, 'agent', agent.length);
    if (agent.length) {
      s += verre(18, yA + 12, 354, 62, { opacite: 0.6 });
      const droite = alerte ? [['Warning', APP.warn], ['ClockCountdown', APP.faint]] : [['ClockCountdown', APP.faint]];
      s += ligneEntree(18, yA + 12, 354, ENTREES.netflix, { droite, choisi: choisi === 'netflix' });
    } else {
      s += `<rect x="18.5" y="${yA + 12.5}" width="353" height="77" rx="14" fill="none" stroke="${APP.line}" stroke-opacity="0.22" stroke-dasharray="4 4"/>`;
      s += icone('Sparkle', 32, yA + 27, 17, APP.faint);
      s += paragraphe(58, yA + 40, t('Rien de confié. Ouvre une entrée, puis « Confier à l’agent » : c’est toujours ton choix, entrée par entrée.',
        'Nothing handed over. Open an entry, then “Hand to the agent”: always your call, one entry at a time.'), { taille: 13, max: 296, couleur: APP.muted, interligne: 18 });
    }
    s += ongletsBas('coffre', { badges });
    return s;
  }

  /// The entry sheet of Netflix (06-fiche, 08a-fiche-confiee), full screen.
  function fiche({ zone = 'toi', code = '933 532', secondes = 24, bas = true } = {}) {
    const e = ENTREES.netflix;
    let s = `<rect width="390" height="844" fill="${APP.bg}"/>`;
    s += monogramme(e.nom, 19, 22, 52);
    s += texte(85, 45, e.nom, { taille: 26, couleur: APP.text, poids: 700, espace: -0.4 });
    s += puceZone(85, 55, zone, { taille: 12, h: 22 }).svg;
    s += icone('PencilSimple', 312, 37, 20, APP.muted) + icone('X', 351, 21, 20, APP.muted);
    s += verre(19, 96, 351, 320, { opacite: 0.6 });
    const sep = (y) => `<line x1="19" y1="${y}" x2="370" y2="${y}" stroke="${APP.line}" stroke-opacity="0.1"/>`;
    s += texte(35, 121, t('Identifiant', 'Username'), { taille: 13, couleur: APP.muted });
    s += texte(35, 150, e.id, { taille: 15, couleur: APP.text, poids: 500 }) + icone('Copy', 339, 136, 18, APP.muted);
    s += sep(172);
    s += texte(35, 197, t('Mot de passe', 'Password'), { taille: 13, couleur: APP.muted });
    s += texte(35, 222, '• • • • • • • • • • • • • • • •', { taille: 11, couleur: APP.muted, espace: 1.6 });
    s += force(35, 241, 2, { l: 97 }) + texte(141, 248, t('Faible, 11 caractères', 'Weak, 11 characters'), { taille: 12.5, couleur: APP.muted });
    s += icone('Eye', 305, 220, 20, APP.muted) + icone('Copy', 339, 221, 18, APP.muted);
    s += sep(264);
    s += texte(35, 290, t('Code à usage unique', 'One-time code'), { taille: 13, couleur: APP.muted });
    s += texte(35, 322, code, { taille: 23, couleur: APP.text, poids: 600, espace: 1 });
    s += `<circle cx="152" cy="314" r="9" fill="none" stroke="${APP.track}" stroke-opacity="0.3" stroke-width="2.4"/>
      <circle cx="152" cy="314" r="9" fill="none" stroke="${APP.accent}" stroke-width="2.4" stroke-dasharray="${(56.5 * secondes) / 30} 56.5" transform="rotate(-90 152 314)"/>`;
    s += texte(172, 319, `${secondes} s`, { taille: 12.5, couleur: APP.faint }) + icone('Copy', 339, 305, 18, APP.muted);
    s += sep(341);
    s += texte(35, 366, 'Site', { taille: 13, couleur: APP.muted });
    s += texte(35, 395, e.site, { taille: 15, couleur: APP.accentText }) + icone('ArrowSquareOut', 339, 380, 18, APP.muted);
    if (zone === 'agent') {
      s += verre(19, 433, 351, 254, { opacite: 0.6, halo: APP.violet });
      s += `<rect x="19" y="433" width="351" height="254" rx="16" fill="none" stroke="${APP.violet}" stroke-opacity="0.35"/>`;
      s += `<rect x="35" y="449" width="30" height="30" rx="8" fill="${APP.violet}" fill-opacity="0.15"/>` + icone('Sparkle', 41, 455, 18, APP.violetText, 'fill');
      s += texte(74, 469, t('L’agent s’occupe de ce compte', 'The agent looks after this account'), { taille: 15.5, couleur: APP.text, poids: 600 });
      s += paragraphe(35, 499, t('Il surveille les fuites de ce compte et peut changer son mot de passe. Aucune rotation régulière n’est réglée pour l’instant.',
        'It watches this account for breaches and can change its password. No regular rotation is set for now.'), { taille: 13.5, max: 318, couleur: APP.muted, interligne: 22 });
      s += `<rect x="35" y="563" width="320" height="61" rx="10" fill="${APP.glass2}" fill-opacity="0.7"/>`;
      [[t('Prochaine', 'Next'), t('Aucune', 'None')], [t('Changé le', 'Changed'), t('27 sept.', 'Sep 27')], ['Mode', t('Avec accord', 'With consent')]].forEach(([a, b], i) => {
        const x = 46 + i * 107;
        if (i) s += `<line x1="${x - 10}" y1="563" x2="${x - 10}" y2="624" stroke="${APP.line}" stroke-opacity="0.12"/>`;
        s += texte(x, 585, a, { taille: 12, couleur: APP.faint }) + texte(x, 608, b, { taille: 13.5, couleur: APP.text, poids: 600 });
      });
      s += icone('ArrowUUpLeft', 49, 643, 17, APP.muted) + texte(73, 659, t('Reprendre dans ma zone', 'Take back into my zone'), { taille: 14, couleur: APP.muted, poids: 500 });
    } else {
      s += verre(19, 433, 351, 157, { opacite: 0.6 });
      s += `<rect x="35" y="449" width="30" height="30" rx="8" fill="${APP.accent}" fill-opacity="0.15"/>` + icone('ShieldCheck', 41, 455, 18, APP.accentText);
      s += texte(74, 469, t('Protégé par toi', 'Protected by you'), { taille: 15.5, couleur: APP.text, poids: 600 });
      s += paragraphe(35, 499, t('Chiffré avec ta clé, qui ne quitte jamais tes appareils. L’agent te prévient en cas de fuite mais ne lit rien ici.',
        'Encrypted with your key, which never leaves your devices. The agent warns you of a breach but reads nothing here.'), { taille: 13.5, max: 322, couleur: APP.muted, interligne: 22 });
      s += bouton(35, 541, 158, 34, t('Confier à l’agent', 'Hand to the agent'), { icone: 'Sparkle', taille: 13.5 });
    }
    if (bas) {
      s += `<rect x="0" y="772" width="390" height="72" fill="${APP.bg}"/><line x1="0" y1="772" x2="390" y2="772" stroke="${APP.line}" stroke-opacity="0.1"/>`;
      s += boutonPrimaire(19, 788, 352, 41, t('Copier le mot de passe', 'Copy the password'), { icone: 'Copy', taille: 15 });
    }
    return s;
  }

  /// A dialog over a dimmed screen (Modal.tsx): icon tile, title, text,
  /// then two buttons. The title is Geist here: Syne never draws lower case
  /// in these diagrams.
  function dialogue({ icone: ic = 'Sparkle', titre, texte: phrase, annuler = t('Annuler', 'Cancel'), valider, y = 283, ton = 'accent' } = {}) {
    const lignesTitre = O.lignes(titre, 19, 250, { poids: 700 });
    const lignesTexte = O.lignes(phrase, 14, 320);
    const h = 60 + lignesTitre.length * 24 + 22 + lignesTexte.length * 21 + 26 + 66;
    let s = `<rect width="390" height="844" fill="#03050A" fill-opacity="0.66"/>`;
    s += `<rect x="10" y="${y}" width="370" height="${h}" rx="20" fill="${APP.panel}" fill-opacity="0.97" stroke="${APP.line}" stroke-opacity="0.16" filter="url(#ombreFlottante)"/>`;
    s += `<rect x="30" y="${y + 20}" width="34" height="34" rx="9" fill="${ton === 'crit' ? APP.crit : APP.accent}" fill-opacity="0.15"/>` + icone(ic, 37, y + 27, 20, ton === 'crit' ? APP.crit : APP.accentText);
    lignesTitre.forEach((l, i) => { s += texte(75, y + 44 + i * 24, l, { taille: 19, couleur: APP.text, poids: 700 }); });
    s += icone('X', 342, y + 24, 18, APP.muted);
    const yt = y + 44 + lignesTitre.length * 24 + 22;
    lignesTexte.forEach((l, i) => { s += texte(30, yt + i * 21, l, { taille: 14, couleur: APP.muted }); });
    const yb = yt + lignesTexte.length * 21 + 12;
    s += `<line x1="10" y1="${yb}" x2="380" y2="${yb}" stroke="${APP.line}" stroke-opacity="0.12"/>`;
    s += bouton(30, yb + 16, 160, 34, annuler, { taille: 14 });
    s += boutonPrimaire(199, yb + 16, 161, 34, valider, { taille: 14 });
    return { svg: s, h, boutons: yb + 33 };
  }

  return { coffre, fiche, dialogue };
};

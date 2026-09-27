// Screens and small helpers for the diagrams of the last three README parts
// (architecture, threat model, tests, versions). Phone screens are drawn in
// app units (390 x 844) from the real screenshots (serenity-shots/final) and
// from the components they come from (web/src). A screen is plain SVG: the
// diagram fades it in and out.
//
//   const A = require('./_ecrans-archi.js')(O);
module.exports = (O) => {
  const { t, texte, paragraphe, icone, verre, monogramme, anneau, puce, boutonPrimaire, bouton, champ, segmente, force,
    aurore, enteteMobile, ongletsBas, ENTREES, ligneEntree, enteteZone, visible, largeur, APP, MONO, ACCENT, FIL, BORD, CARTE, DISCRET } = O;

  /// The vault with the entries asked for, per zone ([toi], [agent]: keys of
  /// ENTREES), like 05-coffre and 08-coffre-delegue.
  function coffre({ toi = ['banque', 'spotify'], agent = ['demo'], sante = 100, humeur = 'calm', titreEtat = null, sousEtat = null,
    badges = {}, pointCloche = null } = {}) {
    const n = toi.length + agent.length;
    let s = aurore(390, 844, humeur);
    s += enteteMobile(t('Coffre', 'Vault'), { actions: [['Plus', { primaire: true }], 'MagnifyingGlass', 'Bell'], pointCloche });
    s += champ(18, 69, 354, t(`Chercher dans ${n} entrées`, `Search ${n} entries`), { icone: 'MagnifyingGlass', touche: '/', h: 38 });
    s += verre(18, 122, 354, 68);
    s += anneau(54, 156, 44, sante);
    s += texte(90, 151, titreEtat || t('Tout va bien.', 'All is well.'), { taille: 15, couleur: APP.text, poids: 600 });
    s += texte(90, 172, sousEtat || t('Rien à signaler.', 'Nothing to report.'), { taille: 13, couleur: APP.muted });
    s += segmente(18, 205, 354, [[t('Tout', 'All'), n], [t('Toi', 'You'), toi.length], [t('Agent', 'Agent'), agent.length]], 0);
    s += enteteZone(22, 274, 347, 'toi', toi.length);
    s += verre(18, 286, 354, toi.length * 62, { opacite: 0.6 });
    toi.forEach((k, i) => { s += ligneEntree(18, 286 + i * 62, 354, ENTREES[k]); });
    const yA = 286 + toi.length * 62 + 31;
    s += enteteZone(22, yA, 347, 'agent', agent.length);
    s += verre(18, yA + 12, 354, agent.length * 62, { opacite: 0.6 });
    agent.forEach((k, i) => { s += ligneEntree(18, yA + 12 + i * 62, 354, ENTREES[k], { droite: [['ClockCountdown', APP.faint]] }); });
    s += ongletsBas('coffre', { badges });
    return s;
  }

  /// The new entry editor, full screen on a phone (EntryEditor.tsx). The
  /// values are typed in by the diagram: [frappes] gives [de, a] per field,
  /// in the cycle [C]; without it the fields are shown filled.
  function editeur(e, { C = 10, frappes = null, enregistre = null } = {}) {
    let s = `<rect width="390" height="844" fill="${APP.bg}"/>`;
    // Header: the monogram shows up once a name is typed.
    s += `<rect x="19" y="20" width="44" height="44" rx="13" fill="${APP.line}" fill-opacity="0.06" stroke="${APP.line}" stroke-opacity="0.3" stroke-dasharray="4 3"/>`;
    const nomVu = frappes ? frappes[0][1] : 0;
    s += `<g opacity="${frappes ? 0 : 1}">${frappes ? visible(C, nomVu, 1.2, 0.004) : ''}${monogramme(e.nom, 19, 20, 44, { cle: e.cle })}</g>`;
    s += texte(75, 39, t('Nouvelle entrée', 'New entry'), { taille: 19, couleur: APP.text, poids: 700 });
    if (frappes) {
      s += `<g>${visible(C, 0, nomVu, 0.004)}${texte(75, 58, t('Donne-lui un nom pour commencer', 'Give it a name to begin'), { taille: 13, couleur: APP.faint })}</g>`;
      s += `<g opacity="0">${visible(C, nomVu, 1.2, 0.004)}${texte(75, 58, e.nom, { taille: 13, couleur: APP.faint })}</g>`;
    } else s += texte(75, 58, e.nom, { taille: 13, couleur: APP.faint });
    s += icone('X', 351, 24, 20, APP.muted);
    s += `<line x1="0" y1="82" x2="390" y2="82" stroke="${APP.line}" stroke-opacity="0.1"/>`;
    // Where it lands, said before anything is typed.
    s += `<rect x="19" y="98" width="352" height="112" rx="12" fill="${APP.accent}" fill-opacity="0.12"/>`;
    s += icone('ShieldCheck', 33, 110, 18, APP.accentText, 'bold');
    s += puce(60, 106, t('Protégé par toi', 'Protected by you'), 'accent', { taille: 12, h: 22 }).svg;
    s += paragraphe(60, 150, t('Tout arrive d’abord dans ta zone personnelle. Tu pourras la confier à l’agent ensuite, si tu le veux.',
      'Everything lands in your personal zone first. You can hand it to the agent later, if you want to.'), { taille: 13, max: 296, couleur: APP.muted, interligne: 19 });
    const champs = [
      [t('Nom', 'Name'), e.nom, false],
      [t('Identifiant sur le site', 'Username on the site'), e.id, false],
      [t('Mot de passe', 'Password'), '• • • • • • • • • • • • • •', true],
      [t('Adresse du site', 'Site address'), e.site, false],
    ];
    champs.forEach(([label, valeur, mdp], i) => {
      const y = 228 + i * 80;
      s += champ(19, y, 352, '', { label });
      const opts = { taille: mdp ? 11 : 15, couleur: mdp ? APP.muted : APP.text, espace: mdp ? 1.4 : 0 };
      s += frappes ? O.frappe(33, y + 49, valeur, C, frappes[i][0], frappes[i][1], opts) : texte(33, y + 49, valeur, opts);
      if (mdp) {
        s += icone('MagicWand', 339, y + 34, 18, APP.muted);
        s += `<g opacity="${frappes ? 0 : 1}">${frappes ? visible(C, frappes[i][1], 1.2, 0.004) : ''}${force(19, y + 72, 4, { l: 97 })}</g>`;
      }
    });
    s += texte(21, 553, t('Sert à reconnaître le site dans les alertes de fuite.', 'Used to recognise the site in breach alerts.'), { taille: 12.5, couleur: APP.faint });
    s += champ(19, 596, 352, t('otpauth://… ou la clé', 'otpauth://… or the key'), { label: t('Clé TOTP (facultatif)', 'TOTP key (optional)') });
    s += `<rect x="0" y="772" width="390" height="72" fill="${APP.bg}"/><line x1="0" y1="772" x2="390" y2="772" stroke="${APP.line}" stroke-opacity="0.1"/>`;
    s += bouton(19, 788, 170, 42, t('Annuler', 'Cancel'), { taille: 15 });
    s += boutonPrimaire(201, 788, 170, 42, t('Enregistrer', 'Save'), { taille: 15 });
    if (enregistre) s += O.toucher(286, 809, C, enregistre);
    return s;
  }

  /// The Agent screen with one rotation waiting (AgentScreen.tsx, 11-agent):
  /// four steps in the agent's own words, then Refuse / Approve.
  function agent(e, { domaine = e.site, fuite = true, autorise = true } = {}) {
    let s = aurore(390, 844, 'agent');
    s += enteteMobile(t('Agent', 'Agent'), {
      actions: ['TerminalWindow', 'MagnifyingGlass', 'Bell'], pointCloche: APP.warn,
      sous: t('Ce qu’il surveille, ce qu’il te propose, et ce qu’il a fait.', 'What it watches, what it suggests, and what it did.'),
    });
    s += `<circle cx="25" cy="104" r="3.5" fill="${APP.warn}"/>`;
    s += texte(39, 109, t('EN ATTENTE DE TON ACCORD', 'WAITING FOR YOUR CONSENT'), { taille: 12, couleur: APP.muted, poids: 600, espace: 1.2 });
    s += verre(18, 123, 354, 584, { halo: APP.violet });
    s += monogramme(e.nom, 34, 139, 44, { cle: e.cle });
    O.lignes(t(`Changer le mot de passe de ${e.nom}`, `Change the password of ${e.nom}`), 16.5, 250, { poids: 600 })
      .forEach((l, i) => { s += texte(91, 154 + i * 21, l, { taille: 16.5, couleur: APP.text, poids: 600 }); });
    s += texte(91, 199, fuite ? t('Proposée à l’instant, après une fuite.', 'Suggested just now, after a breach.') : t('Proposée à l’instant, échéance.', 'Suggested just now, due date.'), { taille: 13, couleur: APP.muted });
    let y = 216;
    if (fuite) {
      s += `<rect x="34" y="${y}" width="322" height="58" rx="12" fill="${APP.warn}" fill-opacity="0.1"/>`;
      s += icone('SealWarning', 46, y + 11, 18, APP.warnText);
      s += paragraphe(72, y + 24, t('Le mot de passe actuel est apparu dans une fuite connue. Plus vite il change, mieux c’est.',
        'The current password showed up in a known breach. The sooner it changes, the better.'), { taille: 13, max: 272, couleur: APP.text, interligne: 18 });
      y += 72;
    }
    s += texte(34, y + 16, t('CE QUE L’AGENT FERA', 'WHAT THE AGENT WILL DO'), { taille: 12, couleur: APP.faint, poids: 600, espace: 1.2 });
    y += 28;
    const etapes = [
      [t('Générer', 'Generate'), t('Un mot de passe neuf de 24 caractères, gardé en révision en attente.', 'A new 24-character password, kept as a pending revision.')],
      [t('Changer', 'Change'), autorise ? t(`Connexion à ${domaine} et remplacement du mot de passe.`, `Signs in to ${domaine} and replaces the password.`)
        : t('Ce site n’est pas dans l’allowlist : tu feras le changement toi-même, guidé.', 'This site is not in the allowlist: you will make the change yourself, guided.')],
      [t('Prouver', 'Prove'), t('Reconnexion avec le nouveau : l’ancien doit être refusé.', 'Signs in again with the new one: the old one must be refused.')],
      [t('Valider', 'Confirm'), t('La révision devient la bonne. Sinon, retour à l’ancien.', 'The revision becomes the current one. Otherwise, back to the old one.')],
    ];
    etapes.forEach(([titre, phrase], i) => {
      const l = O.lignes(phrase, 12.5, 262);
      const h = 34 + l.length * 17;
      s += `<rect x="34" y="${y}" width="322" height="${h}" rx="12" fill="${APP.line}" fill-opacity="0.05" stroke="${APP.line}" stroke-opacity="0.1"/>`;
      s += texte(47, y + 22, String(i + 1).padStart(2, '0'), { taille: 11, couleur: APP.violetText, police: MONO, poids: 600 });
      s += texte(74, y + 23, titre, { taille: 14.5, couleur: APP.text, poids: 600 });
      l.forEach((ll, k) => { s += texte(74, y + 42 + k * 17, ll, { taille: 12.5, couleur: APP.muted }); });
      y += h + 7;
    });
    const yb = y + 8;
    s += `<line x1="18" y1="${yb}" x2="372" y2="${yb}" stroke="${APP.line}" stroke-opacity="0.1"/>`;
    s += bouton(30, yb + 14, 122, 44, t('Refuser', 'Refuse'), { icone: 'X', taille: 15 });
    s += boutonPrimaire(160, yb + 14, 198, 44, t('Approuver', 'Approve'), { icone: 'Check', taille: 15 });
    s += ongletsBas('agent', { badges: { agent: 1 } });
    return { svg: s, approuver: [259, yb + 36] };
  }

  // ------------------------------------------------ helpers in diagram units

  /// Merges [de, a] intervals that touch, so a border never fades out and in
  /// again at the same instant.
  function fusionne(liste) {
    const l = [...liste].sort((p, q) => p[0] - q[0]);
    const out = [];
    for (const [de, a] of l) {
      if (out.length && de <= out[out.length - 1][1] + 0.002) out[out.length - 1][1] = Math.max(out[out.length - 1][1], a);
      else out.push([de, a]);
    }
    return out;
  }

  /// A card whose whole border lights up during each interval (never a
  /// coloured bar on a side).
  function cadre(x, y, l, h, C, intervalles = [], { rx = 14, couleur = ACCENT, fond = CARTE, pointille = false } = {}) {
    let s = `<rect x="${x}" y="${y}" width="${l}" height="${h}" rx="${rx}" fill="${fond}" stroke="${BORD}"${pointille ? ' stroke-dasharray="5 4"' : ''}/>`;
    for (const [de, a] of fusionne(intervalles)) {
      s += `<rect x="${x}" y="${y}" width="${l}" height="${h}" rx="${rx}" fill="${couleur}" fill-opacity="0.07" stroke="${couleur}" stroke-width="1.5" opacity="0">${visible(C, de, a)}</rect>`;
    }
    return s;
  }

  /// A wire, grey, lit during each interval.
  function fil(C, chemin, intervalles = [], { couleur = ACCENT, pointille = false } = {}) {
    let s = `<path d="${chemin}" fill="none" stroke="${FIL}" stroke-width="1.8"${pointille ? ' stroke-dasharray="4 4"' : ''}/>`;
    for (const [de, a] of fusionne(intervalles)) {
      s += `<path d="${chemin}" fill="none" stroke="${couleur}" stroke-width="2" stroke-opacity="0.85" opacity="0">${visible(C, de, a)}</path>`;
    }
    return s;
  }

  /// A path through points, and the same path the other way round.
  const chemin = (pts) => 'M' + pts.map((p) => p.join(' ')).join(' L');
  const inverse = (pts) => chemin([...pts].reverse());

  /// A terminal window: three dots, a title, a dark body.
  function terminal(x, y, l, h, titre) {
    return `<rect x="${x}" y="${y}" width="${l}" height="${h}" rx="14" fill="#0A0D12" stroke="${BORD}" filter="url(#ombreFlottante)"/>
      <path d="M${x} ${y + 36} H${x + l}" stroke="${BORD}"/>
      <circle cx="${x + 22}" cy="${y + 18}" r="5" fill="${FIL}"/><circle cx="${x + 39}" cy="${y + 18}" r="5" fill="${FIL}"/><circle cx="${x + 56}" cy="${y + 18}" r="5" fill="${FIL}"/>
      ${texte(x + l / 2, y + 22.5, titre, { taille: 12, couleur: DISCRET, police: MONO, ancre: 'middle' })}`;
  }

  return { coffre, editeur, agent, cadre, fil, fusionne, chemin, inverse, terminal };
};

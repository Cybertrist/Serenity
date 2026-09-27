// Phone screens of the rotation diagrams (rotation, retour-arriere,
// garde-fous), drawn in app units (390 x 844) from the real screenshots
// (serenity-shots/final 11-agent, 20-bureau-agent, 20b-bureau-agent-arrete,
// 08a-fiche-confiee) and from the components they come from
// (web/src/features/agent/AgentScreen.tsx, features/vault/EntryDialog.tsx,
// features/notifications/NotificationsDialog.tsx, design/HoldSwitch.tsx).
//
// The entry is the demo site's: the only one with a recipe, and the only
// domain of the default allowlist (api/allowlist.yaml).
//
// Screens are plain SVG. The diagrams fade them in and out with entre(),
// and animate the kill switch on their own (see interrupteur()).
module.exports = (O) => {
  const { t, esc, texte, paragraphe, lignes, largeur, icone, verre, monogramme, orbe, puce, puceZone, boutonPrimaire, bouton,
    enteteMobile, ongletsBas, force, APP, MONO, SANS, TONS } = O;

  const DEMO = O.ENTREES.demo;
  // A password as the agent draws it: 24 characters, one of each class, from
  // the alphabet of api/serenity/rotator/passwords.py.
  const NOUVEAU = 'tQ7m-Vh2K#pX9wE=rN4c_Bz8';
  // The starting password of the demo entry (docs/08-rotation.md).
  const ANCIEN = 'mot-de-passe-de-depart';

  /// A small uppercase label, like the `eyebrow` class.
  const sourcil = (x, y, s, { couleur = APP.muted, taille = 11 } = {}) =>
    texte(x, y, s.toUpperCase(), { taille, couleur, poids: 600, espace: 1.1 });

  /// A password in clear, like <PasswordText>: mono, digits in blue,
  /// symbols in violet.
  function motDePasse(x, y, s, { taille = 14.5 } = {}) {
    const spans = Array.from(s).map((c) => {
      const f = /[0-9]/.test(c) ? APP.accentText : /[^\p{L}]/u.test(c) ? APP.violetText : APP.text;
      return `<tspan fill="${f}">${esc(c)}</tspan>`;
    }).join('');
    return `<text x="${x}" y="${y}" font-family="${MONO}" font-size="${taille}" font-weight="500" fill="${APP.text}" letter-spacing="0.3">${spans}</text>`;
  }

  /// A toast that wraps on two lines when the sentence is long.
  function toast(s, { y = 700, ton = 'ok', icone: ic = 'CheckCircle' } = {}) {
    const ls = lignes(s, 13.5, 290, { poids: 500 });
    const l = Math.min(354, Math.max(...ls.map((x) => largeur(x, 13.5, { poids: 500 }))) + 60);
    const h = 22 + ls.length * 20;
    const x = 195 - l / 2;
    return `<rect x="${x}" y="${y}" width="${l}" height="${h}" rx="12" fill="${APP.panel}" fill-opacity="0.97" stroke="${APP.line}" stroke-opacity="0.16" filter="url(#ombreFlottante)"/>
      ${icone(ic, x + 16, y + 12, 18, TONS[ton][0], 'fill')}
      ${ls.map((m, i) => texte(x + 42, y + 26 + i * 20, m, { taille: 13.5, couleur: APP.text, poids: 500 })).join('')}`;
  }

  // ------------------------------------------------------------ Agent screen

  /// The header of the Agent screen on a phone.
  const enteteAgent = ({ point = null } = {}) =>
    enteteMobile('Agent', { actions: ['TerminalWindow', 'MagnifyingGlass', 'Bell'], pointCloche: point }) +
    texte(19, 80, t('Ce qu’il surveille, ce qu’il te propose, et ce qu’il a fait.', 'What it watches, what it offers you, and what it did.'),
      { taille: 12.5, couleur: APP.muted });

  /// The track of the kill switch (HoldSwitch), without its moving parts:
  /// the two faint labels. The fill and the thumb are drawn by
  /// interrupteur(), static or animated.
  const SW = { x: 34, l: 322, h: 56 };
  const piste = (y) => `<rect x="${SW.x}" y="${y}" width="${SW.l}" height="${SW.h}" rx="14" fill="#94A3C4" fill-opacity="0.07" stroke="${APP.line}" stroke-opacity="0.1"/>
    <rect x="${SW.x + 1}" y="${y + 1}" width="${SW.l - 2}" height="6" rx="3" fill="#000000" fill-opacity="0.12"/>
    ${texte(SW.x + SW.l / 4, y + 32, t('MARCHE', 'ON'), { taille: 10.5, couleur: APP.faint, police: MONO, poids: 600, ancre: 'middle', espace: 1.4 })}
    ${texte(SW.x + (3 * SW.l) / 4, y + 32, t('ARRÊT', 'OFF'), { taille: 10.5, couleur: APP.faint, police: MONO, poids: 600, ancre: 'middle', espace: 1.4 })}`;
  // The thumb: half the inner width, minus 3 px; it travels 159 px.
  const POUCE = { l: (SW.l - 10) / 2 - 3, course: (SW.l - 10) / 2 - 3 + 6 };
  /// The thumb itself, at its left position (x = 39); translate it by
  /// POUCE.course to reach the right.
  function pouce(y, marche) {
    const mot = marche ? t('MARCHE', 'ON') : t('ARRÊT', 'OFF');
    const lm = largeur(mot, 11, { police: MONO }) + 1.1 * mot.length;
    const cx = SW.x + 5 + POUCE.l / 2;
    const x0 = cx - (lm + 22) / 2;
    return `<rect x="${SW.x + 5}" y="${y + 5}" width="${POUCE.l}" height="${SW.h - 10}" rx="10" fill="${APP.panel}" stroke="${APP.line}" stroke-opacity="0.22" filter="url(#ombreFlottante)"/>
      <path d="M${SW.x + 15} ${y + 5.6} H${SW.x + POUCE.l - 5}" stroke="#FFFFFF" stroke-opacity="0.08"/>
      ${icone('Power', x0, y + SW.h / 2 - 8, 16, marche ? APP.ok : APP.faint, 'bold')}
      ${texte(x0 + 22, y + SW.h / 2 + 4, mot, { taille: 11, couleur: APP.text, police: MONO, poids: 600, espace: 1.1 })}`;
  }
  /// The hint under the switch.
  const indice = (y, s) => texte(SW.x, y + SW.h + 20, s, { taille: 10.5, couleur: APP.faint, police: MONO, poids: 500, espace: 0.6 });
  const INDICES = {
    arreter: t('MAINTIENS 1 S POUR ARRÊTER', 'HOLD 1 S TO STOP'),
    relancer: t('MAINTIENS 1 S POUR RELANCER', 'HOLD 1 S TO RESTART'),
    tenir: t('CONTINUE À MAINTENIR', 'KEEP HOLDING'),
  };
  /// A still kill switch: running (thumb on the left) or stopped.
  const interrupteur = (y, marche) => piste(y) +
    `<g transform="translate(${marche ? 0 : POUCE.course} 0)">${pouce(y, marche)}</g>` +
    indice(y, marche ? INDICES.arreter : INDICES.relancer);

  /// The state card (StateCard): orb, kill switch state, sentence, switch.
  /// [avecInterrupteur] false leaves the switch to an animated overlay.
  /// Returns { svg, h, ySwitch }.
  function carteEtat(y, { marche = true, avecInterrupteur = true, ligne = null, parties = 'tout' } = {}) {
    // [parties]: 'fond' is what never changes (glass, well, the sentence
    // under the switch, the track); 'etat' what the switch changes (halo,
    // orb, words). A diagram animating the switch fades 'etat' only.
    const H = 266;
    let fond = verre(18, y, 354, H);
    fond += `<circle cx="64" cy="${y + 50}" r="30" fill="#94A3C4" fill-opacity="0.07" stroke="${APP.line}" stroke-opacity="0.1"/>`;
    fond += paragraphe(34, y + 228, t('Ce switch est relu avant chaque action : coupé, l’agent s’arrête net. Tes entrées ne changent pas.',
      'This switch is read again before every action: off, the agent stops dead. Your entries stay as they are.'),
    { taille: 12.5, max: 320, couleur: APP.faint, interligne: 18 });
    let etat = verre(18, y, 354, H, { opacite: 0, bord: 0, halo: marche ? APP.violet : '#64748B' });
    etat += orbe(64, y + 50, 40, { eteint: !marche });
    const ks = t('KILL SWITCH', 'KILL SWITCH');
    etat += sourcil(106, y + 30, ks, { couleur: APP.faint });
    etat += sourcil(106 + largeur(ks, 11, { poids: 600 }) + 1.1 * ks.length + 6, y + 30,
      marche ? t('En marche', 'Running') : t('Arrêté', 'Stopped'), { couleur: marche ? APP.ok : APP.warnText });
    etat += texte(106, y + 56, marche ? t('L’agent veille', 'The agent is watching') : t('L’agent est arrêté', 'The agent is stopped'),
      { taille: 20, couleur: APP.text, poids: 700, espace: -0.2 });
    const phrase = ligne || (marche
      ? t('Il surveille 1 entrée confiée et prépare les rotations.', 'It watches 1 entry handed over and prepares the rotations.')
      : t('Kill switch enclenché à l’instant. Plus aucune veille ni rotation.', 'Kill switch engaged just now. No more watching, no more rotations.'));
    etat += paragraphe(106, y + 78, phrase, { taille: 12.5, max: 250, couleur: APP.muted, interligne: 17 });
    const ySwitch = y + 126;
    const inter = avecInterrupteur ? interrupteur(ySwitch, marche) : '';
    const svg = parties === 'fond' ? fond + (avecInterrupteur ? '' : piste(ySwitch)) : parties === 'etat' ? etat : fond + etat + inter;
    return { svg, h: H, ySwitch };
  }

  /// The activity card: the 24 hour strip, then four figures.
  /// [points]: [[x in 0..1 of the day, 'rotation'|'fuite'|'proposition'|'veille']].
  function carteActivite(y, { stats = [1, 0, 0, 0], points = [], etiquette = null } = {}) {
    const H = 252;
    let s = verre(18, y, 354, H);
    s += sourcil(34, y + 26, t('Activité · 24 h', 'Activity · 24 h'), { couleur: APP.muted });
    let lx = 34;
    [[APP.ok, t('Rotation', 'Rotation')], [APP.crit, t('Fuite', 'Breach')], [APP.warn, t('Proposition', 'Proposal')], [null, t('Veille', 'Watch')]].forEach(([c, mot]) => {
      s += c ? `<circle cx="${lx + 3.5}" cy="${y + 45}" r="3.5" fill="${c}"/>` : `<circle cx="${lx + 3.5}" cy="${y + 45}" r="3" fill="none" stroke="${APP.faint}" stroke-width="1.3"/>`;
      s += texte(lx + 11, y + 49, mot, { taille: 11, couleur: APP.faint });
      lx += 11 + largeur(mot, 11) + 14;
    });
    const x0 = 40, x1 = 346, yl = y + 86;
    s += `<line x1="${x0}" y1="${yl}" x2="${x1}" y2="${yl}" stroke="${APP.line}" stroke-opacity="0.22"/>`;
    for (let i = 0; i <= 24; i++) {
      const x = x0 + ((x1 - x0) * i) / 24;
      s += `<line x1="${x}" y1="${yl - (i % 6 ? 2 : 4)}" x2="${x}" y2="${yl + (i % 6 ? 2 : 4)}" stroke="${APP.line}" stroke-opacity="0.3"/>`;
    }
    ['00h', '06h', '12h', '18h'].forEach((h, i) => { s += texte(x0 + ((x1 - x0) * i) / 4 + 12, yl + 20, h, { taille: 10, couleur: APP.faint, police: MONO, ancre: 'middle' }); });
    s += texte(x1, yl + 20, '20:40', { taille: 10, couleur: APP.accentText, police: MONO, poids: 600, ancre: 'end' });
    points.forEach(([f, genre]) => {
      const x = x0 + (x1 - x0) * f;
      if (genre === 'proposition') s += `<rect x="${x - 4}" y="${yl - 4}" width="8" height="8" fill="${APP.warn}" transform="rotate(45 ${x} ${yl})"/>`;
      else if (genre === 'veille') s += `<circle cx="${x}" cy="${yl}" r="3.5" fill="${APP.bg}" stroke="${APP.faint}" stroke-width="1.4"/>`;
      else s += `<circle cx="${x}" cy="${yl}" r="4" fill="${genre === 'rotation' ? APP.ok : APP.crit}"/>`;
    });
    if (etiquette) {
      const l = largeur(etiquette, 9.5, { police: MONO }) + 14;
      s += `<rect x="${x1 - l}" y="${yl - 32}" width="${l}" height="18" rx="4" fill="${APP.panel}" stroke="${APP.line}" stroke-opacity="0.22"/>` +
        texte(x1 - l / 2, yl - 19.5, etiquette, { taille: 9.5, couleur: APP.muted, police: MONO, ancre: 'middle' });
    }
    const ys = y + 124;
    s += `<rect x="34" y="${ys}" width="322" height="113" rx="12" fill="${APP.line}" fill-opacity="0.1"/>`;
    const cases = [
      [t('Surveillées', 'Watched'), stats[0], t('entrées', 'entries')],
      [t('Rotations 30 j', 'Rotations 30 d'), stats[1], stats[1] ? t('prouvées', 'proven') : ''],
      [t('En attente', 'Waiting'), stats[2], '', stats[2] ? APP.warnText : null],
      [t('Échecs 30 j', 'Failures 30 d'), stats[3], '', stats[3] ? APP.crit : null],
    ];
    cases.forEach(([mot, n, unite, c], i) => {
      const cx = 34 + (i % 2) * 161.5, cy = ys + Math.floor(i / 2) * 56.5;
      s += `<rect x="${cx + 0.5}" y="${cy + 0.5}" width="160" height="55.5" rx="${0}" fill="${APP.panel}" fill-opacity="0.85"/>`;
      s += sourcil(cx + 14, cy + 20, mot, { couleur: APP.faint, taille: 9.5 });
      s += texte(cx + 14, cy + 45, String(n), { taille: 22, couleur: c || APP.text, poids: 600 });
      if (unite) s += texte(cx + 22 + largeur(String(n), 22, { poids: 600 }), cy + 45, unite, { taille: 11, couleur: APP.faint });
    });
    s += `<rect x="34" y="${ys}" width="322" height="113" rx="12" fill="none" stroke="${APP.line}" stroke-opacity="0.1"/>`;
    return { svg: s, h: H };
  }

  /// "Rotations en cours": the Running card, approved or in progress.
  function suivi(y, { enCours = true } = {}) {
    let s = `<circle cx="25" cy="${y - 4}" r="3" fill="${APP.violet}"/>` + sourcil(36, y, t('Rotations en cours', 'Rotations under way'));
    const yc = y + 14;
    s += verre(18, yc, 354, 96);
    s += monogramme(DEMO.nom, 34, yc + 16, 36, { cle: DEMO.cle });
    s += texte(80, yc + 30, t(`${DEMO.nom} : `, `${DEMO.nom}: `) + (enCours ? t('rotation en cours', 'rotation under way') : t('approuvée', 'approved')), { taille: 14.5, couleur: APP.text, poids: 600 });
    s += paragraphe(80, yc + 49, enCours
      ? t('Changement sur le site, puis reconnexion pour preuve.', 'Change on the site, then a fresh sign-in as proof.')
      : t('Étape 1 sur 4 : elle part au prochain passage de l’agent.', 'Step 1 of 4: it leaves on the agent’s next pass.'),
    { taille: 12.5, max: 250, couleur: APP.muted, interligne: 17 });
    if (enCours) s += `<circle cx="346" cy="${yc + 28}" r="7" fill="none" stroke="${APP.violet}" stroke-width="2" stroke-dasharray="30 14"/>`;
    const yb = yc + 80;
    s += `<rect x="34" y="${yb}" width="322" height="6" rx="3" fill="${APP.track}" fill-opacity="0.3"/>`;
    const g = O.id('suivi');
    s += `<linearGradient id="${g}" x1="0" x2="1"><stop offset="0" stop-color="${APP.accent}"/><stop offset="1" stop-color="${APP.violet}"/></linearGradient>
      <rect x="34" y="${yb}" width="${322 * (enCours ? 0.62 : 0.18)}" height="6" rx="3" fill="url(#${g})"/>`;
    return s;
  }

  /// The empty "Prochaines rotations" section, cut by the tab bar.
  function prochaines(y) {
    let s = sourcil(22, y, t('Prochaines rotations', 'Next rotations'));
    s += `<rect x="18.5" y="${y + 14.5}" width="353" height="120" rx="16" fill="none" stroke="${APP.line}" stroke-opacity="0.22" stroke-dasharray="4 4"/>`;
    s += `<rect x="175" y="${y + 30}" width="40" height="40" rx="12" fill="#94A3C4" fill-opacity="0.08"/>` + icone('ArrowsClockwise', 184, y + 39, 22, APP.muted);
    s += texte(195, y + 94, t('Aucune rotation prévue.', 'No rotation planned.'), { taille: 14.5, couleur: APP.text, poids: 600, ancre: 'middle' });
    return s;
  }

  /// "Prochaines rotations" with the demo site on a 30 day policy, due
  /// tomorrow: the date a failure pushes to the next day.
  function prochaineDemain(y) {
    let s = sourcil(22, y, t('Prochaines rotations', 'Next rotations'));
    s += verre(18, y + 14, 354, 64);
    s += monogramme(DEMO.nom, 34, y + 29, 34, { cle: DEMO.cle });
    s += texte(80, y + 42, DEMO.nom, { taille: 14.5, couleur: APP.text, poids: 500 });
    s += texte(80, y + 60, t(`${DEMO.site} · avec ton accord`, `${DEMO.site} · with your consent`), { taille: 12, couleur: APP.muted });
    s += texte(356, y + 42, t('28 septembre', 'September 28'), { taille: 12.5, couleur: APP.text, poids: 500, ancre: 'end' });
    s += texte(356, y + 60, t('dans 1 j', 'in 1 d'), { taille: 11, couleur: APP.faint, ancre: 'end' });
    return s;
  }

  /// The Agent screen once nothing waits for an answer: state card,
  /// activity, then [bas] ('suivi', 'approuvee', 'prochaines').
  function agent({ marche = true, avecInterrupteur = true, humeur = null, stats, points, etiquette = null, bas = 'prochaines', point = null, ligne = null } = {}) {
    let s = O.aurore(390, 844, humeur || (marche ? 'agent' : 'off'));
    s += enteteAgent({ point });
    const e = carteEtat(100, { marche, avecInterrupteur, ligne });
    s += e.svg;
    s += carteActivite(382, { stats, points, etiquette }).svg;
    if (bas === 'suivi' || bas === 'approuvee') s += suivi(660, { enCours: bas === 'suivi' });
    else if (bas === 'demain') s += prochaineDemain(660);
    else s += prochaines(660);
    s += ongletsBas('agent');
    return s;
  }
  // Where the switch of agent() sits, for an animated overlay.
  const Y_SWITCH = 226;

  /// The Agent screen with a rotation waiting for your answer (11-agent),
  /// on the demo site: allowlisted, so the agent will change it itself.
  function proposition({ point = APP.warn } = {}) {
    let s = O.aurore(390, 844, 'agent');
    s += enteteAgent({ point });
    s += `<circle cx="25" cy="101" r="3" fill="${APP.warn}"/>` + sourcil(36, 105, t('En attente de ton accord', 'Waiting for your answer'));
    const titre = lignes(t(`Changer le mot de passe de ${DEMO.nom}`, `Change the password of ${DEMO.nom}`), 16, 262, { poids: 600 });
    const d = (titre.length - 1) * 21;
    const Y = 123, H = 574 + d;
    s += verre(18, Y, 354, H, { halo: APP.violet });
    s += monogramme(DEMO.nom, 34, Y + 16, 44, { cle: DEMO.cle });
    titre.forEach((l, i) => { s += texte(91, Y + 34 + i * 21, l, { taille: 16, couleur: APP.text, poids: 600 }); });
    s += texte(91, Y + 55 + d, t('Proposée à l’instant, après une fuite.', 'Offered just now, after a breach.'), { taille: 13, couleur: APP.muted });
    const yn = Y + 74 + d;
    s += `<rect x="34" y="${yn}" width="322" height="56" rx="10" fill="${APP.warn}" fill-opacity="0.1"/>` + icone('SealWarning', 46, yn + 11, 17, APP.warnText);
    s += paragraphe(71, yn + 23, t('Le mot de passe actuel est apparu dans une fuite connue. Plus vite il change, mieux c’est.',
      'The current password showed up in a known breach. The sooner it changes, the better.'), { taille: 13, max: 272, couleur: APP.text, interligne: 18 });
    s += sourcil(34, yn + 80, t('Ce que l’agent fera', 'What the agent will do'), { couleur: APP.muted });
    const etapes = [
      [t('Générer', 'Generate'), t('Un mot de passe neuf de 24 caractères, gardé en révision en attente.', 'A fresh 24 character password, kept as a pending revision.')],
      [t('Changer', 'Change'), t(`Connexion à ${DEMO.site} et remplacement du mot de passe.`, `Sign-in on ${DEMO.site} and password replaced.`)],
      [t('Prouver', 'Prove'), t('Reconnexion avec le nouveau : l’ancien doit être refusé.', 'Sign in again with the new one: the old one must be refused.')],
      [t('Valider', 'Confirm'), t('La révision devient la bonne. Sinon, retour à l’ancien.', 'The revision becomes the real one. Otherwise, back to the old one.')],
    ];
    etapes.forEach(([mot, phrase], i) => {
      const y = yn + 92 + i * 82;
      s += `<rect x="34" y="${y}" width="322" height="74" rx="12" fill="#94A3C4" fill-opacity="0.06" stroke="${APP.line}" stroke-opacity="0.1"/>`;
      s += texte(47, y + 24, `0${i + 1}`, { taille: 11, couleur: APP.violetText, police: MONO, poids: 600 });
      s += texte(72, y + 24, mot, { taille: 14.5, couleur: APP.text, poids: 600 });
      s += paragraphe(72, y + 44, phrase, { taille: 12.5, max: 272, couleur: APP.muted, interligne: 17 });
    });
    const yb = Y + H - 62;
    s += `<line x1="18" y1="${yb}" x2="372" y2="${yb}" stroke="${APP.line}" stroke-opacity="0.1"/>`;
    s += bouton(31, yb + 12, 119, 40, t('Refuser', 'Decline'), { icone: 'X', taille: 14.5 });
    s += boutonPrimaire(158, yb + 12, 201, 40, t('Approuver', 'Approve'), { icone: 'Check', taille: 14.5, touche: t('Entrée', 'Enter') });
    s += carteEtat(Y + H + 18, { marche: true }).svg;
    s += ongletsBas('agent', { badges: { agent: 1 } });
    return { svg: s, approuver: [258, yb + 32], refuser: [90, yb + 32] };
  }

  // ------------------------------------------------------ notifications

  // The looks of NotificationsDialog.tsx, per kind.
  const GENRES = {
    'rotation.done': ['CheckCircle', 'ok', t('Mot de passe changé par l’agent, preuve de connexion validée.', 'Password changed by the agent, sign-in proof confirmed.')],
    'rotation.failed': ['Warning', 'warn', t('Rotation annulée, rien n’a changé.', 'Rotation cancelled, nothing changed.')],
    'rotation.manual': ['HandTap', 'warn', t('Rotation à terminer toi-même.', 'Rotation for you to finish.')],
  };
  /// The notification centre with one unread line, over the dimmed screen.
  /// Returns { svg, ligne: [x, y] of the line to tap }.
  function notifications(genre) {
    const [ic, ton, phrase] = GENRES[genre];
    const Y = 150;
    let s = `<rect x="30" y="${Y + 20}" width="34" height="34" rx="9" fill="${APP.accent}" fill-opacity="0.15"/>` + icone('Bell', 37, Y + 27, 20, APP.accentText);
    s += texte(76, Y + 36, 'Notifications', { taille: 19, couleur: APP.text, poids: 700 });
    s += texte(76, Y + 55, t('1 non lue', '1 unread'), { taille: 13, couleur: APP.muted });
    s += icone('X', 342, Y + 24, 18, APP.muted);
    const yg = Y + 92;
    const mot = t('Non lues', 'Unread');
    s += sourcil(34, yg, mot, { couleur: APP.muted });
    s += `<line x1="${44 + largeur(mot.toUpperCase(), 11, { poids: 600 }) + 10}" y1="${yg - 4}" x2="338" y2="${yg - 4}" stroke="${APP.line}" stroke-opacity="0.1"/>` +
      texte(352, yg, '1', { taille: 11, couleur: APP.faint, ancre: 'end' });
    const yl = yg + 12;
    const lp = lignes(phrase, 12.5, 236);
    const hl = 62 + lp.length * 17;
    s += verre(30, yl, 330, hl, { rx: 16 });
    s += `<rect x="30" y="${yl}" width="330" height="${hl}" rx="16" fill="${APP.accent}" fill-opacity="0.05"/>`;
    s += `<rect x="44" y="${yl + 14}" width="32" height="32" rx="9" fill="${TONS[ton][0]}" fill-opacity="0.15"/>` + icone(ic, 52, yl + 22, 16, TONS[ton][2], 'bold');
    s += texte(88, yl + 30, DEMO.nom, { taille: 14.5, couleur: APP.text, poids: 600 });
    lp.forEach((l, i) => { s += texte(88, yl + 49 + i * 17, l, { taille: 12.5, couleur: APP.muted }); });
    s += texte(88, yl + 53 + lp.length * 17, t('Non lue · à l’instant', 'Unread · just now'), { taille: 11, couleur: APP.faint });
    s += `<circle cx="342" cy="${yl + 24}" r="4" fill="${APP.accent}"/><circle cx="342" cy="${yl + 24}" r="7" fill="${APP.accent}" fill-opacity="0.2"/>`;
    const yn = yl + hl + 16;
    s += `<rect x="30" y="${yn}" width="330" height="76" rx="12" fill="#94A3C4" fill-opacity="0.07"/>`;
    s += paragraphe(46, yn + 24, t('Le serveur ne garde que le type de l’alerte et l’identifiant de l’entrée : jamais son nom, jamais son mot de passe.',
      'The server only keeps the kind of alert and the entry’s id: never its name, never its password.'), { taille: 12.5, max: 300, couleur: APP.muted, interligne: 18 });
    const yp = yn + 96;
    s += `<line x1="10" y1="${yp}" x2="380" y2="${yp}" stroke="${APP.line}" stroke-opacity="0.12"/>`;
    s += bouton(30, yp + 16, 330, 38, t('Tout marquer comme lu', 'Mark all as read'), { icone: 'Check', taille: 14 });
    // The panel, sized to what it holds, goes under everything.
    s = `<rect width="390" height="844" fill="#03050A" fill-opacity="0.7"/>
      <rect x="10" y="${Y}" width="370" height="${yp + 74 - Y}" rx="20" fill="${APP.panel}" fill-opacity="0.98" stroke="${APP.line}" stroke-opacity="0.16" filter="url(#ombreFlottante)"/>` + s;
    return { svg: s, ligne: [200, yl + 34] };
  }

  // ------------------------------------------------------------ the entry

  /// The password row's value and its eye, masked or in clear; [y0] is the
  /// top of the fields card.
  const valeurMdp = (y0, mdp, clair) => (clair ? motDePasse(35, y0 + 127, mdp, { taille: 14.5 })
    : texte(35, y0 + 127, '••••••••••••••••', { taille: 14.5, couleur: APP.muted, police: MONO, espace: 2 })) +
    icone(clair ? 'EyeSlash' : 'Eye', 305, y0 + 118, 20, APP.muted);

  /// The entry of the demo site, full screen. Every block is optional so a
  /// diagram can show what changes:
  ///   deux: { coffre, agent } shows "Deux mots de passe pour cette entrée";
  ///   clair: the password in clear instead of the mask;
  ///   zone: 'agent' card with its figures; politique: the policy card;
  ///   historique: [[title, caption, date, dot colour]].
  /// Returns { svg (scrollable content), bas (the fixed bottom bar), y }.
  function fiche({ mdp = NOUVEAU, clair = false, deux = null, prochaine = t('Aucune', 'None'), change = t('27 sept.', 'Sep 27'),
    frequence = null, politique = true, historique = null, sansValeur = false } = {}) {
    let s = `<rect width="390" height="${historique ? 1300 : 844}" fill="${APP.bg}"/>`;
    const y = {};
    s += monogramme(DEMO.nom, 19, 22, 52, { cle: DEMO.cle });
    s += texte(85, 45, DEMO.nom, { taille: 26, couleur: APP.text, poids: 700, espace: -0.4 });
    s += puceZone(85, 55, 'agent', { taille: 12, h: 22 }).svg;
    s += icone('PencilSimple', 312, 37, 20, APP.muted) + icone('X', 351, 21, 20, APP.muted);
    let yy = 96;
    if (deux) {
      const H = 296;
      s += verre(19, yy, 351, H, { opacite: 0.6, halo: APP.warn });
      s += `<rect x="19" y="${yy}" width="351" height="${H}" rx="16" fill="none" stroke="${APP.warn}" stroke-opacity="0.3"/>`;
      s += `<rect x="35" y="${yy + 16}" width="30" height="30" rx="8" fill="${APP.warn}" fill-opacity="0.15"/>` + icone('Warning', 41, yy + 22, 18, APP.warnText, 'bold');
      s += texte(75, yy + 36, t('Deux mots de passe pour cette entrée', 'Two passwords for this entry'), { taille: 15, couleur: APP.text, poids: 600 });
      s += paragraphe(35, yy + 66, t('La rotation n’a pas pu être annulée : le site a peut-être pris le nouveau, peut-être gardé l’ancien. Essaie de te connecter, puis dis lequel marche. L’autre sera jeté.',
        'The rotation could not be undone: the site may have taken the new one, or kept the old one. Try to sign in, then say which one works. The other goes.'),
      { taille: 13, max: 318, couleur: APP.muted, interligne: 20 });
      [[t('Celui du coffre', 'The vault’s'), deux.coffre, false], [t('Celui que l’agent a posé', 'The one the agent set'), deux.agent, true]].forEach(([mot, valeur, primaire], i) => {
        const yc = yy + 164 + i * 60;
        s += `<rect x="35" y="${yc}" width="320" height="52" rx="10" fill="${APP.glass2}" fill-opacity="0.7" stroke="${APP.line}" stroke-opacity="0.1"/>`;
        s += texte(49, yc + 20, mot, { taille: 12, couleur: APP.faint });
        s += motDePasse(49, yc + 40, valeur, { taille: 12.5 });
        if (primaire) s += boutonPrimaire(271, yc + 10, 74, 32, t('Garder', 'Keep'), { taille: 13.5 });
        else s += bouton(271, yc + 10, 74, 32, t('Garder', 'Keep'), { taille: 13.5 });
      });
      y.garderCoffre = [308, yy + 190];
      y.garderAgent = [308, yy + 250];
      yy += H + 16;
    }
    // The fields.
    y.champs = yy;
    s += verre(19, yy, 351, 245, { opacite: 0.6 });
    const sep = (v) => `<line x1="19" y1="${v}" x2="370" y2="${v}" stroke="${APP.line}" stroke-opacity="0.1"/>`;
    s += texte(35, yy + 25, t('Identifiant', 'Username'), { taille: 13, couleur: APP.muted });
    s += texte(35, yy + 54, DEMO.id, { taille: 15, couleur: APP.text, poids: 500 }) + icone('Copy', 339, yy + 40, 18, APP.muted);
    s += sep(yy + 76);
    s += texte(35, yy + 101, t('Mot de passe', 'Password'), { taille: 13, couleur: APP.muted });
    // [sansValeur] leaves the value and the eye to the diagram, which fades
    // the mask into the clear text without fading the whole screen.
    if (!sansValeur) s += valeurMdp(yy, mdp, clair);
    s += force(35, yy + 143, 4, { l: 97 }) + texte(141, yy + 150, t(`Robuste, ${Array.from(mdp).length} caractères`, `Strong, ${Array.from(mdp).length} characters`), { taille: 12.5, couleur: APP.faint });
    s += icone('Copy', 339, yy + 119, 18, APP.muted);
    y.oeil = [315, yy + 128];
    s += sep(yy + 168);
    s += texte(35, yy + 193, 'Site', { taille: 13, couleur: APP.muted });
    s += texte(35, yy + 222, DEMO.site, { taille: 15, couleur: APP.accentText }) + icone('ArrowSquareOut', 339, yy + 207, 18, APP.muted);
    yy += 245 + 17;
    // The agent zone card.
    y.zone = yy;
    const phrase = frequence
      ? t(`Il surveille les fuites et change ce mot de passe tous les ${frequence} jours. Tu es prévenu à chaque rotation.`,
        `It watches for breaches and changes this password every ${frequence} days. You are told at each rotation.`)
      : t('Il surveille les fuites de ce compte et peut changer son mot de passe. Aucune rotation régulière n’est réglée pour l’instant.',
        'It watches this account for breaches and can change its password. No regular rotation is set for now.');
    const lz = lignes(phrase, 13.5, 318);
    const HZ = 170 + lz.length * 22;
    s += verre(19, yy, 351, HZ, { opacite: 0.6, halo: APP.violet });
    s += `<rect x="19" y="${yy}" width="351" height="${HZ}" rx="16" fill="none" stroke="${APP.violet}" stroke-opacity="0.35"/>`;
    s += `<rect x="35" y="${yy + 16}" width="30" height="30" rx="8" fill="${APP.violet}" fill-opacity="0.15"/>` + icone('Sparkle', 41, yy + 22, 18, APP.violetText, 'fill');
    s += texte(74, yy + 36, t('L’agent s’occupe de ce compte', 'The agent looks after this account'), { taille: 15.5, couleur: APP.text, poids: 600 });
    lz.forEach((l, i) => { s += texte(35, yy + 66 + i * 22, l, { taille: 13.5, couleur: APP.muted }); });
    const ys = yy + 60 + lz.length * 22;
    s += `<rect x="35" y="${ys}" width="320" height="61" rx="10" fill="${APP.glass2}" fill-opacity="0.7"/>`;
    [[t('Prochaine', 'Next'), prochaine], [t('Changé le', 'Changed'), change], ['Mode', t('Avec accord', 'With consent')]].forEach(([a, b], i) => {
      const x = 46 + i * 107;
      if (i) s += `<line x1="${x - 10}" y1="${ys}" x2="${x - 10}" y2="${ys + 61}" stroke="${APP.line}" stroke-opacity="0.12"/>`;
      s += texte(x, ys + 22, a, { taille: 12, couleur: APP.faint }) + texte(x, ys + 45, b, { taille: 13.5, couleur: APP.text, poids: 600 });
    });
    y.prochaine = [46, ys + 45];
    s += icone('ArrowUUpLeft', 49, ys + 80, 17, APP.muted) + texte(73, ys + 96, t('Reprendre dans ma zone', 'Take back into my zone'), { taille: 14, couleur: APP.muted, poids: 500 });
    yy += HZ + 16;
    // The policy card.
    if (politique) {
      s += verre(19, yy, 351, 66, { opacite: 0.6 });
      s += `<rect x="35" y="${yy + 18}" width="30" height="30" rx="8" fill="${APP.violet}" fill-opacity="0.15"/>` + icone('ArrowsClockwise', 41, yy + 24, 18, APP.violetText);
      s += texte(78, yy + 29, frequence ? t('Rotation demain', 'Rotation tomorrow') : t('Aucune rotation prévue', 'No rotation planned'), { taille: 14, couleur: APP.text, poids: 500 });
      s += texte(78, yy + 49, frequence ? t(`Tous les ${frequence} jours, avec ton accord`, `Every ${frequence} days, with your consent`) : t('Régler la fréquence de rotation', 'Set how often it rotates'), { taille: 12.5, couleur: APP.faint });
      s += icone('CaretDown', 340, yy + 24, 18, APP.faint);
      yy += 66 + 22;
    }
    // The history.
    if (historique) {
      y.historique = yy;
      s += texte(21, yy + 14, t('Historique', 'History'), { taille: 15, couleur: APP.text, poids: 600 });
      s += texte(21, yy + 34, t('Les anciennes versions restent déchiffrables par toi', 'Older versions stay readable by you'), { taille: 12, couleur: APP.faint });
      historique.forEach(([titre, legende, date, c], i) => {
        const yh = yy + 58 + i * 52;
        if (i < historique.length - 1) s += `<line x1="27.5" y1="${yh + 8}" x2="27.5" y2="${yh + 52}" stroke="${APP.line}" stroke-opacity="0.22"/>`;
        s += `<circle cx="27.5" cy="${yh + 4}" r="4.5" fill="${APP.bg}" stroke="${c}" stroke-width="2"/>`;
        s += texte(45, yh + 9, titre, { taille: 13, couleur: APP.text, poids: 500 });
        s += texte(45, yh + 26, legende, { taille: 12, couleur: APP.faint });
        s += texte(369, yh + 9, date, { taille: 12, couleur: APP.faint, ancre: 'end' });
      });
    }
    const bas = `<rect x="0" y="772" width="390" height="72" fill="${APP.bg}"/><line x1="0" y1="772" x2="390" y2="772" stroke="${APP.line}" stroke-opacity="0.1"/>` +
      boutonPrimaire(19, 788, 352, 41, t('Copier le mot de passe', 'Copy the password'), { icone: 'Copy', taille: 15 });
    return { svg: s, bas, y };
  }

  return { DEMO, NOUVEAU, ANCIEN, sourcil, motDePasse, toast, enteteAgent, piste, pouce, POUCE, SW, indice, INDICES, interrupteur,
    carteEtat, carteActivite, suivi, prochaines, agent, Y_SWITCH, proposition, notifications, fiche, valeurMdp };
};

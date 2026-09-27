// The kill switch and the guards.
//
// On the left, the phone plays the Agent screen: the kill switch you hold
// for a second (HoldSwitch). Let go too early and it springs back; held to
// the end, the agent stops, the orb and the light go grey (mood "off"). The
// same gesture restarts it. On the right, the checks that code runs before
// every action, in the order of api/serenity/agent/executor.py: kill switch,
// agent zone, daily cap, allowlist, then the audit log. Four actions go
// through them: one passes, one stops at the kill switch, one waits for the
// next day, one is refused by the allowlist (netflix.com.evil.example).
// Under them, what the agent will never do (docs/08-rotation.md).
module.exports = (O) => {
  const R = require('./_ecrans-rotation.js')(O);
  const { t, svg, texte, paragraphe, entete, rubrique, entre, visible, fondu, glisse, carte, icone, monogramme,
    telephone, largeur, CARTE, BORD, TITRE, TEXTE, DISCRET, ACCENT, ACCENT_TEXTE, VERT, AMBRE, ROUGE, MONO, APP } = O;
  const C = 36;
  const s = (sec) => sec / C;
  const SEC = s(1);

  // ------------------------------------------------------------ timing
  // The switch: a hold let go too early, a full hold that stops the agent,
  // a full hold that restarts it. One second each, like the real one.
  const ESSAI = s(8), LACHE = ESSAI + 0.45 * SEC, TENIR = s(10), ARRET = TENIR + SEC, RELANCE = s(20), MARCHE = RELANCE + SEC;
  // The four actions and what lies between them.
  const A1 = 0, A1F = s(7.4), K1 = A1F, A2 = s(13), A2F = s(19), K2 = A2F, A3 = s(23.2), A3F = s(29.3), A4 = A3F, FIN = 0.975;

  let corps = entete(t('LES GARDE-FOUS', 'THE GUARDS'),
    t('Vérifiés par le code avant chaque action, jamais par un LLM.', 'Checked by code before every action, never by an LLM.'));

  // ------------------------------------------------------------ the phone
  const T = telephone(48, 88, 640);
  corps += T.cadre;
  const YS = R.Y_SWITCH;
  const points = [[0.24, 'veille'], [0.49, 'veille'], [0.74, 'veille'], [0.97, 'veille']];
  let ecran = O.aurore(390, 844, [[0, 'agent'], [ARRET, 'off'], [MARCHE, 'agent']], { cycle: C });
  ecran += R.enteteAgent();
  ecran += R.carteEtat(100, { avecInterrupteur: false, parties: 'fond' }).svg;
  // What the switch changes: halo, orb, words. Swapped by fading, the old
  // one out before the new one comes in.
  const enMarche = () => R.carteEtat(100, { marche: true, parties: 'etat' }).svg;
  const arrete = R.carteEtat(100, { marche: false, parties: 'etat' }).svg;
  ecran += entre(C, 0, ARRET, enMarche(), 0.004) + entre(C, ARRET, MARCHE, arrete, 0.004) + entre(C, MARCHE, 1.2, enMarche(), 0.004);

  // The fill: it grows while you hold. Running, it starts on the left in the
  // warn tint; stopped, it starts on the right in the ok tint. It follows
  // the same ease out as HoldSwitch.tsx, 1 - (1 - k)^2.
  const W = R.SW.l - 10, X0 = R.SW.x + 5;
  const courbe = (de, a, jusqua = 1) => [0, 0.25, 0.5, 0.75, 1].map((f) => [de + (a - de) * f * jusqua, 1 - Math.pow(1 - f * jusqua, 2)]);
  const remplir = (etapes) => fondu('width', C, etapes.map(([k, v]) => [k, (v * W).toFixed(1)]));
  const tenuEssai = courbe(ESSAI, ESSAI + SEC, 0.45);
  const tenuArret = courbe(TENIR, ARRET);
  ecran += `<rect x="${X0}" y="${YS + 5}" width="0" height="${R.SW.h - 10}" rx="10" fill="${APP.warn}" fill-opacity="0.16">
    ${remplir([[0, 0], ...tenuEssai, [LACHE + 0.0005, 0], ...tenuArret, [ARRET + 0.0005, 0], [1, 0]])}</rect>`;
  const tenuMarche = courbe(RELANCE, MARCHE);
  const wOk = [[0, 0], ...tenuMarche, [MARCHE + 0.0005, 0], [1, 0]];
  ecran += `<rect x="${X0 + W}" y="${YS + 5}" width="0" height="${R.SW.h - 10}" rx="10" fill="${APP.ok}" fill-opacity="0.16">
    ${remplir(wOk)}${fondu('x', C, wOk.map(([k, v]) => [k, (X0 + W - v * W).toFixed(1)]))}</rect>`;
  // The thumb walks with the fill; let go, it slides back in 300 ms.
  const course = R.POUCE.course;
  const pas = [[0, 0], ...tenuEssai.map(([k, v]) => [k, v]), [LACHE + 0.3 * SEC, 0], [TENIR, 0], ...tenuArret, [RELANCE, 1],
    ...tenuMarche.map(([k, v]) => [k, 1 - v]), [1, 0]];
  const trajet = glisse(C, pas.map(([k, v]) => [k, `${(v * course).toFixed(1)} 0`]));
  ecran += `<g>${trajet}${entre(C, 0, ARRET, R.pouce(YS, true), 0.002)}${entre(C, ARRET, MARCHE, R.pouce(YS, false), 0.002)}${entre(C, MARCHE, 1.2, R.pouce(YS, true), 0.002)}</g>`;
  // The hint under the switch.
  const indices = [[0, ESSAI, 'arreter'], [ESSAI, LACHE, 'tenir'], [LACHE, TENIR, 'arreter'], [TENIR, ARRET, 'tenir'],
    [ARRET, RELANCE, 'relancer'], [RELANCE, MARCHE, 'tenir'], [MARCHE, 1.2, 'arreter']];
  indices.forEach(([de, a, k]) => { ecran += entre(C, de, a, R.indice(YS, R.INDICES[k]), 0.002); });
  // The finger stays down for as long as the hold lasts.
  const doigt = (cx, de, a) => `<g opacity="0">${visible(C, de - 0.004, a + 0.004, 0.003)}
    <circle cx="${cx}" cy="${YS + 28}" r="17" fill="#FFFFFF" fill-opacity="0.3" stroke="#FFFFFF" stroke-opacity="0.75" stroke-width="2"/></g>`;
  ecran += doigt(X0 + R.POUCE.l / 2, ESSAI, LACHE) + doigt(X0 + R.POUCE.l / 2, TENIR, ARRET) + doigt(X0 + course + R.POUCE.l / 2, RELANCE, MARCHE);

  // Activity: the strip marks the kill switch while it is engaged.
  ecran += entre(C, 0, ARRET, R.carteActivite(382, { stats: [1, 0, 0, 0], points }).svg, 0.004);
  ecran += entre(C, ARRET, MARCHE, R.carteActivite(382, { stats: [1, 0, 0, 0], points, etiquette: 'KILL SWITCH' }).svg, 0.004);
  ecran += entre(C, MARCHE, 1.2, R.carteActivite(382, { stats: [1, 0, 0, 0], points }).svg, 0.004);
  ecran += R.prochaines(660);
  ecran += O.ongletsBas('agent');
  ecran += entre(C, ARRET + 0.004, A2 + 0.03, R.toast(t('Agent arrêté. Il ne fera plus rien jusqu’à ton feu vert.', 'Agent stopped. It will do nothing more until you say so.'),
    { y: 690, ton: 'warn', icone: 'Warning' }), 0.006);
  ecran += entre(C, MARCHE + 0.004, A3, R.toast(t('Agent relancé.', 'Agent restarted.'), { y: 700 }), 0.006);
  corps += T.ecran(ecran);

  // ------------------------------------------------------------ the gates
  const GX = 420, GL = 500, GY = 126, GH = 88, GG = 8;
  corps += rubrique(GX, GY - 14, t('AVANT CHAQUE ACTION, DANS CET ORDRE', 'BEFORE EVERY ACTION, IN THIS ORDER'));
  const portes = [
    ['Power', t('Kill switch', 'Kill switch'), t('Relu en base avant chaque rotation. Coupé en plein lot, le lot s’arrête à la suivante.', 'Read from the database before every rotation. Thrown mid batch, the batch stops at the next one.')],
    ['Sparkle', t('Zone agent', 'Agent zone'), t('Trois verrous : l’échéancier, la création de rotation, une entrée reprise. La zone personnelle, jamais.', 'Three locks: the scheduler, creating a rotation, an entry taken back. The personal zone, never.')],
    ['ClockCountdown', t('Plafond quotidien', 'Daily cap'), t('SERENITY_MAX_ROTATIONS_PER_DAY = 3 sur 24 heures, rotations autonomes comprises.', 'SERENITY_MAX_ROTATIONS_PER_DAY = 3 over 24 hours, autonomous rotations included.')],
    ['Globe', t('Allowlist', 'Allowlist'), t('api/allowlist.yaml, avec demo.serenity.test seul par défaut. Sous-domaines oui, faux suffixes non.', 'api/allowlist.yaml, with only demo.serenity.test by default. Subdomains yes, fake suffixes no.')],
    ['Scroll', t('Journal d’audit', 'Audit log'), t('Chaque décision y laisse une ligne. Jamais un mot de passe.', 'Every decision leaves a line there. Never a password.')],
  ];
  const yPorte = (i) => GY + i * (GH + GG);
  portes.forEach(([ic, titre, phrase], i) => {
    const y = yPorte(i);
    corps += carte(GX, y, GL, GH);
    corps += `<rect x="${GX + 20}" y="${y + 18}" width="34" height="34" rx="9" fill="${ACCENT}" fill-opacity="0.12"/>` + icone(ic, GX + 27, y + 25, 20, ACCENT_TEXTE);
    corps += texte(GX + 70, y + 32, titre, { taille: 14.5, couleur: TITRE, poids: 600 });
    corps += paragraphe(GX + 70, y + 54, phrase, { taille: 12.5, max: GL - 140, couleur: TEXTE, interligne: 17 });
  });
  // A mark on the right of a gate: passed, refused, or waiting.
  const MARQUES = { ok: ['CheckCircle', VERT, 'fill'], non: ['Prohibit', ROUGE, 'bold'], attend: ['ClockCountdown', AMBRE, 'bold'] };
  const marque = (i, genre, de, a) => {
    const [ic, c, poids] = MARQUES[genre];
    const y = yPorte(i);
    return entre(C, de, a, icone(ic, GX + GL - 46, y + 20, 26, c, poids), 0.004);
  };
  // A border: the accent while the gate is being checked, a state colour
  // when it stops the action.
  const bord = (i, de, a, c = ACCENT) =>
    `<rect x="${GX}" y="${yPorte(i)}" width="${GL}" height="${GH}" rx="14" fill="${c}" fill-opacity="0.06" stroke="${c}" stroke-width="1.5" opacity="0">${visible(C, de, a, 0.004)}</rect>`;
  // Each action: [gate, mark, instant], over [de, a].
  const actions = [
    [A1, A1F, [[0, 'ok', s(1.5)], [1, 'ok', s(2.4)], [2, 'ok', s(3.3)], [3, 'ok', s(4.2)], [4, 'ok', s(5.1)]]],
    [A2, A2F, [[0, 'non', s(14)], [4, 'ok', s(15.2)]]],
    [A3, A3F, [[0, 'ok', s(24.2)], [1, 'ok', s(25.1)], [2, 'attend', s(26)], [4, 'ok', s(27.2)]]],
    [A4, FIN, [[0, 'ok', s(30.2)], [1, 'ok', s(30.9)], [2, 'ok', s(31.6)], [3, 'non', s(32.3)], [4, 'ok', s(33.4)]]],
  ];
  actions.forEach(([de, a, etapes]) => {
    etapes.forEach(([i, genre, k]) => {
      corps += bord(i, k - 0.6 * SEC, genre === 'ok' ? k : a, genre === 'ok' ? ACCENT : genre === 'non' ? ROUGE : AMBRE);
      corps += marque(i, genre, k, a);
    });
  });

  // ------------------------------------------------ what is happening
  const VX = 940, VL = 300, VY = GY, VH = 5 * GH + 4 * GG, VC = 312;
  corps += rubrique(VX, VY - 14, t('CE QUI SE PASSE', 'WHAT HAPPENS'));
  corps += carte(VX, VY, VL, VC);
  const IX = VX + 20, IM = VL - 40;
  // An action: what it is, the gates at work, then from [v] on what they
  // said, and the line the journal keeps. [milieu] replaces the sentence.
  const action = (titre, sous, [ic, c, poids], tv, phrase, journal, milieu = null) => {
    const tete = texte(IX, VY + 36, titre, { taille: 15, couleur: TITRE, poids: 600 }) +
      texte(IX, VY + 58, sous, { taille: 12, couleur: DISCRET, police: MONO }) +
      `<line x1="${IX}" y1="${VY + 80}" x2="${VX + VL - 20}" y2="${VY + 80}" stroke="${BORD}"/>`;
    const attente = texte(IX, VY + 116, t('Le code passe les contrôles, un par un.', 'Code goes through the checks, one by one.'), { taille: 12.5, couleur: TEXTE });
    const suite = icone(ic, IX, VY + 100, 24, c, poids) + texte(IX + 34, VY + 118, tv, { taille: 15, couleur: TITRE, poids: 600 }) +
      (milieu || paragraphe(IX, VY + 150, phrase, { taille: 12.5, max: IM, couleur: TEXTE, interligne: 18 })) +
      `<rect x="${IX}" y="${VY + 236}" width="${IM}" height="56" rx="10" fill="#0F1620" stroke="${BORD}"/>` +
      texte(IX + 14, VY + 258, 'agent.rotation.execute', { taille: 12, couleur: TITRE, police: MONO }) +
      texte(IX + 14, VY + 278, journal, { taille: 12, couleur: DISCRET, police: MONO });
    return [tete, attente, suite];
  };
  const OK = ['CheckCircle', VERT, 'fill'], NON = ['Prohibit', ROUGE, 'bold'], ATTEND = ['ClockCountdown', AMBRE, 'bold'];
  // The allowlist rule, as allowlist.py applies it.
  const regle = texte(IX, VY + 150, t('Avec netflix.com dans la liste :', 'With netflix.com on the list:'), { taille: 12.5, couleur: TEXTE }) +
    [['www.netflix.com', true], ['netflix.com.evil.example', false]].map(([h, ok], i) => {
      const y = VY + 162 + i * 34;
      return `<rect x="${IX}" y="${y}" width="${IM}" height="28" rx="8" fill="${ok ? VERT : ROUGE}" fill-opacity="0.08"/>` +
        icone(ok ? 'CheckCircle' : 'Prohibit', IX + 10, y + 5, 18, ok ? VERT : ROUGE, ok ? 'fill' : 'bold') +
        texte(IX + 36, y + 18.5, h, { taille: 12.5, couleur: TITRE, police: MONO });
    }).join('');
  const quatre = [
    [A1, A1F, s(5.3), action(t('Rotation de Site de démo', 'Rotation of Demo site'), 'demo.serenity.test', OK,
      t('Elle passe', 'It goes through'), t('Les cinq contrôles sont verts. Le rotator peut ouvrir le site.', 'All five checks are green. The rotator may open the site.'),
      'outcome: success')],
    [A2, A2F, s(14.1), action(t('Passage de l’agent', 'The agent’s pass'), t('rotations approuvées', 'approved rotations'), NON,
      t('Arrêté au premier contrôle', 'Stopped at the first check'), t('Le kill switch est enclenché : rien ne part, le coffre ne bouge pas.', 'The kill switch is engaged: nothing leaves, the vault does not move.'),
      'skipped · kill_switch')],
    [A3, A3F, s(26.1), action(t('Quatrième rotation en 24 h', 'Fourth rotation in 24 h'), t('plafond : 3 sur 24 heures', 'cap: 3 over 24 hours'), ATTEND,
      t('Elle attend le lendemain', 'It waits for tomorrow'), t('L’écran Agent le dit : « limite de rotations par jour atteinte : la rotation attend le lendemain ».', 'The Agent screen says so: the daily rotation limit is reached, the rotation waits for tomorrow.'),
      'skipped · daily_limit')],
    [A4, FIN, s(32.4), action(t('Rotation vers un faux site', 'Rotation to a fake site'), 'netflix.com.evil.example', NON,
      t('Refusée par l’allowlist', 'Refused by the allowlist'), '', 'failure', regle)],
  ];
  quatre.forEach(([de, a, v, [tete, attente, suite]]) => {
    corps += entre(C, de, a, tete, 0.006) + entre(C, de, v, attente, 0.006) + entre(C, v, a, suite, 0.006);
  });

  // Where these checks live.
  const DY = VY + VC + 16, DH = VH - VC - 16;
  corps += carte(VX, DY, VL, DH);
  corps += texte(IX, DY + 30, 'api/serenity/agent/', { taille: 13, couleur: TITRE, police: MONO, poids: 600 });
  [['killswitch.py', t('le switch', 'the switch')], ['rotations.py', t('zone, plafond', 'zone, cap')], ['allowlist.py', t('les domaines', 'the domains')],
    ['executor.py', t('l’ordre, le journal', 'the order, the log')]].forEach(([f, role], i) => {
    const y = DY + 58 + i * 22;
    corps += texte(IX, y, f, { taille: 12.5, couleur: TEXTE, police: MONO }) + texte(IX + 116, y, role, { taille: 12.5, couleur: DISCRET });
  });
  // Back at the start of the loop, the first action shows again, unchecked.
  corps += entre(C, FIN, 1.2, quatre[0][3][0] + quatre[0][3][1], 0.006);
  // Between two actions, the card explains the switch that the phone plays.
  const explique = (de, a, titre, lignes) => entre(C, de, a,
    texte(IX, VY + 36, titre, { taille: 15, couleur: TITRE, poids: 600 }) +
    texte(IX, VY + 58, t('sur le téléphone, à gauche', 'on the phone, on the left'), { taille: 12, couleur: DISCRET }) +
    `<line x1="${IX}" y1="${VY + 80}" x2="${VX + VL - 20}" y2="${VY + 80}" stroke="${BORD}"/>` +
    lignes.map(([dl, s2], i) => entre(C, Math.max(de, dl), a,
      `<circle cx="${IX + 5}" cy="${VY + 111 + i * 64}" r="4.5" fill="${ACCENT}"/>` +
      paragraphe(IX + 20, VY + 116 + i * 64, s2, { taille: 13, max: IM - 20, couleur: TITRE, interligne: 19 }), 0.006)).join(''), 0.006);
  corps += explique(K1, A2, t('Le kill switch', 'The kill switch'), [
    [K1, t('Il se maintient 1 s. Le remplissage avance tant que tu tiens.', 'You hold it for 1 s. The fill moves on as long as you hold.')],
    [LACHE, t('Relâché avant la fin, il revient. Le geste est la confirmation.', 'Let go before the end, it springs back. The gesture is the confirmation.')],
    [ARRET, t('Tenu jusqu’au bout : l’agent s’arrête, l’orbe et la lumière passent au gris.', 'Held to the end: the agent stops, the orb and the light turn grey.')],
  ]);
  corps += explique(K2, A3, t('Relancer', 'Restarting'), [
    [K2, t('Même geste pour relancer. Couper marche même coffre verrouillé.', 'Same gesture to restart. Stopping works even with the vault locked.')],
    [RELANCE, t('Relancer, non : il faut le coffre ouvert, donc ton mot de passe maître.', 'Restarting does not: it needs the vault open, so your master password.')],
    [MARCHE, t('Les deux gestes laissent une ligne au journal.', 'Both gestures leave a line in the log.')],
  ]);

  // ------------------------------------------------ what it will never do
  const JY = GY + VH + 50;
  corps += rubrique(GX, JY - 14, t('CE QUE L’AGENT NE FERA JAMAIS', 'WHAT THE AGENT WILL NEVER DO'));
  const jamais = [
    ['EnvelopeSimple', t('Pas de code par mail ni SMS', 'No code by mail or SMS'), t('Ta boîte mail ouvre tous tes comptes : le serveur n’y a pas accès.', 'Your mailbox opens all your accounts: the server has no access to it.')],
    ['Key', t('Pas de réinitialisation', 'No password reset'), t('Il change un mot de passe en étant connecté, ou il ne fait rien.', 'It changes a password while signed in, or it does nothing.')],
    ['Robot', t('Pas de CAPTCHA', 'No CAPTCHA'), t('Un site qui refuse les robots a le droit. L’agent te prévient, c’est tout.', 'A site that refuses robots is within its rights. The agent warns you, that is all.')],
  ];
  jamais.forEach(([ic, titre, phrase], i) => {
    const x = GX + i * 280;
    corps += carte(x, JY, 260, 112);
    corps += icone(ic, x + 20, JY + 18, 20, DISCRET);
    corps += texte(x + 50, JY + 33, titre, { taille: 14, couleur: TITRE, poids: 600 });
    corps += paragraphe(x + 20, JY + 62, phrase, { taille: 12.5, max: 220, couleur: TEXTE, interligne: 18 });
  });

  svg('garde-fous.svg', 1280, JY + 112 + 36, corps, t(
    'Le kill switch et les garde-fous, vérifiés par le code avant chaque action, jamais par un LLM. À gauche, le téléphone montre l’écran Agent : la carte du kill switch « En marche, l’agent veille, il surveille 1 entrée confiée et prépare les rotations », l’orbe violette, l’interrupteur Marche et Arrêt avec « Maintiens 1 s pour arrêter », et la phrase « Ce switch est relu avant chaque action : coupé, l’agent s’arrête net. Tes entrées ne changent pas. » Un doigt maintient l’interrupteur puis le lâche trop tôt : le remplissage recule et le pouce revient. Il le maintient une seconde entière : l’agent s’arrête, la carte dit « Arrêté, l’agent est arrêté, kill switch enclenché à l’instant, plus aucune veille ni rotation », l’orbe et la lumière passent au gris, la frise d’activité marque KILL SWITCH, et le message « Agent arrêté. Il ne fera plus rien jusqu’à ton feu vert. » s’affiche. Plus tard, le même geste le relance, avec « Maintiens 1 s pour relancer », et le message « Agent relancé. ». À droite, cinq contrôles dans l’ordre du code : le kill switch, relu en base avant chaque rotation ; la zone agent et ses trois verrous (l’échéancier, la création de rotation, une entrée reprise) ; le plafond quotidien, SERENITY_MAX_ROTATIONS_PER_DAY = 3 sur 24 heures ; l’allowlist, api/allowlist.yaml, avec demo.serenity.test seul par défaut, sous-domaines oui, faux suffixes non ; le journal d’audit, une ligne par décision, jamais un mot de passe. Quatre actions les traversent, et une carte dit ce qui se passe. La rotation de Site de démo passe les cinq contrôles. Pendant que l’agent est arrêté, son passage est arrêté au premier contrôle, journal skipped, kill_switch. Une quatrième rotation en 24 heures attend le lendemain, journal skipped, daily_limit. Une rotation vers netflix.com.evil.example est refusée par l’allowlist : avec netflix.com dans la liste, www.netflix.com passerait, netflix.com.evil.example non, car ce n’est pas un sous-domaine. Entre deux actions, la carte explique le geste : maintenir 1 s, relâché avant la fin il revient, tenu jusqu’au bout l’agent s’arrête ; le même geste relance, couper marche même coffre verrouillé mais relancer demande le coffre ouvert, donc le mot de passe maître, et les deux gestes vont au journal. En bas, ce que l’agent ne fera jamais : pas de code par mail ni SMS, pas de « mot de passe oublié », pas de CAPTCHA.',
    'The kill switch and the guards, checked by code before every action, never by an LLM. On the left, the phone shows the Agent screen: the kill switch card “Running, the agent is watching, it watches 1 entry handed over and prepares the rotations”, the violet orb, the On and Off switch with “Hold 1 s to stop”, and the sentence “This switch is read again before every action: off, the agent stops dead. Your entries stay as they are.” A finger holds the switch then lets go too early: the fill shrinks back and the thumb returns. It holds for a whole second: the agent stops, the card says “Stopped, the agent is stopped, kill switch engaged just now, no more watching, no more rotations”, the orb and the light turn grey, the activity strip marks KILL SWITCH, and the message “Agent stopped. It will do nothing more until you say so.” shows. Later, the same gesture restarts it, with “Hold 1 s to restart”, and the message “Agent restarted.”. On the right, five checks in the code’s order: the kill switch, read from the database before every rotation; the agent zone and its three locks (the scheduler, creating a rotation, an entry taken back); the daily cap, SERENITY_MAX_ROTATIONS_PER_DAY = 3 over 24 hours; the allowlist, api/allowlist.yaml, with only demo.serenity.test by default, subdomains yes, fake suffixes no; the audit log, one line per decision, never a password. Four actions go through them, and a card says what happens. The rotation of Demo site passes all five. While the agent is stopped, its pass stops at the first check, log skipped, kill_switch. A fourth rotation in 24 hours waits for tomorrow, log skipped, daily_limit. A rotation to netflix.com.evil.example is refused by the allowlist: with netflix.com on the list, www.netflix.com would pass, netflix.com.evil.example would not, as it is not a subdomain. Between two actions, the card explains the gesture: hold 1 s, let go before the end and it springs back, held to the end the agent stops; the same gesture restarts it, stopping works even with the vault locked but restarting needs the vault open, so the master password, and both gestures go to the log. At the bottom, what the agent will never do: no code by mail or SMS, no “forgot password”, no CAPTCHA.'));
};

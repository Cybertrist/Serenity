// How often the watch asks the network (ADR-018, docs/05-veille.md, "À
// quelle fréquence").
//
// On the left, the desktop window (20d-bureau-fuites, 20-bureau-agent):
// Breaches opened in the morning, left for Agent and opened again, then
// "Check now" in the evening. On the right, what the server remembers per
// entry (item_scan: a revision and a date), the plan it answers
// (GET /api/watch/plan) and the two lists of the report. Below, one day
// on two lanes: the browser, whose local checks always cover the whole
// vault while the network question only follows the plan, and the
// server, which checks the agent zone every 6 hours on its own. On the
// side, what the plan saves on 500 entries.
module.exports = (O) => {
  const V = require('./_ecrans-veille.js')(O);
  const { t, svg, texte, paragraphe, entete, rubrique, entre, fondu, glisse, toucher, carte, legendes, icone, monogramme,
    fenetre, aurore, largeur, ENTREES, CARTE, BORD, FIL, TITRE, TEXTE, DISCRET, ACCENT, ACCENT_TEXTE, MONO, APP } = O;
  const C = 34;
  const FIN = 0.97;
  // The day runs from 06h to 20h over the cycle.
  const H0 = 6, H1 = 20, T0 = 0.03, T1 = 0.92;
  const at = (h) => T0 + ((h - H0) / (H1 - H0)) * (T1 - T0);
  const MATIN = at(8), RETOUR1 = at(10), SPOTIFY = at(12.8), RETOUR2 = at(13), SOIR = at(18);
  const AGENT1 = RETOUR1 - 0.04, AGENT2 = SPOTIFY - 0.05;

  /// A group shown over several intervals [[de, a], ...], with the same
  /// hand over rule as visible(): out before the next one comes in.
  function pendant(intervalles, contenu, d = 0.006) {
    const e = [[0, intervalles[0][0] <= 0 ? 1 : 0]];
    for (const [de, a] of intervalles) {
      if (de > 0) e.push([de, 0], [de + d, 1]);
      if (a < 1) e.push([a - d, 1], [a, 0]);
    }
    e.push([1, e[e.length - 1][1]]);
    return `<g opacity="${e[0][1]}">${fondu('opacity', C, e)}${contenu}</g>`;
  }

  let corps = V.enTete(t('LA CADENCE', 'THE PACE'),
    t('Les contrôles locaux passent à chaque fois. Le réseau, seulement quand le plan le demande.',
      'The local checks run every time. The network only when the plan asks for it.'));

  // ------------------------------------------------------------ the window
  const W = fenetre(48, 88, 640);
  corps += W.cadre;
  const fuites = [[MATIN, AGENT1], [RETOUR1, AGENT2], [RETOUR2, FIN]];
  const agent = [[0, MATIN], [AGENT1, RETOUR1], [AGENT2, RETOUR2]];
  let ecran = aurore(1280, 800, [[0, 'agent'], [MATIN, 'leak'], [AGENT1, 'agent'], [RETOUR1, 'leak'], [AGENT2, 'agent'], [RETOUR2, 'leak']], { cycle: C, opacite: 0.34 });
  ecran += pendant(agent, V.bureauAgent() + V.chrome('agent'));
  ecran += pendant(fuites, V.bureauFuites({ verif: null }) + V.chrome('fuites'));
  // The sentence after the subtitle: checking, then done.
  const xv = V.xVerif();
  const verif = (m) => texte(xv, 104, m, { taille: 13, couleur: APP.faint });
  ecran += pendant([[MATIN, MATIN + 0.025], [SOIR, SOIR + 0.025]], verif(t('Vérification en cours…', 'Checking…')), 0.003);
  ecran += pendant([[MATIN + 0.025, AGENT1], [RETOUR1, AGENT2], [RETOUR2, SOIR], [SOIR + 0.025, FIN]], verif(t('Dernière vérification à l’instant.', 'Last checked just now.')), 0.003);
  // Clicks: Breaches and Agent in the sidebar, then "Check now".
  const cFuites = [120, 138], cAgent = [120, 173];
  for (const a of [MATIN, RETOUR1, RETOUR2]) ecran += toucher(cFuites[0], cFuites[1], C, a - 0.004, { rayon: 22 });
  for (const a of [AGENT1, AGENT2]) ecran += toucher(cAgent[0], cAgent[1], C, a - 0.004, { rayon: 22 });
  ecran += toucher(1150, 93, C, SOIR - 0.004, { rayon: 22 });
  corps += W.ecran(ecran);

  // ------------------------------------------ what the server remembers
  const X = 716, L = 524, AY = 88, AH = 250;
  corps += carte(X, AY, L, AH, { allume: [SPOTIFY - 0.01, RETOUR2 + 0.03], cycle: C });
  corps += texte(X + 20, AY + 34, t('Ce que retient le serveur', 'What the server remembers'), { taille: 15, couleur: TITRE, poids: 600 });
  corps += texte(X + L - 20, AY + 34, 'item_scan', { taille: 12.5, couleur: DISCRET, police: MONO, ancre: 'end' });
  const COL = { nom: X + 20, rev: X + 200, date: X + 290, plan: X + 410 };
  corps += rubrique(COL.nom, AY + 64, t('ENTRÉE', 'ENTRY')) + rubrique(COL.rev, AY + 64, t('RÉVISION', 'REVISION')) +
    rubrique(COL.date, AY + 64, t('VÉRIFIÉE', 'CHECKED')) + rubrique(COL.plan, AY + 64, 'PLAN');
  const aDemander = (x, y) => `<rect x="${x}" y="${y - 16}" width="${largeur(t('à demander', 'to ask'), 12.5, { poids: 500 }) + 20}" height="23" rx="8" fill="${ACCENT}" fill-opacity="0.14" stroke="${ACCENT}" stroke-opacity="0.5"/>` +
    texte(x + 10, y, t('à demander', 'to ask'), { taille: 12.5, couleur: ACCENT_TEXTE, poids: 500 });
  const aJour = (x, y) => texte(x, y, t('à jour', 'up to date'), { taille: 12.5, couleur: DISCRET });
  const hier = t('hier 07:40', 'yesterday 07:40');
  // Per entry: [from, to, revision, checked, due].
  const lignes = [
    [ENTREES.banque, [[0, MATIN, '1', hier, true], [MATIN, SOIR, '1', '08:00', false], [SOIR, FIN, '1', '18:00', false]]],
    [ENTREES.netflix, [[0, MATIN, '1', hier, true], [MATIN, SOIR, '1', '08:00', false], [SOIR, FIN, '1', '18:00', false]]],
    [ENTREES.spotify, [[0, MATIN, '1', hier, true], [MATIN, SPOTIFY, '1', '08:00', false], [SPOTIFY, RETOUR2, '2', '08:00', true],
      [RETOUR2, SOIR, '2', '13:00', false], [SOIR, FIN, '2', '18:00', false]]],
  ];
  lignes.forEach(([e, etats], i) => {
    const y = AY + 100 + i * 36;
    corps += monogramme(e.nom, COL.nom, y - 17, 24, { cle: e.cle }) + texte(COL.nom + 34, y, e.nom, { taille: 13.5, couleur: TITRE, poids: 500 });
    etats.forEach(([de, a, rev, date, du]) => {
      const revChange = rev === '2' && de === SPOTIFY;
      corps += entre(C, de, a,
        texte(COL.rev, y, rev, { taille: 13.5, couleur: revChange ? ACCENT_TEXTE : TITRE, police: MONO, poids: revChange ? 600 : 400 }) +
        texte(COL.date, y, date, { taille: 13, couleur: TEXTE, police: MONO }) +
        (du ? aDemander(COL.plan, y) : aJour(COL.plan, y)), 0.004);
    });
  });
  corps += `<line x1="${X + 20}" y1="${AY + 184}" x2="${X + L - 20}" y2="${AY + 184}" stroke="${BORD}"/>`;
  corps += texte(X + 20, AY + 208, 'GET /api/watch/plan', { taille: 12.5, couleur: ACCENT_TEXTE, police: MONO });
  corps += texte(X + 20 + 19 * 7.5 + 12, AY + 208, t('répond ce qui reste à demander :', 'answers what is left to ask:'), { taille: 12.5, couleur: TEXTE });
  corps += texte(X + 20, AY + 228, t('jamais vérifiée, révision changée, ou plus de 24 h.', 'never checked, revision changed, or over 24 hours.'), { taille: 12.5, couleur: TITRE });

  // ------------------------------------------------- the two lists
  const BY = AY + AH + 16, BH = 488 - BY;
  corps += carte(X, BY, L, BH);
  corps += texte(X + 20, BY + 32, t('Le rapport porte deux listes', 'The report carries two lists'), { taille: 15, couleur: TITRE, poids: 600 });
  corps += texte(X + L - 20, BY + 32, 'POST /api/watch/report', { taille: 12.5, couleur: DISCRET, police: MONO, ancre: 'end' });
  corps += texte(X + 20, BY + 64, 'scanned', { taille: 13, couleur: TITRE, police: MONO }) +
    texte(X + 150, BY + 64, t('tout ce que le scan a regardé', 'everything the scan looked at'), { taille: 12.5, couleur: TEXTE });
  corps += texte(X + 20, BY + 94, 'pwned_scanned', { taille: 13, couleur: TITRE, police: MONO }) +
    texte(X + 150, BY + 94, t('ce qu’il a vraiment demandé au réseau', 'what it really asked the network'), { taille: 12.5, couleur: TEXTE });
  // The counts of each scan of the day.
  const nombre = (y, n, c = TITRE) => texte(X + L - 20, y, n, { taille: 15, couleur: c, police: MONO, poids: 600, ancre: 'end' });
  const scans = [[MATIN, RETOUR1, '3'], [RETOUR1, RETOUR2, '0'], [RETOUR2, SOIR, '1'], [SOIR, FIN, '3']];
  const pasEncore = texte(X + L - 20, BY + 79, t('au prochain scan', 'at the next scan'), { taille: 12.5, couleur: DISCRET, ancre: 'end' });
  corps += entre(C, 0, MATIN, pasEncore, 0.004) + entre(C, FIN, 1.2, pasEncore, 0.004);
  scans.forEach(([de, a, n]) => {
    corps += entre(C, de, a, nombre(BY + 64, '3') + nombre(BY + 94, n, n === '0' ? DISCRET : ACCENT_TEXTE), 0.004);
  });

  // ------------------------------------------------------ one day, two lanes
  const TY = 512, TL = 812, TH = 284;
  corps += carte(48, TY, TL, TH);
  const x0 = 76, x1 = 832;
  const hx = (h) => x0 + ((h - H0) / (H1 - H0)) * (x1 - x0);
  corps += legendes(68, TY + 38, C, [
    [0, MATIN, t('Hier à 07:40, dernière question au réseau. Ce matin, plus de 24 h : tout est dans le plan.', 'Yesterday at 07:40, last question to the network. This morning, over 24 hours: everything is in the plan.')],
    [MATIN, RETOUR1, t('08 h, tu ouvres Fuites. Le plan dit trois entrées : trois questions à Pwned Passwords.', '08:00, you open Breaches. The plan says three entries: three questions to Pwned Passwords.')],
    [RETOUR1, SPOTIFY, t('Tu reviens dix fois dans la matinée. Les contrôles locaux repassent, le réseau ne voit rien.', 'You come back ten times in the morning. The local checks run again, the network sees nothing.')],
    [SPOTIFY, SOIR, t('Tu changes le mot de passe de Spotify, sa révision passe à 2. À 13 h, seul Spotify repart.', 'You change the Spotify password, its revision goes to 2. At 13:00, only Spotify goes out.')],
    [SOIR, FIN, t('18 h, « Vérifier maintenant » ignore le plan et repose la question pour tout le coffre.', '18:00, “Check now” ignores the plan and asks again for the whole vault.')],
  ], { taille: 13.5, max: TL - 60 });

  const L1 = TY + 116, L2 = TY + 206;
  corps += rubrique(68, L1 - 42, t('TON NAVIGATEUR, COFFRE DÉVERROUILLÉ', 'YOUR BROWSER, VAULT UNLOCKED'));
  corps += rubrique(68, L2 - 34, t('TON SERVEUR, SANS TOI', 'YOUR SERVER, WITHOUT YOU'));
  // Hour grid.
  for (let h = H0; h <= H1; h += 2) {
    corps += `<line x1="${hx(h)}" y1="${L1 - 8}" x2="${hx(h)}" y2="${L1 + 8}" stroke="${BORD}"/><line x1="${hx(h)}" y1="${L2 - 8}" x2="${hx(h)}" y2="${L2 + 8}" stroke="${BORD}"/>`;
    corps += texte(hx(h), TY + TH - 18, `${String(h).padStart(2, '0')}h`, { taille: 12, couleur: DISCRET, police: MONO, ancre: 'middle' });
  }
  corps += `<line x1="${x0}" y1="${L1}" x2="${x1}" y2="${L1}" stroke="${FIL}" stroke-width="1.6"/>`;
  corps += `<line x1="${x0}" y1="${L2}" x2="${x1}" y2="${L2}" stroke="${FIL}" stroke-width="1.6"/>`;
  corps += texte(x0, L1 + 26, t('Contrôles locaux à chaque ouverture : les 3 entrées, sans réseau.', 'Local checks at every opening: all 3 entries, no network.'), { taille: 12.5, couleur: TEXTE });
  corps += texte(x0, L2 + 32, t('Toutes les 6 h, la zone agent seulement : ici, Netflix.', 'Every 6 hours, the agent zone only: here, Netflix.'), { taille: 12.5, couleur: TEXTE });

  // Events light up as the day passes, and stay until the end of the loop.
  const evenement = (h, y, label, { fort = true, dx = 0, r = 6 } = {}) => entre(C, at(h), FIN,
    `<circle cx="${hx(h)}" cy="${y}" r="${r}" fill="${fort ? ACCENT : CARTE}" stroke="${ACCENT}" stroke-width="1.6"/>` +
    (label ? texte(hx(h) + dx, y - 14, label, { taille: 12.5, couleur: fort ? ACCENT_TEXTE : DISCRET, poids: 500, ancre: 'middle' }) : ''), 0.004);
  corps += evenement(8, L1, t('3 requêtes', '3 requests'));
  for (let k = 0; k < 10; k++) corps += evenement(10 + k * 0.2, L1, k === 4 ? t('dix fois, 0 requête', 'ten times, 0 requests') : null, { fort: false, dx: 12, r: 3.5 });
  corps += evenement(13, L1, t('1 requête', '1 request'));
  corps += evenement(18, L1, t('3 requêtes', '3 requests'));
  for (const h of [6, 12, 18]) {
    corps += entre(C, Math.max(at(h), 0.001), FIN,
      `<rect x="${hx(h) - 5.5}" y="${L2 - 5.5}" width="11" height="11" rx="2" fill="${ACCENT}" transform="rotate(45 ${hx(h)} ${L2})"/>` +
      texte(hx(h) + 12, L2 - 12, 'Netflix', { taille: 12.5, couleur: ACCENT_TEXTE, poids: 500 }), 0.004);
  }
  // The cursor of the day.
  corps += entre(C, T0 - 0.02, FIN, `<g>${glisse(C, [[0, '0 0'], [T0, '0 0'], [T1, `${x1 - x0} 0`], [1, `${x1 - x0} 0`]])}
    <line x1="${x0}" y1="${L1 - 9}" x2="${x0}" y2="${L1 + 9}" stroke="${ACCENT}" stroke-width="2" stroke-linecap="round"/>
    <line x1="${x0}" y1="${L2 - 9}" x2="${x0}" y2="${L2 + 9}" stroke="${ACCENT}" stroke-width="2" stroke-linecap="round"/>
    <path d="M${x0 - 5} ${TY + TH - 42} L${x0 + 5} ${TY + TH - 42} L${x0} ${TY + TH - 35} Z" fill="${ACCENT}"/></g>`, 0.006);

  // ------------------------------------------------------ on 500 entries
  const PX = 880, PL = 360;
  corps += carte(PX, TY, PL, TH, { allume: [SOIR + 0.03, FIN], cycle: C });
  corps += texte(PX + 20, TY + 36, t('Sur un coffre de 500 entrées', 'On a vault of 500 entries'), { taille: 15, couleur: TITRE, poids: 600 });
  corps += rubrique(PX + 20, TY + 72, t('AVANT', 'BEFORE'));
  corps += texte(PX + 20, TY + 100, t('500 requêtes et 50 Mo', '500 requests and 50 MB'), { taille: 18, couleur: TITRE, poids: 600 });
  corps += texte(PX + 20, TY + 122, t('à chaque ouverture de l’onglet.', 'every time the tab opened.'), { taille: 12.5, couleur: TEXTE });
  corps += rubrique(PX + 20, TY + 158, t('MAINTENANT', 'NOW'));
  corps += texte(PX + 20, TY + 186, t('ce que dit le plan', 'what the plan says'), { taille: 18, couleur: ACCENT_TEXTE, poids: 600 });
  corps += texte(PX + 20, TY + 208, t('Souvent rien, jamais plus d’une fois par jour.', 'Often nothing, never more than once a day.'), { taille: 12.5, couleur: TEXTE });
  corps += paragraphe(PX + 20, TY + 240, t('Une réponse pèse 100 ko à cause du bourrage qui protège ta vie privée.', 'One answer weighs 100 kB, because of the padding that protects your privacy.'), { taille: 12.5, max: PL - 40, couleur: DISCRET, interligne: 18 });

  svg('cadence.svg', 1280, 820, corps, t(
    'La cadence de la veille. À gauche, la fenêtre de bureau rejoue une journée : l’écran Agent, un clic sur Fuites à 8 h, « Vérification en cours », puis « Dernière vérification à l’instant » ; retour à Agent et à Fuites vers 10 h ; encore Agent puis Fuites à 13 h ; enfin un clic sur « Vérifier maintenant » à 18 h. La lumière passe du violet de l’agent à l’ambre des fuites à chaque changement d’écran. À droite en haut, ce que retient le serveur dans la table item_scan, pour Banque, Netflix et Spotify : une révision et la date de la dernière question. Hier à 07:40, donc plus de 24 h ce matin : les trois sont « à demander ». Après 8 h, elles sont à jour. Quand le mot de passe de Spotify change, sa révision passe de 1 à 2 et il redevient « à demander », jusqu’à 13 h. À 18 h, tout est revérifié. GET /api/watch/plan répond ce qui reste à demander : une entrée jamais vérifiée, dont la révision a changé, ou vérifiée il y a plus de 24 h. En dessous, le rapport POST /api/watch/report porte deux listes : scanned, tout ce que le scan a regardé, toujours 3 ; pwned_scanned, ce qu’il a vraiment demandé au réseau : 3 le matin, 0 quand on rouvre, 1 à 13 h, 3 le soir. En bas, une journée de 6 h à 20 h sur deux lignes. Ton navigateur : 3 requêtes à 8 h, dix réouvertures sans aucune requête, 1 requête à 13 h, 3 requêtes à 18 h, et les contrôles locaux sur les 3 entrées à chaque ouverture, sans réseau. Ton serveur, sans toi : toutes les 6 h, à 6 h, 12 h et 18 h, il vérifie la zone agent seulement, ici Netflix. À droite, sur un coffre de 500 entrées : avant, 500 requêtes et 50 Mo à chaque ouverture de l’onglet ; maintenant, ce que dit le plan, souvent rien et jamais plus d’une fois par jour. Une réponse pèse 100 ko à cause du bourrage qui protège ta vie privée.',
    'The pace of the watch. On the left, the desktop window replays a day: the Agent screen, a click on Breaches at 8:00, “Checking”, then “Last checked just now”; back to Agent and to Breaches around 10:00; Agent again, then Breaches at 13:00; last, a click on “Check now” at 18:00. The light turns from the agent’s violet to the amber of breaches at every change of screen. Top right, what the server remembers in the item_scan table, for Bank, Netflix and Spotify: a revision and the date of the last question. Yesterday at 07:40, so over 24 hours this morning: all three are “to ask”. After 8:00, they are up to date. When the Spotify password changes, its revision goes from 1 to 2 and it is “to ask” again, until 13:00. At 18:00, everything is checked again. GET /api/watch/plan answers what is left to ask: an entry never checked, whose revision changed, or checked over 24 hours ago. Below, the report, POST /api/watch/report, carries two lists: scanned, everything the scan looked at, always 3; pwned_scanned, what it really asked the network: 3 in the morning, 0 when the tab opens again, 1 at 13:00, 3 in the evening. At the bottom, a day from 6:00 to 20:00 on two lanes. Your browser: 3 requests at 8:00, ten openings without a single request, 1 request at 13:00, 3 requests at 18:00, and the local checks on all 3 entries at every opening, without the network. Your server, without you: every 6 hours, at 6:00, 12:00 and 18:00, it checks the agent zone only, here Netflix. On the right, on a vault of 500 entries: before, 500 requests and 50 MB every time the tab opened; now, what the plan says, often nothing and never more than once a day. One answer weighs 100 kB, because of the padding that protects your privacy.'));
};

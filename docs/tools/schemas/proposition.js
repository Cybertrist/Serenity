// A breach on an entry handed to the agent does not wait.
//
// On the left, the desktop window (20d-bureau-fuites, 21-bureau-
// notifications, 20-bureau-agent): the Netflix alert, the bell that gets
// its dot, the notification centre with its three lines, then the Agent
// screen and its proposal, "Change the Netflix password", the four steps,
// Approve (Enter). The light turns from amber to violet. On the right,
// what each answer means (docs/06-agent.md). Below, what the server does
// right after the browser's report (routes/watch.py, agent/rotations.py,
// ADR-018): the alert, the kill switch read first, the rotation scheduled
// at once, a notification without text, then the executor.
module.exports = (O) => {
  const V = require('./_ecrans-veille.js')(O);
  const { t, svg, texte, paragraphe, entete, rubrique, entre, fondu, toucher, carte, etape, icone, fenetre, aurore,
    fil, bille, pointe, largeur, TITRE, TEXTE, DISCRET, ACCENT, ACCENT_TEXTE, MONO, APP } = O;
  const C = 34;
  const FIN = 0.97;
  // The server, step by step.
  const P = [0.03, 0.07, 0.11, 0.15, 0.64];
  // The window.
  const CLOCHE = 0.22, NOTIFS = 0.24, CLIC_N = 0.34, AGENT = 0.36, APPROUVE = 0.6, APRES = 0.62, TOAST_FIN = 0.8;

  /// A group shown over several intervals, handing over like visible().
  function pendant(intervalles, contenu, d = 0.006) {
    const e = [[0, intervalles[0][0] <= 0 ? 1 : 0]];
    for (const [de, a] of intervalles) {
      if (de > 0) e.push([de, 0], [de + d, 1]);
      if (a < 1) e.push([a - d, 1], [a, 0]);
    }
    e.push([1, e[e.length - 1][1]]);
    return `<g opacity="${e[0][1]}">${fondu('opacity', C, e)}${contenu}</g>`;
  }

  let corps = V.enTete(t('L’AGENT ET SES PROPOSITIONS', 'THE AGENT AND ITS PROPOSALS'),
    t('Pas d’humain dans la boucle, mais un humain informé.', 'No human in the loop, but an informed one.'));

  // ------------------------------------------------------------ the window
  const W = fenetre(48, 88, 720);
  corps += W.cadre;
  let ecran = aurore(1280, 800, [[0, 'leak'], [AGENT, 'agent']], { cycle: C, opacite: 0.34 });
  // Breaches, the report just came back. The bell gets its dot with the
  // notification, then the centre opens over the dimmed screen.
  ecran += pendant([[0, AGENT]], V.bureauFuites() + V.chrome('fuites', { point: null }) +
    entre(C, P[3] + 0.01, AGENT, `<circle cx="1096" cy="12" r="3.5" fill="${APP.warn}"/>`, 0.004) +
    toucher(1091, 18, C, CLOCHE, { rayon: 20 }));
  const N = V.notifications();
  ecran += entre(C, NOTIFS, AGENT, N.svg + toucher(640, N.lignes[0], C, CLIC_N, { rayon: 22 }), 0.006);
  // The Agent screen and its proposal, then the running card once approved.
  ecran += entre(C, AGENT, APRES, V.bureauAgent({ bas: 'proposition' }) + V.chrome('agent') + toucher(1148, 653, C, APPROUVE, { rayon: 22 }), 0.006);
  ecran += entre(C, APRES, FIN, V.bureauAgent({ bas: 'approuvee' }) + V.chrome('agent', { attente: 0 }), 0.006);
  ecran += entre(C, APRES + 0.01, TOAST_FIN, O.toast(764, 716, t('Approuvée. L’agent la joue à son prochain passage.', 'Approved. The agent plays it on its next pass.')), 0.006);
  corps += W.ecran(ecran);

  // ------------------------------------------------- what an answer means
  const X = 800, L = 440, H = 102, G = 14;
  const reponses = [
    ['Check', t('Approuver', 'Approve'), 'approved', t('La rotation est approuvée. L’exécuteur la joue au passage suivant de l’agent.', 'The rotation is approved. The executor plays it on the agent’s next pass.'), [0.4, 0.72]],
    ['X', t('Refuser', 'Refuse'), null, t('Pas de rotation maintenant. La prochaine échéance est repoussée d’une période.', 'No rotation for now. The next due date moves back by one period.'), [0.72, 0.82]],
    ['ArrowsClockwise', t('Une fuite, une rotation', 'One breach, one rotation'), null, t('Tant que l’alerte reste ouverte, l’agent ne repropose pas une rotation faite, refusée ou en échec.', 'While the alert stays open, the agent does not propose again a rotation that is done, refused or failed.'), [0.82, 0.9]],
    ['ShieldCheck', t('Ta zone personnelle', 'Your personal zone'), null, t('Jamais concernée : l’agent ne peut pas la lire. Une fuite y est signalée, et l’échéance donne un rappel.', 'Never involved: the agent cannot read it. A breach there is reported, and a due date brings a reminder.'), [0.9, FIN]],
  ];
  reponses.forEach(([ic, titre, jeton, phrase, allume], i) => {
    const y = 88 + i * (H + G);
    corps += carte(X, y, L, H, { allume, cycle: C });
    corps += icone(ic, X + 20, y + 19, 18, ACCENT_TEXTE) + texte(X + 48, y + 34, titre, { taille: 15, couleur: TITRE, poids: 600 });
    if (jeton) corps += texte(X + L - 20, y + 34, jeton, { taille: 12.5, couleur: DISCRET, police: MONO, ancre: 'end' });
    corps += paragraphe(X + 20, y + 62, phrase, { taille: 12.5, max: L - 40, couleur: TEXTE, interligne: 19 });
  });

  // --------------------------------------------- the server, right after
  const PY = 580, PH = 168, PG = 22, PL = (1192 - 4 * PG) / 5;
  corps += rubrique(48, PY - 16, t('SUR LE SERVEUR, DANS LA FOULÉE DU RAPPORT', 'ON THE SERVER, RIGHT AFTER THE REPORT'));
  const etapes = [
    [t('Le rapport', 'The report'), t('POST /api/watch/report ouvre l’alerte « mot de passe exposé » sur Netflix.', 'POST /api/watch/report opens the “password exposed” alert on Netflix.')],
    ['Kill switch', t('Relu avant toute action. Coupé, rien n’est programmé et le journal le note.', 'Read before any action. Off, nothing is scheduled and the log says so.')],
    ['Rotation', t('Programmée tout de suite, déclencheur « fuite ». Le passage horaire reste un filet.', 'Scheduled at once, triggered by the breach. The hourly pass stays as a safety net.')],
    ['Notification', t('Un type et un identifiant, aucun texte. L’appli écrit le nom elle-même.', 'A kind and an id, no text. The app writes the name itself.')],
    [t('L’exécuteur', 'The executor'), t('Une fois approuvée, il la joue au passage suivant : générer, changer, prouver, valider.', 'Once approved, it plays it on the next pass: generate, change, prove, confirm.')],
  ];
  etapes.forEach(([titre, phrase], i) => {
    const x = 48 + i * (PL + PG);
    corps += etape(x, PY, PL, PH, `0${i + 1}`, titre, phrase, { allume: [P[i], i === 4 ? FIN : AGENT], cycle: C });
    if (i < 4) {
      const c = `M ${x + PL + 3} ${PY + 34} H ${x + PL + PG - 5}`;
      corps += fil(C, c, P[i + 1], i === 3 ? FIN : AGENT) + pointe(x + PL + PG - 4, PY + 34, 0) + bille(C, c, P[i + 1] - 0.015, P[i + 1]);
    }
  });
  // Nothing to play before the answer: the executor waits for it.
  corps += entre(C, 0, P[4], texte(48 + 4 * (PL + PG) + PL / 2, PY + PH - 18, t('attend ton accord', 'waits for your consent'), { taille: 12.5, couleur: DISCRET, ancre: 'middle' }), 0.006);
  corps += entre(C, FIN, 1.2, texte(48 + 4 * (PL + PG) + PL / 2, PY + PH - 18, t('attend ton accord', 'waits for your consent'), { taille: 12.5, couleur: DISCRET, ancre: 'middle' }), 0.006);

  svg('proposition.svg', 1280, 780, corps, t(
    'Ce que fait l’agent d’une fuite sur une entrée qui lui est confiée. À gauche, la fenêtre de bureau rejoue les vrais écrans. D’abord Fuites, lumière ambre : l’anneau à 67, l’alerte Netflix avec « Vu dans une fuite », « Faible » et « Confié à l’agent ». La cloche de la barre de titre reçoit son point, un clic l’ouvre : le centre de notifications montre trois lignes non lues sur Netflix, « Une rotation attend ton accord », « Mot de passe exposé, vu dans une fuite connue, change-le dès que possible » et « Mot de passe faible, trop court ou trop simple », avec la note : le serveur ne garde que le type de l’alerte et l’identifiant de l’entrée, jamais son nom ni son mot de passe. Un clic sur la première ouvre l’écran Agent, lumière violette : le kill switch en marche, « Changer le mot de passe de Netflix, proposée à l’instant, après une fuite », le rappel que le mot de passe actuel est apparu dans une fuite connue, les quatre étapes 01 Générer (un mot de passe neuf de 24 caractères, gardé en révision en attente), 02 Changer (ce site n’est pas dans l’allowlist, tu feras le changement toi-même, guidé), 03 Prouver (reconnexion avec le nouveau, l’ancien doit être refusé), 04 Valider (la révision devient la bonne, sinon retour à l’ancien), et les boutons Refuser et Approuver avec la touche Entrée. Un clic sur Approuver : le message « Approuvée, l’agent la joue à son prochain passage », et la carte « Netflix : approuvée, étape 1 sur 4 ». À droite, ce que veut dire chaque réponse. Approuver : la rotation passe à approved et l’exécuteur la joue au passage suivant de l’agent. Refuser : pas de rotation maintenant, la prochaine échéance est repoussée d’une période. Une fuite, une rotation : tant que l’alerte reste ouverte, l’agent ne repropose pas une rotation faite, refusée ou en échec. Ta zone personnelle : jamais concernée, l’agent ne peut pas la lire ; une fuite y est signalée, et l’échéance donne un rappel. En bas, ce que fait le serveur dans la foulée du rapport, en cinq étapes : 01 le rapport, POST /api/watch/report, ouvre l’alerte « mot de passe exposé » sur Netflix ; 02 le kill switch est relu avant toute action, et s’il est coupé rien n’est programmé et le journal le note ; 03 la rotation est programmée tout de suite, déclencheur « fuite », le passage horaire restant un filet ; 04 la notification ne porte qu’un type et un identifiant, l’appli écrit le nom elle-même ; 05 l’exécuteur, une fois la rotation approuvée, la joue au passage suivant : générer, changer, prouver, valider.',
    'What the agent does with a breach on an entry handed to it. On the left, the desktop window replays the real screens. First Breaches, amber light: the ring at 67, the Netflix alert with “Seen in a breach”, “Weak” and “Handed to the agent”. The bell of the title bar gets its dot, a click opens it: the notification centre shows three unread lines about Netflix, “A rotation waits for your consent”, “Password exposed, seen in a known breach, change it as soon as you can” and “Weak password, too short or too simple”, with the note: the server keeps only the kind of alert and the id of the entry, never its name nor its password. A click on the first one opens the Agent screen, violet light: the kill switch on, “Change the Netflix password, proposed just now, after a breach”, the reminder that the current password showed up in a known breach, the four steps 01 Generate (a new 24 character password, kept as a pending revision), 02 Change (this site is not on the allowlist, you will make the change yourself, guided), 03 Prove (sign in again with the new one, the old one must be refused), 04 Confirm (the revision becomes the real one, otherwise back to the old one), and the Refuse and Approve buttons with the Enter key. A click on Approve: the message “Approved, the agent plays it on its next pass”, and the card “Netflix: approved, step 1 of 4”. On the right, what each answer means. Approve: the rotation becomes approved and the executor plays it on the agent’s next pass. Refuse: no rotation for now, the next due date moves back by one period. One breach, one rotation: while the alert stays open, the agent does not propose again a rotation that is done, refused or failed. Your personal zone: never involved, the agent cannot read it; a breach there is reported, and a due date brings a reminder. At the bottom, what the server does right after the report, in five steps: 01 the report, POST /api/watch/report, opens the “password exposed” alert on Netflix; 02 the kill switch is read before any action, and if it is off nothing is scheduled and the log says so; 03 the rotation is scheduled at once, triggered by the breach, the hourly pass staying as a safety net; 04 the notification carries only a kind and an id, the app writes the name itself; 05 the executor, once the rotation is approved, plays it on the next pass: generate, change, prove, confirm.'));
};

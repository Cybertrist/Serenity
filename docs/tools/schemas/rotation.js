// A rotation that succeeds: the vault is served before the site.
//
// On the left, the phone plays the real screens: the Agent screen with the
// proposal for the demo site, "Approve", the rotation under way, the
// notification, then the entry with its new 24 character password and its
// history. On the right, three columns move together: the vault (revision 2
// active, then revision 3 pending, then revision 3 active and 2 in the
// history), the rotator container in between (the only browser, no key, no
// disk), and the demo site (sign in, change, sign in again from scratch).
// Under them, the five steps of docs/08-rotation.md "Le déroulé" and
// docs/crypto.md 7.12.
module.exports = (O) => {
  const R = require('./_ecrans-rotation.js')(O);
  const { t, svg, texte, paragraphe, entete, rubrique, entre, visible, glisse, toucher, carte, legendes, icone, monogramme,
    telephone, fil, bille, pointe, largeur, CARTE, BORD, TITRE, TEXTE, DISCRET, ACCENT, ACCENT_TEXTE, VERT, AMBRE, ROUGE, MONO, APP } = O;
  const C = 34;

  // ------------------------------------------------------------ timing
  // The phone.
  const TAPE_OK = 0.1, APPROUVE = 0.115, EN_COURS = 0.2, FINI_TEL = 0.62, TAPE_CLOCHE = 0.665, NOTIF = 0.675,
    TAPE_NOTIF = 0.708, FICHE = 0.72, TAPE_OEIL = 0.765, CLAIR = 0.775, DEFILE = 0.835, FIN = 0.97;
  // The right side.
  const CONTROLES = 0.12, TIRAGE = 0.2, ATTENTE = 0.25, SITE = 0.3, CONNEXION = 0.34, CHANGE = 0.42, RECO = 0.48,
    REFUSE = 0.52, ACCEPTE = 0.56, VALIDE = 0.6, BASCULE = 0.61;

  let corps = entete(t('LA ROTATION', 'THE ROTATION'),
    t('Le coffre est servi avant le site, et le site n’est validé que par une vraie reconnexion.',
      'The vault is served before the site, and the site only counts once a real sign-in proves it.'));

  // ------------------------------------------------------------ the phone
  const T = telephone(48, 88, 640);
  corps += T.cadre;
  const P = R.proposition();
  const avant = [[0.24, 'veille'], [0.49, 'veille'], [0.74, 'veille'], [0.965, 'veille'], [0.975, 'fuite'], [0.985, 'proposition']];
  const apres = [...avant, [0.995, 'rotation']];
  let ecran = '';
  ecran += entre(C, 0, APPROUVE, P.svg + toucher(P.approuver[0], P.approuver[1], C, TAPE_OK), 0.006);
  // The loop ends on the first screen, so it starts again without a gap.
  ecran += entre(C, FIN, 1.2, R.proposition().svg, 0.006);
  ecran += entre(C, APPROUVE, EN_COURS, R.agent({ bas: 'approuvee', stats: [1, 0, 0, 0], points: avant }) +
    R.toast(t('Approuvée. L’agent la joue à son prochain passage.', 'Approved. The agent plays it on its next pass.'), { y: 700 }), 0.006);
  ecran += entre(C, EN_COURS, FINI_TEL, R.agent({ bas: 'suivi', stats: [1, 0, 0, 0], points: avant }), 0.006);
  // Every use draws the screen again: its gradients need their own ids.
  const apresAgent = () => R.agent({ bas: 'prochaines', stats: [1, 1, 0, 0], points: apres, point: APP.warn });
  ecran += entre(C, FINI_TEL, NOTIF, apresAgent() + toucher(353.5, 36.5, C, TAPE_CLOCHE), 0.006);
  const N = R.notifications('rotation.done');
  ecran += entre(C, NOTIF, FICHE, apresAgent() + N.svg + toucher(N.ligne[0], N.ligne[1], C, TAPE_NOTIF), 0.006);
  // The entry: the value of the password fades from the mask to the clear
  // text on its own, then the sheet scrolls down to the history.
  const F = R.fiche({
    sansValeur: true,
    historique: [
      [t('Mot de passe changé', 'Password changed'), t('Version actuelle', 'Current version'), t('27 sept.', 'Sep 27'), APP.violet],
      [t('Confiée à l’agent', 'Handed to the agent'), t('Révision 2, gardée', 'Revision 2, kept'), t('27 sept.', 'Sep 27'), APP.violet],
      [t('Entrée créée', 'Entry created'), t('Dans ta zone', 'In your zone'), t('27 sept.', 'Sep 27'), APP.faint],
    ],
  });
  const yc = F.y.champs;
  const contenu = F.svg +
    entre(C, 0, CLAIR, R.valeurMdp(yc, R.NOUVEAU, false), 0.004) +
    entre(C, CLAIR, 1.2, R.valeurMdp(yc, R.NOUVEAU, true), 0.004) +
    toucher(F.y.oeil[0], F.y.oeil[1], C, TAPE_OEIL);
  ecran += entre(C, FICHE, FIN, `<g>${glisse(C, [[0, '0 0'], [DEFILE, '0 0'], [DEFILE + 0.03, '0 -150'], [1, '0 -150']])}${contenu}</g>` + F.bas, 0.006);
  corps += T.ecran(ecran);

  // ------------------------------------------------------ three columns
  const Y = 122, H = 326;
  const CV = { x: 420, l: 250 }, CR = { x: 705, l: 230 }, CS = { x: 970, l: 270 };
  corps += rubrique(CV.x, Y - 14, t('LE COFFRE', 'THE VAULT'));
  corps += rubrique(CR.x, Y - 14, t('ENTRE LES DEUX', 'IN BETWEEN'));
  corps += rubrique(CS.x, Y - 14, t('LE SITE DE DÉMO', 'THE DEMO SITE'));
  const tete = (x, ic, titre, sous, { mono = false } = {}) =>
    `<rect x="${x + 20}" y="${Y + 20}" width="34" height="34" rx="9" fill="${ACCENT}" fill-opacity="0.12"/>` + icone(ic, x + 27, Y + 27, 20, ACCENT_TEXTE) +
    texte(x + 66, Y + 36, titre, { taille: 15, couleur: TITRE, poids: 600, police: mono ? MONO : O.SANS }) +
    texte(x + 66, Y + 53, sous, { taille: 12, couleur: DISCRET, police: MONO, poids: 600, espace: 1.2 });

  // A small state chip, right aligned at [xd].
  const etat = (xd, y, mot, c) => {
    const l = largeur(mot, 12, { poids: 500 }) + 18;
    return `<rect x="${xd - l}" y="${y}" width="${l}" height="22" rx="9" fill="${c}" fill-opacity="0.13"/>` +
      texte(xd - l / 2, y + 15, mot, { taille: 12, couleur: c, poids: 500, ancre: 'middle' });
  };

  // The vault: two slots. The top one holds the active revision, the one
  // under it the pending block, then the history. They swap by fading.
  corps += carte(CV.x, Y, CV.l, H, { allume: [ATTENTE, VALIDE + 0.06], cycle: C });
  corps += tete(CV.x, 'Vault', t('Coffre', 'Vault'), t('ZONE AGENT', 'AGENT ZONE'));
  const fente = (y, titre, [mot, c], l1, l2) =>
    `<rect x="${CV.x + 20}" y="${y}" width="${CV.l - 40}" height="88" rx="10" fill="#0F1620" stroke="${BORD}"/>` +
    texte(CV.x + 36, y + 28, titre, { taille: 14, couleur: TITRE, poids: 600 }) + etat(CV.x + CV.l - 34, y + 12, mot, c) +
    texte(CV.x + 36, y + 53, l1, { taille: 12.5 }) + texte(CV.x + 36, y + 73, l2, { taille: 12.5, couleur: DISCRET });
  const YA = Y + 76, YB = Y + 176;
  corps += entre(C, 0, BASCULE, fente(YA, t('Révision 2', 'Revision 2'), [t('active', 'active'), VERT], t('l’ancien mot de passe', 'the old password'), t('chiffré par AK', 'encrypted with AK')), 0.006);
  corps += entre(C, BASCULE, FIN, fente(YA, t('Révision 3', 'Revision 3'), [t('active', 'active'), VERT], t('le nouveau mot de passe', 'the new password'), t('prouvé par reconnexion', 'proven by a sign-in')), 0.006);
  corps += entre(C, FIN, 1.2, fente(YA, t('Révision 2', 'Revision 2'), [t('active', 'active'), VERT], t('l’ancien mot de passe', 'the old password'), t('chiffré par AK', 'encrypted with AK')), 0.006);
  const vide = `<rect x="${CV.x + 20.5}" y="${YB + 0.5}" width="${CV.l - 41}" height="87" rx="10" fill="none" stroke="${BORD}" stroke-dasharray="4 4"/>` +
    texte(CV.x + CV.l / 2, YB + 49, t('Aucun bloc en attente', 'No pending block'), { taille: 12.5, couleur: DISCRET, ancre: 'middle' });
  corps += entre(C, 0, ATTENTE + 0.01, vide, 0.006);
  corps += entre(C, ATTENTE + 0.01, BASCULE, fente(YB, t('Révision 3', 'Revision 3'), [t('en attente', 'pending'), AMBRE], t('24 caractères neufs', '24 fresh characters'), t('chiffré par AK, pas actif', 'encrypted with AK, not active')), 0.006);
  corps += entre(C, BASCULE, FIN, fente(YB, t('Révision 2', 'Revision 2'), [t('historique', 'history'), DISCRET], t('l’ancien, gardé', 'the old one, kept'), t('lisible par toi', 'readable by you')), 0.006);
  corps += entre(C, FIN, 1.2, vide, 0.006);
  // What a device that syncs now would see.
  const note = (s) => paragraphe(CV.x + 20, Y + 292, s, { taille: 12.5, max: CV.l - 40, couleur: TEXTE, interligne: 17 });
  corps += entre(C, 0, ATTENTE + 0.01, note(t('Rien n’a bougé pour l’instant.', 'Nothing has moved yet.')), 0.006);
  corps += entre(C, ATTENTE + 0.01, BASCULE, note(t('Un appareil qui synchronise voit la 2.', 'A syncing device still sees 2.')), 0.006);
  corps += entre(C, BASCULE, FIN, note(t('Le clair n’a vécu qu’en mémoire.', 'The clear text only lived in memory.')), 0.006);
  corps += entre(C, FIN, 1.2, note(t('Rien n’a bougé pour l’instant.', 'Nothing has moved yet.')), 0.006);

  // The rotator: what it is, then what it is doing now.
  corps += carte(CR.x, Y, CR.l, H, { allume: [SITE, VALIDE], cycle: C });
  corps += tete(CR.x, 'Browser', 'rotator', t('CONTENEUR À PART', 'SEPARATE CONTAINER'), { mono: true });
  [
    t('Le seul navigateur', 'The only browser'),
    t('Aucune clé, aucun disque', 'No key, no disk'),
    t('Une recette JSON par site', 'One JSON recipe per site'),
    t('Preuves : signed_in, changed', 'Proofs: signed_in, changed'),
  ].forEach((s, i) => {
    const y = Y + 94 + i * 28;
    corps += `<circle cx="${CR.x + 25}" cy="${y - 4.5}" r="2.5" fill="${DISCRET}"/>` + texte(CR.x + 36, y, s, { taille: 13, couleur: TITRE });
  });
  corps += `<line x1="${CR.x + 20}" y1="${Y + 210}" x2="${CR.x + CR.l - 20}" y2="${Y + 210}" stroke="${BORD}"/>`;
  corps += texte(CR.x + 20, Y + 236, t('EN CE MOMENT', 'RIGHT NOW'), { taille: 12, couleur: DISCRET, police: MONO, poids: 600, espace: 1.2 });
  const verbe = (v, s, c = TITRE) => texte(CR.x + 20, Y + 262, v, { taille: 13.5, couleur: c, police: MONO, poids: 600 }) +
    texte(CR.x + 20, Y + 284, s, { taille: 12.5 });
  corps += entre(C, 0, SITE, verbe(t('rien', 'nothing'), t('Il attend l’agent.', 'It waits for the agent.'), DISCRET), 0.006);
  corps += entre(C, SITE, RECO, verbe('POST /change', t('se connecter, puis changer', 'sign in, then change')), 0.006);
  corps += entre(C, RECO, VALIDE, verbe('POST /verify', t('se connecter de zéro', 'sign in from scratch')), 0.006);
  corps += entre(C, VALIDE, FIN, verbe(t('rien', 'nothing'), t('Tout est oublié.', 'Everything is forgotten.'), DISCRET), 0.006);
  corps += entre(C, FIN, 1.2, verbe(t('rien', 'nothing'), t('Il attend l’agent.', 'It waits for the agent.'), DISCRET), 0.006);

  // The demo site: what happened on it, line by line.
  corps += carte(CS.x, Y, CS.l, H, { allume: [SITE, VALIDE], cycle: C });
  corps += tete(CS.x, 'Globe', t('Site de démo', 'Demo site'), 'DEMO.SERENITY.TEST');
  corps += entre(C, 0, CONNEXION - 0.01, texte(CS.x + CS.l / 2, Y + 170, t('Personne ne l’a encore touché.', 'Nobody has touched it yet.'), { taille: 12.5, couleur: DISCRET, ancre: 'middle' }), 0.006);
  corps += entre(C, FIN, 1.2, texte(CS.x + CS.l / 2, Y + 170, t('Personne ne l’a encore touché.', 'Nobody has touched it yet.'), { taille: 12.5, couleur: DISCRET, ancre: 'middle' }), 0.006);
  const ligneSite = (i, ok, titre, preuve) => {
    const y = Y + 80 + i * 54;
    return `<rect x="${CS.x + 20}" y="${y}" width="${CS.l - 40}" height="46" rx="10" fill="#0F1620" stroke="${BORD}"/>` +
      icone(ok ? 'CheckCircle' : 'Prohibit', CS.x + 32, y + 13, 20, ok ? VERT : ROUGE, ok ? 'fill' : 'bold') +
      texte(CS.x + 62, y + 20, titre, { taille: 13, couleur: TITRE, poids: 500 }) +
      texte(CS.x + 62, y + 37, preuve, { taille: 12, couleur: DISCRET });
  };
  corps += entre(C, CONNEXION, FIN, ligneSite(0, true, t('Connexion avec l’ancien', 'Signed in with the old one'), t('#signed-in est là', '#signed-in is there')), 0.006);
  corps += entre(C, CHANGE, FIN, ligneSite(1, true, t('Mot de passe changé', 'Password changed'), t('#changed est là', '#changed is there')), 0.006);
  corps += entre(C, REFUSE, FIN, ligneSite(2, false, t('Reconnexion, l’ancien', 'Fresh sign-in, the old one'), t('Identifiants incorrects.', 'Wrong credentials.')), 0.006);
  corps += entre(C, ACCEPTE, FIN, ligneSite(3, true, t('Reconnexion, le nouveau', 'Fresh sign-in, the new one'), t('#signed-in est là', '#signed-in is there')), 0.006);

  // The wires: the agent hands the two passwords to the rotator, which
  // drives the site, then brings back its proofs.
  const yf = Y + H / 2;
  const f1 = `M ${CV.x + CV.l + 3} ${yf} H ${CR.x - 5}`, f1r = `M ${CR.x - 3} ${yf} H ${CV.x + CV.l + 5}`;
  const f2 = `M ${CR.x + CR.l + 3} ${yf} H ${CS.x - 5}`, f2r = `M ${CS.x - 3} ${yf} H ${CR.x + CR.l + 5}`;
  corps += fil(C, f1, SITE, VALIDE) + pointe(CR.x - 4, yf, 0);
  corps += fil(C, f2, SITE + 0.02, VALIDE) + pointe(CS.x - 4, yf, 0);
  corps += bille(C, f1, SITE, SITE + 0.02);
  corps += bille(C, f2, SITE + 0.022, CONNEXION - 0.004);
  corps += bille(C, f2, CHANGE - 0.03, CHANGE - 0.004);
  corps += bille(C, f2, RECO, REFUSE - 0.004);
  corps += bille(C, f2r, ACCEPTE + 0.006, ACCEPTE + 0.024);
  corps += bille(C, f1r, ACCEPTE + 0.026, VALIDE - 0.004);

  // ------------------------------------------------------------ captions
  corps += legendes(420, 488, C, [
    [0, CONTROLES, t('L’agent propose. Tant que tu n’as pas approuvé, rien ne bouge.', 'The agent offers. Until you approve, nothing moves.')],
    [CONTROLES, TIRAGE, t('Avant tout, le code vérifie : kill switch, zone agent, allowlist, plafond du jour.', 'First of all, code checks: kill switch, agent zone, allowlist, daily cap.')],
    [TIRAGE, SITE, t('Le nouveau mot de passe est chiffré en révision 3, rangé en attente. L’entrée active reste la 2.', 'The new password is encrypted as revision 3 and kept pending. The active entry stays at 2.')],
    [SITE, RECO, t('Le rotator se connecte avec l’ancien, puis change. Chaque étape a sa preuve dans la page.', 'The rotator signs in with the old one, then changes it. Each step has its proof on the page.')],
    [RECO, VALIDE, t('Il se reconnecte de zéro : l’ancien est refusé, le nouveau accepté.', 'It signs in again from scratch: the old one is refused, the new one accepted.')],
    [VALIDE, FICHE, t('Prouvé : la révision 3 devient la bonne, la 2 part dans l’historique.', 'Proven: revision 3 becomes the real one, 2 goes to the history.')],
    [FICHE, FIN, t('Sur la fiche : le nouveau mot de passe, 24 caractères, et l’historique qui garde l’ancien.', 'On the entry: the new password, 24 characters, and the history that keeps the old one.')],
  ], { max: 800 });

  // ------------------------------------------------------ the five steps
  const EY = 526, EH = 172, EG = 14, EL = (820 - 4 * EG) / 5;
  const etapes = [
    [t('Contrôles', 'Checks'), t('Kill switch, zone, allowlist, plafond. Tout par le code.', 'Kill switch, zone, allowlist, daily cap. All by code.'), [CONTROLES, TIRAGE]],
    [t('24 caractères', '24 characters'), t('Tirés au hasard, dans la mémoire de l’agent.', 'Drawn at random, in the agent’s memory.'), [TIRAGE, ATTENTE]],
    [t('Bloc en attente', 'Pending block'), t('Révision 3 chiffrée. L’entrée active ne bouge pas.', 'Revision 3 encrypted. The active entry does not move.'), [ATTENTE, SITE]],
    [t('Changer, prouver', 'Change, prove'), t('Connexion, changement, puis reconnexion de zéro.', 'Sign in, change, then sign in again from scratch.'), [SITE, VALIDE]],
    [t('Valider', 'Confirm'), t('La 3 devient la bonne, la 2 part à l’historique.', '3 becomes the real one, 2 goes to the history.'), [VALIDE, FIN]],
  ];
  etapes.forEach(([titre, phrase, allume], i) => {
    const x = 420 + i * (EL + EG);
    corps += carte(x, EY, EL, EH, { allume, cycle: C });
    corps += `<circle cx="${x + 34}" cy="${EY + 34}" r="14" fill="none" stroke="${O.FIL}" stroke-width="1.5"/>`;
    corps += `<circle cx="${x + 34}" cy="${EY + 34}" r="14" fill="${ACCENT}" opacity="0">${visible(C, allume[0], allume[1])}</circle>`;
    corps += texte(x + 34, EY + 38.5, String(i + 1), { taille: 12, couleur: TITRE, police: MONO, poids: 600, ancre: 'middle' });
    corps += texte(x + 20, EY + 78, titre, { taille: 14, couleur: TITRE, poids: 600 });
    corps += paragraphe(x + 20, EY + 102, phrase, { taille: 12.5, max: EL - 36, couleur: TEXTE, interligne: 18 });
  });

  svg('rotation.svg', 1280, 760, corps, t(
    'Une rotation qui réussit : le coffre est servi avant le site. À gauche, le téléphone rejoue les vrais écrans. L’écran Agent propose « Changer le mot de passe de Site de démo », proposée à l’instant après une fuite, avec la note « Le mot de passe actuel est apparu dans une fuite connue » et quatre étapes : générer un mot de passe neuf de 24 caractères gardé en révision en attente, se connecter à demo.serenity.test et remplacer le mot de passe, se reconnecter avec le nouveau pendant que l’ancien doit être refusé, valider ou revenir à l’ancien. Un doigt touche « Approuver ». Le message « Approuvée. L’agent la joue à son prochain passage. » s’affiche, puis la carte « Rotations en cours » dit « Site de démo : rotation en cours, changement sur le site, puis reconnexion pour preuve », sous la carte du kill switch en marche. Quand c’est fini, la cloche ouvre les notifications : « Site de démo, mot de passe changé par l’agent, preuve de connexion validée ». La fiche de Site de démo s’ouvre, confiée à l’agent ; l’œil révèle le nouveau mot de passe, 24 caractères jugés robustes, puis la fiche défile jusqu’à l’historique : mot de passe changé (version actuelle), confiée à l’agent (révision 2, gardée), entrée créée dans ta zone. À droite, trois colonnes avancent ensemble. Le coffre, zone agent : la révision 2 active, chiffrée par AK ; puis la révision 3 en attente, 24 caractères neufs, pas encore active, pendant qu’un appareil qui synchronise voit encore la 2 ; enfin la révision 3 active, prouvée par reconnexion, et la 2 dans l’historique. Au milieu, le conteneur rotator : le seul navigateur, aucune clé, aucun disque, une recette JSON par site, deux preuves signed_in et changed ; il fait POST /change pour se connecter puis changer, puis POST /verify pour se connecter de zéro. Le site de démo : connexion avec l’ancien (#signed-in est là), mot de passe changé (#changed est là), reconnexion avec l’ancien refusée (Identifiants incorrects), reconnexion avec le nouveau acceptée. Des légendes suivent chaque moment. En bas, cinq étapes : contrôles par le code (kill switch, zone, allowlist, plafond), 24 caractères tirés au hasard dans la mémoire de l’agent, bloc en attente en révision 3 sans toucher à l’entrée active, changer puis prouver par une reconnexion de zéro, valider : la 3 devient la bonne et la 2 part à l’historique.',
    'A rotation that succeeds: the vault is served before the site. On the left, the phone replays the real screens. The Agent screen offers “Change the password of Demo site”, offered just now after a breach, with the note “The current password showed up in a known breach” and four steps: generate a fresh 24 character password kept as a pending revision, sign in on demo.serenity.test and replace the password, sign in again with the new one while the old one must be refused, confirm or go back to the old one. A finger taps “Approve”. The message “Approved. The agent plays it on its next pass.” shows, then the “Rotations under way” card says “Demo site: rotation under way, change on the site, then a fresh sign-in as proof”, under the kill switch card, running. Once done, the bell opens the notifications: “Demo site, password changed by the agent, sign-in proof confirmed”. The Demo site entry opens, handed to the agent; the eye reveals the new password, 24 characters rated strong, then the entry scrolls down to its history: password changed (current version), handed to the agent (revision 2, kept), entry created in your zone. On the right, three columns move together. The vault, agent zone: revision 2 active, encrypted with AK; then revision 3 pending, 24 fresh characters, not active yet, while a syncing device still sees 2; finally revision 3 active, proven by a sign-in, and 2 in the history. In the middle, the rotator container: the only browser, no key, no disk, one JSON recipe per site, two proofs signed_in and changed; it calls POST /change to sign in then change, then POST /verify to sign in from scratch. The demo site: signed in with the old one (#signed-in is there), password changed (#changed is there), fresh sign-in with the old one refused (Wrong credentials), fresh sign-in with the new one accepted. Captions follow each moment. At the bottom, five steps: checks by code (kill switch, zone, allowlist, daily cap), 24 characters drawn at random in the agent’s memory, a pending block as revision 3 without touching the active entry, change then prove with a sign-in from scratch, confirm: 3 becomes the real one and 2 goes to the history.'));
};

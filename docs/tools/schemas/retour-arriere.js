// When a rotation fails: the vault never loses the password that opens the
// site (docs/08-rotation.md "Le déroulé" 6 and 7, docs/crypto.md 7.12,
// api/serenity/rotator/base.py).
//
// Three cases, one after the other, each lit on the right while the phone
// plays what you see:
//   1. the new password does not pass, the rollback works: the pending block
//      is deleted, the vault is intact, the next try is tomorrow;
//   2. the answer to the change is lost (timeout, 5xx): the agent asks the
//      site which password opens it, and acts on the answer;
//   3. the rollback fails too: the block is kept, the entry is flagged
//      (rotation.manual), and the entry shows both passwords in clear with a
//      button each. You say which one works; the other goes.
module.exports = (O) => {
  const R = require('./_ecrans-rotation.js')(O);
  const { t, svg, texte, paragraphe, lignes, entete, rubrique, entre, visible, toucher, carte, icone,
    telephone, fil, bille, pointe, largeur, CARTE, BORD, TITRE, TEXTE, DISCRET, ACCENT, ACCENT_TEXTE, VERT, AMBRE, ROUGE, MONO, APP } = O;
  const C = 36;

  // ------------------------------------------------------------ timing
  // Case 1.
  const A_SUIVI = 0, A_APRES = 0.09, A_CLOCHE = 0.145, A_NOTIF = 0.155, A_LIGNE = 0.21, A_FICHE = 0.225;
  // Case 2.
  const B = 0.31, B_APRES = 0.455, B_CLOCHE = 0.468, B_NOTIF = 0.478;
  // Case 3.
  const CC = 0.56, C_CLOCHE = 0.572, C_NOTIF = 0.582, C_LIGNE = 0.628, C_FICHE = 0.64, C_GARDER = 0.78, C_GARDE = 0.792, FIN = 0.97;

  let corps = entete(t('LE RETOUR ARRIÈRE', 'THE ROLLBACK'),
    t('Quand ça échoue, le coffre garde toujours le mot de passe qui ouvre le site.',
      'When it fails, the vault always keeps the password that opens the site.'));

  // ------------------------------------------------------------ the phone
  const T = telephone(48, 88, 640);
  corps += T.cadre;
  const veilles = [[0.24, 'veille'], [0.49, 'veille'], [0.74, 'veille'], [0.97, 'veille'], [0.98, 'proposition']];
  let ecran = '';
  // Case 1: under way, then failed, the notification, the entry due tomorrow.
  ecran += entre(C, A_SUIVI, A_APRES, R.agent({ bas: 'suivi', stats: [1, 0, 0, 0], points: veilles }), 0.006);
  // The loop ends on the first screen, so it starts again without a gap.
  ecran += entre(C, FIN, 1.2, R.agent({ bas: 'suivi', stats: [1, 0, 0, 0], points: veilles }), 0.006);
  // Every use draws the screen again: its gradients need their own ids.
  const apresA = () => R.agent({ bas: 'demain', stats: [1, 0, 0, 1], points: veilles, point: APP.warn });
  ecran += entre(C, A_APRES, A_NOTIF, apresA() + toucher(353.5, 36.5, C, A_CLOCHE), 0.006);
  const NA = R.notifications('rotation.failed');
  ecran += entre(C, A_NOTIF, A_FICHE, apresA() + NA.svg + toucher(NA.ligne[0], NA.ligne[1], C, A_LIGNE), 0.006);
  // The history under the entry, as moments() in EntryDialog.tsx writes it.
  const cree = [t('Entrée créée', 'Entry created'), t('Dans ta zone', 'In your zone'), t('28 août', 'Aug 28'), APP.faint];
  const HA = [[t('Confiée à l’agent', 'Handed to the agent'), t('Version actuelle', 'Current version'), t('28 août', 'Aug 28'), APP.violet], cree];
  const HD = [[t('Mot de passe changé', 'Password changed'), t('Version actuelle', 'Current version'), t('27 sept.', 'Sep 27'), APP.violet],
    [t('Confiée à l’agent', 'Handed to the agent'), t('Révision 2, gardée', 'Revision 2, kept'), t('28 août', 'Aug 28'), APP.violet], cree];
  const FA = R.fiche({ mdp: R.ANCIEN, frequence: 30, prochaine: t('28 sept.', 'Sep 28'), change: t('28 août', 'Aug 28'), historique: HA });
  ecran += entre(C, A_FICHE, B, FA.svg + FA.bas, 0.006);
  // Case 2: under way, then the site said the new one works.
  ecran += entre(C, B, B_APRES, R.agent({ bas: 'suivi', stats: [1, 0, 0, 1], points: veilles }), 0.006);
  const apresB = () => R.agent({ bas: 'demain', stats: [1, 1, 0, 1], points: [...veilles, [0.99, 'rotation']], point: APP.warn });
  ecran += entre(C, B_APRES, B_NOTIF, apresB() + toucher(353.5, 36.5, C, B_CLOCHE), 0.006);
  ecran += entre(C, B_NOTIF, CC, apresB() + R.notifications('rotation.done').svg, 0.006);
  // Case 3: to finish by hand. Both passwords, a button each.
  const apresC = () => R.agent({ bas: 'demain', stats: [1, 1, 0, 2], points: [...veilles, [0.99, 'rotation']], point: APP.warn });
  ecran += entre(C, CC, C_NOTIF, apresC() + toucher(353.5, 36.5, C, C_CLOCHE), 0.006);
  const NC = R.notifications('rotation.manual');
  ecran += entre(C, C_NOTIF, C_FICHE, apresC() + NC.svg + toucher(NC.ligne[0], NC.ligne[1], C, C_LIGNE), 0.006);
  const FC = R.fiche({ mdp: R.ANCIEN, deux: { coffre: R.ANCIEN, agent: R.NOUVEAU }, frequence: 30, prochaine: t('28 sept.', 'Sep 28'), change: t('28 août', 'Aug 28') });
  ecran += entre(C, C_FICHE, C_GARDE, FC.svg + FC.bas + toucher(FC.y.garderAgent[0], FC.y.garderAgent[1], C, C_GARDER), 0.006);
  const FD = R.fiche({ mdp: R.NOUVEAU, frequence: 30, prochaine: t('28 sept.', 'Sep 28'), change: t('27 sept.', 'Sep 27'), historique: HD });
  ecran += entre(C, C_GARDE, FIN, FD.svg + FD.bas +
    entre(C, C_GARDE + 0.004, 0.9, R.toast(t('Gardé : celui de l’agent.', 'Kept: the agent’s.'), { y: 710 }), 0.006), 0.006);
  corps += T.ecran(ecran);

  // ------------------------------------------------------------ the cases
  const LX = 420, LL = 820, LH = 150, BW = (LL - 40 - 3 * 30) / 4;
  const cas = [
    {
      y: 96, de: 0, a: B, numero: t('CAS 1', 'CASE 1'),
      titre: t('Le nouveau ne passe pas, le retour arrière marche', 'The new one fails, the rollback works'),
      code: 'rolled_back · rotation.failed',
      boites: [
        [t('Bloc en attente', 'Pending block'), t('révision 3, l’entrée active reste la 2', 'revision 3, the active entry stays at 2'), 0.015],
        [t('Reconnexion refusée', 'Sign-in refused'), t('le nouveau mot de passe ne passe pas', 'the new password does not work'), 0.045],
        [t('Retour arrière', 'Rollback'), t('l’ancien remis sur le site, vérifié', 'the old one set back on the site, checked'), 0.075],
        [t('Coffre intact', 'Vault intact'), t('bloc en attente supprimé, rien n’a bougé', 'pending block deleted, nothing moved'), 0.105, VERT],
      ],
    },
    {
      y: 262, de: B, a: CC, numero: t('CAS 2', 'CASE 2'),
      titre: t('La réponse au changement se perd (délai, erreur 5xx)', 'The answer to the change is lost (timeout, 5xx error)'),
      code: t('le site décide', 'the site decides'),
      boites: [
        [t('Changement envoyé', 'Change sent'), t('le site a peut-être pris le nouveau', 'the site may have taken the new one'), B + 0.015],
        [t('L’agent demande', 'The agent asks'), t('au site : l’ancien, puis le nouveau', 'the site: the old one, then the new one'), B + 0.05],
      ],
    },
    {
      y: 428, de: CC, a: FIN, numero: t('CAS 3', 'CASE 3'),
      titre: t('Le retour arrière échoue aussi', 'The rollback fails too'),
      code: 'failed · rotation.manual',
      boites: [
        [t('Reconnexion refusée', 'Sign-in refused'), t('le nouveau mot de passe ne passe pas', 'the new password does not work'), CC + 0.012],
        [t('Retour arrière raté', 'Rollback fails'), t('l’ancien n’est pas confirmé non plus', 'the old one is not confirmed either'), CC + 0.034],
        [t('Bloc gardé', 'Block kept'), t('l’entrée est signalée, rien n’est jeté', 'the entry is flagged, nothing is thrown away'), CC + 0.056],
        [t('Tu tranches', 'You decide'), t('les deux en clair, un bouton chacun', 'both in clear, one button each'), CC + 0.078, AMBRE, C_GARDE],
      ],
    },
  ];
  const boite = (x, y, l, titre, phrase) =>
    `<rect x="${x}" y="${y}" width="${l}" height="78" rx="10" fill="#0F1620" stroke="${BORD}"/>` +
    texte(x + 14, y + 25, titre, { taille: 13.5, couleur: TITRE, poids: 600 }) +
    paragraphe(x + 14, y + 46, phrase, { taille: 12.5, max: l - 28, couleur: TEXTE, interligne: 17 });
  // A lit border, in the accent, or in a state colour for the outcome.
  const bord = (x, y, l, h, de, a, c = ACCENT) =>
    `<rect x="${x}" y="${y}" width="${l}" height="${h}" rx="10" fill="${c}" fill-opacity="0.06" stroke="${c}" stroke-width="1.5" opacity="0">${visible(C, de, a)}</rect>`;

  cas.forEach((k) => {
    corps += carte(LX, k.y, LL, LH, { allume: [k.de, k.a], cycle: C });
    corps += texte(LX + 20, k.y + 32, k.numero, { taille: 12, couleur: ACCENT_TEXTE, police: MONO, poids: 600, espace: 1.5 });
    corps += texte(LX + 90, k.y + 32, k.titre, { taille: 15, couleur: TITRE, poids: 600 });
    corps += texte(LX + LL - 20, k.y + 32, k.code, { taille: 12, couleur: DISCRET, police: MONO, ancre: 'end' });
    const yb = k.y + 52;
    k.boites.forEach(([titre, phrase, de, c, jusqua], i) => {
      const x = LX + 20 + i * (BW + 30);
      // A box replaced by its outcome leaves before the outcome comes in.
      if (jusqua) {
        const b = boite(x, yb, BW, titre, phrase);
        corps += entre(C, 0, jusqua, b, 0.006) + entre(C, FIN, 1.2, b, 0.006) + bord(x, yb, BW, 78, de, jusqua, c);
      } else corps += boite(x, yb, BW, titre, phrase) + bord(x, yb, BW, 78, de, k.a, c || ACCENT);
      if (i) {
        const ch = `M ${x - 27} ${yb + 39} H ${x - 5}`;
        corps += fil(C, ch, de, k.a) + pointe(x - 4, yb + 39, 0) + bille(C, ch, de - 0.012, de - 0.001);
      }
    });
  });

  // Case 2 ends on three answers, the site's own; the one the phone plays
  // (the new one works) lights up.
  {
    const k = cas[1];
    const x = LX + 20 + 2 * (BW + 30), l = 2 * BW + 30, yb = k.y + 52;
    const ch = `M ${x - 27} ${yb + 39} H ${x - 5}`;
    corps += fil(C, ch, B + 0.085, CC) + pointe(x - 4, yb + 39, 0) + bille(C, ch, B + 0.073, B + 0.084);
    corps += `<rect x="${x}" y="${yb}" width="${l}" height="78" rx="10" fill="#0F1620" stroke="${BORD}"/>`;
    const reponses = [
      [t('L’ancien passe : retour arrière propre.', 'The old one works: a clean rollback.'), DISCRET],
      [t('Le nouveau passe : la rotation va au bout.', 'The new one works: the rotation goes through.'), VERT],
      [t('Aucun ne passe : bloc gardé, tu tranches.', 'Neither works: block kept, you decide.'), DISCRET],
    ];
    reponses.forEach(([s, c], i) => {
      const y = yb + 22 + i * 21;
      const simple = `<circle cx="${x + 20}" cy="${y - 4.5}" r="3.5" fill="${DISCRET}"/>` + texte(x + 32, y, s, { taille: 12.5, couleur: TEXTE });
      // The answer the phone plays swaps with its lit version, never on top of it.
      if (i !== 1) corps += simple;
      else corps += entre(C, 0, B_APRES, simple, 0.006) + entre(C, CC, 1.2, simple, 0.006);
      if (i === 1) {
        corps += entre(C, B_APRES, CC, `<circle cx="${x + 20}" cy="${y - 4.5}" r="3.5" fill="${c}"/>` + texte(x + 32, y, s, { taille: 12.5, couleur: TITRE, poids: 600 }), 0.006);
      }
    });
    corps += bord(x, yb, l, 78, B + 0.085, CC);
  }

  // Case 3: once you pick one, the last box says what happened.
  {
    const k = cas[2];
    const x = LX + 20 + 3 * (BW + 30), yb = k.y + 52;
    corps += entre(C, C_GARDE, FIN, `<rect x="${x}" y="${yb}" width="${BW}" height="78" rx="10" fill="#0F1620" stroke="${VERT}" stroke-width="1.5"/>` +
      texte(x + 14, yb + 25, t('Gardé : l’agent', 'Kept: the agent’s'), { taille: 13.5, couleur: TITRE, poids: 600 }) +
      paragraphe(x + 14, yb + 46, t('l’autre est jeté, la fiche redevient normale', 'the other goes, the entry is back to normal'), { taille: 12.5, max: BW - 28, couleur: TEXTE, interligne: 17 }), 0.006);
  }

  // ------------------------------------------------------ three rules
  const regles = [
    [t('L’agent ne devine jamais', 'The agent never guesses'), t('Quand aucun mot de passe n’est confirmé, il garde les deux et te demande.', 'When no password is confirmed, it keeps both and asks you.'), [C_FICHE, C_GARDE]],
    [t('Échéance au lendemain', 'Due again tomorrow'), t('Après un échec, il retente le jour suivant, pas toutes les heures.', 'After a failure, it tries again the next day, not every hour.'), [A_FICHE, B]],
    [t('Tout est écrit', 'Everything is written'), t('Chaque étape laisse une ligne au journal, jamais un mot de passe.', 'Each step leaves a line in the log, never a password.'), null],
  ];
  regles.forEach(([titre, phrase, allume], i) => {
    const x = LX + i * 280, y = 604;
    corps += carte(x, y, 260, 120, allume ? { allume, cycle: C } : {});
    corps += texte(x + 20, y + 34, titre, { taille: 14.5, couleur: TITRE, poids: 600 });
    corps += paragraphe(x + 20, y + 60, phrase, { taille: 12.5, max: 220, couleur: TEXTE, interligne: 18 });
  });

  svg('retour-arriere.svg', 1280, 760, corps, t(
    'Quand une rotation échoue, le coffre garde toujours le mot de passe qui ouvre le site. À gauche, le téléphone rejoue les vrais écrans, à droite trois cas s’allument l’un après l’autre. Cas 1, le nouveau ne passe pas mais le retour arrière marche : le bloc en attente en révision 3 pendant que l’entrée active reste la 2, la reconnexion refusée, l’ancien remis sur le site et vérifié, puis le coffre intact, bloc en attente supprimé ; statut rolled_back, notification rotation.failed. Le téléphone montre l’écran Agent avec la rotation en cours, puis un échec compté sur 30 jours et la prochaine rotation de Site de démo le 28 septembre, dans 1 jour ; la cloche ouvre la notification « Rotation annulée, rien n’a changé », et la fiche montre l’ancien mot de passe, la prochaine rotation le 28 septembre et la carte « Rotation demain, tous les 30 jours, avec ton accord ». Cas 2, la réponse au changement se perd (délai, erreur 5xx) : le site a peut-être pris le nouveau, alors l’agent lui demande, l’ancien puis le nouveau ; si l’ancien passe, retour arrière propre ; si le nouveau passe, la rotation va au bout ; si aucun ne passe, le bloc est gardé et tu tranches. Ici le nouveau passe, et le téléphone montre la notification « Mot de passe changé par l’agent, preuve de connexion validée ». Cas 3, le retour arrière échoue aussi : reconnexion refusée, l’ancien n’est pas confirmé non plus, le bloc est gardé et l’entrée signalée, statut failed, notification rotation.manual « Rotation à terminer toi-même ». La fiche affiche « Deux mots de passe pour cette entrée » : la rotation n’a pas pu être annulée, essaie de te connecter puis dis lequel marche, l’autre sera jeté ; celui du coffre et celui que l’agent a posé, en clair, chacun avec un bouton Garder. Le doigt garde celui de l’agent, le message « Gardé : celui de l’agent. » s’affiche, la fiche redevient normale et l’autre est jeté. En bas, trois règles : l’agent ne devine jamais, quand aucun mot de passe n’est confirmé il garde les deux et te demande ; après un échec il retente le jour suivant, pas toutes les heures ; chaque étape laisse une ligne au journal, jamais un mot de passe.',
    'When a rotation fails, the vault always keeps the password that opens the site. On the left, the phone replays the real screens; on the right, three cases light up one after the other. Case 1, the new one fails but the rollback works: the pending block as revision 3 while the active entry stays at 2, the sign-in refused, the old one set back on the site and checked, then the vault intact, pending block deleted; status rolled_back, notification rotation.failed. The phone shows the Agent screen with the rotation under way, then one failure over 30 days and the next rotation of Demo site on September 28, in 1 day; the bell opens the notification “Rotation cancelled, nothing changed”, and the entry shows the old password, the next rotation on September 28 and the card “Rotation tomorrow, every 30 days, with your consent”. Case 2, the answer to the change is lost (timeout, 5xx error): the site may have taken the new one, so the agent asks it, the old one then the new one; if the old one works, a clean rollback; if the new one works, the rotation goes through; if neither works, the block is kept and you decide. Here the new one works, and the phone shows the notification “Password changed by the agent, sign-in proof confirmed”. Case 3, the rollback fails too: sign-in refused, the old one is not confirmed either, the block is kept and the entry flagged, status failed, notification rotation.manual “Rotation for you to finish”. The entry shows “Two passwords for this entry”: the rotation could not be undone, try to sign in then say which one works, the other goes; the vault’s and the one the agent set, in clear, each with a Keep button. The finger keeps the agent’s, the message “Kept: the agent’s.” shows, the entry is back to normal and the other one goes. At the bottom, three rules: the agent never guesses, when no password is confirmed it keeps both and asks you; after a failure it tries again the next day, not every hour; each step leaves a line in the log, never a password.'));
};

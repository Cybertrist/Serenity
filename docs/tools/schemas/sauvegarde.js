// The nightly restic backup, and the drill that proves it restores.
//
// On the left, a terminal on the VM replays two real commands: make
// backup-now, which runs ops/backup.sh like the 03:12 timer does, then
// make backup-check, which runs scripts/backup-drill.sh on a throwaway
// vault. The script lines are printed by the scripts themselves (backup.sh,
// restore.sh, backup-drill.sh, api/tests/make_vault.py); restic's own lines
// are what restic prints, cut where "…" says so. Ids and sizes are samples.
//
// On the right, what the night does (docs/09-sauvegardes.md, ADR-016): the
// timer, the coherent copy (VACUUM INTO) and the two keys, the encrypted
// snapshot and its retention, what stays locked; then the drill as five
// steps, and the two rules around a restore.
module.exports = (O) => {
  const { t, svg, texte, paragraphe, entete, rubrique, entre, visible, frappe, carte, legendes, icone, pointe, fil, bille,
    MONO, SANS, CARTE, BORD, TITRE, TEXTE, DISCRET, FIL, ACCENT, ACCENT_TEXTE, VERT, ROUGE, FOND } = O;
  const C = 36;
  const FIN1 = 0.445, DEBUT2 = 0.46, FIN = 0.97;

  let corps = entete(t('LA SAUVEGARDE', 'THE BACKUP'),
    t('Chaque nuit, la base et les clés partent chiffrées. Et un exercice prouve qu’elles reviennent.',
      'Every night, the database and the keys leave encrypted. And a drill proves they come back.'));

  // ------------------------------------------------------------ the terminal
  const TX = 48, TY = 88, TL = 612, TH = 648;
  corps += `<rect x="${TX}" y="${TY}" width="${TL}" height="${TH}" rx="12" fill="#0A0E14" stroke="#2A3342" filter="url(#ombreFlottante)"/>
    <path d="M${TX + 12} ${TY + 0.5} H${TX + TL - 12}" stroke="#FFFFFF" stroke-opacity="0.06"/>
    <line x1="${TX}" y1="${TY + 36}" x2="${TX + TL}" y2="${TY + 36}" stroke="#1F2833"/>`;
  corps += icone('TerminalWindow', TX + 18, TY + 10, 17, DISCRET) +
    texte(TX + 44, TY + 23.5, 'tristan@serenity: /opt/serenity', { taille: 12.5, couleur: TEXTE, police: MONO });
  corps += [0, 1, 2].map((i) => `<circle cx="${TX + TL - 60 + i * 20}" cy="${TY + 18}" r="5" fill="#2A3342"/>`).join('');

  const LX = TX + 22, L0 = TY + 68, LH = 24;
  // A line appears at [de] and stays until the end of its part.
  const ligne = (n, de, a, contenu, { couleur = TEXTE, poids = 400 } = {}) =>
    entre(C, de, a, `<text x="${LX}" y="${L0 + n * LH}" font-family="${MONO}" font-size="12" font-weight="${poids}" fill="${couleur}" xml:space="preserve">${contenu}</text>`, 0.004);
  const esc = O.esc;
  // A typed command: the prompt, then the letters one by one.
  const commande = (n, de, a, fin, s) => entre(C, de - 0.006, fin,
    texte(LX, L0 + n * LH, '$', { taille: 12, couleur: ACCENT_TEXTE, police: MONO, poids: 600 }) +
    frappe(LX + 16, L0 + n * LH, s, C, de, a, { taille: 12, couleur: TITRE, police: MONO, poids: 600 }), 0.004);
  const invite = (n, de, a) => entre(C, de, a,
    texte(LX, L0 + n * LH, '$', { taille: 12, couleur: ACCENT_TEXTE, police: MONO, poids: 600 }) +
    `<rect x="${LX + 16}" y="${L0 + n * LH - 11}" width="8" height="14" fill="${TEXTE}"><animate attributeName="opacity" dur="1s" repeatCount="indefinite" values="1;1;0;0" keyTimes="0;0.5;0.5;1" calcMode="discrete"/></rect>`, 0.004);

  // Part 1: the nightly job, run by hand.
  const P1 = [
    [0.08, 'sudo ops/backup.sh', TEXTE],
    [0.09, t('[sudo] Mot de passe de tristan :', '[sudo] password for tristan:'), TEXTE],
    [0.11, 'using parent snapshot 3f2a91c4', DISCRET],
    [0.13, 'Files:           0 new,     3 changed,     0 unmodified', DISCRET],
    [0.135, 'Dirs:            0 new,     2 changed,     0 unmodified', DISCRET],
    [0.15, 'Added to the repository: 318.442 KiB (74.906 KiB stored)', DISCRET],
    [0.155, 'processed 3 files, 1.132 MiB in 0:00', DISCRET],
    [0.17, 'snapshot 8c1e07d5 saved', TITRE],
    [0.2, 'Applying Policy: keep 7 daily, 4 weekly, 6 monthly snapshots', TEXTE],
    [0.21, 'keep 15 snapshots:', DISCRET],
    [0.215, '…', DISCRET],
    [0.225, 'remove 1 snapshots:', DISCRET],
    [0.23, '…', DISCRET],
    [0.25, 'backup: done', TITRE],
  ];
  corps += commande(0, 0.02, 0.065, FIN1, 'make backup-now');
  P1.forEach(([de, s, c], i) => { corps += ligne(i + 1, de, FIN1, esc(s), { couleur: c }); });
  // Then the real backup, read back into a temporary folder.
  const n1 = P1.length + 1;
  corps += commande(n1, 0.275, 0.31, FIN1, 'make restore-check');
  corps += ligne(n1 + 1, 0.32, FIN1, 'sudo ops/restore.sh --check');
  corps += ligne(n1 + 2, 0.345, FIN1, esc(t('restore: base saine, 1 compte(s), 3 entrée(s), schéma 7', 'restore: healthy database, 1 account(s), 3 entry(ies), schema 7')));
  corps += ligne(n1 + 3, 0.36, FIN1, esc(t('restore: vérification réussie (rien n’a été écrit hors du dossier temporaire)', 'restore: check passed (nothing written outside the temporary folder)')), { couleur: VERT });
  corps += invite(n1 + 4, 0.37, FIN1);

  // Part 2: the drill, as make backup-check prints it.
  const P2 = [
    [0.525, 'scripts/backup-drill.sh', TEXTE],
    [0.55, t('== un coffre jetable, avec un compte et une entrée ==', '== a throwaway vault, with one account and one entry =='), TITRE, 600],
    [0.57, t('vault: /work/data/serenity.sqlite prêt (1 compte, 2 entrées)', 'vault: /work/data/serenity.sqlite ready (1 account, 2 entries)'), TEXTE],
    [0.6, t('== sauvegarde ==', '== backup =='), TITRE, 600],
    [0.61, 'backup: creating the repository', TEXTE],
    [0.62, 'created restic repository 5b1f2e9a0c at /repo', DISCRET],
    [0.63, 'Please note that knowledge of your password is required to access', DISCRET],
    [0.632, 'the repository. Losing your password means that your data is', DISCRET],
    [0.634, 'irrecoverably lost.', DISCRET],
    [0.65, 'no parent snapshot found, will read all files', DISCRET],
    [0.66, 'Files:           3 new,     0 changed,     0 unmodified', DISCRET],
    [0.67, 'snapshot 1d9c4b72 saved', TITRE],
    [0.675, '…', DISCRET],
    [0.69, 'backup: done', TITRE],
    [0.72, t('== le coffre disparaît (disque perdu, VM effacée) ==', '== the vault is gone (lost disk, wiped VM) =='), ROUGE, 600],
    [0.77, t('== restauration et vérification ==', '== restore and check =='), TITRE, 600],
    [0.81, t('restore: base saine, 1 compte(s), 2 entrée(s), schéma 7', 'restore: healthy database, 1 account(s), 2 entry(ies), schema 7'), TEXTE],
    [0.83, t('restore: fichiers dans /tmp/tmp.k3Qx8Vb2Lm/restored', 'restore: files in /tmp/tmp.k3Qx8Vb2Lm/restored'), TEXTE],
    [0.835, t('Remise en place : docs/09-sauvegardes.md (stack arrêtée, droits à refaire).', 'Putting back: docs/09-sauvegardes.md (stack stopped, redo permissions).'), TEXTE],
    [0.87, t('drill: base et clés restaurées, contenu vérifié.', 'drill: database and keys restored, content checked.'), VERT, 600],
  ];
  corps += commande(0, DEBUT2 + 0.012, 0.51, FIN, 'make backup-check');
  P2.forEach(([de, s, c, p], i) => { corps += ligne(i + 1, de, FIN, esc(s), { couleur: c, poids: p || 400 }); });
  corps += invite(P2.length + 1, 0.885, FIN);

  // ------------------------------------------------ every night at 03:12
  const RX = 684, RL = 556;
  corps += rubrique(RX, 106, t('CHAQUE NUIT À 03:12', 'EVERY NIGHT AT 03:12'));
  const tuile = (x, y, ic) => `<rect x="${x}" y="${y}" width="34" height="34" rx="9" fill="${ACCENT}" fill-opacity="0.12"/>` + icone(ic, x + 7, y + 7, 20, ACCENT_TEXTE);
  corps += carte(RX, 120, RL, 80, { allume: [0.005, 0.08], cycle: C });
  corps += tuile(RX + 20, 143, 'Clock');
  corps += texte(RX + 68, 152, 'serenity-backup.timer', { taille: 14, couleur: TITRE, police: MONO, poids: 600 });
  corps += texte(RX + 68, 174, t('03:12, à 5 min près. VM éteinte à cette heure : rattrapage au démarrage.', '03:12, give or take 5 min. VM off at that time: it catches up at boot.'), { taille: 12.5, couleur: TEXTE });

  // What goes into the snapshot.
  const BY = 214, BH = 176, BL = 268;
  corps += carte(RX, BY, BL, BH, { allume: [0.08, 0.17], cycle: C });
  corps += texte(RX + 20, BY + 34, t('Une copie cohérente', 'A coherent copy'), { taille: 15, couleur: TITRE, poids: 600 });
  [
    ['Database', 'serenity.sqlite', t('VACUUM INTO, WAL compris', 'VACUUM INTO, WAL included')],
    ['Key', 'server.key', t('sans elle, pas de zone agent', 'without it, no agent zone')],
    ['Key', 'totp.key', t('les codes de connexion', 'the sign-in codes')],
  ].forEach(([ic, nom, sous], i) => {
    const y = BY + 64 + i * 38;
    corps += icone(ic, RX + 20, y - 13, 17, ACCENT_TEXTE) + texte(RX + 46, y, nom, { taille: 13, couleur: TITRE, police: MONO }) +
      texte(RX + 46, y + 17, sous, { taille: 12, couleur: TEXTE });
  });
  const RX2 = RX + BL + 24;
  const cheminFichiers = `M ${RX + BL + 3} ${BY + BH / 2} H ${RX2 - 5}`;
  corps += fil(C, cheminFichiers, 0.11, 0.27) + pointe(RX2 - 4, BY + BH / 2, 0) + bille(C, cheminFichiers, 0.1, 0.115);
  corps += carte(RX2, BY, BL, BH, { allume: [0.11, 0.27], cycle: C });
  corps += texte(RX2 + 20, BY + 34, t('Un instantané restic', 'A restic snapshot'), { taille: 15, couleur: TITRE, poids: 600 });
  corps += texte(RX2 + 20, BY + 56, t('chiffré avant de quitter la VM', 'encrypted before it leaves the VM'), { taille: 12.5, couleur: TEXTE });
  // Retention: squares that light up when the policy runs.
  [[t('7 jours', '7 days'), 7], [t('4 semaines', '4 weeks'), 4], [t('6 mois', '6 months'), 6]].forEach(([mot, n], i) => {
    const y = BY + 96 + i * 26;
    corps += texte(RX2 + 20, y, mot, { taille: 12.5, couleur: TITRE });
    for (let k = 0; k < n; k++) {
      const x = RX2 + 112 + k * 18;
      corps += `<rect x="${x}" y="${y - 11}" width="12" height="12" rx="3" fill="none" stroke="${FIL}"/>`;
      corps += `<rect x="${x}" y="${y - 11}" width="12" height="12" rx="3" fill="${ACCENT}" opacity="0">${visible(C, 0.2 + i * 0.012 + k * 0.002, FIN1)}</rect>`;
    }
  });

  // What stays locked, whatever happens.
  const NY = 404;
  corps += carte(RX, NY, RL, 70, { allume: [0.27, 0.36], cycle: C });
  corps += icone('LockKey', RX + 20, NY + 14, 17, ACCENT_TEXTE) +
    texte(RX + 46, NY + 27, t('Le mot de passe du dépôt : sur papier, avec ton kit. Jamais dans Serenity.', 'The repository password: on paper, with your kit. Never in Serenity.'), { taille: 12.5, couleur: TITRE });
  corps += icone('ShieldCheck', RX + 20, NY + 39, 17, ACCENT_TEXTE) +
    texte(RX + 46, NY + 52, t('Ta zone personnelle reste chiffrée par ta clé maître, dans chaque instantané.', 'Your personal zone stays encrypted by your master key, in every snapshot.'), { taille: 12.5, couleur: TITRE });

  // ------------------------------------------------ the drill
  corps += rubrique(RX, 506, t('L’EXERCICE, REJOUÉ EN CI À CHAQUE PUSH', 'THE DRILL, REPLAYED IN CI ON EVERY PUSH'));
  const EY = 520, EH = 72, EG = 12, EL = (RL - 4 * EG) / 5;
  const etapes = [
    ['Vault', t('Coffre jetable', 'Test vault'), 0.55, ACCENT],
    ['CloudArrowUp', t('Sauvegarde', 'Backup'), 0.6, ACCENT],
    ['Trash', t('Destruction', 'Destruction'), 0.72, ROUGE],
    ['ArrowCounterClockwise', t('Restauration', 'Restore'), 0.77, ACCENT],
    ['CheckCircle', t('Vérification', 'Check'), 0.81, VERT],
  ];
  etapes.forEach(([ic, mot, de, c], i) => {
    const x = RX + i * (EL + EG);
    corps += `<rect x="${x}" y="${EY}" width="${EL}" height="${EH}" rx="12" fill="${CARTE}" stroke="${BORD}"/>`;
    corps += `<rect x="${x}" y="${EY}" width="${EL}" height="${EH}" rx="12" fill="${c}" fill-opacity="0.08" stroke="${c}" stroke-width="1.5" opacity="0">${visible(C, de, FIN)}</rect>`;
    corps += icone(ic, x + EL / 2 - 10, EY + 14, 20, DISCRET);
    corps += `<g opacity="0">${visible(C, de, FIN)}${icone(ic, x + EL / 2 - 10, EY + 14, 20, c === ACCENT ? ACCENT_TEXTE : c, 'fill')}</g>`;
    corps += texte(x + EL / 2, EY + 56, mot, { taille: 12, couleur: TITRE, ancre: 'middle' });
    if (i < 4) corps += pointe(x + EL + EG - 3, EY + EH / 2, 0, FIL);
  });

  // The two rules around a restore.
  const RY = 608, RH = 128, RW = (RL - 16) / 2;
  corps += carte(RX, RY, RW, RH, { allume: [0.36, FIN1], cycle: C });
  corps += carte(RX, RY, RW, RH, { allume: [0.83, FIN], cycle: C, fond: 'none' });
  corps += texte(RX + 20, RY + 34, t('Rien n’est écrasé', 'Nothing is overwritten'), { taille: 14.5, couleur: TITRE, poids: 600 });
  corps += paragraphe(RX + 20, RY + 60, t('La restauration dépose les fichiers dans un dossier. Tu les remets en place toi-même, la stack arrêtée.',
    'A restore drops the files in a folder. You put them back yourself, with the stack stopped.'), { taille: 12.5, max: RW - 40, couleur: TEXTE, interligne: 19 });
  const RX3 = RX + RW + 16;
  corps += carte(RX3, RY, RW, RH, { allume: [0.87, FIN], cycle: C });
  corps += texte(RX3 + 20, RY + 34, t('La bonne clé, ou rien', 'The right key, or nothing'), { taille: 14.5, couleur: TITRE, poids: 600 });
  corps += paragraphe(RX3 + 20, RY + 60, t('Avec une autre server.key que celle de la base, l’agent refuse de démarrer : deux sauvegardes ont été mélangées.',
    'With a server.key other than the database’s own, the agent refuses to start: two backups got mixed up.'), { taille: 12.5, max: RW - 40, couleur: TEXTE, interligne: 19 });

  // ------------------------------------------------ what is happening now
  corps += legendes(TX, 762, C, [
    [0, 0.08, t('Chaque nuit, le timer lance ops/backup.sh. Ici, la même chose à la main : make backup-now.', 'Every night the timer runs ops/backup.sh. Here, the same thing by hand: make backup-now.')],
    [0.08, 0.17, t('SQLite fait lui-même la copie, WAL compris : jamais la copie d’un fichier vivant. Les deux clés la rejoignent.', 'SQLite makes the copy itself, WAL included: never a copy of a live file. Both keys join it.')],
    [0.17, 0.27, t('restic chiffre l’instantané, puis applique la rétention : 7 jours, 4 semaines, 6 mois.', 'restic encrypts the snapshot, then applies retention: 7 days, 4 weeks, 6 months.')],
    [0.27, 0.36, t('Sans la clé serveur, la zone agent ne se rouvre jamais. Le dépôt la contient : son mot de passe reste sur papier.', 'Without the server key, the agent zone never opens again. The repository holds it: its password stays on paper.')],
    [0.36, FIN1, t('make restore-check relit la dernière sauvegarde dans un dossier temporaire, sans rien écrire ailleurs.', 'make restore-check reads the latest backup back into a temporary folder, writing nothing elsewhere.')],
    [DEBUT2, 0.72, t('Une sauvegarde que personne n’a restaurée est une rumeur. make backup-check la met à l’épreuve.', 'A backup nobody has restored is a rumour. make backup-check puts it to the test.')],
    [0.72, 0.81, t('La base et les clés sont effacées pour de bon, puis restaurées depuis le dépôt.', 'The database and the keys are erased for real, then restored from the repository.'), ROUGE],
    [0.81, FIN, t('La base s’ouvre, passe le contrôle d’intégrité, et les deux clés sont revenues.', 'The database opens, passes the integrity check, and both keys are back.'), VERT],
  ], { max: 1180 });

  svg('sauvegarde.svg', 1280, 790, corps, t(
    'La sauvegarde restic de chaque nuit, et l’exercice qui prouve qu’elle se restaure. À gauche, un terminal sur la VM rejoue trois commandes. D’abord make backup-now, qui lance sudo ops/backup.sh comme le timer de 03:12 : restic reprend l’instantané précédent, trouve 3 fichiers changés, enregistre l’instantané, applique la règle « garder 7 quotidiens, 4 hebdomadaires, 6 mensuels », en garde 15, en retire 1, puis affiche « backup: done ». Puis make restore-check, qui lance sudo ops/restore.sh --check : « base saine, 1 compte, 3 entrées, schéma 7 », et « vérification réussie, rien n’a été écrit hors du dossier temporaire ». Enfin make backup-check, qui lance scripts/backup-drill.sh : un coffre jetable avec un compte et deux entrées ; la sauvegarde, qui crée le dépôt, avec l’avertissement de restic sur le mot de passe dont la perte rend les données irrécupérables, lit 3 fichiers neufs et enregistre l’instantané ; « le coffre disparaît (disque perdu, VM effacée) » ; la restauration et la vérification, « base saine, 1 compte, 2 entrées, schéma 7 », les fichiers déposés dans un dossier temporaire, le rappel de la remise en place à la main, puis « base et clés restaurées, contenu vérifié ». À droite, en haut, chaque nuit à 03:12 : le timer serenity-backup.timer, à 5 minutes près, qui rattrape au démarrage si la VM était éteinte ; une copie cohérente de serenity.sqlite par VACUUM INTO, WAL compris, avec server.key, sans laquelle la zone agent ne se rouvre pas, et totp.key, pour les codes de connexion ; un instantané restic chiffré avant de quitter la VM, avec la rétention de 7 jours, 4 semaines et 6 mois dont les cases s’allument ; puis deux rappels : le mot de passe du dépôt se garde sur papier avec le kit, jamais dans Serenity, et la zone personnelle reste chiffrée par ta clé maître dans chaque instantané. En bas, l’exercice rejoué en CI à chaque push, en cinq étapes qui s’allument : coffre jetable, sauvegarde, destruction en rouge, restauration, vérification en vert ; et deux règles : rien n’est écrasé, la restauration dépose les fichiers dans un dossier et tu les remets en place la stack arrêtée ; la bonne clé ou rien, l’agent refuse de démarrer avec une clé serveur qui n’est pas celle de la base.',
    'The nightly restic backup, and the drill that proves it restores. On the left, a terminal on the VM replays three commands. First make backup-now, which runs sudo ops/backup.sh like the 03:12 timer does: restic picks up the previous snapshot, finds 3 changed files, saves the snapshot, applies the “keep 7 daily, 4 weekly, 6 monthly” policy, keeps 15, removes 1, then prints “backup: done”. Then make restore-check, which runs sudo ops/restore.sh --check: “healthy database, 1 account, 3 entries, schema 7”, and “check passed, nothing written outside the temporary folder”. Last make backup-check, which runs scripts/backup-drill.sh: a throwaway vault with one account and two entries; the backup, which creates the repository, with restic’s warning that losing the password makes the data irrecoverable, reads 3 new files and saves the snapshot; “the vault is gone (lost disk, wiped VM)”; restore and check, “healthy database, 1 account, 2 entries, schema 7”, the files dropped in a temporary folder, the reminder to put them back by hand, then “database and keys restored, content checked”. On the right, at the top, every night at 03:12: the serenity-backup.timer, give or take 5 minutes, which catches up at boot if the VM was off; a coherent copy of serenity.sqlite through VACUUM INTO, WAL included, with server.key, without which the agent zone does not open again, and totp.key, for the sign-in codes; a restic snapshot encrypted before it leaves the VM, with a retention of 7 days, 4 weeks and 6 months whose squares light up; then two reminders: the repository password is kept on paper with the kit, never in Serenity, and the personal zone stays encrypted by your master key in every snapshot. At the bottom, the drill replayed in CI on every push, in five steps that light up: throwaway vault, backup, destruction in red, restore, check in green; and two rules: nothing is overwritten, a restore drops the files in a folder and you put them back with the stack stopped; the right key or nothing, the agent refuses to start with a server key other than the database’s own.'));
};

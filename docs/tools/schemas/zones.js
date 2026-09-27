// The vault with two zones, and what "hand to the agent" really does.
//
// On the left, the phone plays the real gesture (05-coffre, 06-fiche,
// 07-confier, 08a-fiche-confiee, 08-coffre-delegue): the vault, Netflix
// opened, "Hand to the agent", the confirmation, then the vault again with
// Netflix under the agent's zone. On the right, the two zones as cards,
// the Netflix block that crosses from one to the other, and what the
// device does in between: decrypt with UK, encrypt again with AK, send
// with confirm: true (docs/04-coffre.md, docs/crypto.md 7.5).
module.exports = (O) => {
  const E = require('./_ecrans.js')(O);
  const { t, svg, texte, paragraphe, entete, rubrique, entre, visible, glisse, toucher, carte, legendes, icone, monogramme,
    telephone, fil, bille, pointe, ENTREES, CARTE, BORD, TITRE, TEXTE, DISCRET, ACCENT, ACCENT_TEXTE, VERT, MONO } = O;
  const C = 30;
  // The phone, step by step.
  const TAPE_N = 0.15, FICHE = 0.17, TAPE_C = 0.3, DIALOG = 0.32, TAPE_OK = 0.44, CONFIE = 0.46, RETOUR = 0.64, TAPE_X = 0.62, FIN = 0.97;
  // The right side: the block crosses between these two instants.
  const DEPART = 0.47, ARRIVE = 0.58;

  let corps = entete(t('LES DEUX ZONES', 'THE TWO ZONES'),
    t('Tout entre chez toi. Confier une entrée à l’agent est un geste, jamais un réglage.',
      'Everything lands with you. Handing an entry to the agent is a gesture, never a setting.'));

  // ------------------------------------------------------------ the phone
  const T = telephone(48, 88, 640);
  corps += T.cadre;
  let ecran = '';
  ecran += entre(C, 0, FICHE, E.coffre({ netflix: 'toi' }) + toucher(195, 410, C, TAPE_N), 0.006);
  ecran += entre(C, FICHE, DIALOG, E.fiche({ zone: 'toi' }) + toucher(114, 558, C, TAPE_C), 0.006);
  const d = E.dialogue({
    titre: t('Confier cette entrée à l’agent ?', 'Hand this entry to the agent?'),
    texte: t('Le serveur pourra la déchiffrer pour surveiller les fuites et changer son mot de passe. Il pourra aussi calculer son code à deux facteurs, ce dont l’agent a besoin pour se reconnecter. Tu peux la reprendre à tout moment.',
      'The server will be able to decrypt it, to watch for breaches and change its password. It will also be able to compute its two-factor code, which the agent needs to sign in again. You can take it back at any time.'),
    valider: t('Confier', 'Hand over'),
  });
  ecran += entre(C, DIALOG, CONFIE, E.fiche({ zone: 'toi' }) + d.svg + toucher(279, d.boutons, C, TAPE_OK), 0.006);
  ecran += entre(C, CONFIE, RETOUR, E.fiche({ zone: 'agent', secondes: 14 }) +
    O.toast(195, 716, t('Confiée à l’agent.', 'Handed to the agent.')) + toucher(360, 31, C, TAPE_X), 0.006);
  ecran += entre(C, RETOUR, FIN, E.coffre({ netflix: 'agent' }), 0.006);
  corps += T.ecran(ecran);

  // ------------------------------------------------------ the two zones
  const ZY = 96, ZH = 232, ZL = 395;
  const zones = [
    [420, 'ShieldCheck', t('Zone personnelle', 'Personal zone'), t('ZÉRO CONNAISSANCE', 'ZERO KNOWLEDGE'), [
      [t('Clé', 'Key'), t('UK, qui ne quitte jamais tes appareils', 'UK, which never leaves your devices')],
      [t('Qui lit', 'Who reads'), t('toi seul, coffre déverrouillé', 'you alone, vault unlocked')],
      [t('L’agent', 'The agent'), t('ne lit rien, il prévient', 'reads nothing, it warns you')],
    ]],
    [845, 'Sparkle', t('Zone agent', 'Agent zone'), t('DÉLÉGATION EXPLICITE', 'EXPLICIT DELEGATION'), [
      [t('Clé', 'Key'), t('AK, rangée deux fois', 'AK, stored twice')],
      [t('Qui lit', 'Who reads'), t('toi, et l’agent sur le serveur', 'you, and the agent on the server')],
      [t('L’agent', 'The agent'), t('surveille et change le mot de passe', 'watches and changes the password')],
    ]],
  ];
  zones.forEach(([x, ic, titre, sous, lignes], i) => {
    corps += carte(x, ZY, ZL, ZH, { allume: i === 0 ? [0.02, DEPART] : [ARRIVE, FIN], cycle: C });
    corps += `<rect x="${x + 20}" y="${ZY + 20}" width="34" height="34" rx="9" fill="${ACCENT}" fill-opacity="0.12"/>` + icone(ic, x + 27, ZY + 27, 20, ACCENT_TEXTE, i ? 'fill' : 'regular');
    corps += texte(x + 66, ZY + 36, titre, { taille: 16, couleur: TITRE, poids: 600 });
    corps += texte(x + 66, ZY + 53, sous, { taille: 11.5, couleur: DISCRET, police: MONO, poids: 600, espace: 1.5 });
    lignes.forEach(([a, b], k) => {
      const y = ZY + 90 + k * 26;
      corps += texte(x + 20, y, a, { taille: 12.5, couleur: DISCRET }) + texte(x + 96, y, b, { taille: 13, couleur: TITRE });
    });
    corps += `<line x1="${x + 20}" y1="${ZY + 164}" x2="${x + ZL - 20}" y2="${ZY + 164}" stroke="${BORD}"/>`;
  });

  // The entries of each zone, as small tiles. Netflix leaves the personal
  // zone while the device re-encrypts it, and lands in the agent's; Spotify
  // then closes the gap, so no empty slot is left behind.
  const tuile = (e) => monogramme(e.nom, 0, 0, 30, { cle: e.cle }) + texte(40, 20, e.nom, { taille: 13.5, couleur: TITRE, poids: 500 });
  const YT = ZY + 182;
  corps += `<g transform="translate(440 ${YT})">${tuile(ENTREES.banque)}</g>`;
  corps += `<g transform="translate(700 ${YT})"><g>${glisse(C, [[0, '0 0'], [ARRIVE, '0 0'], [ARRIVE + 0.03, '-130 0'], [FIN, '-130 0'], [FIN + 0.01, '0 0'], [1, '0 0']])}${tuile(ENTREES.spotify)}</g></g>`;
  // Netflix leaves the personal zone when the device starts, and shows up
  // in the agent's once the block is sent: never two tiles on top of each
  // other while it travels.
  corps += entre(C, 0, DEPART, `<g transform="translate(570 ${YT})">${tuile(ENTREES.netflix)}</g>`, 0.006);
  corps += entre(C, ARRIVE, FIN, `<g transform="translate(865 ${YT})">${tuile(ENTREES.netflix)}</g>`, 0.006);
  corps += entre(C, FIN + 0.012, 1.2, `<g transform="translate(570 ${YT})">${tuile(ENTREES.netflix)}</g>`, 0.006);
  // The empty agent zone, until Netflix arrives.
  corps += entre(C, 0, ARRIVE - 0.01, texte(1045, YT + 20, t('Rien de confié pour l’instant.', 'Nothing handed over yet.'), { taille: 13, couleur: DISCRET, ancre: 'middle' }), 0.006);
  corps += entre(C, FIN, 1.2, texte(1045, YT + 20, t('Rien de confié pour l’instant.', 'Nothing handed over yet.'), { taille: 13, couleur: DISCRET, ancre: 'middle' }), 0.006);

  // --------------------------------------------- what the device does
  const PY = 372, PH = 96, PL = 185, GAP = 26;
  corps += rubrique(420, PY - 14, t('CE QUE FAIT TON APPAREIL QUAND TU CONFIRMES', 'WHAT YOUR DEVICE DOES WHEN YOU CONFIRM'));
  const boites = [
    [t('Bloc chiffré', 'Encrypted block'), t('clé UK, zone toi', 'key UK, zone you'), t('révision 1', 'revision 1')],
    [t('Déchiffré', 'Decrypted'), t('dans ton navigateur', 'in your browser'), t('en mémoire seulement', 'in memory only')],
    [t('Rechiffré', 'Encrypted again'), t('clé AK, nonce neuf', 'key AK, fresh nonce'), t('zone agent, révision 2', 'agent zone, revision 2')],
    ['POST /delegate', t('confirm: true exigé', 'confirm: true required'), t('une ligne au journal', 'one line in the log')],
  ];
  const debuts = [0.44, 0.475, 0.51, 0.545];
  boites.forEach(([titre, l1, l2], i) => {
    const x = 420 + i * (PL + GAP);
    corps += carte(x, PY, PL, PH, { allume: [debuts[i], RETOUR + 0.12], cycle: C });
    corps += texte(x + 18, PY + 32, titre, { taille: 14, couleur: TITRE, police: i === 3 ? MONO : O.SANS, poids: 600 });
    corps += texte(x + 18, PY + 56, l1, { taille: 12.5 }) + texte(x + 18, PY + 76, l2, { taille: 12.5 });
    if (i < 3) {
      const c = `M ${x + PL + 3} ${PY + PH / 2} H ${x + PL + GAP - 5}`;
      corps += fil(C, c, debuts[i + 1], RETOUR + 0.12) + pointe(x + PL + GAP - 4, PY + PH / 2, 0) + bille(C, c, debuts[i + 1] - 0.012, debuts[i + 1]);
    }
  });

  // Captions under the pipeline: what is happening now.
  corps += legendes(420, 512, C, [
    [0, FICHE, t('Une entrée neuve va toujours dans ta zone : le serveur ne reçoit qu’un bloc qu’il ne sait pas ouvrir.', 'A new entry always lands in your zone: the server only gets a block it cannot open.')],
    [FICHE, DIALOG, t('La fiche dit qui peut la lire. Ici, toi seul.', 'The entry says who can read it. Here, only you.')],
    [DIALOG, CONFIE, t('Avant de confier, l’appli dit ce que le serveur pourra faire. Rien ne part sans ce geste.', 'Before handing over, the app says what the server will be able to do. Nothing leaves without that gesture.')],
    [CONFIE, RETOUR + 0.02, t('Déchiffré avec UK, rechiffré avec AK, envoyé avec confirm: true. Le serveur refuse sans.', 'Decrypted with UK, encrypted again with AK, sent with confirm: true. The server refuses without it.')],
    [RETOUR + 0.02, FIN, t('Netflix est dans la zone agent. « Reprendre » fait le chemin inverse et efface son historique côté agent.', 'Netflix is in the agent zone. “Take back” does the reverse and wipes its history on the agent side.')],
  ], { max: 800 });

  // ------------------------------------------------------ three rules
  const regles = [
    [t('Par défaut, chez toi', 'Yours by default'), t('Toute nouvelle entrée, importée ou tapée, va dans la zone personnelle.', 'Every new entry, imported or typed, lands in the personal zone.')],
    [t('Une entrée à la fois', 'One entry at a time'), t('Confier se fait entrée par entrée, avec une confirmation à chaque fois.', 'Handing over happens one entry at a time, confirmed every time.')],
    [t('Reprendre, c’est effacer', 'Taking back erases'), t('L’historique lisible par l’agent part, et l’appli te conseille de changer ce mot de passe.', 'The history the agent could read goes, and the app suggests changing that password.')],
  ];
  regles.forEach(([titre, phrase], i) => {
    const x = 420 + i * 280, y = 600;
    corps += carte(x, y, 260, 128);
    corps += texte(x + 20, y + 34, titre, { taille: 14.5, couleur: TITRE, poids: 600 });
    corps += paragraphe(x + 20, y + 60, phrase, { taille: 12.5, max: 220, couleur: TEXTE });
  });

  svg('zones.svg', 1280, 760, corps, t(
    'Le coffre à deux zones, et ce que fait « Confier à l’agent ». À gauche, le téléphone rejoue le geste sur les vrais écrans : le coffre, où Netflix est rangé sous « Protégé par toi » avec Banque et Spotify ; la fiche de Netflix, qui dit « Protégé par toi, l’agent te prévient en cas de fuite mais ne lit rien ici » ; le bouton « Confier à l’agent » ; la confirmation, qui dit que le serveur pourra déchiffrer l’entrée, surveiller ses fuites, changer son mot de passe et calculer son code à deux facteurs ; puis la fiche devenue « L’agent s’occupe de ce compte », et le coffre avec Netflix sous « Confié à l’agent ». À droite, deux cartes : la zone personnelle, en zéro connaissance, chiffrée par la clé UK qui ne quitte jamais tes appareils, lue par toi seul, où l’agent ne lit rien et prévient ; la zone agent, sur délégation explicite, chiffrée par la clé AK rangée deux fois, lue par toi et par l’agent sur le serveur, qui surveille et change le mot de passe. La tuile de Netflix passe de l’une à l’autre pendant que l’appareil travaille, en quatre étapes : le bloc chiffré par UK en révision 1, déchiffré dans le navigateur et en mémoire seulement, rechiffré par AK avec un nonce neuf en révision 2, puis envoyé par POST /delegate avec confirm: true, que le serveur exige, et une ligne au journal. En bas, trois règles : toute nouvelle entrée va dans la zone personnelle ; on confie une entrée à la fois, avec confirmation ; reprendre efface l’historique lisible par l’agent, et l’appli conseille de changer le mot de passe.',
    'The vault with two zones, and what “Hand to the agent” does. On the left, the phone replays the gesture on the real screens: the vault, where Netflix sits under “Protected by you” with Bank and Spotify; the Netflix entry, which says “Protected by you, the agent warns you of a breach but reads nothing here”; the “Hand to the agent” button; the confirmation, which says the server will be able to decrypt the entry, watch it for breaches, change its password and compute its two-factor code; then the entry now reading “The agent looks after this account”, and the vault with Netflix under “Handed to the agent”. On the right, two cards: the personal zone, zero knowledge, encrypted with the UK key that never leaves your devices, read by you alone, where the agent reads nothing and warns you; the agent zone, by explicit delegation, encrypted with the AK key stored twice, read by you and by the agent on the server, which watches and changes the password. The Netflix tile moves from one to the other while the device works, in four steps: the block encrypted with UK at revision 1, decrypted in the browser and in memory only, encrypted again with AK and a fresh nonce at revision 2, then sent through POST /delegate with confirm: true, which the server requires, and one line in the log. At the bottom, three rules: every new entry lands in the personal zone; entries are handed over one at a time, with a confirmation; taking one back erases the history the agent could read, and the app suggests changing the password.'));
};

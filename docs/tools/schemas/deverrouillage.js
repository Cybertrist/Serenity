// Getting in, day after day.
//
// On the left, one phone through the three doors of docs/crypto.md §7.2,
// §7.3 and §7.8: the full sign-in of a new device (password, then the
// six-digit code), the opening (Opening.tsx: cover, hold, lift), the vault;
// fifteen minutes later it locks; the daily unlock with the password only,
// offline this time, so the vault is read-only (15-hors-ligne); then the
// forgotten password: "Forgot it? Use your kit" (13b-recuperation) ends on
// a brand new kit. On the right, the three doors, the state of the device
// (session, vault, keys in memory), and three rules: the opening, the
// progressive lockout, no enumeration (docs/03-authentification.md).
module.exports = (O) => {
  const E = require('./_ecrans.js')(O);
  const A = require('./_ecrans-crypto.js')(O);
  const { t, svg, texte, entete, rubrique, entre, fondu, visible, toucher, frappe, carte, etape, legendes, icone,
    telephone, APP, CARTE, BORD, TITRE, TEXTE, DISCRET, ACCENT, ACCENT_TEXTE, VERT, AMBRE, MONO } = O;
  const C = 36;
  // A: full sign-in, B: the code, then the opening.
  const MDP_A = [0.03, 0.085], PRET_A = 0.09, TAPE_A = 0.105, CODE = 0.12, CHIFFRES = [0.14, 0.19], PRET_B = 0.195,
    TAPE_B = 0.205, OUV1 = 0.215, LEVE1 = 0.28, FIN1 = 0.305;
  // Locked after 15 minutes, then the daily unlock, offline.
  const VERROU = 0.42, MDP_D = [0.445, 0.49], PRET_D = 0.495, TAPE_D = 0.51, OUV2 = 0.52, LEVE2 = 0.56, FIN2 = 0.585;
  // Closed, then the recovery.
  const FERME = 0.68, TAPE_K = 0.725, RECUP = 0.74, CLE = [0.755, 0.8], CHIFFRES_R = [0.8, 0.83], PRET_R = 0.835,
    TAPE_R = 0.845, NOUVEAU = 0.86, FIN = 0.97;

  let corps = entete(t('SE CONNECTER', 'GETTING IN'),
    t('Le code une fois par appareil et par 60 jours, le mot de passe seul au quotidien, le kit en dernier recours.',
      'The code once per device and per 60 days, the password alone every day, the kit as a last resort.'));

  // ------------------------------------------------------------ the phone
  const T = telephone(48, 92, 640);
  corps += T.cadre;
  const dots = '••••••••••••••••••';
  let ecran = '';
  // A: a new device.
  ecran += entre(C, 0, PRET_A, A.connexion(), 0.004);
  ecran += entre(C, PRET_A, CODE, A.connexion({ pret: true }) + toucher(195, A.P.connexion.continuer + 20, C, TAPE_A), 0.004);
  ecran += entre(C, MDP_A[0], CODE, frappe(A.P.connexion.mdp[0], A.P.connexion.mdp[1], dots, C, MDP_A[0], MDP_A[1], { taille: 16, couleur: APP.text }), 0.004);
  // B: the code.
  ecran += entre(C, CODE, PRET_B, A.connexionCode(), 0.004);
  ecran += entre(C, PRET_B, OUV1 + 0.012, A.connexionCode({ pret: true }) + toucher(195, A.P.connexion.deverrouiller + 20, C, TAPE_B), 0.004);
  [...'705318'].forEach((c, i) => {
    const de = CHIFFRES[0] + ((CHIFFRES[1] - CHIFFRES[0]) * i) / 6;
    ecran += entre(C, de, OUV1 + 0.012, A.P.chiffre(i, A.P.connexion.cases, c), 0.003);
  });
  ecran += entre(C, LEVE1, VERROU, E.coffre({ netflix: 'agent' }), 0.006);
  // D: locked, then unlocked offline.
  ecran += entre(C, VERROU, PRET_D, A.verrou(), 0.006);
  ecran += entre(C, PRET_D, OUV2 + 0.012, A.verrou({ pret: true }) + toucher(195, A.P.verrou.bouton + 20, C, TAPE_D), 0.004);
  ecran += entre(C, MDP_D[0], OUV2 + 0.012, frappe(A.P.verrou.mdp[0], A.P.verrou.mdp[1], dots, C, MDP_D[0], MDP_D[1], { taille: 16, couleur: APP.text }), 0.004);
  ecran += entre(C, LEVE2, FERME, A.coffreHorsLigne(), 0.006);
  // F: closed, forgotten, the kit.
  ecran += entre(C, FERME, RECUP, A.verrou() + toucher(A.oublieX(), 745, C, TAPE_K), 0.006);
  ecran += entre(C, RECUP, PRET_R, A.recuperation(), 0.004);
  ecran += entre(C, PRET_R, NOUVEAU, A.recuperation({ pret: true }) + toucher(195, A.P.recup.continuer + 20, C, TAPE_R), 0.004);
  ecran += entre(C, CLE[0], NOUVEAU, frappe(A.P.recup.cle[0], A.P.recup.cle[1], 'VW98-P2G6-J2TG-RXA5-5M8P-D9B0', C, CLE[0], CLE[1], { taille: 13.5, couleur: APP.text, police: MONO }), 0.004);
  [...'261874'].forEach((c, i) => {
    const de = CHIFFRES_R[0] + ((CHIFFRES_R[1] - CHIFFRES_R[0]) * i) / 6;
    ecran += entre(C, de, NOUVEAU, A.P.chiffre(i, A.P.recup.cases, c), 0.003);
  });
  ecran += entre(C, NOUVEAU, FIN, A.nouveauKit(), 0.006);
  ecran += entre(C, FIN, 1.2, A.connexion(), 0.006);
  ecran += A.ouverture(C, OUV1, LEVE1, FIN1) + A.ouverture(C, OUV2, LEVE2, FIN2);
  corps += T.ecran(ecran);

  // ------------------------------------------------------- the three doors
  const X = 400, L = 840, PL = 266, PG = 21;
  corps += rubrique(X, 94, t('TROIS PORTES', 'THREE DOORS'));
  const portes = [
    [t('Connexion complète', 'Full sign-in'), t('Mot de passe et code à 6 chiffres, sur un nouvel appareil puis tous les 60 jours. Ouvre une session d’appareil de 60 jours.',
      'Password and 6-digit code, on a new device then every 60 days. Opens a 60-day device session.'), 'POST /api/auth/login', [0.005, FIN1]],
    [t('Déverrouillage', 'Unlock'), t('Le mot de passe seul, au quotidien. Déverrouillé 15 min, prolongées à chaque action. Hors ligne, en lecture seule.',
      'The password alone, every day. Unlocked for 15 min, extended with each action. Offline, read-only.'), 'POST /api/auth/unlock', [VERROU, FERME]],
    [t('Récupération', 'Recovery'), t('Le kit et un code. Tu choisis un nouveau mot de passe et tu reçois un nouveau kit : l’ancien ne vaut plus rien.',
      'The kit and a code. You pick a new password and get a new kit: the old one is worth nothing.'), 'POST /api/auth/recover/…', [FERME + 0.04, FIN]],
  ];
  portes.forEach(([titre, phrase, route, allume], i) => {
    const x = X + i * (PL + PG);
    corps += etape(x, 108, PL, 196, String(i + 1), titre, phrase, { allume, cycle: C });
    corps += texte(x + 20, 108 + 176, route, { taille: 12, couleur: ACCENT_TEXTE, police: MONO });
  });

  // ------------------------------------------------ the state of the device
  const SY = 344;
  corps += rubrique(X, SY - 10, t('CET APPAREIL', 'THIS DEVICE'));
  corps += carte(X, SY, L, 104);
  const cols = [X + 24, X + 304, X + 584];
  [[t('Session d’appareil', 'Device session')], [t('Coffre', 'Vault')], [t('En mémoire', 'In memory')]].forEach(([mot], i) => {
    corps += texte(cols[i], SY + 32, mot, { taille: 13, couleur: DISCRET });
    if (i) corps += `<line x1="${cols[i] - 24}" y1="${SY + 20}" x2="${cols[i] - 24}" y2="${SY + 84}" stroke="${BORD}"/>`;
  });
  const puce = (x, y, s, c, { mono = false } = {}) => {
    const l = O.largeur(s, 13, { poids: 500, police: mono ? MONO : O.SANS }) + 24;
    return { l, svg: `<rect x="${x}" y="${y}" width="${l}" height="28" rx="9" fill="${c}" fill-opacity="0.12" stroke="${c}" stroke-opacity="0.55"/>` +
      texte(x + l / 2, y + 19, s, { taille: 13, couleur: c, poids: 500, police: mono ? MONO : O.SANS, ancre: 'middle' }) };
  };
  const etats = (x, liste) => liste.map(([de, a, s, c]) => entre(C, de, a, puce(x, SY + 50, s, c).svg, 0.006)).join('');
  const GRIS = '#9AA7B6';
  corps += etats(cols[0], [[0, TAPE_B + 0.006, t('aucune', 'none'), GRIS], [TAPE_B + 0.006, NOUVEAU, t('ouverte, 60 jours', 'open, 60 days'), ACCENT_TEXTE], [NOUVEAU, FIN, t('nouvelle, 60 jours', 'new, 60 days'), ACCENT_TEXTE], [FIN, 1.2, t('aucune', 'none'), GRIS]]);
  corps += etats(cols[1], [
    [0, LEVE1, t('verrouillé', 'locked'), GRIS], [LEVE1, VERROU, t('déverrouillé, 15 min', 'unlocked, 15 min'), VERT],
    [VERROU, LEVE2, t('verrouillé', 'locked'), GRIS], [LEVE2, FERME, t('hors ligne, lecture seule', 'offline, read-only'), AMBRE],
    [FERME, NOUVEAU, t('verrouillé', 'locked'), GRIS], [NOUVEAU, FIN, t('déverrouillé, 15 min', 'unlocked, 15 min'), VERT], [FIN, 1.2, t('verrouillé', 'locked'), GRIS]]);
  // The unlocked quarter of an hour runs out, then the vault locks.
  corps += `<rect x="${cols[1]}" y="${SY + 86}" width="236" height="3" rx="1.5" fill="${BORD}" opacity="0">${visible(C, LEVE1, VERROU)}</rect>`;
  corps += `<rect x="${cols[1]}" y="${SY + 86}" width="236" height="3" rx="1.5" fill="${VERT}" opacity="0">${visible(C, LEVE1, VERROU)}
    ${fondu('width', C, [[0, 236], [FIN1, 236], [VERROU, 0], [1, 0]])}</rect>`;
  // UK and AK, only while the vault is open.
  const cles = () => { const a = puce(cols[2], SY + 50, 'UK', ACCENT_TEXTE, { mono: true }); const b = puce(cols[2] + a.l + 8, SY + 50, 'AK', ACCENT_TEXTE, { mono: true }); return a.svg + b.svg; };
  const rien = () => texte(cols[2], SY + 69, t('rien : clés effacées', 'nothing: keys wiped'), { taille: 13, couleur: TEXTE });
  corps += entre(C, 0, LEVE1, rien(), 0.006) + entre(C, LEVE1, VERROU, cles(), 0.006) + entre(C, VERROU, LEVE2, rien(), 0.006) +
    entre(C, LEVE2, FERME, cles(), 0.006) + entre(C, FERME, NOUVEAU, rien(), 0.006) +
    entre(C, NOUVEAU, FIN, cles(), 0.006) + entre(C, FIN, 1.2, rien(), 0.006);

  // ------------------------------------------------------------ captions
  corps += legendes(X, 490, C, [
    [0, CODE, t('Nouvel appareil : ton mot de passe maître est dérivé ici et ne quitte pas l’appareil.', 'New device: your master password is derived here and never leaves the device.')],
    [CODE, OUV1, t('Puis le code à 6 chiffres. Un code ne sert qu’une fois, même dans ses 30 secondes.', 'Then the 6-digit code. A code works only once, even within its 30 seconds.')],
    [OUV1, FIN1, t('L’ouverture : le voile monte, le faisceau traverse, le coffre se monte derrière.', 'The opening: the veil rises, the beam crosses, the vault mounts behind it.')],
    [FIN1, VERROU, t('Déverrouillé 15 min, prolongées à chaque action. UK et AK vivent en mémoire seulement.', 'Unlocked for 15 min, extended with each action. UK and AK live in memory only.')],
    [VERROU, OUV2, t('15 min sans activité : verrouillé, clés effacées. Le mot de passe seul le rouvre.', '15 min without activity: locked, keys wiped. The password alone opens it again.')],
    [OUV2, FERME, t('Sans réseau, l’appareil déchiffre quand même : tu lis ton coffre, rien n’y change.', 'Without network, the device still decrypts: you read your vault, nothing changes.')],
    [FERME, RECUP, t('Fermer l’appli verrouille aussi. Et si le mot de passe t’échappe ?', 'Closing the app locks it too. And if the password escapes you?')],
    [RECUP, NOUVEAU, t('Ton kit et un code prouvent que c’est toi, puis tu choisis un nouveau mot de passe.', 'Your kit and a code prove it is you, then you pick a new password.')],
    [NOUVEAU, FIN, t('Un nouveau kit s’affiche, l’ancien ne vaut plus rien. Toutes les sessions sont fermées, celle-ci repart.', 'A new kit shows up, the old one is worth nothing. Every session is closed, this one starts again.')],
  ], { max: 820 });

  // ------------------------------------------------------------ three rules
  const RY = 530;
  const regles = [
    [t('L’ouverture', 'The opening'), t('Le voile monte, un faisceau traverse l’écran en 1,25 s, le coffre se monte derrière, puis le voile s’ouvre.',
      'The veil rises, a beam crosses the screen in 1.25 s, the vault mounts behind it, then the veil opens.'), 'Sparkle'],
    [t('Trop d’essais', 'Too many tries'), t('Après 5 échecs, une pause de 1 min, puis 2, 4, 8… jusqu’à 24 h. Les compteurs survivent à un redémarrage.',
      'After 5 failures, a 1 min pause, then 2, 4, 8… up to 24 h. The counters survive a restart.'), 'Timer'],
    [t('Pas d’énumération', 'No enumeration'), t('Un compte inconnu reçoit un faux sel stable, et le serveur calcule quand même un Argon2id.',
      'An unknown account gets a stable fake salt, and the server still computes an Argon2id.'), 'EyeSlash'],
  ];
  regles.forEach(([titre, phrase, ic], i) => {
    const x = X + i * (PL + PG);
    corps += carte(x, RY, PL, 150);
    if (i === 0) {
      for (const [de, a] of [[OUV1, FIN1], [OUV2, FIN2]]) {
        corps += `<rect x="${x}" y="${RY}" width="${PL}" height="150" rx="14" fill="${ACCENT}" fill-opacity="0.06" stroke="${ACCENT}" stroke-width="1.5" opacity="0">${visible(C, de, a)}</rect>`;
      }
    }
    corps += icone(ic, x + 20, RY + 20, 20, ACCENT_TEXTE);
    corps += texte(x + 50, RY + 36, titre, { taille: 14.5, couleur: TITRE, poids: 600 });
    corps += O.paragraphe(x + 20, RY + 66, phrase, { taille: 12.5, max: PL - 40, couleur: TEXTE });
  });

  svg('deverrouillage.svg', 1280, 760, corps, t(
    'Se connecter, jour après jour. À gauche, un téléphone passe les trois portes sur les vrais écrans. Connexion complète sur un nouvel appareil : l’écran « Connexion, sur un nouvel appareil, ou tous les 60 jours », l’identifiant tristan, le mot de passe maître tapé, « Continuer », puis « La double vérification » et ses six cases remplies, « Déverrouiller ». L’ouverture suit : un voile bleu nuit monte, le ruban gonfle, un faisceau de lumière traverse l’écran, et le coffre apparaît avec Banque, Spotify et Netflix. Quinze minutes plus tard, l’écran de verrouillage « Bon retour, Tristan. » revient ; le mot de passe seul le rouvre, hors ligne cette fois, et le coffre s’affiche avec la note « Hors ligne : tu peux lire ton coffre, mais rien n’y est modifiable tant que le serveur n’est pas joignable. ». Puis l’appli est fermée, on touche « Oublié ? Utilise ton kit » : l’écran « Récupération » demande l’identifiant, la clé de récupération et un code, et se termine sur « Ton nouveau kit », avec la note « Tes autres appareils ont été déconnectés. » et neuf nouveaux groupes. À droite, trois portes : la connexion complète, mot de passe et code sur un nouvel appareil puis tous les 60 jours, qui ouvre une session d’appareil de 60 jours par POST /api/auth/login ; le déverrouillage, mot de passe seul, 15 minutes prolongées à chaque action, en lecture seule hors ligne, par POST /api/auth/unlock ; la récupération, kit et code, nouveau mot de passe et nouveau kit, l’ancien ne valant plus rien, par POST /api/auth/recover. Dessous, l’état de cet appareil : la session d’appareil, aucune, puis ouverte pour 60 jours, puis nouvelle après la récupération, qui ferme toutes les autres ; le coffre, verrouillé, déverrouillé 15 minutes avec une barre qui se vide, hors ligne en lecture seule ; et ce qui est en mémoire, UK et AK seulement quand le coffre est ouvert, rien sinon. Des légendes racontent chaque moment, dont le code à usage unique même dans ses 30 secondes. En bas, trois règles : l’ouverture, où le voile monte, un faisceau traverse l’écran en 1,25 s et le coffre se monte derrière avant que le voile s’ouvre ; trop d’essais, où après 5 échecs viennent une pause de 1 minute puis 2, 4, 8 jusqu’à 24 heures, avec des compteurs qui survivent à un redémarrage ; pas d’énumération, où un compte inconnu reçoit un faux sel stable et le serveur calcule quand même un Argon2id.',
    'Getting in, day after day. On the left, one phone goes through the three doors on the real screens. Full sign-in on a new device: the screen “Sign in, on a new device, or every 60 days”, the username tristan, the master password typed, “Continue”, then “Two-step verification” and its six boxes filled, “Unlock”. The opening follows: a night blue veil rises, the ribbon swells, a beam of light crosses the screen, and the vault appears with Bank, Spotify and Netflix. Fifteen minutes later, the lock screen “Welcome back, Tristan.” is back; the password alone opens it again, offline this time, and the vault shows the note “Offline: you can read your vault, but nothing in it can change until the server can be reached.”. Then the app is closed, and “Forgot it? Use your kit” is tapped: the “Recovery” screen asks for the username, the recovery key and a code, and ends on “Your new kit”, with the note “Your other devices have been signed out.” and nine new groups. On the right, three doors: the full sign-in, password and code on a new device then every 60 days, which opens a 60-day device session through POST /api/auth/login; the unlock, password alone, 15 minutes extended with each action, read-only when offline, through POST /api/auth/unlock; the recovery, kit and code, a new password and a new kit, the old one being worth nothing, through POST /api/auth/recover. Below, the state of this device: the device session, none, then open for 60 days, then new after the recovery, which closes all the others; the vault, locked, unlocked for 15 minutes with a bar that runs out, offline and read-only; and what is in memory, UK and AK only while the vault is open, nothing otherwise. Captions tell each moment, including the one-time code, even within its 30 seconds. At the bottom, three rules: the opening, where the veil rises, a beam crosses the screen in 1.25 s and the vault mounts behind it before the veil opens; too many tries, where after 5 failures come a 1-minute pause then 2, 4, 8 up to 24 hours, with counters that survive a restart; no enumeration, where an unknown account gets a stable fake salt and the server still computes an Argon2id.'));
};

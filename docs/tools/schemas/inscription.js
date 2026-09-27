// Creating the account, in three steps.
//
// On the left, the phone plays the real flow (Welcome.tsx: 01-bienvenue,
// 02-totp, 03-kit): username and master password, the six-digit code, the
// recovery kit shown once, downloaded, "I wrote it down", then the
// opening and the empty vault (04-coffre-vide). On the right, what the
// device draws and derives, what the server receives (docs/crypto.md
// §7.1, docs/03-authentification.md), the two exchanges with their
// routes, and the account that turns active while sign-ups close
// (single user in V1, ADR-008).
module.exports = (O) => {
  const A = require('./_ecrans-crypto.js')(O);
  const { t, svg, texte, entete, rubrique, entre, fondu, visible, glisse, toucher, frappe, carte, etape, legendes, icone,
    telephone, fil, bille, pointe, APP, CARTE, BORD, TITRE, TEXTE, DISCRET, ACCENT, ACCENT_TEXTE, VERT, MONO } = O;
  const C = 34;
  // The phone.
  const ID = [0.02, 0.045], MDP = [0.055, 0.1], CONF = [0.11, 0.15], TAPE_1 = 0.165, TOTP = 0.18,
    CODE = [0.27, 0.33], PRET = 0.335, TAPE_2 = 0.36, KIT = 0.39, TAPE_DL = 0.5, COCHE = 0.6, DEFILE = [0.64, 0.67],
    TAPE_3 = 0.71, OUV = 0.72, LEVE = 0.77, FIN_OUV = 0.8, FIN = 0.97;
  // The right side.
  const GENERE = 0.17, ENVOI = [0.19, 0.22], SECRET = [0.235, 0.26], CONFIRME = [0.36, 0.38], ACTIF = 0.38, EFFACE = 0.62;

  let corps = entete(t('LA CRÉATION DU COMPTE', 'CREATING THE ACCOUNT'),
    t('Trois écrans. Tes clés naissent sur ton appareil, le serveur ne reçoit que de quoi te reconnaître.',
      'Three screens. Your keys are born on your device, the server only gets what it needs to recognise you.'));

  // ------------------------------------------------------------ the phone
  const T = telephone(48, 92, 640);
  corps += T.cadre;
  const B = A.P.bienvenue;
  let ecran = '';
  ecran += entre(C, 0, MDP[1], A.bienvenue(), 0.004);
  ecran += entre(C, MDP[1], TOTP, A.bienvenue({ solide: true }) + toucher(195, 747, C, TAPE_1), 0.004);
  ecran += entre(C, ID[0], TOTP, frappe(B.identifiant[0], B.identifiant[1], 'tristan', C, ID[0], ID[1], { taille: 15, couleur: APP.text }) +
    frappe(B.mdp[0], B.mdp[1], '••••••••••••••••••', C, MDP[0], MDP[1], { taille: 16, couleur: APP.text }) +
    frappe(B.confirme[0], B.confirme[1], '••••••••••••••••••', C, CONF[0], CONF[1], { taille: 16, couleur: APP.text }), 0.004);
  // The code, one digit after the other.
  ecran += entre(C, TOTP, PRET, A.totp(), 0.004);
  ecran += entre(C, PRET, KIT, A.totp({ pret: true }) + toucher(195, 707, C, TAPE_2), 0.004);
  const code = '482913';
  [...code].forEach((c, i) => {
    const de = CODE[0] + ((CODE[1] - CODE[0]) * i) / 6;
    ecran += entre(C, de, KIT, A.P.chiffre(i, A.P.totp.cases, c), 0.003);
  });
  // The kit: download, tick, the page scrolls, "Open my vault".
  const defile = (contenu) => `<g>${glisse(C, [[0, '0 0'], [DEFILE[0], '0 0'], [DEFILE[1], '0 -92'], [1, '0 -92']])}${contenu}</g>`;
  ecran += entre(C, KIT, COCHE, A.kit() + toucher(112, 641, C, TAPE_DL) + toucher(53, 795, C, COCHE - 0.004), 0.004);
  ecran += entre(C, COCHE, OUV + 0.012, defile(A.kit({ cochee: true }) + toucher(195, 852, C, TAPE_3)), 0.004);
  ecran += entre(C, LEVE, FIN, A.coffreVide(), 0.006);
  ecran += A.ouverture(C, OUV, LEVE, FIN_OUV);
  corps += T.ecran(ecran);

  // ---------------------------------------------- the device, the server
  const DX = 400, DL = 404, SX = 870, SL = 370, Y0 = 108, H = 300;
  corps += rubrique(DX, 94, t('TON APPAREIL', 'YOUR DEVICE'));
  corps += rubrique(SX, 94, t('LE SERVEUR', 'THE SERVER'));
  corps += carte(DX, Y0, DL, H, { allume: [GENERE, ENVOI[1] + 0.02], cycle: C });
  corps += carte(SX, Y0, SL, H, { allume: [ENVOI[1], ENVOI[1] + 0.05], cycle: C });

  // One line of a list: a mono tag, then its text, shown from [de].
  const ligne = (x, y, tag, s, de, a = FIN, { couleur = TITRE } = {}) => entre(C, de, a,
    texte(x, y, tag, { taille: 13, couleur: ACCENT_TEXTE, police: MONO, poids: 600 }) + texte(x + 96, y, s, { taille: 13, couleur }), 0.006);

  const petit = (x, y, s) => texte(x, y, s, { taille: 12, couleur: DISCRET, police: MONO, poids: 600, espace: 1.5 });
  corps += petit(DX + 20, Y0 + 30, t('TIRÉ AU HASARD', 'DRAWN AT RANDOM'));
  const hasard = [
    ['user_id', t('UUID v4', 'UUID v4')],
    [t('sel', 'salt'), t('16 octets', '16 bytes')],
    ['UK', t('32 octets, la clé utilisateur', '32 bytes, the user key')],
    ['AK', t('32 octets, la clé d’agent', '32 bytes, the agent key')],
  ];
  hasard.forEach(([tag, s], i) => { corps += ligne(DX + 20, Y0 + 58 + i * 28, tag, s, GENERE + i * 0.004); });
  // The kit: shown once, then wiped from memory once ticked.
  const yRK = Y0 + 58 + 4 * 28;
  corps += ligne(DX + 20, yRK, 'RK', t('20 octets : ton kit', '20 bytes: your kit'), GENERE + 0.016, EFFACE);
  corps += entre(C, EFFACE, FIN, texte(DX + 20, yRK, 'RK', { taille: 13, couleur: DISCRET, police: MONO, poids: 600 }) +
    texte(DX + 116, yRK, t('noté, puis effacé de la mémoire', 'written down, then wiped from memory'), { taille: 13, couleur: DISCRET }), 0.006);
  corps += `<line x1="${DX + 20}" y1="${Y0 + 206}" x2="${DX + DL - 20}" y2="${Y0 + 206}" stroke="${BORD}"/>`;
  corps += petit(DX + 20, Y0 + 232, t('DÉRIVÉ, PUIS EFFACÉ', 'DERIVED, THEN WIPED'));
  corps += ligne(DX + 20, Y0 + 260, 'MK', t('donne la clé d’auth et MEK', 'gives the auth key and MEK'), GENERE + 0.02);
  corps += ligne(DX + 20, Y0 + 284, 'RK', t('donne la clé d’auth de récupération', 'gives the recovery auth key'), GENERE + 0.024);

  corps += petit(SX + 20, Y0 + 30, t('REÇU', 'RECEIVED'));
  const recu = [
    [t('compte', 'account'), t('identifiant, user_id, sel', 'username, user_id, salt')],
    ['AuthKey', t('clé d’auth, hachée en Argon2id', 'auth key, hashed with Argon2id')],
    ['RAK', t('clé d’auth de récupération, hachée', 'recovery auth key, hashed')],
    [t('blocs', 'blocks'), t('UK par MEK, UK par le kit', 'UK by MEK, UK by the kit')],
    [t('blocs', 'blocks'), t('AK par UK, AK scellée', 'AK by UK, AK sealed')],
  ];
  recu.forEach(([tag, s], i) => { corps += ligne(SX + 20, Y0 + 58 + i * 28, tag, s, ENVOI[1] + i * 0.004); });
  corps += `<line x1="${SX + 20}" y1="${Y0 + 206}" x2="${SX + SL - 20}" y2="${Y0 + 206}" stroke="${BORD}"/>`;
  // Two states: the account, and whether sign-ups are open.
  const etat = (y, mot, etats) => {
    let s = texte(SX + 20, y, mot, { taille: 13, couleur: TITRE, poids: 600 });
    for (const [de, a, v, c] of etats) {
      const l = O.largeur(v, 12.5, { poids: 500 }) + 22;
      s += entre(C, de, a, `<rect x="${SX + SL - 20 - l}" y="${y - 17}" width="${l}" height="24" rx="8" fill="${c}" fill-opacity="0.12" stroke="${c}" stroke-opacity="0.5"/>` +
        texte(SX + SL - 20 - l / 2, y, v, { taille: 12.5, couleur: c, poids: 500, ancre: 'middle' }), 0.006);
    }
    return s;
  };
  corps += etat(Y0 + 244, t('Compte', 'Account'), [[ENVOI[1], ACTIF, t('en attente', 'pending'), '#9AA7B6'], [ACTIF, FIN, t('actif', 'active'), VERT]]);
  corps += etat(Y0 + 280, t('Inscriptions', 'Sign-ups'), [[0, ACTIF + 0.01, t('ouvertes', 'open'), '#9AA7B6'], [ACTIF + 0.01, FIN, t('fermées', 'closed'), ACCENT_TEXTE], [FIN, 1.2, t('ouvertes', 'open'), '#9AA7B6']]);

  // The exchanges, in the gap between the two cards.
  const GX1 = DX + DL + 4, GX2 = SX - 4;
  const echange = (y, vers, mot, [de, a]) => {
    const d = vers ? `M${GX1} ${y} H${GX2}` : `M${GX2} ${y} H${GX1}`;
    return texte((GX1 + GX2) / 2, y - 9, mot, { taille: 12, couleur: DISCRET, police: MONO, ancre: 'middle' }) +
      fil(C, d, a, FIN) + pointe(vers ? GX2 + 1 : GX1 - 1, y, vers ? 0 : 180) + bille(C, d, de, a);
  };
  corps += echange(Y0 + 110, true, t('clés', 'keys'), ENVOI);
  corps += echange(Y0 + 170, false, 'TOTP', SECRET);
  corps += echange(Y0 + 230, true, 'code', CONFIRME);

  // ------------------------------------------------------ the three steps
  const EY = 430, EL = 266;
  const etapes = [
    [t('Compte', 'Account'), t('POST /api/auth/signup. Le serveur hache les deux clés d’auth, crée le compte en attente et renvoie le secret TOTP, une seule fois.',
      'POST /api/auth/signup. The server hashes both auth keys, creates the account as pending and sends the TOTP secret back, once.'), [GENERE, KIT - 0.1]],
    [t('Vérification', 'Verification'), t('Ton premier code passe par POST /api/auth/signup/confirm et active le compte. Les inscriptions se ferment : un seul compte en V1.',
      'Your first code goes through POST /api/auth/signup/confirm and activates the account. Sign-ups close: one account only in V1.'), [KIT - 0.1, KIT + 0.02]],
    [t('Récupération', 'Recovery'), t('Le kit s’affiche une seule fois. Tu peux le télécharger ; tu confirmes l’avoir noté, puis il est effacé de la mémoire.',
      'The kit shows up only once. You can download it; you confirm you wrote it down, then it is wiped from memory.'), [KIT + 0.02, OUV]],
  ];
  etapes.forEach(([titre, phrase, allume], i) => { corps += etape(DX + i * 287, EY, EL, 150, `0${i + 1}`, titre, phrase, { allume, cycle: C }); });

  // ------------------------------------------------------------ captions
  corps += legendes(DX, 622, C, [
    [0, GENERE, t('Un identifiant et un mot de passe maître de 12 caractères au moins. Rien ne part encore.', 'A username and a master password of 12 characters at least. Nothing leaves yet.')],
    [GENERE, SECRET[1] + 0.02, t('L’appareil tire ses clés, les chiffre, et n’envoie que deux clés d’auth et quatre blocs.', 'The device draws its keys, encrypts them, and only sends two auth keys and four blocks.')],
    [SECRET[1] + 0.02, KIT, t('Le secret TOTP arrive une fois. Ton premier code active le compte.', 'The TOTP secret arrives once. Your first code activates the account.')],
    [KIT, OUV, t('Le kit est ta seule issue si tu oublies ton mot de passe. Le serveur n’en garde aucune copie lisible.', 'The kit is your only way back if you forget your password. The server keeps no readable copy.')],
    [OUV, FIN, t('Ton coffre est prêt, vide. Ce que tu ajoutes arrive d’abord dans ta zone personnelle.', 'Your vault is ready, and empty. What you add lands in your personal zone first.')],
  ], { max: 820 });

  // What never reaches the server.
  corps += carte(DX, 662, 840, 62);
  corps += icone('EyeSlash', DX + 20, 682, 22, ACCENT_TEXTE);
  corps += `<text x="${DX + 56}" y="698" font-family="${O.SANS}" font-size="13.5" fill="${TEXTE}"><tspan font-weight="600" font-size="14" fill="${TITRE}">${O.esc(t('Jamais envoyés :', 'Never sent:'))}</tspan> ${O.esc(t('ton mot de passe maître, MK, MEK, UK, ni ton kit.', 'your master password, MK, MEK, UK, nor your kit.'))}</text>`;

  svg('inscription.svg', 1280, 760, corps, t(
    'La création du compte en trois étapes. À gauche, le téléphone rejoue les vrais écrans. Étape Compte, « Bienvenue. Crée ton coffre. Ton mot de passe maître ne quitte jamais cet appareil. » : l’identifiant tristan, le mot de passe maître, dont l’indice passe de « 12 caractères au moins » à « Solide. », sa confirmation, puis « Continuer ». Étape Vérification, « La double vérification » : la clé à saisir dans l’appli d’authentification, le bouton pour l’ouvrir, le code à 6 chiffres tapé case par case, puis « Vérifier », avec la note « Le code sera redemandé sur un nouvel appareil, puis tous les 60 jours. ». Étape Récupération, « Ton kit de récupération » : neuf groupes de quatre caractères, créé le 27 septembre 2026 et affiché une seule fois, les boutons Télécharger et Copier, trois rappels (il ne sera plus jamais affiché, le serveur n’en garde aucune copie lisible, avec ton code à deux facteurs il rouvre ton coffre), la case « Je l’ai noté dans un endroit sûr. » cochée, puis « Ouvrir mon coffre », l’ouverture et le coffre vide. À droite, deux cartes. Ton appareil tire au hasard user_id, un UUID v4, un sel de 16 octets, UK et AK de 32 octets chacune, et RK, ton kit de 20 octets, noté puis effacé de la mémoire ; il dérive MK, qui donne la clé d’auth et MEK, et tire du kit la clé d’auth de récupération, avant de les effacer. Le serveur reçoit l’identifiant, user_id et le sel, la clé d’auth et la clé d’auth de récupération, toutes deux hachées en Argon2id, et quatre blocs : UK chiffrée par MEK, UK chiffrée par le kit, AK chiffrée par UK, AK scellée. Entre les deux passent les clés, puis le secret TOTP en retour, puis le code. Deux états changent : le compte passe d’en attente à actif, les inscriptions d’ouvertes à fermées. Dessous, trois étapes : POST /api/auth/signup, où le serveur hache les deux clés d’auth, crée le compte en attente et renvoie le secret TOTP une seule fois ; POST /api/auth/signup/confirm, où le premier code active le compte et ferme les inscriptions, un seul compte en V1 ; le kit affiché une seule fois, téléchargeable, puis effacé de la mémoire une fois noté. En bas : jamais envoyés, ton mot de passe maître, MK, MEK, UK, ni ton kit.',
    'Creating the account in three steps. On the left, the phone replays the real screens. Account step, “Welcome. Create your vault. Your master password never leaves this device.”: the username tristan, the master password, whose hint goes from “12 characters at least” to “Strong.”, its confirmation, then “Continue”. Verification step, “Two-step verification”: the key to enter in the authenticator app, the button that opens it, the 6-digit code typed box by box, then “Verify”, with the note “The code is asked again on a new device, then every 60 days.”. Recovery step, “Your recovery kit”: nine groups of four characters, created on September 27, 2026 and shown only once, the Download and Copy buttons, three reminders (it will never be shown again, the server keeps no readable copy, with your two-factor code it opens your vault again), the box “I wrote it down somewhere safe.” ticked, then “Open my vault”, the opening and the empty vault. On the right, two cards. Your device draws at random user_id, a UUID v4, a 16-byte salt, UK and AK of 32 bytes each, and RK, your 20-byte kit, written down then wiped from memory; it derives MK, which gives the auth key and MEK, and gets the recovery auth key from the kit, before wiping them. The server receives the username, user_id and salt, the auth key and the recovery auth key, both hashed with Argon2id, and four blocks: UK encrypted with MEK, UK encrypted with the kit, AK encrypted with UK, AK sealed. Between the two go the keys, then the TOTP secret back, then the code. Two states change: the account goes from pending to active, sign-ups from open to closed. Below, three steps: POST /api/auth/signup, where the server hashes both auth keys, creates the account as pending and sends the TOTP secret back once; POST /api/auth/signup/confirm, where the first code activates the account and closes sign-ups, one account only in V1; the kit shown once, downloadable, then wiped from memory once written down. At the bottom: never sent, your master password, MK, MEK, UK, nor your kit.'));
};

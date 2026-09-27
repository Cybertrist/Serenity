// The key hierarchy, built while the vault opens.
//
// On the left, the phone unlocks (13-deverrouillage): the master password
// is typed, "Unlock", the opening, the vault; fifteen minutes later it
// locks again. On the right, the chain of docs/crypto.md §3 and §4 builds
// itself on the device side, next to what the server stores (§6): the
// salt, Argon2id with its real parameters, MK, the two subkeys, UK opened
// by MEK, AK opened by UK, the kit that also wraps UK, and AK stored twice.
// Keys that only live a few milliseconds are wiped as soon as they served.
module.exports = (O) => {
  const E = require('./_ecrans.js')(O);
  const A = require('./_ecrans-crypto.js')(O);
  const { t, svg, texte, paragraphe, entete, rubrique, entre, visible, fondu, toucher, frappe, carte, legendes, icone,
    telephone, fil, bille, pointe, APP, CARTE, BORD, TITRE, TEXTE, DISCRET, ACCENT, ACCENT_TEXTE, VERT, MONO } = O;
  const C = 32;
  // The phone.
  const TAPE = 0.04, PRET = 0.125, TAP = 0.15, OUV = 0.16, LEVE = 0.33, OUVERT = 0.36, VERROU = 0.8, FIN = 0.97;
  // The chain, step by step.
  const MDP = 0.05, SEL = 0.13, ARGON = 0.16, MK = 0.22, SOUS = 0.25, AUTH = 0.27, UK = 0.3, AK = 0.33, ZONES = 0.36,
    EFFACE = 0.46, KIT = 0.57, SCELLE = 0.67;

  let corps = entete(t('LES CLÉS', 'THE KEYS'),
    t('Un mot de passe dans ta tête, deux clés tirées au hasard, et rien de lisible sur le serveur.',
      'A password in your head, two random keys, and nothing readable on the server.'));

  // ------------------------------------------------------------ the phone
  const T = telephone(48, 92, 640);
  corps += T.cadre;
  const P = A.P.verrou;
  let ecran = '';
  ecran += entre(C, 0, PRET, A.verrou(), 0.004);
  ecran += entre(C, PRET, OUV + 0.012, A.verrou({ pret: true }) + toucher(195, P.bouton + 20, C, TAP), 0.004);
  ecran += entre(C, TAPE, OUV + 0.012, frappe(P.mdp[0], P.mdp[1], '••••••••••••••••••', C, TAPE, PRET - 0.005, { taille: 16, couleur: APP.text }), 0.004);
  ecran += entre(C, LEVE, VERROU, E.coffre({ netflix: 'agent' }), 0.006);
  ecran += entre(C, VERROU, 1.2, A.verrou(), 0.006);
  ecran += A.ouverture(C, OUV, LEVE, OUVERT);
  corps += T.ecran(ecran);

  // ------------------------------------------------ one key, as a node
  // A card that shows up at [de] and lights while it is being made, then
  // turns dashed ("wiped") at [efface], and leaves at FIN.
  const X1 = 400, X2 = 665, NL = 225, NH = 58;
  const RY = [116, 206, 296, 386, 476, 566];
  function noeud(x, y, l, cle, nom, sous, de, efface = FIN) {
    const contenu = (eteint) => {
      const c1 = eteint ? DISCRET : ACCENT_TEXTE, c2 = eteint ? DISCRET : TITRE;
      let s = cle ? texte(x + 20, y + 25, cle, { taille: 13.5, couleur: c1, police: MONO, poids: 600 }) : '';
      const nx = cle ? x + 20 + O.largeur(cle, 13.5, { police: MONO }) + 9 : x + 20;
      s += texte(nx, y + 25, nom, { taille: 14, couleur: c2, poids: 600 });
      s += texte(x + 20, y + 45, sous, { taille: 12.5, couleur: eteint ? DISCRET : TEXTE });
      return s;
    };
    let s = entre(C, de, efface, carte(x, y, l, NH, { allume: [de, de + 0.05], cycle: C }) + contenu(false), 0.008);
    if (efface < FIN) {
      s += entre(C, efface, FIN, `<rect x="${x}" y="${y}" width="${l}" height="${NH}" rx="14" fill="${CARTE}" stroke="${DISCRET}" stroke-dasharray="5 5"/>` +
        contenu(true) + texte(x + l - 20, y + 25, t('effacée', 'wiped'), { taille: 12, couleur: DISCRET, ancre: 'end' }), 0.008);
    }
    return s;
  }

  corps += rubrique(X1, 94, t('SUR TON APPAREIL', 'ON YOUR DEVICE'));
  corps += noeud(X1, RY[0], NL, null, t('Mot de passe maître', 'Master password'), t('dans ta tête, jamais envoyé', 'in your head, never sent'), MDP);
  corps += noeud(X2, RY[0], NL, null, 'Argon2id v1.3', t('64 Mio, 3 passes, parallélisme 1', '64 MiB, 3 passes, parallelism 1'), ARGON);
  // Argon2id works: a thin bar fills along the bottom of its card.
  corps += `<rect x="${X2 + 20}" y="${RY[0] + NH - 7}" width="0" height="3" rx="1.5" fill="${ACCENT}" opacity="0">
    ${fondu('width', C, [[0, 0], [ARGON, 0], [MK - 0.005, NL - 40], [1, NL - 40]])}${visible(C, ARGON, MK + 0.02)}</rect>`;
  corps += noeud(X1, RY[1], NL * 2 + 40, 'MK', t('clé maître, 32 o', 'master key, 32 B'), t('jamais stockée, jamais envoyée : quelques millisecondes en mémoire', 'never stored, never sent: a few milliseconds in memory'), MK, EFFACE);
  corps += noeud(X1, RY[2], NL, 'MEK', t('clé d’enveloppe', 'wrapping key'), t('KDF srn-wrap, reste ici', 'KDF srn-wrap, stays here'), SOUS, EFFACE);
  corps += noeud(X2, RY[2], NL, 'AuthKey', t('clé d’auth', 'auth key'), t('KDF srn-auth, seule envoyée', 'KDF srn-auth, the only one sent'), SOUS, EFFACE);
  corps += noeud(X1, RY[3], NL, 'UK', t('clé utilisateur', 'user key'), t('32 o au hasard, ouverte par MEK', '32 random B, opened by MEK'), UK, VERROU + 0.02);
  corps += noeud(X2, RY[3], NL, 'RK', t('le kit, 20 o', 'the kit, 20 B'), t('BLAKE2b puis KDF : chiffre UK', 'BLAKE2b then KDF: wraps UK'), KIT);
  corps += noeud(X1, RY[4], NL, null, t('Zone personnelle', 'Personal zone'), t('chiffrée par UK', 'encrypted with UK'), ZONES, VERROU + 0.02);
  corps += noeud(X2, RY[4], NL, 'AK', t('clé d’agent', 'agent key'), t('32 o au hasard, ouverte par UK', '32 random B, opened by UK'), AK, VERROU + 0.02);
  corps += noeud(X2, RY[5], NL, null, t('Zone agent', 'Agent zone'), t('chiffrée par AK', 'encrypted with AK'), ZONES + 0.01, VERROU + 0.02);
  // The legend, in the one slot the chain leaves free.
  corps += entre(C, ZONES + 0.02, FIN, carte(X1, RY[5], NL, NH) +
    `<rect x="${X1 + 20}" y="${RY[5] + 19}" width="20" height="20" rx="5" fill="none" stroke="${BORD}" stroke-width="1.5"/>` +
    texte(X1 + 48, RY[5] + 34, t('en mémoire', 'in memory'), { taille: 12.5, couleur: TEXTE }) +
    `<rect x="${X1 + 128}" y="${RY[5] + 19}" width="20" height="20" rx="5" fill="none" stroke="${DISCRET}" stroke-dasharray="4 3" stroke-width="1.5"/>` +
    texte(X1 + 156, RY[5] + 34, t('effacée', 'wiped'), { taille: 12.5, couleur: TEXTE }), 0.008);

  // Wires inside the device, lit when the key they lead to is made.
  const fils = [
    [`M${X1 + NL + 3} ${RY[0] + 29} H${X2 - 4}`, ARGON, 0],
    [`M${X2 + NL / 2} ${RY[0] + NH + 3} V${RY[1] - 4}`, MK, 90],
    [`M${X1 + NL / 2} ${RY[1] + NH + 3} V${RY[2] - 4}`, SOUS, 90],
    [`M${X2 + NL / 2} ${RY[1] + NH + 3} V${RY[2] - 4}`, SOUS, 90],
    [`M${X1 + NL / 2} ${RY[2] + NH + 3} V${RY[3] - 4}`, UK, 90],
    [`M${X2 - 3} ${RY[3] + 29} H${X1 + NL + 4}`, KIT + 0.02, 180],
    [`M${X1 + NL / 2} ${RY[3] + NH + 3} V${RY[4] - 4}`, ZONES, 90],
    [`M${X1 + NL + 3} ${RY[3] + 44} H${X1 + NL + 20} V${RY[4] + 29} H${X2 - 4}`, AK, 0],
    [`M${X2 + NL / 2} ${RY[4] + NH + 3} V${RY[5] - 4}`, ZONES + 0.01, 90],
  ];
  for (const [d, de, angle] of fils) {
    const fin = d.match(/[HV](\d+(\.\d+)?)$/);
    corps += bille(C, d, de - 0.02, de);
    // The arrow head sits at the end of the path.
    const pts = [...d.matchAll(/([MHV])\s?([\d.]+)(?:\s([\d.]+))?/g)];
    let x = 0, y = 0;
    for (const p of pts) { if (p[1] === 'M') { x = +p[2]; y = +p[3]; } else if (p[1] === 'H') x = +p[2]; else y = +p[2]; }
    corps += entre(C, de - 0.022, FIN, fil(C, d, de, FIN) + pointe(x + (angle === 0 ? 1 : angle === 180 ? -1 : 0), y + (angle === 90 ? 1 : 0), angle), 0.006);
  }

  // ------------------------------------------------------- the server
  const SX = 918, SL = 322;
  corps += rubrique(SX, 94, t('SUR LE SERVEUR', 'ON THE SERVER'));
  corps += carte(SX, RY[0] - 8, SL, RY[5] + 90 - RY[0]);
  const lignesServeur = [
    [t('Sel 16 o et paramètres', 'Salt 16 B and parameters'), [t('publics, renvoyés à la connexion', 'public, sent back at sign-in')], [SEL, ARGON + 0.02]],
    [t('Blocs des entrées', 'Entry blocks'), [t('zone personnelle : illisibles pour lui', 'personal zone: unreadable to it'), t('zone agent : lus par le processus agent', 'agent zone: read by the agent process')], [ZONES, ZONES + 0.06]],
    [t('Hachage de la clé d’auth', 'Hash of the auth key'), [t('Argon2id, 64 Mio, 3 passes', 'Argon2id, 64 MiB, 3 passes'), t('il ne remonte pas jusqu’à MK', 'it cannot climb back to MK')], [AUTH + 0.02, UK + 0.03]],
    [t('UK chiffrée, deux fois', 'UK encrypted, twice'), [t('par MEK, et par la clé du kit', 'with MEK, and with the kit’s key'), t('blocs 0x01, illisibles pour lui', '0x01 blocks, unreadable to it')], [UK - 0.01, UK + 0.04, KIT, KIT + 0.07]],
    [t('AK chiffrée par UK', 'AK encrypted with UK'), [t('bloc 0x01, pour tes appareils', '0x01 block, for your devices')], [AK - 0.01, AK + 0.04]],
    [t('AK scellée pour la clé serveur', 'AK sealed for the server key'), [t('bloc 0x02, pour le processus agent', '0x02 block, for the agent process'), t('clé : fichier root:root 0400, hors base', 'key: root:root 0400 file, off the database')], [SCELLE, SCELLE + 0.1]],
  ];
  lignesServeur.forEach(([titre, sous, allume], i) => {
    const y = RY[i];
    if (i) corps += `<line x1="${SX + 20}" y1="${y - 14}" x2="${SX + SL - 20}" y2="${y - 14}" stroke="${BORD}"/>`;
    for (let k = 0; k < allume.length; k += 2) {
      corps += `<rect x="${SX + 8}" y="${y - 5}" width="${SL - 16}" height="73" rx="10" fill="${ACCENT}" fill-opacity="0.08" stroke="${ACCENT}" stroke-opacity="0.6" opacity="0">${visible(C, allume[k], allume[k + 1])}</rect>`;
    }
    corps += texte(SX + 20, y + 19, titre, { taille: 14, couleur: TITRE, poids: 600 });
    sous.forEach((l, k) => { corps += texte(SX + 20, y + 40 + k * 18, l, { taille: 12.5, couleur: TEXTE }); });
  });
  // Wires between the device and the server.
  const echanges = [
    [`M${SX - 3} ${RY[0] + 29} H${X2 + NL + 4}`, SEL + 0.005, ARGON, 180, X2 + NL + 3, RY[0] + 29],
    [`M${X2 + NL + 3} ${RY[2] + 29} H${SX - 4}`, AUTH, AUTH + 0.02, 0, SX - 3, RY[2] + 29],
    [`M${SX - 3} ${RY[4] + 22} H${X2 + NL + 4}`, AK - 0.02, AK, 180, X2 + NL + 3, RY[4] + 22],
    [`M${X2 + NL + 3} ${RY[4] + 40} H${X2 + NL + 14} V${RY[5] + 22} H${SX - 4}`, SCELLE, SCELLE + 0.025, 0, SX - 3, RY[5] + 22],
  ];
  for (const [d, de, a, angle, px, py] of echanges) corps += entre(C, de - 0.004, FIN, fil(C, d, a, FIN) + pointe(px, py, angle), 0.004) + bille(C, d, de, a);
  // The auth key checked: a tick next to the hash.
  corps += entre(C, AUTH + 0.025, UK + 0.03, icone('CheckCircle', SX + SL - 40, RY[2] - 2, 20, VERT, 'fill'), 0.006);

  // ------------------------------------------------- what is happening
  corps += legendes(X1, 668, C, [
    [0, SEL, t('Tu tapes ton mot de passe maître. Il ne quitte jamais l’appareil.', 'You type your master password. It never leaves the device.')],
    [SEL, SOUS, t('Le serveur renvoie le sel. Argon2id en tire MK : 64 Mio, 3 passes, 0,6 à 1,3 s sur un téléphone.', 'The server sends the salt back. Argon2id turns it into MK: 64 MiB, 3 passes, 0.6 to 1.3 s on a phone.')],
    [SOUS, UK, t('MK donne deux sous-clés. Seule la clé d’auth part, et le serveur la compare à son hachage.', 'MK gives two subkeys. Only the auth key leaves, and the server checks it against its hash.')],
    [UK, EFFACE, t('MEK ouvre UK, UK ouvre AK. Tout le coffre se déchiffre ici, sur ton appareil.', 'MEK opens UK, UK opens AK. The whole vault decrypts here, on your device.')],
    [EFFACE, KIT, t('MK, MEK et la clé d’auth sont effacées aussitôt. UK et AK restent, en mémoire seulement.', 'MK, MEK and the auth key are wiped at once. UK and AK stay, in memory only.')],
    [KIT, SCELLE, t('Le kit est une deuxième porte vers UK : 20 octets tirés au hasard, affichés une seule fois.', 'The kit is a second door to UK: 20 random bytes, shown only once.')],
    [SCELLE, VERROU, t('AK est rangée deux fois : chiffrée par UK pour tes appareils, scellée pour l’agent.', 'AK is stored twice: encrypted with UK for your devices, sealed for the agent.')],
    [VERROU, FIN, t('15 min sans activité : le coffre se verrouille, UK et AK sont effacées à leur tour.', '15 min without activity: the vault locks, and UK and AK are wiped too.')],
  ], { max: 820 });

  // -------------------------------------------- what the server never sees
  corps += carte(X1, 700, 840, 62);
  corps += icone('EyeSlash', X1 + 20, 720, 22, ACCENT_TEXTE);
  corps += `<text x="${X1 + 56}" y="736" font-family="${O.SANS}" font-size="13.5" fill="${TEXTE}"><tspan font-weight="600" font-size="14" fill="${TITRE}">${O.esc(t('Le serveur ne voit jamais :', 'The server never sees:'))}</tspan> ${O.esc(t('ton mot de passe maître, MK, MEK, UK, ton kit, ni une entrée personnelle en clair.', 'your master password, MK, MEK, UK, your kit, nor a personal entry in the clear.'))}</text>`;

  svg('cles.svg', 1280, 790, corps, t(
    'La hiérarchie des clés, construite pendant que le coffre s’ouvre. À gauche, le téléphone rejoue l’écran de déverrouillage : « Bon retour, Tristan. », le mot de passe maître tapé, le bouton « Déverrouiller », puis l’ouverture, où un voile bleu nuit monte et un faisceau de lumière traverse l’écran, et le coffre apparaît ; quinze minutes plus tard, il se verrouille de nouveau. À droite, deux colonnes. Sur ton appareil : le mot de passe maître, dans ta tête et jamais envoyé ; Argon2id v1.3 avec 64 Mio, 3 passes et un parallélisme de 1 ; MK, la clé maître de 32 octets, jamais stockée ni envoyée ; deux sous-clés, MEK par KDF srn-wrap, qui reste sur l’appareil, et la clé d’auth par KDF srn-auth, la seule envoyée ; UK, 32 octets au hasard ouverts par MEK ; RK, le kit de 20 octets, qui chiffre aussi UK par BLAKE2b puis KDF ; AK, 32 octets au hasard ouverts par UK ; la zone personnelle chiffrée par UK et la zone agent chiffrée par AK. Une légende distingue les clés en mémoire des clés effacées. Sur le serveur : le sel de 16 octets et les paramètres, publics ; les blocs des entrées, illisibles pour lui dans la zone personnelle ; le hachage Argon2id de la clé d’auth, qui ne remonte pas jusqu’à MK ; UK chiffrée deux fois, par MEK et par la clé du kit ; AK chiffrée par UK pour tes appareils ; AK scellée pour la clé serveur, pour le processus agent, la clé serveur étant un fichier root:root 0400 hors de la base. Les légendes racontent l’ordre : le sel revient du serveur, Argon2id tire MK en 0,6 à 1,3 s sur un téléphone, seule la clé d’auth part et le serveur la compare à son hachage, MEK ouvre UK et UK ouvre AK, puis MK, MEK et la clé d’auth sont effacées et seules UK et AK restent en mémoire, jusqu’au verrouillage après 15 minutes. En bas : le serveur ne voit jamais ton mot de passe maître, MK, MEK, UK, ton kit, ni une entrée personnelle en clair.',
    'The key hierarchy, built while the vault opens. On the left, the phone replays the unlock screen: “Welcome back, Tristan.”, the master password typed, the “Unlock” button, then the opening, where a night blue veil rises and a beam of light crosses the screen, and the vault appears; fifteen minutes later it locks again. On the right, two columns. On your device: the master password, in your head and never sent; Argon2id v1.3 with 64 MiB, 3 passes and a parallelism of 1; MK, the 32-byte master key, never stored nor sent; two subkeys, MEK through KDF srn-wrap, which stays on the device, and the auth key through KDF srn-auth, the only one sent; UK, 32 random bytes opened by MEK; RK, the 20-byte kit, which also wraps UK through BLAKE2b then KDF; AK, 32 random bytes opened by UK; the personal zone encrypted with UK and the agent zone encrypted with AK. A legend tells keys in memory from wiped keys. On the server: the 16-byte salt and the parameters, public; the entry blocks, unreadable to it in the personal zone; the Argon2id hash of the auth key, which cannot climb back to MK; UK encrypted twice, with MEK and with the kit’s key; AK encrypted with UK for your devices; AK sealed for the server key, for the agent process, the server key being a root:root 0400 file off the database. The captions tell the order: the salt comes back from the server, Argon2id turns it into MK in 0.6 to 1.3 s on a phone, only the auth key leaves and the server checks it against its hash, MEK opens UK and UK opens AK, then MK, MEK and the auth key are wiped and only UK and AK stay in memory, until the vault locks after 15 minutes. At the bottom: the server never sees your master password, MK, MEK, UK, your kit, nor a personal entry in the clear.'));
};

// One encrypted block, up close, and why a malicious server cannot play
// with it.
//
// On the left, the phone opens Netflix (the block decrypts), then shows
// what each attack leaves on screen: the vault's "unreadable entries" note
// when blocks are swapped or moved (VaultScreen.tsx), the vault unchanged
// when an old revision is served again (vault/state.ts keeps the highest
// revision seen). On the right: the bytes of the block (docs/crypto.md
// §5.2, the Netflix case of shared/test-vectors/item.json), the associated
// data the device rebuilds (§5.4, the context of aead.json), three attacks
// (§8.5), and the shared test vectors (§10).
module.exports = (O) => {
  const E = require('./_ecrans.js')(O);
  const A = require('./_ecrans-crypto.js')(O);
  const { t, svg, texte, paragraphe, entete, rubrique, entre, toucher, carte, etape, icone, telephone,
    CARTE, BORD, TITRE, TEXTE, DISCRET, ACCENT, ACCENT_TEXTE, VERT, AMBRE, ROUGE, MONO } = O;
  const C = 32;
  const TAPE_N = 0.1, FICHE = 0.12, TAPE_X = 0.28, RETOUR = 0.3, FIN = 0.97;
  const ATT1 = 0.36, ATT2 = 0.555, ATT2B = 0.645, ATT3 = 0.755;
  const LIGNES = 0.08, OK = 0.14;

  let corps = entete(t('UN BLOC CHIFFRÉ', 'AN ENCRYPTED BLOCK'),
    t('Chaque bloc est lié à son entrée, sa zone et sa révision. Déplacé, il ne s’ouvre plus.',
      'Each block is bound to its entry, its zone and its revision. Moved, it no longer opens.'));

  // ------------------------------------------------------------ the phone
  const T = telephone(48, 92, 640);
  corps += T.cadre;
  let ecran = '';
  ecran += entre(C, 0, FICHE, E.coffre({ netflix: 'toi' }) + toucher(195, 379, C, TAPE_N), 0.006);
  ecran += entre(C, FICHE, RETOUR, E.fiche({ zone: 'toi' }) + toucher(360, 31, C, TAPE_X), 0.006);
  ecran += entre(C, RETOUR, ATT1, E.coffre({ netflix: 'toi' }), 0.006);
  ecran += entre(C, ATT1, ATT2, A.coffreIllisible(['netflix', 'spotify']), 0.006);
  ecran += entre(C, ATT2, ATT3, E.coffre({ netflix: 'toi' }), 0.006);
  ecran += entre(C, ATT3, FIN, A.coffreIllisible(['netflix']), 0.006);
  ecran += entre(C, FIN, 1.2, E.coffre({ netflix: 'toi' }), 0.006);
  corps += T.ecran(ecran);

  // --------------------------------------------- the bytes of the block
  const X = 400, L = 840;
  corps += rubrique(X, 94, t('LE BLOC DE NETFLIX, OCTET PAR OCTET', 'THE NETFLIX BLOCK, BYTE BY BYTE'));
  corps += texte(X + L, 94, t('298 octets, vecteur item.json', '298 bytes, item.json vector'), { taille: 12, couleur: DISCRET, ancre: 'end' });
  const segments = [
    [76, '0', '01', t('version', 'version'), '1 o'],
    [86, '1', '01', t('type', 'type'), '1 o, 0x01'],
    [190, '2', '5051 5253 5455 5657…', 'nonce', t('24 o tirés au hasard', '24 random bytes')],
    [330, '26', 'dcc5 ae27 85f2 d04e 89de e346 …', t('texte chiffré', 'ciphertext'), t('256 o : l’entrée JSON, bourrée', '256 B: the JSON entry, padded')],
    [150, '282', '… 0a69 c950 5d86', 'MAC Poly1305', '16 o'],
  ].map((s) => { if (!O.EN) return s; s[4] = s[4].replace(' o', ' B'); return s; });
  let sx = X;
  segments.forEach(([l, dec, hex, nom, detail], i) => {
    const de = 0.02 + i * 0.012;
    corps += entre(C, de, FIN,
      `<rect x="${sx}" y="108" width="${l}" height="64" rx="10" fill="${CARTE}" stroke="${i === 3 ? ACCENT : BORD}" stroke-opacity="${i === 3 ? 0.55 : 1}"/>` +
      texte(sx + 14, 128, dec, { taille: 12, couleur: DISCRET, police: MONO }) +
      texte(sx + 14, 154, hex, { taille: 13, couleur: i === 3 ? ACCENT_TEXTE : TITRE, police: MONO }) +
      texte(sx + 2, 196, nom, { taille: 13.5, couleur: TITRE, poids: 600 }) +
      texte(sx + 2, 215, detail, { taille: 12.5, couleur: TEXTE }), 0.008);
    sx += l + 2;
  });

  // ------------------------------------------ the associated data, twice
  // What the device expects, and what the block was sealed with. Chips
  // change with each attack; the one that differs turns red.
  const AY = 262;
  corps += rubrique(X, AY - 10, t('LES DONNÉES ASSOCIÉES, RECONSTRUITES PAR L’APPAREIL', 'THE ASSOCIATED DATA, REBUILT BY THE DEVICE'));
  corps += carte(X, AY, L, 150);
  const colonnes = [
    [t('préfixe', 'prefix'), 'serenity/v1/item', 146],
    [t('utilisateur', 'user'), '7b2c1a4e…', 92],
    [t('entrée', 'entry'), '0f0c7a9e…', 108],
    ['zone', 'personal', 84],
    [t('révision', 'revision'), '3', 44],
  ];
  const CX0 = X + 122;
  const cx = [];
  let xx = CX0;
  colonnes.forEach(([tete, , l]) => {
    cx.push([xx, l]);
    corps += texte(xx + l / 2, AY + 30, tete, { taille: 12, couleur: DISCRET, ancre: 'middle' });
    xx += l + 14;
  });
  const RANGS = [[AY + 44, t('Attendu', 'Expected')], [AY + 86, t('Dans le bloc', 'In the block')]];
  RANGS.forEach(([y, mot]) => {
    corps += texte(X + 20, y + 20, mot, { taille: 13.5, couleur: TITRE, poids: 600 });
    for (let k = 1; k < colonnes.length; k++) corps += texte(cx[k][0] - 7, y + 20, '/', { taille: 13, couleur: DISCRET, police: MONO, ancre: 'middle' });
  });
  // [instant, instant, {column: [expected, in block]}]: the phases.
  const spotify = t('Spotify', 'Spotify’s');
  const phases = [
    [LIGNES, ATT1, {}],
    [ATT1, ATT2, { 2: ['0f0c7a9e…', '!' + spotify] }],
    [ATT2, ATT2B, { 4: ['3', '!2'] }],
    [ATT2B, ATT3, { 4: ['2', '2'] }],
    [ATT3, FIN, { 3: ['!agent', 'personal'] }],
  ];
  const puce = (x, y, l, s) => {
    const rouge = s.startsWith('!');
    const v = rouge ? s.slice(1) : s;
    const mono = /^[0-9a-z/…]+$/.test(v);
    return `<rect x="${x}" y="${y}" width="${l}" height="30" rx="8" fill="${rouge ? ROUGE : '#94A3C4'}" fill-opacity="${rouge ? 0.12 : 0.06}" stroke="${rouge ? ROUGE : BORD}" stroke-opacity="${rouge ? 0.8 : 1}"/>` +
      texte(x + l / 2, y + 20, v, { taille: 13, couleur: rouge ? ROUGE : TITRE, police: mono ? MONO : O.SANS, ancre: 'middle' });
  };
  colonnes.forEach(([, valeur], k) => {
    RANGS.forEach(([y], r) => {
      // Merge consecutive phases that draw the same chip.
      const etats = [];
      for (const [de, a, diff] of phases) {
        const s = diff[k] ? diff[k][r] : valeur;
        const der = etats[etats.length - 1];
        if (der && der[2] === s && der[1] === de) der[1] = a; else etats.push([de, a, s]);
      }
      for (const [de, a, s] of etats) corps += entre(C, de, a, puce(cx[k][0], y, cx[k][1], s), 0.006);
    });
  });
  corps += texte(X + 20, AY + 138, t('Données associées = 01 01, puis ce contexte. Il n’est pas stocké dans le bloc.', 'Associated data = 01 01, then this context. It is not stored in the block.'), { taille: 12.5, couleur: TEXTE });

  // The verdict of XChaCha20-Poly1305, on the right of the card.
  const VX = X + 700;
  corps += `<line x1="${VX - 16}" y1="${AY + 20}" x2="${VX - 16}" y2="${AY + 130}" stroke="${BORD}"/>`;
  corps += texte(VX, AY + 36, 'XChaCha20-Poly1305', { taille: 12, couleur: DISCRET, police: MONO });
  // The device picks the key from the zone it is told: AK once Netflix is filed under agent.
  corps += entre(C, 0, ATT3, texte(VX, AY + 54, t('clé UK', 'key UK'), { taille: 12, couleur: DISCRET }), 0.006);
  corps += entre(C, ATT3, FIN, texte(VX, AY + 54, t('clé AK', 'key AK'), { taille: 12, couleur: DISCRET }), 0.006);
  corps += entre(C, FIN, 1.2, texte(VX, AY + 54, t('clé UK', 'key UK'), { taille: 12, couleur: DISCRET }), 0.006);
  const verdict = (ic, c, mot, sous) => icone(ic, VX, AY + 70, 20, c, 'fill') + texte(VX + 28, AY + 86, mot, { taille: 15, couleur: TITRE, poids: 600 }) +
    O.lignes(sous, 12.5, 120).map((l, i) => texte(VX, AY + 108 + i * 17, l, { taille: 12.5, couleur: TEXTE })).join('');
  const refuse = verdict('Prohibit', ROUGE, t('Refusé', 'Rejected'), t('le MAC ne correspond pas', 'the MAC does not match'));
  corps += entre(C, OK, ATT1, verdict('CheckCircle', VERT, t('Déchiffré', 'Decrypted'), t('Netflix s’ouvre', 'Netflix opens')), 0.006);
  corps += entre(C, ATT1 + 0.04, ATT2, refuse, 0.006);
  corps += entre(C, ATT2 + 0.035, ATT2B, refuse, 0.006);
  corps += entre(C, ATT2B + 0.025, ATT3, verdict('Warning', AMBRE, t('Écarté', 'Set aside'), t('la 3 est déjà vue', '3 was already seen')), 0.006);
  corps += entre(C, ATT3 + 0.04, FIN, refuse, 0.006);

  // ------------------------------------------------------- the attacks
  const KY = 466;
  corps += rubrique(X, KY - 10, t('CE QU’UN SERVEUR MALVEILLANT PEUT TENTER', 'WHAT A MALICIOUS SERVER CAN TRY'));
  const attaques = [
    [t('Échanger deux blocs', 'Swap two blocks'), t('Il sert le bloc de Spotify sous l’identifiant de Netflix. L’appareil attend Netflix : le déchiffrement échoue, les deux entrées restent masquées.',
      'It serves Spotify’s block under Netflix’s identifier. The device expects Netflix: decryption fails, and both entries stay hidden.'), [ATT1, ATT2]],
    [t('Rejouer une révision', 'Replay a revision'), t('Il ressert la révision 2. Étiquetée 3, elle échoue. Étiquetée 2, l’appareil a déjà vu la 3 : il garde sa copie et note le retour en arrière.',
      'It serves revision 2 again. Labelled 3, it fails. Labelled 2, the device has already seen 3: it keeps its copy and records the rollback.'), [ATT2, ATT3]],
    [t('Changer de zone', 'Change the zone'), t('Il range Netflix dans la zone agent. L’appareil prend alors AK, et le bloc a été scellé en personal : refusé, l’entrée reste masquée.',
      'It files Netflix under the agent zone. The device then picks AK, and the block was sealed as personal: rejected, the entry stays hidden.'), [ATT3, FIN]],
  ];
  attaques.forEach(([titre, phrase, allume], i) => {
    corps += etape(X + i * 287, KY, 266, 176, String(i + 1), titre, phrase, { allume, cycle: C });
  });

  // ------------------------------------------------ the shared vectors
  const VY = 664;
  corps += carte(X, VY, L, 92);
  corps += icone('ListChecks', X + 20, VY + 20, 22, ACCENT_TEXTE);
  corps += texte(X + 56, VY + 34, t('Des vecteurs de test partagés', 'Shared test vectors'), { taille: 14.5, couleur: TITRE, poids: 600 });
  corps += paragraphe(X + 56, VY + 57, t('shared/test-vectors : Python et TypeScript vérifient les mêmes blocs, dont ceux qui doivent échouer. En CI, l’un chiffre, l’autre déchiffre.',
    'shared/test-vectors: Python and TypeScript check the same blocks, including those that must fail. In CI, one encrypts, the other decrypts.'), { taille: 12.5, couleur: TEXTE, max: L - 80, interligne: 18 });

  svg('bloc.svg', 1280, 772, corps, t(
    'Un bloc chiffré vu de près, et trois attaques d’un serveur malveillant. À gauche, le téléphone ouvre le coffre, touche Netflix et sa fiche se déchiffre ; puis il montre ce que chaque attaque laisse à l’écran : le coffre avec la note « 2 entrées illisibles : elles ne se déchiffrent pas avec tes clés et restent masquées. Si ça dure, préviens l’administrateur du serveur. », où seule Banque reste ; le coffre inchangé quand une vieille révision est ressortie ; puis la même note pour 1 entrée quand Netflix est déplacé de zone. À droite, en haut, les octets du bloc de Netflix, 298 octets tirés du vecteur item.json : la version 01 à l’octet 0, le type 01 pour XChaCha20-Poly1305 à l’octet 1, le nonce de 24 octets tirés au hasard à partir de l’octet 2, le texte chiffré de 256 octets, soit l’entrée JSON bourrée, à partir de l’octet 26, et le MAC Poly1305 de 16 octets à l’octet 282. Au milieu, les données associées reconstruites par l’appareil : 01 01 puis le contexte serenity/v1/item, l’identifiant de l’utilisateur 7b2c1a4e, celui de l’entrée 0f0c7a9e, la zone personal et la révision 3, sur deux rangs, ce qu’attend l’appareil et ce que contient le bloc. Tant qu’ils sont identiques, XChaCha20-Poly1305 avec la clé UK déchiffre et Netflix s’ouvre. Trois attaques suivent, chacune avec la case qui diffère en rouge : échanger deux blocs, le bloc de Spotify servi sous l’identifiant de Netflix, refusé car le MAC ne correspond pas ; rejouer la révision 2, refusée si elle est étiquetée 3, écartée si elle est étiquetée 2 car l’appareil a déjà vu la 3, garde sa copie et note le retour en arrière ; changer de zone, Netflix rangé en zone agent, si bien que l’appareil prend la clé AK alors que le bloc a été scellé en personal, refusé. En bas, les vecteurs de test partagés dans shared/test-vectors : Python et TypeScript vérifient les mêmes blocs, dont ceux qui doivent échouer, et en CI l’un chiffre pendant que l’autre déchiffre.',
    'An encrypted block up close, and three attacks by a malicious server. On the left, the phone opens the vault, taps Netflix and its entry decrypts; then it shows what each attack leaves on screen: the vault with the note “2 unreadable entries: they do not decrypt with your keys and stay hidden. If it goes on, tell the administrator of the server.”, where only Bank is left; the vault unchanged when an old revision is served again; then the same note for 1 entry when Netflix is moved to another zone. On the right, at the top, the bytes of the Netflix block, 298 bytes from the item.json vector: version 01 at byte 0, type 01 for XChaCha20-Poly1305 at byte 1, the 24-byte random nonce from byte 2, the 256-byte ciphertext, the padded JSON entry, from byte 26, and the 16-byte Poly1305 MAC at byte 282. In the middle, the associated data the device rebuilds: 01 01 then the context serenity/v1/item, the user identifier 7b2c1a4e, the entry identifier 0f0c7a9e, the zone personal and revision 3, on two rows, what the device expects and what the block holds. As long as they match, XChaCha20-Poly1305 with the UK key decrypts and Netflix opens. Three attacks follow, each with the differing cell in red: swapping two blocks, Spotify’s block served under Netflix’s identifier, rejected because the MAC does not match; replaying revision 2, rejected when labelled 3, set aside when labelled 2 because the device has already seen 3, keeps its copy and records the rollback; changing the zone, Netflix filed under the agent zone, so the device picks the AK key while the block was sealed as personal, rejected. At the bottom, the shared test vectors in shared/test-vectors: Python and TypeScript check the same blocks, including those that must fail, and in CI one encrypts while the other decrypts.'));
};

// The import: three sources, nothing sent in clear.
//
// On the left, the desktop window plays Settings, Import and export
// (22b-bureau-import) three times: a Google CSV chosen in the file picker,
// then the Google Authenticator transfer link pasted and read, then an
// encrypted Bitwarden export, refused. On the right, what the file holds and
// how it is read (web/src/features/account/settings/TransferSection.tsx and
// web/src/vault/import/): the format told by the content, not the name; the
// CSV columns found through the header; the otpauth-migration:// protobuf
// read by hand into otpauth:// links, with the true bytes of a test link;
// then the personal zone filling up. At the bottom, what leaves the device:
// blocks encrypted on the spot, sent in batches (web/src/vault/operations.ts,
// POST /api/vault/items, 1 to 1,000 entries, always in the personal zone).
module.exports = (O) => {
  const { t, svg, texte, paragraphe, entete, rubrique, entre, visible, frappe, toucher, carte, legendes, icone, monogramme,
    fenetre, aurore, barreTitre, barreLaterale, barreEtat, verre, bouton, boutonPrimaire, toast, fil, pointe, bille, largeur,
    ENTREES, APP, MONO, SANS, CARTE, BORD, TITRE, TEXTE, DISCRET, ACCENT, ACCENT_TEXTE, VERT, ROUGE, FOND } = O;
  const C = 36;
  const FIN = 0.975;

  // The window, step by step.
  const CLIC_G = 0.035, DLG_A = 0.05, LIGNE_A = 0.08, OUVRIR_A = 0.105, PRET = 0.12, IMPORTER_A = 0.215, FAIT_A = 0.235;
  const CLIC_AUTH = 0.31, LIEN = 0.315, COLLE = [0.335, 0.4], LIRE = 0.445, TROUVES = 0.46, IMPORTER_B = 0.555, FAIT_B = 0.575;
  const CLIC_BW = 0.665, DLG_C = 0.675, LIGNE_C = 0.7, OUVRIR_C = 0.725, REFUS = 0.745;

  let corps = entete(t('L’IMPORT', 'THE IMPORT'),
    t('Le fichier est lu et chiffré sur ton appareil. Seuls des blocs partent vers le serveur.',
      'The file is read and encrypted on your device. Only blocks leave for the server.'));

  // ------------------------------------------------------------ the window
  const F = fenetre(48, 88, 700);
  corps += F.cadre;

  // The sidebar counts before and after each import.
  const AVANT = { coffre: 3, codes: 1, fuites: 1, agent: 1, toi: 2, confie: 1 };
  const APRES_A = { ...AVANT, coffre: 6, toi: 5 };
  const APRES_B = { ...AVANT, coffre: 7, codes: 3, toi: 6 };

  const chrome = (comptes) => {
    let s = barreTitre({ point: APP.warn });
    s += barreLaterale('reglages', { comptes });
    // Settings is the open screen: its row is lit, like in 22b.
    s += `<rect x="9" y="701" width="229" height="33" rx="8" fill="${APP.glassHi}" fill-opacity="0.7" stroke="${APP.line}" stroke-opacity="0.16"/>`;
    s += icone('SlidersHorizontal', 19, 710, 18, APP.accentText, 'fill') + texte(46, 724, t('Réglages', 'Settings'), { taille: 14, couleur: APP.text, poids: 500 });
    s += barreEtat([[APP.ok, t('Agent actif', 'Agent on'), null], [null, t('Veille', 'Watch'), t('il y a 2 minutes', '2 minutes ago')], [APP.warn, t('Santé', 'Health'), '67']]);
    return s;
  };

  // The settings menu, Import and export open.
  const NAV = [
    ['r', t('CET APPAREIL', 'THIS DEVICE')], ['LockSimple', t('Verrouillage', 'Lock')], ['Sun', t('Apparence', 'Appearance')],
    ['r', t('COFFRE', 'VAULT')], ['Binoculars', t('Veille', 'Watch')], ['ArrowsLeftRight', t('Import et export', 'Import and export'), true],
    ['Trash', t('Corbeille', 'Trash')], ['TerminalWindow', t('Journal', 'Log')],
    ['r', t('COMPTE', 'ACCOUNT')], ['Key', t('Kit de récupération', 'Recovery kit')], ['Devices', t('Appareils', 'Devices')],
    ['UserCircle', t('Compte', 'Account')], ['Info', t('À propos', 'About')],
  ];
  function menu() {
    let s = '', y = 156;
    for (const [ic, mot, choisi] of NAV) {
      if (ic === 'r') { s += texte(295, y, mot, { taille: 11, couleur: APP.faint, poids: 600, espace: 1 }); y += 27; continue; }
      if (choisi) s += `<rect x="286" y="${y - 22}" width="228" height="33" rx="8" fill="${APP.glassHi}" fill-opacity="0.7" stroke="${APP.line}" stroke-opacity="0.16"/>`;
      s += icone(ic, 295, y - 13, 16, choisi ? APP.accentText : APP.muted) + texte(321, y, mot, { taille: 14, couleur: choisi ? APP.text : APP.muted, poids: choisi ? 500 : 400 });
      y += 35;
      if (ic === 'Sun' || ic === 'TerminalWindow') y += 2;
    }
    return s;
  }

  // One of the three import cards. [actif]: the Authenticator one, open.
  const SOURCES = [
    ['FileCsv', t('Mots de passe Google', 'Google passwords'), t('Fichier .csv exporté de Chrome', 'A .csv file from Chrome')],
    ['QrCode', 'Google Authenticator', t('Le lien du QR code de transfert', 'The transfer QR code link')],
    ['Vault', 'Bitwarden', t('Export .json non chiffré', 'Unencrypted .json export')],
  ];
  const GX = 551, GL = 691, CL3 = 211;
  function carteSource(i, y, actif) {
    const [ic, titre, sous] = SOURCES[i];
    const x = 571 + i * (CL3 + 9);
    return `<rect x="${x}" y="${y}" width="${CL3}" height="103" rx="12" fill="${actif ? APP.accent : APP.glass2}" fill-opacity="${actif ? 0.14 : 0.66}" stroke="${actif ? APP.accent : APP.line}" stroke-opacity="${actif ? 1 : 0.22}"/>
      <rect x="${x + 14}" y="${y + 14}" width="30" height="30" rx="8" fill="${APP.accent}" fill-opacity="0.14"/>${icone(ic, x + 21, y + 21, 16, APP.accentText)}
      ${texte(x + 14, y + 66, titre, { taille: 13.5, couleur: APP.text, poids: 500 })}
      ${texte(x + 14, y + 85, sous, { taille: 12, couleur: APP.faint })}`;
  }
  const centreCarte = (i, y) => [571 + i * (CL3 + 9) + CL3 / 2, y + 52];

  // The page. [erreur]: the red note above the group; [actif]: the open card;
  // [panneau]: what shows under the cards, and its height.
  const GY = (erreur) => (erreur ? 262 : 210);
  function page({ erreur = false, actif = -1, panneau = null } = {}) {
    let s = texte(286, 92, t('Réglages', 'Settings'), { taille: 30, couleur: APP.text, poids: 700, espace: -0.6 });
    s += texte(286, 118, t('Ce coffre, ses appareils et la façon dont il se protège.', 'This vault, its devices and how it protects itself.'), { taille: 13.5, couleur: APP.muted });
    s += menu();
    s += `<rect x="556" y="155" width="32" height="32" rx="9" fill="${APP.accent}" fill-opacity="0.14"/>` + icone('ArrowsLeftRight', 563, 162, 18, APP.accentText);
    s += texte(600, 168, t('Import et export', 'Import and export'), { taille: 16, couleur: APP.text, poids: 600 });
    s += texte(600, 186, t('Faire entrer tes mots de passe, en garder une copie chiffrée.', 'Bring your passwords in, keep an encrypted copy.'), { taille: 12.5, couleur: APP.muted });
    if (erreur) {
      s += `<rect x="${GX}" y="210" width="${GL}" height="40" rx="11" fill="${APP.crit}" fill-opacity="0.12"/>`;
      s += texte(GX + 12, 234.5, t('Export chiffré : dans Bitwarden, choisis le format « .json » (non chiffré), puis réessaie.',
        'Encrypted export: in Bitwarden, pick the “.json” format (unencrypted), then try again.'), { taille: 13, couleur: APP.crit, poids: 500 });
    }
    const y = GY(erreur);
    const hp = panneau ? panneau.h + 12 : 0;
    const h = 213 + hp;
    s += verre(GX, y, GL, h);
    s += texte(571, y + 30, t('Importer', 'Import'), { taille: 15, couleur: APP.text, poids: 600 });
    s += paragraphe(571, y + 52, t('Le fichier est lu et chiffré sur cet appareil : son contenu en clair ne part jamais vers le serveur. Tout arrive dans « Protégé par toi ».',
      'The file is read and encrypted on this device: its clear content never goes to the server. Everything lands in “Protected by you”.'), { taille: 13, max: 640, couleur: APP.muted, interligne: 20 });
    for (let i = 0; i < 3; i++) s += carteSource(i, y + 92, i === actif);
    if (panneau) {
      const py = y + 207;
      s += `<rect x="571" y="${py}" width="651" height="${panneau.h}" rx="12" fill="#94A3C4" fill-opacity="0.06"/>`;
      s += `<g transform="translate(585 ${py})">${panneau.svg}</g>`;
    }
    // The export group, below: as on the real page, cut by the status bar.
    const ey = y + h + 16;
    s += verre(GX, ey, GL, 250);
    s += texte(571, ey + 30, t('Exporter', 'Export'), { taille: 15, couleur: APP.text, poids: 600 });
    s += paragraphe(571, ey + 52, t('Un fichier chiffré par une phrase de passe que tu choisis ici, produit sur cet appareil. Les deux zones y sont, chacune marquée.',
      'A file encrypted with a passphrase you choose here, made on this device. Both zones are in it, each one marked.'), { taille: 13, max: 640, couleur: APP.muted, interligne: 20 });
    s += texte(573, ey + 104, t('Phrase de passe de l’export', 'Export passphrase'), { taille: 13, couleur: APP.muted, poids: 500 });
    s += `<rect x="571" y="${ey + 118}" width="554" height="42" rx="10" fill="${APP.glass2}" fill-opacity="0.66" stroke="${APP.line}" stroke-opacity="0.22"/>` + icone('Eye', 1095, ey + 129, 20, APP.muted);
    s += bouton(1135, ey + 118, 87, 42, t('Exporter', 'Export'), { icone: 'DownloadSimple', taille: 13.5 });
    return s;
  }

  // What shows under the cards.
  const largeurBoutons = (651 - 28 - 8) / 2;
  const deuxBoutons = (y) => bouton(0, y, largeurBoutons, 36, t('Annuler', 'Cancel'), { taille: 14 }) +
    boutonPrimaire(largeurBoutons + 8, y, largeurBoutons, 36, t('Importer', 'Import'), { taille: 14 });
  const PRET_A = {
    h: 120,
    svg: texte(0, 30, t('3 entrées prêtes à importer. Tout arrivera dans « Protégé par toi ».', '3 entries ready to import. Everything will land in “Protected by you”.'), { taille: 14, couleur: APP.text }) +
      deuxBoutons(46) +
      texte(0, 104, t('Pense à supprimer le fichier d’export de ton disque ensuite.', 'Remember to delete the export file from your disk afterwards.'), { taille: 12.5, couleur: APP.muted }),
  };
  const LIEN_TEST = 'otpauth-migration://offline?data=CiYKCkhlbGxvId6tvu8SCkN5YmVydHJpc3QaBkdpdEh1YiABKAEwAgovCgoxMjM0NTY3ODkwEhJ0cmlzdGFuQGV4ZW1wbGUuZnIaB05ldGZsaXggASgBMAIQARgBIAA%3D';
  const ETAPES_AUTH = [
    t('Dans Google Authenticator : menu, « Transférer les comptes », « Exporter ».', 'In Google Authenticator: menu, “Transfer accounts”, “Export”.'),
    t('L’appli affiche un QR code : scanne-le avec n’importe quel lecteur.', 'The app shows a QR code: scan it with any reader.'),
    t('Colle ici le lien otpauth-migration:// qu’il contient. Les secrets sont lus et chiffrés ici.', 'Paste here the otpauth-migration:// link it holds. The secrets are read and encrypted here.'),
  ];
  const panneauLien = (colle) => {
    let s = '';
    ETAPES_AUTH.forEach((e, i) => {
      s += `<circle cx="10" cy="${24 + i * 23}" r="10" fill="${APP.accent}" fill-opacity="0.16"/>` +
        texte(10, 28 + i * 23, String(i + 1), { taille: 11, couleur: APP.accentText, poids: 600, ancre: 'middle' }) +
        texte(30, 28.5 + i * 23, e, { taille: 12.5, couleur: APP.muted });
    });
    s += texte(2, 108, t('Lien de migration', 'Migration link'), { taille: 13, couleur: APP.muted, poids: 500 });
    s += `<rect x="0" y="118" width="623" height="62" rx="10" fill="${APP.glass2}" fill-opacity="0.66" stroke="${APP.line}" stroke-opacity="0.22"/>`;
    s += colle;
    s += bouton(0, 192, 623, 36, t('Lire le lien', 'Read the link'), { icone: 'ClockCountdown', taille: 14 });
    return { h: 242, svg: s };
  };
  const lienTape = (de, a) => {
    const l1 = LIEN_TEST.slice(0, 84), l2 = LIEN_TEST.slice(84);
    const mi = de + ((a - de) * l1.length) / LIEN_TEST.length;
    return entre(C, 0, de, texte(14, 142, 'otpauth-migration://offline?data=…', { taille: 12, couleur: APP.faint, police: MONO }), 0.003) +
      frappe(14, 142, l1, C, de, mi, { taille: 12, couleur: APP.text, police: MONO }) +
      frappe(14, 162, l2, C, mi, a, { taille: 12, couleur: APP.text, police: MONO });
  };
  const LIEN_FIXE = texte(14, 142, LIEN_TEST.slice(0, 84), { taille: 12, couleur: APP.text, police: MONO }) +
    texte(14, 162, LIEN_TEST.slice(84), { taille: 12, couleur: APP.text, police: MONO });
  const TROUVES_B = {
    h: 136,
    svg: texte(0, 30, t('2 codes trouvés : GitHub, Netflix', '2 codes found: GitHub, Netflix'), { taille: 14, couleur: APP.text }) +
      paragraphe(0, 54, t('Un code rejoint l’entrée du même nom si elle n’en a pas encore ; sinon il devient sa propre entrée, dans « Protégé par toi ». Rien n’est écrasé.',
        'A code joins the entry of the same name if it has none yet; otherwise it becomes its own entry, in “Protected by you”. Nothing is overwritten.'), { taille: 12.5, max: 620, couleur: APP.muted, interligne: 19 }) +
      deuxBoutons(86),
  };

  // The system file picker, in neutral greys: it is not Serenity's.
  const SYS = { fond: '#1E222B', ligne: '#2C3240', texte: '#E4E7EE', second: '#9BA3B2', bleu: '#4C8DF6' };
  const FICHIERS = [
    ['FileCsv', t('Mots de passe Google.csv', 'Google Passwords.csv'), '2 Ko'],
    ['FileText', 'bitwarden_export_20260927.json', '14 Ko'],
  ];
  function selecteur(choisi) {
    let s = `<rect x="0" y="36" width="1280" height="764" fill="#03050A" fill-opacity="0.55"/>
      <rect x="340" y="190" width="600" height="360" rx="10" fill="${SYS.fond}" stroke="${SYS.ligne}" filter="url(#ombreFlottante)"/>`;
    s += texte(364, 226, t('Ouvrir', 'Open'), { taille: 16, couleur: SYS.texte, poids: 600 });
    s += `<rect x="364" y="244" width="552" height="32" rx="6" fill="#141820" stroke="${SYS.ligne}"/>` +
      texte(378, 265, t('Téléchargements', 'Downloads'), { taille: 13.5, couleur: SYS.second });
    FICHIERS.forEach(([ic, nom, taille], i) => {
      const y = 292 + i * 44;
      if (i === choisi) s += `<rect x="364" y="${y}" width="552" height="40" rx="6" fill="${SYS.bleu}" fill-opacity="0.22"/>`;
      s += icone(ic, 378, y + 10, 20, SYS.second) + texte(410, y + 25, nom, { taille: 14, couleur: SYS.texte }) +
        texte(900, y + 25, taille, { taille: 13, couleur: SYS.second, ancre: 'end' });
    });
    s += texte(364, 468, t('Fichiers acceptés : .csv, .json', 'Accepted files: .csv, .json'), { taille: 12.5, couleur: SYS.second });
    s += `<rect x="690" y="498" width="108" height="34" rx="6" fill="none" stroke="${SYS.ligne}"/>` + texte(744, 520, t('Annuler', 'Cancel'), { taille: 13.5, couleur: SYS.texte, ancre: 'middle' });
    s += `<rect x="808" y="498" width="108" height="34" rx="6" fill="${SYS.bleu}"/>` + texte(862, 520, t('Ouvrir', 'Open'), { taille: 13.5, couleur: '#FFFFFF', poids: 600, ancre: 'middle' });
    return s;
  }

  const fond = () => aurore(1280, 800, 'calm', { hauteur: 700 });
  const vue = (comptes, contenu) => fond() + contenu + chrome(comptes);
  const toastBas = (s) => toast(640, 718, s);
  let ecran = '';
  // 1. A Google CSV.
  ecran += entre(C, 0, DLG_A, vue(AVANT, page()) + toucher(...centreCarte(0, 302), C, CLIC_G, { rayon: 22 }), 0.006);
  ecran += entre(C, DLG_A, PRET, vue(AVANT, page() + entre(C, 0, LIGNE_A + 0.004, selecteur(-1), 0.002) + entre(C, LIGNE_A + 0.004, 2, selecteur(0), 0.002)) +
    toucher(560, 312, C, LIGNE_A, { rayon: 22 }) + toucher(862, 515, C, OUVRIR_A, { rayon: 22 }), 0.006);
  ecran += entre(C, PRET, FAIT_A, vue(AVANT, page({ panneau: PRET_A })) + toucher(585 + largeurBoutons * 1.5 + 8, 417 + 64, C, IMPORTER_A, { rayon: 22 }), 0.006);
  ecran += entre(C, FAIT_A, LIEN, vue(APRES_A, page()) +
    entre(C, FAIT_A + 0.004, CLIC_AUTH - 0.005, toastBas(t('3 entrées importées dans « Protégé par toi ».', '3 entries imported into “Protected by you”.'))) +
    toucher(...centreCarte(1, 302), C, CLIC_AUTH, { rayon: 22 }), 0.006);
  // 2. The Authenticator link.
  ecran += entre(C, LIEN, TROUVES, vue(APRES_A, page({ actif: 1, panneau: panneauLien(lienTape(...COLLE)) })) +
    toucher(896, 417 + 192 + 18, C, LIRE, { rayon: 22 }), 0.006);
  ecran += entre(C, TROUVES, FAIT_B, vue(APRES_A, page({ actif: 1, panneau: TROUVES_B })) + toucher(585 + largeurBoutons * 1.5 + 8, 417 + 104, C, IMPORTER_B, { rayon: 22 }), 0.006);
  ecran += entre(C, FAIT_B, DLG_C, vue(APRES_B, page()) +
    entre(C, FAIT_B + 0.004, CLIC_BW - 0.005, toastBas(t('2 codes importés, dont 1 rattaché(s) à une entrée existante.', '2 codes imported, 1 of them attached to an existing entry.'))) +
    toucher(...centreCarte(2, 302), C, CLIC_BW, { rayon: 22 }), 0.006);
  // 3. An encrypted Bitwarden export.
  ecran += entre(C, DLG_C, REFUS, vue(APRES_B, page() + entre(C, 0, LIGNE_C + 0.004, selecteur(-1), 0.002) + entre(C, LIGNE_C + 0.004, 2, selecteur(1), 0.002)) +
    toucher(560, 356, C, LIGNE_C, { rayon: 22 }) + toucher(862, 515, C, OUVRIR_C, { rayon: 22 }), 0.006);
  ecran += entre(C, REFUS, FIN, vue(APRES_B, page({ erreur: true })), 0.006);
  corps += F.ecran(ecran);

  // ------------------------------------------------ the right-hand column
  const RX = 780, RL = 460, R1 = 88, R1H = 250, R2 = R1 + R1H + 16, R2H = 526 - R2;
  corps += carte(RX, R1, RL, R1H);
  corps += carte(RX, R2, RL, R2H);
  const titreCarte = (y, s) => texte(RX + 20, y + 34, s, { taille: 15, couleur: TITRE, poids: 600 });
  const m = (x, y, s, { couleur = TITRE, taille = 12 } = {}) =>
    `<text x="${x}" y="${y}" font-family="${MONO}" font-size="${taille}" fill="${couleur}" xml:space="preserve">${s}</text>`;
  const sp = (s, c) => `<tspan fill="${c}">${O.esc(s)}</tspan>`;

  // Card 1: what the chosen file (or link) holds, and how it is read.
  const sources = titreCarte(R1, t('Trois sources, lues ici', 'Three sources, read here')) +
    [['FileCsv', t('Le CSV de Google', 'Google’s CSV'), t('exporté du gestionnaire de Chrome', 'exported from Chrome’s manager')],
      ['Vault', t('Le JSON de Bitwarden', 'Bitwarden’s JSON'), t('l’export simple, non chiffré', 'the plain, unencrypted export')],
      ['QrCode', t('Le lien d’Authenticator', 'Authenticator’s link'), t('otpauth-migration://, dans son QR code', 'otpauth-migration://, in its QR code')]]
      .map(([ic, a, b], i) => {
        const y = R1 + 66 + i * 58;
        return `<rect x="${RX + 20}" y="${y}" width="34" height="34" rx="9" fill="${ACCENT}" fill-opacity="0.12"/>` + icone(ic, RX + 27, y + 7, 20, ACCENT_TEXTE) +
          texte(RX + 68, y + 14, a, { taille: 14, couleur: TITRE, poids: 500 }) + texte(RX + 68, y + 32, b, { taille: 12.5, couleur: TEXTE });
      }).join('');
  const verdict = (y, ic, c, s) => icone(ic, RX + 20, y - 13, 17, c, 'fill') + texte(RX + 46, y, s, { taille: 13, couleur: TITRE });

  const csv = titreCarte(R1, t('Le fichier, lu sur cet appareil', 'The file, read on this device')) +
    texte(RX + RL - 20, R1 + 34, t('Mots de passe Google.csv', 'Google Passwords.csv'), { taille: 12, couleur: DISCRET, ancre: 'end', police: MONO }) +
    `<rect x="${RX + 20}" y="${R1 + 52}" width="${RL - 40}" height="96" rx="10" fill="${FOND}" stroke="${BORD}"/>` +
    m(RX + 34, R1 + 76, sp('n', ACCENT_TEXTE) + 'ame,url,username,password,note') +
    m(RX + 34, R1 + 96, 'GitHub,https://github.com/,Cybertrist,••••••,', { couleur: TEXTE }) +
    m(RX + 34, R1 + 116, 'Amazon,https://amazon.fr/,tristan@exemple.fr,••••••,', { couleur: TEXTE }) +
    m(RX + 34, R1 + 136, 'Forum,https://forum.exemple.fr/,tristan,••••••,', { couleur: TEXTE }) +
    verdict(R1 + 180, 'CheckCircle', ACCENT_TEXTE, t('Pas d’accolade au début : c’est le CSV de Google.', 'No brace at the start: it is Google’s CSV.')) +
    verdict(R1 + 212, 'CheckCircle', ACCENT_TEXTE, t('Les colonnes se lisent d’après l’en-tête.', 'The columns are found through the header.'));

  const lienBrut = titreCarte(R1, t('Le lien, lu sur cet appareil', 'The link, read on this device')) +
    `<rect x="${RX + 20}" y="${R1 + 52}" width="${RL - 40}" height="56" rx="10" fill="${FOND}" stroke="${BORD}"/>` +
    m(RX + 34, R1 + 76, 'otpauth-migration://offline?data=', { couleur: ACCENT_TEXTE }) +
    m(RX + 34, R1 + 96, 'CiYKCkhlbGxvId6tvu8SCkN5YmVydHJpc3QaBkdpdEh1…', { couleur: TEXTE }) +
    texte(RX + 20, R1 + 138, t('Dedans, un protobuf, lu à la main :', 'Inside, a protobuf, read by hand:'), { taille: 13, couleur: TITRE }) +
    m(RX + 20, R1 + 164, `0a 26   ${sp(t('un compte, 38 octets', 'one account, 38 bytes'), DISCRET)}`) +
    m(RX + 36, R1 + 184, `0a 0a 48 65 6c 6c 6f…   ${sp(t('le secret, 10 octets', 'the secret, 10 bytes'), DISCRET)}`) +
    m(RX + 36, R1 + 204, `12 0a "Cybertrist"      ${sp(t('le nom', 'the name'), DISCRET)}`) +
    m(RX + 36, R1 + 224, `1a 06 "GitHub"          ${sp(t('l’émetteur', 'the issuer'), DISCRET)}`);

  const liens = titreCarte(R1, t('Deux comptes, redevenus des liens', 'Two accounts, links again')) +
    [['GitHub', 'GitHub%3ACybertrist', 'JBSWY3DPEHPK3PXP'], ['Netflix', 'Netflix%3Atristan%40exemple.fr', 'GEZDGNBVGY3TQOJQ']]
      .map(([nom, lab, sec], i) => {
        const y = R1 + 52 + i * 80;
        return `<rect x="${RX + 20}" y="${y}" width="${RL - 40}" height="70" rx="10" fill="${FOND}" stroke="${BORD}"/>` +
          m(RX + 34, y + 23, `otpauth://totp/${lab}`) +
          m(RX + 34, y + 41, `?secret=${sec}`, { couleur: TEXTE }) +
          m(RX + 34, y + 59, `&amp;algorithm=SHA1&amp;digits=6&amp;period=30&amp;issuer=${nom}`, { couleur: DISCRET });
      }).join('') +
    texte(RX + 20, R1 + 228, t('Secrets d’essai. Les vrais sont chiffrés aussitôt lus.', 'Test secrets. Real ones are encrypted as soon as read.'), { taille: 12.5, couleur: DISCRET });

  const bitwarden = titreCarte(R1, t('Le fichier, lu sur cet appareil', 'The file, read on this device')) +
    texte(RX + RL - 20, R1 + 34, 'bitwarden_export_….json', { taille: 12, couleur: DISCRET, ancre: 'end', police: MONO }) +
    `<rect x="${RX + 20}" y="${R1 + 52}" width="${RL - 40}" height="96" rx="10" fill="${FOND}" stroke="${BORD}"/>` +
    m(RX + 34, R1 + 76, sp('{', ACCENT_TEXTE)) +
    m(RX + 34, R1 + 96, `  "encrypted": ${sp('true', ROUGE)},`, { couleur: TEXTE }) +
    m(RX + 34, R1 + 116, '  "passwordProtected": true,', { couleur: TEXTE }) +
    m(RX + 34, R1 + 136, '  "data": "2.kX9…"', { couleur: TEXTE }) +
    verdict(R1 + 180, 'CheckCircle', ACCENT_TEXTE, t('Une accolade au début : un export Bitwarden.', 'A brace at the start: a Bitwarden export.')) +
    verdict(R1 + 212, 'Prohibit', ROUGE, t('Chiffré : refusé, rien n’est importé.', 'Encrypted: refused, nothing is imported.'));

  corps += entre(C, 0, PRET, sources, 0.006);
  corps += entre(C, PRET, LIEN, csv, 0.006);
  corps += entre(C, LIEN, TROUVES, lienBrut, 0.006);
  corps += entre(C, TROUVES, CLIC_BW, liens, 0.006);
  corps += entre(C, CLIC_BW, REFUS, sources, 0.006);
  corps += entre(C, REFUS, FIN, bitwarden, 0.006);

  // Card 2: the personal zone fills up. Six places, three columns.
  corps += titreCarte(R2, t('Dans « Protégé par toi »', 'In “Protected by you”'));
  const place = (i) => [RX + 20 + (i % 3) * 142, R2 + 54 + Math.floor(i / 3) * 50];
  const tuile = (i, e, { code = false } = {}) => {
    const [x, y] = place(i);
    return monogramme(e.nom, x, y, 32, { cle: e.cle }) + texte(x + 42, y + 21, e.nom, { taille: 13.5, couleur: TITRE, poids: 500 }) +
      (code ? icone('ClockCountdown', x + 42 + largeur(e.nom, 13.5, { poids: 500 }) + 6, y + 8, 15, ACCENT_TEXTE) : '');
  };
  const forum = { nom: 'Forum', id: 'tristan' };
  corps += tuile(0, ENTREES.banque) + tuile(1, ENTREES.spotify);
  const neuf = (de, a, contenu) => entre(C, de, a, contenu, 0.006);
  corps += neuf(FAIT_A, FAIT_B, tuile(2, ENTREES.github));
  corps += neuf(FAIT_B, FIN, tuile(2, ENTREES.github, { code: true }));
  corps += neuf(FAIT_A + 0.006, FIN, tuile(3, ENTREES.amazon));
  corps += neuf(FAIT_A + 0.012, FIN, tuile(4, forum));
  corps += neuf(FAIT_B + 0.006, FIN, tuile(5, ENTREES.netflix, { code: true }));
  const note = (de, a, ic, c, s) => entre(C, de, a, icone(ic, RX + 20, R2 + 142, 16, c, 'fill') + texte(RX + 44, R2 + 155, s, { taille: 12.5, couleur: TEXTE }), 0.006);
  corps += note(0, FAIT_A, 'Info', DISCRET, t('Une entrée importée arrive toujours ici.', 'An imported entry always lands here.'));
  corps += note(FAIT_A, FAIT_B, 'CheckCircle', VERT, t('GitHub, Amazon et Forum : 3 entrées de plus.', 'GitHub, Amazon and Forum: 3 more entries.'));
  corps += note(FAIT_B, REFUS, 'CheckCircle', VERT, t('GitHub gagne son code. Netflix avait le sien : nouvelle entrée.', 'GitHub gains its code. Netflix had one: a new entry.'));
  corps += note(REFUS, FIN, 'Prohibit', ROUGE, t('Rien de plus : l’export chiffré a été refusé.', 'Nothing more: the encrypted export was refused.'));

  // ------------------------------------------------ what leaves the device
  const PY = 562, PH = 96, PL = 280, GAP = 24, PX = 48;
  corps += rubrique(PX, PY - 16, t('CE QUI PART VERS LE SERVEUR', 'WHAT LEAVES FOR THE SERVER'));
  const boites = [
    [t('Lu ici', 'Read here'), t('le fichier reste sur l’appareil', 'the file stays on the device'), t('5 Mo et 5 000 entrées au plus', '5 MB and 5,000 entries at most')],
    [t('Reconnu au contenu', 'Told by its content'), t('un JSON : export Bitwarden', 'a JSON: Bitwarden export'), t('le reste : CSV de Google', 'anything else: Google’s CSV')],
    [t('Chiffré sur place', 'Encrypted on the spot'), t('XChaCha20-Poly1305, clé UK', 'XChaCha20-Poly1305, key UK'), t('zone personnelle, révision 1', 'personal zone, revision 1')],
    ['POST /api/vault/items', t('des blocs, par lots de 500', 'blocks, in batches of 500'), t('le serveur en prend 1 à 1 000', 'the server takes 1 to 1,000')],
  ];
  // When each box lights up, per import: [start, end] or null.
  const allumages = [
    [[PRET, LIEN], [LIRE + 0.01, FAIT_B + 0.06], [REFUS, FIN]],
    [[PRET + 0.012, LIEN], null, [REFUS + 0.012, FIN]],
    [[IMPORTER_A + 0.004, LIEN], [IMPORTER_B + 0.004, FAIT_B + 0.06], null],
    [[IMPORTER_A + 0.016, LIEN], [IMPORTER_B + 0.016, FAIT_B + 0.06], null],
  ];
  boites.forEach(([titre, l1, l2], i) => {
    const x = PX + i * (PL + GAP);
    corps += carte(x, PY, PL, PH);
    for (const a of allumages[i]) if (a) corps += carte(x, PY, PL, PH, { allume: a, cycle: C, fond: 'none' });
    corps += texte(x + 20, PY + 32, titre, { taille: 14, couleur: TITRE, police: i === 3 ? MONO : SANS, poids: 600 });
    corps += texte(x + 20, PY + 56, l1, { taille: 12.5 }) + texte(x + 20, PY + 76, l2, { taille: 12.5 });
    if (i < 3) {
      const c = `M ${x + PL + 3} ${PY + PH / 2} H ${x + PL + GAP - 5}`;
      corps += fil(C, c) + pointe(x + PL + GAP - 4, PY + PH / 2, 0);
    }
  });
  // The encrypted Bitwarden export stops at the second box, in red.
  const x2 = PX + PL + GAP;
  corps += `<rect x="${x2}" y="${PY}" width="${PL}" height="${PH}" rx="14" fill="${ROUGE}" fill-opacity="0.06" stroke="${ROUGE}" stroke-width="1.5" opacity="0">${visible(C, REFUS + 0.012, FIN)}</rect>`;
  // The blocks travel to the server.
  const chemin = `M ${PX + 2 * (PL + GAP) + PL + 3} ${PY + PH / 2} H ${PX + 3 * (PL + GAP) - 5}`;
  corps += bille(C, chemin, IMPORTER_A + 0.004, IMPORTER_A + 0.016) + bille(C, chemin, IMPORTER_B + 0.004, IMPORTER_B + 0.016);

  // ------------------------------------------------ what is happening now
  corps += legendes(PX, 706, C, [
    [0, PRET, t('Tu choisis un fichier : Serenity le lit sur cet appareil, sans rien envoyer.', 'You pick a file: Serenity reads it on this device, sending nothing.')],
    [PRET, FAIT_A, t('Le format se reconnaît au contenu, pas au nom. Chaque entrée est chiffrée ici avant de partir.', 'The format is told by the content, not the name. Each entry is encrypted here before it leaves.')],
    [FAIT_A, LIEN, t('Tout arrive dans ta zone. Le serveur n’a reçu que des blocs qu’il ne sait pas ouvrir.', 'Everything lands in your zone. The server only got blocks it cannot open.')],
    [LIEN, TROUVES, t('Les codes de Google Authenticator viennent du lien de son QR code de transfert.', 'Google Authenticator codes come from the link of its transfer QR code.')],
    [TROUVES, CLIC_BW, t('Un code rejoint l’entrée du même nom si elle n’en a pas. Sinon, il devient sa propre entrée.', 'A code joins the entry of the same name if it has none. Otherwise it becomes its own entry.')],
    [CLIC_BW, FIN, t('Un export Bitwarden chiffré est refusé, avec la marche à suivre.', 'An encrypted Bitwarden export is refused, with what to do instead.'), ROUGE],
  ], { max: 1180 });

  svg('import.svg', 1280, 740, corps, t(
    'L’import, sans rien envoyer en clair. À gauche, la fenêtre de bureau rejoue trois imports dans Réglages, Import et export, dont le texte dit que le fichier est lu et chiffré sur cet appareil et que tout arrive dans « Protégé par toi » ; trois cartes : Mots de passe Google, Google Authenticator, Bitwarden. Premier import : un clic sur Mots de passe Google ouvre le sélecteur de fichiers, qui n’accepte que .csv et .json ; le fichier « Mots de passe Google.csv » est ouvert ; l’appli dit « 3 entrées prêtes à importer », puis « 3 entrées importées dans « Protégé par toi » ». Deuxième import : la carte Google Authenticator s’ouvre sur trois étapes, le lien otpauth-migration:// est collé puis lu ; l’appli trouve 2 codes, GitHub et Netflix, rappelle qu’un code rejoint l’entrée du même nom si elle n’en a pas encore, sinon devient sa propre entrée, et que rien n’est écrasé ; puis « 2 codes importés, dont 1 rattaché à une entrée existante ». Troisième import : un export Bitwarden chiffré, refusé par le message « Export chiffré : dans Bitwarden, choisis le format .json non chiffré, puis réessaie ». À droite, en haut, ce que contient la source : d’abord les trois sources lues ici ; puis le CSV, dont l’en-tête name, url, username, password, note se lit avant les lignes GitHub, Amazon et Forum, mots de passe masqués, avec deux constats : pas d’accolade au début, c’est le CSV de Google, et les colonnes se lisent d’après l’en-tête ; puis le lien de migration et le protobuf lu à la main, un compte de 38 octets, le secret de 10 octets, le nom Cybertrist, l’émetteur GitHub ; puis les deux comptes redevenus des liens otpauth://totp avec leurs secrets d’essai, SHA1, 6 chiffres, 30 secondes ; enfin le JSON Bitwarden, qui commence par une accolade, donc un export Bitwarden, mais dont encrypted vaut true, donc refusé. En dessous, la zone « Protégé par toi » se remplit : Banque et Spotify, puis GitHub, Amazon et Forum, puis GitHub gagne son code et Netflix, qui avait déjà le sien, devient une nouvelle entrée ; rien de plus après le refus. En bas, ce qui part vers le serveur, en quatre étapes qui s’allument à chaque import : lu ici, le fichier reste sur l’appareil, 5 Mo et 5 000 entrées au plus ; reconnu au contenu, un JSON est un export Bitwarden, le reste le CSV de Google ; chiffré sur place avec XChaCha20-Poly1305 et la clé UK, zone personnelle, révision 1 ; puis POST /api/vault/items, des blocs par lots de 500, le serveur en acceptant 1 à 1 000. L’export chiffré s’arrête en rouge à la deuxième étape.',
    'The import, sending nothing in clear. On the left, the desktop window replays three imports in Settings, Import and export, whose text says the file is read and encrypted on this device and that everything lands in “Protected by you”; three cards: Google passwords, Google Authenticator, Bitwarden. First import: a click on Google passwords opens the file picker, which only accepts .csv and .json; the file “Google Passwords.csv” is opened; the app says “3 entries ready to import”, then “3 entries imported into Protected by you”. Second import: the Google Authenticator card opens on three steps, the otpauth-migration:// link is pasted then read; the app finds 2 codes, GitHub and Netflix, recalls that a code joins the entry of the same name if it has none yet, otherwise becomes its own entry, and that nothing is overwritten; then “2 codes imported, 1 of them attached to an existing entry”. Third import: an encrypted Bitwarden export, refused with the message “Encrypted export: in Bitwarden, pick the .json format, unencrypted, then try again”. On the right, at the top, what the source holds: first the three sources read here; then the CSV, whose header name, url, username, password, note is read before the GitHub, Amazon and Forum rows, passwords hidden, with two findings: no brace at the start, so it is Google’s CSV, and the columns are found through the header; then the migration link and the protobuf read by hand, one 38 byte account, the 10 byte secret, the name Cybertrist, the issuer GitHub; then the two accounts turned back into otpauth://totp links with their test secrets, SHA1, 6 digits, 30 seconds; last the Bitwarden JSON, which starts with a brace, so a Bitwarden export, but whose encrypted field is true, so refused. Below, the “Protected by you” zone fills up: Bank and Spotify, then GitHub, Amazon and Forum, then GitHub gains its code and Netflix, which already had one, becomes a new entry; nothing more after the refusal. At the bottom, what leaves for the server, in four steps that light up at each import: read here, the file stays on the device, 5 MB and 5,000 entries at most; told by its content, a JSON is a Bitwarden export, anything else Google’s CSV; encrypted on the spot with XChaCha20-Poly1305 and key UK, personal zone, revision 1; then POST /api/vault/items, blocks in batches of 500, the server accepting 1 to 1,000. The encrypted export stops in red at the second step.'));
};

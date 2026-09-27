// Three forms, one code: the same web client as a phone, in a browser,
// and inside the desktop app (web/src/app/shell/Shell.tsx, docs/design.md,
// docs/11-bureau.md).
//
// On the left, the stage replays each form on the real screens: the phone
// with its five tabs (a tap on Codes), the browser from 900 px with its
// sidebar, its top search and the palette it opens (Ctrl K), then the
// desktop app under its own title bar, hidden and shown again by
// Ctrl Shift Space, and locked when the session is. Under the stage, a
// ruler shows the measured width crossing WIDE_FROM. On the right, the
// three lines of Shell.tsx that choose the form, one card per form, then
// what changes and what does not.
module.exports = (O) => {
  const E = require('./_ecrans.js')(O);
  const W = require('./_ecrans-ecrans.js')(O);
  const { t, svg, texte, paragraphe, entete, rubrique, entre, fondu, toucher, carte, icone, touches, largeur,
    telephone, fenetre, CARTE, BORD, TITRE, TEXTE, DISCRET, FIL, ACCENT, ACCENT_TEXTE, MONO, APP } = O;
  const C = 33;
  // The phone.
  const TAP_CODES = 0.11, CODES = 0.13, FIN_TEL = 0.3;
  // The browser, and its palette.
  const WEB = 0.315, TAP_K = 0.42, PAL = 0.435, PAL_FIN = 0.56, FIN_WEB = 0.63;
  // The desktop app: hidden, shown again, then locked with the session.
  const BUR = 0.645, CHIP_CACHE = 0.735, CACHE = 0.755, REVIENT = 0.79, CHIP_CACHE_FIN = 0.815;
  const CHIP_VERR = 0.835, VERR = 0.855, FIN = 0.97;

  let corps = entete(t('TROIS FORMES', 'THREE FORMS'),
    t('Un seul client web : la largeur choisit la mise en page, l’appli de bureau ajoute sa fenêtre.',
      'One web client: the width picks the layout, the desktop app adds its window.'));

  // ------------------------------------------------------------- the stage
  const SX = 48, SL = 640, SCX = SX + SL / 2;

  // The phone, under 900 px: the vault, a tap on Codes, the codes tab.
  const T = telephone(0, 100, 580);
  const TX = Math.round(SX + (SL - T.largeur) / 2);
  const Tel = telephone(TX, 100, 580);
  const coffreTel = E.coffre({
    netflix: 'agent', sante: 67, humeur: 'leak', alerte: true, badges: { fuites: 1, agent: 1 },
    titreEtat: t('Une chose demande ton attention.', 'One thing needs your attention.'),
    sousEtat: t('Netflix est dans une fuite connue.', 'Netflix is in a known breach.'),
  });
  corps += entre(C, 0, FIN_TEL, Tel.cadre + Tel.ecran(
    entre(C, 0, CODES, coffreTel + toucher(120, 801, C, TAP_CODES), 0.006) +
    entre(C, CODES, FIN_TEL, W.codes(), 0.006)), 0.008);

  // The browser, from 900 px: the same vault, wide; the top search opens
  // the palette.
  const N = W.navigateur(SX, 124, SL, 'coffre.exemple.fr');
  corps += entre(C, WEB, FIN_WEB, N.cadre + N.ecran(
    W.coffreLarge({ forme: 'web' }) + toucher(420, 28, C, TAP_K, { rayon: 30 }) +
    entre(C, PAL, PAL_FIN, W.palette(), 0.006)), 0.008);

  // The desktop app: its title bar carries logo and search. Ctrl Shift
  // Space hides it and brings it back; locking the session locks it.
  // Built twice (hidden, then back): each copy needs its own ids.
  const appli = () => { const F = fenetre(SX, 138, SL); return F.cadre + F.ecran(entre(C, 0, VERR, W.coffreLarge({ forme: 'bureau' }), 0.006) + entre(C, VERR, 1.2, W.verrouLarge(), 0.006)); };
  corps += entre(C, BUR, CACHE, appli(), 0.008);
  corps += entre(C, REVIENT, FIN, appli(), 0.008);

  // What the keyboard does, under the window.
  const bulle = (y, keys, s) => {
    const k = touches(0, 0, keys, { h: 22, taille: 12.5 });
    const l = k.l + largeur(s, 13.5) + 52;
    const x = SCX - l / 2;
    return carte(x, y, l, 42, { rx: 12 }) + touches(x + 18, y + 10, keys, { h: 22, taille: 12.5 }).svg +
      texte(x + 34 + k.l, y + 26, s, { taille: 13.5, couleur: TITRE });
  };
  corps += entre(C, PAL, PAL_FIN, bulle(606, ['Ctrl', 'K'], t('ou un clic sur la recherche : la palette s’ouvre', 'or a click on the search: the palette opens')), 0.006);
  corps += entre(C, CHIP_CACHE, CHIP_CACHE_FIN, bulle(606, ['Ctrl', t('Maj', 'Shift'), t('Espace', 'Space')],
    t('depuis n’importe où : cachée, puis revenue', 'from anywhere: hidden, then back')), 0.006);
  corps += entre(C, CHIP_VERR, FIN, bulle(606, ['Win', 'L'], t('tu verrouilles ta session, le coffre aussi', 'you lock your session, the vault too')), 0.006);

  // The ruler: the width the shell measures, against WIDE_FROM.
  const RY = 724, px = (w) => SX + (w / 1280) * SL;
  corps += rubrique(SX, RY - 16, t('LARGEUR MESURÉE', 'MEASURED WIDTH'));
  corps += entre(C, 0, FIN_TEL, texte(SX + SL, RY - 16, '390 px', { taille: 12.5, couleur: TITRE, police: MONO, poids: 600, ancre: 'end' }), 0.006);
  corps += entre(C, FIN + 0.012, 1.2, texte(SX + SL, RY - 16, '390 px', { taille: 12.5, couleur: TITRE, police: MONO, poids: 600, ancre: 'end' }), 0.006);
  corps += entre(C, FIN_TEL, FIN, texte(SX + SL, RY - 16, '1280 px', { taille: 12.5, couleur: TITRE, police: MONO, poids: 600, ancre: 'end' }), 0.006);
  corps += `<rect x="${SX}" y="${RY - 3}" width="${SL}" height="6" rx="3" fill="${FIL}"/>`;
  const w390 = px(390) - SX, w1280 = SL;
  corps += `<rect x="${SX}" y="${RY - 3}" width="${w390}" height="6" rx="3" fill="${ACCENT}">${fondu('width', C, [[0, w390], [FIN_TEL, w390], [FIN_TEL + 0.025, w1280], [FIN, w1280], [FIN + 0.025, w390], [1, w390]])}</rect>`;
  corps += `<line x1="${px(900)}" y1="${RY - 11}" x2="${px(900)}" y2="${RY + 11}" stroke="${ACCENT_TEXTE}" stroke-width="2"/>`;
  corps += texte(px(390), RY + 28, '390', { taille: 12.5, couleur: TEXTE, police: MONO, ancre: 'middle' });
  corps += texte(px(900), RY + 28, t('900, WIDE_FROM', '900, WIDE_FROM'), { taille: 12.5, couleur: ACCENT_TEXTE, police: MONO, poids: 600, ancre: 'middle' });
  corps += texte(SX + SL, RY + 28, '1280', { taille: 12.5, couleur: TEXTE, police: MONO, ancre: 'end' });

  // ------------------------------------------------------- the right side
  const RX = 728, RL = 504;
  corps += rubrique(RX, 104, t('LE CHOIX, DANS SHELL.TSX', 'THE CHOICE, IN SHELL.TSX'));
  const CY = 116, CH = 118;
  corps += carte(RX, CY, RL, CH);
  const L = [
    ['const wide = width >= WIDE_FROM;', t('// 900 px', '// 900 px')],
    ['const isDesktop = desktop() !== null;', null],
    ['const form = !wide ? "mobile"', null],
    ['  : isDesktop ? "desktop" : "web";', null],
  ];
  const CW = 13 * 0.6;
  // The word of the current form lights up behind the code.
  const mot = (ligne, s, de, a) => {
    const i = L[ligne][0].indexOf(s);
    return entre(C, de, a, `<rect x="${RX + 20 + i * CW - 4}" y="${CY + 30 + ligne * 22 - 15}" width="${s.length * CW + 8}" height="21" rx="5" fill="${ACCENT}" fill-opacity="0.2" stroke="${ACCENT}" stroke-opacity="0.7"/>`, 0.006);
  };
  corps += mot(2, '"mobile"', 0, FIN_TEL) + mot(3, '"web"', WEB, FIN_WEB) + mot(3, '"desktop"', BUR, FIN);
  L.forEach(([c, com], i) => {
    const y = CY + 30 + i * 22;
    // SVG collapses leading spaces: indent by hand.
    const retrait = c.length - c.trimStart().length;
    corps += texte(RX + 20 + retrait * CW, y, c.trimStart(), { taille: 13, couleur: TITRE, police: MONO });
    if (com) corps += texte(RX + 20 + (c.length + 2) * CW, y, com, { taille: 13, couleur: DISCRET, police: MONO });
  });

  // One card per form, built as the stage reaches it.
  const formes = [
    [0, FIN_TEL, 'DeviceMobile', t('Téléphone', 'Phone'), t('moins de 900 px', 'under 900 px'),
      t('Cinq onglets en bas, sous le pouce : Coffre, Codes, Fuites, Agent et Réglages.', 'Five tabs at the bottom, under your thumb: Vault, Codes, Breaches, Agent and Settings.')],
    [WEB, FIN_WEB, 'Browser', t('Navigateur', 'Browser'), t('dès 900 px', 'from 900 px'),
      t('Une barre latérale de 248 px, la recherche en haut qui ouvre la palette, une barre d’état en pied.', 'A 248 px sidebar, the search on top that opens the palette, a status bar at the foot.')],
    [BUR, FIN, 'Desktop', t('Appli de bureau', 'Desktop app'), 'Windows, Linux',
      t('Sa propre barre de titre. Verrouillée avec ta session, Ctrl Maj Espace pour la montrer, une seule instance.', 'Its own title bar. Locked with your session, Ctrl Shift Space to show it, a single instance.')],
  ];
  const FY = 250, FH = 112, FG = 12;
  formes.forEach(([de, a, ic, titre, seuil, phrase], i) => {
    const y = FY + i * (FH + FG);
    corps += entre(C, de, FIN, carte(RX, y, RL, FH, { allume: [de, a], cycle: C }) +
      `<rect x="${RX + 20}" y="${y + 18}" width="32" height="32" rx="9" fill="${ACCENT}" fill-opacity="0.12"/>` + icone(ic, RX + 27, y + 25, 18, ACCENT_TEXTE) +
      texte(RX + 64, y + 39, titre, { taille: 15, couleur: TITRE, poids: 600 }) +
      texte(RX + RL - 20, y + 39, seuil, { taille: 12.5, couleur: DISCRET, police: MONO, ancre: 'end' }) +
      paragraphe(RX + 20, y + 74, phrase, { taille: 13, max: RL - 40, couleur: TEXTE, interligne: 19 }), 0.008);
  });

  // What changes, and what does not.
  const BY = FY + 3 * (FH + FG) + 4, BL = (RL - 16) / 2, BH = 156;
  const bloc = (x, de, titre, phrase) => entre(C, de, FIN, carte(x, BY, BL, BH) +
    texte(x + 20, BY + 32, titre, { taille: 14.5, couleur: TITRE, poids: 600 }) +
    paragraphe(x + 20, BY + 58, phrase, { taille: 12.5, max: BL - 40, couleur: TEXTE, interligne: 19 }), 0.008);
  corps += bloc(RX, WEB + 0.04, t('Ce qui change', 'What changes'),
    t('La mise en page, d’après la largeur. Et dans l’appli de bureau, le pont window.serenityDesktop : les boutons de la fenêtre et l’ordre de verrouiller.',
      'The layout, from the width. And in the desktop app, the window.serenityDesktop bridge: the window buttons and the order to lock.'));
  corps += bloc(RX + BL + 16, BUR + 0.04, t('Ce qui ne change pas', 'What does not'),
    t('Le même client web, servi par ton serveur. Toute la crypto tourne dans la page. L’appli de bureau ne contient aucun code du coffre.',
      'The same web client, served by your server. All the crypto runs in the page. The desktop app holds no vault code at all.'));

  svg('formes.svg', 1280, 800, corps, t(
    'Trois formes, un seul code. À gauche, la même appli dans ses trois formes, sur les vrais écrans. D’abord le téléphone, sous 900 px : le coffre, avec la santé à 67, Banque et Spotify protégés par toi, Netflix confié à l’agent, et cinq onglets en bas ; un toucher sur Codes ouvre les codes 2FA, avec le code de Netflix calculé sur l’appareil. Ensuite le navigateur, dès 900 px : une barre latérale de 248 px avec le logo, les quatre écrans, les deux zones, l’anneau de santé et l’agent ; la recherche en haut, la liste et la fiche de Banque côte à côte, la barre d’état en pied ; un clic sur la recherche, ou Ctrl K, ouvre la palette de commandes avec ses suggestions et ses actions. Enfin l’appli de bureau pour Windows et Linux : sa propre barre de titre avec le logo, la recherche au centre, la cloche, le thème, puis réduire, agrandir et fermer ; Ctrl Maj Espace la cache puis la ramène depuis n’importe où ; quand tu verrouilles ta session avec Win L, le coffre se verrouille aussi et affiche « Bon retour, Tristan. ». Sous la scène, une règle montre la largeur mesurée, 390 px puis 1280 px, face au seuil WIDE_FROM de 900 px. À droite, les lignes de Shell.tsx qui choisissent la forme : wide si la largeur atteint WIDE_FROM, isDesktop si window.serenityDesktop existe, puis mobile, web ou desktop, le mot de la forme en cours éclairé. Trois cartes se construisent : téléphone, moins de 900 px, cinq onglets en bas ; navigateur, dès 900 px, barre latérale, recherche qui ouvre la palette, barre d’état ; appli de bureau, Windows et Linux, sa barre de titre, le verrouillage avec la session, Ctrl Maj Espace, une seule instance. En bas, ce qui change : la mise en page selon la largeur, et dans l’appli de bureau le pont window.serenityDesktop pour les boutons de la fenêtre et l’ordre de verrouiller ; ce qui ne change pas : le même client web servi par ton serveur, la crypto dans la page, aucun code du coffre dans l’appli de bureau.',
    'Three forms, one code. On the left, the same app in its three forms, on the real screens. First the phone, under 900 px: the vault, with health at 67, Bank and Spotify protected by you, Netflix handed to the agent, and five tabs at the bottom; a tap on Codes opens the 2FA codes, with the Netflix code computed on the device. Then the browser, from 900 px: a 248 px sidebar with the logo, the four screens, the two zones, the health ring and the agent; the search on top, the list and the Bank entry side by side, the status bar at the foot; a click on the search, or Ctrl K, opens the command palette with its suggestions and actions. Last, the desktop app for Windows and Linux: its own title bar with the logo, search in the middle, the bell, the theme, then minimise, maximise and close; Ctrl Shift Space hides it and brings it back from anywhere; when you lock your session with Win L, the vault locks too and shows “Welcome back, Tristan.”. Under the stage, a ruler shows the measured width, 390 px then 1280 px, against the 900 px WIDE_FROM threshold. On the right, the lines of Shell.tsx that pick the form: wide when the width reaches WIDE_FROM, isDesktop when window.serenityDesktop exists, then mobile, web or desktop, the word of the current form lit. Three cards build up: phone, under 900 px, five tabs at the bottom; browser, from 900 px, sidebar, search that opens the palette, status bar; desktop app, Windows and Linux, its title bar, locking with the session, Ctrl Shift Space, a single instance. At the bottom, what changes: the layout from the width, and in the desktop app the window.serenityDesktop bridge for the window buttons and the order to lock; what does not: the same web client served by your server, the crypto in the page, no vault code in the desktop app.'));
};

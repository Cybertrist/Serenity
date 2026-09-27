// The large-screen plate of "The screens": the desktop app big, then the
// web client in a browser, a still plate like the phone one.
//
// Layout: the desktop app (31-appli-coffre) takes two thirds of the first
// row; two browser windows stack on its right, sized so the column ends
// exactly where the big window's caption does. The second row holds three
// more browser windows. No empty cell, no half-empty column.
//
// The desktop app draws its own title bar, so its frame is a bare window.
// The browser shots get a thin address strip, so the two forms read apart.
module.exports = (O) => {
  const { t, svg, texte, entete, lignes, capture, icone, id, TITRE, TEXTE, DISCRET, MONO } = O;

  const X0 = 48, W = 1184, GX = 52, GY = 18;
  const BAR = 28;        // browser address strip
  const CAP = 66;        // caption block under a window
  const R = 1.6;         // every shot is 16:10
  // Big (B) and side (S) widths: B / R + CAP = 2 (BAR + S / R) + 2 CAP + GY.
  const S = Math.round((W - GX - R * (2 * BAR + CAP + GY)) / 3);
  const B = W - GX - S;
  const Y0 = 96;

  let corps = entete(t('SUR GRAND ÉCRAN', 'ON A LARGE SCREEN'),
    t('L’appli de bureau, puis le client web dans un navigateur.', 'The desktop app, then the web client in a browser.'));

  /// A window holding shot [cle], [l] wide, top left at (x, y). With
  /// [navigateur], a thin address strip sits above the page.
  function fenetre(cle, x, y, l, navigateur) {
    const h = l / R + (navigateur ? BAR : 0);
    const c = id('cadre');
    let s = `<rect x="${x}" y="${y}" width="${l}" height="${h}" rx="10" fill="#070A12" filter="url(#ombreFlottante)"/>
      <clipPath id="${c}"><rect x="${x}" y="${y}" width="${l}" height="${h}" rx="10"/></clipPath><g clip-path="url(#${c})">`;
    if (navigateur) {
      s += `<rect x="${x}" y="${y}" width="${l}" height="${BAR}" fill="#151B26"/>
        <line x1="${x}" y1="${y + BAR - 0.5}" x2="${x + l}" y2="${y + BAR - 0.5}" stroke="#2A3342"/>`;
      const pl = Math.min(220, l - 90);
      s += `<rect x="${x + (l - pl) / 2}" y="${y + 5}" width="${pl}" height="${BAR - 10}" rx="9" fill="#0B1019" stroke="#2A3342"/>`;
      s += icone('LockSimple', x + (l - pl) / 2 + 9, y + 9, 11, DISCRET);
      s += texte(x + (l - pl) / 2 + 25, y + 18.5, 'coffre.exemple.fr', { taille: 12, couleur: '#8F9BAC' });
    }
    s += capture(cle, x, y + (navigateur ? BAR : 0), l, l / R) + '</g>';
    s += `<rect x="${x + 0.5}" y="${y + 0.5}" width="${l - 1}" height="${h - 1}" rx="10" fill="none" stroke="#3A4556" stroke-opacity="0.9"/>`;
    return { svg: s, bas: y + h };
  }

  /// The caption under a window, left aligned on it.
  function legende(x, y, l, titre, phrase) {
    let s = texte(x + 2, y + 28, titre, { taille: 15, couleur: TITRE, poids: 600 });
    lignes(phrase, 13, l - 4).slice(0, 2).forEach((ln, k) => { s += texte(x + 2, y + 49 + k * 19, ln, { taille: 13, couleur: TEXTE }); });
    return s;
  }

  // ------------------------------------------------------- first row
  const grand = fenetre('31-appli-coffre', X0, Y0, B, false);
  corps += grand.svg + legende(X0, grand.bas, B, t('L’appli de bureau, Windows et Linux', 'The desktop app, Windows and Linux'),
    t('Sa propre barre de titre : le logo, la recherche au centre, la cloche, le thème, puis réduire, agrandir et fermer.',
      'Its own title bar: the logo, search in the middle, the bell, the theme, then minimise, maximise and close.'));
  const XS = X0 + B + GX;
  const a = fenetre('20-bureau-agent', XS, Y0, S, true);
  corps += a.svg + legende(XS, a.bas, S, t('L’agent', 'The agent'), t('Le kill switch et la rotation qui t’attend.', 'The kill switch and the rotation waiting for you.'));
  const p = fenetre('18b-bureau-palette', XS, a.bas + CAP + GY, S, true);
  corps += p.svg + legende(XS, p.bas, S, t('La palette', 'The palette'), t('Ctrl K : une entrée ou une action.', 'Ctrl K: an entry or an action.'));

  // ------------------------------------------------------ second row
  const Y2 = Math.max(grand.bas, p.bas) + CAP + 26;
  const L3 = (W - 2 * GX) / 3;
  const bas = [
    ['20d-bureau-fuites', t('Fuites', 'Breaches'), t('La santé du coffre et comment la veille vérifie.', 'Vault health, and how the watch checks.')],
    ['22-bureau-reglages', t('Réglages', 'Settings'), t('Verrouillage, veille, import, appareils.', 'Lock, watch, import, devices.')],
    ['26-clair-coffre', t('Le thème clair', 'The light theme'), t('Le même coffre, de jour.', 'The same vault, by day.')],
  ];
  let fin = 0;
  bas.forEach(([cle, titre, phrase], i) => {
    const x = X0 + i * (L3 + GX);
    const f = fenetre(cle, x, Y2, L3, true);
    corps += f.svg + legende(x, f.bas, L3, titre, phrase);
    fin = f.bas + CAP;
  });

  svg('captures-bureau.svg', 1280, Math.round(fin + 22), corps, t(
    'Six grands écrans de Serenity, chacun avec sa légende. En haut à gauche, en grand, l’appli de bureau pour Windows et Linux : sa propre barre de titre avec le logo, la recherche au centre, la cloche, le thème et les boutons réduire, agrandir et fermer ; en dessous, la barre latérale avec le coffre, les codes 2FA, les fuites, l’agent et les deux zones, la liste où Banque et Spotify sont protégés par toi et Netflix confié à l’agent, et la fiche de Banque ouverte à droite. À sa droite, dans un navigateur, l’écran de l’agent avec le kill switch en marche, l’activité du jour et la rotation de Netflix qui attend ton accord ; puis la palette de commandes ouverte par Ctrl K, avec ses suggestions et ses actions. En bas, trois fenêtres de navigateur : les fuites, avec la santé du coffre à 67, les compteurs, l’alerte de Netflix et l’explication de la veille ; les réglages, ouverts sur le verrouillage automatique après 15 minutes ; et le coffre en thème clair.',
    'Six large Serenity screens, each with its caption. Top left, large, the desktop app for Windows and Linux: its own title bar with the logo, search in the middle, the bell, the theme and the minimise, maximise and close buttons; below it, the sidebar with the vault, 2FA codes, breaches, the agent and the two zones, the list where Bank and Spotify are protected by you and Netflix handed to the agent, and the Bank entry open on the right. To its right, in a browser, the agent screen with the kill switch running, the day’s activity and the Netflix rotation waiting for your approval; then the command palette opened by Ctrl K, with its suggestions and actions. At the bottom, three browser windows: breaches, with the vault health at 67, the counters, the Netflix alert and how the watch works; settings, open on the automatic lock after 15 minutes; and the vault in the light theme.'));
};

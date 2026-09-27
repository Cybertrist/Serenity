// The features, in motion: the opening diagram of the README.
//
// Eleven features, eleven equal slices of the cycle. For each one the
// device on the left replays the real screen (the phone for the first
// seven, the desktop window for the last four, never both at once), and
// the mechanism behind it builds up on the right. At the bottom, the eleven
// tiles act as a table of contents and keep a tick once seen.
//
// Screens come from _ecrans.js (vault, entry, dialog) and _ecrans-tour.js
// (lock screen, Breaches, Agent, Codes, the desktop screens). Every word of
// the interface is the app's own (web/src), every figure comes from the
// docs (crypto.md, 05-veille.md, 06-agent.md, 07-interface.md, design.md).
module.exports = (O) => {
  const E = require('./_ecrans.js')(O);
  const R = require('./_ecrans-tour.js')(O);
  const { t, svg, texte, paragraphe, entete, rubrique, fondu, visible, entre, glisse, toucher, carte, icone, anneau,
    telephone, fenetre, fil, bille, pointe, kbd, largeur, toast, ongletsBas, APP, MONO, SANS,
    CARTE, BORD, TITRE, TEXTE, DISCRET, FIL, ACCENT, ACCENT_TEXTE, VERT, AMBRE, ROUGE, ENTREES } = O;
  const N = 11, C = 77;
  const A = (k) => k / N + 0.002, B = (k) => (k + 1) / N - 0.002;
  /// An instant inside slice k, as a fraction of the slice.
  const dans = (k, f) => A(k) + (B(k) - A(k)) * f;
  const BUREAU = 7; // the first step shown on the desktop window
  const r1 = (v) => Math.round(v * 10) / 10;

  let corps = entete(t('LES FONCTIONNALITÉS', 'THE FEATURES'),
    t('Onze gestes, chacun avec ce qu’il fait vraiment. Rien ne sort en clair de ton appareil.',
      'Eleven gestures, each with what it really does. Nothing leaves your device in the clear.'));

  // ------------------------------------------------------------ the frame
  const Y0 = 84, HB = 580;
  const T = telephone(48, Y0, HB);
  const W = fenetre(48, Y0 + (HB - 450) / 2, 720);
  const P1 = { x: 362, y: Y0, l: 870, h: HB };
  const P2 = { x: 792, y: Y0, l: 440, h: HB };
  const panneau = (P) => (k) => (k < BUREAU ? P1 : P2);
  const P = panneau();
  // Where each mechanism starts: under the header and the state line.
  const Z = (k) => { const p = P(k); return { x: p.x + 24, r: p.x + p.l - 24, l: p.l - 48, y: p.y + (k < BUREAU ? 160 : 178) }; };

  // --------------------------------------------------------------- helpers
  /// A card of the mechanism: a title, then one or two short lines.
  function boite(x, y, l, h, titre, sous = [], { allume = null, mono = false, taille = 14, st = 12.5 } = {}) {
    let s = carte(x, y, l, h, { allume, cycle: C, rx: 12 });
    s += texte(x + 18, y + 29, titre, { taille, couleur: TITRE, poids: 600, ...(mono ? { police: MONO } : {}) });
    sous.forEach((l2, i) => { s += texte(x + 18, y + 52 + i * 19, l2, { taille: st, couleur: TEXTE }); });
    return s;
  }
  /// A wire with its arrow head, lit once the ball has gone through.
  const fleche = (chemin, de, a, fin, [px, py, ang]) => fil(C, chemin, a, fin) + pointe(px, py, ang) + bille(C, chemin, de, a);
  /// A chip of the diagram: dashed and grey, then lit between two instants.
  function jeton(x, y, s, { allume = null, couleur = ACCENT, h = 28, taille = 12.5, mono = false, icone: ic = null } = {}) {
    const lt = mono ? s.length * taille * 0.6 : largeur(s, taille, { poids: 600 });
    const li = ic ? taille + 6 : 0;
    const l = Math.round(lt + li + 28);
    const encre = couleur === ACCENT ? ACCENT_TEXTE : couleur;
    const corpsJ = (c, poids) => (ic ? icone(ic, x + 14, y + h / 2 - taille / 2 - 0.5, taille + 1, c) : '') +
      texte(x + 14 + li, y + h / 2 + taille * 0.36, s, { taille, couleur: c, poids, ...(mono ? { police: MONO } : {}) });
    const gris = `<rect x="${x}" y="${y}" width="${l}" height="${h}" rx="${h / 2}" fill="none" stroke="${FIL}" stroke-dasharray="4 4"/>` + corpsJ(DISCRET, 500);
    let r = allume ? `<g>${cache(allume[0], allume[1])}${gris}</g>` : gris;
    if (allume) r += `<g opacity="0">${visible(C, allume[0], allume[1], 0.003)}<rect x="${x}" y="${y}" width="${l}" height="${h}" rx="${h / 2}" fill="${couleur}" fill-opacity="0.13" stroke="${couleur}" stroke-opacity="0.8"/>${corpsJ(encre, 600)}</g>`;
    return { svg: r, l };
  }
  /// The opacity of what steps aside while something else shows, from [de] to [a].
  function cache(de, a, d = 0.003) {
    const e = [[0, 1]];
    if (de > 0) e.push([de, 1]);
    e.push([Math.min(1, de + d), 0]);
    if (a < 1) e.push([Math.max(a - d, de + d), 0], [a, 1], [1, 1]); else e.push([1, 0]);
    return fondu('opacity', C, e);
  }
  /// Values that take over from each other at given instants.
  const compteur = (x, y, valeurs, instants, fin, opts) => valeurs.map((v, i) =>
    entre(C, instants[i], i === valeurs.length - 1 ? fin : instants[i + 1], texte(x, y, v, opts), 0.0015)).join('');
  /// The line under a panel's header that says what is happening now.
  const etat = (k, liste) => {
    const p = P(k);
    return liste.map(([de, a, s]) => entre(C, de, a,
      `<circle cx="${p.x + 29}" cy="${p.y + 125.5}" r="4.5" fill="${ACCENT}"/>` +
      paragraphe(p.x + 44, p.y + 130, s, { taille: 13.5, max: p.l - 68, couleur: TITRE, poids: 500, interligne: 20 }), 0.003)).join('');
  };
  /// A key combination shown over the desktop window, big, as it is typed.
  function frappeClavier(keys, de, a) {
    let l = 0;
    const tailles = keys.map((k) => Math.max(46, k.length * 15 + 26));
    l = tailles.reduce((x, y) => x + y, 0) + (keys.length - 1) * 10 + 32;
    const x0 = 764 - l / 2, y0 = 640;
    let s = `<rect x="${x0}" y="${y0}" width="${l}" height="70" rx="16" fill="#05070C" fill-opacity="0.9" stroke="${APP.line}" stroke-opacity="0.3" filter="url(#ombreFlottante)"/>`;
    let x = x0 + 16;
    keys.forEach((k, i) => {
      s += `<rect x="${x}" y="${y0 + 13}" width="${tailles[i]}" height="44" rx="9" fill="#94A3C4" fill-opacity="0.12" stroke="${APP.line}" stroke-opacity="0.45"/>`;
      s += texte(x + tailles[i] / 2, y0 + 42, k, { taille: 22, couleur: APP.text, police: MONO, poids: 600, ancre: 'middle' });
      x += tailles[i] + 10;
    });
    return entre(C, de, a, s, 0.003);
  }
  /// Big keycaps on the diagram side. Returns { svg, l }.
  function touchesD(x, y, keys, { h = 30, taille = 13, allume = null } = {}) {
    let s = '', cx = x;
    keys.forEach((k) => {
      const l = Math.max(h, Math.round(k.length * taille * 0.6 + 18));
      s += `<rect x="${cx}" y="${y}" width="${l}" height="${h}" rx="7" fill="#94A3C4" fill-opacity="0.06" stroke="${FIL}" stroke-width="1.4"/>`;
      if (allume) s += `<rect x="${cx}" y="${y}" width="${l}" height="${h}" rx="7" fill="${ACCENT}" fill-opacity="0.15" stroke="${ACCENT}" stroke-width="1.4" opacity="0">${visible(C, allume[0], allume[1], 0.003)}</rect>`;
      s += texte(cx + l / 2, y + h / 2 + taille * 0.36, k, { taille, couleur: TITRE, police: MONO, poids: 600, ancre: 'middle' });
      cx += l + 6;
    });
    return { svg: s, l: cx - x - 6 };
  }

  const scenes = [], meca = [];

  // The step titles and the icons of the tiles.
  const ETAPES = [
    ['LockKeyOpen', t('Déverrouiller', 'Unlock'), t('Ton mot de passe maître devient une clé, sur ton appareil et nulle part ailleurs.', 'Your master password becomes a key, on your device and nowhere else.')],
    ['Vault', t('Une phrase d’abord', 'A sentence first'), t('Le coffre s’ouvre sur son état, calculé à partir des vraies alertes.', 'The vault opens on its state, worked out from the real alerts.')],
    ['Key', t('La fiche', 'The entry'), t('Copier, voir la force, lire le code du moment. Le presse-papiers se vide seul.', 'Copy, see the strength, read the current code. The clipboard empties itself.')],
    ['Sparkle', t('Confier à l’agent', 'Hand to the agent'), t('Un geste, entrée par entrée, avec une confirmation. Jamais un réglage global.', 'A gesture, one entry at a time, confirmed. Never a global setting.')],
    ['Target', t('La veille', 'The watch'), t('Les fuites connues, vérifiées sans que ton mot de passe sorte, même haché.', 'Known breaches, checked without your password leaving, even hashed.')],
    ['ListChecks', t('Tu approuves', 'You approve'), t('L’agent propose une rotation en quatre étapes. Rien ne bouge sans ta réponse.', 'The agent proposes a rotation in four steps. Nothing moves without your answer.')],
    ['ClockCountdown', t('Codes 2FA', '2FA codes'), t('Calculés sur place, même hors ligne. Aucune requête pour un code.', 'Computed on the spot, even offline. No request for a code.')],
    ['Power', t('Kill switch', 'Kill switch'), t('Maintenu 1 s, il coupe l’agent net.', 'Held for 1 s, it cuts the agent off.')],
    ['Command', t('Palette Ctrl K', 'Ctrl K palette'), t('Chaque entrée, chaque écran, chaque action, au clavier.', 'Every entry, screen and action, from the keyboard.')],
    ['ArrowSquareIn', t('Import', 'Import'), t('Google, Bitwarden, Authenticator : chiffré ici.', 'Google, Bitwarden, Authenticator: encrypted here.')],
    ['ShieldCheck', t('Rien en clair', 'Nothing in the clear'), t('Le serveur ne garde que des blocs chiffrés, et n’écoute que 127.0.0.1.', 'The server only keeps encrypted blocks, and only listens on 127.0.0.1.')],
  ];

  // The header of the panel, its own for each step.
  const tetePanneau = (k) => {
    const p = P(k);
    const [ic, titre, phrase] = ETAPES[k];
    return `<rect x="${p.x + 22}" y="${p.y + 20}" width="36" height="36" rx="10" fill="${ACCENT}" fill-opacity="0.12" stroke="${ACCENT}" stroke-opacity="0.45"/>
      ${icone(ic, p.x + 30, p.y + 28, 20, ACCENT_TEXTE)}
      ${texte(p.x + 72, p.y + 37, titre, { taille: 16.5, couleur: TITRE, poids: 600 })}
      ${paragraphe(p.x + 72, p.y + 64, phrase, { taille: 13, max: p.l - 96, couleur: TEXTE, interligne: 19 })}
      ${texte(p.x + p.l - 22, p.y + 36, `${String(k + 1).padStart(2, '0')} / 11`, { taille: 12, couleur: DISCRET, police: MONO, poids: 600, ancre: 'end' })}
      <rect x="${p.x + p.l - 112}" y="${p.y + 43}" width="90" height="3" rx="1.5" fill="${FIL}"/>
      <rect x="${p.x + p.l - 112}" y="${p.y + 43}" height="3" rx="1.5" width="0" fill="${ACCENT}">${fondu('width', C, [[0, 0], [A(k), 0], [B(k), 90], [B(k) + 0.001, 0], [1, 0]])}</rect>
      <line x1="${p.x + 22}" y1="${p.y + 104}" x2="${p.x + p.l - 22}" y2="${p.y + 104}" stroke="${BORD}"/>`;
  };

  // =========================================================== 1. unlock
  {
    const k = 0;
    const tape = [dans(k, 0.1), dans(k, 0.33)], pret = dans(k, 0.35), appui = dans(k, 0.4);
    const couvre = dans(k, 0.46), balaye = [dans(k, 0.48), dans(k, 0.62)], leve = [dans(k, 0.66), dans(k, 0.75)];
    const argon = dans(k, 0.46), mk = dans(k, 0.53), cles = dans(k, 0.6), uk = dans(k, 0.68), ak = dans(k, 0.75);
    // The phone: the password typed, the button wakes up, then the veil
    // rises, the beam crosses, and the vault is there when it lifts.
    const c = O.id('points');
    const points = `<clipPath id="${c}"><rect x="46" y="600" height="30" width="0">${fondu('width', C, [[0, 0], [tape[0], 0], [tape[1], 170], [1, 170]])}</rect></clipPath>
      <g clip-path="url(#${c})">${texte(49, 622, '• • • • • • • • • • • • • •', { taille: 15, couleur: APP.text, espace: 0.4 })}</g>`;
    let s = entre(C, 0, couvre, R.verrouTel() + entre(C, 0, pret, R.boutonVerrou(false), 0.002) +
      entre(C, pret, 1, R.boutonVerrou(true), 0.002) + points + toucher(195, 669, C, appui), 0.002);
    s += entre(C, couvre, 1, E.coffre({ netflix: 'toi', sante: null, titreEtat: t('La veille répond…', 'The watch is answering…'), sousEtat: ' ' }), 0.002);
    const g = O.id('faisceau');
    s += `<g opacity="0">${visible(C, appui + 0.004, leve[1], 0.003)}<g>${glisse(C, [[0, '0 844'], [appui + 0.004, '0 844'], [couvre - 0.002, '0 0'], [leve[0], '0 0'], [leve[1], '0 -844'], [1, '0 -844']])}
      <linearGradient id="${g}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="0.5" stop-color="#FFFFFF" stop-opacity="0.85"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>
      <rect width="390" height="844" fill="#0B1633"/>
      ${O.rubans(390, 480, { amplitude: 120 })}
      <g>${glisse(C, [[0, '-200 0'], [balaye[0], '-200 0'], [balaye[1], '520 0'], [1, '520 0']])}<rect x="-60" y="-20" width="120" height="884" fill="url(#${g})" transform="skewX(-8)"/></g>
    </g></g>`;
    scenes.push(s);

    // The chain of keys (crypto.md, 3 and 4).
    const z = Z(k), w = 184, gap = (z.l - 4 * w) / 3, xs = [0, 1, 2, 3].map((i) => z.x + i * (w + gap));
    const ym = z.y + 110, h = 84;
    let m = '';
    const f1 = `M${xs[0] + w + 2} ${ym} H${xs[1] - 4}`, f2 = `M${xs[1] + w + 2} ${ym} H${xs[2] - 4}`;
    const f3 = `M${xs[2] + w + 2} ${ym} H${xs[2] + w + gap / 2} V${ym - 70} H${xs[3] - 4}`, f4 = `M${xs[2] + w + 2} ${ym} H${xs[2] + w + gap / 2} V${ym + 70} H${xs[3] - 4}`;
    m += fleche(f1, appui, argon, B(k), [xs[1] - 3, ym, 0]) + fleche(f2, argon + 0.004, mk, B(k), [xs[2] - 3, ym, 0]);
    m += fleche(f3, mk + 0.004, cles, B(k), [xs[3] - 3, ym - 70, 0]) + fleche(f4, mk + 0.004, cles, B(k), [xs[3] - 3, ym + 70, 0]);
    m += boite(xs[0], ym - h / 2, w, h, t('Mot de passe maître', 'Master password'), [t('dans ta tête', 'in your head'), t('jamais envoyé', 'never sent')], { allume: [tape[0], B(k)] });
    m += boite(xs[1], ym - h / 2, w, h, 'Argon2id', [t('64 Mio, 3 passes', '64 MiB, 3 passes'), t('sel de 16 octets', '16-byte salt')], { allume: [argon, B(k)] });
    m += boite(xs[2], ym - h / 2, w, h, 'MK', [t('32 octets', '32 bytes'), t('en mémoire, un instant', 'in memory, briefly')], { allume: [mk, B(k)], mono: true });
    m += boite(xs[3], ym - 70 - h / 2, w, h, 'AuthKey', [t('KDF srn-auth', 'KDF srn-auth'), t('hachée par le serveur', 'hashed by the server')], { allume: [cles, B(k)], mono: true });
    m += boite(xs[3], ym + 70 - h / 2, w, h, 'MEK', [t('KDF srn-wrap', 'KDF srn-wrap'), t('ouvre UK, puis AK', 'opens UK, then AK')], { allume: [cles + 0.004, B(k)], mono: true });
    // What stays in memory once the vault is open.
    const my = z.y + 262;
    m += `<rect x="${z.x}" y="${my}" width="${z.l}" height="52" rx="12" fill="${FIL}" fill-opacity="0.22"/>`;
    m += rubrique(z.x + 20, my + 31, t('EN MÉMOIRE', 'IN MEMORY'));
    const j1 = jeton(z.x + 160, my + 12, t('UK, la clé de ta zone', 'UK, the key to your zone'), { allume: [uk, B(k)] });
    const j2 = jeton(z.x + 160 + j1.l + 12, my + 12, t('AK, la clé d’agent', 'AK, the agent key'), { allume: [ak, B(k)] });
    m += j1.svg + j2.svg;
    m += texte(z.r - 20, my + 31, t('jamais stockés : mot de passe, MK', 'never stored: password, MK'), { taille: 12.5, couleur: DISCRET, ancre: 'end' });
    m += entre(C, cles, B(k), icone('ArrowSquareOut', z.x, z.y + 342, 16, ACCENT_TEXTE) +
      texte(z.x + 26, z.y + 355, t('POST /api/auth/unlock : le serveur compare AuthKey à son hachage et ouvre 15 min glissantes.', 'POST /api/auth/unlock: the server checks AuthKey against its hash and opens 15 rolling minutes.'), { taille: 12.5, couleur: TEXTE }), 0.003);
    m += texte(z.x, z.y + 382, t('Hors ligne, dériver et déchiffrer suffit pour lire ton coffre.', 'Offline, deriving and decrypting is enough to read your vault.'), { taille: 12.5, couleur: DISCRET });
    m += etat(k, [
      [A(k), appui, t('Tu tapes ton mot de passe maître. Il ne quitte pas l’appareil.', 'You type your master password. It does not leave the device.')],
      [appui, cles, t('Argon2id en fait une clé. Lent exprès : 64 Mio et 3 passes pour chaque essai.', 'Argon2id turns it into a key. Slow on purpose: 64 MiB and 3 passes for every guess.')],
      [cles, uk, t('MK donne deux sous-clés : AuthKey prouve que c’est toi, MEK ouvre ta clé UK.', 'MK gives two subkeys: AuthKey proves it is you, MEK opens your UK key.')],
      [uk, B(k), t('UK puis AK restent en mémoire. Le faisceau passe, le coffre est là.', 'UK then AK stay in memory. The beam goes by, the vault is there.')],
    ]);
    meca.push(m);
  }

  // ====================================================== 2. the vault
  {
    const k = 1, allume = [dans(k, 0.12), dans(k, 0.34)], pret = dans(k, 0.36), tape = dans(k, 0.84);
    // The health card, opaque so the ring can light up over it.
    const ticks = (cx, cy, taille) => (anneau(cx, cy, taille, 100, { valeur: false }).match(/<line[^>]*\/>/g) || [])
      .map((l, i) => `<g opacity="0">${fondu('opacity', C, [[0, 0], [allume[0] + ((allume[1] - allume[0]) * i) / 48, 0], [allume[0] + ((allume[1] - allume[0]) * i) / 48 + 0.001, 1], [1, 1]])}${l}</g>`).join('');
    let s = E.coffre({ netflix: 'toi' });
    s += `<rect x="18" y="122" width="354" height="68" rx="16" fill="${APP.glass}" stroke="${APP.line}" stroke-opacity="0.1"/>`;
    s += anneau(54, 156, 44, null, { valeur: false }) + ticks(54, 156, 44);
    s += entre(C, 0, pret, texte(54, 160.5, '…', { taille: 12, couleur: APP.text, poids: 600, ancre: 'middle' }) +
      texte(90, 161, t('La veille répond…', 'The watch is answering…'), { taille: 15, couleur: APP.text, poids: 600 }), 0.002);
    s += entre(C, pret, 1, texte(54, 160.5, '100', { taille: 12, couleur: APP.text, poids: 600, ancre: 'middle' }) +
      texte(90, 151, t('Tout va bien.', 'All is well.'), { taille: 15, couleur: APP.text, poids: 600 }) +
      texte(90, 172, t('Rien à signaler.', 'Nothing to report.'), { taille: 13, couleur: APP.muted }), 0.002);
    s += toucher(195, 379, C, tape);
    scenes.push(s);

    // The ring, big, and what lowers the score (design.md, app/health.ts).
    const z = Z(k), cx = z.x + 120, cy = z.y + 150;
    let m = anneau(cx, cy, 200, null, { valeur: false }) + ticks(cx, cy, 200);
    m += entre(C, A(k), pret, texte(cx, cy + 12, '…', { taille: 40, couleur: DISCRET, ancre: 'middle' }), 0.002);
    m += entre(C, pret, B(k), texte(cx, cy + 16, '100', { taille: 48, couleur: TITRE, poids: 600, ancre: 'middle' }), 0.002);
    // The three bands of the ring, under it.
    [[t('vert dès 85', 'green from 85'), VERT], [t('ambre dès 60', 'amber from 60'), AMBRE], [t('rouge dessous', 'red below'), ROUGE]].forEach(([mot, c2], i) => {
      const y = z.y + 285 + i * 24;
      m += `<circle cx="${cx - 58}" cy="${y - 4.5}" r="4.5" fill="${c2}"/>` + texte(cx - 44, y, mot, { taille: 13, couleur: TEXTE });
    });
    const bx = z.x + 290, bl = 250;
    m += rubrique(bx, z.y + 24, t('CE QUI FAIT BAISSER LE SCORE', 'WHAT LOWERS THE SCORE'));
    [[t('Vu dans une fuite', 'Seen in a breach'), 1, '1'], [t('Réutilisé', 'Reused'), 0.6, t('0,6', '0.6')], [t('Trop faible', 'Too weak'), 0.5, t('0,5', '0.5')], [t('Trop ancien', 'Too old'), 0.3, t('0,3', '0.3')]].forEach(([mot, p, v], i) => {
      const y = z.y + 62 + i * 40;
      m += texte(bx, y, mot, { taille: 13.5, couleur: TITRE, poids: 500 });
      m += `<rect x="${bx + 160}" y="${y - 10}" width="${bl}" height="10" rx="5" fill="${FIL}" fill-opacity="0.5"/>`;
      m += `<rect x="${bx + 160}" y="${y - 10}" width="${r1(bl * p)}" height="10" rx="5" fill="${ACCENT}" fill-opacity="0.75"/>`;
      m += texte(z.r, y, v, { taille: 13, couleur: ACCENT_TEXTE, police: MONO, poids: 600, ancre: 'end' });
    });
    m += texte(bx, z.y + 222, t('Adresse e-mail dans une fuite', 'Email address in a breach'), { taille: 13.5, couleur: TITRE, poids: 500 });
    m += texte(z.r, z.y + 222, t('5 points', '5 points'), { taille: 13, couleur: ACCENT_TEXTE, police: MONO, poids: 600, ancre: 'end' });
    m += `<line x1="${bx}" y1="${z.y + 246}" x2="${z.r}" y2="${z.y + 246}" stroke="${BORD}"/>`;
    m += paragraphe(bx, z.y + 274, t('Chaque entrée pèse selon sa pire alerte. Le score, c’est la part du coffre intacte, moins 5 points par adresse touchée.',
      'Each entry weighs by its worst alert. The score is the share of the vault left untouched, less 5 points per address hit.'), { taille: 12.5, max: z.r - bx, couleur: TEXTE, interligne: 19 });
    m += paragraphe(bx, z.y + 338, t('La lumière du fond suit le même état : bleue au calme, ambre sur une fuite, grise quand l’agent est arrêté.',
      'The background light follows the same state: blue when calm, amber on a breach, grey when the agent is stopped.'), { taille: 12.5, max: z.r - bx, couleur: DISCRET, interligne: 19 });
    m += etat(k, [
      [A(k), allume[0], t('Tant que la veille n’a pas répondu, rien ne dit « Tout va bien ».', 'Until the watch has answered, nothing says “All is well”.')],
      [allume[0], pret, t('L’anneau s’allume : 48 graduations, jusqu’au score tiré des vraies alertes.', 'The ring lights up: 48 ticks, up to the score drawn from the real alerts.')],
      [pret, tape, t('Aucune alerte : 100, et une phrase simple. Le reste vient après.', 'No alert: 100, and a plain sentence. The rest comes after.')],
      [tape, B(k), t('Sous la phrase, les deux zones : ce que toi seul lis, ce que l’agent peut lire.', 'Under the sentence, the two zones: what only you read, what the agent can read.')],
    ]);
    meca.push(m);
  }

  // ======================================================= 3. the entry
  {
    const k = 2, copie = dans(k, 0.28), vide = dans(k, 0.86), code = dans(k, 0.6);
    // The countdown of the code, second by second (24 s on the screenshot).
    const fond = '#0D121E';
    let s = E.fiche({ zone: 'toi', secondes: 24 });
    s += `<rect x="140" y="300" width="70" height="28" fill="${fond}"/>`;
    for (let i = 0; i < 7; i++) {
      const sec = 24 - i;
      s += entre(C, i === 0 ? 0 : A(k) + (i / 7) * (B(k) - A(k)), i === 6 ? 1 : A(k) + ((i + 1) / 7) * (B(k) - A(k)),
        `<circle cx="152" cy="314" r="9" fill="none" stroke="${APP.track}" stroke-opacity="0.3" stroke-width="2.4"/>
        <circle cx="152" cy="314" r="9" fill="none" stroke="${APP.accent}" stroke-width="2.4" stroke-dasharray="${r1((56.5 * sec) / 30)} 56.5" transform="rotate(-90 152 314)"/>
        ${texte(172, 319, `${sec} s`, { taille: 12.5, couleur: APP.faint })}`, 0.0008);
    }
    s += toucher(195, 808, C, copie);
    s += entre(C, copie + 0.004, vide, toast(195, 712, t('Mot de passe copié. Effacé du presse-papiers dans 30 s.', 'Password copied. Cleared from the clipboard in 30 s.')), 0.003);
    scenes.push(s);

    const z = Z(k), lg = (z.l - 30) / 2, xd = z.x + lg + 30, y = z.y + 10, h = 220;
    let m = carte(z.x, y, lg, h, { allume: [copie, vide], cycle: C, rx: 12 });
    m += texte(z.x + 20, y + 32, t('Presse-papiers', 'Clipboard'), { taille: 14.5, couleur: TITRE, poids: 600 });
    m += jeton(z.x + 20, y + 52, t('vide', 'empty'), {}).svg.replace(/^/, `<g opacity="1">${fondu('opacity', C, [[0, 1], [copie - 0.002, 1], [copie, 0], [vide, 0], [vide + 0.003, 1], [1, 1]])}`) + '</g>';
    m += entre(C, copie, vide, jeton(z.x + 20, y + 52, t('le mot de passe de Netflix', 'the Netflix password'), { allume: [copie, vide], icone: 'Copy' }).svg.replace(/stroke-dasharray="4 4"/, ''), 0.002);
    const bw = lg - 40;
    m += `<rect x="${z.x + 20}" y="${y + 116}" width="${bw}" height="10" rx="5" fill="${FIL}" fill-opacity="0.5"/>`;
    m += `<rect x="${z.x + 20}" y="${y + 116}" height="10" rx="5" fill="${ACCENT}" width="0">${fondu('width', C, [[0, 0], [copie, 0], [copie + 0.002, bw], [vide, 0], [1, 0]])}</rect>`;
    m += texte(z.x + 20, y + 148, '30 s', { taille: 12.5, couleur: TEXTE, police: MONO });
    m += texte(z.x + 20 + bw, y + 148, '0 s', { taille: 12.5, couleur: TEXTE, police: MONO, ancre: 'end' });
    m += texte(z.x + 20 + bw / 2, y + 148, t('temps accéléré', 'time sped up'), { taille: 12, couleur: DISCRET, ancre: 'middle' });
    m += paragraphe(z.x + 20, y + 184, t('Vidé tout seul après 30 s, au verrouillage, ou quand la page se ferme.', 'Emptied by itself after 30 s, on lock, or when the page closes.'), { taille: 12.5, max: lg - 40, couleur: TEXTE, interligne: 19 });
    // The one-time code: computed here, from the entry's secret.
    m += carte(xd, y, lg, h, { allume: [A(k), B(k)], cycle: C, rx: 12 });
    m += texte(xd + 20, y + 32, t('Code à usage unique', 'One-time code'), { taille: 14.5, couleur: TITRE, poids: 600 });
    const s1 = jeton(xd + 20, y + 52, t('secret de l’entrée', 'the entry’s secret'), { allume: [A(k), B(k)] });
    const s2 = jeton(xd + 20 + s1.l + 10, y + 52, t('heure, par 30 s', 'time, in 30 s steps'), { allume: [A(k), B(k)] });
    m += s1.svg + s2.svg;
    m += `<path d="M${xd + 40} ${y + 84} V${y + 100}" stroke="${FIL}" stroke-width="1.8"/>` + pointe(xd + 40, y + 102, 90);
    m += jeton(xd + 20, y + 106, t('HMAC-SHA1, Web Crypto', 'HMAC-SHA1, Web Crypto'), { allume: [A(k), B(k)] }).svg;
    m += `<path d="M${xd + 40} ${y + 138} V${y + 152}" stroke="${FIL}" stroke-width="1.8"/>` + pointe(xd + 40, y + 154, 90);
    m += texte(xd + 20, y + 192, '933 532', { taille: 30, couleur: TITRE, police: MONO, poids: 600 });
    m += compteur(xd + lg - 20, y + 190, [24, 23, 22, 21, 20, 19, 18].map((v) => t(`encore ${v} s`, `${v} s left`)),
      [0, 1, 2, 3, 4, 5, 6].map((i) => (i === 0 ? A(k) : A(k) + (i / 7) * (B(k) - A(k)))), B(k), { taille: 12.5, couleur: TEXTE, ancre: 'end' });
    // The strength of the password, under both.
    const fy = y + h + 36;
    const seg = (z.l - 590) / 4;
    for (let i = 0; i < 4; i++) m += `<rect x="${r1(z.x + i * (seg + 5))}" y="${fy - 6}" width="${r1(seg)}" height="6" rx="3" fill="${i < 2 ? AMBRE : FIL}" fill-opacity="${i < 2 ? 1 : 0.6}"/>`;
    m += texte(z.x + 4 * (seg + 5) + 14, fy, t('Force en quatre segments. Ici, « Faible, 11 caractères » : l’appli le dit sans détour.', 'Strength in four segments. Here, “Weak, 11 characters”: the app says it plainly.'), { taille: 12.5, couleur: TEXTE });
    m += texte(z.x, fy + 40, t('Le code se lit sans rien demander au serveur. Seul le secret, rangé dans l’entrée chiffrée, le fait tourner.', 'The code is read without asking the server anything. Only the secret, kept in the encrypted entry, drives it.'), { taille: 12.5, couleur: DISCRET });
    m += etat(k, [
      [A(k), copie, t('La fiche montre l’essentiel : identifiant, mot de passe masqué, sa force, le code, le site.', 'The entry shows the essentials: username, masked password, its strength, the code, the site.')],
      [copie, code, t('Copié, le mot de passe quitte le presse-papiers 30 s plus tard.', 'Once copied, the password leaves the clipboard 30 s later.')],
      [code, B(k), t('Le code change toutes les 30 s. Il est calculé ici, depuis le secret de l’entrée.', 'The code changes every 30 s. It is computed here, from the entry’s secret.')],
    ]);
    meca.push(m);
  }

  // ==================================================== 4. hand over
  {
    const k = 3, tapeC = dans(k, 0.14), dialog = dans(k, 0.17), tapeOk = dans(k, 0.4), confie = dans(k, 0.43);
    const depart = dans(k, 0.44), arrive = dans(k, 0.56);
    let s = entre(C, 0, confie, E.fiche({ zone: 'toi', secondes: 17 }) + toucher(114, 558, C, tapeC), 0.002);
    const d = E.dialogue({
      titre: t('Confier cette entrée à l’agent ?', 'Hand this entry to the agent?'),
      texte: t('Le serveur pourra la déchiffrer pour surveiller les fuites et changer son mot de passe. Il pourra aussi calculer son code à deux facteurs, ce dont l’agent a besoin pour se reconnecter. Tu peux la reprendre à tout moment.',
        'The server will be able to decrypt it, to watch for breaches and change its password. It will also be able to compute its two-factor code, which the agent needs to sign in again. You can take it back at any time.'),
      valider: t('Confier', 'Hand over'),
    });
    s += entre(C, dialog, confie, d.svg + toucher(279, d.boutons, C, tapeOk), 0.002);
    s += entre(C, confie, 1, E.fiche({ zone: 'agent', secondes: 14 }) + entre(C, confie + 0.004, B(k), toast(195, 712, t('Confiée à l’agent.', 'Handed to the agent.')), 0.003), 0.002);
    scenes.push(s);

    const z = Z(k), lg = (z.l - 30) / 2, y = z.y + 6, zh = 124;
    let m = '';
    [[z.x, 'ShieldCheck', t('Protégé par toi', 'Protected by you'), t('clé UK, toi seul la lis', 'key UK, only you read it'), [A(k), depart]],
      [z.x + lg + 30, 'Sparkle', t('Confié à l’agent', 'Handed to the agent'), t('clé AK, toi et l’agent', 'key AK, you and the agent'), [arrive, B(k)]]].forEach(([x, ic, titre, sous, al]) => {
      m += carte(x, y, lg, zh, { allume: al, cycle: C, rx: 12 });
      m += `<rect x="${x + 18}" y="${y + 18}" width="32" height="32" rx="9" fill="${ACCENT}" fill-opacity="0.12"/>` + icone(ic, x + 25, y + 25, 18, ACCENT_TEXTE);
      m += texte(x + 62, y + 32, titre, { taille: 14.5, couleur: TITRE, poids: 600 }) + texte(x + 62, y + 50, sous, { taille: 12.5, couleur: TEXTE });
    });
    const tuile = (e) => O.monogramme(e.nom, 0, 0, 30, { cle: e.cle }) + texte(40, 20, e.nom, { taille: 13.5, couleur: TITRE, poids: 500 });
    const yt = y + 74;
    m += `<g transform="translate(${z.x + 20} ${yt})">${tuile(ENTREES.banque)}</g>`;
    m += `<g transform="translate(${z.x + 270} ${yt})"><g>${glisse(C, [[0, '0 0'], [arrive, '0 0'], [arrive + 0.012, '-125 0'], [B(k), '-125 0'], [B(k) + 0.004, '0 0'], [1, '0 0']])}${tuile(ENTREES.spotify)}</g></g>`;
    m += entre(C, A(k), depart, `<g transform="translate(${z.x + 145} ${yt})">${tuile(ENTREES.netflix)}</g>`, 0.003);
    m += entre(C, depart + 0.003, arrive, `<g transform="translate(${z.x + 145} ${yt})"><rect width="110" height="30" rx="9" fill="none" stroke="${FIL}" stroke-dasharray="4 4"/></g>`, 0.003);
    m += entre(C, arrive, B(k), `<g transform="translate(${z.x + lg + 50} ${yt})">${tuile(ENTREES.netflix)}</g>`, 0.003);
    m += entre(C, A(k), arrive, texte(z.x + lg + 30 + lg / 2, yt + 20, t('Rien de confié pour l’instant.', 'Nothing handed over yet.'), { taille: 13, couleur: DISCRET, ancre: 'middle' }), 0.003);
    // What the phone does once you confirm (crypto.md 7.5).
    const py = y + zh + 64, ph = 84, pw = 184, pg = (z.l - 4 * pw) / 3;
    m += rubrique(z.x, py - 16, t('CE QUE FAIT TON APPAREIL QUAND TU CONFIRMES', 'WHAT YOUR DEVICE DOES WHEN YOU CONFIRM'));
    const boites = [
      [t('Bloc chiffré', 'Encrypted block'), [t('clé UK, révision 1', 'key UK, revision 1')], false],
      [t('Déchiffré', 'Decrypted'), [t('en mémoire seulement', 'in memory only')], false],
      [t('Rechiffré', 'Encrypted again'), [t('clé AK, nonce neuf', 'key AK, fresh nonce')], false],
      ['POST /delegate', ['confirm: true'], true],
    ];
    const debuts = [depart, depart + 0.02, depart + 0.04, depart + 0.06];
    boites.forEach(([titre, sous, mono], i) => {
      const x = z.x + i * (pw + pg);
      m += boite(x, py, pw, ph - 18, titre, sous, { allume: [debuts[i], B(k)], mono, taille: mono ? 13 : 14 });
      if (i < 3) {
        const ch = `M${x + pw + 2} ${py + 33} H${x + pw + pg - 4}`;
        m += fleche(ch, debuts[i + 1] - 0.012, debuts[i + 1], B(k), [x + pw + pg - 3, py + 33, 0]);
      }
    });
    [t('Une entrée à la fois, avec une confirmation à chaque fois.', 'One entry at a time, with a confirmation every time.'),
      t('« Reprendre » fait le chemin inverse et efface l’historique que l’agent pouvait lire.', '“Take back” does the reverse and wipes the history the agent could read.')].forEach((l2, i) => {
      m += `<circle cx="${z.x + 5}" cy="${py + 108 + i * 28 - 4.5}" r="3.5" fill="${DISCRET}"/>` + texte(z.x + 18, py + 108 + i * 28, l2, { taille: 12.5, couleur: TEXTE });
    });
    m += etat(k, [
      [A(k), dialog, t('Toute entrée neuve va dans ta zone. L’agent n’y lit rien, il prévient seulement.', 'Every new entry lands in your zone. The agent reads nothing there, it only warns.')],
      [dialog, confie, t('Avant de confier, l’appli dit ce que le serveur pourra faire, code à deux facteurs compris.', 'Before handing over, the app says what the server will be able to do, two-factor code included.')],
      [confie, B(k), t('Déchiffré avec UK, rechiffré avec AK, envoyé avec confirm: true : Netflix passe côté agent.', 'Decrypted with UK, encrypted again with AK, sent with confirm: true: Netflix moves to the agent side.')],
    ]);
    meca.push(m);
  }

  // ======================================================= 5. the watch
  {
    const k = 4, tape = dans(k, 0.14), sha = dans(k, 0.2), part = [dans(k, 0.3), dans(k, 0.37)], retour = [dans(k, 0.42), dans(k, 0.49)];
    const compare = dans(k, 0.53), trouve = dans(k, 0.58);
    const f = R.fuitesTel();
    let s = O.aurore(390, 844, [[0, 'calm'], [trouve, 'leak']], { cycle: C }) + f.tete;
    s += entre(C, 0, trouve, f.avant + ongletsBas('fuites') + toucher(195, 619, C, tape), 0.003);
    s += entre(C, trouve, 1, f.apres + ongletsBas('fuites', { badges: { fuites: 1, agent: 1 } }), 0.003);
    scenes.push(s);

    // k-anonymity (05-veille.md): five characters leave, the rest stays.
    const z = Z(k), lg = 360, xd = z.r - lg, y = z.y + 6, h = 96;
    const hash = '940C0F26FD5A30775BB1CBD1F6840398D39BB813';
    let m = carte(z.x, y, lg, h, { allume: [tape, B(k)], cycle: C, rx: 12 });
    m += texte(z.x + 18, y + 29, t('Ton appareil', 'Your device'), { taille: 14.5, couleur: TITRE, poids: 600 });
    m += texte(z.x + 18, y + 50, t('empreinte SHA-1 du mot de passe', 'SHA-1 fingerprint of the password'), { taille: 12.5, couleur: TEXTE });
    const c = O.id('empreinte');
    m += `<rect x="${z.x + 15}" y="${y + 62}" width="43" height="21" rx="4" fill="${ACCENT}" fill-opacity="0.25" opacity="0">${visible(C, sha + 0.01, B(k), 0.003)}</rect>`;
    m += `<clipPath id="${c}"><rect x="${z.x + 16}" y="${y + 60}" height="26" width="0">${fondu('width', C, [[0, 0], [sha, 0], [sha + 0.03, lg - 24], [1, lg - 24]])}</rect></clipPath>`;
    m += `<g clip-path="url(#${c})"><text x="${z.x + 18}" y="${y + 78}" font-family="${MONO}" font-size="12" font-weight="600" fill="${ACCENT_TEXTE}">${hash.slice(0, 5)}<tspan fill="${DISCRET}" font-weight="400">${hash.slice(5)}</tspan></text></g>`;
    m += carte(xd, y, lg, h, { allume: [part[1], retour[1]], cycle: C, rx: 12 });
    m += texte(xd + 18, y + 29, 'Pwned Passwords', { taille: 14.5, couleur: TITRE, poids: 600 });
    m += texte(xd + 18, y + 50, t('ne reçoit que 5 caractères', 'only gets 5 characters'), { taille: 12.5, couleur: TEXTE });
    m += texte(xd + 18, y + 72, t('et renvoie des centaines de suffixes', 'and sends back hundreds of suffixes'), { taille: 12.5, couleur: TEXTE });
    const aller = `M${z.x + lg + 3} ${y + 34} H${xd - 5}`, rt = `M${xd - 3} ${y + 66} H${z.x + lg + 6}`;
    m += fleche(aller, part[0], part[1], B(k), [xd - 4, y + 34, 0]);
    m += entre(C, part[0], B(k), texte((z.x + lg + xd) / 2, y + 26, hash.slice(0, 5), { taille: 12.5, couleur: ACCENT_TEXTE, police: MONO, poids: 600, ancre: 'middle' }), 0.003);
    m += fleche(rt, retour[0], retour[1], B(k), [z.x + lg + 5, y + 66, 180]);
    m += entre(C, retour[0], B(k), texte((z.x + lg + xd) / 2, y + 88, t('suffixes', 'suffixes'), { taille: 12.5, couleur: ACCENT_TEXTE, ancre: 'middle' }), 0.003);
    // The comparison, here, and what it finds.
    const y2 = y + h + 44;
    m += `<path d="M${z.x + lg / 2} ${y + h + 3} V${y2 - 5}" fill="none" stroke="${FIL}" stroke-width="1.8"/>` + pointe(z.x + lg / 2, y2 - 4, 90);
    m += carte(z.x, y2, lg, 84, { allume: [compare, B(k)], cycle: C, rx: 12 });
    m += texte(z.x + 18, y2 + 29, t('La comparaison se fait ici', 'The comparison happens here'), { taille: 14.5, couleur: TITRE, poids: 600 });
    m += texte(z.x + 18, y2 + 52, t('les 35 autres caractères ne sortent pas', 'the other 35 characters never leave'), { taille: 12.5, couleur: TEXTE });
    m += fleche(`M${z.x + lg + 3} ${y2 + 42} H${xd - 5}`, compare, trouve, B(k), [xd - 4, y2 + 42, 0]);
    m += `<rect x="${xd}" y="${y2}" width="${lg}" height="84" rx="12" fill="${CARTE}" stroke="${BORD}"/>`;
    m += `<g opacity="0">${visible(C, trouve, B(k), 0.003)}<rect x="${xd}" y="${y2}" width="${lg}" height="84" rx="12" fill="${AMBRE}" fill-opacity="0.07" stroke="${AMBRE}" stroke-opacity="0.8" stroke-width="1.5"/>
      ${texte(xd + 18, y2 + 29, t('Netflix : vu dans une fuite', 'Netflix: seen in a breach'), { taille: 14.5, couleur: TITRE, poids: 600 })}
      ${texte(xd + 18, y2 + 52, t('une alerte, et l’agent prépare une rotation', 'an alert, and the agent prepares a rotation'), { taille: 12.5, couleur: TEXTE })}</g>`;
    m += entre(C, A(k), trouve, texte(xd + lg / 2, y2 + 47, t('rien trouvé pour l’instant', 'nothing found so far'), { taille: 13, couleur: DISCRET, ancre: 'middle' }), 0.003);
    // The health drops, and why.
    const y3 = y2 + 124, cx = z.x + 44;
    m += entre(C, A(k), trouve, anneau(cx, y3 + 40, 84, 100), 0.003) + entre(C, trouve, B(k), anneau(cx, y3 + 40, 84, 67), 0.003);
    m += entre(C, A(k), trouve, texte(cx + 64, y3 + 32, t('Rien dans les fuites connues : 100.', 'Nothing in known breaches: 100.'), { taille: 14.5, couleur: TITRE, poids: 600 }), 0.003);
    m += entre(C, trouve, B(k), texte(cx + 64, y3 + 32, t('1 entrée sur 3 dans une fuite : 100 × 2/3 = 67.', '1 entry out of 3 in a breach: 100 × 2/3 = 67.'), { taille: 14.5, couleur: TITRE, poids: 600 }), 0.003);
    m += paragraphe(cx + 64, y3 + 56, t('Ta zone, seul ton navigateur déverrouillé peut la vérifier. La zone agent, l’agent la vérifie lui-même toutes les 6 h.',
      'Your zone can only be checked by your unlocked browser. The agent checks the agent zone itself, every 6 h.'), { taille: 12.5, max: z.r - cx - 64, couleur: TEXTE, interligne: 19 });
    m += etat(k, [
      [A(k), tape, t('La veille repasse d’elle-même. « Vérifier maintenant » la lance tout de suite.', 'The watch comes back on its own. “Check now” runs it right away.')],
      [tape, part[1], t('Le mot de passe devient une empreinte SHA-1. Seuls ses 5 premiers caractères partent.', 'The password becomes a SHA-1 fingerprint. Only its first 5 characters leave.')],
      [part[1], trouve, t('Pwned Passwords renvoie des centaines de suffixes. La comparaison se fait chez toi.', 'Pwned Passwords sends back hundreds of suffixes. The comparison happens on your side.')],
      [trouve, B(k), t('Netflix est trouvé : la santé tombe à 67, et la lumière vire à l’ambre.', 'Netflix is found: health drops to 67, and the light turns amber.')],
    ]);
    meca.push(m);
  }

  // ================================================== 6. you approve
  {
    const k = 5, tape = dans(k, 0.56), etapes = [0.64, 0.72, 0.8, 0.88].map((f) => dans(k, f));
    let s = R.agentTel() + toucher(259, 662, C, tape);
    s += entre(C, tape + 0.004, B(k), toast(195, 712, t('Approuvée. L’agent la joue à son prochain passage.', 'Approved. The agent plays it on its next run.')), 0.003);
    scenes.push(s);

    const z = Z(k), pw = 184, pg = (z.l - 4 * pw) / 3, y = z.y + 16, h = 104;
    let m = rubrique(z.x, y - 4, t('AU PROCHAIN PASSAGE DE L’AGENT', 'ON THE AGENT’S NEXT RUN'));
    [['01', t('Générer', 'Generate'), t('24 caractères neufs', '24 new characters'), t('en révision en attente', 'as a pending revision')],
      ['02', t('Changer', 'Change'), t('sur le site, ou par toi', 'on the site, or by you'), t('guidé, hors allowlist', 'guided, off the allowlist')],
      ['03', t('Prouver', 'Prove'), t('reconnexion au site', 'sign in to the site'), t('l’ancien doit échouer', 'the old one must fail')],
      ['04', t('Valider', 'Confirm'), t('elle devient la bonne', 'it becomes the right one'), t('sinon, retour à l’ancien', 'if not, back to the old one')]].forEach(([n, titre, l1, l2], i) => {
      const x = z.x + i * (pw + pg);
      m += carte(x, y + 12, pw, h, { allume: [etapes[i], B(k)], cycle: C, rx: 12 });
      m += texte(x + 18, y + 40, n, { taille: 12, couleur: ACCENT_TEXTE, police: MONO, poids: 600 }) + texte(x + 44, y + 41, titre, { taille: 14.5, couleur: TITRE, poids: 600 });
      m += texte(x + 18, y + 70, l1, { taille: 12.5, couleur: TEXTE }) + texte(x + 18, y + 90, l2, { taille: 12.5, couleur: TEXTE });
      if (i < 3) {
        const ch = `M${x + pw + 2} ${y + 64} H${x + pw + pg - 4}`;
        m += fleche(ch, etapes[i + 1] - 0.012, etapes[i + 1], B(k), [x + pw + pg - 3, y + 64, 0]);
      }
    });
    // Two revisions side by side: the old one is kept until the proof.
    const y2 = y + h + 52, lg = (z.l - 60) / 2, xd = z.x + lg + 60;
    m += rubrique(z.x, y2 - 14, t('DEUX RÉVISIONS, JUSQU’À LA PREUVE', 'TWO REVISIONS, UNTIL THE PROOF'));
    m += boite(z.x, y2, lg, 70, t('Révision actuelle', 'Current revision'), [t('l’ancien mot de passe, gardé', 'the old password, kept')]);
    m += entre(C, etapes[3], B(k), `<rect x="${z.x}" y="${y2}" width="${lg}" height="70" rx="12" fill="${CARTE}" stroke="${BORD}"/>` +
      texte(z.x + 18, y2 + 29, t('Révision précédente', 'Previous revision'), { taille: 14, couleur: TITRE, poids: 600 }) +
      texte(z.x + 18, y2 + 52, t('dans l’historique, déchiffrable par toi', 'in the history, readable by you'), { taille: 12.5, couleur: TEXTE }), 0.003);
    m += `<rect x="${xd}" y="${y2}" width="${lg}" height="70" rx="12" fill="none" stroke="${FIL}" stroke-dasharray="4 4"/>`;
    m += entre(C, A(k), etapes[0], texte(xd + lg / 2, y2 + 40, t('rien tant que tu n’as pas répondu', 'nothing until you answer'), { taille: 13, couleur: DISCRET, ancre: 'middle' }), 0.003);
    m += entre(C, etapes[0], etapes[3], boite(xd, y2, lg, 70, t('Révision en attente', 'Pending revision'), [t('le nouveau, chiffré par AK', 'the new one, encrypted with AK')], { allume: [etapes[0], etapes[3]] }), 0.003);
    m += entre(C, etapes[3], B(k), `<rect x="${xd}" y="${y2}" width="${lg}" height="70" rx="12" fill="${VERT}" fill-opacity="0.07" stroke="${VERT}" stroke-opacity="0.8" stroke-width="1.5"/>` +
      texte(xd + 18, y2 + 29, t('Révision validée', 'Confirmed revision'), { taille: 14, couleur: TITRE, poids: 600 }) +
      texte(xd + 18, y2 + 52, t('la connexion a prouvé le nouveau', 'the sign-in proved the new one'), { taille: 12.5, couleur: TEXTE }), 0.003);
    m += fleche(`M${z.x + lg + 4} ${y2 + 35} H${xd - 5}`, etapes[0] - 0.012, etapes[0], B(k), [xd - 4, y2 + 35, 0]);
    // The guardrails, checked by the code.
    const y3 = y2 + 112;
    m += rubrique(z.x, y3, t('GARDE-FOUS, VÉRIFIÉS PAR LE CODE', 'GUARDRAILS, CHECKED BY THE CODE'));
    let gx = z.x;
    [t('3 rotations au maximum par jour', '3 rotations a day at most'), t('seuls les sites de l’allowlist', 'allowlisted sites only'), t('kill switch relu avant chaque action', 'kill switch read before every action')].forEach((g) => {
      const j = jeton(gx, y3 + 14, g, { allume: [A(k), B(k)] });
      m += j.svg; gx += j.l + 12;
    });
    m += texte(z.x, y3 + 76, t('Et chaque action de l’agent écrit une ligne au journal.', 'And every action of the agent writes a line to the log.'), { taille: 12.5, couleur: DISCRET });
    m += etat(k, [
      [A(k), dans(k, 0.3), t('Pour une fuite en zone agent, l’agent prépare une rotation et attend ton accord.', 'For a breach in the agent zone, the agent prepares a rotation and waits for your go-ahead.')],
      [dans(k, 0.3), tape, t('Il dit d’abord ce qu’il fera, en quatre étapes. Rien ne bouge tant que tu n’as pas répondu.', 'It first says what it will do, in four steps. Nothing moves until you answer.')],
      [tape, B(k), t('Approuvée : il la joue au prochain passage. L’ancien reste gardé jusqu’à la preuve.', 'Approved: it plays it on its next run. The old one is kept until the proof.')],
    ]);
    meca.push(m);
  }

  // ================================================= 7. two-factor codes
  {
    const k = 6, coupe = dans(k, 0.34), tape = dans(k, 0.62);
    const inst = (i) => (i === 0 ? 0 : A(k) + (i / 7) * (B(k) - A(k)));
    let s = R.codesTel();
    for (let i = 0; i < 7; i++) {
      const sec = 11 - i, bas = sec <= 5;
      const arc = (cx, cy, r, w) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${APP.track}" stroke-opacity="0.3" stroke-width="${w}"/>
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${bas ? APP.warn : APP.accent}" stroke-width="${w}" stroke-dasharray="${r1((2 * Math.PI * r * sec) / 30)} ${r1(2 * Math.PI * r)}" transform="rotate(-90 ${cx} ${cy})"/>`;
      s += entre(C, inst(i), i === 6 ? 1 : inst(i + 1), arc(42, 192, 8, 2.2) +
        `<text x="60" y="197" font-family="${SANS}" font-size="14" fill="${APP.text}">${t('Nouveaux codes dans', 'New codes in')} <tspan font-weight="600">${sec}</tspan> s</text>` +
        texte(34, 332, '933  532', { taille: 30, couleur: bas ? APP.warnText : APP.text, poids: 600, espace: 0.5 }) + arc(343, 316, 11, 2.6), 0.0008);
    }
    s += toucher(110, 322, C, tape);
    s += entre(C, tape + 0.004, B(k), toast(195, 712, t('Code de Netflix copié. Effacé dans 30 s.', 'Netflix code copied. Cleared in 30 s.')), 0.003);
    scenes.push(s);

    // RFC 6238, with Web Crypto (web/src/lib/totp.ts).
    const z = Z(k), pw = 184, pg = (z.l - 4 * pw) / 3, y = z.y + 10, h = 84;
    let m = '';
    const cartes = [[t('Secret', 'Secret'), t('rangé dans l’entrée', 'kept in the entry')], [t('Heure', 'Time'), t('par tranches de 30 s', 'in 30 s steps')], ['HMAC-SHA1', 'Web Crypto, RFC 6238']];
    cartes.forEach(([a, b], i) => {
      const x = z.x + i * (pw + pg);
      m += boite(x, y, pw, h - 18, a, [b], { allume: [A(k), B(k)], mono: i === 2, taille: i === 2 ? 13 : 14 });
      const ch = `M${x + pw + 2} ${y + 33} H${x + pw + pg - 4}`;
      m += fil(C, ch, A(k), B(k)) + pointe(x + pw + pg - 3, y + 33, 0);
    });
    const xc = z.x + 3 * (pw + pg);
    m += carte(xc, y, pw, h - 18, { allume: [A(k), B(k)], cycle: C, rx: 12 });
    m += texte(xc + 18, y + 42, '933 532', { taille: 24, couleur: TITRE, police: MONO, poids: 600 });
    // The network, cut: the code keeps turning.
    const y2 = y + 120, gx = z.x + 70, dx = z.r - 70;
    m += icone('DeviceMobile', gx - 16, y2 + 14, 32, TITRE) + texte(gx, y2 + 72, t('Ton téléphone', 'Your phone'), { taille: 13, couleur: TEXTE, ancre: 'middle' });
    m += icone('HardDrives', dx - 16, y2 + 14, 32, TITRE) + texte(dx, y2 + 72, t('Ton serveur', 'Your server'), { taille: 13, couleur: TEXTE, ancre: 'middle' });
    m += `<path d="M${gx + 34} ${y2 + 30} H${dx - 34}" fill="none" stroke="${FIL}" stroke-width="1.8" stroke-dasharray="5 6"/>`;
    const mid = (gx + dx) / 2;
    m += entre(C, A(k), coupe, texte(mid, y2 + 20, t('aucune requête pour un code', 'no request for a code'), { taille: 13, couleur: TEXTE, ancre: 'middle' }), 0.003);
    m += entre(C, coupe, B(k), `<rect x="${mid - 26}" y="${y2 + 8}" width="52" height="44" rx="12" fill="${O.FOND}" stroke="${AMBRE}" stroke-opacity="0.8"/>${icone('CloudSlash', mid - 12, y2 + 18, 24, AMBRE)}` +
      texte(mid, y2 + 72, t('hors ligne : le code tourne quand même', 'offline: the code keeps turning'), { taille: 13, couleur: TITRE, poids: 500, ancre: 'middle' }), 0.003);
    // The agent zone: the server can compute the same code.
    const y3 = y2 + 116;
    m += carte(z.x, y3, z.l, 76, { rx: 12 });
    m += icone('Sparkle', z.x + 20, y3 + 18, 18, ACCENT_TEXTE);
    m += texte(z.x + 48, y3 + 32, t('En zone agent, le serveur peut calculer le même code.', 'In the agent zone, the server can compute the same code.'), { taille: 14, couleur: TITRE, poids: 600 });
    m += texte(z.x + 48, y3 + 54, t('C’est ce qui permet à l’agent de se reconnecter pendant une rotation. En zone perso, seulement ici.', 'That is what lets the agent sign in again during a rotation. In your zone, only here.'), { taille: 12.5, couleur: TEXTE });
    m += etat(k, [
      [A(k), coupe, t('Le code se calcule ici, depuis le secret rangé dans l’entrée. Rien n’est demandé au serveur.', 'The code is computed here, from the secret kept in the entry. Nothing is asked of the server.')],
      [coupe, tape, t('Réseau coupé, il tourne quand même : l’onglet Codes marche hors ligne.', 'Network down, it still turns: the Codes tab works offline.')],
      [tape, B(k), t('Touché, il est copié, puis effacé du presse-papiers 30 s plus tard.', 'Tapped, it is copied, then cleared from the clipboard 30 s later.')],
    ]);
    meca.push(m);
  }

  // ================================================== 8. the kill switch
  {
    const k = 7, presse = dans(k, 0.22), tient = dans(k, 0.37);
    const ab = R.agentBureau(), sw = R.interrupteur();
    let s = R.fondBureau([[0, 'agent'], [tient, 'off']], C) + ab.fixe + sw.libelles;
    s += `<rect x="309" y="249" height="40" rx="10" fill="${APP.warn}" fill-opacity="0.16" width="0">${fondu('width', C, [[0, 0], [presse, 0], [tient, 368], [1, 368]])}</rect>`;
    s += `<g>${glisse(C, [[0, '0 0'], [presse, '0 0'], [tient, '188 0'], [1, '188 0']])}${entre(C, 0, tient, sw.pouce(true), 0.001)}${entre(C, tient, 1, sw.pouce(false), 0.001)}</g>`;
    s += entre(C, 0, tient, ab.marche, 0.002) + entre(C, tient, 1, ab.arret, 0.002);
    s += entre(C, 0, tient, R.chromeBureau({ actif: 'agent' }), 0.001) + entre(C, tient, 1, R.chromeBureau({ actif: 'agent', eteint: true }), 0.001);
    // The finger that holds, and does not let go before 1 s.
    s += `<g opacity="0">${visible(C, presse - 0.004, tient + 0.006, 0.002)}<circle cx="588" cy="269" r="22" fill="#FFFFFF" fill-opacity="0.28" stroke="#FFFFFF" stroke-opacity="0.8" stroke-width="2.5"/></g>`;
    s += entre(C, tient + 0.006, B(k), toast(764, 700, t('Agent arrêté. Il ne fera plus rien jusqu’à ton feu vert.', 'Agent stopped. It will do nothing more until you say so.'), { ton: 'warn', icone: 'WarningCircle' }), 0.003);
    scenes.push(s);

    const z = Z(k), y = z.y + 6;
    let m = carte(z.x, y, z.l, 104, { allume: [presse, B(k)], cycle: C, rx: 12 });
    m += texte(z.x + 18, y + 30, t('Maintenir 1 s', 'Hold for 1 s'), { taille: 14.5, couleur: TITRE, poids: 600 });
    const bw = z.l - 36;
    m += `<rect x="${z.x + 18}" y="${y + 48}" width="${bw}" height="12" rx="6" fill="${FIL}" fill-opacity="0.5"/>`;
    m += `<rect x="${z.x + 18}" y="${y + 48}" height="12" rx="6" fill="${AMBRE}" width="0">${fondu('width', C, [[0, 0], [presse, 0], [tient, bw], [1, bw]])}</rect>`;
    [['0 s', 0, 'start'], [t('0,5 s', '0.5 s'), 0.5, 'middle'], ['1 s', 1, 'end']].forEach(([v, p, an]) => {
      m += texte(z.x + 18 + bw * p, y + 84, v, { taille: 12.5, couleur: TEXTE, police: MONO, ancre: an });
    });
    const y2 = y + 150;
    m += rubrique(z.x, y2, t('LE SWITCH, RELU AVANT CHAQUE ACTION', 'THE SWITCH, READ BEFORE EVERY ACTION'));
    [t('Veille d’un compte', 'Watching an account'), t('Veille d’une adresse', 'Watching an address'), t('Rotation', 'Rotation')].forEach((a, i) => {
      const yy = y2 + 16 + i * 46;
      m += `<rect x="${z.x}" y="${yy}" width="${z.l}" height="38" rx="10" fill="${CARTE}" stroke="${BORD}"/>`;
      m += texte(z.x + 16, yy + 24, a, { taille: 13.5, couleur: TITRE, poids: 500 });
      m += entre(C, A(k), tient, `<circle cx="${z.r - 86}" cy="${yy + 19}" r="4" fill="${VERT}"/>` + texte(z.r - 16, yy + 24, t('en marche', 'running'), { taille: 12.5, couleur: TEXTE, ancre: 'end' }), 0.003);
      m += entre(C, tient + i * 0.004, B(k), icone('Prohibit', z.r - 102, yy + 11, 16, AMBRE) + texte(z.r - 16, yy + 24, t('arrêt net', 'stops dead'), { taille: 12.5, couleur: TITRE, poids: 600, ancre: 'end' }), 0.003);
    });
    m += paragraphe(z.x, y2 + 176, t('L’enclencher marche toujours, même coffre verrouillé. Le relâcher demande ton mot de passe maître.',
      'Engaging it always works, even with the vault locked. Releasing it asks for your master password.'), { taille: 12.5, max: z.l, couleur: TEXTE, interligne: 19 });
    m += etat(k, [
      [A(k), presse, t('Le kill switch arrête l’agent. Pas de dialogue : tu le maintiens 1 s.', 'The kill switch stops the agent. No dialog: you hold it for 1 s.')],
      [presse, tient, t('Tant que tu tiens, il se remplit. Relâché avant la fin, il revient.', 'While you hold, it fills up. Let go before the end, and it springs back.')],
      [tient, B(k), t('Arrêté : plus aucune veille ni rotation. L’orbe devient gris, la lumière aussi.', 'Stopped: no more watching, no more rotations. The orb turns grey, and so does the light.')],
    ]);
    meca.push(m);
  }

  // ==================================================== 9. the palette
  {
    const k = 8, ck = dans(k, 0.1), ouvre = dans(k, 0.14), tape = [dans(k, 0.3), dans(k, 0.4)], filtre = dans(k, 0.42), copie = dans(k, 0.62);
    const base = R.fondBureau('leak', C) + R.coffreBureau() + R.chromeBureau({ actif: 'coffre' });
    let s = base;
    s += entre(C, ouvre, filtre, R.paletteBureau() +
      entre(C, 0, tape[0], texte(374, 157, t('Cherche une entrée ou tape une action', 'Find an entry or type an action'), { taille: 16, couleur: APP.faint }), 0.001) +
      O.frappe(374, 157, 'net', C, tape[0], tape[1], { taille: 16, couleur: APP.text }), 0.003);
    s += entre(C, filtre, copie, R.paletteRecherche(), 0.003);
    s += frappeClavier(['Ctrl', 'K'], ck - 0.012, ouvre + 0.03);
    s += frappeClavier(['Ctrl', t('Entrée', 'Enter')], copie - 0.02, copie + 0.03);
    s += entre(C, copie + 0.032, B(k), toast(764, 690, t('Mot de passe de Netflix copié. Effacé dans 30 s.', 'Netflix password copied. Cleared in 30 s.')), 0.003);
    scenes.push(s);

    const z = Z(k), y = z.y + 6;
    let m = carte(z.x, y, z.l, 110, { rx: 12 });
    const phase = (keys, mot, de, a) => {
      const r = touchesD(0, 0, keys, { h: 40, taille: 16 });
      const x0 = z.x + (z.l - r.l) / 2;
      return entre(C, de, a, touchesD(x0, y + 20, keys, { h: 40, taille: 16, allume: [de, a] }).svg +
        texte(z.x + z.l / 2, y + 90, mot, { taille: 13, couleur: TEXTE, ancre: 'middle' }), 0.003);
    };
    m += phase(['Ctrl', 'K'], t('ouvre la palette', 'opens the palette'), A(k), tape[0]);
    m += phase(['n', 'e', 't'], t('cherche dans le coffre déchiffré', 'searches the decrypted vault'), tape[0], copie - 0.02);
    m += phase(['Ctrl', t('Entrée', 'Enter')], t('copie le mot de passe, sans ouvrir la fiche', 'copies the password, without opening the entry'), copie - 0.02, B(k));
    const y2 = y + 150;
    m += rubrique(z.x, y2, t('TOUT AU CLAVIER', 'ALL FROM THE KEYBOARD'));
    [[['/'], t('chercher', 'search')], [['G', t('puis', 'then'), 'V'], t('le coffre ; C, F, A pour les autres', 'the vault; C, F, A for the others')],
      [['Ctrl', 'N'], t('nouvelle entrée', 'new entry')], [['Ctrl', 'L'], t('verrouiller', 'lock')], [['Ctrl', ','], t('réglages', 'settings')],
      [[t('Échap', 'Esc')], t('fermer, un dialogue à la fois', 'close, one dialog at a time')]].forEach(([keys, mot], i) => {
      const yy = y2 + 16 + i * 36;
      let cx = z.x;
      keys.forEach((key) => {
        if (key === 'puis' || key === 'then') { m += texte(cx, yy + 18, key, { taille: 12.5, couleur: DISCRET }); cx += largeur(key, 12.5) + 6; return; }
        const r = touchesD(cx, yy, [key], { h: 26, taille: 12 });
        m += r.svg; cx += r.l + 6;
      });
      m += texte(z.x + 118, yy + 18, mot, { taille: 13, couleur: TITRE });
    });
    m += etat(k, [
      [A(k), tape[0], t('Ctrl K ouvre la palette : chaque entrée, chaque écran, chaque action.', 'Ctrl K opens the palette: every entry, every screen, every action.')],
      [tape[0], copie, t('Trois lettres suffisent. La recherche tourne sur le coffre déchiffré en mémoire.', 'Three letters are enough. The search runs on the vault decrypted in memory.')],
      [copie, B(k), t('Ctrl Entrée copie le mot de passe sans ouvrir la fiche. Effacé dans 30 s.', 'Ctrl Enter copies the password without opening the entry. Cleared in 30 s.')],
    ]);
    meca.push(m);
  }

  // ====================================================== 10. the import
  {
    const k = 9, clic = dans(k, 0.18), apercu = dans(k, 0.22), imp = dans(k, 0.52), fait = dans(k, 0.55);
    let s = R.fondBureau('leak', C);
    s += `<g>${cache(apercu, fait, 0.002)}${R.importBureau()}</g>` + entre(C, apercu, fait, R.importBureau({ apercu: true }), 0.002);
    s += R.chromeBureau({ actif: 'reglages', reglages: true });
    s += toucher(676, 348, C, clic, { rayon: 22 }) + toucher(1054, 469, C, imp, { rayon: 22 });
    s += entre(C, fait + 0.003, B(k), toast(764, 700, t('3 entrées importées dans « Protégé par toi ».', '3 entries imported into “Protected by you”.')), 0.003);
    scenes.push(s);

    const z = Z(k), y = z.y + 6;
    let m = carte(z.x, y, z.l, 132, { allume: [clic, B(k)], cycle: C, rx: 12 });
    m += icone('FileCsv', z.x + 18, y + 16, 18, ACCENT_TEXTE) + texte(z.x + 44, y + 30, t('Fichier .csv exporté de Chrome', '.csv file exported from Chrome'), { taille: 14, couleur: TITRE, poids: 600 });
    ['name,url,username,password', 'Amazon,amazon.fr,tristan@…,•••', 'GitHub,github.com,Cybertrist,•••', t('Messagerie', 'Mailbox') + ',mail.exemple.fr,tristan@…,•••'].forEach((l2, i) => {
      m += texte(z.x + 18, y + 58 + i * 20, l2, { taille: 12, couleur: i ? TITRE : DISCRET, police: MONO });
    });
    const y2 = y + 170;
    m += fleche(`M${z.x + z.l / 2} ${y + 134} V${y2 - 5}`, imp - 0.02, imp, B(k), [z.x + z.l / 2, y2 - 4, 90]);
    m += carte(z.x, y2, z.l, 102, { allume: [imp, B(k)], cycle: C, rx: 12 });
    m += texte(z.x + 18, y2 + 29, t('Lu et chiffré ici', 'Read and encrypted here'), { taille: 14.5, couleur: TITRE, poids: 600 });
    m += texte(z.x + 18, y2 + 50, t('XChaCha20-Poly1305, avec ta clé UK', 'XChaCha20-Poly1305, with your UK key'), { taille: 12.5, couleur: TEXTE });
    [0, 1, 2].forEach((i) => {
      const x = z.x + 18 + i * 124;
      m += `<rect x="${x}" y="${y2 + 64}" width="112" height="24" rx="6" fill="none" stroke="${FIL}" stroke-dasharray="4 4"/>`;
      m += entre(C, imp + 0.006 + i * 0.006, B(k), `<rect x="${x}" y="${y2 + 64}" width="112" height="24" rx="6" fill="${ACCENT}" fill-opacity="0.14" stroke="${ACCENT}" stroke-opacity="0.7"/>` +
        icone('LockSimple', x + 10, y2 + 70, 12, ACCENT_TEXTE) + texte(x + 28, y2 + 80.5, t('bloc chiffré', 'encrypted block'), { taille: 12, couleur: ACCENT_TEXTE }), 0.003);
    });
    const y3 = y2 + 140;
    m += fleche(`M${z.x + z.l / 2} ${y2 + 104} V${y3 - 5}`, fait, fait + 0.02, B(k), [z.x + z.l / 2, y3 - 4, 90]);
    m += boite(z.x, y3, z.l, 70, t('Ton serveur', 'Your server'), [t('3 blocs qu’il ne sait pas ouvrir', '3 blocks it cannot open')], { allume: [fait + 0.02, B(k)] });
    m += etat(k, [
      [A(k), apercu, t('Google, Bitwarden ou Authenticator : tout entre par Réglages, Import et export.', 'Google, Bitwarden or Authenticator: everything comes in through Settings, Import and export.')],
      [apercu, imp, t('Le fichier est lu sur cet appareil. Tout arrivera dans « Protégé par toi ».', 'The file is read on this device. Everything will land in “Protected by you”.')],
      [imp, B(k), t('Chaque entrée est chiffrée avant de partir. Pense à supprimer le fichier ensuite.', 'Each entry is encrypted before it leaves. Remember to delete the file afterwards.')],
    ]);
    meca.push(m);
  }

  // ============================================ 11. nothing in the clear
  {
    const k = 10, cl = dans(k, 0.12), verrou = dans(k, 0.2), reseau = dans(k, 0.5);
    let s = entre(C, 0, verrou, R.fondBureau('leak', C) + R.coffreBureau() + R.chromeBureau({ actif: 'coffre' }), 0.003);
    s += entre(C, verrou, 1, R.verrouBureau(), 0.003);
    s += frappeClavier(['Ctrl', 'L'], cl - 0.012, verrou - 0.004);
    scenes.push(s);

    const z = Z(k), y = z.y + 6;
    let m = carte(z.x, y, z.l, 96, { allume: [verrou, B(k)], cycle: C, rx: 12 });
    m += texte(z.x + 18, y + 30, t('Au verrouillage', 'On lock'), { taille: 14.5, couleur: TITRE, poids: 600 });
    let jx = z.x + 18;
    [t('UK effacée', 'UK wiped'), t('AK effacée', 'AK wiped'), t('presse-papiers vidé', 'clipboard emptied')].forEach((mot, i) => {
      const j = jeton(jx, y + 50, mot, { allume: [verrou + i * 0.006, B(k)], taille: 12 });
      m += j.svg; jx += j.l + 8;
    });
    // Where Serenity listens: nowhere but 127.0.0.1.
    const y2 = y + 126;
    m += carte(z.x, y2, z.l, 118, { allume: [reseau, B(k)], cycle: C, rx: 12 });
    m += icone('Devices', z.x + 18, y2 + 20, 20, TITRE) + texte(z.x + 46, y2 + 35, t('Tes appareils', 'Your devices'), { taille: 13.5, couleur: TITRE, poids: 500 });
    m += icone('HardDrives', z.r - 170, y2 + 20, 20, TITRE) + texte(z.r - 18, y2 + 35, '127.0.0.1:8080', { taille: 13, couleur: TITRE, police: MONO, poids: 600, ancre: 'end' });
    const ch = `M${z.x + 150} ${y2 + 30} H${z.r - 182}`;
    m += fleche(ch, reseau, reseau + 0.03, B(k), [z.r - 181, y2 + 30, 0]);
    m += texte((z.x + 150 + z.r - 182) / 2, y2 + 56, t('HTTPS, par un chemin privé', 'HTTPS, over a private path'), { taille: 12, couleur: TEXTE, ancre: 'middle' });
    m += `<line x1="${z.x + 18}" y1="${y2 + 72}" x2="${z.r - 18}" y2="${y2 + 72}" stroke="${BORD}"/>`;
    m += icone('Prohibit', z.x + 18, y2 + 85, 17, AMBRE);
    m += texte(z.x + 46, y2 + 98, t('Sur Internet, rien n’écoute. Seul l’agent sort.', 'Nothing listens on the Internet. Only the agent goes out.'), { taille: 12, couleur: TEXTE });
    // What the server keeps, and what it never sees.
    const y3 = y2 + 150, lg = (z.l - 12) / 2;
    [[z.x, t('Le serveur garde', 'The server keeps'), t('des blocs chiffrés, leurs révisions et dates, la zone de chacun', 'encrypted blocks, their revisions and dates, each one’s zone')],
      [z.x + lg + 12, t('Il ne voit jamais', 'It never sees'), t('ton mot de passe maître, MK, UK, ni ta zone en clair', 'your master password, MK, UK, or your zone in the clear')]].forEach(([x, a, b], i) => {
      m += carte(x, y3, lg, 116, { rx: 12 });
      m += texte(x + 16, y3 + 28, a, { taille: 14, couleur: TITRE, poids: 600 });
      m += paragraphe(x + 16, y3 + 50, b, { taille: 12.5, max: lg - 32, couleur: i ? TITRE : TEXTE, interligne: 18 });
    });
    m += etat(k, [
      [A(k), verrou, t('Ctrl L verrouille. Les clés quittent la mémoire, le presse-papiers est vidé.', 'Ctrl L locks. The keys leave memory, the clipboard is emptied.')],
      [verrou, reseau, t('Pour rouvrir, ton mot de passe maître, et rien d’autre. Déchiffré ici, jamais là-bas.', 'To open again, your master password and nothing else. Decrypted here, never over there.')],
      [reseau, B(k), t('Serenity n’écoute que 127.0.0.1. Tes appareils passent par un chemin privé en HTTPS.', 'Serenity only listens on 127.0.0.1. Your devices come in over a private HTTPS path.')],
    ]);
    meca.push(m);
  }

  // ------------------------------------------- devices, panels, mechanisms
  // The phone for the first seven steps, the window for the last four:
  // one leaves before the other comes in.
  const FIN_TEL = BUREAU / N;
  let ecran = '';
  scenes.slice(0, BUREAU).forEach((s, k) => { ecran += entre(C, k / N, (k + 1) / N, s, 0.003); });
  corps += entre(C, 0, FIN_TEL, T.cadre + T.ecran(ecran), 0.003);
  let fen = '';
  scenes.slice(BUREAU).forEach((s, i) => { const k = BUREAU + i; fen += entre(C, k / N, Math.min((k + 1) / N, 0.999), s, 0.003); });
  corps += entre(C, FIN_TEL, 0.999, W.cadre + W.ecran(fen), 0.003);
  // The panel frames, one per layout.
  const cadre = (p) => `<rect x="${p.x}" y="${p.y}" width="${p.l}" height="${p.h}" rx="16" fill="${CARTE}" fill-opacity="0.55" stroke="${BORD}"/>`;
  corps += entre(C, 0, FIN_TEL, cadre(P1), 0.003) + entre(C, FIN_TEL, 0.999, cadre(P2), 0.003);
  meca.forEach((m, k) => { corps += entre(C, A(k), B(k), tetePanneau(k) + m, 0.003); });

  // ---------------------------------------------- the tiles, at the bottom
  const TY = 684, TH = 76, TG = 8, TW = (1184 - 10 * TG) / 11;
  const COURTS = [
    [t('Déverrouiller', 'Unlock')], [t('Une phrase', 'A sentence'), t('d’abord', 'first')], [t('La fiche', 'The entry')],
    [t('Confier', 'Hand to'), t('à l’agent', 'the agent')], [t('La veille', 'The watch')], [t('Tu approuves', 'You approve')],
    [t('Codes 2FA', '2FA codes')], [t('Kill switch', 'Kill switch')], [t('Palette', 'Palette'), 'Ctrl K'], [t('Import', 'Import')],
    [t('Rien', 'Nothing'), t('en clair', 'in the clear')],
  ];
  ETAPES.forEach(([ic], k) => {
    const x = r1(48 + k * (TW + TG)), cx = r1(x + TW / 2);
    corps += `<rect x="${x}" y="${TY}" width="${r1(TW)}" height="${TH}" rx="11" fill="${CARTE}" stroke="${BORD}"/>`;
    corps += `<rect x="${x}" y="${TY}" width="${r1(TW)}" height="${TH}" rx="11" fill="${ACCENT}" fill-opacity="0.1" stroke="${ACCENT}" stroke-width="1.5" opacity="0">${visible(C, A(k), B(k), 0.003)}</rect>`;
    corps += icone(ic, cx - 10, TY + 13, 20, ACCENT_TEXTE);
    corps += `<g opacity="0">${fondu('opacity', C, [[0, 0], [B(k), 0], [B(k) + 0.003, 1], [0.996, 1], [1, 0]])}
      <circle cx="${cx + 13}" cy="${TY + 30}" r="6.5" fill="${ACCENT}" stroke="${CARTE}" stroke-width="2"/>
      <path d="M${cx + 10} ${TY + 30} l2.2 2.2 l4 -4.4" fill="none" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></g>`;
    const [l1, l2] = COURTS[k];
    corps += texte(cx, TY + (l2 ? 51 : 58), l1, { taille: 12, couleur: TITRE, poids: 600, ancre: 'middle' });
    if (l2) corps += texte(cx, TY + 66, l2, { taille: 12, couleur: TITRE, poids: 600, ancre: 'middle' });
  });

  // Hundreds of texts and animations: one CSS class per font instead of
  // the font list on every text, and four decimals for instants (kept
  // increasing). The file loses about a third of its weight.
  corps = corps.split(`font-family="${SANS}"`).join('class="fs"').split(`font-family="${MONO}"`).join('class="fm"');
  corps = corps.replace(/keyTimes="([^"]*)"/g, (_, v) => {
    let avant = 0;
    return `keyTimes="${v.split(';').map((x) => { avant = Math.max(avant, Math.round(Number(x) * 10000) / 10000); return avant; }).join(';')}"`;
  });
  corps = corps.replace(/(values|keyPoints)="([^"]*)"/g, (_, att, v) => `${att}="${v.replace(/-?\d+\.\d{3,}/g, (n) => String(Math.round(Number(n) * 100) / 100))}"`);
  corps = `<style>.fs{font-family:${SANS}}.fm{font-family:${MONO}}</style>` + corps;

  svg('fonctionnalites.svg', 1280, 780, corps, t(
    'Les fonctionnalités de Serenity en onze étapes animées : à gauche l’appli rejoue le geste, sur le téléphone pour les sept premières et sur la fenêtre de bureau pour les quatre dernières ; à droite le mécanisme se construit. 1, déverrouiller : le mot de passe maître tapé sur l’écran « Bon retour, Tristan. », le bouton Déverrouiller, le voile et le faisceau de lumière, puis le coffre ; à droite, Argon2id avec 64 Mio, 3 passes et un sel de 16 octets donne MK, qui donne AuthKey, envoyée au serveur qui n’en garde qu’un hachage, et MEK, qui ouvre UK puis AK, gardées en mémoire. 2, une phrase d’abord : le coffre dit « La veille répond… », puis l’anneau de santé s’allume jusqu’à 100 et la phrase devient « Tout va bien. » ; à droite, ce qui fait baisser le score : une fuite pèse 1, un mot de passe réutilisé 0,6, trop faible 0,5, trop ancien 0,3, et 5 points par adresse e-mail touchée ; vert dès 85, ambre dès 60, rouge dessous. 3, la fiche de Netflix : le mot de passe copié, effacé du presse-papiers après 30 s, sa force « Faible, 11 caractères », et le code à usage unique 933 532 qui décompte, calculé ici par HMAC-SHA1 depuis le secret de l’entrée et l’heure. 4, confier à l’agent : le bouton, la confirmation qui dit ce que le serveur pourra faire, puis la fiche « L’agent s’occupe de ce compte » ; à droite, Netflix passe de « Protégé par toi » à « Confié à l’agent » : bloc chiffré par UK, déchiffré en mémoire, rechiffré par AK avec un nonce neuf, envoyé par POST /delegate avec confirm: true. 5, la veille : l’écran Fuites, « Vérifier maintenant », puis la santé à 67, « Une chose demande ton attention. » et l’alerte Netflix vue dans une fuite ; à droite, l’empreinte SHA-1 dont seuls les 5 premiers caractères partent vers Pwned Passwords, qui renvoie des centaines de suffixes comparés sur place, et la santé qui passe de 100 à 67. 6, tu approuves : l’écran Agent propose de changer le mot de passe de Netflix en quatre étapes, Générer, Changer, Prouver, Valider, et tu touches Approuver ; à droite, les quatre étapes au prochain passage, la révision en attente à côté de l’actuelle jusqu’à la preuve, et les garde-fous : 3 rotations au maximum par jour, seuls les sites de l’allowlist, kill switch relu avant chaque action. 7, codes 2FA : l’écran Codes, « Nouveaux codes dans » qui décompte, le code copié ; à droite, secret, heure par tranches de 30 s, HMAC-SHA1 avec Web Crypto, aucune requête au serveur, et le code qui tourne hors ligne ; en zone agent, le serveur peut calculer le même code pour se reconnecter. 8, le kill switch sur la fenêtre de bureau : maintenu 1 s, l’orbe violet devient gris, « L’agent est arrêté », la lumière passe au gris ; à droite, la jauge d’une seconde, et la veille d’un compte, d’une adresse et la rotation qui s’arrêtent net ; le relâcher demande le mot de passe maître. 9, la palette : Ctrl K, les suggestions et les actions, « net » tapé, Netflix seul, Ctrl Entrée copie son mot de passe ; à droite, les raccourcis : / pour chercher, G puis V, C, F ou A, Ctrl N, Ctrl L, Ctrl virgule, Échap. 10, l’import dans Réglages : Mots de passe Google, 3 entrées prêtes, Importer ; à droite, le fichier .csv de Chrome lu et chiffré ici en XChaCha20-Poly1305 avec la clé UK, et trois blocs que le serveur ne sait pas ouvrir. 11, rien en clair : Ctrl L, l’écran de déverrouillage « Déchiffré sur cet appareil. Le serveur ne voit que des blocs chiffrés. » ; à droite, UK et AK effacées, le presse-papiers vidé, Serenity qui n’écoute que 127.0.0.1:8080, joint par un chemin privé en HTTPS, rien sur Internet sauf l’agent vers Pwned Passwords, et ce que le serveur garde face à ce qu’il ne voit jamais. En bas, onze tuiles servent de sommaire et gardent une coche une fois vues.',
    'Serenity’s features in eleven animated steps: on the left the app replays the gesture, on the phone for the first seven and on the desktop window for the last four; on the right the mechanism builds up. 1, unlock: the master password typed on the “Welcome back, Tristan.” screen, the Unlock button, the veil and the beam of light, then the vault; on the right, Argon2id with 64 MiB, 3 passes and a 16-byte salt gives MK, which gives AuthKey, sent to the server that only keeps a hash of it, and MEK, which opens UK then AK, kept in memory. 2, a sentence first: the vault says “The watch is answering…”, then the health ring lights up to 100 and the sentence becomes “All is well.”; on the right, what lowers the score: a breach weighs 1, a reused password 0.6, too weak 0.5, too old 0.3, and 5 points per email address hit; green from 85, amber from 60, red below. 3, the Netflix entry: the password copied, cleared from the clipboard after 30 s, its strength “Weak, 11 characters”, and the one-time code 933 532 counting down, computed here with HMAC-SHA1 from the entry’s secret and the time. 4, hand to the agent: the button, the confirmation that says what the server will be able to do, then the entry reading “The agent looks after this account”; on the right, Netflix moves from “Protected by you” to “Handed to the agent”: a block encrypted with UK, decrypted in memory, encrypted again with AK and a fresh nonce, sent through POST /delegate with confirm: true. 5, the watch: the Breaches screen, “Check now”, then health at 67, “One thing needs your attention.” and the Netflix alert seen in a breach; on the right, the SHA-1 fingerprint of which only the first 5 characters go to Pwned Passwords, which sends back hundreds of suffixes compared on the spot, and health going from 100 to 67. 6, you approve: the Agent screen proposes to change the Netflix password in four steps, Generate, Change, Prove, Confirm, and you tap Approve; on the right, the four steps on the next run, the pending revision next to the current one until the proof, and the guardrails: 3 rotations a day at most, allowlisted sites only, kill switch read before every action. 7, 2FA codes: the Codes screen, “New codes in” counting down, the code copied; on the right, secret, time in 30 s steps, HMAC-SHA1 with Web Crypto, no request to the server, and the code turning offline; in the agent zone, the server can compute the same code to sign in again. 8, the kill switch on the desktop window: held for 1 s, the violet orb turns grey, “The agent is stopped”, the light turns grey; on the right, the one-second gauge, and watching an account, an address and the rotation stopping dead; releasing it asks for the master password. 9, the palette: Ctrl K, the suggestions and actions, “net” typed, Netflix alone, Ctrl Enter copies its password; on the right, the shortcuts: / to search, G then V, C, F or A, Ctrl N, Ctrl L, Ctrl comma, Esc. 10, the import in Settings: Google passwords, 3 entries ready, Import; on the right, Chrome’s .csv file read and encrypted here with XChaCha20-Poly1305 and the UK key, and three blocks the server cannot open. 11, nothing in the clear: Ctrl L, the unlock screen “Decrypted on this device. The server only sees encrypted blocks.”; on the right, UK and AK wiped, the clipboard emptied, Serenity only listening on 127.0.0.1:8080, reached over a private HTTPS path, nothing on the Internet but the agent going to Pwned Passwords, and what the server keeps against what it never sees. At the bottom, eleven tiles act as a table of contents and keep a tick once seen.'));
};

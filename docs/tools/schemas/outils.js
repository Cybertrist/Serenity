// What the animated diagrams of this folder share.
//
// Every other .js file here draws one diagram: it receives these tools and
// calls svg() itself. Its text lives in its own file, both languages on
// the same line, t('français', 'english'): correcting one without seeing
// the other is impossible.
//
// Animations are SMIL, which GitHub plays inside an <img>. SMIL cannot
// hold a pause between two loops, so every element animates over the
// whole cycle, and its steps are placed with keyTimes, as a fraction of
// the cycle (0 the start, 1 the end).
//
// Two coordinate systems live side by side:
//   - the diagram itself, 1280 wide, where the explanation is built;
//   - the app, inside a device: a phone is 390 x 844 CSS pixels, like the
//     real screenshots, and the desktop window 1280 x 800. telephone() and
//     fenetre() scale that for you, so a screen is drawn with the numbers
//     read on the real app (web/src), not with guesses.
//
// Fonts: Geist, Geist Mono and Syne are the app's own (web/public/fonts,
// OFL). They are embedded as data: URLs, since an SVG shown through <img>
// may not fetch anything. Syne only draws the "Serenity" logotype and
// capital initials, never digits or lower case running text.
const fs = require('fs');
const path = require('path');

module.exports = (LG) => {
  const EN = LG === 'en';
  const t = (fr, en) => (EN ? en : fr);
  const RACINE = path.join(__dirname, '..', '..', '..');
  const SORTIE = path.join(RACINE, 'docs', 'img', ...(EN ? ['en'] : []), 'schemas');
  const IMAGES = require('./images.json');
  const ICONES = require('./icones.json');

  // ------------------------------------------------------------ the fonts
  const woff = (f) => fs.readFileSync(path.join(RACINE, 'web', 'public', 'fonts', f)).toString('base64');
  const POLICES = {
    SGeist: woff('geist-latin.woff2'),
    SGeistMono: woff('geist-mono-latin.woff2'),
    SSyne: woff('syne-latin.woff2'),
  };
  const SANS = "SGeist,system-ui,-apple-system,'Segoe UI',sans-serif";
  const MONO = "SGeistMono,ui-monospace,Consolas,monospace";
  const SYNE = "SSyne,SGeist,sans-serif";

  // --------------------------------------------------- the diagram colours
  // The page is GitHub's dark background, the cards barely lighter. One
  // accent only, the blue of the banner and of the logotype. The three
  // state colours (ok, warn, crit) mark a state, never decorate.
  const FOND = '#0D1117';
  const CARTE = '#131A24';
  const BORD = '#1F2833';
  const TITRE = '#F0F4F8';
  const TEXTE = '#9AA7B6';
  const DISCRET = '#6B7888';
  const FIL = '#2F3A47';
  const ACCENT = '#3B82F6';
  const ACCENT_TEXTE = '#82B1FF';
  const VERT = '#3DD68C';
  const AMBRE = '#F2A93B';
  const ROUGE = '#F07A7A';

  // The app's tokens, from web/src/design/theme.css (dark theme). Glass is
  // written as a colour plus an opacity, like the CSS rgb(... / a).
  const APP = {
    bg: '#070A12', surface: '#0A0E18', panel: '#0E1322',
    glass: '#111726', glass2: '#181F32', glassHi: '#242E48',
    line: '#94A3C4', // used at 0.1, 0.06 (soft) and 0.22 (strong)
    text: '#E9EDF5', muted: '#A7B1C6', faint: '#7E8AA4',
    accent: '#3B82F6', accentStrong: '#2C6CE4', accentText: '#82B1FF',
    violet: '#8B7CF8', violetText: '#B4A9FF',
    ok: '#3DD68C', warn: '#F2A93B', warnText: '#F7C26E', crit: '#F07A7A',
    track: '#94A3C4', close: '#E81123',
  };
  // The light behind the app, per mood (theme.css, data-mood).
  const HUMEURS = {
    calm: ['#1E40AF', '#3B82F6', '#38BDF8'],
    leak: ['#B45309', '#F59E0B', '#2563EB'],
    agent: ['#4338CA', '#8B5CF6', '#3B82F6'],
    off: ['#334155', '#475569', '#1E293B'],
  };

  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  let _ids = 0;
  /// A unique id in the file, for clipPaths and gradients.
  const id = (prefixe = 'i') => `${prefixe}${_ids++}`;

  // Screenshots asked for by the current diagram: each is embedded once, as
  // a <symbol>, then reused with <use>.
  let _images = new Set();

  /// Writes the diagram: background, faint grid, a glow from the top, then
  /// the body. [titre] is the text alternative, and it lists the content.
  function svg(nom, largeur, hauteur, corps, titre) {
    for (const s of [corps, titre]) {
      if (/[\u2013\u2014]/.test(s)) throw new Error(`${nom} : tiret long interdit`);
    }
    const defsImages = [..._images].map((n) => {
      const im = IMAGES[n];
      if (!im) throw new Error(`${nom} : image « ${n} » absente de images.json`);
      return `<symbol id="image-${n}" viewBox="0 0 ${im.l} ${im.h}"><image width="${im.l}" height="${im.h}" href="${im.url}"/></symbol>`;
    }).join('\n  ');
    _images = new Set();
    const polices = Object.entries(POLICES)
      .filter(([nomPolice]) => nomPolice !== 'SSyne' || corps.includes('SSyne'))
      .map(([nomPolice, b64]) => `@font-face{font-family:${nomPolice};src:url(data:font/woff2;base64,${b64}) format('woff2');font-weight:100 900;}`)
      .join('\n');
    const contenu = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${largeur} ${hauteur}" width="${largeur}" height="${hauteur}" role="img" aria-label="${esc(titre)}">
<title>${esc(titre)}</title>
<defs>
  <style>
${polices}
text{font-feature-settings:'ss01','cv11';}
  </style>
  <filter id="halo" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur stdDeviation="6" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="flou36" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="36"/></filter>
  <filter id="flou10" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="10"/></filter>
  <filter id="ombreFlottante" x="-20%" y="-20%" width="140%" height="150%" color-interpolation-filters="sRGB">
    <feDropShadow dx="0" dy="18" stdDeviation="20" flood-color="#000000" flood-opacity="0.6"/>
  </filter>
  <filter id="lueurBleue" x="-30%" y="-60%" width="160%" height="260%" color-interpolation-filters="sRGB">
    <feDropShadow dx="0" dy="6" stdDeviation="7" flood-color="#3B82F6" flood-opacity="0.45"/>
  </filter>
  <pattern id="grille" width="40" height="40" patternUnits="userSpaceOnUse">
    <path d="M40 0H0V40" fill="none" stroke="${ACCENT}" stroke-opacity="0.045"/>
  </pattern>
  <radialGradient id="lueur" cx="50%" cy="0%" r="80%">
    <stop offset="0" stop-color="${ACCENT}" stop-opacity="0.10"/><stop offset="1" stop-color="${ACCENT}" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="primaire" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#3F87F8"/><stop offset="1" stop-color="#2C6CE4"/>
  </linearGradient>
  <radialGradient id="orbe" cx="35%" cy="30%" r="70%">
    <stop offset="0" stop-color="#FFFFFF"/><stop offset="0.12" stop-color="#FFFFFF"/><stop offset="0.5" stop-color="${APP.violet}"/><stop offset="1" stop-color="#3B2FB0"/>
  </radialGradient>
  <radialGradient id="orbeEteint" cx="35%" cy="30%" r="70%">
    <stop offset="0" stop-color="#CBD5E1"/><stop offset="0.12" stop-color="#CBD5E1"/><stop offset="0.55" stop-color="#64748B"/><stop offset="1" stop-color="#334155"/>
  </radialGradient>
  ${defsImages}
</defs>
<rect width="${largeur}" height="${hauteur}" rx="16" fill="${FOND}"/>
<rect width="${largeur}" height="${hauteur}" rx="16" fill="url(#grille)"/>
<rect width="${largeur}" height="${hauteur}" rx="16" fill="url(#lueur)"/>
${corps}
</svg>
`;
    fs.mkdirSync(SORTIE, { recursive: true });
    fs.writeFileSync(path.join(SORTIE, nom), contenu);
    console.log('  ' + nom.padEnd(24) + (contenu.length / 1024).toFixed(0).padStart(4) + ' Ko  (' + LG + ')');
  }

  // --------------------------------------------------------------- text

  /// A text, already in the language of the render.
  const texte = (x, y, s, { taille = 14, couleur = TEXTE, police = SANS, poids = 400, ancre = 'start', espace = 0, extra = '' } = {}) =>
    `<text x="${r1(x)}" y="${r1(y)}" font-family="${police}" font-size="${taille}" font-weight="${poids}" fill="${couleur}" text-anchor="${ancre}"${espace ? ` letter-spacing="${espace}"` : ''} ${extra}>${esc(s)}</text>`;
  const r1 = (v) => Math.round(v * 10) / 10;

  /// The width a text will take, estimated from Geist's average advance.
  /// Good enough to place a chip or a caret; check the render anyway.
  function largeur(s, taille = 14, { poids = 400, police = SANS } = {}) {
    if (police === MONO) return s.length * taille * 0.6;
    let w = 0;
    for (const c of String(s)) {
      if ('il.,:;!|\'’ '.includes(c)) w += 0.28;
      else if ('fjrtI()[]'.includes(c)) w += 0.36;
      else if ('mwMW'.includes(c)) w += 0.84;
      else if (c >= 'A' && c <= 'Z') w += 0.66;
      else if (c >= '0' && c <= '9') w += 0.58;
      else w += 0.55;
    }
    return w * taille * (poids >= 600 ? 1.04 : 1);
  }

  /// Cuts a text into lines of at most [max] px.
  function lignes(s, taille, max, opts = {}) {
    const out = [];
    let cour = '';
    for (const m of s.split(' ')) {
      const essai = cour ? cour + ' ' + m : m;
      if (largeur(essai, taille, opts) > max && cour) { out.push(cour); cour = m; } else cour = essai;
    }
    if (cour) out.push(cour);
    return out;
  }

  /// A paragraph: [s] wrapped to [max] px, one <text> per line.
  const paragraphe = (x, y, s, { taille = 13, interligne = null, max = 400, ...opts } = {}) =>
    lignes(s, taille, max, opts).map((l, i) => texte(x, y + i * (interligne || Math.round(taille * 1.5)), l, { taille, ...opts })).join('');

  /// The title of a diagram, spaced capitals in mono, then its sentence.
  const entete = (titre, phrase, { x = 48, y = 54 } = {}) =>
    texte(x, y, titre, { taille: 13, couleur: ACCENT_TEXTE, police: MONO, poids: 600, espace: 3 }) +
    texte(Math.round(x + titre.length * 10.8 + 24), y, phrase, { taille: 14.5, couleur: TEXTE });

  /// A small column label, spaced mono capitals.
  const rubrique = (x, y, s, couleur = DISCRET) =>
    texte(x, y, s, { taille: 12, couleur, police: MONO, poids: 600, espace: 2 });

  // ------------------------------------------------------------ timing

  /// A value that changes in steps over the cycle: [instant, value].
  const paliers = (attribut, cycle, etapes) =>
    `<animate attributeName="${attribut}" dur="${cycle}s" repeatCount="indefinite" keyTimes="${etapes.map((e) => e[0]).join(';')}" values="${etapes.map((e) => e[1]).join(';')}" calcMode="discrete"/>`;

  /// A value that glides from one step to the next.
  const fondu = (attribut, cycle, etapes) =>
    `<animate attributeName="${attribut}" dur="${cycle}s" repeatCount="indefinite" keyTimes="${etapes.map((e) => r4(e[0])).join(';')}" values="${etapes.map((e) => e[1]).join(';')}"/>`;
  const r4 = (v) => Math.round(v * 10000) / 10000;

  /// Shows up at [de], disappears at [a].
  //
  // The fade in happens after [de], the fade out before [a]: two elements
  // handing over at the same instant are never visible together, so two
  // screens never overlap during a transition.
  function visible(cycle, de, a, douceur = 0.012) {
    const e = [];
    if (de <= 0) e.push([0, 1]);
    else e.push([0, 0], [de, 0], [Math.min(de + douceur, a, 1), 1]);
    if (a >= 1) e.push([1, 1]);
    else {
      const debut = Math.max(a - douceur, e[e.length - 1][0]);
      e.push([debut, 1], [a, 0], [1, 0]);
    }
    return fondu('opacity', cycle, e);
  }

  /// A group that only exists between [de] and [a].
  const entre = (cycle, de, a, contenu, douceur) => `<g opacity="${de <= 0 ? 1 : 0}">${visible(cycle, de, a, douceur)}${contenu}</g>`;

  /// A move in glided steps: [instant, "x y"].
  const glisse = (cycle, etapes) =>
    `<animateTransform attributeName="transform" type="translate" dur="${cycle}s" repeatCount="indefinite" keyTimes="${etapes.map((e) => r4(e[0])).join(';')}" values="${etapes.map((e) => e[1]).join(';')}"/>`;

  /// A touch: the finger lands at [a], a ripple opens. Coordinates in the
  /// space it is drawn in (app units inside a device).
  function toucher(cx, cy, cycle, a, { rayon = 16 } = {}) {
    return `<g opacity="0">${visible(cycle, a - 0.016, a + 0.012, 0.004)}
    <circle cx="${cx}" cy="${cy}" r="${rayon}" fill="#FFFFFF" fill-opacity="0.3" stroke="#FFFFFF" stroke-opacity="0.75" stroke-width="2"/>
  </g>
  <circle cx="${cx}" cy="${cy}" r="${rayon * 0.8}" fill="none" stroke="#FFFFFF" stroke-width="2.4" opacity="0">
    ${fondu('opacity', cycle, [[0, 0], [a, 0], [a + 0.002, 0.8], [a + 0.035, 0], [1, 0]])}
    ${fondu('r', cycle, [[0, rayon * 0.8], [a, rayon * 0.8], [a + 0.035, rayon * 2.4], [1, rayon * 2.4]])}
  </circle>`;
  }

  /// A text typed letter by letter, from [de] to [a].
  function frappe(x, y, s, cycle, de, a, opts = {}) {
    const c = id('frappe');
    const taille = opts.taille || 14;
    const l = largeur(s, taille, opts) + 6;
    return `<clipPath id="${c}"><rect x="${x - 2}" y="${y - taille * 1.3}" height="${taille * 1.8}" width="0">
      ${fondu('width', cycle, [[0, 0], [de, 0], [a, l], [1, l]])}</rect></clipPath>
    <g clip-path="url(#${c})">${texte(x, y, s, opts)}</g>`;
  }

  /// A dot that travels along [chemin] once per loop, from [de] to [a].
  function bille(cycle, chemin, de, a, couleur = ACCENT) {
    const m = `<animateMotion dur="${cycle}s" repeatCount="indefinite" path="${chemin}" keyPoints="0;0;1;1" keyTimes="0;${r4(de)};${r4(a)};1" calcMode="linear"/>`;
    return `<g opacity="0">${visible(cycle, de, a, 0.005)}
      <circle r="9" fill="${couleur}" opacity="0.28" filter="url(#halo)">${m}</circle>
      <circle r="3.5" fill="#FFFFFF">${m}</circle></g>`;
  }

  /// A wire: grey, then lit from [de] until [a].
  const fil = (cycle, chemin, de = null, a = 1, couleur = ACCENT) => `<path d="${chemin}" fill="none" stroke="${FIL}" stroke-width="1.8"/>
    ${de === null ? '' : `<path d="${chemin}" fill="none" stroke="${couleur}" stroke-width="1.8" stroke-opacity="0.8" opacity="0">${visible(cycle, de, a)}</path>`}`;

  /// An arrow head at (x, y) pointing along [angle] degrees.
  const pointe = (x, y, angle = 0, couleur = FIL) =>
    `<path d="M-7 -5 L0 0 L-7 5" fill="none" stroke="${couleur}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" transform="translate(${x} ${y}) rotate(${angle})"/>`;

  // ------------------------------------------------ explanation side cards

  /// A card of the diagram. No coloured bar on its side, ever: when it
  /// matters, its whole border lights up, from [allume[0]] to [allume[1]].
  function carte(x, y, l, h, { allume = null, cycle = 10, fond = CARTE, rx = 14 } = {}) {
    const bord = allume
      ? `<rect x="${x}" y="${y}" width="${l}" height="${h}" rx="${rx}" fill="${ACCENT}" fill-opacity="0.06" stroke="${ACCENT}" stroke-width="1.5" opacity="0">${visible(cycle, allume[0], allume[1])}</rect>`
      : '';
    return `<rect x="${x}" y="${y}" width="${l}" height="${h}" rx="${rx}" fill="${fond}" stroke="${BORD}"/>${bord}`;
  }

  /// A numbered step: a card, a number in a ring, a title and a paragraph.
  /// Inner margin 20 px, secondary text 12.5 px.
  function etape(x, y, l, h, numero, titre, phrase, { allume = null, cycle = 10, taille = 12.5 } = {}) {
    let s = carte(x, y, l, h, { allume, cycle });
    s += `<circle cx="${x + 34}" cy="${y + 34}" r="14" fill="none" stroke="${FIL}" stroke-width="1.5"/>`;
    if (allume) s += `<circle cx="${x + 34}" cy="${y + 34}" r="14" fill="${ACCENT}" opacity="0">${visible(cycle, allume[0], allume[1])}</circle>`;
    s += texte(x + 34, y + 38.5, numero, { taille: 12, couleur: TITRE, police: MONO, poids: 600, ancre: 'middle' });
    s += texte(x + 60, y + 39, titre, { taille: 14.5, couleur: TITRE, poids: 600 });
    s += paragraphe(x + 20, y + 68, phrase, { taille, max: l - 40, couleur: TEXTE });
    return s;
  }

  /// Captions that follow each other in the same place: [[de, a, text]].
  function legendes(x, y, cycle, liste, { taille = 14, max = 760, couleur = TITRE } = {}) {
    return liste.map(([de, a, s, c]) => entre(cycle, de, a,
      `<circle cx="${x + 5}" cy="${y - taille * 0.34}" r="4.5" fill="${c || ACCENT}"/>` +
      paragraphe(x + 20, y, s, { taille, max, couleur, poids: 500 }), 0.006)).join('');
  }

  /// A line of code or of a terminal, in mono.
  const code = (x, y, s, { taille = 13, couleur = TITRE } = {}) => texte(x, y, s, { taille, couleur, police: MONO });

  // -------------------------------------------------------------- icons

  /// A Phosphor icon (the app's own), [taille] px, top left at (x, y).
  function icone(nom, x, y, taille, couleur, poids = 'regular') {
    const i = ICONES[nom];
    if (!i) throw new Error(`icône inconnue : ${nom}`);
    const chemins = i[poids] || i.regular;
    return `<g transform="translate(${r1(x)} ${r1(y)}) scale(${r4(taille / 256)})">${chemins.map((d) => `<path d="${d}" fill="${couleur}"/>`).join('')}</g>`;
  }

  // -------------------------------------------------------------- colours

  /// oklch to hex, for the monogram tiles (theme.css draws them in oklch).
  function oklch(L, C, H) {
    const h = (H * Math.PI) / 180;
    const a = C * Math.cos(h), b = C * Math.sin(h);
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.291485548 * b;
    const l3 = l_ ** 3, m3 = m_ ** 3, s3 = s_ ** 3;
    const rgb = [
      4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
      -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
      -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3,
    ].map((v) => {
      const c = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(Math.max(v, 0), 1 / 2.4) - 0.055;
      return Math.round(Math.min(1, Math.max(0, c)) * 255).toString(16).padStart(2, '0');
    });
    return '#' + rgb.join('');
  }
  /// The hue of an account, as Monogram.tsx computes it (FNV-1a).
  function teinte(nom) {
    let h = 2166136261;
    for (const c of nom.toLowerCase()) h = Math.imul(h ^ c.codePointAt(0), 16777619);
    return (h >>> 0) % 360;
  }

  // ------------------------------------------------------ app components
  // Everything below is drawn in app units (CSS px of the real app).

  /// A glass card (the `glass` utility): 56 % glass, a hairline, and a
  /// lighter line on the top edge.
  function verre(x, y, l, h, { rx = 16, opacite = 0.72, fond = APP.glass, bord = 0.1, halo = null } = {}) {
    let s = `<rect x="${x}" y="${y}" width="${l}" height="${h}" rx="${rx}" fill="${fond}" fill-opacity="${opacite}" stroke="${APP.line}" stroke-opacity="${bord}"/>`;
    s += `<path d="M${x + rx} ${y + 0.5} H${x + l - rx}" stroke="#FFFFFF" stroke-opacity="0.05"/>`;
    // The halo of the card that carries a screen's state: a gradient
    // border on its top left corner, like the `halo` utility.
    if (halo) {
      const g = id('halo');
      s += `<linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${halo}" stop-opacity="0.9"/><stop offset="0.45" stop-color="${halo}" stop-opacity="0"/></linearGradient>
      <rect x="${x}" y="${y}" width="${l}" height="${h}" rx="${rx}" fill="none" stroke="url(#${g})" stroke-width="1.5"/>`;
    }
    return s;
  }

  /// The monogram of an account: its initial on a tile tinted by its name.
  function monogramme(nom, x, y, taille = 38, { cle = null } = {}) {
    // [cle] keeps the French name's hue in the English render.
    const h = teinte(cle || nom);
    const g = id('mono');
    return `<linearGradient id="${g}" x1="0.2" y1="0" x2="0.8" y2="1"><stop offset="0" stop-color="${oklch(0.52, 0.11, h)}"/><stop offset="1" stop-color="${oklch(0.34, 0.11, h)}"/></linearGradient>
    <rect x="${x}" y="${y}" width="${taille}" height="${taille}" rx="${taille * 0.3}" fill="url(#${g})" stroke="#FFFFFF" stroke-opacity="0.06"/>
    <path d="M${x + taille * 0.3} ${y + 0.6} H${x + taille * 0.7}" stroke="#FFFFFF" stroke-opacity="0.16"/>
    ${texte(x + taille / 2, y + taille * 0.655, nom.trim()[0].toUpperCase(), { taille: taille * 0.42, couleur: '#FFFFFF', police: SYNE, poids: 700, ancre: 'middle' })}`;
  }

  /// The health ring: 48 ticks lit up to the score. Green from 85, amber
  /// from 60, red below; unlit (null) while the watch has not answered.
  function anneau(cx, cy, taille, score, { valeur = true, ticks = 48 } = {}) {
    const r = taille / 2;
    const ext = r - 1.5, int = r - (taille > 80 ? 9 : taille > 40 ? 6.5 : 4.5);
    const allumes = score === null ? 0 : Math.round((score / 100) * ticks);
    const encre = score === null ? APP.faint : score >= 85 ? APP.ok : score >= 60 ? APP.warn : APP.crit;
    let s = '';
    for (let i = 0; i < ticks; i++) {
      const a = (i / ticks) * Math.PI * 2 - Math.PI / 2;
      const on = i < allumes;
      s += `<line x1="${r1(cx + ext * Math.cos(a))}" y1="${r1(cy + ext * Math.sin(a))}" x2="${r1(cx + int * Math.cos(a))}" y2="${r1(cy + int * Math.sin(a))}" stroke="${on ? encre : APP.track}" stroke-opacity="${on ? 1 : 0.4}" stroke-width="${taille > 80 ? 2.2 : 1.6}" stroke-linecap="round"/>`;
    }
    if (valeur) s += texte(cx, cy + taille * 0.1, score === null ? '…' : String(score), { taille: Math.round(taille * 0.27), couleur: APP.text, poids: 600, ancre: 'middle' });
    return s;
  }

  /// The agent's orb: violet light that pulses while it watches, grey and
  /// still once stopped.
  function orbe(cx, cy, taille, { eteint = false } = {}) {
    const r = taille / 2;
    let s = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${eteint ? 'orbeEteint' : 'orbe'})"/>`;
    if (!eteint) {
      s = `<circle cx="${cx}" cy="${cy}" r="${r * 1.25}" fill="${APP.violet}" opacity="0.28" filter="url(#flou10)"/>` + s;
      s += `<circle cx="${cx}" cy="${cy}" r="${r + 4}" fill="none" stroke="${APP.violet}" stroke-opacity="0.6">
        <animate attributeName="r" dur="2.6s" repeatCount="indefinite" values="${r * 0.9 + 3};${r * 1.5 + 4}"/>
        <animate attributeName="opacity" dur="2.6s" repeatCount="indefinite" values="0.9;0"/></circle>`;
    }
    return s;
  }

  // Tones of a chip: [background, border, text, icon].
  const TONS = {
    accent: ['#3B82F6', 0.14, APP.accentText],
    violet: ['#8B7CF8', 0.15, APP.violetText],
    crit: ['#F07A7A', 0.12, APP.crit],
    warn: ['#F2A93B', 0.13, APP.warnText],
    ok: ['#3DD68C', 0.13, APP.ok],
    neutre: ['#94A3C4', 0.08, APP.muted],
  };
  /// A chip (Chip.tsx): soft tinted background, optional icon. Returns
  /// { svg, l } so the next chip can be placed after it.
  function puce(x, y, s, ton = 'neutre', { icone: ic = null, taille = 12, h = 24 } = {}) {
    const [c, a, encre] = TONS[ton];
    const li = ic ? taille + 5 : 0;
    const l = Math.round(largeur(s, taille, { poids: 500 }) + li + 18);
    return {
      l,
      svg: `<rect x="${x}" y="${y}" width="${l}" height="${h}" rx="9" fill="${c}" fill-opacity="${a}"/>
      ${ic ? icone(ic, x + 8, y + (h - taille - 1) / 2, taille + 1, encre) : ''}
      ${texte(x + 9 + li, y + h / 2 + taille * 0.36, s, { taille, couleur: encre, poids: 500 })}`,
    };
  }
  /// The mark of a zone, as a chip.
  const puceZone = (x, y, zone, opts = {}) => zone === 'agent'
    ? puce(x, y, t('Confié à l’agent', 'Handed to the agent'), 'violet', { icone: 'Sparkle', ...opts })
    : puce(x, y, t('Protégé par toi', 'Protected by you'), 'accent', { icone: 'ShieldCheck', ...opts });

  /// A key as written on the keyboard (Kbd.tsx). Returns { svg, l }.
  function kbd(x, y, s, { taille = 11, h = 18 } = {}) {
    const l = Math.max(h, Math.round(s.length * taille * 0.6 + 10));
    return {
      l,
      svg: `<rect x="${x}" y="${y}" width="${l}" height="${h}" rx="4" fill="#94A3C4" fill-opacity="0.08" stroke="${APP.line}" stroke-opacity="0.22"/>
      ${texte(x + l / 2, y + h / 2 + taille * 0.35, s, { taille, couleur: APP.muted, police: MONO, ancre: 'middle' })}`,
    };
  }
  /// Several keys in a row: ['Ctrl', 'K'].
  function touches(x, y, liste, opts = {}) {
    let s = '', cx = x;
    for (const k of liste) { const r = kbd(cx, y, k, opts); s += r.svg; cx += r.l + 4; }
    return { svg: s, l: cx - x - 4 };
  }

  /// The primary button: accent blue, a light top edge, a blue glow.
  function boutonPrimaire(x, y, l, h, s, { icone: ic = null, taille = 14, touche = null, rx = 10 } = {}) {
    const tl = largeur(s, taille, { poids: 600 }) + (ic ? taille + 8 : 0) + (touche ? largeur(touche, 11, { police: MONO }) + 22 : 0);
    let cx = x + (l - tl) / 2;
    let out = `<rect x="${x}" y="${y}" width="${l}" height="${h}" rx="${rx}" fill="url(#primaire)" filter="url(#lueurBleue)"/>
      <path d="M${x + rx} ${y + 0.8} H${x + l - rx}" stroke="#FFFFFF" stroke-opacity="0.25"/>`;
    if (ic) { out += icone(ic, cx, y + (h - taille - 2) / 2, taille + 2, '#FFFFFF', 'bold'); cx += taille + 8; }
    out += texte(cx, y + h / 2 + taille * 0.36, s, { taille, couleur: '#FFFFFF', poids: 600 });
    if (touche) {
      cx += largeur(s, taille, { poids: 600 }) + 10;
      const kl = largeur(touche, 11, { police: MONO }) + 10;
      out += `<rect x="${cx}" y="${y + h / 2 - 9}" width="${kl}" height="18" rx="4" fill="#FFFFFF" fill-opacity="0.12" stroke="#FFFFFF" stroke-opacity="0.35"/>
        ${texte(cx + kl / 2, y + h / 2 + 4, touche, { taille: 11, couleur: '#FFFFFF', police: MONO, ancre: 'middle' })}`;
    }
    return out;
  }

  /// A secondary button: glass, a stronger hairline.
  function bouton(x, y, l, h, s, { icone: ic = null, taille = 14, couleur = APP.text, rx = 10, ancre = 'middle' } = {}) {
    const tl = largeur(s, taille, { poids: 500 }) + (ic ? taille + 8 : 0);
    let cx = ancre === 'middle' ? x + (l - tl) / 2 : x + 14;
    let out = `<rect x="${x}" y="${y}" width="${l}" height="${h}" rx="${rx}" fill="${APP.glass2}" fill-opacity="0.66" stroke="${APP.line}" stroke-opacity="0.22"/>`;
    if (ic) { out += icone(ic, cx, y + (h - taille - 2) / 2, taille + 2, couleur); cx += taille + 8; }
    out += texte(cx, y + h / 2 + taille * 0.36, s, { taille, couleur, poids: 500 });
    return out;
  }

  /// A square icon button of the screen header (search, bell, add).
  function boutonIcone(x, y, ic, { taille = 37, primaire = false, point = null } = {}) {
    let s = primaire
      ? `<rect x="${x}" y="${y}" width="${taille}" height="${taille}" rx="${taille * 0.3}" fill="url(#primaire)" filter="url(#lueurBleue)"/>`
      : `<rect x="${x}" y="${y}" width="${taille}" height="${taille}" rx="${taille * 0.3}" fill="#94A3C4" fill-opacity="0.07"/>`;
    s += icone(ic, x + taille * 0.24, y + taille * 0.24, taille * 0.52, primaire ? '#FFFFFF' : APP.text, primaire ? 'bold' : 'regular');
    if (point) s += `<circle cx="${x + taille - 7}" cy="${y + 8}" r="4.5" fill="${point}" stroke="${APP.bg}" stroke-width="1.5"/>`;
    return s;
  }

  /// A field (Field.tsx): label above, glass box, optional value, an eye.
  function champ(x, y, l, s, { label = null, h = 42, focus = false, valeur = null, mono = false, oeil = false, icone: ic = null, touche = null, taille = 15 } = {}) {
    let out = '';
    let yy = y;
    if (label) { out += texte(x + 2, y + 12, label, { taille: 13, couleur: APP.muted, poids: 500 }); yy = y + 22; }
    if (focus) out += `<rect x="${x - 4}" y="${yy - 4}" width="${l + 8}" height="${h + 8}" rx="13" fill="${APP.accent}" fill-opacity="0.16"/>`;
    out += `<rect x="${x}" y="${yy}" width="${l}" height="${h}" rx="10" fill="${APP.glass2}" fill-opacity="0.66" stroke="${focus ? APP.accent : APP.line}" stroke-opacity="${focus ? 0.9 : 0.22}"/>`;
    let tx = x + 14;
    if (ic) { out += icone(ic, x + 12, yy + h / 2 - 9, 18, APP.faint); tx = x + 38; }
    if (valeur !== null) out += texte(tx, yy + h / 2 + taille * 0.36, valeur, { taille, couleur: APP.text, police: mono ? MONO : SANS });
    else if (s) out += texte(tx, yy + h / 2 + taille * 0.36, s, { taille, couleur: APP.faint });
    if (oeil) out += icone('Eye', x + l - 32, yy + h / 2 - 10, 20, APP.muted);
    if (touche) out += kbd(x + l - 32, yy + h / 2 - 10, touche, { h: 20 }).svg;
    return out;
  }

  /// A segmented control (Segmented.tsx): [[label, count], ...].
  function segmente(x, y, l, options, actif, { h = 36, taille = 13 } = {}) {
    const w = (l - 8) / options.length;
    let s = `<rect x="${x}" y="${y}" width="${l}" height="${h}" rx="10" fill="${APP.glass}" fill-opacity="0.6" stroke="${APP.line}" stroke-opacity="0.1"/>`;
    options.forEach(([mot, n], i) => {
      const cx = x + 4 + i * w + w / 2;
      if (i === actif) s += `<rect x="${x + 4 + i * w}" y="${y + 4}" width="${w}" height="${h - 8}" rx="7" fill="${APP.glassHi}" fill-opacity="0.8" stroke="${APP.line}" stroke-opacity="0.22"/>`;
      const lab = n === undefined || n === null ? mot : `${mot}  ${n}`;
      const lm = largeur(mot, taille, { poids: 500 });
      const lt = largeur(lab, taille, { poids: 500 });
      s += texte(cx - lt / 2, y + h / 2 + taille * 0.36, mot, { taille, couleur: i === actif ? APP.text : APP.muted, poids: 500 });
      if (n !== undefined && n !== null) s += texte(cx - lt / 2 + lm + 7, y + h / 2 + taille * 0.36, String(n), { taille, couleur: APP.faint, poids: 500 });
    });
    return s;
  }

  /// The strength meter under a password: four segments.
  function force(x, y, niveau, { l = 96 } = {}) {
    const c = niveau >= 4 ? APP.ok : niveau >= 3 ? APP.ok : niveau >= 2 ? APP.warn : APP.crit;
    const w = (l - 9) / 4;
    let s = '';
    for (let i = 0; i < 4; i++) s += `<rect x="${x + i * (w + 3)}" y="${y}" width="${w}" height="4" rx="2" fill="${i < niveau ? c : APP.track}" fill-opacity="${i < niveau ? 1 : 0.3}"/>`;
    return s;
  }

  /// A message toast (toast.tsx): icon of its state, one line.
  function toast(cx, y, s, { ton = 'ok', icone: ic = 'CheckCircle' } = {}) {
    const l = largeur(s, 13.5, { poids: 500 }) + 58;
    const c = TONS[ton][0];
    return `<rect x="${cx - l / 2}" y="${y}" width="${l}" height="42" rx="12" fill="${APP.panel}" fill-opacity="0.95" stroke="${APP.line}" stroke-opacity="0.16" filter="url(#ombreFlottante)"/>
      ${icone(ic, cx - l / 2 + 16, y + 12, 18, c, 'fill')}
      ${texte(cx - l / 2 + 42, y + 26, s, { taille: 13.5, couleur: APP.text, poids: 500 })}`;
  }

  /// The logo, the real one, rounded at 24 % like <Logo>.
  function logo(cx, cy, taille, { halo = false } = {}) {
    _images.add('logo');
    const c = id('logo');
    let s = '';
    if (halo) s += `<circle cx="${cx}" cy="${cy}" r="${taille * 0.75}" fill="${APP.accent}" opacity="0.35" filter="url(#flou36)"/>`;
    s += `<clipPath id="${c}"><rect x="${cx - taille / 2}" y="${cy - taille / 2}" width="${taille}" height="${taille}" rx="${taille * 0.24}"/></clipPath>
    <g clip-path="url(#${c})"><use href="#image-logo" xlink:href="#image-logo" x="${cx - taille / 2}" y="${cy - taille / 2}" width="${taille}" height="${taille}"/></g>`;
    return s;
  }

  /// The logotype: "Seren" in the text colour, "ity" in blue, Syne 800.
  const marque = (x, y, taille, { ancre = 'start', couleur = APP.text } = {}) =>
    `<text x="${x}" y="${y}" font-family="${SYNE}" font-size="${taille}" font-weight="800" text-anchor="${ancre}" fill="${couleur}" letter-spacing="-0.5">Seren<tspan fill="${APP.accent}">ity</tspan></text>`;

  /// A screenshot from images.json, drawn at (x, y, l, h).
  function capture(nom, x, y, l, h, { rx = 0 } = {}) {
    _images.add(nom);
    const c = id('capture');
    return `<clipPath id="${c}"><rect x="${x}" y="${y}" width="${l}" height="${h}" rx="${rx}"/></clipPath>
    <g clip-path="url(#${c})"><use href="#image-${nom}" xlink:href="#image-${nom}" x="${x}" y="${y}" width="${l}" height="${h}"/></g>`;
  }
  const dimensions = (nom) => IMAGES[nom];

  // ------------------------------------------------------ the Aurora light

  /// The light behind the app (<Aurora>): three blurred glows and a
  /// ribbon, in the colours of the mood. [humeur] is a mood name, or
  /// [[instant, mood], ...] to change it over the cycle; the change glides
  /// in about a second, like the registered CSS properties do.
  function aurore(l, h, humeur = 'calm', { cycle = 10, opacite = 0.42, hauteur = null } = {}) {
    const hh = hauteur || Math.min(h, l * 1.1);
    // The blur follows the size, like the CSS one does on a real window.
    const flou = id('aurore');
    const etapes = typeof humeur === 'string' ? null : humeur;
    const couleur = (i) => {
      if (!etapes) return `fill="${HUMEURS[humeur][i]}"`;
      const v = [];
      etapes.forEach(([a, m], k) => {
        if (k === 0) v.push([0, HUMEURS[m][i]]);
        else { v.push([Math.max(a - 0.001, v[v.length - 1][0]), HUMEURS[etapes[k - 1][1]][i]]); v.push([Math.min(1, a + 0.03), HUMEURS[m][i]]); }
      });
      v.push([1, v[v.length - 1][1]]);
      return `fill="${HUMEURS[etapes[0][1]][i]}">${fondu('fill', cycle, v)}</ellipse><ellipse cx="-9999" cy="-9999" rx="1" ry="1" fill="none"`;
    };
    const blob = (cx, cy, rx, ry, i) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" ${couleur(i)}></ellipse>`;
    return `<rect x="0" y="0" width="${l}" height="${h}" fill="${APP.bg}"/>
    <filter id="${flou}" x="-50%" y="-80%" width="200%" height="260%"><feGaussianBlur stdDeviation="${Math.round(l * 0.07)}"/></filter>
    <g opacity="${opacite}" filter="url(#${flou})">
      ${blob(l * 0.2, hh * 0.08, l * 0.36, hh * 0.18, 0)}
      ${blob(l * 0.6, hh * 0.02, l * 0.3, hh * 0.15, 1)}
      ${blob(l * 0.95, hh * 0.12, l * 0.28, hh * 0.2, 2)}
    </g>
    <path d="M${-l * 0.05} ${hh * 0.16} C ${l * 0.25} ${hh * 0.08}, ${l * 0.55} ${hh * 0.07}, ${l * 1.05} ${hh * 0.14}" fill="none" stroke="#82B1FF" stroke-opacity="0.32" stroke-width="1.3"/>
    <path d="M${-l * 0.05} ${hh * 0.24} C ${l * 0.3} ${hh * 0.14}, ${l * 0.6} ${hh * 0.1}, ${l * 1.05} ${hh * 0.06}" fill="none" stroke="#82B1FF" stroke-opacity="0.12" stroke-width="1"/>`;
  }

  /// The ribbons of the entry screens (<Ribbons>): three bands of light
  /// crossing the night, the middle one bright.
  function rubans(l, y, { amplitude = 110 } = {}) {
    const g = id('ruban');
    const c = (dy, k = 1) => `M${-20} ${y + dy} C ${l * 0.3} ${y + dy + amplitude * 0.5 * k}, ${l * 0.5} ${y + dy + amplitude * 0.9 * k}, ${l * 0.68} ${y + dy - amplitude * 0.15 * k} S ${l * 0.95} ${y + dy - amplitude * 1.3 * k}, ${l + 20} ${y + dy - amplitude * 1.4 * k}`;
    return `<linearGradient id="${g}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1D4ED8" stop-opacity="0.2"/><stop offset="0.45" stop-color="#DBEAFE"/><stop offset="1" stop-color="#3B82F6" stop-opacity="0.5"/></linearGradient>
    <path d="${c(0)}" fill="none" stroke="#3B82F6" stroke-opacity="0.35" stroke-width="26" filter="url(#flou10)"/>
    <path d="${c(-50, 0.8)}" fill="none" stroke="#94A3C4" stroke-opacity="0.45" stroke-width="1.4"/>
    <path d="${c(0)}" fill="none" stroke="url(#${g})" stroke-width="3"/>
    <path d="${c(56, 1.1)}" fill="none" stroke="#3B82F6" stroke-opacity="0.55" stroke-width="9"/>`;
  }

  // -------------------------------------------------------------- devices

  /// A phone, [h] tall in the diagram. Its screen is the app at 390 x 844:
  /// ecran(contenu) draws [contenu] in app units, clipped to the screen.
  /// pt(x, y) turns an app point into a diagram point, for wires.
  function telephone(x, y, h) {
    const bord = Math.round(h * 0.016) + 4;
    const k = (h - 2 * bord) / 844;
    const S = { x: x + bord, y: y + bord, l: 390 * k, h: 844 * k };
    const l = S.l + 2 * bord;
    const c = id('ecran');
    const rx = 34 * k + 6;
    return {
      ...S, k, largeur: l, hauteur: h,
      pt: (ax, ay) => [S.x + ax * k, S.y + ay * k],
      cadre: `<rect x="${x}" y="${y}" width="${l}" height="${h}" rx="${rx + bord}" fill="#05070C" filter="url(#ombreFlottante)"/>
  <rect x="${x + 0.75}" y="${y + 0.75}" width="${l - 1.5}" height="${h - 1.5}" rx="${rx + bord - 0.75}" fill="none" stroke="#2A3342" stroke-width="1.5"/>
  <clipPath id="${c}"><rect x="${S.x}" y="${S.y}" width="${S.l}" height="${S.h}" rx="${rx}"/></clipPath>`,
      ecran: (contenu) => `<g clip-path="url(#${c})"><g transform="translate(${r1(S.x)} ${r1(S.y)}) scale(${r4(k)})">${contenu}</g></g>
  <rect x="${S.x}" y="${S.y}" width="${S.l}" height="${S.h}" rx="${rx}" fill="none" stroke="#000000" stroke-opacity="0.6"/>
  <circle cx="${S.x + S.l / 2}" cy="${S.y + 10 * k + 3}" r="${4.5 * k + 1.5}" fill="#05070C" stroke="#1C2330"/>`,
    };
  }

  /// A desktop window, [l] wide in the diagram, holding the desktop app at
  /// 1280 x 800 (its own title bar included). Same ecran() and pt().
  function fenetre(x, y, l, { appL = 1280, appH = 800 } = {}) {
    const k = l / appL;
    const h = appH * k;
    const c = id('fenetre');
    return {
      x, y, l, h, k,
      pt: (ax, ay) => [x + ax * k, y + ay * k],
      cadre: `<rect x="${x}" y="${y}" width="${l}" height="${h}" rx="10" fill="${APP.bg}" filter="url(#ombreFlottante)"/>
  <clipPath id="${c}"><rect x="${x}" y="${y}" width="${l}" height="${h}" rx="10"/></clipPath>`,
      ecran: (contenu) => `<g clip-path="url(#${c})"><g transform="translate(${r1(x)} ${r1(y)}) scale(${r4(k)})">${contenu}</g></g>
  <rect x="${x + 0.5}" y="${y + 0.5}" width="${l - 1}" height="${h - 1}" rx="10" fill="none" stroke="#3A4556" stroke-opacity="0.9"/>`,
    };
  }

  // ------------------------------------------------ phone chrome (390 x 844)

  /// The header of a phone screen: title on the left, square buttons on
  /// the right ([['Plus', {primaire}], 'MagnifyingGlass', ['Bell', {point}]]),
  /// and an optional sentence under it.
  function enteteMobile(titre, { actions = ['MagnifyingGlass', 'Bell'], sous = null, pointCloche = null } = {}) {
    let s = texte(19, 51, titre, { taille: 30, couleur: APP.text, poids: 700, espace: -0.6 });
    let x = 372 - 37;
    [...actions].reverse().forEach((a) => {
      const [nom, o] = Array.isArray(a) ? a : [a, {}];
      s += boutonIcone(x, 18, nom, { ...o, point: nom === 'Bell' ? pointCloche : o.point });
      x -= 45;
    });
    if (sous) s += paragraphe(18, 77, sous, { taille: 14, max: 350, couleur: APP.muted, interligne: 20 });
    return s;
  }

  // The five tabs of the phone, from AppShell: key, label, icon.
  const ONGLETS = [
    ['coffre', t('Coffre', 'Vault'), 'Vault'],
    ['codes', t('Codes', 'Codes'), 'ClockCountdown'],
    ['fuites', t('Fuites', 'Breaches'), 'Target'],
    ['agent', t('Agent', 'Agent'), 'Sparkle'],
    ['reglages', t('Réglages', 'Settings'), 'SlidersHorizontal'],
  ];
  /// The tab bar at the bottom of the phone. [badges] : {fuites: 1, agent: 1}.
  function ongletsBas(actif = 'coffre', { badges = {} } = {}) {
    const y = 776;
    let s = `<rect x="0" y="${y}" width="390" height="68" fill="${APP.surface}" fill-opacity="0.92"/>
      <line x1="0" y1="${y}" x2="390" y2="${y}" stroke="${APP.line}" stroke-opacity="0.1"/>`;
    ONGLETS.forEach(([cle, mot, ic], i) => {
      const cx = 45 + i * 75;
      const choisi = cle === actif;
      const c = choisi ? APP.accentText : APP.faint;
      if (choisi) s += `<circle cx="${cx}" cy="${y + 25}" r="14" fill="${APP.accent}" opacity="0.35" filter="url(#flou10)"/>`;
      s += icone(ic, cx - 11, y + 13, 22, choisi ? '#5E9BFF' : APP.faint, choisi ? 'fill' : 'regular');
      s += texte(cx, y + 50, mot, { taille: 11, couleur: choisi ? APP.text : c, poids: 500, ancre: 'middle' });
      const n = badges[cle];
      if (n) {
        const tc = cle === 'agent' ? APP.violet : APP.warn;
        s += `<circle cx="${cx + 13}" cy="${y + 13}" r="7.5" fill="${tc}" fill-opacity="0.25" stroke="${APP.bg}" stroke-width="1.5"/>
          ${texte(cx + 13, y + 16.8, String(n), { taille: 10, couleur: cle === 'agent' ? APP.violetText : APP.warnText, poids: 600, ancre: 'middle' })}`;
      }
    });
    return s;
  }

  // ------------------------------------------ desktop chrome (1280 x 800)

  /// The title bar the desktop app draws itself: logo and name, search in
  /// the middle, bell, theme, then minimise, maximise, close.
  function barreTitre({ point = null } = {}) {
    let s = `<rect x="0" y="0" width="1280" height="36" fill="${APP.surface}" fill-opacity="0.9"/>
      <line x1="0" y1="36" x2="1280" y2="36" stroke="${APP.line}" stroke-opacity="0.1"/>
      ${logo(21, 18, 16)}
      ${texte(40, 22.5, 'Serenity', { taille: 13, couleur: APP.text, poids: 600 })}
      <rect x="448" y="6" width="398" height="24" rx="7" fill="${APP.glass2}" fill-opacity="0.6" stroke="${APP.line}" stroke-opacity="0.16"/>
      ${icone('MagnifyingGlass', 457, 11, 14, APP.faint)}
      ${texte(478, 22, t('Rechercher une entrée ou une action', 'Search an entry or an action'), { taille: 12.5, couleur: APP.faint })}
      ${touches(778, 9, ['Ctrl', 'K'], { h: 17, taille: 10.5 }).svg}
      ${icone('Bell', 1083, 10, 16, APP.muted)}
      ${point ? `<circle cx="1096" cy="12" r="3.5" fill="${point}"/>` : ''}
      ${icone('Sun', 1112, 10, 16, APP.muted)}
      <path d="M1160 18.5 H1170" stroke="${APP.muted}" stroke-width="1.2"/>
      <rect x="1206" y="13.5" width="10" height="10" fill="none" stroke="${APP.muted}" stroke-width="1.2"/>
      <path d="M1253 13.5 L1263 23.5 M1263 13.5 L1253 23.5" stroke="${APP.muted}" stroke-width="1.2"/>`;
    return s;
  }

  const ECRANS_BUREAU = [
    ['coffre', t('Coffre', 'Vault'), 'Vault'],
    ['codes', t('Codes 2FA', '2FA codes'), 'ClockCountdown'],
    ['fuites', t('Fuites', 'Breaches'), 'Target'],
    ['agent', t('Agent', 'Agent'), 'Sparkle'],
  ];
  /// The 248 px sidebar: the four screens with their counts, the two
  /// zones, then the health ring, the orb, settings and who is signed in.
  function barreLaterale(actif = 'coffre', {
    comptes = { coffre: 3, codes: 1, fuites: 1, agent: 1, toi: 2, confie: 1 },
    sante = 67, santeMot = t('1 point à voir', '1 thing to check'),
    agentMot = t('L’agent veille', 'The agent is watching'), agentSous = t('1 rotation à valider', '1 rotation to approve'),
    agentEteint = false, y0 = 36,
  } = {}) {
    let s = `<rect x="0" y="${y0}" width="248" height="${800 - y0}" fill="${APP.surface}" fill-opacity="0.85"/>
      <line x1="248" y1="${y0}" x2="248" y2="800" stroke="${APP.line}" stroke-opacity="0.1"/>`;
    const ligne = (y, ic, mot, n, choisi, badge) => {
      let r = '';
      if (choisi) {
        r += `<rect x="9" y="${y - 16}" width="229" height="33" rx="8" fill="${APP.glassHi}" fill-opacity="0.7" stroke="${APP.line}" stroke-opacity="0.16"/>`;
      }
      r += icone(ic, 19, y - 9, 18, choisi ? APP.accentText : APP.muted, choisi ? 'fill' : 'regular');
      r += texte(46, y + 5, mot, { taille: 14, couleur: choisi ? APP.text : APP.muted, poids: choisi ? 500 : 400 });
      if (badge) {
        const c = badge === 'agent' ? APP.violet : APP.warn;
        r += `<circle cx="219" cy="${y + 0.5}" r="9" fill="${c}" fill-opacity="0.2"/>${texte(219, y + 4.5, String(n), { taille: 11, couleur: badge === 'agent' ? APP.violetText : APP.warnText, poids: 600, ancre: 'middle' })}`;
      } else if (n !== undefined && n !== null) r += texte(228, y + 5, String(n), { taille: 12.5, couleur: APP.faint, ancre: 'end' });
      return r;
    };
    ECRANS_BUREAU.forEach(([cle, mot, ic], i) => {
      const badge = cle === 'fuites' && comptes.fuites ? 'warn' : cle === 'agent' && comptes.agent ? 'agent' : null;
      s += ligne(y0 + 32 + i * 35, ic, mot, comptes[cle], cle === actif, badge);
    });
    s += texte(19, y0 + 181, t('ZONES', 'ZONES'), { taille: 11, couleur: APP.faint, poids: 600, espace: 1 });
    s += ligne(y0 + 206, 'ShieldCheck', t('Protégé par toi', 'Protected by you'), comptes.toi, actif === 'toi');
    s += ligne(y0 + 241, 'Sparkle', t('Confié à l’agent', 'Handed to the agent'), comptes.confie, actif === 'confie');
    s += anneau(37, 616, 38, sante, { valeur: true });
    s += texte(68, 613, t('Santé du coffre', 'Vault health'), { taille: 12.5, couleur: APP.text, poids: 500 });
    s += texte(68, 629, santeMot, { taille: 11.5, couleur: APP.faint });
    s += orbe(31, 673, 22, { eteint: agentEteint });
    s += texte(57, 670, agentMot, { taille: 12.5, couleur: APP.text, poids: 500 });
    s += texte(57, 686, agentSous, { taille: 11.5, couleur: APP.faint });
    s += icone('SlidersHorizontal', 19, 710, 18, APP.muted) + texte(46, 724, t('Réglages', 'Settings'), { taille: 14, couleur: APP.muted });
    s += `<line x1="9" y1="746" x2="239" y2="746" stroke="${APP.line}" stroke-opacity="0.1"/>
      <circle cx="30" cy="773" r="13" fill="${APP.accent}"/>${texte(30, 777.5, 'T', { taille: 12, couleur: '#FFFFFF', poids: 600, ancre: 'middle' })}
      ${texte(53, 769, 'tristan', { taille: 13, couleur: APP.text, poids: 500 })}
      ${texte(53, 785, '127.0.0.1:8080', { taille: 11.5, couleur: APP.faint })}
      ${icone('LockSimple', 208, 764, 17, APP.muted)}`;
    return s;
  }

  /// The status bar at the foot of a wide window. Every figure is given,
  /// nothing is invented: [[dot colour or null, label, value], ...] on the
  /// left, the auto-lock countdown on the right.
  function barreEtat(elements, { verrou = '14:56', y = 776 } = {}) {
    let s = `<rect x="248" y="${y}" width="1032" height="${800 - y}" fill="${APP.surface}" fill-opacity="0.92"/>
      <line x1="248" y1="${y}" x2="1280" y2="${y}" stroke="${APP.line}" stroke-opacity="0.1"/>`;
    let x = 263;
    for (const [point, mot, val] of elements) {
      if (point) { s += `<circle cx="${x + 3}" cy="${y + 12}" r="3" fill="${point}"/>`; x += 11; }
      s += texte(x, y + 16, mot, { taille: 12, couleur: APP.muted });
      x += largeur(mot, 12) + 6;
      if (val) { s += texte(x, y + 16, val, { taille: 12, couleur: APP.text, poids: 500 }); x += largeur(val, 12, { poids: 500 }) + 20; } else x += 14;
    }
    const k = touches(1136, y + 4, ['Ctrl', 'K'], { h: 16, taille: 10 });
    s += texte(1076, y + 16, verrou, { taille: 12, couleur: APP.text, poids: 500, ancre: 'end' });
    s += texte(1076 - largeur(verrou, 12, { poids: 500 }) - 6, y + 16, t('Verrouillage dans', 'Locks in'), { taille: 12, couleur: APP.muted, ancre: 'end' });
    s += k.svg + texte(1136 + k.l + 7, y + 16, t('commandes', 'commands'), { taille: 12, couleur: APP.muted });
    return s;
  }

  // ------------------------------------------------------- the test data
  // The accounts of the screenshots, so a diagram shows what the plates show.
  const ENTREES = {
    banque: { nom: t('Banque', 'Bank'), cle: 'Banque', id: 'tristan.j', site: 'banque.fr' },
    netflix: { nom: 'Netflix', id: 'tristan@exemple.fr', site: 'netflix.com' },
    spotify: { nom: 'Spotify', id: 'tristanj', site: 'spotify.com' },
    messagerie: { nom: t('Messagerie', 'Mailbox'), cle: 'Messagerie', id: 'tristan@exemple.fr', site: 'mail.exemple.fr' },
    github: { nom: 'GitHub', id: 'Cybertrist', site: 'github.com' },
    amazon: { nom: 'Amazon', id: 'tristan@exemple.fr', site: 'amazon.fr' },
    demo: { nom: t('Site de démo', 'Demo site'), cle: 'Site de démo', id: 'tristan@exemple.fr', site: 'demo.serenity.test' },
  };

  /// One row of the vault list (Row.tsx), [l] wide: monogram, name,
  /// username, optional trailing icons and a caret.
  function ligneEntree(x, y, l, e, { h = 62, choisi = false, droite = [], chevron = true, taille = 16 } = {}) {
    let s = '';
    if (choisi) s += `<rect x="${x + 4}" y="${y + 3}" width="${l - 8}" height="${h - 6}" rx="10" fill="${APP.glassHi}" fill-opacity="0.75" stroke="${APP.line}" stroke-opacity="0.2"/>`;
    const m = taille * 2.35;
    s += monogramme(e.nom, x + 14, y + (h - m) / 2, m, { cle: e.cle });
    s += texte(x + 26 + m, y + h / 2 - 3, e.nom, { taille, couleur: APP.text, poids: 500 });
    s += texte(x + 26 + m, y + h / 2 + 16, e.id, { taille: taille * 0.84, couleur: APP.faint });
    let dx = x + l - (chevron ? 40 : 18);
    if (chevron) s += icone('CaretRight', x + l - 30, y + h / 2 - 9, 18, APP.faint);
    [...droite].reverse().forEach(([ic, c, poids]) => { s += icone(ic, dx - 18, y + h / 2 - 9, 18, c, poids || 'regular'); dx -= 26; });
    return s;
  }

  /// The heading of a zone in the list: its mark, its name, its count,
  /// and who can read it on the right.
  function enteteZone(x, y, l, zone, n, { taille = 15 } = {}) {
    const agent = zone === 'agent';
    const mot = agent ? t('Confié à l’agent', 'Handed to the agent') : t('Protégé par toi', 'Protected by you');
    const qui = agent ? t('L’agent peut les lire', 'The agent can read them') : t('Toi seul peux les lire', 'Only you can read them');
    return icone(agent ? 'Sparkle' : 'ShieldCheck', x, y - taille + 1, taille + 3, agent ? APP.violet : APP.accent, agent ? 'fill' : 'regular') +
      texte(x + taille + 12, y, mot, { taille, couleur: APP.text, poids: 600 }) +
      texte(x + taille + 12 + largeur(mot, taille, { poids: 600 }) + 8, y, String(n), { taille: taille * 0.9, couleur: APP.faint }) +
      texte(x + l, y, qui, { taille: taille * 0.8, couleur: APP.faint, ancre: 'end' });
  }

  return {
    EN, LG, t, esc, id, svg, texte, largeur, lignes, paragraphe, entete, rubrique, code,
    paliers, fondu, visible, entre, glisse, toucher, frappe, bille, fil, pointe,
    carte, etape, legendes,
    icone, oklch, teinte, verre, monogramme, anneau, orbe, puce, puceZone, kbd, touches, boutonPrimaire, bouton,
    boutonIcone, champ, segmente, force, toast, logo, marque, capture, dimensions, aurore, rubans,
    telephone, fenetre, enteteMobile, ongletsBas, ONGLETS, barreTitre, barreLaterale, barreEtat, ENTREES, ligneEntree, enteteZone,
    SANS, MONO, SYNE, FOND, CARTE, BORD, TITRE, TEXTE, DISCRET, FIL, ACCENT, ACCENT_TEXTE, VERT, AMBRE, ROUGE, APP, HUMEURS, TONS,
  };
};

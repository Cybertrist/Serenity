// The tests, running.
//
// On the left, a terminal plays the make targets that CI runs
// (.github/workflows/ci.yml), one after the other, with their real counts:
// pytest over api/tests, vitest over web/src, the crypto cross-check, the
// end-to-end journeys, the Chromium walk of every screen, the rotation on
// the demo site, the restore drill, and gitleaks. On the right, what each
// one proves: the 18 pytest files filling up, the 46 routes and their
// guards, the 87 vitest cases, a block crossing from Python to TypeScript
// and back, the 15 journeys, a phone walking the screens like ui-smoke
// does, the three outcomes of a rotation, a vault destroyed then restored.
// At the bottom, the eight CI jobs turn green as their target finishes.
//
// Every number here is counted in the repository: def test_ in api/tests
// (and the parametrize cases), it( in web/src, the routes and their
// Depends in api/serenity/routes, the screenshots of web/e2e/ui-smoke.mjs.
module.exports = (O) => {
  const A = require('./_ecrans-archi.js')(O);
  const E = require('./_ecrans.js')(O);
  const { t, svg, texte, entete, rubrique, entre, visible, fondu, frappe, icone, telephone, toucher, bille, pointe, paragraphe,
    ENTREES, CARTE, BORD, TITRE, TEXTE, DISCRET, FIL, ACCENT, ACCENT_TEXTE, VERT, ROUGE, MONO } = O;
  const C = 40;
  const H = 812;
  const FIN = 0.985;

  let corps = entete(t('LES TESTS', 'THE TESTS'),
    t('Ce que la CI rejoue à chaque push. Chaque nombre ici est compté dans le dépôt.',
      'What CI replays on every push. Every number here is counted in the repository.'));

  // ------------------------------------------------------------ the slots
  const S = {
    test: [0.015, 0.2], web: [0.2, 0.31], interop: [0.31, 0.41], e2e: [0.41, 0.52],
    ui: [0.52, 0.71], rotation: [0.71, 0.81], backup: [0.81, 0.9], secrets: [0.9, FIN],
  };
  const GARDES = 0.125; // inside the pytest slot: the route guards take over
  const fin = (k) => S[k][1] - 0.012; // the target reports

  // ------------------------------------------------------------ the terminal
  const TX = 48, TY = 92, TL = 532, TH = 604;
  corps += A.terminal(TX, TY, TL, TH, 'serenity');
  const LIGNE = [];
  const cmd = (k, s) => LIGNE.push({ k, s, cmd: true });
  const out = (k, s, { ok = false, a = null } = {}) => LIGNE.push({ k, s, ok, a });
  cmd('test', '$ make test');
  out('test', 'collected 213 items', { a: S.test[0] + 0.03 });
  out('test', '208 passed, 5 skipped', { ok: true });
  cmd('web', '$ make web-test');
  out('web', t('eslint, prettier, tsc, vite build : propres', 'eslint, prettier, tsc, vite build: clean'), { a: S.web[0] + 0.045 });
  out('web', 'Tests  87 passed | 17 skipped (104)', { ok: true });
  cmd('interop', '$ make crypto-interop');
  out('interop', t('Python chiffre, TypeScript déchiffre', 'Python encrypts, TypeScript decrypts'), { a: S.interop[0] + 0.05 });
  out('interop', t('TypeScript chiffre, Python déchiffre', 'TypeScript encrypts, Python decrypts'), { ok: true });
  cmd('e2e', '$ make e2e');
  out('e2e', 'Tests  15 passed (15)', { ok: true });
  cmd('ui', '$ make ui-smoke');
  out('ui', 'UI smoke: OK, screenshots in web/e2e/shots', { ok: true });
  cmd('rotation', '$ make rotation-demo');
  out('rotation', '5 passed', { ok: true });
  cmd('backup', '$ make backup-check');
  out('backup', t('== le coffre disparaît (disque perdu, VM effacée) ==', '== the vault is gone (disk lost, VM wiped) =='), { a: S.backup[0] + 0.04 });
  out('backup', t('drill: base et clés restaurées, contenu vérifié.', 'drill: database and keys restored, content checked.'), { ok: true });
  cmd('secrets', '$ gitleaks detect --redact');
  out('secrets', 'no leaks found', { ok: true });

  let y = TY + 66;
  let avant = null;
  for (const l of LIGNE) {
    if (l.cmd && avant) y += 10;
    avant = l.k;
    const [de] = S[l.k];
    if (l.cmd) {
      corps += entre(C, de, FIN, frappe(TX + 22, y, l.s, C, de, de + 0.012, { taille: 13, couleur: TITRE, police: MONO, poids: 600 }), 0.003);
    } else {
      const a = l.a || fin(l.k);
      corps += entre(C, a, FIN, (l.ok ? icone('Check', TX + 26, y - 12, 14, VERT, 'bold') : '') +
        texte(TX + 46, y, l.s, { taille: 12.5, couleur: l.ok ? VERT : TEXTE, police: MONO }), 0.003);
    }
    y += 21;
  }
  // The caret waits on the line of the running target.
  corps += texte(TX + 22, TY + TH - 24, t('Chaque cible tourne dans Docker : ni Python ni Node à installer.', 'Each target runs in Docker: no Python or Node to install.'), { taille: 12.5, couleur: DISCRET });

  // ------------------------------------------------------------ the panel
  const PX = 612, PY = 92, PL = 620, PH = 604;
  corps += `<rect x="${PX}" y="${PY}" width="${PL}" height="${PH}" rx="16" fill="${CARTE}" stroke="${BORD}"/>`;
  const IX = PX + 28, IL = PL - 56;
  const titrePanneau = (titre, sous) => texte(IX, PY + 44, titre, { taille: 16, couleur: TITRE, poids: 600 }) +
    paragraphe(IX, PY + 70, sous, { taille: 12.5, max: IL, couleur: TEXTE });
  const panneau = (de, a, contenu) => { corps += entre(C, de, a, contenu, 0.008); };
  const coche = (x, y, de, { taille = 16 } = {}) => `<circle cx="${x}" cy="${y}" r="${taille / 2 + 2}" fill="none" stroke="${FIL}" stroke-width="1.5"/>
    <g opacity="0">${visible(C, de, 1.2, 0.004)}<circle cx="${x}" cy="${y}" r="${taille / 2 + 2}" fill="${VERT}" fill-opacity="0.16" stroke="${VERT}" stroke-width="1.5"/>
    ${icone('Check', x - taille / 2 + 2, y - taille / 2 + 2, taille - 4, VERT, 'bold')}</g>`;

  // ---- 1a. pytest: the eighteen files fill up one after the other.
  {
    const F = [['test_watch.py', 28], ['test_rotation.py', 26], ['test_agent.py', 24], ['test_auth.py', 23], ['test_vault.py', 13],
      ['test_infra.py', 11], ['test_db.py', 9], ['test_executor.py', 8], ['crypto/test_vectors.py', 8], ['test_audit.py', 7],
      ['crypto/test_properties.py', 7], ['test_policy.py', 6], ['test_rotation_demo.py', 5], ['test_origin.py', 4], ['test_throttle.py', 4],
      ['test_route_guards.py', 3], ['test_devclient.py', 1], ['test_health.py', 1]];
    const total = F.reduce((s, f) => s + f[1], 0);
    const [d0] = S.test, d1 = GARDES - 0.01;
    let s = titrePanneau(t('make test : pytest sur api/tests', 'make test: pytest over api/tests'),
      t('18 fichiers, 188 fonctions de test, 213 cas avec les paramètres. Les 5 du site de démo attendent make rotation-demo.',
        '18 files, 188 test functions, 213 cases with the parameters. The 5 of the demo site wait for make rotation-demo.'));
    const BX = IX + 214, BW = IL - 214 - 40, PAS = 25;
    let acc = 0;
    F.forEach(([nom, n], i) => {
      const yy = PY + 118 + i * PAS;
      const de = d0 + 0.02 + (acc / total) * (d1 - d0 - 0.02), a = d0 + 0.02 + ((acc + n) / total) * (d1 - d0 - 0.02);
      acc += n;
      const w = Math.max(4, (n / 28) * BW);
      s += texte(IX, yy + 4, nom, { taille: 12, couleur: TEXTE, police: MONO });
      s += `<rect x="${BX}" y="${yy - 6}" width="${BW}" height="10" rx="5" fill="${FIL}" fill-opacity="0.35"/>`;
      s += `<rect x="${BX}" y="${yy - 6}" width="0" height="10" rx="5" fill="${ACCENT}">${fondu('width', C, [[0, 0], [de, 0], [a, w], [1, w]])}</rect>`;
      s += `<g opacity="0">${visible(C, a, 1.2, 0.003)}${texte(IX + IL, yy + 4, String(n), { taille: 12, couleur: TITRE, police: MONO, poids: 600, ancre: 'end' })}</g>`;
    });
    panneau(d0, GARDES, s);
  }

  // ---- 1b. test_route_guards: the 46 routes and their guard.
  {
    const PUBLIQUES = ['GET  /api/health', 'GET  /api/crypto/server-key', 'GET  /api/auth/status', 'POST /api/auth/prelogin', 'POST /api/auth/signup',
      'POST /api/auth/signup/confirm', 'POST /api/auth/login', 'POST /api/auth/recover/start', 'POST /api/auth/recover/complete'];
    let s = titrePanneau(t('test_route_guards : chaque route a sa garde', 'test_route_guards: every route has its guard'),
      t('46 routes. Une route sans garde, ou une écriture sans mot de passe maître, fait échouer la CI.',
        '46 routes. A route without a guard, or a write without the master password, fails CI.'));
    const y0 = PY + 112;
    // The nine open routes, each written down with its reason.
    s += `<rect x="${IX}" y="${y0}" width="${IL}" height="210" rx="12" fill="none" stroke="${BORD}"/>`;
    s += texte(IX + 20, y0 + 30, t('9 publiques, chacune avec sa raison écrite', '9 public, each with its reason written down'), { taille: 13.5, couleur: TITRE, poids: 600 });
    PUBLIQUES.forEach((r, i) => {
      const col = i < 5 ? 0 : 1, row = i % 5;
      s += texte(IX + 20 + col * 272, y0 + 60 + row * 28, r, { taille: 12, couleur: TEXTE, police: MONO });
    });
    const groupe = (yy, n, titre, sous, plein, de) => {
      let g = `<rect x="${IX}" y="${yy}" width="${IL}" height="116" rx="12" fill="none" stroke="${BORD}"/>`;
      g += texte(IX + 20, yy + 30, titre, { taille: 13.5, couleur: TITRE, poids: 600 }) + texte(IX + IL - 20, yy + 30, sous, { taille: 12.5, couleur: DISCRET, police: MONO, ancre: 'end' });
      for (let i = 0; i < n; i++) {
        const x = IX + 20 + (i % 20) * 26, y = yy + 50 + Math.floor(i / 20) * 26;
        const on = de + (i / n) * 0.02;
        g += `<rect x="${x}" y="${y}" width="18" height="18" rx="5" fill="none" stroke="${FIL}" stroke-width="1.5"/>`;
        g += `<rect x="${x}" y="${y}" width="18" height="18" rx="5" fill="${ACCENT}" fill-opacity="${plein ? 0.85 : 0.12}" stroke="${ACCENT}" stroke-width="1.5" opacity="0">${visible(C, on, 1.2, 0.003)}</rect>`;
      }
      return g;
    };
    s += groupe(y0 + 226, 20, t('20 derrière une session', '20 behind a session'), 'require_session', false, GARDES + 0.012);
    s += groupe(y0 + 358, 17, t('17 derrière un coffre déverrouillé', '17 behind an unlocked vault'), 'require_unlocked', true, GARDES + 0.035);
    panneau(GARDES, S.test[1], s);
  }

  // ---- 2. web-test: the four checks, then the 87 vitest cases.
  {
    const [d0, d1] = S.web;
    let s = titrePanneau(t('make web-test : le client, dans Node 22', 'make web-test: the client, in Node 22'),
      t('Lint, format, types stricts et build de production, puis vitest sur web/src. Les 17 qui attendent un vrai serveur ou des blocs de Python ont leur propre cible.',
        'Lint, format, strict types and the production build, then vitest over web/src. The 17 that need a real server or blocks from Python have their own target.'));
    const OUTILS = ['eslint', 'prettier', 'tsc --noEmit', 'vite build'];
    OUTILS.forEach((o, i) => {
      const x = IX + i * (IL / 4);
      s += coche(x + 12, PY + 136, d0 + 0.012 + i * 0.008) + texte(x + 30, PY + 141, o, { taille: 12.5, couleur: TITRE, police: MONO });
    });
    const G = [['src/vault', t('coffre, import, générateur', 'vault, import, generator'), 33], ['src/lib', t('API, formats, TOTP', 'API, formats, TOTP'), 15],
      ['src/crypto', t('vecteurs et propriétés', 'vectors and properties'), 13], ['src/app', t('presse-papiers, raccourcis', 'clipboard, shortcuts'), 13],
      ['src/features', t('QR, analyse des fuites', 'QR, breach scan'), 13]];
    const t0 = d0 + 0.05, t1 = d1 - 0.015;
    let acc = 0;
    G.forEach(([dossier, sous, n], i) => {
      const yy = PY + 190 + i * 76;
      s += texte(IX, yy, dossier, { taille: 13, couleur: TITRE, police: MONO, poids: 600 }) + texte(IX + 120, yy, sous, { taille: 12.5, couleur: TEXTE });
      s += texte(IX + IL, yy, String(n), { taille: 13, couleur: TITRE, police: MONO, poids: 600, ancre: 'end' });
      for (let k = 0; k < n; k++) {
        const x = IX + 4 + (k % 33) * 17, y2 = yy + 22 + Math.floor(k / 33) * 17;
        const on = t0 + ((acc + k) / 87) * (t1 - t0);
        s += `<circle cx="${x + 5}" cy="${y2 + 5}" r="5" fill="none" stroke="${FIL}" stroke-width="1.3"/>`;
        s += `<circle cx="${x + 5}" cy="${y2 + 5}" r="5" fill="${VERT}" opacity="0">${visible(C, on, 1.2, 0.002)}</circle>`;
      }
      acc += n;
    });
    panneau(d0, d1, s);
  }

  // ---- 3. crypto-interop: a block from Python to TypeScript, and back.
  {
    const [d0, d1] = S.interop;
    let s = titrePanneau(t('make crypto-interop : les deux moitiés parlent la même crypto', 'make crypto-interop: both halves speak the same crypto'),
      t('Des blocs neufs, avec des nonces tirés au hasard : l’un chiffre, l’autre doit déchiffrer. Puis l’inverse.',
        'Fresh blocks, with random nonces: one side encrypts, the other must decrypt. Then the other way round.'));
    const cote = (x, titre, lib, ic) => `<rect x="${x}" y="${PY + 150}" width="220" height="150" rx="14" fill="none" stroke="${BORD}"/>
      <rect x="${x + 20}" y="${PY + 170}" width="34" height="34" rx="9" fill="${ACCENT}" fill-opacity="0.12"/>${icone(ic, x + 28, PY + 178, 18, ACCENT_TEXTE)}
      ${texte(x + 66, PY + 186, titre, { taille: 15, couleur: TITRE, poids: 600 })}
      ${texte(x + 66, PY + 204, lib, { taille: 12, couleur: DISCRET, police: MONO })}`;
    s += cote(IX, 'Python', 'PyNaCl', 'Cube') + cote(IX + IL - 220, 'TypeScript', 'libsodium', 'Browser');
    // The two passes, as the CI job runs them.
    const passe = (yy, de, a, gauche) => {
      const x1 = gauche ? IX + 220 : IX + IL - 220, x2 = gauche ? IX + IL - 220 : IX + 220;
      const ch = `M${x1 + (gauche ? 8 : -8)} ${yy} L${x2 + (gauche ? -8 : 8)} ${yy}`;
      return A.fil(C, ch, [[de, 1.2]]) + pointe(x2 + (gauche ? -6 : 6), yy, gauche ? 0 : 180, FIL) + bille(C, ch, de, a);
    };
    const p1 = d0 + 0.02, p2 = d0 + 0.055;
    s += passe(PY + 236, p1, p1 + 0.022, true) + passe(PY + 272, p2, p2 + 0.022, false);
    s += texte(IX + 20, PY + 241, t('chiffre', 'encrypts'), { taille: 12.5, couleur: TEXTE }) + coche(IX + 190, PY + 272, p2 + 0.024, { taille: 14 }) + texte(IX + 20, PY + 277, t('déchiffre', 'decrypts'), { taille: 12.5, couleur: TEXTE });
    s += texte(IX + IL - 200, PY + 241, t('déchiffre', 'decrypts'), { taille: 12.5, couleur: TEXTE }) + coche(IX + IL - 30, PY + 236, p1 + 0.024, { taille: 14 }) + texte(IX + IL - 200, PY + 277, t('chiffre', 'encrypts'), { taille: 12.5, couleur: TEXTE });
    const regles = [
      ['Key', t('Une seule bibliothèque, libsodium, des deux côtés. Aucune primitive écrite à la main.', 'One library, libsodium, on both sides. No primitive written by hand.')],
      ['FileText', t('Les vecteurs figés de shared/test-vectors sont déjà relus par pytest et par vitest.', 'The fixed vectors of shared/test-vectors are already read back by pytest and vitest.')],
      ['ShieldCheck', t('Un seul octet qui diverge, et un bloc chiffré sur le serveur ne s’ouvrirait plus sur ton téléphone.', 'A single diverging byte, and a block encrypted on the server would no longer open on your phone.')],
    ];
    regles.forEach(([ic, phrase], i) => {
      const yy = PY + 346 + i * 72;
      s += `<rect x="${IX}" y="${yy}" width="${IL}" height="58" rx="12" fill="none" stroke="${BORD}"/>` + icone(ic, IX + 18, yy + 19, 20, ACCENT_TEXTE) +
        paragraphe(IX + 52, yy + 26, phrase, { taille: 12.5, max: IL - 76, couleur: TEXTE, interligne: 18 });
    });
    panneau(d0, d1, s);
  }

  // ---- 4. e2e: the fifteen journeys, the real client against the real API.
  {
    const [d0, d1] = S.e2e;
    let s = titrePanneau(t('make e2e : le vrai client contre la vraie API', 'make e2e: the real client against the real API'),
      t('Le code TypeScript de l’appli parle à tests/e2e_server.py, sur le port 8765, un fichier après l’autre.',
        'The app’s TypeScript code talks to tests/e2e_server.py, on port 8765, one file after the other.'));
    const J = [
      [t('Compte', 'Account'), [
        t('crée le compte, montre le kit une fois, ferme l’inscription', 'signs up, shows the kit once, closes registration'),
        t('se connecte sur un autre appareil, ouvre les mêmes clés', 'logs in on another device, unwraps the same keys'),
        t('mauvais mot de passe ou mauvais code : la même réponse', 'wrong password or wrong code: the same answer'),
        t('verrouillé : le mot de passe maître redevient nécessaire', 'locked: the master password is needed again'),
        t('change le mot de passe maître, déconnecte les autres', 'changes the master password, logs the others out'),
        t('refait le kit : l’ancien meurt, le coffre reste', 'regenerates the kit: the old one dies, the vault stays'),
        t('récupère avec le kit, qui est ensuite remplacé', 'recovers with the kit, which is then replaced')]],
      [t('Coffre', 'Vault'), [
        t('prépare un compte sur deux appareils', 'prepares an account on two devices'),
        t('ajoute sur l’un, retrouve sur l’autre', 'adds on one device, syncs on the other'),
        t('repère une modification concurrente', 'detects a concurrent edit'),
        t('confie, reprend, garde un historique lisible', 'delegates, reclaims, keeps a readable history'),
        t('importe un export Bitwarden, met à la corbeille', 'imports a Bitwarden export, trashes an entry')]],
      [t('Veille', 'Watch'), [
        t('reçoit une analyse, dédoublonne, résout, prévient', 'takes a scan, dedupes, resolves, notifies'),
        t('n’interroge le réseau que sur ce que prévoit le plan', 'only asks the network about what the plan holds')]],
      [t('Agent', 'Agent'), [
        t('politique, échéance, accord, refus et kill switch', 'policy, due date, approval, refusal and kill switch')]],
    ];
    let yy = PY + 118, k = 0;
    const t0 = d0 + 0.012, pas = (d1 - 0.015 - t0) / 15;
    for (const [groupe, liste] of J) {
      s += texte(IX, yy, groupe.toUpperCase(), { taille: 12, couleur: ACCENT_TEXTE, police: MONO, poids: 600, espace: 1.5 }) +
        texte(IX + IL, yy, String(liste.length), { taille: 12, couleur: DISCRET, police: MONO, ancre: 'end' });
      yy += 24;
      for (const nom of liste) {
        const de = t0 + k * pas;
        s += `<rect x="${IX - 8}" y="${yy - 15}" width="${IL + 16}" height="21" rx="6" fill="${ACCENT}" fill-opacity="0.1" opacity="0">${visible(C, de, de + pas, 0.002)}</rect>`;
        s += coche(IX + 8, yy - 4, de + pas * 0.85, { taille: 12 }) + texte(IX + 28, yy, nom, { taille: 12.5, couleur: TITRE });
        yy += 23;
        k++;
      }
      yy += 8;
    }
    panneau(d0, d1, s);
  }

  // ---- 5. ui-smoke: Chromium walks every screen; here, the phone pass.
  {
    const [d0, d1] = S.ui;
    let s = titrePanneau(t('make ui-smoke : Chromium parcourt tous les écrans', 'make ui-smoke: Chromium walks every screen'),
      t('L’image web de production, avec sa CSP stricte. Une erreur de console ou une violation de CSP, et c’est rouge.',
        'The production web image, with its strict CSP. One console error or CSP violation, and it goes red.'));
    const T = telephone(IX, PY + 112, 470);
    s += T.cadre;
    const e = [d0 + 0.012, d0 + 0.04, d0 + 0.065, d0 + 0.09, d0 + 0.115, d0 + 0.14, d1];
    let ecran = '';
    ecran += entre(C, e[0], e[1], E.coffre({ netflix: 'toi' }) + toucher(195, 410, C, e[1] - 0.006), 0.004);
    ecran += entre(C, e[1], e[2], E.fiche({ zone: 'toi' }) + toucher(114, 558, C, e[2] - 0.006), 0.004);
    const d = E.dialogue({
      titre: t('Confier cette entrée à l’agent ?', 'Hand this entry to the agent?'),
      texte: t('Le serveur pourra la déchiffrer pour surveiller les fuites et changer son mot de passe. Il pourra aussi calculer son code à deux facteurs, ce dont l’agent a besoin pour se reconnecter. Tu peux la reprendre à tout moment.',
        'The server will be able to decrypt it, to watch for breaches and change its password. It will also be able to compute its two-factor code, which the agent needs to sign in again. You can take it back at any time.'),
      valider: t('Confier', 'Hand over'),
    });
    ecran += entre(C, e[2], e[3], E.fiche({ zone: 'toi' }) + d.svg + toucher(279, d.boutons, C, e[3] - 0.006), 0.004);
    ecran += entre(C, e[3], e[4], E.fiche({ zone: 'agent', secondes: 14 }), 0.004);
    ecran += entre(C, e[4], e[5], E.coffre({ netflix: 'agent' }), 0.004);
    ecran += entre(C, e[5], e[6], A.agent(ENTREES.netflix, { autorise: false }).svg, 0.004);
    s += T.ecran(ecran);
    const noms = ['05-coffre', '06-fiche', '07-confier', '08a-fiche-confiee', '08-coffre-delegue', '11-agent'];
    noms.forEach((n, i) => { s += entre(C, e[i], e[i + 1], texte(IX + T.largeur / 2, PY + 598 - 4, `${n}.png`, { taille: 12, couleur: DISCRET, police: MONO, ancre: 'middle' }), 0.004); });
    // The four passes, and what each one looks at.
    const PASSES = [
      ['DeviceMobile', t('Téléphone', 'Phone'), '390 × 844', 21, t('et hors ligne', 'and offline')],
      ['Monitor', t('Bureau', 'Desktop'), '1440 × 900', 24, t('palette, guide, réglages', 'palette, guide, settings')],
      ['Sun', t('Thème clair', 'Light theme'), '1440 × 900', 12, t('jusqu’à l’écran verrouillé', 'down to the lock screen')],
      ['Desktop', t('Appli de bureau', 'Desktop app'), '1280 × 800', 5, t('sa propre barre de titre', 'its own title bar')],
    ];
    const QX = IX + T.largeur + 28, QL = IX + IL - QX;
    PASSES.forEach(([ic, nom, taille, n, sous], i) => {
      const yy = PY + 112 + i * 100;
      const de = i === 0 ? e[0] : e[5] + (i - 1) * 0.014, a = i === 0 ? e[5] : de + 0.014;
      s += A.cadre(QX, yy, QL, 86, C, [[de, a]]);
      s += icone(ic, QX + 18, yy + 18, 20, ACCENT_TEXTE);
      s += texte(QX + 48, yy + 33, nom, { taille: 14, couleur: TITRE, poids: 600 }) + texte(QX + QL - 18, yy + 33, taille, { taille: 12, couleur: DISCRET, police: MONO, ancre: 'end' });
      s += texte(QX + 18, yy + 64, t(`${n} captures, ${sous}`, `${n} screenshots, ${sous}`), { taille: 12.5, couleur: TEXTE });
      s += coche(QX + QL - 28, yy + 60, a, { taille: 14 });
    });
    s += texte(QX, PY + 548, t('62 captures en tout, dans web/e2e/shots.', '62 screenshots in all, in web/e2e/shots.'), { taille: 12.5, couleur: TITRE, poids: 500 });
    s += texte(QX, PY + 570, t('Elles nourrissent aussi ce README.', 'They also feed this README.'), { taille: 12.5, couleur: TEXTE });
    panneau(d0, d1, s);
  }

  // ---- 6. rotation-demo: a real browser, a real site, three outcomes.
  {
    const [d0, d1] = S.rotation;
    let s = titrePanneau(t('make rotation-demo : un vrai navigateur, un vrai site', 'make rotation-demo: a real browser, a real site'),
      t('Le code de l’agent, le rotateur et le site de démo, chacun dans son conteneur, sur un réseau jetable.',
        'The agent’s code, the rotator and the demo site, each in its container, on a throwaway network.'));
    const ISSUES = [
      ['CheckCircle', VERT, t('Le mot de passe change pour de vrai', 'The password really changes'), t('le site accepte le nouveau et refuse l’ancien', 'the site takes the new one and refuses the old one')],
      ['ArrowCounterClockwise', ROUGE, t('Le site refuse la connexion', 'The site refuses the login'), t('retour arrière : rien ne bouge dans le coffre', 'rollback: nothing moves in the vault')],
      ['Prohibit', ROUGE, t('Le site est hors allowlist', 'The site is outside the allowlist'), t('il n’est jamais touché', 'it is never touched')],
      ['ListChecks', ACCENT_TEXTE, t('L’inspection d’une page', 'Inspecting a page'), t('liste ses vrais champs, et exige le jeton', 'lists its real fields, and needs the token')],
    ];
    ISSUES.forEach(([ic, c, titre, sous], i) => {
      const yy = PY + 118 + i * 112, de = d0 + 0.015 + i * 0.018;
      s += A.cadre(IX, yy, IL, 94, C, [[de, de + 0.018]]);
      s += `<rect x="${IX + 20}" y="${yy + 26}" width="42" height="42" rx="12" fill="${c}" fill-opacity="0.12"/>` + icone(ic, IX + 30, yy + 36, 22, c);
      s += texte(IX + 80, yy + 42, titre, { taille: 14.5, couleur: TITRE, poids: 600 }) + texte(IX + 80, yy + 64, sous, { taille: 12.5, couleur: TEXTE });
      s += coche(IX + IL - 34, yy + 47, de + 0.016);
    });
    panneau(d0, d1, s);
  }

  // ---- 7. backup-check: a throwaway vault, backed up, destroyed, restored.
  {
    const [d0, d1] = S.backup;
    let s = titrePanneau(t('make backup-check : restaurer pour de vrai', 'make backup-check: restoring for real'),
      t('Une sauvegarde que personne n’a restaurée est une rumeur. Le script bâtit un coffre jetable, le sauvegarde, le détruit pour de bon, le restaure et vérifie.',
        'A backup nobody restored is a rumour. The script builds a throwaway vault, backs it up, destroys it for good, restores it and checks.'));
    const ET = [
      ['Vault', t('Un coffre jetable', 'A throwaway vault'), t('un compte, une entrée', 'one account, one entry')],
      ['CloudArrowUp', t('Sauvegarde', 'Backup'), t('restic, base et clés', 'restic, database and keys')],
      ['Trash', t('Le coffre disparaît', 'The vault is gone'), t('disque perdu, VM effacée', 'disk lost, VM wiped')],
      ['ArrowCounterClockwise', t('Restauration', 'Restore'), t('contenu vérifié', 'content checked')],
    ];
    const W = (IL - 3 * 20) / 4;
    ET.forEach(([ic, titre, sous], i) => {
      const x = IX + i * (W + 20), yy = PY + 124, de = d0 + 0.012 + i * 0.016;
      s += A.cadre(x, yy, W, 150, C, [[de, i === 2 ? de + 0.016 : 1.2]]);
      s += icone(ic, x + W / 2 - 14, yy + 26, 28, i === 2 ? DISCRET : ACCENT_TEXTE);
      s += paragraphe(x + W / 2, yy + 84, titre, { taille: 13.5, max: W - 28, couleur: TITRE, poids: 600, ancre: 'middle', interligne: 19 });
      s += paragraphe(x + W / 2, yy + 126, sous, { taille: 12, max: W - 24, couleur: TEXTE, ancre: 'middle', interligne: 17 });
      if (i < 3) s += pointe(x + W + 13, yy + 75, 0, FIL);
    });
    s += `<rect x="${IX}" y="${PY + 300}" width="${IL}" height="108" rx="12" fill="none" stroke="${BORD}"/>` + icone('Key', IX + 20, PY + 322, 20, ACCENT_TEXTE) +
      paragraphe(IX + 54, PY + 336, t('Les deux clés doivent revenir aussi. Sans la clé serveur, la zone agent restaurée ne se rouvrirait jamais : le script échoue si l’une manque.',
        'Both keys must come back too. Without the server key, the restored agent zone would never open again: the script fails if one is missing.'), { taille: 13, max: IL - 80, couleur: TEXTE, interligne: 20 });
    s += `<rect x="${IX}" y="${PY + 424}" width="${IL}" height="108" rx="12" fill="none" stroke="${BORD}"/>` + icone('ShieldCheck', IX + 20, PY + 446, 20, ACCENT_TEXTE) +
      paragraphe(IX + 54, PY + 460, t('La restauration n’écrase jamais une stack qui tourne. Sur la vraie VM, make restore-check relit la dernière sauvegarde sans rien écrire.',
        'A restore never overwrites a running stack. On the real VM, make restore-check reads the latest backup back without writing anything.'), { taille: 13, max: IL - 80, couleur: TEXTE, interligne: 20 });
    panneau(d0, d1, s);
  }

  // ---- 8. gitleaks: the whole history, no secret.
  {
    const [d0, d1] = S.secrets;
    let s = titrePanneau(t('gitleaks : aucun secret dans l’historique', 'gitleaks: no secret in the history'),
      t('Le job clone tout l’historique, pas seulement le dernier commit, et cherche des clés, des jetons, des mots de passe.',
        'The job clones the whole history, not just the last commit, and looks for keys, tokens, passwords.'));
    const L3 = [
      ['Stack', 'fetch-depth: 0', t('chaque commit depuis le premier', 'every commit since the first one')],
      ['Hash', 'gitleaks:allow', t('les secrets publics des RFC, marqués un par un', 'the public RFC test secrets, marked one by one')],
      ['SealCheck', 'no leaks found', t('sinon, la CI casse et on répare tout de suite', 'otherwise CI breaks and gets fixed right away')],
    ];
    L3.forEach(([ic, code, sous], i) => {
      const yy = PY + 124 + i * 104, de = d0 + 0.012 + i * 0.016;
      s += A.cadre(IX, yy, IL, 84, C, [[de, 1.2]]);
      s += icone(ic, IX + 20, yy + 20, 22, ACCENT_TEXTE);
      s += texte(IX + 56, yy + 37, code, { taille: 14, couleur: TITRE, police: MONO, poids: 600 }) + texte(IX + 56, yy + 60, sous, { taille: 12.5, couleur: TEXTE });
      s += coche(IX + IL - 34, yy + 42, de + 0.014);
    });
    s += `<rect x="${IX}" y="${PY + 452}" width="${IL}" height="96" rx="12" fill="none" stroke="${BORD}"/>` + icone('Desktop', IX + 20, PY + 472, 22, ACCENT_TEXTE) +
      texte(IX + 56, PY + 489, 'desktop.yml', { taille: 14, couleur: TITRE, police: MONO, poids: 600 }) +
      paragraphe(IX + 56, PY + 512, t('À côté, l’appli de bureau se construit sous Windows et Linux à chaque changement de desktop/, et part avec chaque Release taguée.',
        'Alongside, the desktop app builds on Windows and Linux whenever desktop/ changes, and ships with each tagged Release.'), { taille: 12.5, max: IL - 80, couleur: TEXTE, interligne: 19 });
    panneau(d0, 1.2, s);
  }

  // ------------------------------------------------------------ the CI jobs
  const JOBS = [['Backend', 'test'], ['Frontend', 'web'], ['Crypto interop', 'interop'], ['End-to-end', 'e2e'], ['UI smoke', 'ui'],
    ['Rotation', 'rotation'], [t('Sauvegarde', 'Backup'), 'backup'], ['Secret scan', 'secrets']];
  const JY = 736, JW = (1232 - 48 - 7 * 10) / 8;
  corps += rubrique(48, JY - 8, t('LES 8 JOBS DE CI.YML, À CHAQUE PUSH SUR MAIN ET CHAQUE PR', 'THE 8 JOBS OF CI.YML, ON EVERY PUSH TO MAIN AND EVERY PR'));
  JOBS.forEach(([nom, k], i) => {
    const x = 48 + i * (JW + 10);
    corps += `<rect x="${x}" y="${JY + 8}" width="${JW}" height="46" rx="12" fill="${CARTE}" stroke="${BORD}"/>`;
    corps += `<rect x="${x}" y="${JY + 8}" width="${JW}" height="46" rx="12" fill="${VERT}" fill-opacity="0.06" stroke="${VERT}" stroke-opacity="0.6" opacity="0">${visible(C, fin(k), FIN)}</rect>`;
    corps += `<circle cx="${x + 22}" cy="${JY + 31}" r="7" fill="none" stroke="${FIL}" stroke-width="1.5"/>`;
    corps += `<g opacity="0">${visible(C, S[k][0], fin(k), 0.004)}<circle cx="${x + 22}" cy="${JY + 31}" r="7" fill="none" stroke="${ACCENT}" stroke-width="1.8" stroke-dasharray="14 30">
      <animateTransform attributeName="transform" type="rotate" from="0 ${x + 22} ${JY + 31}" to="360 ${x + 22} ${JY + 31}" dur="0.9s" repeatCount="indefinite"/></circle></g>`;
    corps += `<g opacity="0">${visible(C, fin(k), FIN, 0.004)}<circle cx="${x + 22}" cy="${JY + 31}" r="8" fill="${VERT}" fill-opacity="0.18"/>${icone('Check', x + 16, JY + 25, 12, VERT, 'bold')}</g>`;
    corps += texte(x + 38, JY + 36, nom, { taille: 12.5, couleur: TITRE, poids: 500 });
  });

  svg('tests.svg', 1280, H, corps, t(
    'Les tests de Serenity, qui tournent. À gauche, un terminal rejoue les cibles que la CI lance à chaque push : make test, 213 cas collectés, 208 passés et 5 laissés au site de démo ; make web-test, eslint, prettier, tsc et vite build propres, puis 87 tests vitest passés et 17 laissés à leur cible ; make crypto-interop, Python chiffre et TypeScript déchiffre, puis l’inverse ; make e2e, 15 parcours passés ; make ui-smoke, qui finit sur « UI smoke: OK » ; make rotation-demo, 5 tests passés ; make backup-check, le coffre disparaît puis revient, base et clés restaurées ; gitleaks, aucune fuite. À droite, ce que chacune prouve : les 18 fichiers de pytest qui se remplissent, de test_watch.py avec 28 tests à test_health.py avec 1, soit 188 fonctions de test ; test_route_guards, 46 routes, dont 9 publiques écrites une par une avec leur raison, 20 derrière une session et 17 derrière un coffre déverrouillé ; les 87 cas de vitest, par dossier, 33 dans src/vault, 15 dans src/lib, 13 dans src/crypto, 13 dans src/app, 13 dans src/features ; un bloc qui passe de Python, PyNaCl, à TypeScript, libsodium, puis revient, avec des nonces neufs ; les 15 parcours du vrai client contre la vraie API, 7 pour le compte, 5 pour le coffre, 2 pour la veille, 1 pour l’agent ; un téléphone qui parcourt les écrans comme ui-smoke, le coffre, la fiche Netflix, la confirmation « Confier à l’agent », la fiche confiée, le coffre délégué et l’écran Agent, avec les quatre passages, téléphone 390 × 844 avec 21 captures, bureau 1440 × 900 avec 24, thème clair avec 12, appli de bureau 1280 × 800 avec 5, soit 62 captures ; la rotation sur le site de démo, où le mot de passe change pour de vrai, où un refus du site ramène tout en arrière, où un site hors allowlist n’est jamais touché, et où l’inspection d’une page exige le jeton ; l’exercice de sauvegarde, un coffre jetable sauvegardé, détruit puis restauré avec ses deux clés ; gitleaks sur tout l’historique. En bas, les 8 jobs de ci.yml passent au vert l’un après l’autre : Backend, Frontend, Crypto interop, End-to-end, UI smoke, Rotation, Sauvegarde, Secret scan.',
    'The Serenity tests, running. On the left, a terminal replays the targets CI runs on every push: make test, 213 cases collected, 208 passed and 5 left to the demo site; make web-test, eslint, prettier, tsc and vite build clean, then 87 vitest tests passed and 17 left to their target; make crypto-interop, Python encrypts and TypeScript decrypts, then the other way round; make e2e, 15 journeys passed; make ui-smoke, which ends on “UI smoke: OK”; make rotation-demo, 5 tests passed; make backup-check, the vault disappears then comes back, database and keys restored; gitleaks, no leaks. On the right, what each one proves: the 18 pytest files filling up, from test_watch.py with 28 tests to test_health.py with 1, 188 test functions in all; test_route_guards, 46 routes, of which 9 public ones written down one by one with their reason, 20 behind a session and 17 behind an unlocked vault; the 87 vitest cases, per folder, 33 in src/vault, 15 in src/lib, 13 in src/crypto, 13 in src/app, 13 in src/features; a block going from Python, PyNaCl, to TypeScript, libsodium, and back, with fresh nonces; the 15 journeys of the real client against the real API, 7 for the account, 5 for the vault, 2 for the watch, 1 for the agent; a phone walking the screens like ui-smoke, the vault, the Netflix entry, the “Hand to the agent” confirmation, the handed entry, the delegated vault and the Agent screen, with the four passes, phone 390 × 844 with 21 screenshots, desktop 1440 × 900 with 24, light theme with 12, desktop app 1280 × 800 with 5, 62 screenshots in all; the rotation on the demo site, where the password really changes, where a refusal from the site rolls everything back, where a site outside the allowlist is never touched, and where inspecting a page needs the token; the backup drill, a throwaway vault backed up, destroyed, then restored with its two keys; gitleaks over the whole history. At the bottom, the 8 jobs of ci.yml turn green one after the other: Backend, Frontend, Crypto interop, End-to-end, UI smoke, Rotation, Backup, Secret scan.'));
};

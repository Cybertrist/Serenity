// The three ways to have Serenity: the server on a VM, a private way in,
// then the desktop app and the phone (docs/02-infrastructure.md,
// docs/11-bureau.md, desktop/src/setup.html, docs/07-interface.md).
//
// On the left, the stage plays it for real: a terminal on the VM (clone,
// .env, make init, make up, then the proof that only 127.0.0.1:8080
// listens), tailscale serve and the private path it opens; the desktop app
// at first launch, which refuses an http address, takes the https one and
// opens on sign in; then the phone, which opens the same address in its
// browser and installs the PWA. On the right, four numbered steps light up
// in turn, and the Releases card says what to download.
module.exports = (O) => {
  const W = require('./_ecrans-ecrans.js')(O);
  const { t, svg, texte, paragraphe, entete, entre, frappe, toucher, carte, etape, icone, fil, bille, pointe, logo,
    telephone, fenetre, CARTE, BORD, TITRE, TEXTE, DISCRET, FIL, ACCENT, ACCENT_TEXTE, VERT, AMBRE, MONO, APP } = O;
  const C = 34;
  const HOTE = 'serenity.tail1234.ts.net';
  // The VM, then the private path.
  const ACCES = 0.3, FIN_VM = 0.42;
  // The desktop app at first launch.
  const BUR = 0.435, SAISIE1 = 0.465, TAP1 = 0.505, ERREUR = 0.515, SAISIE2 = 0.56, TAP2 = 0.615, ATTENTE = 0.625, CONNEXION = 0.65, FIN_BUR = 0.725;
  // The phone and its browser.
  const TEL = 0.74, TAP_MENU = 0.785, MENU = 0.795, TAP_INST = 0.825, DIALOGUE = 0.84, TAP_OK = 0.873, ACCUEIL = 0.89, TAP_ICONE = 0.915, APPLI = 0.93, FIN = 0.97;

  let corps = entete(t('INSTALLER', 'INSTALL'),
    t('Le serveur sur ta VM, un chemin privé jusqu’à lui, puis tes appareils.', 'The server on your VM, a private path to it, then your devices.'));

  // ------------------------------------------------------- the terminal
  const SX = 48, SL = 640, SCX = SX + SL / 2;
  const TY = 100, TH = 440;
  let term = `<rect x="${SX}" y="${TY}" width="${SL}" height="${TH}" rx="12" fill="#0A0D13" stroke="#2A3342" filter="url(#ombreFlottante)"/>
    <path d="M${SX + 12} ${TY + 0.5} H${SX + SL - 12}" stroke="#FFFFFF" stroke-opacity="0.05"/>
    <line x1="${SX}" y1="${TY + 34}" x2="${SX + SL}" y2="${TY + 34}" stroke="#1F2833"/>`;
  term += icone('TerminalWindow', SX + 16, TY + 9, 16, DISCRET);
  term += texte(SX + 40, TY + 22, 'tristan@serenity-vm: ~/code', { taille: 12.5, couleur: DISCRET, police: MONO });
  const LIGNES = [
    ['cmd', 0.02, 0.055, 'git clone https://github.com/Cybertrist/Serenity.git'],
    ['out', 0.065, 'Cloning into \'Serenity\'... done.'],
    ['cmd', 0.075, 0.1, 'cd Serenity && cp .env.example .env'],
    ['cmd', 0.11, 0.125, 'nano .env', t('# TAILNET_HOST, SERENITY_SECRET_KEY', '# TAILNET_HOST, SERENITY_SECRET_KEY')],
    ['cmd', 0.14, 0.15, 'make init'],
    ['out', 0.158, 'mkdir -p data/api'],
    ['cmd', 0.168, 0.178, 'make up'],
    ['ok', 0.19, 'Container serenity-api-1'],
    ['ok', 0.198, 'Container serenity-agent-1'],
    ['ok', 0.206, 'Container serenity-rotator-1'],
    ['ok', 0.214, 'Container serenity-web-1'],
    ['cmd', 0.228, 0.255, 'sudo ss -tlnp | grep docker-proxy'],
    ['ecoute', 0.265, 'LISTEN  0  4096  '],
    ['cmd', ACCES, ACCES + 0.035, 'sudo tailscale serve --bg --https=443 http://127.0.0.1:8080'],
    ['cmd', 0.345, 0.36, 'sudo tailscale serve status'],
    ['out', 0.37, `https://${HOTE} (tailnet only)`],
    ['out', 0.376, '|-- / proxy http://127.0.0.1:8080'],
  ];
  const CW = 13 * 0.6;
  LIGNES.forEach(([genre, de, ...reste], i) => {
    const y = TY + 62 + i * 21.5, x = SX + 20;
    let s = '';
    if (genre === 'cmd') {
      const [a, commande, commentaire] = reste;
      s += texte(x, y, '$', { taille: 13, couleur: ACCENT_TEXTE, police: MONO, poids: 600 });
      s += frappe(x + 2 * CW, y, commande, C, de, a, { taille: 13, couleur: TITRE, police: MONO });
      if (commentaire) s += entre(C, a, FIN_VM, texte(x + (commande.length + 5) * CW, y, commentaire, { taille: 13, couleur: DISCRET, police: MONO }), 0.004);
    } else if (genre === 'out') {
      s += texte(x, y, reste[0], { taille: 13, couleur: TEXTE, police: MONO });
    } else if (genre === 'ok') {
      s += texte(x + 2 * CW, y, reste[0], { taille: 13, couleur: TEXTE, police: MONO });
      s += texte(x + 34 * CW, y, 'Healthy', { taille: 13, couleur: VERT, police: MONO, poids: 600 });
    } else {
      s += texte(x, y, reste[0], { taille: 13, couleur: TEXTE, police: MONO, extra: 'xml:space="preserve"' });
      const xe = x + reste[0].length * CW;
      s += `<rect x="${xe - 4}" y="${y - 15}" width="${14 * CW + 8}" height="21" rx="5" fill="${ACCENT}" fill-opacity="0.18" stroke="${ACCENT}" stroke-opacity="0.6"/>`;
      s += texte(xe, y, '127.0.0.1:8080', { taille: 13, couleur: ACCENT_TEXTE, police: MONO, poids: 600 });
      s += texte(xe + 16 * CW, y, 'docker-proxy', { taille: 13, couleur: TEXTE, police: MONO });
    }
    term += genre === 'cmd' ? entre(C, de - 0.004, FIN_VM, s, 0.003) : entre(C, de, FIN_VM, s, 0.004);
  });
  corps += entre(C, 0, FIN_VM, term, 0.008);

  // The private path, under the terminal, once tailscale serve runs.
  const PY = 566, PH = 74, BL = 184, BG = (SL - 3 * BL) / 2;
  const boites = [
    [t('Tes appareils', 'Your devices'), t('téléphone, ordinateur', 'phone, computer'), null],
    ['tailscale serve', t('HTTPS, tailnet seulement', 'HTTPS, tailnet only'), MONO],
    ['127.0.0.1:8080', t('le conteneur web', 'the web container'), MONO],
  ];
  let chemin = '';
  boites.forEach(([titre, sous, police], i) => {
    const x = SX + i * (BL + BG);
    chemin += carte(x, PY, BL, PH, { allume: [ACCES + 0.04 + i * 0.02, FIN_VM], cycle: C, rx: 12 });
    if (i === 0) chemin += icone('DeviceMobile', x + 20, PY + 16, 18, ACCENT_TEXTE) + icone('Desktop', x + 44, PY + 16, 18, ACCENT_TEXTE) +
      texte(x + 72, PY + 30, titre, { taille: 14, couleur: TITRE, poids: 600 });
    else chemin += texte(x + 20, PY + 30, titre, { taille: 13.5, couleur: TITRE, police, poids: 600 });
    chemin += texte(x + 20, PY + 54, sous, { taille: 12.5, couleur: TEXTE });
    if (i < 2) {
      const c = `M ${x + BL + 4} ${PY + PH / 2} H ${x + BL + BG - 6}`;
      chemin += fil(C, c, ACCES + 0.06 + i * 0.02, FIN_VM) + pointe(x + BL + BG - 5, PY + PH / 2, 0) + bille(C, c, ACCES + 0.045 + i * 0.02, ACCES + 0.06 + i * 0.02);
    }
  });
  chemin += icone('Prohibit', SX + 2, PY + PH + 22, 16, DISCRET);
  chemin += texte(SX + 26, PY + PH + 35, t('Rien d’ouvert sur Internet : ni port sur ta box, ni tailscale funnel.', 'Nothing open to the Internet: no port on your router, no tailscale funnel.'),
    { taille: 13, couleur: TEXTE });
  corps += entre(C, ACCES + 0.035, FIN_VM, chemin, 0.008);

  // ------------------------------------------------- the desktop app
  const F = fenetre(SX, 130, SL);
  const P = W.premierLancementParts;
  let bureau = entre(C, 0, CONNEXION, W.premierLancement() +
    entre(C, 0, SAISIE1, texte(P.saisie[0], P.saisie[1], 'https://coffre.exemple.fr', { taille: 15, couleur: APP.faint }), 0.004) +
    entre(C, SAISIE1 - 0.004, SAISIE2, frappe(P.saisie[0], P.saisie[1], 'http://192.168.1.20', C, SAISIE1, SAISIE1 + 0.025, { taille: 15, couleur: APP.text }), 0.003) +
    toucher(P.bouton[0], P.bouton[1], C, TAP1, { rayon: 30 }) +
    entre(C, ERREUR, SAISIE2, paragraphe(P.erreur[0], P.erreur[1], P.erreurTexte, { taille: 13, max: 356, couleur: APP.crit, poids: 500, interligne: 18 }), 0.004) +
    entre(C, SAISIE2 + 0.004, CONNEXION, frappe(P.saisie[0], P.saisie[1], `https://${HOTE}`, C, SAISIE2 + 0.006, SAISIE2 + 0.04, { taille: 15, couleur: APP.text }), 0.003) +
    toucher(P.bouton[0], P.bouton[1], C, TAP2, { rayon: 30 }) +
    entre(C, ATTENTE, CONNEXION, boutonsAttente(), 0.004), 0.006);
  bureau += entre(C, CONNEXION, 1.2, W.connexionLarge(), 0.006);
  corps += entre(C, BUR, FIN_BUR, F.cadre + F.ecran(bureau), 0.008);
  // "Connecting…" drawn over the button while the app checks the server.
  function boutonsAttente() {
    return `<rect x="460" y="514" width="360" height="44" rx="10" fill="#2C6CE4"/>` +
      texte(640, 541.4, t('Connexion…', 'Connecting…'), { taille: 15, couleur: '#FFFFFF', poids: 600, ancre: 'middle' });
  }

  // ------------------------------------------------------- the phone
  const T0 = telephone(0, 100, 580);
  const Tel = telephone(Math.round(SX + (SL - T0.largeur) / 2), 100, 580);
  // The browser bar of the phone, and its menu.
  const barreNav = `<rect x="0" y="0" width="390" height="62" fill="#0E1320"/><line x1="0" y1="62" x2="390" y2="62" stroke="#2A3342"/>
    <rect x="14" y="16" width="326" height="36" rx="18" fill="#1B2233"/>
    ${icone('LockSimple', 28, 26, 15, APP.muted)}${texte(50, 39, HOTE, { taille: 14.5, couleur: APP.text })}
    <circle cx="366" cy="26" r="2.4" fill="${APP.muted}"/><circle cx="366" cy="34" r="2.4" fill="${APP.muted}"/><circle cx="366" cy="42" r="2.4" fill="${APP.muted}"/>`;
  const page = `<g transform="translate(0 62)">${W.connexionMobile()}</g>`;
  const menu = (() => {
    let s = `<rect x="170" y="14" width="210" height="262" rx="14" fill="#1B2233" stroke="#2A3342" filter="url(#ombreFlottante)"/>`;
    [['Plus', t('Nouvel onglet', 'New tab')], ['Clock', t('Historique', 'History')], ['DownloadSimple', t('Installer l’application', 'Install app')],
      ['Globe', t('Version pour ordinateur', 'Desktop site')], ['GearSix', t('Paramètres', 'Settings')]].forEach(([ic, mot], i) => {
      const y = 34 + i * 48;
      if (i === 2) s += `<rect x="178" y="${y - 6}" width="194" height="40" rx="10" fill="#2A3450"/>`;
      s += icone(ic, 190, y + 4, 18, APP.muted) + texte(220, y + 19, mot, { taille: 14.5, couleur: APP.text });
    });
    return s;
  })();
  const dialogue = `<rect width="390" height="844" fill="#000000" fill-opacity="0.55"/>
    <rect x="24" y="298" width="342" height="214" rx="26" fill="#1B2233"/>
    ${texte(48, 342, t('Installer l’application ?', 'Install app?'), { taille: 20, couleur: APP.text, poids: 700 })}
    ${logo(70, 396, 44)}
    ${texte(104, 392, 'Serenity', { taille: 16, couleur: APP.text, poids: 600 })}
    ${texte(104, 413, HOTE, { taille: 13, couleur: APP.muted })}
    ${texte(222, 482, t('Annuler', 'Cancel'), { taille: 15, couleur: APP.accentText, poids: 600, ancre: 'middle' })}
    <rect x="270" y="460" width="80" height="36" rx="18" fill="${APP.accent}"/>
    ${texte(310, 483, t('Installer', 'Install'), { taille: 15, couleur: '#FFFFFF', poids: 600, ancre: 'middle' })}`;
  // The home screen: neutral tiles, and the new Serenity icon.
  const accueil = (() => {
    let s = `<rect width="390" height="844" fill="#0B1020"/><ellipse cx="195" cy="700" rx="320" ry="260" fill="#1E3A8A" opacity="0.45" filter="url(#flou36)"/>`;
    s += texte(195, 150, '14:32', { taille: 56, couleur: APP.text, poids: 300, ancre: 'middle' });
    for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) {
      if (r === 1 && c === 2) continue;
      const x = 33 + c * 88, y = 470 + r * 110;
      s += `<rect x="${x}" y="${y}" width="60" height="60" rx="18" fill="#94A3C4" fill-opacity="0.16"/><rect x="${x + 10}" y="${y + 72}" width="40" height="8" rx="4" fill="#94A3C4" fill-opacity="0.2"/>`;
    }
    s += logo(33 + 2 * 88 + 30, 580 + 30, 60) + texte(33 + 2 * 88 + 30, 580 + 80, 'Serenity', { taille: 13, couleur: APP.text, poids: 500, ancre: 'middle' });
    return s;
  })();
  let tel = entre(C, 0, ACCUEIL, barreNav + page + toucher(366, 34, C, TAP_MENU) +
    entre(C, MENU, DIALOGUE, menu + toucher(260, 146, C, TAP_INST), 0.004) +
    entre(C, DIALOGUE, ACCUEIL, dialogue + toucher(310, 478, C, TAP_OK), 0.004), 0.006);
  tel += entre(C, ACCUEIL, APPLI, accueil + toucher(239, 610, C, TAP_ICONE), 0.006);
  tel += entre(C, APPLI, 1.2, W.connexionMobile({ identifiant: 'tristan', motDePasse: true }), 0.006);
  corps += entre(C, TEL, FIN, Tel.cadre + Tel.ecran(tel), 0.008);

  // ------------------------------------------------------- the steps
  const RX = 728, RL = 504, EH = 112, EG = 12;
  const etapes = [
    [0.005, FIN_VM, t('Sur ta VM', 'On your VM'),
      t('Docker Compose. make up crée les clés, construit et démarre. Rien n’écoute hors de 127.0.0.1:8080.', 'Docker Compose. make up creates the keys, builds and starts. Nothing listens outside 127.0.0.1:8080.'), ACCES],
    [ACCES, FIN_VM, t('Un chemin privé', 'A private path'),
      t('Réseau maillé, VPN, tunnel SSH ou reverse proxy local, en HTTPS. Chez moi, tailscale serve.', 'Mesh network, VPN, SSH tunnel or local reverse proxy, over HTTPS. At home, tailscale serve.'), null],
    [BUR, FIN_BUR, t('L’appli de bureau', 'The desktop app'),
      t('Au premier lancement, l’adresse de ton serveur : https seulement, sauf 127.0.0.1 et localhost.', 'At first launch, your server’s address: https only, except 127.0.0.1 and localhost.'), null],
    [TEL, FIN, t('Le téléphone', 'The phone'),
      t('Ouvre la même adresse dans le navigateur, puis « Installer l’application » : la PWA.', 'Open the same address in the browser, then “Install app”: the PWA.'), null],
  ];
  etapes.forEach(([de, a, titre, phrase, allumeFin], i) => {
    const y = 100 + i * (EH + EG);
    corps += entre(C, i === 0 ? 0 : de, FIN, etape(RX, y, RL, EH, String(i + 1), titre, phrase, { allume: [de, allumeFin || a], cycle: C, taille: 13 }), 0.008);
  });

  // What to download.
  const RY = 100 + 4 * (EH + EG) + 4, RH = 156;
  let rel = carte(RX, RY, RL, RH);
  rel += icone('Package', RX + 20, RY + 18, 20, ACCENT_TEXTE);
  rel += texte(RX + 50, RY + 34, t('Dans les Releases GitHub', 'In the GitHub Releases'), { taille: 15, couleur: TITRE, poids: 600 });
  [['WindowsLogo', 'Windows', t('.exe installateur, .exe portable', '.exe installer, portable .exe')], ['LinuxLogo', 'Linux', '.AppImage, .deb']].forEach(([ic, os, fichiers], k) => {
    const y = RY + 68 + k * 28;
    rel += icone(ic, RX + 20, y - 14, 18, TEXTE) + texte(RX + 48, y, os, { taille: 14, couleur: TITRE, poids: 600 });
    rel += texte(RX + 140, y, fichiers, { taille: 13, couleur: TEXTE, police: MONO });
  });
  rel += `<line x1="${RX + 20}" y1="${RY + 112}" x2="${RX + RL - 20}" y2="${RY + 112}" stroke="${BORD}"/>`;
  rel += icone('Warning', RX + 20, RY + 124, 16, AMBRE);
  rel += texte(RX + 46, RY + 137, t('Pas encore signés : SmartScreen avertit au premier lancement.', 'Not signed yet: SmartScreen warns you on first launch.'), { taille: 13, couleur: TEXTE });
  corps += entre(C, BUR, FIN, rel, 0.008);

  svg('installation.svg', 1280, RY + RH + 30, corps, t(
    `Installer Serenity, en trois temps. À gauche, un terminal sur la VM : git clone du dépôt, cd Serenity et cp .env.example .env, nano .env pour TAILNET_HOST et SERENITY_SECRET_KEY, make init qui crée data/api, make up qui démarre les conteneurs api, agent, rotator et web, tous « Healthy », puis ss qui prouve que seul 127.0.0.1:8080 écoute. Ensuite le chemin privé : sudo tailscale serve --bg --https=443 vers 127.0.0.1:8080, et son statut, https://${HOTE}, réservé au tailnet ; sous le terminal, tes appareils rejoignent tailscale serve en HTTPS, qui mène au conteneur web sur 127.0.0.1:8080, et rien n’est ouvert sur Internet, ni port sur ta box ni tailscale funnel. Puis l’appli de bureau au premier lancement : « Bienvenue. Indique l’adresse de ton serveur Serenity pour ouvrir ton coffre. » ; une adresse en http est refusée avec « Il faut une adresse en https, par exemple https://coffre.exemple.fr. », l’adresse https://${HOTE} est acceptée, « Connexion… », puis l’écran de connexion. Enfin le téléphone : le navigateur ouvre la même adresse sur l’écran de connexion, le menu propose « Installer l’application », la fenêtre de confirmation montre Serenity et son adresse, l’icône arrive sur l’écran d’accueil, et l’appli s’ouvre sans barre d’adresse. À droite, quatre étapes numérotées s’allument tour à tour : sur ta VM, Docker Compose, make up crée les clés, construit et démarre, rien n’écoute hors de 127.0.0.1:8080 ; un chemin privé, réseau maillé, VPN, tunnel SSH ou reverse proxy local, en HTTPS, chez moi tailscale serve ; l’appli de bureau, qui demande l’adresse au premier lancement, en https seulement sauf 127.0.0.1 et localhost ; le téléphone, qui installe la PWA depuis le navigateur. En bas, les Releases GitHub : pour Windows un installateur .exe et un .exe portable, pour Linux un .AppImage et un .deb, pas encore signés, donc SmartScreen avertit au premier lancement.`,
    `Installing Serenity, in three moves. On the left, a terminal on the VM: git clone of the repository, cd Serenity and cp .env.example .env, nano .env for TAILNET_HOST and SERENITY_SECRET_KEY, make init which creates data/api, make up which starts the api, agent, rotator and web containers, all “Healthy”, then ss proving that only 127.0.0.1:8080 listens. Next the private path: sudo tailscale serve --bg --https=443 to 127.0.0.1:8080, and its status, https://${HOTE}, tailnet only; under the terminal, your devices reach tailscale serve over HTTPS, which leads to the web container on 127.0.0.1:8080, and nothing is open to the Internet, no port on your router and no tailscale funnel. Then the desktop app at first launch: “Welcome. Enter the address of your Serenity server to open your vault.”; an http address is refused with “The address must be https, for example https://coffre.exemple.fr.”, the address https://${HOTE} is accepted, “Connecting…”, then the sign-in screen. Last, the phone: the browser opens the same address on the sign-in screen, the menu offers “Install app”, the confirmation shows Serenity and its address, the icon lands on the home screen, and the app opens without an address bar. On the right, four numbered steps light up in turn: on your VM, Docker Compose, make up creates the keys, builds and starts, nothing listens outside 127.0.0.1:8080; a private path, mesh network, VPN, SSH tunnel or local reverse proxy, over HTTPS, at home tailscale serve; the desktop app, which asks for the address at first launch, https only except 127.0.0.1 and localhost; the phone, which installs the PWA from the browser. At the bottom, the GitHub Releases: for Windows an .exe installer and a portable .exe, for Linux an .AppImage and a .deb, not signed yet, so SmartScreen warns you on first launch.`));
};

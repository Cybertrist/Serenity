// The architecture, crossed by real requests.
//
// On the left, the phone replays three moments: saving a new entry, the
// alert of the watch, then approving the rotation it suggests. On the right,
// the VM as docker-compose.yml builds it: web, api, the SQLite file they
// share with the agent, then the agent, the rotator and the demo site, each
// with its real networks. Each request lights only the wires it takes:
//   - a new entry: an encrypted block goes down phone, private access, web,
//     api, database;
//   - the watch (every 6 h): the agent opens the agent zone and asks Pwned
//     Passwords, through egress, the only way out;
//   - the rotation: agent, rotator, site, then back to the phone through
//     /api/events. In V1 the allowlist holds the demo site only, which sits
//     on the private rotation network (api/allowlist.yaml).
// Last, the nightly restic run (ops/systemd/serenity-backup.timer, 03:12).
module.exports = (O) => {
  const A = require('./_ecrans-archi.js')(O);
  const { t, svg, texte, entete, entre, toucher, bille, pointe, legendes, icone, telephone, toast, ENTREES,
    CARTE, BORD, TITRE, TEXTE, DISCRET, FIL, ACCENT, ACCENT_TEXTE, MONO, SANS } = O;
  const C = 34;
  const H = 816;

  let corps = entete(t('ARCHITECTURE', 'ARCHITECTURE'),
    t('Une VM, quatre conteneurs, un seul port publié. Seuls l’agent et le rotateur sortent sur Internet.',
      'One VM, four containers, a single published port. Only the agent and the rotator reach the Internet.'));

  // ------------------------------------------------------------ timing
  // Phone
  const TAPE_PLUS = 0.045, EDITEUR = 0.055, ENREG = 0.175, APRES = 0.19, ALERTE = 0.53, AGENT = 0.575, APPROUVE = 0.625,
    FAIT_TEL = 0.855, FIN = 0.985;
  // Right side: [from, to] of each hop.
  const A1 = [0.19, 0.215], A2 = [0.215, 0.24], A3 = [0.24, 0.265];               // new entry, down
  const B1 = [0.37, 0.39], B2 = [0.395, 0.42], B3 = [0.425, 0.45], B4 = [0.455, 0.475], B5 = [0.48, 0.5], B6 = [0.5, 0.515], B7 = [0.515, 0.53];
  const C1 = [0.63, 0.65], C2 = [0.65, 0.67], C3 = [0.67, 0.69];                  // approval, down
  const D1 = [0.705, 0.725], D2 = [0.73, 0.75], D3 = [0.755, 0.775], D4 = [0.785, 0.805], D5 = [0.81, 0.83], D6 = [0.835, 0.85], D7 = [0.85, 0.865], D8 = [0.865, 0.88];
  const R1 = [0.915, 0.95];                                                         // restic

  // ------------------------------------------------------------ the phone
  const T = telephone(48, 96, 560);
  corps += T.cadre;
  const avant = { toi: ['banque', 'spotify'], agent: ['demo'] };
  const apres = { toi: ['banque', 'github', 'spotify'], agent: ['demo'] };
  let ecran = '';
  ecran += entre(C, 0, EDITEUR, A.coffre(avant) + toucher(350, 36, C, TAPE_PLUS), 0.006);
  const dt = (a, b) => [EDITEUR + a, EDITEUR + b];
  ecran += entre(C, EDITEUR, APRES, A.editeur(ENTREES.github, {
    C, frappes: [dt(0.012, 0.03), dt(0.036, 0.055), dt(0.062, 0.08), dt(0.086, 0.104)], enregistre: ENREG,
  }), 0.006);
  ecran += entre(C, APRES, ALERTE, A.coffre(apres) +
    entre(C, APRES + 0.012, APRES + 0.09, toast(195, 700, t('Ajoutée dans « Protégé par toi ».', 'Added to “Protected by you”.')), 0.006), 0.006);
  // The alert comes back through /api/events: the bell and a toast.
  const ag = A.agent(ENTREES.demo);
  ecran += entre(C, ALERTE, AGENT, A.coffre({ ...apres, pointCloche: '#F2A93B', badges: { agent: 1 }, sante: 67, titreEtat: t('1 point à voir', '1 thing to check'), sousEtat: t('1 rotation à valider', '1 rotation to approve') }) +
    toast(195, 700, t('Site de démo : rotation à valider', 'Demo site: rotation to approve'), { ton: 'violet', icone: 'Sparkle' }) +
    toucher(195, 721, C, AGENT - 0.008), 0.006);
  ecran += entre(C, AGENT, FAIT_TEL, ag.svg + toucher(ag.approuver[0], ag.approuver[1], C, APPROUVE), 0.006);
  ecran += entre(C, FAIT_TEL, FIN, A.coffre(apres) +
    toast(195, 700, t('Site de démo : mot de passe changé par l’agent', 'Demo site: password changed by the agent')), 0.006);
  corps += T.ecran(ecran);

  // ------------------------------------------------------------ the VM
  const VX = 430, VY = 100, VL = 810, VH = 532;
  corps += `<rect x="${VX}" y="${VY}" width="${VL}" height="${VH}" rx="18" fill="${CARTE}" fill-opacity="0.45" stroke="${BORD}" stroke-width="1.5"/>`;
  corps += icone('HardDrives', VX + 20, VY + 16, 20, ACCENT_TEXTE);
  corps += texte(VX + 50, VY + 32, t('VM Debian 13, Docker Compose', 'Debian 13 VM, Docker Compose'), { taille: 15, couleur: TITRE, poids: 600 });
  corps += texte(VX + VL - 20, VY + 32, t('rien n’écoute hors de 127.0.0.1', 'nothing listens outside 127.0.0.1'), { taille: 12.5, couleur: DISCRET, ancre: 'end' });
  corps += texte(VX + 20, VY + 58, t('Réseaux : edge, publié sur 127.0.0.1 ; internal et rotation, sans Internet ; egress, la seule sortie.',
    'Networks: edge, published on 127.0.0.1; internal and rotation, no Internet; egress, the only way out.'), { taille: 12.5, couleur: TEXTE });

  const CL = 236, CH = 140, COL = [450, 717, 984], R1Y = 176, R2Y = 388;
  const centre = (c, r) => [COL[c] + CL / 2, r + CH / 2];
  // The two wires that leave the VM, near the right edge of their card.
  const XR = COL[1] + CL - 44, XA = COL[2] + CL - 44;

  /// A container card: icon tile, name, its networks, three short lines.
  const conteneur = (c, y, ic, nom, reseaux, lignes, allume, { pointille = false, mono = true } = {}) => {
    const x = COL[c];
    let s = A.cadre(x, y, CL, CH, C, allume, { pointille });
    s += `<rect x="${x + 18}" y="${y + 18}" width="32" height="32" rx="9" fill="${ACCENT}" fill-opacity="0.12"/>` + icone(ic, x + 25, y + 25, 18, ACCENT_TEXTE);
    s += texte(x + 62, y + 32, nom, { taille: 15, couleur: TITRE, police: mono ? MONO : SANS, poids: 600 });
    s += texte(x + 62, y + 50, reseaux, { taille: 12, couleur: DISCRET, police: MONO });
    lignes.forEach((l, i) => { s += texte(x + 18, y + 82 + i * 20, l, { taille: 12.5, couleur: TEXTE }); });
    return s;
  };

  // Wires first, cards on top of them.
  const P = {
    telGate: [[T.x + T.largeur - 13, centre(0, R1Y)[1]], [363, centre(0, R1Y)[1]]],
    gateWeb: [[407, centre(0, R1Y)[1]], [COL[0], centre(0, R1Y)[1]]],
    webApi: [[COL[0] + CL, centre(0, R1Y)[1]], [COL[1], centre(0, R1Y)[1]]],
    apiBase: [[COL[1] + CL, centre(0, R1Y)[1]], [COL[2], centre(0, R1Y)[1]]],
    baseAgent: [[centre(2, 0)[0], R1Y + CH], [centre(2, 0)[0], R2Y]],
    agentRot: [[COL[2], centre(0, R2Y)[1]], [COL[1] + CL, centre(0, R2Y)[1]]],
    rotDemo: [[COL[1], centre(0, R2Y)[1]], [COL[0] + CL, centre(0, R2Y)[1]]],
    agentNet: [[XA, R2Y + CH], [XA, 672]],
    rotNet: [[XR, R2Y + CH], [XR, 672]],
    baseRestic: [[COL[2] - 16, R1Y + CH - 20], [COL[2] - 16, 572], [COL[0] + CL, 572]],
  };
  const tous = (...l) => l;
  corps += A.fil(C, A.chemin(P.telGate), tous([A1[0] - 0.01, A1[1]], [B6[1], B7[1] + 0.01], [C1[0] - 0.01, C1[1]], [D8[0], D8[1] + 0.01]));
  corps += A.fil(C, A.chemin(P.gateWeb), tous([A1[0], A1[1] + 0.01], [B6[1], B7[1]], [C1[0], C1[1] + 0.01], [D8[0], D8[1]]));
  corps += A.fil(C, A.chemin(P.webApi), tous(A2, B6, C2, D7));
  corps += A.fil(C, A.chemin(P.apiBase), tous(A3, B5, C3, D6));
  corps += A.fil(C, A.chemin(P.baseAgent), tous(B1, B4, D1, D5));
  corps += A.fil(C, A.chemin(P.agentRot), tous(D2, D4));
  corps += A.fil(C, A.chemin(P.rotDemo), tous(D3));
  corps += A.fil(C, A.chemin(P.agentNet), tous([B2[0], B3[1]]));
  corps += A.fil(C, A.chemin(P.rotNet), []);
  corps += A.fil(C, A.chemin(P.baseRestic), tous(R1), { pointille: true });
  corps += pointe(COL[0] + CL + 6, 572, 180, FIL);

  // The private access, between the phone and the VM.
  const [gx, gy] = [385, centre(0, R1Y)[1]];
  corps += `<circle cx="${gx}" cy="${gy}" r="22" fill="${CARTE}" stroke="${BORD}" stroke-width="1.5"/>` + icone('LockSimple', gx - 10, gy - 10, 20, ACCENT_TEXTE);
  corps += texte(gx, gy - 50, t('Accès privé', 'Private access'), { taille: 13, couleur: TITRE, poids: 600, ancre: 'middle' });
  corps += texte(gx, gy - 32, 'HTTPS', { taille: 12, couleur: ACCENT_TEXTE, police: MONO, ancre: 'middle' });
  corps += texte(gx, gy + 44, 'tailscale serve', { taille: 12, couleur: DISCRET, police: MONO, ancre: 'middle' });
  corps += texte(gx, gy + 62, t('chez moi', 'in my setup'), { taille: 12, couleur: DISCRET, ancre: 'middle' });

  // Row 1: what the phone reaches.
  corps += conteneur(0, R1Y, 'Globe', 'web', 'edge, internal', [
    t('nginx : l’appli et /api', 'nginx: the app and /api'),
    t('publié sur 127.0.0.1:8080', 'published on 127.0.0.1:8080'),
    t('le seul port de la stack', 'the only port of the stack'),
  ], [[A1[1] - 0.004, A3[1] + 0.03], [B6[0], B7[1] + 0.02], [C1[1] - 0.004, C3[1] + 0.02], [D7[0], D8[1] + 0.02]]);
  corps += conteneur(1, R1Y, 'Cube', 'api', 'internal', [
    t('FastAPI : comptes, coffre', 'FastAPI: accounts, vault'),
    t('flux /api/events, maison', 'the /api/events stream'),
    t('clé : totp.key seulement', 'key: totp.key only'),
  ], [[A2[1] - 0.004, A3[1] + 0.03], [B5[0], B6[1] + 0.02], [C2[1] - 0.004, C3[1] + 0.02], [D6[0], D7[1] + 0.02]]);
  corps += conteneur(2, R1Y, 'Database', 'serenity.sqlite', t('volume data/api', 'volume data/api'), [
    t('SQLite en mode WAL', 'SQLite in WAL mode'),
    t('blocs chiffrés, métadonnées', 'encrypted blocks, metadata'),
    t('partagé par api et agent', 'shared by api and agent'),
  ], [[A3[1] - 0.004, A3[1] + 0.05], [B1[0], B1[1] + 0.01], [B4[1] - 0.004, B5[1]], [C3[1] - 0.004, C3[1] + 0.03], [D1[0], D1[1] + 0.01], [D5[1] - 0.004, D6[1]], [R1[0], R1[1] + 0.02]], { pointille: true });

  // Row 2: what nobody reaches from outside.
  corps += conteneur(0, R2Y, 'Browser', 'demo', 'edge, rotation', [
    t('le site d’essai, profil demo', 'practice site, demo profile'),
    t('seul site de l’allowlist', 'only site in the allowlist'),
    t('127.0.0.1:8090, si lancé', '127.0.0.1:8090, when up'),
  ], [[D3[1] - 0.004, D4[0] + 0.01]], { pointille: true });
  corps += conteneur(1, R2Y, 'Robot', 'rotator', 'rotation, egress', [
    t('Playwright : le seul navigateur', 'Playwright: the only browser'),
    t('aucune clé, aucune base', 'no key, no database'),
    t('aucun port publié', 'no published port'),
  ], [[D2[1] - 0.004, D4[1] + 0.01]]);
  corps += conteneur(2, R2Y, 'Sparkle', 'agent', 'egress, rotation', [
    t('server.key → AK → zone agent', 'server.key → AK → agent zone'),
    t('veille toutes les 6 h', 'watch every 6 hours'),
    t('échéancier toutes les heures', 'schedule every hour'),
  ], [[B1[1] - 0.004, B4[1] + 0.01], [D1[1] - 0.004, D5[1] + 0.01]]);

  // Row 3: the nightly backup, on the VM itself.
  const RX = COL[0], RY = 548, RL = CL, RH = 64;
  corps += A.cadre(RX, RY, RL, RH, C, [[R1[1] - 0.004, FIN]]);
  corps += icone('CloudArrowUp', RX + 18, RY + 14, 20, ACCENT_TEXTE);
  corps += texte(RX + 48, RY + 29, t('restic, chaque nuit à 03:12', 'restic, every night at 03:12'), { taille: 13.5, couleur: TITRE, poids: 600 });
  corps += texte(RX + 48, RY + 49, t('la base et les deux clés', 'the database and both keys'), { taille: 12.5, couleur: TEXTE });

  // The egress labels, on the two only wires that leave the VM.
  [[XR, 'egress'], [XA, 'egress']].forEach(([x, s]) => {
    corps += `<rect x="${x - 76}" y="${592}" width="64" height="22" rx="7" fill="${CARTE}" stroke="${BORD}"/>` +
      texte(x - 44, 607.5, s, { taille: 12, couleur: DISCRET, police: MONO, ancre: 'middle' });
  });

  // ------------------------------------------------------------ Internet
  const IX = COL[1], IY = 672, IL = COL[2] + CL - COL[1], IH = 72;
  corps += A.cadre(IX, IY, IL, IH, C, [[B2[1] - 0.004, B3[0] + 0.004]]);
  corps += icone('Cloud', IX + 18, IY + 14, 20, DISCRET);
  corps += texte(IX + 48, IY + 29, 'Internet', { taille: 13.5, couleur: TITRE, poids: 600 });
  corps += texte(XR - 14, IY + 52, t('un site de l’allowlist', 'a site in the allowlist'), { taille: 12.5, couleur: TEXTE, ancre: 'end' });
  corps += texte(XA - 14, IY + 29, 'Pwned Passwords', { taille: 13.5, couleur: TITRE, poids: 600, ancre: 'end' });
  corps += texte(XA - 14, IY + 52, t('5 caractères d’empreinte', '5 characters of a hash'), { taille: 12.5, couleur: TEXTE, ancre: 'end' });
  // Under the demo column: who does not get out.
  corps += icone('Prohibit', COL[0] + 18, IY + 14, 20, DISCRET);
  corps += texte(COL[0] + 48, IY + 29, t('Pas de sortie', 'No way out'), { taille: 13.5, couleur: TITRE, poids: 600 });
  corps += texte(COL[0] + 48, IY + 52, t('ni pour web, ni pour api', 'for web or api'), { taille: 12.5, couleur: TEXTE });

  // ------------------------------------------------------------ the dots
  const pt = (k) => P[k];
  corps += bille(C, A.chemin([...pt('telGate'), ...pt('gateWeb')]), A1[0] - 0.01, A1[1]);
  corps += bille(C, A.chemin(pt('webApi')), ...A2);
  corps += bille(C, A.chemin(pt('apiBase')), ...A3);
  // The watch: read the agent zone, ask Pwned Passwords, write the alert, tell the phone.
  corps += bille(C, A.inverse(pt('baseAgent')), ...B1);
  corps += bille(C, A.chemin(pt('agentNet')), ...B2);
  corps += bille(C, A.inverse(pt('agentNet')), ...B3);
  corps += bille(C, A.chemin(pt('baseAgent')), ...B4);
  corps += bille(C, A.inverse(pt('apiBase')), ...B5);
  corps += bille(C, A.inverse(pt('webApi')), ...B6);
  corps += bille(C, A.inverse([...pt('telGate'), ...pt('gateWeb')]), ...B7);
  // The approval, down like any write.
  corps += bille(C, A.chemin([...pt('telGate'), ...pt('gateWeb')]), C1[0] - 0.01, C1[1]);
  corps += bille(C, A.chemin(pt('webApi')), ...C2);
  corps += bille(C, A.chemin(pt('apiBase')), ...C3);
  // The rotation: only the agent's path lights up.
  corps += bille(C, A.inverse(pt('baseAgent')), ...D1);
  corps += bille(C, A.chemin(pt('agentRot')), ...D2);
  corps += bille(C, A.chemin(pt('rotDemo')), ...D3);
  corps += bille(C, A.inverse(pt('agentRot')), ...D4);
  corps += bille(C, A.chemin(pt('baseAgent')), ...D5);
  corps += bille(C, A.inverse(pt('apiBase')), ...D6);
  corps += bille(C, A.inverse(pt('webApi')), ...D7);
  corps += bille(C, A.inverse([...pt('telGate'), ...pt('gateWeb')]), ...D8);
  corps += bille(C, A.chemin(pt('baseRestic')), ...R1);

  // ------------------------------------------------------------ captions
  corps += legendes(48, 786, C, [
    [0, A1[0], t('Tu enregistres une entrée. Ton téléphone la chiffre avec ta clé avant que quoi que ce soit ne parte.',
      'You save an entry. Your phone encrypts it with your key before anything leaves.')],
    [A1[0], 0.36, t('Un bloc chiffré descend : accès privé, web, api, puis la base. Le serveur range ce qu’il ne sait pas ouvrir.',
      'An encrypted block goes down: private access, web, api, then the database. The server stores what it cannot open.')],
    [0.36, ALERTE, t('Toutes les 6 h, l’agent ouvre la zone agent et interroge Pwned Passwords par egress. Une fuite, et une rotation t’attend.',
      'Every 6 hours, the agent opens the agent zone and asks Pwned Passwords through egress. A breach, and a rotation waits for you.')],
    [ALERTE, D1[0], t('L’alerte remonte par /api/events, sans service tiers. Tu approuves : la décision descend comme une écriture.',
      'The alert comes up through /api/events, no third party. You approve: the decision goes down like any write.')],
    [D1[0], FAIT_TEL, t('Seul le chemin de l’agent s’allume : le rotateur ouvre le site, change le mot de passe, puis se reconnecte pour le prouver.',
      'Only the agent’s path lights up: the rotator opens the site, changes the password, then signs in again to prove it.')],
    [FAIT_TEL, 0.91, t('Le résultat remonte jusqu’à ton téléphone. En V1, le seul site de l’allowlist est le site de démo.',
      'The result comes back up to your phone. In V1, the only site in the allowlist is the demo site.')],
    [0.91, FIN, t('Chaque nuit, restic copie la base et les deux clés. Sans la clé serveur, la zone agent restaurée ne se rouvrirait pas.',
      'Every night, restic copies the database and both keys. Without the server key, a restored agent zone would not open again.')],
  ], { max: 1180 });

  svg('architecture.svg', 1280, H, corps, t(
    'L’architecture de Serenity, traversée par de vraies requêtes. À gauche, le téléphone : tu crées l’entrée GitHub, qui arrive dans « Protégé par toi » ; plus tard, la cloche annonce « Site de démo : rotation à valider » ; l’écran Agent montre les quatre étapes, générer, changer sur demo.serenity.test, prouver, valider ; tu approuves ; puis « Site de démo : mot de passe changé par l’agent ». Entre le téléphone et la VM, l’accès privé en HTTPS, tailscale serve chez moi. À droite, la VM Debian 13 sous Docker Compose, où rien n’écoute hors de 127.0.0.1. Quatre réseaux : edge, publié sur 127.0.0.1 ; internal et rotation, sans Internet ; egress, la seule sortie. Le conteneur web, nginx, sur edge et internal, sert l’appli et le proxy /api, publié sur 127.0.0.1:8080, le seul port de la stack. Le conteneur api, FastAPI, sur internal seulement, tient les comptes et le coffre, le flux /api/events et la seule clé totp.key. Le fichier serenity.sqlite, en mode WAL, garde les blocs chiffrés et les métadonnées, partagé par api et agent. Le conteneur agent, sur egress et rotation, ouvre la clé d’agent avec server.key, veille toutes les 6 heures et fait tourner l’échéancier toutes les heures. Le conteneur rotator, sur rotation et egress, est le seul navigateur, sans clé, sans base, sans port publié. Le site de démo, profil demo, sur edge et rotation, est le seul site de l’allowlist. Restic sauvegarde chaque nuit à 03:12 la base et les deux clés. En bas, Internet : un site de l’allowlist pour le rotateur, Pwned Passwords pour l’agent, qui n’envoie que 5 caractères d’empreinte ; ni web ni api ne sortent. Trois passages s’allument tour à tour : le bloc chiffré de la nouvelle entrée descend du téléphone à la base ; la veille passe de l’agent à Pwned Passwords puis remonte l’alerte au téléphone ; après ton accord, seul le chemin agent, rotator, site de démo s’allume, et le résultat remonte jusqu’au téléphone. Enfin, la sauvegarde de la nuit.',
    'The Serenity architecture, crossed by real requests. On the left, the phone: you create the GitHub entry, which lands in “Protected by you”; later, the bell says “Demo site: rotation to approve”; the Agent screen shows the four steps, generate, change on demo.serenity.test, prove, confirm; you approve; then “Demo site: password changed by the agent”. Between the phone and the VM, the private access over HTTPS, tailscale serve in my setup. On the right, the Debian 13 VM under Docker Compose, where nothing listens outside 127.0.0.1. Four networks: edge, published on 127.0.0.1; internal and rotation, without Internet; egress, the only way out. The web container, nginx, on edge and internal, serves the app and the /api proxy, published on 127.0.0.1:8080, the only port of the stack. The api container, FastAPI, on internal only, holds the accounts and the vault, the /api/events stream and the totp.key key alone. The serenity.sqlite file, in WAL mode, keeps the encrypted blocks and the metadata, shared by api and agent. The agent container, on egress and rotation, opens the agent key with server.key, watches every 6 hours and runs the schedule every hour. The rotator container, on rotation and egress, is the only browser, with no key, no database and no published port. The demo site, demo profile, on edge and rotation, is the only site in the allowlist. Restic backs up the database and both keys every night at 03:12. At the bottom, the Internet: a site in the allowlist for the rotator, Pwned Passwords for the agent, which only sends 5 characters of a hash; neither web nor api gets out. Three passes light up in turn: the encrypted block of the new entry goes down from the phone to the database; the watch goes from the agent to Pwned Passwords, then the alert comes back up to the phone; after your approval, only the agent, rotator, demo site path lights up, and the result comes back up to the phone. Last, the nightly backup.'));
};

// The threat model, without a table (docs/10-securite.md, "Ce que gagne un
// attaquant", and docs/crypto.md section 8).
//
// On the left, six things an attacker may get hold of, one after the other.
// On the right, the vault as it lives on the VM, in four compartments: the
// personal zone, the agent zone, the metadata, and the code the VM serves
// to your browser. For each case, a dot carries what he got to the vault,
// and each compartment either stays encrypted (lock closed, noise) or lights
// up in amber, its content readable. Under it, what he reads and what he
// does not, in the words of the security page. At the bottom, the hard
// point, owned: whoever takes the VM takes the agent zone.
module.exports = (O) => {
  const A = require('./_ecrans-archi.js')(O);
  const { t, svg, texte, entete, rubrique, entre, visible, bille, icone, monogramme, paragraphe, ENTREES,
    CARTE, BORD, TITRE, TEXTE, DISCRET, FIL, ACCENT, ACCENT_TEXTE, AMBRE, MONO } = O;
  const C = 36;
  const H = 778;
  const D0 = 0.015, L = 0.16;
  const cas = (i) => [D0 + i * L, D0 + (i + 1) * L];

  let corps = entete(t('MODÈLE DE MENACE', 'THREAT MODEL'),
    t('Ce que lit un attaquant, selon ce qu’il obtient. Chaque case reste chiffrée tant qu’il n’a pas sa clé.',
      'What an attacker reads, depending on what he gets. Each compartment stays encrypted until he has its key.'));

  // ------------------------------------------------------------ the six cases
  // [icon, title, subtitle, open compartments, wrapper, what he reads, what he does not]
  const CAS = [
    ['CloudArrowUp', t('Une sauvegarde restic', 'A restic backup'), t('sans son mot de passe', 'without its password'), [], 'restic',
      t('Il lit : rien. Le dépôt est chiffré, et son mot de passe vit hors de Serenity.', 'He reads: nothing. The repository is encrypted, and its password lives outside Serenity.'),
      t('Il ne lit pas : ni les zones, ni même les métadonnées.', 'He does not read: the zones, not even the metadata.')],
    ['Database', t('La base seule', 'The database alone'), t('une copie de serenity.sqlite', 'a copy of serenity.sqlite'), ['meta'], null,
      t('Il lit : les métadonnées, dates, zones, révisions, politiques.', 'He reads: the metadata, dates, zones, revisions, policies.'),
      t('Il ne lit pas : aucun mot de passe. Pour ta zone, chaque essai coûte un Argon2id à 64 Mio.', 'He does not read: any password. For your zone, each guess costs an Argon2id at 64 MiB.')],
    ['Key', t('La base et la clé serveur', 'The database and the server key'), t('server.key vit hors de la base', 'server.key lives outside it'), ['meta', 'agent'], null,
      t('Il lit : la zone agent. Parade : changer la clé serveur, la clé d’agent et ces mots de passe.', 'He reads: the agent zone. The fix: new server key, new agent key, new passwords there.'),
      t('Il ne lit pas : la zone personnelle, chiffrée par une clé que le serveur n’a jamais.', 'He does not read: the personal zone, encrypted with a key the server never has.')],
    ['TerminalWindow', t('Root sur la VM', 'Root on the VM'), t('en direct, sur la machine', 'live, on the machine'), ['meta', 'agent', 'code'], null,
      t('Il lit : la zone agent, et il peut modifier le code que la VM sert à ton navigateur.', 'He reads: the agent zone, and he can change the code the VM serves to your browser.'),
      t('Il ne lit pas : la zone personnelle, tant qu’aucun appareil ne se déverrouille après sa prise de contrôle.', 'He does not read: the personal zone, as long as no device unlocks after he took over.')],
    ['Password', t('Ton mot de passe maître', 'Your master password'), t('celui que toi seul connais', 'the one only you know'), ['meta', 'agent', 'perso'], null,
      t('Il lit : tout. Ta zone, et celle de l’agent, dont la clé est aussi rangée sous la tienne.', 'He reads: everything. Your zone, and the agent’s, whose key is also stored under yours.'),
      t('Il ne lit pas : rien de plus, il a déjà tout.', 'He does not read: nothing more, he already has it all.')],
    ['Globe', t('Le réseau', 'The network'), t('entre ton téléphone et la VM', 'between your phone and the VM'), [], 'https',
      t('Il lit : rien. C’est du HTTPS, sur un chemin privé.', 'He reads: nothing. It is HTTPS, over a private path.'),
      t('Il ne lit pas : tout. Seuls des blocs chiffrés y passent, de toute façon.', 'He does not read: anything. Only encrypted blocks travel there anyway.')],
  ];

  const LX = 48, LW = 372, LY = 124, LH = 70, LG = 12;
  corps += rubrique(LX, LY - 18, t('CE QU’IL OBTIENT', 'WHAT HE GETS'));
  CAS.forEach(([ic, titre, sous], i) => {
    const y = LY + i * (LH + LG);
    corps += A.cadre(LX, y, LW, LH, C, [cas(i)]);
    corps += `<rect x="${LX + 18}" y="${y + 17}" width="36" height="36" rx="10" fill="${ACCENT}" fill-opacity="0.12"/>` + icone(ic, LX + 26, y + 25, 20, ACCENT_TEXTE);
    corps += texte(LX + 70, y + 31, titre, { taille: 14.5, couleur: TITRE, poids: 600 });
    corps += texte(LX + 70, y + 51, sous, { taille: 12.5, couleur: TEXTE });
    corps += texte(LX + LW - 20, y + 31, String(i + 1), { taille: 12, couleur: DISCRET, police: MONO, ancre: 'end' });
  });

  // ------------------------------------------------------------ the vault
  const VX = 460, VY = 96, VL = 772, VH = 466;
  corps += `<rect x="${VX}" y="${VY}" width="${VL}" height="${VH}" rx="20" fill="${CARTE}" fill-opacity="0.5" stroke="${BORD}" stroke-width="1.5"/>`;
  // The bolts of the safe, one per corner.
  [[VX + 16, VY + 16], [VX + VL - 16, VY + 16], [VX + 16, VY + VH - 16], [VX + VL - 16, VY + VH - 16]].forEach(([x, y]) => {
    corps += `<circle cx="${x}" cy="${y}" r="3.5" fill="none" stroke="${FIL}" stroke-width="1.5"/>`;
  });
  corps += icone('Vault', VX + 32, VY + 18, 20, ACCENT_TEXTE);
  corps += texte(VX + 62, VY + 34, t('Ton coffre, tel qu’il vit sur la VM', 'Your vault, as it lives on the VM'), { taille: 15, couleur: TITRE, poids: 600 });

  // Open intervals per compartment.
  const ouvert = { perso: [], agent: [], meta: [], code: [] };
  CAS.forEach((c, i) => { for (const k of c[3]) ouvert[k].push([cas(i)[0] + 0.035, cas(i)[1] - 0.004]); });
  /// The instants a compartment is closed: the complement of its openings.
  const ferme = (liste) => {
    const out = [];
    let de = 0;
    for (const [a, b] of A.fusionne(liste)) { out.push([de, a]); de = b; }
    out.push([de, 1.2]);
    return out.filter(([a, b]) => b > a);
  };

  const KW = 356, KH = 184, KX = [VX + 20, VX + 20 + KW + 20], KY = [VY + 62, VY + 62 + KH + 16];
  const bruit = (seed, n) => {
    let v = seed, s = '';
    for (let i = 0; i < n; i++) { v = (v * 1103515245 + 12345) & 0x7fffffff; s += (v >>> 8).toString(16).slice(-4) + (i < n - 1 ? ' ' : ''); }
    return s;
  };
  /// A compartment: its title, a status that flips, and its content, noise
  /// while closed, readable while open.
  const case_ = (k, x, y, ic, titre, sous, clair, { statutFerme = t('chiffré', 'encrypted'), statutOuvert = t('lisible par lui', 'readable to him'),
    iconeFerme = 'LockSimple', iconeOuvert = 'LockOpen', contenuFerme = null } = {}) => {
    const o = ouvert[k], f = ferme(o);
    let s = A.cadre(x, y, KW, KH, C, o, { couleur: AMBRE });
    s += `<rect x="${x + 18}" y="${y + 18}" width="32" height="32" rx="9" fill="${ACCENT}" fill-opacity="0.12"/>` + icone(ic, x + 25, y + 25, 18, ACCENT_TEXTE);
    s += texte(x + 62, y + 39, titre, { taille: 14.5, couleur: TITRE, poids: 600 });
    s += texte(x + 20, y + 76, sous, { taille: 12.5, couleur: DISCRET });
    const statut = (mot, ic2, c) => {
      const l = O.largeur(mot, 12, { poids: 600 }) + 36;
      return `<rect x="${x + KW - 18 - l}" y="${y + 20}" width="${l}" height="26" rx="8" fill="${c}" fill-opacity="0.12"/>` +
        icone(ic2, x + KW - 18 - l + 10, y + 26, 14, c) + texte(x + KW - 18 - l + 28, y + 37, mot, { taille: 12, couleur: c, poids: 600 });
    };
    for (const [a, b] of f) {
      s += entre(C, a, b, statut(statutFerme, iconeFerme, DISCRET) + (contenuFerme || [0, 1, 2].map((r) =>
        texte(x + 20, y + 110 + r * 24, bruit(k.length * 97 + r * 31 + Math.round(a * 1000), 5), { taille: 12.5, couleur: FIL, police: MONO })).join('')), 0.008);
    }
    // A fresh copy per opening: the monograms carry their own gradient ids.
    for (const [a, b] of o) s += entre(C, a, b, statut(statutOuvert, iconeOuvert, AMBRE) + (typeof clair === 'function' ? clair() : clair), 0.008);
    return s;
  };
  const entree = (x, y, e) => monogramme(e.nom, x, y, 28, { cle: e.cle }) +
    texte(x + 40, y + 13, e.nom, { taille: 13.5, couleur: TITRE, poids: 500 }) + texte(x + 40, y + 29, e.id, { taille: 12, couleur: TEXTE });

  corps += case_('perso', KX[0], KY[0], 'ShieldCheck', t('Zone personnelle', 'Personal zone'), t('clé UK, qui ne quitte pas tes appareils', 'key UK, which never leaves your devices'),
    () => entree(KX[0] + 20, KY[0] + 96, ENTREES.banque) + entree(KX[0] + 20, KY[0] + 138, ENTREES.messagerie));
  corps += case_('agent', KX[1], KY[0], 'Sparkle', t('Zone agent', 'Agent zone'), t('clé AK, ouverte par la clé serveur', 'key AK, opened by the server key'),
    () => entree(KX[1] + 20, KY[0] + 96, ENTREES.netflix) + entree(KX[1] + 20, KY[0] + 138, ENTREES.spotify));
  const meta = [['Clock', t('dates de création et de changement', 'creation and change dates')],
    ['Stack', t('zone et révision de chaque entrée', 'zone and revision of each entry')],
    ['ArrowsClockwise', t('politiques de rotation', 'rotation policies')]];
  corps += case_('meta', KX[0], KY[1], 'ListChecks', t('Métadonnées', 'Metadata'), t('ce que le serveur range en clair', 'what the server keeps in the clear'),
    meta.map(([ic, s], r) => icone(ic, KX[0] + 20, KY[1] + 98 + r * 26, 16, TEXTE) + texte(KX[0] + 46, KY[1] + 111 + r * 26, s, { taille: 13, couleur: TITRE })).join(''));
  corps += case_('code', KX[1], KY[1], 'Browser', t('L’appli servie', 'The served app'), t('le code que web envoie au navigateur', 'the code web sends to the browser'),
    paragraphe(KX[1] + 20, KY[1] + 110, t('Il peut le modifier, et attraper ton mot de passe maître à la prochaine saisie.', 'He can change it, and catch your master password the next time you type it.'), { taille: 13, max: KW - 40, couleur: TITRE }) +
    texte(KX[1] + 20, KY[1] + 162, t('La parade de la V2 : une appli installée.', 'The V2 answer: an installed app.'), { taille: 12.5, couleur: TEXTE }),
    { statutFerme: t('intacte', 'untouched'), statutOuvert: t('modifiable', 'can be changed'), iconeFerme: 'SealCheck', iconeOuvert: 'Warning',
      contenuFerme: paragraphe(KX[1] + 20, KY[1] + 110, t('Servie avec une CSP stricte : rien d’autre que ce code ne s’exécute.', 'Served with a strict CSP: nothing but this code runs.'), { taille: 13, max: KW - 40, couleur: TEXTE }) });

  // The wrappers of the two cases where nothing opens: restic, then HTTPS.
  const enveloppe = (i, mot) => {
    const [a, b] = [cas(i)[0] + 0.035, cas(i)[1] - 0.004];
    const l = O.largeur(mot, 12.5, { poids: 600 }) + 46;
    return entre(C, a, b, `<rect x="${VX - 8}" y="${VY - 8}" width="${VL + 16}" height="${VH + 16}" rx="26" fill="none" stroke="${ACCENT}" stroke-width="2" stroke-dasharray="8 6"/>
      <rect x="${VX + VL - 20 - l}" y="${VY + 16}" width="${l}" height="28" rx="9" fill="${ACCENT}" fill-opacity="0.14"/>
      ${icone('LockKey', VX + VL - 20 - l + 12, VY + 22, 16, ACCENT_TEXTE)}
      ${texte(VX + VL - 20 - l + 34, VY + 35, mot, { taille: 12.5, couleur: ACCENT_TEXTE, poids: 600 })}`, 0.008);
  };
  corps += enveloppe(0, t('le tout chiffré par restic', 'all of it encrypted by restic'));
  corps += enveloppe(5, t('dans un tunnel HTTPS privé', 'inside a private HTTPS tunnel'));

  // What he got travels to the vault.
  CAS.forEach((c, i) => {
    const y = LY + i * (LH + LG) + LH / 2;
    corps += bille(C, `M${LX + LW} ${y} L${VX - 10} ${VY + VH / 2}`, cas(i)[0] + 0.008, cas(i)[0] + 0.032);
  });
  
  // ------------------------------------------------------------ the verdict
  const RY = VY + VH + 22;
  corps += `<rect x="${VX}" y="${RY}" width="${VL}" height="86" rx="14" fill="${CARTE}" stroke="${BORD}"/>`;
  CAS.forEach((c, i) => {
    const [a, b] = [cas(i)[0] + 0.035, cas(i)[1] - 0.004];
    corps += entre(C, a, b,
      icone('Eye', VX + 20, RY + 18, 18, AMBRE) + texte(VX + 48, RY + 32, c[5], { taille: 13.5, couleur: TITRE, poids: 500 }) +
      icone('EyeSlash', VX + 20, RY + 50, 18, TEXTE) + texte(VX + 48, RY + 64, c[6], { taille: 13.5, couleur: TEXTE }), 0.008);
    corps += entre(C, cas(i)[0] - (i ? 0.004 : 0), a,
      texte(VX + 20, RY + 49, t('Il apporte ce qu’il a trouvé…', 'He brings what he found…'), { taille: 13.5, couleur: DISCRET }), 0.006);
  });
  corps += entre(C, 0, D0, texte(VX + 20, RY + 49, t('Il apporte ce qu’il a trouvé…', 'He brings what he found…'), { taille: 13.5, couleur: DISCRET }), 0.004);
  corps += entre(C, cas(5)[1], 1.2, texte(VX + 20, RY + 49, t('Il apporte ce qu’il a trouvé…', 'He brings what he found…'), { taille: 13.5, couleur: DISCRET }), 0.004);

  // ------------------------------------------------------------ the hard point
  const PY = RY + 106;
  corps += A.cadre(LX, PY, 1232 - LX, 64, C, [[cas(3)[0] + 0.035, cas(3)[1] - 0.004]]);
  corps += icone('ShieldWarning', LX + 20, PY + 21, 22, ACCENT_TEXTE);
  corps += texte(LX + 56, PY + 30, t('Le point dur, assumé : qui prend la VM prend la zone agent. C’est le prix de l’agent.',
    'The hard point, owned: whoever takes the VM takes the agent zone. That is the price of the agent.'), { taille: 14.5, couleur: TITRE, poids: 600 });
  corps += texte(LX + 56, PY + 50, t('La zone personnelle, elle, ne s’ouvre que dans un navigateur que tu as déverrouillé.',
    'The personal zone only opens in a browser you unlocked yourself.'), { taille: 13, couleur: TEXTE });

  svg('menace.svg', 1280, H, corps, t(
    'Le modèle de menace de Serenity, sans tableau. À gauche, six choses qu’un attaquant peut obtenir, tour à tour : une sauvegarde restic sans son mot de passe ; la base seule, une copie de serenity.sqlite ; la base et la clé serveur, qui vit hors de la base ; root sur la VM, en direct ; ton mot de passe maître ; le réseau entre ton téléphone et la VM. À droite, ton coffre tel qu’il vit sur la VM, en quatre cases : la zone personnelle, chiffrée par la clé UK qui ne quitte pas tes appareils, avec Banque et Messagerie ; la zone agent, chiffrée par la clé AK que la clé serveur ouvre, avec Netflix et Spotify ; les métadonnées, dates, zones, révisions et politiques de rotation ; l’appli servie, le code que web envoie au navigateur, sous une CSP stricte. Pour chaque cas, les cases qui s’ouvrent s’éclairent en ambre et montrent leur contenu, les autres restent du bruit chiffré. Une sauvegarde sans son mot de passe : rien, tout est chiffré une seconde fois par restic. La base seule : les métadonnées, aucun mot de passe, et chaque essai sur ta zone coûte un Argon2id à 64 Mio. La base et la clé serveur : la zone agent, pas la zone personnelle ; la parade est de changer la clé serveur, la clé d’agent et ces mots de passe. Root sur la VM : la zone agent, et il peut modifier le code servi pour attraper ton mot de passe maître à la prochaine saisie ; la zone personnelle tient tant qu’aucun appareil ne se déverrouille après sa prise de contrôle, et la V2 répond par une appli installée. Ton mot de passe maître : tout. Le réseau : rien, c’est du HTTPS sur un chemin privé. En bas, le point dur, assumé : qui prend la VM prend la zone agent, c’est le prix de l’agent ; la zone personnelle ne s’ouvre que dans un navigateur que tu as déverrouillé.',
    'The Serenity threat model, without a table. On the left, six things an attacker may get, in turn: a restic backup without its password; the database alone, a copy of serenity.sqlite; the database and the server key, which lives outside it; root on the VM, live; your master password; the network between your phone and the VM. On the right, your vault as it lives on the VM, in four compartments: the personal zone, encrypted with the UK key that never leaves your devices, holding Bank and Mailbox; the agent zone, encrypted with the AK key that the server key opens, holding Netflix and Spotify; the metadata, dates, zones, revisions and rotation policies; the served app, the code web sends to the browser, under a strict CSP. For each case, the compartments that open light up in amber and show their content, the others stay encrypted noise. A backup without its password: nothing, all of it is encrypted a second time by restic. The database alone: the metadata, no password, and each guess at your zone costs an Argon2id at 64 MiB. The database and the server key: the agent zone, not the personal zone; the fix is a new server key, a new agent key and new passwords there. Root on the VM: the agent zone, and he can change the served code to catch your master password the next time you type it; the personal zone holds as long as no device unlocks after he took over, and V2 answers with an installed app. Your master password: everything. The network: nothing, it is HTTPS over a private path. At the bottom, the hard point, owned: whoever takes the VM takes the agent zone, that is the price of the agent; the personal zone only opens in a browser you unlocked yourself.'));
};

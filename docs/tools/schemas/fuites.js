// The breach watch, and why Pwned Passwords never learns your password.
//
// On the left, the phone plays the real screens (05-coffre, 09-fuites):
// the vault, the Breaches tab while it checks, then the result, the
// health ring down from 100 to 67, the light turning amber and the
// Netflix alert. On the right, what the device does meanwhile, from
// docs/05-veille.md and web/src/features/breaches/: SHA-1 of a test
// password, five characters sent, the suffixes that come back with their
// padding, the comparison at home, the local checks, then the report that
// carries ids and kinds only, and the score of web/src/app/health.ts.
//
// The test password is password123, never a real one: its SHA-1 below is
// the real one, and the other suffixes are real SHA-1 of test strings
// that share its prefix.
module.exports = (O) => {
  const E = require('./_ecrans.js')(O);
  const V = require('./_ecrans-veille.js')(O);
  const { t, svg, texte, paragraphe, entete, rubrique, entre, toucher, carte, icone, telephone, aurore, frappe,
    fil, bille, pointe, largeur, CARTE, BORD, TITRE, TEXTE, DISCRET, ACCENT, ACCENT_TEXTE, AMBRE, MONO } = O;
  const C = 32;
  // The phone.
  const TAPE = 0.045, SCAN = 0.06, RESULTAT = 0.6, FIN = 0.97;
  // The right side, step by step.
  const MDP = 0.08, HASH = [0.11, 0.17], PREFIXE = 0.19, REQ = [0.21, 0.25], LISTE = 0.28, REP = [0.31, 0.35],
    COMPARE = 0.36, TROUVE = 0.38, CHECKS = [0.42, 0.46, 0.5], RAPPORT = [0.54, 0.57], SCORE = 0.63;

  const HASH_COMPLET = 'CBFDAC6008F9CAB4083784CBD1874F76618D2A97';
  const SUFFIXE = HASH_COMPLET.slice(5);

  let corps = V.enTete(t('LA VEILLE DES FUITES', 'THE BREACH WATCH'),
    t('Ton appareil vérifie chaque mot de passe sans jamais le montrer à personne.',
      'Your device checks every password without ever showing it to anyone.'));

  // ------------------------------------------------------------ the phone
  const T = telephone(48, 88, 704);
  corps += T.cadre;
  let ecran = aurore(390, 844, [[0, 'calm'], [RESULTAT, 'leak']], { cycle: C });
  ecran += entre(C, 0, SCAN, E.coffre({ netflix: 'agent' }) + toucher(195, 801, C, TAPE), 0.006);
  ecran += entre(C, SCAN, RESULTAT, V.fuitesMobile({ etat: 'sain', verif: 'encours' }), 0.006);
  ecran += entre(C, RESULTAT, FIN, V.fuitesMobile({ etat: 'fuite' }), 0.006);
  corps += T.ecran(ecran);

  // --------------------------------------------- your device, the service
  const X = 420, DY = 88, DL = 420, DH = 260;
  const SX = 900, SL = 340;
  corps += carte(X, DY, DL, DH, { allume: [MDP, COMPARE + 0.06], cycle: C });
  corps += icone('DeviceMobile', X + 20, DY + 20, 20, ACCENT_TEXTE) + texte(X + 50, DY + 36, t('Ton appareil', 'Your device'), { taille: 16, couleur: TITRE, poids: 600 });
  corps += texte(X + DL - 20, DY + 36, t('coffre déverrouillé', 'vault unlocked'), { taille: 12.5, couleur: DISCRET, ancre: 'end' });

  const attente = (x, y, de, a, m) => entre(C, 0, de, texte(x, y, m, { taille: 12.5, couleur: DISCRET, ancre: 'middle' }), 0.006) +
    entre(C, FIN, 1.5, texte(x, y, m, { taille: 12.5, couleur: DISCRET, ancre: 'middle' }), 0.006);
  corps += attente(X + DL / 2, DY + 140, MDP, FIN, t('Le scan démarre quand tu ouvres l’onglet Fuites.', 'The scan starts when you open the Breaches tab.'));
  const ligneA = DY + 66, ligneB = DY + 118, ligneC = DY + 172;
  corps += entre(C, MDP, FIN,
    texte(X + 20, ligneA, t('Mot de passe d’essai', 'Test password'), { taille: 12.5, couleur: DISCRET }) +
    texte(X + 20, ligneA + 24, 'password123', { taille: 15, couleur: TITRE, police: MONO }), 0.006);
  corps += entre(C, HASH[0] - 0.012, FIN, texte(X + 20, ligneB, t('Son empreinte SHA-1, 40 caractères', 'Its SHA-1 hash, 40 characters'), { taille: 12.5, couleur: DISCRET }), 0.006);
  // Typed letter by letter, and gone with the rest at the end of the loop.
  corps += entre(C, HASH[0] - 0.012, FIN, frappe(X + 20, ligneB + 24, HASH_COMPLET, C, HASH[0], HASH[1], { taille: 14, couleur: TEXTE, police: MONO }), 0.006);
  const lp = 5 * 14 * 0.6;
  corps += entre(C, PREFIXE, FIN,
    `<rect x="${X + 17}" y="${ligneB + 7}" width="${lp + 6}" height="23" rx="5" fill="${ACCENT}" fill-opacity="0.22"/>` +
    texte(X + 20, ligneB + 24, HASH_COMPLET.slice(0, 5), { taille: 14, couleur: ACCENT_TEXTE, police: MONO, poids: 600 }) +
    texte(X + 20 + lp + 12, ligneB + 48, t('seuls ces 5 caractères sortent', 'only these 5 characters leave'), { taille: 12.5, couleur: ACCENT_TEXTE }) +
    `<path d="M${X + 20 + lp / 2} ${ligneB + 34} V${ligneB + 44} H${X + 20 + lp + 6}" fill="none" stroke="${ACCENT}" stroke-opacity="0.6" stroke-width="1.4"/>`, 0.006);
  corps += entre(C, COMPARE, FIN,
    texte(X + 20, ligneC + 14, t('Comparaison, ici même', 'Comparison, right here'), { taille: 12.5, couleur: DISCRET }) +
    texte(X + 20, ligneC + 38, SUFFIXE, { taille: 14, couleur: TITRE, police: MONO }), 0.006);
  const trouve = t('trouvé dans la liste : vu dans une fuite', 'found in the list: seen in a breach');
  corps += entre(C, TROUVE, FIN,
    `<rect x="${X + 20}" y="${ligneC + 50}" width="${largeur(trouve, 12.5, { poids: 500 }) + 32}" height="26" rx="9" fill="${AMBRE}" fill-opacity="0.13"/>` +
    icone('WarningCircle', X + 29, ligneC + 56, 14, AMBRE) + texte(X + 48, ligneC + 67.5, trouve, { taille: 12.5, couleur: AMBRE, poids: 500 }), 0.006);

  // The service.
  corps += carte(SX, DY, SL, DH, { allume: [REQ[0], COMPARE + 0.06], cycle: C });
  corps += icone('Globe', SX + 20, DY + 20, 20, ACCENT_TEXTE) + texte(SX + 50, DY + 36, 'Pwned Passwords', { taille: 16, couleur: TITRE, poids: 600 });
  corps += texte(SX + 20, DY + 60, 'api.pwnedpasswords.com', { taille: 12.5, couleur: DISCRET, police: MONO });
  corps += attente(SX + SL / 2, DY + 150, REQ[1], FIN, t('Il attend une question de 5 caractères.', 'It waits for a 5 character question.'));
  corps += entre(C, REQ[1], FIN,
    texte(SX + 20, DY + 92, 'GET /range/', { taille: 13, couleur: TITRE, police: MONO }) +
    texte(SX + 20 + 11 * 7.8, DY + 92, 'CBFDA', { taille: 13, couleur: ACCENT_TEXTE, police: MONO, poids: 600 }) +
    texte(SX + 20, DY + 112, 'Add-Padding: true', { taille: 12.5, couleur: DISCRET, police: MONO }), 0.006);
  const suffixes = ['A43B9ED2F267ECB1F370530128DA578AEFD', 'AC7C180F263B1EEC3418ECDD0C7CC4C45A4', SUFFIXE, 'DD7F0D4091D9F72631737E16A821F7A3DB0'];
  let liste = texte(SX + 20, DY + 142, t('Il renvoie les suffixes qui commencent pareil', 'It returns the suffixes that start the same'), { taille: 12.5, couleur: DISCRET });
  suffixes.forEach((s, i) => { liste += texte(SX + 20, DY + 166 + i * 19, s, { taille: 12.5, couleur: TEXTE, police: MONO }); });
  liste += texte(SX + 20, DY + 166 + 4 * 19 + 4, t('environ 800, plus du bourrage : 100 ko', 'about 800, plus padding: 100 kB'), { taille: 12.5, couleur: DISCRET });
  corps += entre(C, LISTE, FIN, liste, 0.006);
  // The matching line lights up once the device compares.
  corps += entre(C, TROUVE, FIN,
    `<rect x="${SX + 14}" y="${DY + 166 + 2 * 19 - 14}" width="${35 * 7.5 + 12}" height="19" rx="4" fill="${AMBRE}" fill-opacity="0.14"/>` +
    texte(SX + 20, DY + 166 + 2 * 19, SUFFIXE, { taille: 12.5, couleur: AMBRE, police: MONO }), 0.006);

  // Wires: the prefix goes out, the list comes back.
  const aller = `M ${X + DL + 2} ${ligneB + 18} H ${X + DL + 28} V ${DY + 88} H ${SX - 4}`;
  corps += fil(C, aller, REQ[1], COMPARE + 0.06) + pointe(SX - 3, DY + 88, 0) + bille(C, aller, REQ[0], REQ[1]);
  const retour = `M ${SX - 2} ${ligneC + 34} H ${X + DL + 4}`;
  corps += fil(C, retour, REP[1], COMPARE + 0.06) + pointe(X + DL + 3, ligneC + 34, 180) + bille(C, retour, REP[0], REP[1]);

  // ------------------------------------------------ what reaches the server
  const RY = DY + DH + 18, RH = 92;
  corps += carte(X, RY, 820, RH, { allume: [RAPPORT[0], SCORE], cycle: C });
  const descente = `M ${X + 210} ${DY + DH + 2} V ${RY - 3}`;
  corps += fil(C, descente, RAPPORT[1], SCORE) + pointe(X + 210, RY - 2, 90) + bille(C, descente, RAPPORT[0], RAPPORT[1]);
  corps += icone('HardDrives', X + 20, RY + 19, 20, ACCENT_TEXTE) + texte(X + 50, RY + 35, t('Ce qui part vers ton serveur', 'What goes to your server'), { taille: 15, couleur: TITRE, poids: 600 });
  corps += texte(X + 800, RY + 35, 'POST /api/watch/report', { taille: 13, couleur: DISCRET, police: MONO, ancre: 'end' });
  corps += attente(X + 410, RY + 67, RAPPORT[1], FIN, t('Le résultat, une fois la comparaison faite.', 'The result, once the comparison is done.'));
  corps += entre(C, RAPPORT[1], FIN,
    texte(X + 20, RY + 67, '{ item_id, kind: "pwned_password" }  { item_id, kind: "weak" }', { taille: 13, couleur: TITRE, police: MONO }) +
    texte(X + 800, RY + 67, t('Jamais un mot de passe, ni un nom de site.', 'Never a password, nor a site name.'), { taille: 12.5, couleur: TEXTE, ancre: 'end' }), 0.006);

  // ------------------------------------------------------ the local checks
  const CY = RY + RH + 44, CH = 132, CL = 260;
  corps += rubrique(X, CY - 14, t('EN LOCAL, SUR TOUT LE COFFRE, À CHAQUE OUVERTURE', 'LOCALLY, ON THE WHOLE VAULT, AT EVERY OPENING'));
  const controles = [
    [t('Réutilisé', 'Reused'), t('Le même mot de passe sur plusieurs entrées. Seul ton appareil voit les deux zones.', 'The same password on several entries. Only your device sees both zones.'), t('Netflix : non', 'Netflix: no'), null],
    [t('Faible', 'Weak'), t('Moins de 12 caractères, moins de 60 bits ou moins de 5 caractères différents.', 'Under 12 characters, under 60 bits, or under 5 different characters.'), t('11 caractères, 57 bits : faible', '11 characters, 57 bits: weak'), AMBRE],
    [t('Ancien', 'Old'), t('Pas changé depuis plus d’un an.', 'Not changed for over a year.'), t('Netflix : non', 'Netflix: no'), null],
  ];
  controles.forEach(([titre, regle, verdict, c], i) => {
    const x = X + i * (CL + 20);
    corps += carte(x, CY, CL, CH, { allume: [CHECKS[i], RAPPORT[0]], cycle: C });
    corps += texte(x + 20, CY + 32, titre, { taille: 14.5, couleur: TITRE, poids: 600 });
    corps += paragraphe(x + 20, CY + 56, regle, { taille: 12.5, max: CL - 40, couleur: TEXTE, interligne: 18 });
    corps += entre(C, CHECKS[i], FIN,
      (c ? `<circle cx="${x + 24}" cy="${CY + CH - 22}" r="4" fill="${c}"/>` : `<circle cx="${x + 24}" cy="${CY + CH - 22}" r="4" fill="none" stroke="${DISCRET}" stroke-width="1.4"/>`) +
      texte(x + 36, CY + CH - 17.5, verdict, { taille: 12.5, couleur: c || DISCRET, poids: 500 }), 0.006);
  });

  // ------------------------------------------------------------ the score
  const SY = CY + CH + 20, SH = 138;
  corps += carte(X, SY, 820, SH, { allume: [SCORE, FIN], cycle: C });
  corps += texte(X + 20, SY + 34, t('Le score de santé', 'The health score'), { taille: 15, couleur: TITRE, poids: 600 });
  corps += texte(X + 20, SY + 58, t('Chaque entrée pèse selon sa pire alerte.', 'Each entry weighs by its worst alert.'), { taille: 12.5, couleur: TEXTE });
  let px = X + 20;
  for (const p of [t('fuite 1', 'breach 1'), t('réutilisé 0,6', 'reused 0.6'), t('faible 0,5', 'weak 0.5'), t('ancien 0,3', 'old 0.3')]) {
    const l = largeur(p, 12.5, { poids: 500 }) + 20;
    corps += `<rect x="${px}" y="${SY + 72}" width="${l}" height="24" rx="8" fill="none" stroke="${BORD}" stroke-width="1.2"/>` + texte(px + 10, SY + 88, p, { taille: 12.5, couleur: TITRE, poids: 500 });
    px += l + 8;
  }
  corps += texte(X + 20, SY + 120, t('Moins 5 points par adresse e-mail touchée.', 'Minus 5 points per breached email address.'), { taille: 12.5, couleur: TEXTE });
  // The calculation for this vault, and the colours of the ring.
  const cx = X + 450;
  corps += `<line x1="${cx - 20}" y1="${SY + 20}" x2="${cx - 20}" y2="${SY + SH - 20}" stroke="${BORD}"/>`;
  corps += entre(C, 0, SCORE, texte(cx, SY + 34, t('Calculé dès que les alertes changent.', 'Computed as soon as the alerts change.'), { taille: 13, couleur: DISCRET }), 0.006) +
    entre(C, FIN, 1.5, texte(cx, SY + 34, t('Calculé dès que les alertes changent.', 'Computed as soon as the alerts change.'), { taille: 13, couleur: DISCRET }), 0.006);
  corps += entre(C, SCORE, FIN,
    texte(cx, SY + 34, t('Ici : 3 entrées, Netflix pèse 1.', 'Here: 3 entries, Netflix weighs 1.'), { taille: 13, couleur: TITRE }) +
    texte(cx, SY + 66, '100 × (1 - 1/3) = 67', { taille: 16, couleur: TITRE, police: MONO, poids: 600 }), 0.006);
  const seuils = [[t('vert dès 85', 'green from 85'), O.VERT], [t('ambre dès 60', 'amber from 60'), AMBRE], [t('rouge dessous', 'red below'), O.ROUGE]];
  let sx = cx;
  seuils.forEach(([m, c]) => {
    corps += `<circle cx="${sx + 4}" cy="${SY + 111}" r="4" fill="${c}"/>` + texte(sx + 14, SY + 115.5, m, { taille: 12.5, couleur: TEXTE });
    sx += largeur(m, 12.5) + 34;
  });

  svg('fuites.svg', 1280, 820, corps, t(
    'La veille des fuites, en k-anonymat. À gauche, le téléphone rejoue les vrais écrans : le coffre, où Netflix est confié à l’agent ; un toucher sur l’onglet Fuites ; l’onglet pendant la vérification, anneau de santé à 100 et « Tout va bien » ; puis le résultat : l’anneau tombe à 67, la lumière vire à l’ambre, les compteurs montrent une fuite et un mot de passe faible, et l’alerte Netflix arrive avec les pastilles « Vu dans une fuite », « Faible » et « Confié à l’agent », le texte « L’agent a préparé une rotation, elle attend ton accord » et le bouton « Voir la proposition ». À droite, ce que fait ton appareil pendant ce temps. Il prend un mot de passe d’essai, password123, et calcule son empreinte SHA-1 de 40 caractères, CBFDAC6008F9CAB4083784CBD1874F76618D2A97. Seuls les 5 premiers, CBFDA, partent vers api.pwnedpasswords.com, par GET /range/CBFDA avec l’en-tête Add-Padding. Le service renvoie les suffixes qui commencent pareil, environ 800, plus du bourrage, soit 100 ko. La comparaison se fait sur l’appareil : le suffixe C6008F9CAB4083784CBD1874F76618D2A97 est dans la liste, donc le mot de passe a été vu dans une fuite. Ce qui part vers ton serveur, par POST /api/watch/report : l’identifiant de l’entrée et le type d’alerte, pwned_password et weak, jamais un mot de passe ni un nom de site. En local, sur tout le coffre et à chaque ouverture, trois autres contrôles : réutilisé (le même mot de passe sur plusieurs entrées, que seul ton appareil peut voir), faible (moins de 12 caractères, moins de 60 bits ou moins de 5 caractères différents : password123 a 11 caractères et 57 bits, il est faible), ancien (pas changé depuis plus d’un an). Enfin le score de santé : chaque entrée pèse selon sa pire alerte, fuite 1, réutilisé 0,6, faible 0,5, ancien 0,3, et on retire 5 points par adresse e-mail touchée. Ici, trois entrées dont Netflix qui pèse 1 : 100 × (1 - 1/3) = 67. L’anneau est vert dès 85, ambre dès 60, rouge en dessous.',
    'The breach watch, with k-anonymity. On the left, the phone replays the real screens: the vault, where Netflix is handed to the agent; a tap on the Breaches tab; the tab while it checks, health ring at 100 and “All is well”; then the result: the ring drops to 67, the light turns amber, the counters show one breach and one weak password, and the Netflix alert arrives with the chips “Seen in a breach”, “Weak” and “Handed to the agent”, the text “The agent has prepared a rotation, it waits for your consent” and the “See the proposal” button. On the right, what your device does meanwhile. It takes a test password, password123, and computes its 40 character SHA-1 hash, CBFDAC6008F9CAB4083784CBD1874F76618D2A97. Only the first 5, CBFDA, go to api.pwnedpasswords.com, through GET /range/CBFDA with the Add-Padding header. The service returns the suffixes that start the same, about 800, plus padding, 100 kB in all. The comparison happens on the device: the suffix C6008F9CAB4083784CBD1874F76618D2A97 is in the list, so the password was seen in a breach. What goes to your server, through POST /api/watch/report: the id of the entry and the kind of alert, pwned_password and weak, never a password nor a site name. Locally, on the whole vault and at every opening, three more checks: reused (the same password on several entries, which only your device can see), weak (under 12 characters, under 60 bits or under 5 different characters: password123 has 11 characters and 57 bits, so it is weak), old (not changed for over a year). Last, the health score: each entry weighs by its worst alert, breach 1, reused 0.6, weak 0.5, old 0.3, minus 5 points per breached email address. Here, three entries, Netflix weighing 1: 100 × (1 - 1/3) = 67. The ring is green from 85, amber from 60, red below.'));
};

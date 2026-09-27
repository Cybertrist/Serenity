// The phone plate of "The screens": eight real screenshots of the Aurora
// interface, in phone frames, two rows of four, a short caption under each.
//
// A still plate, without any animation: it is a showcase to look at, not a
// mechanism to explain. The phones cast a soft shadow that follows their
// rounded shape (feDropShadow of the frame), never a flat ellipse under
// them. Each screenshot fills the screen at its exact 390 x 844 ratio.
module.exports = (O) => {
  const { t, svg, texte, entete, lignes, telephone, capture, TITRE, TEXTE } = O;

  const ECRANS = [
    ['13-deverrouillage', t('Déverrouiller', 'Unlock'), t('Ton mot de passe maître, dérivé ici.', 'Your master password, derived here.')],
    ['05-coffre', t('Le coffre', 'The vault'), t('Tes entrées, rangées par zone.', 'Your entries, sorted by zone.')],
    ['06-fiche', t('Une fiche', 'An entry'), t('Identifiant, mot de passe, code et site.', 'Username, password, code and site.')],
    ['08b-codes', t('Codes 2FA', '2FA codes'), t('Calculés ici, même hors ligne.', 'Computed here, even offline.')],
    ['09-fuites', t('Fuites', 'Breaches'), t('Ce que la veille a trouvé.', 'What the watch found.')],
    ['11-agent', t('L’agent', 'The agent'), t('Il prépare la rotation, tu l’approuves.', 'It prepares the rotation, you approve it.')],
    ['03-kit', t('Kit de récupération', 'Recovery kit'), t('Affiché une seule fois, à la création.', 'Shown once, when you sign up.')],
    ['12-reglages', t('Réglages', 'Settings'), t('Verrouillage, appareils, import et journal.', 'Lock, devices, import and log.')],
  ];

  // Four phones per row, centred. telephone() gives the frame, its shadow
  // (ombreFlottante, a drop shadow of the rounded body) and the screen.
  const PH = 480;
  const probe = telephone(0, 0, PH);
  const DL = probe.largeur;
  const GAP = 72;
  const X0 = Math.round((1280 - (4 * DL + 3 * GAP)) / 2);
  const Y0 = 100;
  const RANG = PH + 104;

  let corps = entete(t('LES ÉCRANS', 'THE SCREENS'),
    t('Huit écrans du téléphone, pris sur la vraie appli.', 'Eight phone screens, taken from the real app.'));

  ECRANS.forEach(([cle, titre, phrase], i) => {
    const x = X0 + (i % 4) * (DL + GAP);
    const y = Y0 + Math.floor(i / 4) * RANG;
    const T = telephone(x, y, PH);
    corps += T.cadre + T.ecran(capture(cle, 0, 0, 390, 844));
    const cx = x + DL / 2;
    corps += texte(cx, y + PH + 34, titre, { taille: 15, couleur: TITRE, poids: 600, ancre: 'middle' });
    lignes(phrase, 13, DL + GAP - 28).forEach((l, k) => {
      corps += texte(cx, y + PH + 57 + k * 19, l, { taille: 13, couleur: TEXTE, ancre: 'middle' });
    });
  });

  svg('captures-telephone.svg', 1280, Y0 + 2 * RANG + 2, corps, t(
    'Huit écrans de Serenity sur téléphone, en deux rangées de quatre, chacun avec sa légende. Première rangée : le déverrouillage, avec le logo, « Bon retour, Tristan. » et le champ du mot de passe maître, dérivé sur l’appareil ; le coffre, avec l’anneau de santé à 100, « Tout va bien. », puis Banque, Netflix et Spotify sous « Protégé par toi » et la zone « Confié à l’agent » encore vide ; la fiche de Netflix, avec son identifiant, son mot de passe jugé faible, son code à usage unique 933 532, son site et le bouton « Confier à l’agent » ; les codes 2FA, calculés sur l’appareil même hors ligne, avec le code de Netflix. Seconde rangée : les fuites, avec la santé du coffre à 67, « Une chose demande ton attention. », les compteurs et l’alerte de Netflix vu dans une fuite ; l’agent, qui propose de changer le mot de passe de Netflix en quatre étapes, générer, changer, prouver, valider, avec les boutons Refuser et Approuver ; le kit de récupération, neuf blocs de quatre caractères affichés une seule fois à la création du compte ; les réglages, avec le verrouillage après 15 minutes, l’apparence, la veille, l’import et l’export, la corbeille, le journal, le kit et les appareils.',
    'Eight Serenity screens on a phone, in two rows of four, each with its caption. First row: unlock, with the logo, “Welcome back, Tristan.” and the master password field, derived on the device; the vault, with the health ring at 100, “All is well.”, then Bank, Netflix and Spotify under “Protected by you” and the “Handed to the agent” zone still empty; the Netflix entry, with its username, its password rated weak, its one-time code 933 532, its site and the “Hand to the agent” button; the 2FA codes, computed on the device even offline, with the Netflix code. Second row: breaches, with the vault health at 67, “One thing needs your attention.”, the counters and the alert for Netflix seen in a breach; the agent, which offers to change the Netflix password in four steps, generate, change, prove, confirm, with the Decline and Approve buttons; the recovery kit, nine blocks of four characters shown only once when the account is created; settings, with the lock after 15 minutes, appearance, the watch, import and export, the bin, the log, the kit and the devices.'));
};

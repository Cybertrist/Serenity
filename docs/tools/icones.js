// Pulls the Phosphor icons the app uses out of web/node_modules, into
// schemas/icones.json, so the animated diagrams draw the very same glyphs
// as the screens they replay.
//
//   node docs/tools/icones.js
//
// Only needed when the list below changes: icones.json is versioned, and
// rendering the diagrams does not need node_modules. Phosphor is MIT.
const fs = require('fs');
const path = require('path');

const DEFS = path.join(__dirname, '..', '..', 'web', 'node_modules', '@phosphor-icons', 'react', 'dist', 'defs');
const NOMS = [
  'Vault', 'ClockCountdown', 'Target', 'Sparkle', 'SlidersHorizontal', 'MagnifyingGlass', 'Bell', 'Plus',
  'ShieldCheck', 'ShieldWarning', 'SealWarning', 'SealCheck', 'Warning', 'WarningCircle', 'Copy', 'Eye', 'EyeSlash',
  'ArrowsClockwise', 'ArrowSquareOut', 'ArrowRight', 'ArrowLeft', 'CaretRight', 'CaretDown', 'CaretLeft', 'Check',
  'CheckCircle', 'X', 'Key', 'LockSimple', 'LockKey', 'LockKeyOpen', 'LockOpen', 'Trash', 'TerminalWindow', 'QrCode',
  'DownloadSimple', 'At', 'Sun', 'Moon', 'Question', 'MagicWand', 'CloudSlash', 'Cloud', 'Lifebuoy', 'ArrowsLeftRight',
  'SignOut', 'SignIn', 'Info', 'Devices', 'DeviceMobile', 'Clock', 'Binoculars', 'Power', 'PencilSimple', 'Password',
  'EnvelopeSimple', 'ArrowUUpLeft', 'ArrowSquareIn', 'Prohibit', 'Play', 'Globe', 'GearSix', 'FileCsv', 'CopySimple',
  'HandTap', 'HandPalm', 'BookOpenText', 'Minus', 'UserCircle', 'Scroll', 'NotePencil', 'Desktop', 'Monitor',
  'WindowsLogo', 'LinuxLogo', 'Browser', 'Database', 'HardDrives', 'Package', 'Robot', 'Fingerprint', 'FileText',
  'Hash', 'Timer', 'ListChecks', 'FlowArrow', 'Cube', 'ShieldSlash', 'Stack', 'CloudArrowUp', 'ArrowCounterClockwise',
  'Keyboard', 'Command',
];
const sortie = {};
for (const nom of NOMS) {
  const f = path.join(DEFS, `${nom}.es.js`);
  if (!fs.existsSync(f)) { console.log(`  absent : ${nom}`); continue; }
  const src = fs.readFileSync(f, 'utf8');
  sortie[nom] = {};
  for (const poids of ['regular', 'fill', 'bold']) {
    const bloc = src.split(`"${poids}"`)[1];
    if (!bloc) continue;
    const fin = bloc.indexOf(']\n') >= 0 ? bloc.indexOf('\n  ]') : bloc.length;
    const morceau = bloc.slice(0, fin);
    const chemins = [...morceau.matchAll(/d: "([^"]+)"/g)].map((m) => m[1]);
    sortie[nom][poids] = chemins;
  }
}
fs.writeFileSync(path.join(__dirname, 'schemas', 'icones.json'), JSON.stringify(sortie) + '\n');
console.log(`  ${Object.keys(sortie).length} icônes, ${(JSON.stringify(sortie).length / 1024).toFixed(0)} Ko`);

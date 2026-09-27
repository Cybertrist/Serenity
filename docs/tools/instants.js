// Freezes an animated diagram at chosen instants and captures each one,
// to look at it before it ships: around every transition, in both
// languages, at 1000 px wide.
//
//   node docs/tools/instants.js zones 0.1 0.24 0.25 0.5
//   node docs/tools/instants.js zones 12s 30s --en
//   node docs/tools/instants.js zones --pas 8        eight evenly spaced
//
// An instant is a fraction of the cycle (0.25) or a time in seconds
// (12s). The PNGs land in docs/tools/instants/, which git ignores, named
// <diagram>-<lang>-<instant>.png. Open them, look, fix, render again.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const args = process.argv.slice(2);
const en = args.includes('--en');
const largeur = 1000;
const nom = args[0];
const fichier = path.join(__dirname, '..', 'img', ...(en ? ['en'] : []), 'schemas', `${nom}.svg`);
const svg = fs.readFileSync(fichier, 'utf8');
const [, L, H] = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
// The cycle is the longest dur: small loops (the orb's pulse) are shorter.
const dur = Math.max(0, ...[...svg.matchAll(/ dur="([\d.]+)s"/g)].map((m) => Number(m[1])));
let instants = [];
for (let i = 1; i < args.length; i++) {
  if (args[i] === '--en') continue;
  if (args[i] === '--pas') {
    const n = Number(args[++i]);
    for (let k = 0; k < n; k++) instants.push(((k + 0.5) / n).toFixed(3));
  } else instants.push(args[i]);
}
if (!instants.length) instants = ['0'];
const dossier = path.join(__dirname, 'instants');
fs.mkdirSync(dossier, { recursive: true });
const h = Math.round((largeur * H) / L);
for (const inst of instants) {
  const s = inst.endsWith('s') ? parseFloat(inst) : parseFloat(inst) * dur;
  const page = path.join(dossier, `page-${nom}.html`);
  fs.writeFileSync(page, `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#0D1117}svg{display:block;width:${largeur}px;height:auto}</style></head><body>
${svg}
<script>const s=document.querySelector('svg');s.pauseAnimations();s.setCurrentTime(${s});</script></body></html>`);
  const sortie = path.join(dossier, `${nom}-${en ? 'en' : 'fr'}-${inst.replace('.', '_')}.png`);
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--virtual-time-budget=3000',
    `--window-size=${largeur},${h}`, `--screenshot=${sortie}`, 'file:///' + page.split(path.sep).join('/')], { stdio: 'ignore' });
  console.log(`  ${path.relative(path.join(__dirname, '..', '..'), sortie)}  (${s.toFixed(1)} s sur ${dur} s)`);
}

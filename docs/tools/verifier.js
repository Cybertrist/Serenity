// Checks every SVG of docs/img/schemas and docs/img/en/schemas.
//
//   node docs/tools/verifier.js
//
// - strict XML, through Chrome's DOMParser in image/svg+xml mode: an SVG
//   Chrome shows despite a fault can come out as "Invalid image source"
//   on GitHub;
// - no duplicate id, and no reference to a missing one (a clipPath or a
//   gradient would point elsewhere, or nowhere);
// - no long dash (U+2014, U+2013) anywhere, text alternative included;
// - a text alternative long enough to list what the figure shows.
// The eye check, spacing and overlaps, is instants.js.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const racine = path.join(__dirname, '..', 'img');
const fichiers = ['schemas', path.join('en', 'schemas')]
  .filter((d) => fs.existsSync(path.join(racine, d)))
  .flatMap((d) => fs.readdirSync(path.join(racine, d)).filter((f) => f.endsWith('.svg')).map((f) => path.join(d, f)));

let echecs = 0;
for (const f of fichiers) {
  const s = fs.readFileSync(path.join(racine, f), 'utf8');
  const ids = [...s.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
  const doubles = [...new Set(ids.filter((x, i) => ids.indexOf(x) !== i))];
  if (doubles.length) { console.log(`  ${f} : identifiants en double, ${doubles.slice(0, 5).join(', ')}`); echecs++; }
  if (/[\u2013\u2014]/.test(s)) { console.log(`  ${f} : tiret long`); echecs++; }
  const refs = [...s.matchAll(/url\(#([^)]+)\)|href="#([^"]+)"/g)].map((m) => m[1] || m[2]);
  const connus = new Set(ids);
  const manquants = [...new Set(refs.filter((r) => !connus.has(r)))];
  if (manquants.length) { console.log(`  ${f} : références sans cible, ${manquants.slice(0, 5).join(', ')}`); echecs++; }
  if (!/<title>[^<]{120,}<\/title>/.test(s)) { console.log(`  ${f} : texte alternatif trop court`); echecs++; }
}

const page = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'verifier-')), 'page.html');
const donnees = fichiers.map((f) => [f, fs.readFileSync(path.join(racine, f), 'utf8')]);
fs.writeFileSync(page, `<!doctype html><body><pre id="o"></pre><script>
const F = ${JSON.stringify(donnees).replace(/<\/script/gi, '<\\/script')};
const r = [];
for (const [f, s] of F) {
  const e = new DOMParser().parseFromString(s, 'image/svg+xml').querySelector('parsererror');
  if (e) r.push(f + ' : ' + e.textContent.replace(/\\s+/g, ' ').slice(0, 240));
}
document.getElementById('o').textContent = r.length ? r.join('\\n') : 'TOUT_VALIDE';
</script></body>`);
const dom = execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--dump-dom', 'file:///' + page.split(path.sep).join('/')],
  { maxBuffer: 1 << 30, stdio: ['ignore', 'pipe', 'ignore'] }).toString();
const sortie = dom.match(/<pre id="o">([\s\S]*?)<\/pre>/)[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
if (sortie !== 'TOUT_VALIDE') { console.log(sortie.split('\n').map((l) => '  ' + l).join('\n')); echecs++; }
console.log(echecs ? `  ${fichiers.length} SVG, des erreurs.` : `  ${fichiers.length} SVG, tous valides.`);
process.exitCode = echecs ? 1 : 0;

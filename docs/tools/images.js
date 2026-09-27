// Shrinks the logo and the screenshots the diagrams embed, into
// schemas/images.json, as data: URLs: an SVG shown through <img> may not
// fetch a file next to it, so everything it shows has to live inside it.
//
//   node docs/tools/images.js
//
// The screenshots come from docs/img/ when they are there, otherwise from
// the capture folder named by SERENITY_SHOTS (the raw ui-smoke output).
// The work happens in a Chrome canvas, like the other tools here, so no
// image library is needed. Only rerun it when a capture changes.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const RACINE = path.join(__dirname, '..', '..');
const SHOTS = process.env.SERENITY_SHOTS || path.join(RACINE, '..', 'serenity-shots', 'final');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'images-'));

// [key, file, width in px, format]. Phones are 390 CSS px wide in the
// shots (780 px at 2x); 390 keeps them sharp at the size the plates show.
const LISTE = [
  ['logo', path.join(RACINE, 'docs', 'logo.png'), 128, 'jpeg'],
  ...[
    '01-bienvenue', '03-kit', '05-coffre', '06-fiche', '08b-codes', '08a-fiche-confiee', '09-fuites', '11-agent',
    '12-reglages', '13-deverrouillage', '15-hors-ligne',
  ].map((n) => [n, path.join(SHOTS, `${n}.png`), 390, 'jpeg']),
  ...[
    '18-bureau-coffre', '18b-bureau-palette', '20-bureau-agent', '20d-bureau-fuites', '22-bureau-reglages',
    '22b-bureau-import', '21-bureau-notifications', '26-clair-coffre', '27b-clair-fuites', '31-appli-coffre',
    '30-appli-connexion', '32-appli-palette',
  ].map((n) => [n, path.join(SHOTS, `${n}.png`), 960, 'jpeg']),
];

const sortie = {};
for (const [cle, fichier, largeur, format] of LISTE) {
  if (!fs.existsSync(fichier)) { console.log(`  absent : ${fichier}`); continue; }
  const b64 = fs.readFileSync(fichier).toString('base64');
  const page = path.join(temp, 'page.html');
  fs.writeFileSync(page, `<!doctype html><body><script>
const img = new Image();
img.onload = () => {
  const l = ${largeur}, h = Math.round(img.height * l / img.width);
  const c = document.createElement('canvas');
  c.width = l; c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(img, 0, 0, l, h);
  document.body.textContent = l + 'x' + h + ' ' + c.toDataURL('image/${format}', 0.84);
};
img.src = 'data:image/png;base64,${b64}';
</script></body>`);
  const dom = execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--virtual-time-budget=5000', '--dump-dom',
    'file:///' + page.split(path.sep).join('/')], { maxBuffer: 1 << 28 }).toString();
  const m = dom.match(/(\d+)x(\d+) (data:image\/[a-z]+;base64,[A-Za-z0-9+/=]+)/);
  sortie[cle] = { l: Number(m[1]), h: Number(m[2]), url: m[3] };
  console.log(`  ${cle.padEnd(24)} ${m[1]}x${m[2]}  ${(m[3].length / 1024).toFixed(0)} Ko`);
}
fs.writeFileSync(path.join(__dirname, 'schemas', 'images.json'), JSON.stringify(sortie) + '\n');

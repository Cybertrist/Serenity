// The animated diagrams of the README.
//
// SVG rather than GIF: a few dozen kilobytes, sharp at any size, and the
// text stays text. Animations are SMIL, which browsers play even when the
// SVG is loaded through an <img>, as GitHub does.
//
//   node docs/tools/anime.js               renders French, every diagram
//   LANGUE=en node docs/tools/anime.js     renders English
//   node docs/tools/anime.js zones codes   renders only these two
//
// Each diagram lives in its own file under schemas/. They share outils.js
// and call svg() themselves; images.json holds the logo and the
// screenshots, icones.json the app's Phosphor icons. Files starting with
// an underscore are shared screens (_ecrans.js), not diagrams.
const fs = require('fs');
const path = require('path');

const LG = process.env.LANGUE === 'en' ? 'en' : 'fr';
const DOSSIER = path.join(__dirname, 'schemas');
const OUTILS = require(path.join(DOSSIER, 'outils.js'))(LG);
const choisis = process.argv.slice(2);
for (const f of fs.readdirSync(DOSSIER).filter((f) => f.endsWith('.js') && f !== 'outils.js' && !f.startsWith('_')).sort()) {
  if (choisis.length && !choisis.includes(f.replace(/\.js$/, ''))) continue;
  // A diagram that fails is reported without stopping the others, but the
  // run ends in failure so it cannot be missed.
  try {
    require(path.join(DOSSIER, f))(OUTILS);
  } catch (e) {
    console.error(`  ${f} : ${e.stack}`);
    process.exitCode = 1;
  }
}

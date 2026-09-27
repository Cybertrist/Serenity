#!/bin/bash
# The contents of the README: the "00" banner, then one tile per section,
# its icon, its number, its title. One image per tile, so each one can be a
# link to its section: GitHub strips active HTML from READMEs, but keeps
# links wrapped around an image.
#
#   bash docs/tools/sommaire.sh            French, into docs/img/sommaire
#   LANGUE=en bash docs/tools/sommaire.sh  English, into docs/img/en/sommaire
#
# Titles are Space Grotesk, numbers JetBrains Mono: Syne only ever draws
# the capital titles of the section banners.
D="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$D/langue.sh"
source "$D/bandeaux.sh" >/dev/null 2>&1
CH="${CHROME:-/c/Program Files/Google/Chrome/Application/chrome.exe}"
B="$(cd "$D" && pwd -W 2>/dev/null || pwd)"
A="#3B82F6"
DEST="$D/../img"; [ "$LG" = en ] && DEST="$D/../img/en"
mkdir -p "$D/html$SUF" "$DEST/sommaire" "$DEST/sections"

# The banner, from the same template as the others.
sec serenity "$A" "00" "$(t 'Sommaire' 'Contents')"
cp "$D/sec$SUF/r-serenity-00.png" "$DEST/sections/s00.png"

# tuile <number> <Material Symbols icon> <title>
tuile () {
cat > "$D/html$SUF/sommaire-$1.html" <<HTML
<!doctype html><html lang="$LG"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600&family=JetBrains+Mono:wght@500&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,500,1,0&display=block" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:250px;height:64px;overflow:hidden;background:transparent}
.c{width:250px;height:64px;display:flex;align-items:center;gap:13px;padding:0 14px;
   background:#131A24;border:1px solid #1F2833;border-radius:14px}
.ic{font-family:'Material Symbols Rounded';font-size:22px;width:38px;height:38px;flex-shrink:0;border-radius:11px;
    display:flex;align-items:center;justify-content:center;color:#82B1FF;
    background:color-mix(in srgb,$A 12%,#131A24);border:1px solid color-mix(in srgb,$A 32%,#131A24);
    box-shadow:0 0 16px color-mix(in srgb,$A 16%,transparent)}
.n{font-family:'JetBrains Mono',monospace;font-size:11px;color:color-mix(in srgb,$A 75%,#131A24);letter-spacing:1px}
h3{font-family:'Space Grotesk',sans-serif;font-size:14.5px;font-weight:600;line-height:1.2;margin-top:2px;color:#F0F4F8;white-space:nowrap}
</style></head><body>
<div class="c"><span class="ic">$2</span><div><div class="n">$1</div><h3>$3</h3></div></div>
</body></html>
HTML
"$CH" --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=10000 \
  --force-device-scale-factor=2 --default-background-color=00000000 --window-size=250,64 \
  --screenshot="$B/html$SUF/sommaire-$1.png" "file:///$B/html$SUF/sommaire-$1.html" >/dev/null 2>&1
cp "$D/html$SUF/sommaire-$1.png" "$DEST/sommaire/$1.png"
}

tuile 01 auto_awesome "$(t 'Fonctionnalités' 'Features')"
tuile 02 devices "$(t 'Les écrans' 'The screens')"
tuile 03 download "$(t 'Installer' 'Install')"
tuile 04 shield "$(t 'Le coffre à deux zones' 'A vault, two zones')"
tuile 05 key "$(t 'La cryptographie' 'Cryptography')"
tuile 06 login "$(t 'Connexion et kit' 'Sign-in and kit')"
tuile 07 radar "$(t 'La veille des fuites' 'Breach watch')"
tuile 08 smart_toy "$(t "L'agent" 'The agent')"
tuile 09 autorenew "$(t 'La rotation' 'Rotation')"
tuile 10 power_settings_new "$(t 'Les garde-fous' 'Guardrails')"
tuile 11 pin "$(t 'Codes et import' 'Codes and import')"
tuile 12 backup "$(t 'La sauvegarde' 'Backups')"
tuile 13 account_tree "$(t 'Architecture' 'Architecture')"
tuile 14 task_alt "$(t 'Les tests' 'The tests')"
tuile 15 history "$(t 'Versions et licence' 'Versions, licence')"
echo "  sommaire : bandeau et 15 tuiles ($LG)"

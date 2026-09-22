#!/bin/bash
# The two language pills shown at the top of each page.
#
# GitHub strips JavaScript and CSS from READMEs, so nothing can switch the
# page in place. These are two links to two files, drawn to read as a
# selector. The current language is lit in the profile accent, the other
# one dimmed, reusing the grey cartouche of the project cards.
#
# Their background is opaque: GitHub renders READMEs on white as well as
# black, and a selector that vanishes on one of them is useless.
D="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; mkdir -p "$D/html" "$D/langues"
CH="${CHROME:-/c/Program Files/Google/Chrome/Application/chrome.exe}"
B="$(cd "$D" && pwd -W 2>/dev/null || pwd)"

W=300; H=96

# pastille <clé> <libellé> <allumée|éteinte>
pastille () {
local pt ct bd fd
if [ "$3" = allumee ]; then
  pt='<i></i>'; ct='#F0F4F8'; bd='#4A2029'; fd='#160A0E'
else
  pt='';        ct='#7C8894'; bd='#2A333D';             fd='#0C1117'
fi
cat > "$D/html/lg-$1.html" <<HTML
<!doctype html><html lang="fr"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:transparent}
.w{width:${W}px;height:${H}px;display:flex;align-items:center;justify-content:center}
.p{display:flex;align-items:center;gap:11px;height:54px;padding:0 26px;
   border-radius:9px;border:1.5px solid $bd;background:$fd}
.p b{font-family:'JetBrains Mono',monospace;font-weight:500;font-size:19px;
     letter-spacing:3.2px;color:$ct;white-space:nowrap}
/* Le point n'est là que sur la langue affichée : il dit « vous êtes ici »
   sans avoir à l'écrire, et laisse l'autre pastille lisible comme un lien. */
.p i{width:8px;height:8px;border-radius:2px;background:#E23B4E;
     transform:rotate(45deg);flex-shrink:0}
</style></head><body><div class="w"><div class="p">$pt<b>$2</b></div></div></body></html>
HTML
"$CH" --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=10000 \
  --force-device-scale-factor=3 --default-background-color=00000000 \
  --screenshot="$B/langues/$1.png" --window-size=$W,$H "file:///$B/html/lg-$1.html" >/dev/null 2>&1
echo "  $1.png  à afficher sur 150 px"
}

pastille fr-on  "FRANÇAIS" allumee
pastille fr-off "FRANÇAIS" eteinte
pastille en-on  "ENGLISH"  allumee
pastille en-off "ENGLISH"  eteinte

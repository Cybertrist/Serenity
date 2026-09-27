#!/bin/bash
# Copies the freshly rendered fixed figures into docs/img/.
# LANGUE=fr (the default) writes to docs/img/, LANGUE=en to docs/img/en/.
# The animated diagrams are written straight into place by anime.js, the
# contents tiles by sommaire.sh.
#
# The banner is kept as it is unless BANNIERE=1.
D="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; cd "$D"
source "$D/langue.sh"
DEST="../img"; [ "$LG" = en ] && DEST="../img/en"
mkdir -p "$DEST/sections"
n=0
pose () { [ -f "$1" ] || { echo "  manquant : $1"; return; }; cp "$1" "$DEST/$2"; n=$((n+1)); }

[ "$BANNIERE" = 1 ] && pose "png$SUF/f-serenity.png" banniere.png
for i in $(seq -w 1 15); do pose "sec$SUF/r-serenity-$i.png" "sections/s$i.png"; done
pose "png$SUF/telecharger-windows.png" telecharger-windows.png
pose "png$SUF/telecharger-linux.png"   telecharger-linux.png

# The language pills do not depend on the language: both pages point to
# the same files.
if [ "$LG" != en ]; then
  mkdir -p "../langues"
  for k in fr-on fr-off en-on en-off; do
    [ -f "langues/$k.png" ] && { cp "langues/$k.png" "../langues/$k.png"; n=$((n+1)); }
  done
fi
echo "  $n images posées dans ${DEST#../}"

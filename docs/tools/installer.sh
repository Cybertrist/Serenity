#!/bin/bash
# Copies the freshly rendered figures into docs/img/.
# LANGUE=fr (the default) writes to docs/img/, LANGUE=en to docs/img/en/.
D="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; cd "$D"
source "$D/langue.sh"
DEST="../img"; [ "$LG" = en ] && DEST="../img/en"
mkdir -p "$DEST/sections" "$DEST/schemas"
n=0
pose () { [ -f "$1" ] || { echo "  manquant : $1"; return; }; cp "$1" "$DEST/$2"; n=$((n+1)); }

for i in 01 02 03 04 05 06; do pose "sec$SUF/r-serenity-$i.png" "sections/s$i.png"; done
pose "flow$SUF/sere-agent.png"    schemas/agent.png
pose "grid$SUF/sere-v1.png"       schemas/v1.png
pose "grid$SUF/sere-chiffres.png" schemas/chiffres.png
pose "sere$SUF/coffre.png"        schemas/coffre.png

# Les pastilles de langue ne dépendent pas de la langue : les deux pages
# pointent sur les mêmes fichiers.
if [ "$LG" != en ]; then
  mkdir -p "../langues"
  for k in fr-on fr-off en-on en-off; do
    [ -f "langues/$k.png" ] && { cp "langues/$k.png" "../langues/$k.png"; n=$((n+1)); }
  done
fi
echo "  $n images posées dans ${DEST#../}"

#!/bin/bash
# Language switch, shared by every rendering script.
#
# LANGUE=fr (the default) renders the French README into sec/, grid/,
# flow/ and sere/. LANGUE=en renders English into the same folders with an
# -en suffix. installer.sh then drops one set into docs/img/ and the other
# into docs/img/en/.
#
# t <french> <english> picks the string. Every piece of text therefore
# lives in one place, with both versions side by side: correcting one
# without seeing the other is impossible.
LG="${LANGUE:-fr}"
SUF=""; [ "$LG" = en ] && SUF="-en"
t () { if [ "$LG" = en ]; then printf '%s' "$2"; else printf '%s' "$1"; fi; }

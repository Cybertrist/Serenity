#!/bin/bash
# The fixed figures of the README: the banner and the fifteen numbered
# section banners. The animated diagrams are SVG, drawn by anime.js; the
# contents banner and its fifteen tiles by sommaire.sh.
#
# Each string carries both languages, t <french> <english>. The English is
# not a calque: a turn of phrase that lands in French falls flat translated
# word for word, so it is rewritten.
#
# The banner is rendered here but only installed with BANNIERE=1: the one
# in docs/img/ is kept as it is.
D="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$D/cartes.sh"   >/dev/null 2>&1
source "$D/bandeaux.sh" >/dev/null 2>&1

# The one accent of the page: the blue of the logotype and of the banner.
AC="#3B82F6"

# ------------------------------------------------------------ the banner
# Same card template as the other projects. The neon frame of the logo
# fills only 87 % of the file, and its stroke shrunk to the plate size
# would come out jagged: the logo is framed past its edge, at 176 px, and
# the outline is redrawn in CSS.
ban serenity "#4D8EF7" "#E8434B" "#050A18" \
"<div class='crop' style='border:1.5px solid #4D8EF7C0;box-shadow:0 0 7px #4D8EF730, 0 12px 34px rgba(0,0,0,.5)'><img src='file:///$B/../logo.png' style='width:176px;height:176px'></div>" \
'Seren<em>ity</em>' \
"$(t 'Ton coffre de mots de passe, chez toi. Un agent surveille' 'Your password vault, hosted at home. An agent watches')" \
"$(t 'les fuites, et change ceux que tu lui confies.' 'for breaches, and rotates the ones you trust it with.')" \
"$(P "$(t 'ZÉRO CONNAISSANCE' 'ZERO KNOWLEDGE')" 'LIBSODIUM' "$(t 'AUTO-HÉBERGÉ' 'SELF-HOSTED')" 'AGPL V3')" \
"$(C 'WEB' 'MOBILE' "$(t 'SÉCURITÉ' 'SECURITY')")" ""

# --------------------------------------------------- the section banners
# Syne draws these titles in capitals: no digit in them, Syne's are poor.
rep serenity "$AC" \
"$(t 'Fonctionnalités' 'Features')" \
"$(t 'Les écrans' 'The screens')" \
"$(t 'Installer' 'Install')" \
"$(t 'Le coffre à deux zones' 'A vault with two zones')" \
"$(t 'La cryptographie' 'Cryptography')" \
"$(t 'Connexion et kit' 'Sign-in and recovery kit')" \
"$(t 'La veille des fuites' 'Breach watch')" \
"$(t "L'agent" 'The agent')" \
"$(t 'La rotation' 'Rotation')" \
"$(t 'Les garde-fous' 'Guardrails')" \
"$(t 'Codes et import' 'Codes and import')" \
"$(t 'La sauvegarde' 'Backups')" \
"$(t 'Architecture' 'Architecture')" \
"$(t 'Les tests' 'The tests')" \
"$(t 'Versions et licence' 'Versions and licence')"

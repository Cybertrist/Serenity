#!/bin/bash
# The two buttons of the "Install" section: the desktop app for Windows,
# and for Linux.
#
# An image and not a real button: GitHub strips CSS from READMEs. Each one
# sits in a link to the latest Release, whose address never changes from
# one version to the next. Only the version on the button follows, read in
# desktop/package.json.
#
# Opaque, only the rounded corners are transparent: GitHub renders READMEs
# on white as well as on black. Titles in Space Grotesk, details in
# JetBrains Mono; Syne never draws lower case.
D="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$D/langue.sh"
mkdir -p "$D/html$SUF" "$D/png$SUF"
CH="${CHROME:-/c/Program Files/Google/Chrome/Application/chrome.exe}"
B="$(cd "$D" && pwd -W 2>/dev/null || pwd)"
VERSION="$(grep -m1 '"version"' "$D/../../desktop/package.json" | sed 's/.*: *"\(.*\)".*/\1/')"

# bouton <key> <title> <details> <svg of the system mark>
bouton () {
W=720; H=132
cat > "$D/html$SUF/telecharger-$1.html" <<HTML
<!doctype html><html lang="$LG"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:transparent}
.w{width:${W}px;height:${H}px;display:flex;align-items:center;gap:22px;padding:0 30px 0 22px;
   border-radius:18px;border:1.5px solid #1F3558;
   background:linear-gradient(100deg,#0E1830 0%,#0B1222 55%,#090E19 100%)}
.i{width:84px;height:84px;border-radius:20px;overflow:hidden;flex-shrink:0;
   box-shadow:0 10px 28px -8px rgba(59,130,246,.55)}
.i img{width:100%;height:100%;object-fit:cover}
.t{flex:1;display:flex;flex-direction:column;gap:9px}
.t b{font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:25px;color:#F0F4F8;white-space:nowrap}
.t span{font-family:'JetBrains Mono',monospace;font-size:14px;color:#9AA5B1;letter-spacing:.3px;white-space:nowrap}
.f{width:58px;height:58px;border-radius:16px;flex-shrink:0;display:flex;align-items:center;justify-content:center;
   background:linear-gradient(180deg,#3F87F8,#2C6CE4)}
</style></head><body><div class="w">
  <div class="i"><img src="file:///$B/../logo.png"></div>
  <div class="t"><b>$2</b><span>$3</span></div>
  <div class="f"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF"
       stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 4v12"/><path d="M6 11l6 6 6-6"/><path d="M5 21h14"/></svg></div>
</div></body></html>
HTML
"$CH" --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=10000 \
  --force-device-scale-factor=2 --default-background-color=00000000 --window-size=$W,$H \
  --screenshot="$B/png$SUF/telecharger-$1.png" "file:///$B/html$SUF/telecharger-$1.html" >/dev/null 2>&1
echo "  telecharger-$1.png  à afficher sur 360 px"
}

bouton windows "$(t 'Serenity pour Windows' 'Serenity for Windows')" "v$VERSION · $(t 'installateur ou portable' 'installer or portable') .exe"
bouton linux "$(t 'Serenity pour Linux' 'Serenity for Linux')" "v$VERSION · .AppImage $(t 'ou' 'or') .deb"

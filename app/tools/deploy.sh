#!/usr/bin/env bash
# Round 62: put the built app (../next) at the site root. The old single-file app is kept at old/ (never removed).
# Keeps config.js (Supabase settings) and schema.sql. Run from the repository root:  bash app/tools/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
[ -f next/index.html ] || { echo "Build first: (cd app && npm run build)"; exit 1; }
if [ ! -f old/index.html ]; then
  mkdir -p old
  cp index.html old/index.html
  cp sw.js old/sw.js 2>/dev/null || true
  for f in manifest.webmanifest favicon.ico favicon-16.png favicon-32.png favicon-48.png icon-180.png icon-192.png icon-512.png icon-maskable-512.png; do [ -f "$f" ] && cp "$f" old/ || true; done
fi
cp config.js old/config.js
rm -rf assets
cp -r next/assets assets
for f in index.html sw.js manifest.webmanifest fil.jpg gly.jpg favicon-32.png icon-180.png icon-192.png icon-512.png icon-maskable-512.png; do cp "next/$f" "$f"; done
touch .nojekyll
echo "Deployed the new app to the site root (old app kept at old/index.html)."

#!/usr/bin/env bash
# Publica o App do Capitão como um site SEPARADO no GitHub Pages.
#   Resultado: https://<OWNER>.github.io/copa-capitao/
# Requer: gh CLI autenticado (gh auth login) e .env com as chaves VITE_SUPABASE_*.
set -euo pipefail

OWNER="${OWNER:-lucastssantos-hub}"
REPO="${REPO:-copa-capitao}"
HERE="$(cd "$(dirname "$0")/.." && pwd)"
cd "$HERE"

echo "▶ Build do app do Capitão (base /$REPO/)…"
npm run build:capitao
touch dist-capitao/.nojekyll

echo "▶ Garantindo credencial git via gh…"
gh auth setup-git >/dev/null 2>&1 || true

echo "▶ Garantindo repositório $OWNER/$REPO…"
if ! gh repo view "$OWNER/$REPO" >/dev/null 2>&1; then
  gh repo create "$OWNER/$REPO" --public -d "App do Capitão — Copa do Mundo de Beach Tennis"
fi

echo "▶ Publicando dist-capitao na branch gh-pages…"
TMP="$(mktemp -d)"
cp -R dist-capitao/. "$TMP/"
cd "$TMP"
git init -q
git checkout -qB gh-pages
git add -A
git -c user.email="deploy@local" -c user.name="deploy" commit -qm "deploy capitao $(date +%F-%H%M%S)"
git push -fq "https://github.com/$OWNER/$REPO.git" gh-pages
cd "$HERE"
rm -rf "$TMP"

echo "▶ Habilitando GitHub Pages (branch gh-pages)…"
gh api -X POST "repos/$OWNER/$REPO/pages" -f "source[branch]=gh-pages" -f "source[path]=/" >/dev/null 2>&1 \
  || gh api -X PUT "repos/$OWNER/$REPO/pages" -f "source[branch]=gh-pages" -f "source[path]=/" >/dev/null 2>&1 \
  || true

echo ""
echo "✅ App do Capitão publicado em:"
echo "   https://$OWNER.github.io/$REPO/"
echo "   (pode levar ~1 min no primeiro deploy)"

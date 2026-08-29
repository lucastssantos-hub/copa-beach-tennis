#!/usr/bin/env bash
# Publica o App do Capitão como um site SEPARADO no GitHub Pages.
#   Resultado: https://<OWNER>.github.io/copa-capitao/
# Requer: gh CLI autenticado (gh auth login) e .env com as chaves VITE_SUPABASE_*.
set -euo pipefail

OWNER="${OWNER:-lucastssantos-hub}"
REPO="${REPO:-copa-capitao}"
HERE="$(cd "$(dirname "$0")/.." && pwd)"
cd "$HERE"

# ---------------------------------------------------------------------------
# TRAVA DE SEGURANÇA (27/08/2026)
# Este script builda APP=capitao, que o vite.config.js aponta para
# legacy-capitao.html -> src/main.capitao.jsx, ou seja, o app LEGADO.
# Mas o site publicado em github.io/copa-capitao/ é o app REACT novo
# (contém verify_captain_login, react-router, "Dupla feminina" e CSS;
# o build legado não tem nada disso e sai 231 kB contra 434 kB).
# Como o último passo é `git push -f`, rodar isto hoje SUBSTITUI o app dos
# capitães pelo legado, sem CSS e com outro login — no meio do evento.
# Conserto pendente: apontar APP=capitao para index.html (src/main.tsx) com
# base /copa-capitao/ e uma rota "/" que caia direto na tela do Capitão.
# Até lá, use https://lucastssantos-hub.github.io/copa-beach-tennis/capitao/
# ---------------------------------------------------------------------------
if [ "${ALLOW_LEGACY_CAPITAO_DEPLOY:-}" != "1" ]; then
  echo "✋ ABORTADO: este script publicaria o app LEGADO do capitão por cima do app React que está no ar." >&2
  echo "   Veja o bloco 'TRAVA DE SEGURANÇA' neste arquivo e a seção 2 do DEPLOY.md." >&2
  echo "   Se você já corrigiu o vite.config.js e sabe o que está fazendo:" >&2
  echo "     ALLOW_LEGACY_CAPITAO_DEPLOY=1 npm run deploy:capitao" >&2
  exit 1
fi

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

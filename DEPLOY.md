# Publicação — dois links separados (GitHub Pages)

São **dois sites independentes**, sincronizados entre dispositivos pelo **Supabase**:

| App | Repositório | Link |
|---|---|---|
| **Organização** (ADM + Mesário + Público) | `lucastssantos-hub/copa-beach-tennis` (atual) | https://lucastssantos-hub.github.io/copa-beach-tennis/ |
| **Capitão** (isolado, seleção de equipe) | `lucastssantos-hub/copa-capitao` (novo) | https://lucastssantos-hub.github.io/copa-capitao/ |

O capitão acessa **só** o link do Capitão — sem nenhum caminho para o ADM.

## Pré-requisitos
- `gh` CLI autenticado (`gh auth login`).
- `.env` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (já presente).
- No repo `copa-beach-tennis`, o secret de Actions `VITE_SUPABASE_ANON_KEY` (já configurado).

> A *anon key* do Supabase é pública por design (protegida por RLS); pode ir no bundle.

## 1) Publicar a Organização (ADM)
O repo já tem GitHub Pages via Actions (`.github/workflows/deploy-pages.yml`).
Basta enviar o código novo para `main`:

```bash
git add -A
git commit -m "Central operacional: 4 perfis, status, ops center, app do capitão separado"
git push origin main
```
O Actions builda (`npm run build` → `dist`, base `/copa-beach-tennis/`) e publica.

## 2) Publicar o Capitão (link separado) — ⚠️ QUEBRADO, NÃO RODE

`npm run deploy:capitao` está **travado de propósito** (27/08/2026). Ele publicaria
o app **errado** por cima do que os capitães usam.

**O que aconteceu:** `vite.config.js` faz `APP=capitao` buildar `legacy-capitao.html`
→ `src/main.capitao.jsx` → `captainApp.jsx`, o app **legado**. Mas o site que está no
ar em `copa-capitao` é o app **React** (`src/main.tsx` → `src/pages/Capitao.tsx`).
Comparação dos bundles:

| Marcador | Build de `APP=capitao` | Publicado em copa-capitao |
|---|---|---|
| `verify_captain_login` (login atual) | ✗ | ✓ |
| `react-router` | ✗ | ✓ |
| `Dupla feminina` (tela atual) | ✗ | ✓ |
| arquivo CSS | ✗ nenhum | ✓ |
| tamanho | 231 kB | 434 kB |

Como o script termina em `git push -f`, rodá-lo troca o app dos capitães pelo legado,
sem CSS e com outro login. A trava está em `scripts/deploy-capitao.sh`.

**Enquanto não for consertado**, o link do capitão é a rota dentro do app da
organização, que sai no deploy normal do passo 1 e está sempre atualizada:

    https://lucastssantos-hub.github.io/copa-beach-tennis/capitao/

**Conserto pendente:** apontar `APP=capitao` para `index.html` (`src/main.tsx`) com
base `/copa-capitao/`, e fazer a rota `/` cair direto na tela do Capitão (hoje o
catch-all do `main.tsx` renderiza `Home`). Depois de testado, remover a trava.

O bundle publicado hoje em `copa-capitao` também está algumas versões atrás — não
contém `athlete_registrations`, então é anterior a "Restringe escalação por equipe
e categoria".

## 3) Zerar os dados para o evento real
A primeira vez, o estado no Supabase pode conter dados de teste. Para começar limpo:
- Abra a **Organização**, clique no botão **↺** (topo direito) → regenera o cenário e grava no Supabase.
- Todos os dispositivos passam a ver o mesmo estado em ~5s (polling).

## Como o sync funciona (e limites atuais)
- Cada app **lê** o Supabase ao abrir e **a cada 5s** (polling) → mudanças de um dispositivo aparecem no outro.
- Cada app **grava** (debounce 500ms) quando muda algo localmente.
- Modelo de gravação = **blob único** (`app_state`), última escrita vence. Em edições simultâneas muito próximas (mesmos segundos) há risco pequeno de sobrescrita. Para um evento grande, o próximo passo é gravação por confronto + realtime (Supabase Realtime). Hoje é suficiente para operação normal.
- Notificações/auditoria são **por dispositivo** (não sincronizam); o **status** do confronto (a informação crítica) sincroniza e aparece colorido no Centro de Operações.

# Copa do Mundo de Beach Tennis

App web mobile-first para organizar um torneio de beach tennis por equipes/países, com painel da organização, painel do capitão e telão público.

**Stack:** React + Vite · TypeScript · Tailwind CSS · Supabase

## Rotas

| Rota | Descrição |
|---|---|
| `/` | Página inicial com links para os três painéis |
| `/org` | Painel da organização (abas OPS, CONF, CLASS, NOTIF, AUDIT, CFG) |
| `/capitao` | Painel do capitão (login por equipe + código de acesso, escalação, presença) |
| `/telao` | Página pública: quadras ao vivo, jogos, próximos confrontos e resultados |

> O app legado (versão anterior, baseada em blob `app_state`) foi preservado e continua acessível em `/legacy.html`.

## 1. Instalar dependências

```bash
npm install
```

## 2. Configurar o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Copie o arquivo de exemplo e preencha com a URL e a anon key do projeto (Project Settings → API):

```bash
cp .env.example .env
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
```

O app roda mesmo sem o `.env` preenchido — as telas mostram estados vazios e um aviso de configuração pendente.

## 3. Rodar o schema.sql

No painel do Supabase, abra **SQL Editor → New query**, cole o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e execute.

O script é idempotente (pode rodar mais de uma vez) e cria:

- Tabelas: `teams`, `categories`, `matches`, `lineups`, `presence`, `courts`, `results`, `notifications`, `audit_logs`
- Seed de categorias: A, B, C, D, E, 35+, 60+
- Seed de quadras: Quadra 1 a 13 (1–10 `Livre`, 11–13 `Escape`)
- RLS com políticas permissivas (v1 — serão restringidas em fases futuras)

### Cadastrar uma equipe para testar o login do capitão

```sql
insert into teams (team_name, country, abbreviation, flag, captain_name, access_code)
values ('Brasil', 'Brasil', 'BRA', '🇧🇷', 'Capitã Ana', '1234');
```

No `/capitao`, entre com **Brasil** + código **1234**.

## 4. Iniciar o app localmente

```bash
npm run dev
```

Abra http://localhost:5174 e navegue para `/org`, `/capitao` e `/telao`.

## Fluxo do capitão (v1)

1. Login com nome da equipe (ou país) + código de acesso (tabela `teams`).
2. O painel lista os confrontos vinculados à equipe — toque em um para abrir o formulário de escalação.
3. **Enviar escalação** grava em `lineups` (`lineup_status = 'Enviada'`), cria uma notificação e um registro de auditoria.
4. **Estou pronto na arena** grava/atualiza `presence` (`captain_ready = true`), cria notificação e auditoria.

## Escopo desta versão

Esta é a base sólida do app (fase 1). Ainda **não** inclui: confirmação de presença pelo ADM, liberação de quadra, modo simultâneo, sugestão automática de simultâneos, mista condicional, geração automática de chaves e classificação automática — essas funcionalidades virão em fases separadas.

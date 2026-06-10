-- ============================================================
-- Copa do Mundo de Beach Tennis — Schema v1
-- Rode este arquivo no SQL Editor do Supabase.
-- Idempotente: pode ser executado mais de uma vez sem duplicar dados.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- Equipes / Países
-- ------------------------------------------------------------
create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  team_name text not null,
  country text,
  abbreviation text,
  flag text,
  captain_name text,
  captain_phone text,
  -- access_code NÃO fica aqui: vive em team_access (fechada por RLS).
  status text default 'ativo',
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- ------------------------------------------------------------
-- Categorias
-- ------------------------------------------------------------
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  category_name text not null,
  event_day text,
  start_time text,
  end_time text,
  status text default 'ativa',
  created_at timestamp default now(),
  updated_at timestamp default now()
);

insert into categories (category_name)
select c from (values ('A'), ('B'), ('C'), ('D'), ('E'), ('35+'), ('60+')) as v(c)
where not exists (select 1 from categories where category_name = v.c);

-- ------------------------------------------------------------
-- Atletas (elenco por seleção — seletor de escalação do capitão)
-- ------------------------------------------------------------
create table if not exists athletes (
  id uuid primary key default gen_random_uuid(),
  team_id uuid,
  team_name text,
  athlete_name text not null,
  gender text not null check (gender in ('Feminino', 'Masculino')),
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- ------------------------------------------------------------
-- Confrontos
-- ------------------------------------------------------------
create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  category_id uuid,
  category_name text,
  group_or_phase text,
  round text,
  team_a_id uuid,
  team_a_name text,
  team_a_abbreviation text,
  team_a_flag text,
  team_b_id uuid,
  team_b_name text,
  team_b_abbreviation text,
  team_b_flag text,
  scheduled_time text,
  court text,
  match_status text default 'Aguardando escalação',
  score_team_a integer default 0,
  score_team_b integer default 0,
  match_mode text default 'Sequencial',
  mixed_required boolean default false,
  contest_reason text,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Status possíveis de match_status:
--   Aguardando escalação | Escalação parcial | Escalações recebidas
--   Aguardando presença | Pronto para quadra | Liberado para quadra
--   Em andamento | Resultado pendente | Finalizado
--   Resultado contestado | W.O. | Desistência  (fase 3)

-- ------------------------------------------------------------
-- Escalações
-- ------------------------------------------------------------
create table if not exists lineups (
  id uuid primary key default gen_random_uuid(),
  match_id uuid,
  category_name text,
  round text,
  team_id uuid,
  team_name text,
  captain_name text,
  female_player_1 text,
  female_player_2 text,
  male_player_1 text,
  male_player_2 text,
  mixed_player_1 text,
  mixed_player_2 text,
  lineup_status text default 'Pendente',
  submitted_at timestamp,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- ------------------------------------------------------------
-- Presença na arena
-- ------------------------------------------------------------
create table if not exists presence (
  id uuid primary key default gen_random_uuid(),
  match_id uuid,
  team_id uuid,
  team_name text,
  captain_ready boolean default false,
  ready_at timestamp,
  admin_confirmed boolean default false,
  confirmed_at timestamp,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- ------------------------------------------------------------
-- Quadras
-- ------------------------------------------------------------
create table if not exists courts (
  id uuid primary key default gen_random_uuid(),
  court_number integer not null,
  court_status text default 'Livre',
  current_match_id uuid,
  current_match_label text,
  current_game text,
  next_action text,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Quadras 1 a 10: Livre | Quadras 11 a 13: Escape
insert into courts (court_number, court_status)
select n, case when n <= 10 then 'Livre' else 'Escape' end
from generate_series(1, 13) as n
where not exists (select 1 from courts where court_number = n);

-- ------------------------------------------------------------
-- Resultados (game_type: Feminino | Masculino | Mista)
-- ------------------------------------------------------------
create table if not exists results (
  id uuid primary key default gen_random_uuid(),
  match_id uuid,
  game_type text,
  winner_team_id uuid,
  winner_team_name text,
  score text,
  result_status text default 'Pendente',
  submitted_by text,
  checked_by text,
  finished_at timestamp,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- ------------------------------------------------------------
-- Notificações
-- ------------------------------------------------------------
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  notification_type text,
  message text,
  team_id uuid,
  team_name text,
  match_id uuid,
  created_at timestamp default now()
);

-- ------------------------------------------------------------
-- Auditoria
-- ------------------------------------------------------------
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor text,
  action text,
  entity text,
  details text,
  created_at timestamp default now()
);

-- ------------------------------------------------------------
-- RLS — v1: políticas permissivas (acesso via anon key).
-- Em fases futuras as políticas serão restringidas por perfil.
-- ------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['teams','categories','athletes','matches','lineups','presence','courts','results','notifications','audit_logs']
  loop
    execute format('alter table %I enable row level security', t);
    if not exists (
      select 1 from pg_policies where tablename = t and policyname = 'v1_allow_all'
    ) then
      execute format(
        'create policy v1_allow_all on %I for all using (true) with check (true)', t
      );
    end if;
  end loop;
end $$;

-- ------------------------------------------------------------
-- Códigos de acesso dos capitães — NUNCA expostos à anon key.
-- A tabela team_access (mesma do app legado) é a única fonte dos
-- códigos: RLS ligada SEM policies + revoke. O login só passa pela
-- RPC verify_captain_login (SECURITY DEFINER) abaixo.
-- ------------------------------------------------------------
create table if not exists public.team_access (
  team_code text primary key,
  access_code text not null,
  updated_at timestamptz not null default now()
);

create unique index if not exists team_access_access_code_key
  on public.team_access (access_code);

alter table public.team_access enable row level security;
-- Sem policies de propósito: anon nunca lê/escreve a tabela direto.
revoke all on table public.team_access from anon, authenticated;

-- Migra códigos antigos de teams.access_code (se a coluna ainda
-- existir) para team_access e remove a coluna da tabela pública.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'teams' and column_name = 'access_code'
  ) then
    insert into public.team_access (team_code, access_code)
    select t.abbreviation, t.access_code
    from public.teams t
    where t.abbreviation is not null and t.access_code is not null
    on conflict (team_code) do update
      set access_code = excluded.access_code, updated_at = now();

    alter table public.teams drop column access_code;
  end if;
end $$;

-- Login do capitão: valida equipe + código e devolve a linha de teams
-- (que já não contém código). Retorna vazio quando inválido.
create or replace function public.verify_captain_login(p_query text, p_code text)
returns setof public.teams
language sql
stable
security definer
set search_path = public
as $$
  select t.*
  from public.teams t
  join public.team_access ta on ta.team_code = t.abbreviation
  where ta.access_code = btrim(p_code)
    and (t.team_name ilike '%' || btrim(p_query) || '%'
         or t.country ilike '%' || btrim(p_query) || '%')
  limit 1;
$$;

revoke all on function public.verify_captain_login(text, text) from public;
grant execute on function public.verify_captain_login(text, text) to anon;

-- Login do Capitão por código de acesso.
-- Cada linha de team_access mapeia um código para uma equipe. O capitão digita o
-- código no app; uma RPC resolve o código para o código da equipe SEM expor a
-- tabela ao anon key (a tabela fica fechada por RLS; só a função lê).

create table if not exists public.team_access (
  team_code text primary key,
  access_code text not null,
  updated_at timestamptz not null default now()
);

-- Código de acesso é único (e dá lookup rápido por código).
create unique index if not exists team_access_access_code_key
  on public.team_access (access_code);

alter table public.team_access enable row level security;
-- Sem policies para anon de propósito: a tabela nunca é lida/escrita diretamente
-- pela anon key pública. O capitão resolve o código só pela função abaixo.

-- Resolve um código de acesso para o código da equipe. SECURITY DEFINER para
-- conseguir ler team_access apesar do RLS; retorna null quando o código é inválido.
create or replace function public.verify_captain_code(p_code text)
returns text
language sql
security definer
set search_path = public
as $$
  select team_code
  from public.team_access
  where access_code = btrim(p_code)
  limit 1;
$$;

revoke all on function public.verify_captain_code(text) from public;
grant execute on function public.verify_captain_code(text) to anon;

-- Seed: Brasil para teste do login do capitão.
insert into public.team_access (team_code, access_code)
values ('BRA', '1234')
on conflict (team_code) do update
  set access_code = excluded.access_code, updated_at = now();

-- Segurança dos códigos de capitão.
-- Antes: teams.access_code era legível por qualquer pessoa via anon key
-- (política v1_allow_all + anon key pública no bundle do GitHub Pages).
-- Agora: os códigos vivem só em team_access (RLS sem policies + revoke)
-- e o login valida via RPC SECURITY DEFINER verify_captain_login.

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

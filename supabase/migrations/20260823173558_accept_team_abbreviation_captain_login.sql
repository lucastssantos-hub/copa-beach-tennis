-- A tela informa a sigla da seleção como login. A função anterior validava
-- apenas team_name/country, portanto códigos como PRY eram sempre rejeitados.
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
  where lower(ta.access_code) = lower(btrim(p_code))
    and (lower(btrim(t.abbreviation)) = lower(btrim(p_query))
         or t.team_name ilike '%' || btrim(p_query) || '%'
         or t.country ilike '%' || btrim(p_query) || '%')
  limit 1;
$$;

revoke all on function public.verify_captain_login(text, text) from public;
grant execute on function public.verify_captain_login(text, text) to anon;

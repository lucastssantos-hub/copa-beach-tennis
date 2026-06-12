-- Login do capitão insensível a acentos.
-- "Croacia" não encontrava "Croácia" (idem Canadá, Itália, Suécia,
-- Austrália) porque o ilike compara byte a byte os caracteres acentuados.
-- Normaliza os dois lados com unaccent antes de comparar.

create extension if not exists unaccent with schema extensions;

create or replace function public.verify_captain_login(p_query text, p_code text)
returns setof public.teams
language sql
stable
security definer
set search_path = public, extensions
as $$
  select t.*
  from public.teams t
  join public.team_access ta on ta.team_code = t.abbreviation
  where ta.access_code = btrim(p_code)
    and (unaccent(t.team_name) ilike '%' || unaccent(btrim(p_query)) || '%'
         or unaccent(t.country) ilike '%' || unaccent(btrim(p_query)) || '%')
  limit 1;
$$;

revoke all on function public.verify_captain_login(text, text) from public;
grant execute on function public.verify_captain_login(text, text) to anon;

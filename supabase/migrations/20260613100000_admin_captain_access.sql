-- Cadastro administrativo dos acessos de capitão.
-- team_access continua fechada por RLS; o ADM opera via RPC protegida pelo PIN.

create extension if not exists pgcrypto with schema extensions;

create or replace function public.assert_admin_pin(p_admin_pin text)
returns void
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
begin
  if encode(digest(coalesce(btrim(p_admin_pin), ''), 'sha256'), 'hex')
     <> '9dc5c9dfa3896f79f39f558c72787ea64454aaa5923dab56ed4282a117caec2f' then
    raise exception 'PIN do ADM inválido.' using errcode = '28000';
  end if;
end;
$$;

revoke all on function public.assert_admin_pin(text) from public;

create or replace function public.admin_list_captain_access(p_admin_pin text)
returns table (
  team_id uuid,
  team_name text,
  country text,
  abbreviation text,
  flag text,
  captain_name text,
  captain_phone text,
  team_status text,
  access_code text,
  access_updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
begin
  perform public.assert_admin_pin(p_admin_pin);

  return query
    select
      t.id as team_id,
      t.team_name,
      t.country,
      t.abbreviation,
      t.flag,
      t.captain_name,
      t.captain_phone,
      t.status as team_status,
      ta.access_code,
      ta.updated_at as access_updated_at
    from public.teams t
    left join public.team_access ta on ta.team_code = t.abbreviation
    order by t.team_name;
end;
$$;

revoke all on function public.admin_list_captain_access(text) from public;
grant execute on function public.admin_list_captain_access(text) to anon;

create or replace function public.admin_upsert_captain_access(
  p_admin_pin text,
  p_team_id uuid,
  p_access_code text,
  p_captain_name text default null,
  p_captain_phone text default null
)
returns void
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  v_team_code text;
  v_access_code text := nullif(btrim(coalesce(p_access_code, '')), '');
begin
  perform public.assert_admin_pin(p_admin_pin);

  select t.abbreviation
  into v_team_code
  from public.teams t
  where t.id = p_team_id;

  if v_team_code is null then
    raise exception 'Seleção não encontrada ou sem sigla.' using errcode = 'P0002';
  end if;

  update public.teams
  set
    captain_name = nullif(btrim(coalesce(p_captain_name, '')), ''),
    captain_phone = nullif(btrim(coalesce(p_captain_phone, '')), ''),
    updated_at = now()
  where id = p_team_id;

  if v_access_code is null then
    delete from public.team_access
    where team_code = v_team_code;
  else
    insert into public.team_access (team_code, access_code, updated_at)
    values (v_team_code, v_access_code, now())
    on conflict (team_code) do update
      set access_code = excluded.access_code,
          updated_at = now();
  end if;
end;
$$;

revoke all on function public.admin_upsert_captain_access(text, uuid, text, text, text) from public;
grant execute on function public.admin_upsert_captain_access(text, uuid, text, text, text) to anon;

-- Novo inscrito do Brasil na categoria D, conforme LetzPlay.
insert into public.athletes (team_id, team_name, athlete_name, gender)
select t.id, t.team_name, 'Luiz Lima', 'Masculino'
from public.teams t
where t.team_name = 'Brasil'
  and not exists (
    select 1
    from public.athlete_registrations ar
    where lower(trim(ar.letzplay_profile)) = lower('https://letzplay.me/LuizLima50')
  )
  and not exists (
    select 1
    from public.athletes a
    where a.team_id = t.id
      and lower(trim(a.athlete_name)) = lower('Luiz Lima')
  );

insert into public.athlete_registrations
  (athlete_id, team_id, team_name, category_name, letzplay_profile)
select
  a.id,
  t.id,
  t.team_name,
  'D',
  'https://letzplay.me/LuizLima50'
from public.athletes a
join public.teams t on t.team_name = 'Brasil'
where a.team_id = t.id
  and lower(trim(a.athlete_name)) = lower('Luiz Lima')
order by a.created_at, a.id
limit 1
on conflict (athlete_id, category_name) do update
set team_id = excluded.team_id,
    team_name = excluded.team_name,
    letzplay_profile = excluded.letzplay_profile,
    updated_at = now();

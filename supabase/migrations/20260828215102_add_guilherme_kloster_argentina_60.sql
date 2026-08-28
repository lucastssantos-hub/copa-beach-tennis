-- Inclui Guilherme Kloster na 60+ da Argentina e corrige a grafia do nome.
update public.athletes
set athlete_name = 'Guilherme Kloster', updated_at = now()
where id = '54ea8c15-0f0b-46d5-92d5-ca13f611002d';

insert into public.athlete_registrations
  (athlete_id, team_id, team_name, category_name, letzplay_profile)
select
  a.id,
  t.id,
  t.team_name,
  '60+',
  'https://letzplay.me/GuilhermeKloster'
from public.athletes a
join public.teams t on t.team_name = 'Argentina'
where a.team_id = t.id
  and lower(trim(a.athlete_name)) = lower('Guilherme Kloster')
order by a.created_at, a.id
limit 1
on conflict (athlete_id, category_name) do update
set team_id = excluded.team_id,
    team_name = excluded.team_name,
    letzplay_profile = excluded.letzplay_profile,
    updated_at = now();

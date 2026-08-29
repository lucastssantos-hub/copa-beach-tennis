-- Larissa voltou a constar no LetzPlay pelo Paraguai na categoria E.
insert into public.athlete_registrations
  (athlete_id, team_id, team_name, category_name, letzplay_profile)
select
  a.id,
  t.id,
  t.team_name,
  'E',
  'https://letzplay.me/LarissaBarbosa12'
from public.athletes a
join public.teams t on t.team_name = 'Paraguai'
where a.team_id = t.id
  and lower(trim(a.athlete_name)) = lower('Larissa Loyola Barbosa')
order by a.created_at, a.id
limit 1
on conflict (athlete_id, category_name) do update
set team_id = excluded.team_id,
    team_name = excluded.team_name,
    letzplay_profile = excluded.letzplay_profile,
    updated_at = now();

-- Inclui Laila Maria na 60+ de Cabo Verde sem alterar sua inscrição na D.
insert into public.athlete_registrations
  (athlete_id, team_id, team_name, category_name, letzplay_profile)
select
  a.id,
  t.id,
  t.team_name,
  '60+',
  'https://letzplay.me/LailaMaria'
from public.athletes a
join public.teams t on t.team_name = 'Cabo Verde'
where lower(trim(a.athlete_name)) = lower('Laila Maria')
  and a.team_id = t.id
order by a.created_at, a.id
limit 1
on conflict (athlete_id, category_name) do update
set team_id = excluded.team_id,
    team_name = excluded.team_name,
    letzplay_profile = excluded.letzplay_profile,
    updated_at = now();

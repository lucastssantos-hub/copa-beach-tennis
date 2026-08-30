-- Inclui Gabriela Duarte Milani de Holanda na categoria A de Cabo Verde.
insert into public.athlete_registrations
  (athlete_id, team_id, team_name, category_name, letzplay_profile)
select
  a.id,
  t.id,
  t.team_name,
  'A',
  'https://letzplay.me/places/circuito-equipes/members/3984409'
from public.teams t
join lateral (
  select candidate.id
  from public.athletes candidate
  where candidate.team_id = t.id
    and lower(trim(candidate.athlete_name)) = lower(trim('Gabriela Duarte Milani de Holanda'))
  order by candidate.created_at, candidate.id
  limit 1
) a on true
where t.team_name = 'Cabo Verde'
on conflict (athlete_id, category_name) do update
set team_id = excluded.team_id,
    team_name = excluded.team_name,
    letzplay_profile = excluded.letzplay_profile,
    updated_at = now();

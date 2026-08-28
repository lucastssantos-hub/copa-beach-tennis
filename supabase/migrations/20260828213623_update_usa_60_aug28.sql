-- Atualiza o elenco dos USA na 60+ conforme orientação da organização.
-- Remove apenas a inscrição na 60+; outras categorias permanecem intactas.
delete from public.athlete_registrations
where category_name = '60+'
  and team_name = 'USA'
  and lower(trim(letzplay_profile)) in (
    lower('https://letzplay.me/RafaelNadal7'),
    lower('https://letzplay.me/amnonpasetofelipe'),
    lower('https://letzplay.me/JoaoCalado3')
  );

with source(athlete_name, letzplay_profile) as (
  values
    ('Mayke Pereira Arruda', 'https://letzplay.me/MaykeArruda'),
    ('Matheus Henrique Malvezzi', 'https://letzplay.me/MatheusMalvezzi')
)
insert into public.athlete_registrations
  (athlete_id, team_id, team_name, category_name, letzplay_profile)
select a.id, t.id, t.team_name, '60+', s.letzplay_profile
from source s
join public.teams t on t.team_name = 'USA'
join lateral (
  select candidate.id
  from public.athletes candidate
  where candidate.team_id = t.id
    and lower(trim(candidate.athlete_name)) = lower(trim(s.athlete_name))
  order by candidate.created_at, candidate.id
  limit 1
) a on true
on conflict (athlete_id, category_name) do update
set team_id = excluded.team_id,
    team_name = excluded.team_name,
    letzplay_profile = excluded.letzplay_profile,
    updated_at = now();

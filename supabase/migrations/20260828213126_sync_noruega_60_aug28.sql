-- Inclui as novas inscricoes da Noruega na 60+ publicadas no LetzPlay em 28/08.
insert into public.athletes (team_id, team_name, athlete_name, gender)
select t.id, t.team_name, 'Josy Krominski Graça', 'Feminino'
from public.teams t
where t.team_name = 'Noruega'
  and not exists (
    select 1
    from public.athletes a
    where a.team_id = t.id
      and lower(trim(a.athlete_name)) = lower('Josy Krominski Graça')
  );

with source(athlete_name, letzplay_profile) as (
  values
    ('Josy Krominski Graça', 'https://letzplay.me/JosyGraca'),
    ('Renata Fernandes', 'https://letzplay.me/RenataFernandes89'),
    ('Armando Felix', 'https://letzplay.me/ArmandoFelix')
)
insert into public.athlete_registrations
  (athlete_id, team_id, team_name, category_name, letzplay_profile)
select a.id, t.id, t.team_name, '60+', s.letzplay_profile
from source s
join public.teams t on t.team_name = 'Noruega'
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

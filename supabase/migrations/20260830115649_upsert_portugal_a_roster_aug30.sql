-- Atualiza o elenco de Portugal na categoria A conforme inscrições do LetzPlay.
with source(athlete_name, gender) as (
  values
    ('Pedro Lucas', 'Masculino'),
    ('Bianca Mors', 'Feminino'),
    ('Filipe Gomes', 'Masculino'),
    ('Rafaela Cesco', 'Feminino'),
    ('Carolina Cicote Moreira', 'Feminino'),
    ('Izabeli Mazeli', 'Feminino'),
    ('Lucas Albanes', 'Masculino')
)
insert into public.athletes (team_id, team_name, athlete_name, gender)
select t.id, t.team_name, s.athlete_name, s.gender
from source s
join public.teams t on t.team_name = 'Portugal'
where not exists (
  select 1
  from public.athletes a
  where a.team_id = t.id
    and lower(trim(a.athlete_name)) = lower(trim(s.athlete_name))
);

with source(athlete_name, letzplay_profile) as (
  values
    ('Pedro Lucas', 'https://letzplay.me/places/circuito-equipes/members/3984940'),
    ('Bianca Mors', 'https://letzplay.me/places/circuito-equipes/members/3984361'),
    ('Filipe Gomes', 'https://letzplay.me/places/circuito-equipes/members/3604548'),
    ('Rafaela Cesco', 'https://letzplay.me/places/circuito-equipes/members/3623475'),
    ('Carolina Cicote Moreira', 'https://letzplay.me/places/circuito-equipes/members/4003739'),
    ('Izabeli Mazeli', 'https://letzplay.me/places/circuito-equipes/members/4002961'),
    ('Lucas Albanes', 'https://letzplay.me/places/circuito-equipes/members/4005095')
)
insert into public.athlete_registrations
  (athlete_id, team_id, team_name, category_name, letzplay_profile)
select a.id, t.id, t.team_name, 'A', s.letzplay_profile
from source s
join public.teams t on t.team_name = 'Portugal'
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

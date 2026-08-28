-- Inclui as novas inscricoes de Cabo Verde na 60+ publicadas em 28/08.
with source(athlete_name, gender) as (
  values
    ('Ryan Lucas', 'Masculino'),
    ('Nattasha Garcia Pereira Silva', 'Feminino')
)
insert into public.athletes (team_id, team_name, athlete_name, gender)
select t.id, t.team_name, s.athlete_name, s.gender
from source s
join public.teams t on t.team_name = 'Cabo Verde'
where not exists (
  select 1
  from public.athletes a
  where a.team_id = t.id
    and lower(trim(a.athlete_name)) = lower(trim(s.athlete_name))
);

with source(athlete_name, letzplay_profile) as (
  values
    ('Ryan Lucas', 'https://letzplay.me/RyanLucas'),
    ('Luiz Lepri Jr', 'https://letzplay.me/Luizleprijr'),
    ('Gabriela Duarte Milani de Holanda', 'https://letzplay.me/GabrielaDuarteHolanda'),
    ('Ubiara Rubio Engler', 'https://letzplay.me/UbiaraEngler'),
    ('Nattasha Garcia Pereira Silva', 'https://letzplay.me/NattashaSilva1')
)
insert into public.athlete_registrations
  (athlete_id, team_id, team_name, category_name, letzplay_profile)
select a.id, t.id, t.team_name, '60+', s.letzplay_profile
from source s
join public.teams t on t.team_name = 'Cabo Verde'
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

-- Novos inscritos informados para as categorias A e B.
with source(team_name, athlete_name, gender, category_name, letzplay_profile) as (
  values
    ('USA', 'Ana Pantaroto', 'Feminino', 'A', 'https://letzplay.me/AnaPantaroto'),
    ('Paraguai', 'Gabrielli Silva', 'Feminino', 'B', 'https://letzplay.me/GabrielliSilva'),
    ('Portugal', 'Luca Albanês', 'Masculino', 'A', 'https://letzplay.me/LucaAlbanes')
)
insert into public.athletes (team_id, team_name, athlete_name, gender)
select t.id, t.team_name, s.athlete_name, s.gender
from source s
join public.teams t on lower(trim(t.team_name)) = lower(trim(s.team_name))
where not exists (
  select 1
  from public.athlete_registrations ar
  where lower(trim(ar.letzplay_profile)) = lower(trim(s.letzplay_profile))
)
and not exists (
  select 1
  from public.athletes a
  where a.team_id = t.id
    and lower(trim(a.athlete_name)) = lower(trim(s.athlete_name))
);

with source(team_name, athlete_name, category_name, letzplay_profile) as (
  values
    ('USA', 'Ana Pantaroto', 'A', 'https://letzplay.me/AnaPantaroto'),
    ('Paraguai', 'Gabrielli Silva', 'B', 'https://letzplay.me/GabrielliSilva'),
    ('Portugal', 'Luca Albanês', 'A', 'https://letzplay.me/LucaAlbanes'),
    ('Aruba', 'Felipe Jardim', 'B', 'https://letzplay.me/FelipeJardim5')
), resolved as (
  select distinct on (s.team_name, s.athlete_name)
    a.id as athlete_id,
    t.id as team_id,
    t.team_name,
    s.category_name,
    s.letzplay_profile
  from source s
  join public.teams t on lower(trim(t.team_name)) = lower(trim(s.team_name))
  join public.athletes a
    on a.team_id = t.id
   and lower(trim(a.athlete_name)) = lower(trim(s.athlete_name))
  order by s.team_name, s.athlete_name, a.created_at, a.id
)
insert into public.athlete_registrations
  (athlete_id, team_id, team_name, category_name, letzplay_profile)
select athlete_id, team_id, team_name, category_name, letzplay_profile
from resolved
on conflict (athlete_id, category_name) do update
set team_id = excluded.team_id,
    team_name = excluded.team_name,
    letzplay_profile = excluded.letzplay_profile,
    updated_at = now();

-- Novas inscricoes conferidas diretamente no LetzPlay em 24/08/2026.
insert into public.athletes (team_id, team_name, athlete_name, gender)
select t.id, v.team_name, v.athlete_name, v.gender
from (values
  ('Portugal', 'Renato Sabatini', 'Masculino'),
  ('Cabo Verde', 'William Oliveira', 'Masculino'),
  ('Cabo Verde', 'Gabriel Rebelo', 'Masculino'),
  ('Noruega', 'Daiane Cristina', 'Feminino'),
  ('Aruba', 'Ana Laura', 'Feminino'),
  ('Aruba', 'Pedro Malheiro', 'Masculino'),
  ('Cabo Verde', 'Laila Maria', 'Feminino'),
  ('Paraguai', 'Camila Albertini', 'Feminino'),
  ('Paraguai', 'Emilena Piffer', 'Feminino'),
  ('Paraguai', 'Milla Barizon', 'Feminino'),
  ('Paraguai', 'Rafael Corradini', 'Masculino'),
  ('Paraguai', 'Veiga .', 'Masculino'),
  ('Aruba', 'Monica Motta', 'Feminino'),
  ('Paraguai', 'Ana Carolina Gazim', 'Feminino'),
  ('Paraguai', 'Fellipe Roncholeta', 'Masculino'),
  ('Paraguai', 'Jocimara Freitas', 'Feminino'),
  ('Paraguai', 'Larissa Loyola Barbosa', 'Feminino'),
  ('Paraguai', 'Mariana Dalmagro', 'Feminino'),
  ('Paraguai', 'Pietro Lepri', 'Masculino'),
  ('Paraguai', 'Rafael Jeremias', 'Masculino')
) as v(team_name, athlete_name, gender)
join public.teams t on t.team_name = v.team_name
where not exists (
  select 1 from public.athletes a
  where a.team_id = t.id
    and lower(trim(a.athlete_name)) = lower(trim(v.athlete_name))
);

with source(athlete_name, team_name, category_name, letzplay_profile) as (
values
  ('Renato Sabatini', 'Portugal', '40+', 'https://letzplay.me/RenatoSabatini'),
  ('Sthefani Depieri', 'Aruba', '60+', 'https://letzplay.me/SthefaniDepieri'),
  ('William Oliveira', 'Cabo Verde', '60+', 'https://letzplay.me/WiliamOliver'),
  ('Pedro Lucas', 'Portugal', '60+', 'https://letzplay.me/PedroGoncalves17'),
  ('Carolina Genofre', 'Argentina', 'A', 'https://letzplay.me/CarolinaVecchiaGenofre'),
  ('Paulo Roberto', 'Brasil', 'A', 'https://letzplay.me/PauloRobertoGermanoDosSantos'),
  ('Gabriel Rebelo', 'Cabo Verde', 'A', 'https://letzplay.me/GabrielRebelo'),
  ('Sonyangela Imai Rossi', 'Paraguai', 'A', 'https://letzplay.me/SonyangelaRossi'),
  ('João Gabriel Aguiar', 'Argentina', 'B', 'https://letzplay.me/JoaoGabrielAguiar2'),
  ('Lucas Mengue', 'Brasil', 'B', 'https://letzplay.me/LucasMengue'),
  ('Daiane Cristina', 'Noruega', 'B', 'https://letzplay.me/DaianeCristina2'),
  ('Adriele Almeida Ribeiro', 'Aruba', 'C', 'https://letzplay.me/AdrieleJanainadeAlmeidaRibeiro'),
  ('Paula Da Silva', 'Argentina', 'D', 'https://letzplay.me/PAULASILVA44'),
  ('Ana Laura', 'Aruba', 'D', 'https://letzplay.me/AnaLauraRoberto2'),
  ('Pedro Malheiro', 'Aruba', 'D', 'https://letzplay.me/PedroHenriqueMalheiro1'),
  ('Laila Maria', 'Cabo Verde', 'D', 'https://letzplay.me/LailaMaria'),
  ('William Oliveira', 'Cabo Verde', 'D', 'https://letzplay.me/WiliamOliver'),
  ('Camila Albertini', 'Paraguai', 'D', 'https://letzplay.me/CamilaSilva127'),
  ('Emilena Piffer', 'Paraguai', 'D', 'https://letzplay.me/EmilenaPiffer'),
  ('Milla Barizon', 'Paraguai', 'D', 'https://letzplay.me/Millabarizon'),
  ('Rafael Corradini', 'Paraguai', 'D', 'https://letzplay.me/RafaelCorradini'),
  ('Veiga .', 'Paraguai', 'D', 'https://letzplay.me/Veigamxz'),
  ('Monica Motta', 'Aruba', 'E', 'https://letzplay.me/MonicaMottaSouza'),
  ('Ana Carolina Gazim', 'Paraguai', 'E', 'https://letzplay.me/AnaGazim'),
  ('Fellipe Roncholeta', 'Paraguai', 'E', 'https://letzplay.me/FELLIPER3'),
  ('Jocimara Freitas', 'Paraguai', 'E', 'https://letzplay.me/JocimaraFreitas1'),
  ('Larissa Loyola Barbosa', 'Paraguai', 'E', 'https://letzplay.me/LarissaBarbosa12'),
  ('Mariana Dalmagro', 'Paraguai', 'E', 'https://letzplay.me/MarianaDalmagro'),
  ('Pietro Lepri', 'Paraguai', 'E', 'https://letzplay.me/PietroLepri'),
  ('Rafael Jeremias', 'Paraguai', 'E', 'https://letzplay.me/RafaelCruz36')
)
insert into public.athlete_registrations
  (athlete_id, team_id, team_name, category_name, letzplay_profile)
select a.id, t.id, s.team_name, s.category_name, s.letzplay_profile
from source s
join public.teams t on t.team_name = s.team_name
join public.athletes a
  on a.team_id = t.id
 and lower(trim(a.athlete_name)) = lower(trim(s.athlete_name))
on conflict (athlete_id, category_name) do update
set team_id = excluded.team_id,
    team_name = excluded.team_name,
    letzplay_profile = excluded.letzplay_profile,
    updated_at = now();

-- O LetzPlay possui dois atletas homonimos chamados Miguel Moreira em Aruba/E.
-- Mantemos duas pessoas e duas inscricoes, identificadas pelos perfis distintos.
update public.athlete_registrations ar
set letzplay_profile = 'https://letzplay.me/MiguelMoreira03',
    updated_at = now()
from public.athletes a, public.teams t
where ar.athlete_id = a.id
  and ar.team_id = t.id
  and ar.category_name = 'E'
  and t.team_name = 'Aruba'
  and lower(trim(a.athlete_name)) = lower('Miguel Moreira')
  and not exists (
    select 1 from public.athlete_registrations existing
    where existing.category_name = 'E'
      and lower(trim(existing.letzplay_profile)) = lower('https://letzplay.me/MiguelMoreira03')
  );

with team as (
  select id from public.teams where team_name = 'Aruba'
), new_athlete as (
  insert into public.athletes (team_id, team_name, athlete_name, gender)
  select team.id, 'Aruba', 'Miguel Moreira', 'Masculino'
  from team
  where not exists (
    select 1 from public.athlete_registrations
    where category_name = 'E'
      and lower(trim(letzplay_profile)) = lower('https://letzplay.me/MiguelMoreira6')
  )
  returning id, team_id
)
insert into public.athlete_registrations
  (athlete_id, team_id, team_name, category_name, letzplay_profile)
select id, team_id, 'Aruba', 'E', 'https://letzplay.me/MiguelMoreira6'
from new_athlete;

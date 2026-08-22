-- Novas inscrições conferidas no LetzPlay em 22/08/2026.
insert into public.athletes (team_id, team_name, athlete_name, gender)
select t.id, v.team_name, v.athlete_name, v.gender
from (values
  ('Argentina', 'Marco Mori', 'Masculino'),
  ('Argentina', 'Rogerio Arida', 'Masculino'),
  ('Argentina', 'Cris Kloster', 'Feminino'),
  ('Argentina', 'Gulherme Kloster', 'Masculino'),
  ('Argentina', 'Joao Carlos', 'Masculino'),
  ('Argentina', 'Fernanda Ferrari Gameiro', 'Feminino'),
  ('USA', 'Dayani Noriduki', 'Feminino'),
  ('USA', 'Paula Daltro Nogueira do Prado', 'Feminino'),
  ('Argentina', 'Celso Duarte', 'Masculino'),
  ('Argentina', 'Danilo Rodrigues', 'Masculino'),
  ('Argentina', 'Antonia Thompson', 'Feminino'),
  ('Argentina', 'Manu Padilha', 'Feminino')
) as v(team_name, athlete_name, gender)
join public.teams t on t.team_name = v.team_name
where not exists (
  select 1 from public.athletes a
  where a.team_id = t.id
    and lower(trim(a.athlete_name)) = lower(trim(v.athlete_name))
);

with source(athlete_name, team_name, category_name, letzplay_profile) as (
values
  ('Marco Mori', 'Argentina', '40+', 'https://letzplay.me/MarcoMori'),
  ('Rogerio Arida', 'Argentina', '40+', 'https://letzplay.me/Arida'),
  ('Cris Kloster', 'Argentina', '40+', 'https://letzplay.me/criskloster'),
  ('Gulherme Kloster', 'Argentina', '40+', 'https://letzplay.me/GuilhermeKloster'),
  ('Joao Carlos', 'Argentina', '40+', 'https://letzplay.me/JoaoCarlosRossetim'),
  ('Fernanda Ferrari Gameiro', 'Argentina', '40+', 'https://letzplay.me/FernandaGameiro'),
  ('Dayani Noriduki', 'USA', '40+', 'https://letzplay.me/DayaniNoriduki'),
  ('Paula Daltro Nogueira do Prado', 'USA', '40+', 'https://letzplay.me/PaulaNogueiraPrado'),
  ('Celso Duarte', 'Argentina', '60+', 'https://letzplay.me/CelsoDuarte'),
  ('Rafaela Lenardon', 'Argentina', '60+', 'https://letzplay.me/RafaelaLenardon'),
  ('Carolina Genofre', 'Argentina', '60+', 'https://letzplay.me/CarolinaVecchiaGenofre'),
  ('Cris Kloster', 'Argentina', '60+', 'https://letzplay.me/criskloster'),
  ('Fabiana Paiva', 'Argentina', '60+', 'https://letzplay.me/FabianaPaiva1'),
  ('Diogo Diornellas', 'Argentina', '60+', 'https://letzplay.me/DiornellasDiogo'),
  ('Leandro Proença', 'Argentina', '60+', 'https://letzplay.me/LeandroProenca'),
  ('Joao Carlos', 'Argentina', '60+', 'https://letzplay.me/JoaoCarlosRossetim'),
  ('Danilo Rodrigues', 'Argentina', 'E', 'https://letzplay.me/DaniloRodrigues37'),
  ('Antonia Thompson', 'Argentina', 'A', 'https://letzplay.me/AntoniaThompson01'),
  ('Manu Padilha', 'Argentina', 'A', 'https://letzplay.me/ManuPadilha2')
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


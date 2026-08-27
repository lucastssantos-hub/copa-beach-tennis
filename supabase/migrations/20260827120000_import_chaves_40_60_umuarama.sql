-- Chaves oficiais do LetzPlay para a etapa Umuarama.
-- Fonte: PDFs impressos em 27/08/2026 às 11:05.

with source(category_name, group_or_phase, game_number, team_a_name, team_b_name, scheduled_time) as (
  values
    ('40+', 'Grupo 1', 1, 'USA', 'Portugal', '27/08/2026'),
    ('40+', 'Grupo 1', 2, 'USA', 'Aruba', '27/08/2026'),
    ('40+', 'Grupo 1', 3, 'Portugal', 'Aruba', '27/08/2026'),
    ('40+', 'Grupo 2', 4, 'Noruega', 'Cabo Verde', '27/08/2026'),
    ('40+', 'Grupo 2', 5, 'Argentina', 'Cabo Verde', '27/08/2026'),
    ('40+', 'Grupo 2', 6, 'Paraguai', 'Noruega', '27/08/2026'),
    ('40+', 'Grupo 2', 7, 'Paraguai', 'Cabo Verde', '27/08/2026'),
    ('40+', 'Grupo 2', 8, 'Paraguai', 'Argentina', '27/08/2026'),
    ('40+', 'Grupo 2', 9, 'Argentina', 'Noruega', '27/08/2026'),
    ('60+', 'Grupo 1', 1, 'Argentina', 'Paraguai', '28/08/2026'),
    ('60+', 'Grupo 1', 2, 'Argentina', 'Portugal', '28/08/2026'),
    ('60+', 'Grupo 1', 3, 'Portugal', 'Paraguai', '28/08/2026'),
    ('60+', 'Grupo 2', 4, 'Cabo Verde', 'Aruba', '28/08/2026'),
    ('60+', 'Grupo 2', 5, 'Cabo Verde', 'USA', '28/08/2026'),
    ('60+', 'Grupo 2', 6, 'Cabo Verde', 'Noruega', '28/08/2026'),
    ('60+', 'Grupo 2', 7, 'Aruba', 'Noruega', '28/08/2026'),
    ('60+', 'Grupo 2', 8, 'USA', 'Noruega', '28/08/2026'),
    ('60+', 'Grupo 2', 9, 'USA', 'Aruba', '28/08/2026')
),
resolved as (
  select
    c.id as category_id,
    s.category_name,
    s.group_or_phase,
    'Jogo ' || s.game_number as round,
    ta.id as team_a_id,
    ta.team_name as team_a_name,
    ta.abbreviation as team_a_abbreviation,
    ta.flag as team_a_flag,
    tb.id as team_b_id,
    tb.team_name as team_b_name,
    tb.abbreviation as team_b_abbreviation,
    tb.flag as team_b_flag,
    s.scheduled_time
  from source s
  join public.categories c on c.category_name = s.category_name
  join public.teams ta on ta.team_name = s.team_a_name
  join public.teams tb on tb.team_name = s.team_b_name
)
insert into public.matches (
  category_id, category_name, group_or_phase, round,
  team_a_id, team_a_name, team_a_abbreviation, team_a_flag,
  team_b_id, team_b_name, team_b_abbreviation, team_b_flag,
  scheduled_time, match_status, match_mode
)
select
  r.category_id, r.category_name, r.group_or_phase, r.round,
  r.team_a_id, r.team_a_name, r.team_a_abbreviation, r.team_a_flag,
  r.team_b_id, r.team_b_name, r.team_b_abbreviation, r.team_b_flag,
  r.scheduled_time, 'Aguardando escalação', 'Sequencial'
from resolved r
where not exists (
  select 1
  from public.matches m
  where m.category_name = r.category_name
    and m.group_or_phase = r.group_or_phase
    and m.round = r.round
    and m.team_a_id = r.team_a_id
    and m.team_b_id = r.team_b_id
);

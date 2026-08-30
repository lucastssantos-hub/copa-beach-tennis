-- Chaves oficiais do LetzPlay para as categorias A e B da etapa Umuarama.
-- Os nomes dos PDFs recebidos estavam invertidos; a categoria foi identificada
-- pelo título interno e pelo conteúdo de cada documento.

with source(category_name, group_or_phase, game_number, team_a_name, team_b_name, scheduled_time) as (
  values
    ('A', 'Grupo 1', 1, 'Portugal', 'Argentina', '30/08/2026'),
    ('A', 'Grupo 1', 2, 'Argentina', 'Paraguai', '30/08/2026'),
    ('A', 'Grupo 1', 3, 'Paraguai', 'Portugal', '30/08/2026'),
    ('A', 'Grupo 1', 4, 'Argentina', 'Aruba', '30/08/2026'),
    ('A', 'Grupo 1', 5, 'Aruba', 'Paraguai', '30/08/2026'),
    ('A', 'Grupo 1', 6, 'Portugal', 'Aruba', '30/08/2026'),
    ('A', 'Grupo 2', 7, 'Cabo Verde', 'Noruega', '30/08/2026'),
    ('A', 'Grupo 2', 8, 'Cabo Verde', 'Brasil', '30/08/2026'),
    ('A', 'Grupo 2', 9, 'USA', 'Brasil', '30/08/2026'),
    ('A', 'Grupo 2', 10, 'USA', 'Cabo Verde', '30/08/2026'),
    ('A', 'Grupo 2', 11, 'USA', 'Noruega', '30/08/2026'),
    ('A', 'Grupo 2', 12, 'Noruega', 'Brasil', '30/08/2026'),
    ('B', 'Grupo 1', 1, 'Argentina', 'USA', '30/08/2026'),
    ('B', 'Grupo 1', 2, 'Noruega', 'USA', '30/08/2026'),
    ('B', 'Grupo 1', 3, 'Argentina', 'Paraguai', '30/08/2026'),
    ('B', 'Grupo 1', 4, 'Noruega', 'Argentina', '30/08/2026'),
    ('B', 'Grupo 1', 5, 'Paraguai', 'Noruega', '30/08/2026'),
    ('B', 'Grupo 1', 6, 'Paraguai', 'USA', '30/08/2026'),
    ('B', 'Grupo 2', 7, 'Aruba', 'Portugal', '30/08/2026'),
    ('B', 'Grupo 2', 8, 'Portugal', 'Brasil', '30/08/2026'),
    ('B', 'Grupo 2', 9, 'Cabo Verde', 'Brasil', '30/08/2026'),
    ('B', 'Grupo 2', 10, 'Aruba', 'Cabo Verde', '30/08/2026'),
    ('B', 'Grupo 2', 11, 'Brasil', 'Aruba', '30/08/2026'),
    ('B', 'Grupo 2', 12, 'Cabo Verde', 'Portugal', '30/08/2026')
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

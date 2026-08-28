-- Semifinais da categoria 40+ — etapa Umuarama.
-- Fonte: chave do LetzPlay lida em 27/08/2026
-- (tourneys/62575/tournaments/434798/draw_squads/2), com os dois grupos já
-- concluídos:
--   Grupo 01: 1º Aruba · 2º USA · 3º Portugal
--   Grupo 02: 1º Paraguai · 2º Argentina · 3º Noruega · 4º Cabo Verde
-- Confrontos no LetzPlay: jogo #10 Aruba x Argentina, jogo #11 USA x Paraguai.
-- A ordem A/B reproduz a do LetzPlay para o operador digitar sem inverter.
--
-- A FINAL (#12) NÃO entra aqui de propósito: no LetzPlay ela está "Aguardando".
-- Quem cria a final é o app, em CONF → Gerar eliminatórias → "Gerar próxima
-- fase", depois que as duas semifinais forem finalizadas. Criar uma final vazia
-- agora faria o gerador considerar a chave completa e nunca preenchê-la.
--
-- Esta chave é DADO FIXO, espelhado do LetzPlay — não é reapurada pelo app. Se
-- um resultado de grupo for contestado e mudar a classificação, os confrontos
-- abaixo precisam ser corrigidos à mão em CLASS → tocar no confronto da chave.

with source(category_name, group_or_phase, round, team_a_name, team_b_name, scheduled_time) as (
  values
    ('40+', 'Semifinal', 'Semifinal 1', 'Aruba', 'Argentina', '27/08/2026'),
    ('40+', 'Semifinal', 'Semifinal 2', 'USA', 'Paraguai', '27/08/2026')
),
resolved as (
  select
    c.id as category_id,
    s.category_name,
    s.group_or_phase,
    s.round,
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
);

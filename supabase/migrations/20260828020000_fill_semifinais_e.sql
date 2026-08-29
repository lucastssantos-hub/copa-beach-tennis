-- Categoria E: fase de grupos concluída no LetzPlay em 28/08/2026.
-- Classificação final: Grupo 1 → 1º USA, 2º Argentina · Grupo 2 → 1º Paraguai, 2º Aruba.
-- Semifinais no LetzPlay: #13 USA x Aruba · #14 Argentina x Paraguai.
-- Mesma situação da categoria D: os resultados dos grupos só existem no LetzPlay,
-- então o botão "Preencher vagas definidas" do painel não resolve estas vagas.

update public.matches m
set team_b_id = t.id,
    team_b_name = t.team_name,
    team_b_abbreviation = t.abbreviation,
    team_b_flag = t.flag,
    updated_at = now()
from public.teams t
where m.category_name = 'E'
  and m.round = 'Semifinal 1'
  and m.team_a_name = 'USA'
  and m.team_b_name like 'A definir%'
  and t.team_name = 'Aruba';

update public.matches m
set team_b_id = t.id,
    team_b_name = t.team_name,
    team_b_abbreviation = t.abbreviation,
    team_b_flag = t.flag,
    updated_at = now()
from public.teams t
where m.category_name = 'E'
  and m.round = 'Semifinal 2'
  and m.team_a_name = 'Argentina'
  and m.team_b_name like 'A definir%'
  and t.team_name = 'Paraguai';

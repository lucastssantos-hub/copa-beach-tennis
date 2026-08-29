-- Categoria D: fase de grupos concluída no LetzPlay em 28/08/2026.
-- Classificação final: Grupo 1 → 1º USA, 2º Aruba · Grupo 2 → 1º Paraguai, 2º Argentina.
-- Semifinais no LetzPlay: #13 USA x Argentina · #14 Aruba x Paraguai.
-- Preenche as vagas "A definir" das semifinais no app com as equipes reais.
-- (O botão "Preencher vagas definidas" do painel não resolve estas vagas porque
--  os resultados dos grupos só existem no LetzPlay, não na tabela results.)

update public.matches m
set team_b_id = t.id,
    team_b_name = t.team_name,
    team_b_abbreviation = t.abbreviation,
    team_b_flag = t.flag,
    updated_at = now()
from public.teams t
where m.category_name = 'D'
  and m.round = 'Semifinal 1'
  and m.team_a_name = 'USA'
  and m.team_b_name like 'A definir%'
  and t.team_name = 'Argentina';

update public.matches m
set team_b_id = t.id,
    team_b_name = t.team_name,
    team_b_abbreviation = t.abbreviation,
    team_b_flag = t.flag,
    updated_at = now()
from public.teams t
where m.category_name = 'D'
  and m.round = 'Semifinal 2'
  and m.team_a_name = 'Aruba'
  and m.team_b_name like 'A definir%'
  and t.team_name = 'Paraguai';

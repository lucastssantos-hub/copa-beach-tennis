-- Categoria E — Grupo 1 concluído no LetzPlay (29/08/2026):
--   1º USA (3V, sets 6/0) · 2º Argentina (2V, sets 4/2) · 3º Portugal · 4º Noruega
-- O Grupo 2 ainda NÃO fechou (confrontos #9, #11 e #12 sem resultado), então os
-- lados vindos dele continuam como vaga em aberto.
--
-- Também acerta a ordem A/B da Semifinal 2, que estava invertida em relação à
-- chave do LetzPlay: lá o jogo #14 é "2º lugar do grupo 1" x "1º lugar do grupo 2".
-- Manter a mesma ordem evita o operador inverter os lados ao digitar no LetzPlay.
--
-- Guardas: só age enquanto os dois lados do confronto ainda são vaga em aberto,
-- para nunca sobrescrever uma definição feita à mão pela organização no app.

-- Semifinal 1 — lado A recebe o 1º do Grupo 1 (USA); lado B segue aguardando o G2.
update public.matches m
set team_a_id = t.id,
    team_a_name = t.team_name,
    team_a_abbreviation = t.abbreviation,
    team_a_flag = t.flag,
    match_status = 'Aguardando escalação',
    updated_at = now()
from public.teams t
where t.team_name = 'USA'
  and m.category_name = 'E'
  and m.group_or_phase = 'Semifinal'
  and m.round = 'Semifinal 1'
  and m.team_a_id is null
  and m.team_b_id is null;

-- Semifinal 2 — inverte para 2º G1 x 1º G2 e põe a Argentina no lado A.
update public.matches m
set team_a_id = t.id,
    team_a_name = t.team_name,
    team_a_abbreviation = t.abbreviation,
    team_a_flag = t.flag,
    team_b_id = null,
    team_b_name = 'A definir · 1º Grupo 2',
    team_b_abbreviation = '1º G2',
    team_b_flag = null,
    match_status = 'Aguardando escalação',
    updated_at = now()
from public.teams t
where t.team_name = 'Argentina'
  and m.category_name = 'E'
  and m.group_or_phase = 'Semifinal'
  and m.round = 'Semifinal 2'
  and m.team_a_id is null
  and m.team_b_id is null;

-- Avisa os dois capitães, como faz o editor de chave do app.
insert into public.notifications (notification_type, message, team_id, team_name, match_id)
select 'chave',
       '🔑 ' || t.team_name || ' está em ' || m.round || ' (Cat. E) — envie a escalação',
       t.id, t.team_name, m.id
from public.matches m
join public.teams t on t.id = m.team_a_id
where m.category_name = 'E'
  and m.group_or_phase = 'Semifinal'
  and t.team_name in ('USA', 'Argentina');

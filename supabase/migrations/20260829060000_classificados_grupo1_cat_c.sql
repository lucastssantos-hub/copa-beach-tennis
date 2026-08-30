-- Categoria C — Grupo 1 concluído no LetzPlay (29/08/2026):
--   1º USA (3V) · 2º Brasil (2V) · 3º Paraguai · 4º Aruba
-- Grupo 2 ainda aberto: o confronto #9 (Cabo Verde x Noruega) tem 3 jogos
-- pendentes e decide o 2º lugar entre Noruega e Argentina. Esses lados ficam vagos.
-- Também acerta a ordem A/B da Semifinal 2 para espelhar o jogo #14 do LetzPlay
-- (2º G1 x 1º G2). Guardas exigem os dois lados vagos.

update public.matches m
set team_a_id = t.id,
    team_a_name = t.team_name,
    team_a_abbreviation = t.abbreviation,
    team_a_flag = t.flag,
    match_status = 'Aguardando escalação',
    updated_at = now()
from public.teams t
where t.team_name = 'USA'
  and m.category_name = 'C'
  and m.group_or_phase = 'Semifinal'
  and m.round = 'Semifinal 1'
  and m.team_a_id is null
  and m.team_b_id is null;

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
where t.team_name = 'Brasil'
  and m.category_name = 'C'
  and m.group_or_phase = 'Semifinal'
  and m.round = 'Semifinal 2'
  and m.team_a_id is null
  and m.team_b_id is null;

insert into public.notifications (notification_type, message, team_id, team_name, match_id)
select 'chave',
       '🔑 ' || t.team_name || ' está em ' || m.round || ' (Cat. C) — envie a escalação',
       t.id, t.team_name, m.id
from public.matches m
join public.teams t on t.id = m.team_a_id
where m.category_name = 'C'
  and m.group_or_phase = 'Semifinal'
  and t.team_name in ('USA', 'Brasil');

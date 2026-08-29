-- Categoria D — Grupo 1 concluído no LetzPlay (29/08/2026):
--   1º USA · 2º Aruba · 3º Portugal · 4º Cabo Verde
-- Grupo 2 ainda aberto: o confronto #12 (Paraguai x Noruega) está 1/0 com um
-- jogo pendente, então as posições do G2 podem mudar. Esses lados ficam vagos.
-- Também acerta a ordem A/B da Semifinal 2 para espelhar o jogo #14 do LetzPlay
-- (2º G1 x 1º G2). Guardas exigem os dois lados vagos: nunca sobrescreve o que
-- a organização tiver definido à mão no app.

update public.matches m
set team_a_id = t.id,
    team_a_name = t.team_name,
    team_a_abbreviation = t.abbreviation,
    team_a_flag = t.flag,
    match_status = 'Aguardando escalação',
    updated_at = now()
from public.teams t
where t.team_name = 'USA'
  and m.category_name = 'D'
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
where t.team_name = 'Aruba'
  and m.category_name = 'D'
  and m.group_or_phase = 'Semifinal'
  and m.round = 'Semifinal 2'
  and m.team_a_id is null
  and m.team_b_id is null;

insert into public.notifications (notification_type, message, team_id, team_name, match_id)
select 'chave',
       '🔑 ' || t.team_name || ' está em ' || m.round || ' (Cat. D) — envie a escalação',
       t.id, t.team_name, m.id
from public.matches m
join public.teams t on t.id = m.team_a_id
where m.category_name = 'D'
  and m.group_or_phase = 'Semifinal'
  and t.team_name in ('USA', 'Aruba');

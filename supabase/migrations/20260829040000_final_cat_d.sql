-- Categoria D — chave fechada no LetzPlay (29/08/2026):
--   #13 Semifinal 1: USA 0 x 2 Argentina
--   #14 Semifinal 2: Aruba 0 x 2 Paraguai
--   #15 Final:       Argentina x Paraguai
-- Classificados do Grupo 2: 1º Paraguai, 2º Argentina (a Argentina subiu de 3º
-- depois do jogo que estava pendente no confronto #12).
--
-- Completa os lados do G2 nas semifinais (só para a chave do app ficar coerente,
-- os jogos já foram disputados) e define a Final, que é o que libera a escalação
-- dos dois finalistas. Guardas exigem o lado ainda vago.

update public.matches m
set team_b_id = t.id, team_b_name = t.team_name,
    team_b_abbreviation = t.abbreviation, team_b_flag = t.flag, updated_at = now()
from public.teams t
where t.team_name = 'Argentina'
  and m.category_name = 'D' and m.round = 'Semifinal 1' and m.team_b_id is null;

update public.matches m
set team_b_id = t.id, team_b_name = t.team_name,
    team_b_abbreviation = t.abbreviation, team_b_flag = t.flag, updated_at = now()
from public.teams t
where t.team_name = 'Paraguai'
  and m.category_name = 'D' and m.round = 'Semifinal 2' and m.team_b_id is null;

update public.matches m
set team_a_id = ta.id, team_a_name = ta.team_name,
    team_a_abbreviation = ta.abbreviation, team_a_flag = ta.flag,
    team_b_id = tb.id, team_b_name = tb.team_name,
    team_b_abbreviation = tb.abbreviation, team_b_flag = tb.flag,
    match_status = 'Aguardando escalação', updated_at = now()
from public.teams ta, public.teams tb
where ta.team_name = 'Argentina' and tb.team_name = 'Paraguai'
  and m.category_name = 'D' and m.group_or_phase = 'Final'
  and m.team_a_id is null and m.team_b_id is null;

insert into public.notifications (notification_type, message, team_id, team_name, match_id)
select 'chave',
       '🔑 ' || t.team_name || ' está na Final (Cat. D) — envie a escalação',
       t.id, t.team_name, m.id
from public.matches m
join public.teams t on t.id in (m.team_a_id, m.team_b_id)
where m.category_name = 'D' and m.group_or_phase = 'Final';

-- Categoria C — Grupo 2 fechado e semifinais definidas no LetzPlay (29/08/2026):
--   #13 Semifinal 1: USA x Noruega     (2º do Grupo 2 = Noruega)
--   #14 Semifinal 2: Brasil x Portugal (1º do Grupo 2 = Portugal)
--   #15 Final: ainda "Aguardando" no LetzPlay — segue com vaga em aberto no app.
-- Os dois confrontos ainda não foram disputados, então os capitães que entram
-- agora são notificados para enviar a escalação.
-- Guardas exigem o lado ainda vago: não sobrescreve definição feita à mão.

update public.matches m
set team_b_id = t.id, team_b_name = t.team_name,
    team_b_abbreviation = t.abbreviation, team_b_flag = t.flag,
    match_status = 'Aguardando escalação', updated_at = now()
from public.teams t
where t.team_name = 'Noruega'
  and m.category_name = 'C' and m.round = 'Semifinal 1' and m.team_b_id is null;

update public.matches m
set team_b_id = t.id, team_b_name = t.team_name,
    team_b_abbreviation = t.abbreviation, team_b_flag = t.flag,
    match_status = 'Aguardando escalação', updated_at = now()
from public.teams t
where t.team_name = 'Portugal'
  and m.category_name = 'C' and m.round = 'Semifinal 2' and m.team_b_id is null;

insert into public.notifications (notification_type, message, team_id, team_name, match_id)
select 'chave',
       '🔑 ' || t.team_name || ' está em ' || m.round || ' (Cat. C) — envie a escalação',
       t.id, t.team_name, m.id
from public.matches m
join public.teams t on t.id = m.team_b_id
where m.category_name = 'C'
  and m.group_or_phase = 'Semifinal'
  and t.team_name in ('Noruega', 'Portugal');

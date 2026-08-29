-- Blocos da fase eliminatória da categoria 60+ — 2 semifinais + 1 final.
-- Criados VAZIOS de propósito: a organização define as equipes de cada bloco
-- no app (CLASS → tocar no confronto → escolher as duas equipes → "Liberar
-- escalação"), o que grava match_status 'Aguardando escalação' e libera o envio
-- da escalação no app do capitão, além de notificar os dois capitães.
--
-- Os lados vazios não ficam NULL: guardam o rótulo da vaga no formato que o app
-- reconhece (engine.ts → parsePendingSlotName). Isso faz a chave mostrar de onde
-- cada vaga vem em vez de um "A definir" mudo, e permite o preenchimento
-- automático em CONF → "Preencher vagas definidas" caso os resultados venham a
-- ser lançados no app. Enquanto o lado está vago, team_id é NULL — nenhum
-- capitão enxerga o bloco, então ninguém escala por engano.
--
-- Sem disputa de 3º lugar: a chave desta Copa no LetzPlay é SF → Final.
-- Grupos do 60+: Grupo 1 (Argentina, Paraguai, Portugal) e
--                Grupo 2 (Cabo Verde, Aruba, USA, Noruega).

with source(round, phase, a_seed, b_seed) as (
  values
    ('Semifinal 1', 'Semifinal', '1º Grupo 1',           '2º Grupo 2'),
    ('Semifinal 2', 'Semifinal', '1º Grupo 2',           '2º Grupo 1'),
    ('Final',       'Final',     'Vencedor Semifinal 1', 'Vencedor Semifinal 2')
),
-- Sigla curta idêntica à de pendingSlotAbbreviation() no engine.ts:
--   "1º Grupo 1" → "1º G1" · "Vencedor Semifinal 1" → "Venc. SF1"
abbrev as (
  select
    s.*,
    replace(replace(replace(s.a_seed, 'Grupo ', 'G'), 'Vencedor ', 'Venc. '), 'Semifinal ', 'SF') as a_abbr,
    replace(replace(replace(s.b_seed, 'Grupo ', 'G'), 'Vencedor ', 'Venc. '), 'Semifinal ', 'SF') as b_abbr
  from source s
)
insert into public.matches (
  category_id, category_name, group_or_phase, round,
  team_a_id, team_a_name, team_a_abbreviation, team_a_flag,
  team_b_id, team_b_name, team_b_abbreviation, team_b_flag,
  scheduled_time, match_status, match_mode
)
select
  c.id, '60+', a.phase, a.round,
  null, 'A definir · ' || a.a_seed, a.a_abbr, null,
  null, 'A definir · ' || a.b_seed, a.b_abbr, null,
  '28/08/2026', 'Aguardando escalação', 'Sequencial'
from abbrev a
join public.categories c on c.category_name = '60+'
where not exists (
  select 1 from public.matches m
  where m.category_name = '60+'
    and m.group_or_phase = a.phase
    and m.round = a.round
);

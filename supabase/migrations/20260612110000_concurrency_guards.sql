-- Auditoria de produção: protege operações concorrentes.
-- Mantém o registro mais recente quando já houver duplicatas e cria chaves
-- naturais para upsert seguro pelo app.

with ranked as (
  select
    id,
    row_number() over (
      partition by match_id, team_id
      order by updated_at desc nulls last, created_at desc nulls last, id desc
    ) as rn
  from public.lineups
  where match_id is not null and team_id is not null
)
delete from public.lineups l
using ranked r
where l.id = r.id and r.rn > 1;

with ranked as (
  select
    id,
    row_number() over (
      partition by match_id, team_id
      order by updated_at desc nulls last, created_at desc nulls last, id desc
    ) as rn
  from public.presence
  where match_id is not null and team_id is not null
)
delete from public.presence p
using ranked r
where p.id = r.id and r.rn > 1;

with ranked as (
  select
    id,
    row_number() over (
      partition by match_id, game_type
      order by updated_at desc nulls last, finished_at desc nulls last, created_at desc nulls last, id desc
    ) as rn
  from public.results
  where match_id is not null and game_type is not null
)
delete from public.results r0
using ranked r
where r0.id = r.id and r.rn > 1;

create unique index if not exists lineups_match_team_unique
  on public.lineups (match_id, team_id);

create unique index if not exists presence_match_team_unique
  on public.presence (match_id, team_id);

create unique index if not exists results_match_game_unique
  on public.results (match_id, game_type);

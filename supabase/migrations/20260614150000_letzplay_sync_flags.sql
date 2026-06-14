-- Automação de sincronização com o LetzPlay (letzplay-sync/).
-- Flags booleanas que a automação usa para saber o que já subiu na plataforma.
-- (O painel manual da aba LETZ usa matches.letzplay_synced_at; estas flags são
--  do robô Playwright e são independentes — ver letzplay-sync/README.md.)
alter table public.matches add column if not exists synced_escalacao boolean not null default false;
alter table public.matches add column if not exists synced_resultado boolean not null default false;

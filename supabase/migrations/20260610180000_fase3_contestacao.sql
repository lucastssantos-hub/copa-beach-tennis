-- Fase 3: contestação de resultado.
-- Motivo da contestação vive no próprio confronto (limpo ao resolver).
-- Status novos usados em matches.match_status (coluna text, sem constraint):
--   'Resultado contestado' | 'W.O.' | 'Desistência'
alter table public.matches add column if not exists contest_reason text;

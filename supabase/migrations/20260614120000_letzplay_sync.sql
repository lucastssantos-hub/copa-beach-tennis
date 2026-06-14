-- Painel LetzPlay: controle do que já foi transferido para a plataforma externa.
-- Marca quando o operador digitou as escalações do confronto no LetzPlay, para
-- o confronto sair da fila de "pronto p/ transferir". Limpar = volta para a fila.
alter table public.matches add column if not exists letzplay_synced_at timestamptz;

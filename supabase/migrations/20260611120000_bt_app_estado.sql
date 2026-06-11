-- BT Performance — espelho de estado do app (MVP).
-- Rodar no SQL Editor do projeto rkoqcvylamvnkxnaegna após o restore.
-- 1 linha = o estado inteiro do app (jsonb), local-first com last-write-wins.
-- ATENÇÃO (nível demo): a política abaixo libera leitura/escrita para a chave anon,
-- porque o app ainda usa auth local de seed. Os dados são fictícios. Antes de entrar
-- atleta real: migrar para Supabase Auth + RLS por papel (base já em 001_schema_bt.sql).

create table if not exists bt_app_estado (
  id            text primary key,
  estado        jsonb not null,
  atualizado_em timestamptz not null default now()
);

alter table bt_app_estado enable row level security;

drop policy if exists bt_app_estado_demo on bt_app_estado;
create policy bt_app_estado_demo on bt_app_estado
  for all using (true) with check (true);

grant select, insert, update, delete on bt_app_estado to anon;

-- Códigos provisórios de acesso dos capitães.
-- Idempotente: reaplicar atualiza os códigos destas seleções.

insert into public.team_access (team_code, access_code)
values
  ('USA', '199165'),
  ('BRA', '141086'),
  ('PRY', '518692'),
  ('ARG', '684433'),
  ('ARU', '346450'),
  ('CPV', '629523'),
  ('NOR', '666640'),
  ('POR', '267235'),
  ('ESP', '426272')
on conflict (team_code) do update
set access_code = excluded.access_code,
    updated_at = now();

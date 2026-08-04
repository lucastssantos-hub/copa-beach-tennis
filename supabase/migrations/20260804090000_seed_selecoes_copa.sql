-- Cadastro inicial das seleções confirmadas para a Copa.
-- Idempotente: atualiza as seleções existentes e insere as novas.
-- Códigos de acesso dos capitães não são definidos aqui.

update public.teams
set captain_name = v.captain_name,
    flag = v.flag,
    country = v.country,
    updated_at = now()
from (values
  ('USA', 'USA', 'USA', '🇺🇸', 'Pedro'),
  ('BRA', 'Brasil', 'Brasil', '🇧🇷', 'Renato'),
  ('PRY', 'Paraguai', 'Paraguai', '🇵🇾', 'Dani/Mari'),
  ('ARG', 'Argentina', 'Argentina', '🇦🇷', 'Leonardo'),
  ('ARU', 'Aruba', 'Aruba', '🇦🇼', 'Gabriel'),
  ('CPV', 'Cabo Verde', 'Cabo Verde', '🇨🇻', 'Gustavo'),
  ('NOR', 'Noruega', 'Noruega', '🇳🇴', 'Pedro'),
  ('POR', 'Portugal', 'Portugal', '🇵🇹', 'Maiara/Day'),
  ('ESP', 'Espanha', 'Espanha', '🇪🇸', 'José Ricardo')
) as v(abbreviation, team_name, country, flag, captain_name)
where public.teams.abbreviation = v.abbreviation;

insert into public.teams (team_name, country, abbreviation, flag, captain_name, status)
select v.team_name, v.country, v.abbreviation, v.flag, v.captain_name, 'ativo'
from (values
  ('USA', 'USA', 'USA', '🇺🇸', 'Pedro'),
  ('BRA', 'Brasil', 'Brasil', '🇧🇷', 'Renato'),
  ('PRY', 'Paraguai', 'Paraguai', '🇵🇾', 'Dani/Mari'),
  ('ARG', 'Argentina', 'Argentina', '🇦🇷', 'Leonardo'),
  ('ARU', 'Aruba', 'Aruba', '🇦🇼', 'Gabriel'),
  ('CPV', 'Cabo Verde', 'Cabo Verde', '🇨🇻', 'Gustavo'),
  ('NOR', 'Noruega', 'Noruega', '🇳🇴', 'Pedro'),
  ('POR', 'Portugal', 'Portugal', '🇵🇹', 'Maiara/Day'),
  ('ESP', 'Espanha', 'Espanha', '🇪🇸', 'José Ricardo')
) as v(abbreviation, team_name, country, flag, captain_name)
where not exists (
  select 1 from public.teams t where t.abbreviation = v.abbreviation
);

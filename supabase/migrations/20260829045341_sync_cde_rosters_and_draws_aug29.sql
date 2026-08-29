-- Espelho do LetzPlay em 29/08/2026 para as categorias C, D e E.
-- Inclui as alteracoes de elenco posteriores ao espelho integral de 26/08 e
-- as chaves oficiais dos PDFs impressos em 28/08/2026.

create temporary table cde_roster_additions (
  category_name text not null,
  team_name text not null,
  athlete_name text not null,
  gender text not null,
  letzplay_profile text not null
) on commit drop;

insert into cde_roster_additions
  (category_name, team_name, athlete_name, gender, letzplay_profile)
values
  ('C', 'Cabo Verde', 'Grilo .', 'Masculino', 'https://letzplay.me/Grilo'),
  ('C', 'Cabo Verde', 'Tania Cristina Soares Luchetti', 'Feminino', 'https://letzplay.me/TaniaSoares2'),
  ('C', 'Portugal', 'Dayane Noda Kondo Rolim', 'Feminino', 'https://letzplay.me/DayaneRolim'),
  ('C', 'Noruega', 'Bruno Okuma', 'Masculino', 'https://letzplay.me/BrunoOkuma'),
  ('C', 'Aruba', 'Pedro Malheiro', 'Masculino', 'https://letzplay.me/PedroHenriqueMalheiro1'),
  ('C', 'Aruba', 'Marcos Versuti', 'Masculino', 'https://letzplay.me/marcosversutiloreto'),
  ('D', 'Cabo Verde', 'Felipe Rogerio Pizaia', 'Masculino', 'https://letzplay.me/FelipePizaia'),
  ('D', 'Noruega', 'Julio Cezar', 'Masculino', 'https://letzplay.me/JulioCezar'),
  ('E', 'Paraguai', 'Mariane Ziliotto', 'Feminino', 'https://letzplay.me/MarianeZiliotto'),
  ('E', 'Cabo Verde', 'Valentina Queiroz Lopes', 'Feminino', 'https://letzplay.me/ValentinaLopes18'),
  ('E', 'USA', 'Mylena Soares', 'Feminino', 'https://letzplay.me/MylenaSoares');

-- Cria apenas as pessoas ainda inexistentes; perfis já vistos em outra
-- categoria continuam apontando para o mesmo atleta.
insert into public.athletes (team_id, team_name, athlete_name, gender)
select distinct on (lower(s.letzplay_profile))
  t.id, t.team_name, s.athlete_name, s.gender
from cde_roster_additions s
join public.teams t on t.team_name = s.team_name
where not exists (
  select 1
  from public.athlete_registrations ar
  where lower(trim(ar.letzplay_profile)) = lower(trim(s.letzplay_profile))
)
and not exists (
  select 1
  from public.athletes a
  where a.team_id = t.id
    and lower(trim(a.athlete_name)) = lower(trim(s.athlete_name))
)
order by lower(s.letzplay_profile), s.category_name;

with mapped as (
  select
    s.*,
    t.id as team_id,
    coalesce(
      (
        select ar.athlete_id
        from public.athlete_registrations ar
        where lower(trim(ar.letzplay_profile)) = lower(trim(s.letzplay_profile))
        order by ar.created_at, ar.id
        limit 1
      ),
      (
        select a.id
        from public.athletes a
        where a.team_id = t.id
          and lower(trim(a.athlete_name)) = lower(trim(s.athlete_name))
        order by a.created_at, a.id
        limit 1
      )
    ) as athlete_id
  from cde_roster_additions s
  join public.teams t on t.team_name = s.team_name
)
insert into public.athlete_registrations
  (athlete_id, team_id, team_name, category_name, letzplay_profile)
select athlete_id, team_id, team_name, category_name, letzplay_profile
from mapped
where athlete_id is not null
on conflict (athlete_id, category_name) do update
set team_id = excluded.team_id,
    team_name = excluded.team_name,
    letzplay_profile = excluded.letzplay_profile,
    updated_at = now();

-- Inscricoes que deixaram de constar no LetzPlay.
delete from public.athlete_registrations ar
where (ar.category_name, lower(trim(ar.letzplay_profile))) in (
  values
    ('C', lower('https://letzplay.me/AndreiaSantos9')),
    ('C', lower('https://letzplay.me/JeffersonDeMacedo')),
    ('C', lower('https://letzplay.me/NicolasFunayama1')),
    ('D', lower('https://letzplay.me/PietroLepri')),
    ('D', lower('https://letzplay.me/BrunoOkuma')),
    ('D', lower('https://letzplay.me/PedroHenriqueMalheiro1')),
    ('E', lower('https://letzplay.me/LarissaBarbosa12')),
    ('E', lower('https://letzplay.me/MiguelStruckel1'))
);

-- Pietro deixou Cabo Verde na D e permanece no Paraguai na E. O elenco-base
-- também precisa refletir a seleção atual para o seletor do capitão exibi-lo.
update public.athletes a
set team_id = t.id,
    team_name = t.team_name,
    updated_at = now()
from public.teams t
where t.team_name = 'Paraguai'
  and a.id in (
    select ar.athlete_id
    from public.athlete_registrations ar
    where lower(trim(ar.letzplay_profile)) = lower('https://letzplay.me/PietroLepri')
  );

-- Jogos da fase de grupos exatamente na ordem dos PDFs do LetzPlay.
with source(category_name, group_or_phase, game_number, team_a_name, team_b_name) as (
  values
    ('C', 'Grupo 1', 1, 'Paraguai', 'USA'),
    ('C', 'Grupo 1', 2, 'Brasil', 'Paraguai'),
    ('C', 'Grupo 1', 3, 'USA', 'Aruba'),
    ('C', 'Grupo 1', 4, 'Brasil', 'Aruba'),
    ('C', 'Grupo 1', 5, 'Aruba', 'Paraguai'),
    ('C', 'Grupo 1', 6, 'USA', 'Brasil'),
    ('C', 'Grupo 2', 7, 'Noruega', 'Portugal'),
    ('C', 'Grupo 2', 8, 'Cabo Verde', 'Portugal'),
    ('C', 'Grupo 2', 9, 'Cabo Verde', 'Noruega'),
    ('C', 'Grupo 2', 10, 'Cabo Verde', 'Argentina'),
    ('C', 'Grupo 2', 11, 'Noruega', 'Argentina'),
    ('C', 'Grupo 2', 12, 'Portugal', 'Argentina'),
    ('D', 'Grupo 1', 1, 'Aruba', 'USA'),
    ('D', 'Grupo 1', 2, 'USA', 'Portugal'),
    ('D', 'Grupo 1', 3, 'Cabo Verde', 'Portugal'),
    ('D', 'Grupo 1', 4, 'Aruba', 'Portugal'),
    ('D', 'Grupo 1', 5, 'Cabo Verde', 'Aruba'),
    ('D', 'Grupo 1', 6, 'USA', 'Cabo Verde'),
    ('D', 'Grupo 2', 7, 'Argentina', 'Brasil'),
    ('D', 'Grupo 2', 8, 'Argentina', 'Paraguai'),
    ('D', 'Grupo 2', 9, 'Brasil', 'Noruega'),
    ('D', 'Grupo 2', 10, 'Paraguai', 'Brasil'),
    ('D', 'Grupo 2', 11, 'Noruega', 'Argentina'),
    ('D', 'Grupo 2', 12, 'Paraguai', 'Noruega'),
    ('E', 'Grupo 1', 1, 'Noruega', 'Argentina'),
    ('E', 'Grupo 1', 2, 'USA', 'Portugal'),
    ('E', 'Grupo 1', 3, 'Portugal', 'Argentina'),
    ('E', 'Grupo 1', 4, 'Noruega', 'Portugal'),
    ('E', 'Grupo 1', 5, 'USA', 'Noruega'),
    ('E', 'Grupo 1', 6, 'USA', 'Argentina'),
    ('E', 'Grupo 2', 7, 'Brasil', 'Cabo Verde'),
    ('E', 'Grupo 2', 8, 'Paraguai', 'Aruba'),
    ('E', 'Grupo 2', 9, 'Brasil', 'Paraguai'),
    ('E', 'Grupo 2', 10, 'Cabo Verde', 'Aruba'),
    ('E', 'Grupo 2', 11, 'Aruba', 'Brasil'),
    ('E', 'Grupo 2', 12, 'Paraguai', 'Cabo Verde')
), resolved as (
  select
    c.id as category_id,
    s.category_name,
    s.group_or_phase,
    'Jogo ' || s.game_number as round,
    ta.id as team_a_id,
    ta.team_name as team_a_name,
    ta.abbreviation as team_a_abbreviation,
    ta.flag as team_a_flag,
    tb.id as team_b_id,
    tb.team_name as team_b_name,
    tb.abbreviation as team_b_abbreviation,
    tb.flag as team_b_flag
  from source s
  join public.categories c on c.category_name = s.category_name
  join public.teams ta on ta.team_name = s.team_a_name
  join public.teams tb on tb.team_name = s.team_b_name
)
insert into public.matches (
  category_id, category_name, group_or_phase, round,
  team_a_id, team_a_name, team_a_abbreviation, team_a_flag,
  team_b_id, team_b_name, team_b_abbreviation, team_b_flag,
  scheduled_time, match_status, match_mode
)
select
  r.category_id, r.category_name, r.group_or_phase, r.round,
  r.team_a_id, r.team_a_name, r.team_a_abbreviation, r.team_a_flag,
  r.team_b_id, r.team_b_name, r.team_b_abbreviation, r.team_b_flag,
  '29/08/2026', 'Aguardando escalação', 'Sequencial'
from resolved r
where not exists (
  select 1 from public.matches m
  where m.category_name = r.category_name
    and m.group_or_phase = r.group_or_phase
    and m.round = r.round
);

-- Estrutura vazia das eliminatorias: duas semifinais e final por categoria.
with categories_to_seed(category_name) as (
  values ('C'), ('D'), ('E')
), slots(round, phase, a_seed, b_seed) as (
  values
    ('Semifinal 1', 'Semifinal', '1º Grupo 1', '2º Grupo 2'),
    ('Semifinal 2', 'Semifinal', '1º Grupo 2', '2º Grupo 1'),
    ('Final', 'Final', 'Vencedor Semifinal 1', 'Vencedor Semifinal 2')
), source as (
  select
    cts.category_name,
    s.*,
    replace(replace(replace(s.a_seed, 'Grupo ', 'G'), 'Vencedor ', 'Venc. '), 'Semifinal ', 'SF') as a_abbr,
    replace(replace(replace(s.b_seed, 'Grupo ', 'G'), 'Vencedor ', 'Venc. '), 'Semifinal ', 'SF') as b_abbr
  from categories_to_seed cts
  cross join slots s
)
insert into public.matches (
  category_id, category_name, group_or_phase, round,
  team_a_id, team_a_name, team_a_abbreviation, team_a_flag,
  team_b_id, team_b_name, team_b_abbreviation, team_b_flag,
  scheduled_time, match_status, match_mode
)
select
  c.id, s.category_name, s.phase, s.round,
  null, 'A definir · ' || s.a_seed, s.a_abbr, null,
  null, 'A definir · ' || s.b_seed, s.b_abbr, null,
  '29/08/2026', 'Aguardando escalação', 'Sequencial'
from source s
join public.categories c on c.category_name = s.category_name
where not exists (
  select 1 from public.matches m
  where m.category_name = s.category_name
    and m.group_or_phase = s.phase
    and m.round = s.round
);

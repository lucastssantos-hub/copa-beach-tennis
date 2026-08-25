-- Move Kaue Silva do Brasil da categoria D para a C.
update public.athlete_registrations
set category_name = 'C',
    updated_at = now()
where athlete_id = 'c1b6fada-aa25-405b-8104-313ad959d6d4'
  and team_name = 'Brasil'
  and category_name = 'D';

-- Cadastra Marcelo Augusto Rodrigues como atleta masculino do Brasil na D.
insert into public.athletes (team_id, team_name, athlete_name, gender)
select t.id, 'Brasil', 'Marcelo Augusto Rodrigues', 'Masculino'
from public.teams t
where t.team_name = 'Brasil'
  and not exists (
    select 1
    from public.athletes a
    where a.team_id = t.id
      and lower(trim(a.athlete_name)) = lower('Marcelo Augusto Rodrigues')
  );

insert into public.athlete_registrations
  (athlete_id, team_id, team_name, category_name, letzplay_profile)
select a.id, t.id, 'Brasil', 'D', 'https://letzplay.me/MarceloOBigode'
from public.teams t
join public.athletes a
  on a.team_id = t.id
 and lower(trim(a.athlete_name)) = lower('Marcelo Augusto Rodrigues')
where t.team_name = 'Brasil'
on conflict (athlete_id, category_name) do update
set team_id = excluded.team_id,
    team_name = excluded.team_name,
    letzplay_profile = excluded.letzplay_profile,
    updated_at = now();

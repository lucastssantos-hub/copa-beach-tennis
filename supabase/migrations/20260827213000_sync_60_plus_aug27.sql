-- Sincroniza a categoria 60+ com o espelho do LetzPlay em 27/08/2026.
-- Remove apenas as inscricoes que sairam da categoria; os atletas e suas
-- inscricoes em outras categorias permanecem intactos.

delete from public.athlete_registrations
where category_name = '60+'
  and lower(trim(letzplay_profile)) in (
    lower('https://letzplay.me/JoaoCarlosRossetim'),
    lower('https://letzplay.me/VivianeRibeiro8')
  );

insert into public.athlete_registrations
  (athlete_id, team_id, team_name, category_name, letzplay_profile)
select
  a.id,
  t.id,
  t.team_name,
  '60+',
  'https://letzplay.me/EvertonHernandes'
from public.athletes a
join public.teams t on t.team_name = 'Cabo Verde'
where lower(trim(a.athlete_name)) = lower('Everton Hernandes')
order by a.created_at, a.id
limit 1
on conflict (athlete_id, category_name) do update
set team_id = excluded.team_id,
    team_name = excluded.team_name,
    letzplay_profile = excluded.letzplay_profile,
    updated_at = now();

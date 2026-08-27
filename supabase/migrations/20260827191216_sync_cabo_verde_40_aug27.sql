-- Espelho do Cabo Verde na categoria 40+ conferido no LetzPlay em 27/08/2026.
create temporary table sync_cabo_verde_40_source (
  athlete_name text not null,
  letzplay_profile text not null
) on commit drop;

insert into sync_cabo_verde_40_source (athlete_name, letzplay_profile)
values
  ('Luiz Lepri Jr', 'https://letzplay.me/Luizleprijr'),
  ('Viviane Macedo Ribeiro', 'https://letzplay.me/VivianeRibeiro8'),
  ('Tania Sahequi', 'https://letzplay.me/TaniaSahequi'),
  ('Grilo .', 'https://letzplay.me/Grilo');

insert into public.athletes (team_id, team_name, athlete_name, gender)
select t.id, 'Cabo Verde', 'Tania Sahequi', 'Feminino'
from public.teams t
where t.team_name = 'Cabo Verde'
  and not exists (
    select 1
    from public.athletes a
    where a.team_id = t.id
      and lower(trim(a.athlete_name)) = lower('Tania Sahequi')
  );

with mapped as (
  select s.*,
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
  from sync_cabo_verde_40_source s
  join public.teams t on t.team_name = 'Cabo Verde'
)
insert into public.athlete_registrations
  (athlete_id, team_id, team_name, category_name, letzplay_profile)
select athlete_id, team_id, 'Cabo Verde', '40+', letzplay_profile
from mapped
where athlete_id is not null
on conflict (athlete_id, category_name) do update
set team_id = excluded.team_id,
    team_name = excluded.team_name,
    letzplay_profile = excluded.letzplay_profile,
    updated_at = now();

delete from public.athlete_registrations ar
where ar.team_name = 'Cabo Verde'
  and ar.category_name = '40+'
  and not exists (
    select 1
    from sync_cabo_verde_40_source s
    where lower(trim(s.letzplay_profile)) = lower(trim(ar.letzplay_profile))
  );

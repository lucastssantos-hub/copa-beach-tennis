-- Felipe Jardim permanece por Aruba nas categorias B e 60+, mas sai da A.
delete from public.athlete_registrations ar
using public.athletes a, public.teams t
where ar.athlete_id = a.id
  and ar.team_id = t.id
  and lower(trim(a.athlete_name)) = lower('Felipe Jardim')
  and lower(trim(t.team_name)) = lower('Aruba')
  and ar.category_name = 'A';

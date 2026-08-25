-- Corrige o cadastro existente da atleta do Paraguai, sem duplicar a pessoa.
update public.athletes
set athlete_name = 'Maíra Frasson Cordeiro da Silva',
    updated_at = now()
where id = 'bc7075d8-10f0-42b8-bec1-2af63223a1be'
  and team_name = 'Paraguai';

update public.athlete_registrations
set letzplay_profile = 'https://letzplay.me/MairaCordeiro',
    updated_at = now()
where athlete_id = 'bc7075d8-10f0-42b8-bec1-2af63223a1be'
  and team_name = 'Paraguai'
  and category_name = 'C';

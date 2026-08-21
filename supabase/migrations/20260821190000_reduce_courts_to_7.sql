-- A Copa do Mundo utilizará somente as quadras 1 a 7.
delete from public.courts
where court_number > 7;

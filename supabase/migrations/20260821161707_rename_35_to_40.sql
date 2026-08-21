-- A etapa de Umuarama usa +40; não haverá categoria +35.
update public.categories
set category_name = '40+', updated_at = now()
where category_name = '35+'
  and not exists (
    select 1 from public.categories where category_name = '40+'
  );

update public.matches
set category_name = '40+', updated_at = now()
where category_name = '35+';

update public.lineups
set category_name = '40+', updated_at = now()
where category_name = '35+';

-- Elenco de atletas por seleção — alimenta o seletor de escalação do capitão.
-- O capitão escolhe atletas do elenco em vez de digitar nomes livres.

create table if not exists public.athletes (
  id uuid primary key default gen_random_uuid(),
  team_id uuid,
  team_name text,
  athlete_name text not null,
  gender text not null check (gender in ('Feminino', 'Masculino')),
  created_at timestamp default now(),
  updated_at timestamp default now()
);

alter table public.athletes enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'athletes' and policyname = 'v1_allow_all'
  ) then
    create policy v1_allow_all on public.athletes for all using (true) with check (true);
  end if;
end $$;

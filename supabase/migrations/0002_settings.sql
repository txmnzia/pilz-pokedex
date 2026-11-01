-- Pilzdex: per-user preferences (language, grid/list). Run once in the SQL editor. Safe to re-run.
create table if not exists pilz_pokedex.settings (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  lang text not null default 'en' check (lang in ('fr', 'en', 'de')),
  mode text not null default 'grid' check (mode in ('grid', 'list')),
  updated_at timestamptz not null default now()
);
alter table pilz_pokedex.settings enable row level security;
drop policy if exists "own rows" on pilz_pokedex.settings;
create policy "own rows" on pilz_pokedex.settings
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on pilz_pokedex.settings to authenticated;
grant all on pilz_pokedex.settings to service_role;

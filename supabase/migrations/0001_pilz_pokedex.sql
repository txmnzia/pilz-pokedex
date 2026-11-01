-- Pilzdex: own schema on the shared txmnzia-dbs project.
-- Run once in the Supabase SQL editor. Safe to re-run.
-- Then: Project Settings > Data API > Exposed schemas > ADD pilz_pokedex (keep the others).
create schema if not exists pilz_pokedex;
comment on schema pilz_pokedex is 'txmnzia/pilz-pokedex';
grant usage on schema pilz_pokedex to anon, authenticated, service_role;
alter default privileges in schema pilz_pokedex
  grant select, insert, update, delete on tables to authenticated;

-- One photographed find. id is generated client-side (local-first), deletes are soft so they sync.
create table if not exists pilz_pokedex.finds (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  species integer not null,            -- iNaturalist taxon id
  observed_on date not null,
  place text not null default '',
  lat double precision,
  lng double precision,
  note text not null default '',
  photo_path text,
  deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists finds_user_idx on pilz_pokedex.finds (user_id);
alter table pilz_pokedex.finds enable row level security;
drop policy if exists "own rows" on pilz_pokedex.finds;
create policy "own rows" on pilz_pokedex.finds
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on all tables in schema pilz_pokedex to authenticated;
grant all on all tables in schema pilz_pokedex to service_role;

-- Photos: private bucket, each user only touches their own folder "<user_id>/..."
insert into storage.buckets (id, name, public) values ('pilz_pokedex', 'pilz_pokedex', false)
  on conflict (id) do nothing;
drop policy if exists "pilz own photos" on storage.objects;
create policy "pilz own photos" on storage.objects
  for all to authenticated
  using (bucket_id = 'pilz_pokedex' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'pilz_pokedex' and (storage.foldername(name))[1] = auth.uid()::text);

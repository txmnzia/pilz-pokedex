-- Pilzdex v0.10.5: dex order preference (by number = default, or A to Z). Run once in the SQL editor. Safe to re-run.
-- Until this runs, the order is still saved, but on each device only (no error).
alter table pilz_pokedex.settings add column if not exists sort text not null default 'no' check (sort in ('no', 'az'));
notify pgrst, 'reload schema';

-- Pilzdex v0.9 (issue #1): up to 4 photos per find. Run once in the Supabase SQL editor. Safe to re-run.
-- photos = [{ "id": "<uuid>", "path": "<user>/<id>-<ms>.jpg" }, ...], cover first.
-- photo_path stays and always mirrors the cover, so older app versions keep working.
-- Until this runs, the app syncs the cover only (no error).
alter table pilz_pokedex.finds add column if not exists photos jsonb not null default '[]'::jsonb;
notify pgrst, 'reload schema';

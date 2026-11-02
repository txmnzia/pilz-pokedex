// Supabase sync. Local state is the source of truth for the UI; this only merges and pushes.
import { supabase, BUCKET } from "./supabase";
import { getPhoto } from "./local";
import { mergeFinds, photosOf } from "./finds";
import type { Find, FindPhoto } from "./types";
import { normalizePrefs, type Prefs } from "./prefs";

const COLS = "id,species,observed_on,place,lat,lng,note,photo_path,created_at,updated_at,deleted";
// photos column comes with migration 0003; until Sam runs it, sync the cover only (older schema keeps working)
let photosColumn = true;
const missingPhotos = (e: { message?: string; code?: string } | null) => !!e && (e.code === "PGRST204" || e.code === "42703" || /photos/.test(e.message ?? ""));

export async function sync(local: Find[], userId: string): Promise<Find[]> {
  if (!supabase) return local;
  let finds = local;
  // 1. upload photos of unsynced finds, then upsert their rows
  for (const f of finds.filter(x => !x.synced)) {
    const photos: FindPhoto[] = [];
    let failed = false;
    for (const p of photosOf(f)) {
      if (p.path || f.deleted) { photos.push(p); continue; }
      const blob = await getPhoto(p.id);
      if (!blob) { photos.push(p); continue; }
      const path = `${userId}/${p.id}-${Date.parse(f.updated_at) || 0}.jpg`; // new name per version: no stale caches
      const up = await supabase.storage.from(BUCKET).upload(path, blob, { upsert: true, contentType: "image/jpeg" });
      if (up.error) { failed = true; break; } // retry next sync
      photos.push({ ...p, path });
    }
    if (failed) continue;
    const { synced: _s, photos: _p, ...base } = f;
    const row: Record<string, unknown> = { ...base, photo_path: photos[0]?.path ?? null };
    let { error } = await supabase.from("finds").upsert(photosColumn ? { ...row, photos } : row);
    if (error && photosColumn && missingPhotos(error)) { photosColumn = false; ({ error } = await supabase.from("finds").upsert(row)); }
    if (!error) finds = finds.map(x => (x.id === f.id ? { ...x, photos, photo_path: photos[0]?.path ?? null, synced: true } : x));
  }
  // 2. pull everything and merge (merge never drops a local find)
  let res = await supabase.from("finds").select(photosColumn ? `${COLS},photos` : COLS);
  if (res.error && photosColumn && missingPhotos(res.error)) { photosColumn = false; res = await supabase.from("finds").select(COLS); }
  if (!res.error && res.data) finds = mergeFinds(finds, res.data as unknown as Find[]);
  return finds;
}

const urlCache = new Map<string, string>();
/** URL of one photo: the local blob if this device has it, else a signed URL of the uploaded file. */
export async function photoUrlOf(p: FindPhoto): Promise<string | null> {
  const blob = await getPhoto(p.id);
  if (blob) return URL.createObjectURL(blob);
  if (!p.path || !supabase) return null;
  if (urlCache.has(p.path)) return urlCache.get(p.path)!;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(p.path, 3600);
  if (data?.signedUrl) urlCache.set(p.path, data.signedUrl);
  return data?.signedUrl ?? null;
}
/** The cover photo of a find. */
export const photoUrl = (f: Find) => photoUrlOf(photosOf(f)[0]);

// ---------- preferences (table pilz_pokedex.settings, one row per user) ----------

/** Remote prefs, or null if none / table missing / offline. */
export async function pullPrefs(fallback: Prefs): Promise<Prefs | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from("settings").select("lang,mode,updated_at").maybeSingle();
  return error || !data ? null : normalizePrefs(data as Partial<Prefs>, fallback);
}
export async function pushPrefs(p: Prefs): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("settings").upsert({ lang: p.lang, mode: p.mode, updated_at: p.updated_at });
  return !error;
}

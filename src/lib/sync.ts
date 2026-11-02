// Supabase sync. Local state is the source of truth for the UI; this only merges and pushes.
import { supabase, BUCKET } from "./supabase";
import { getPhoto, makeThumb, putPhoto, thumbKey, thumbPath } from "./local";
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
      // thumbnail next to it (best effort: other devices fall back to the full photo and make their own)
      const t = await getPhoto(thumbKey(p.id, null)) ?? await makeThumb(blob);
      if (t) { await supabase.storage.from(BUCKET).upload(thumbPath(path), t, { upsert: true, contentType: "image/jpeg" }); await putPhoto(thumbKey(p.id, path), t); }
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
/** Small version for tiles, rows and keys: cached thumbnail, else made from the local photo, else the uploaded
 *  thumbnail, else (photos uploaded before thumbnails existed) the full photo once, shrunk and cached on this device. */
export async function thumbUrlOf(p: FindPhoto): Promise<string | null> {
  const key = thumbKey(p.id, p.path);
  const cached = await getPhoto(key);
  if (cached) return URL.createObjectURL(cached);
  const local = await getPhoto(p.id);
  if (local) {
    const t = await makeThumb(local);
    if (t) { await putPhoto(key, t); return URL.createObjectURL(t); }
    return URL.createObjectURL(local);
  }
  if (!p.path || !supabase) return null;
  const tp = thumbPath(p.path);
  if (urlCache.has(tp)) return urlCache.get(tp)!;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(tp, 3600);
  if (data?.signedUrl) { urlCache.set(tp, data.signedUrl); return data.signedUrl; }
  const full = await photoUrlOf(p);
  if (!full) return null;
  const blob = await fetch(full).then(r => r.blob()).catch(() => null);
  const t = blob && await makeThumb(blob);
  if (t) { await putPhoto(key, t); return URL.createObjectURL(t); }
  return full;
}
/** The cover photo of a find. */
export const photoUrl = (f: Find) => photoUrlOf(photosOf(f)[0]);

// ---------- preferences (table pilz_pokedex.settings, one row per user) ----------

/** Remote prefs, or null if none / table missing / offline. */
let sortColumn = true;
const missingCol = (e: { message?: string; code?: string }, col: string) => e.code === "PGRST204" || e.code === "42703" || (e.message ?? "").includes(col);
export async function pullPrefs(fallback: Prefs): Promise<Prefs | null> {
  if (!supabase) return null;
  // sort column comes with migration 0004; without it the sort pref stays on this device
  let res = await supabase.from("settings").select(sortColumn ? "lang,mode,sort,updated_at" : "lang,mode,updated_at").maybeSingle();
  if (res.error && sortColumn && missingCol(res.error, "sort")) { sortColumn = false; res = await supabase.from("settings").select("lang,mode,updated_at").maybeSingle(); }
  const { data, error } = res;
  return error || !data ? null : normalizePrefs({ sort: fallback.sort, ...(data as Partial<Prefs>) }, fallback);
}
export async function pushPrefs(p: Prefs): Promise<boolean> {
  if (!supabase) return false;
  const row: Record<string, unknown> = { lang: p.lang, mode: p.mode, updated_at: p.updated_at };
  let { error } = await supabase.from("settings").upsert(sortColumn ? { ...row, sort: p.sort } : row);
  if (error && sortColumn && missingCol(error, "sort")) { sortColumn = false; ({ error } = await supabase.from("settings").upsert(row)); }
  return !error;
}

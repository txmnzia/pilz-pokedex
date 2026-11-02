// Supabase sync. Local state is the source of truth for the UI; this only merges and pushes.
import { supabase, BUCKET } from "./supabase";
import { getPhoto } from "./local";
import { mergeFinds } from "./finds";
import type { Find } from "./types";
import { normalizePrefs, type Prefs } from "./prefs";

const COLS = "id,species,observed_on,place,lat,lng,note,photo_path,created_at,updated_at,deleted";

export async function sync(local: Find[], userId: string): Promise<Find[]> {
  if (!supabase) return local;
  let finds = local;
  // 1. upload photos of unsynced finds, then upsert their rows
  for (const f of finds.filter(x => !x.synced)) {
    let photo_path = f.photo_path;
    if (!photo_path && !f.deleted) {
      const blob = await getPhoto(f.id);
      if (blob) {
        const path = `${userId}/${f.id}-${Date.parse(f.updated_at) || 0}.jpg`; // new name per version: no stale caches
        const up = await supabase.storage.from(BUCKET).upload(path, blob, { upsert: true, contentType: "image/jpeg" });
        if (up.error) continue; // retry next sync
        photo_path = path;
      }
    }
    const { synced: _s, ...row } = { ...f, photo_path };
    const { error } = await supabase.from("finds").upsert(row);
    if (!error) finds = finds.map(x => (x.id === f.id ? { ...x, photo_path, synced: true } : x));
  }
  // 2. pull everything and merge (merge never drops a local find)
  const { data, error } = await supabase.from("finds").select(COLS);
  if (!error && data) finds = mergeFinds(finds, data as Find[]);
  return finds;
}

const urlCache = new Map<string, string>();
export async function photoUrl(f: Find): Promise<string | null> {
  const blob = await getPhoto(f.id);
  if (blob) return URL.createObjectURL(blob);
  if (!f.photo_path || !supabase) return null;
  if (urlCache.has(f.photo_path)) return urlCache.get(f.photo_path)!;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(f.photo_path, 3600);
  if (data?.signedUrl) urlCache.set(f.photo_path, data.signedUrl);
  return data?.signedUrl ?? null;
}

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

// Pure find-collection logic. Merge never drops a find: newer updated_at wins per id.
import type { Find, FindPhoto } from "./types";

/** Photos per find (issue #1: up to 4, the first is the cover). */
export const MAX_PHOTOS = 4;
/** All photos of a find, cover first. Finds from before v0.9 have one photo stored under the find id. */
export function photosOf(f: Find): FindPhoto[] {
  return f.photos?.length ? f.photos : [{ id: f.id, path: f.photo_path }];
}
/** Mark one photo for re-upload (after a re-crop); the cover also clears photo_path. */
export function touchPhoto(f: Find, photoId: string, now = new Date()): Find {
  const photos = photosOf(f).map(p => (p.id === photoId ? { ...p, path: null } : p));
  return { ...f, photos, photo_path: photos[0].path, synced: false, updated_at: now.toISOString() };
}

export function mergeFinds(local: Find[], remote: Find[]): Find[] {
  const out = new Map<string, Find>();
  for (const f of local) out.set(f.id, f);
  for (const r of remote) {
    const l = out.get(r.id);
    // a server without the photos column (migration 0003 not run) sends no photos: keep the local list
    if (!l || r.updated_at >= l.updated_at) out.set(r.id, { ...r, photos: r.photos?.length ? r.photos : l?.photos, synced: true });
  }
  return [...out.values()].sort((a, b) => b.observed_on.localeCompare(a.observed_on) || b.created_at.localeCompare(a.created_at));
}

export const live = (finds: Find[]) => finds.filter(f => !f.deleted);

export function findsBySpecies(finds: Find[]): Map<number, Find[]> {
  const m = new Map<number, Find[]>();
  for (const f of live(finds)) {
    const a = m.get(f.species);
    if (a) a.push(f); else m.set(f.species, [f]);
  }
  return m;
}

export function newFind(species: number, fields: Partial<Find> = {}, now = new Date()): Find {
  const iso = now.toISOString();
  return {
    id: crypto.randomUUID(), species, observed_on: iso.slice(0, 10), place: "", lat: null, lng: null,
    note: "", photo_path: null, created_at: iso, updated_at: iso, deleted: false, synced: false, ...fields,
  };
}

/** Soft delete so the deletion syncs to other devices. */
export const deleteFind = (f: Find, now = new Date()): Find => ({ ...f, deleted: true, synced: false, updated_at: now.toISOString() });

/** Parse an exported backup (array of finds). Invalid entries are skipped; restored finds re-sync. */
export function parseBackup(json: string): Find[] {
  const raw: unknown = JSON.parse(json);
  if (!Array.isArray(raw)) throw new Error("not a Pilzdex backup");
  return raw
    .filter((f): f is Partial<Find> & Pick<Find, "id" | "species" | "observed_on"> => !!f && typeof f === "object" && typeof f.id === "string" && typeof f.species === "number" && typeof f.observed_on === "string")
    .map((f): Find => ({
      place: "", note: "", lat: null, lng: null, photo_path: null, deleted: false,
      created_at: f.observed_on, updated_at: f.observed_on, ...f, synced: false,
    }));
}

/** Restore: add backup finds that are missing or newer locally, flagged unsynced so they upload. */
export function restoreInto(local: Find[], backup: Find[]): Find[] {
  const byId = new Map(local.map(f => [f.id, f]));
  for (const b of backup) {
    const l = byId.get(b.id);
    if (!l || b.updated_at > l.updated_at) byId.set(b.id, { ...b, synced: false });
  }
  return [...byId.values()].sort((a, b) => b.observed_on.localeCompare(a.observed_on));
}

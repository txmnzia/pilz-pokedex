// Pure find-collection logic. Merge never drops a find: newer updated_at wins per id.
import type { Find } from "./types";

export function mergeFinds(local: Find[], remote: Find[]): Find[] {
  const out = new Map<string, Find>();
  for (const f of local) out.set(f.id, f);
  for (const r of remote) {
    const l = out.get(r.id);
    if (!l || r.updated_at >= l.updated_at) out.set(r.id, { ...r, synced: true });
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

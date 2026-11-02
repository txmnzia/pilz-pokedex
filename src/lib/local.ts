// Browser persistence: localStorage for small state, IndexedDB for photo blobs. Every access fails soft.
import type { Find } from "./types";

export const store = {
  get<T>(k: string, d: T): T {
    try { const v = localStorage.getItem(k); return v == null ? d : (JSON.parse(v) as T); } catch { return d; }
  },
  set(k: string, v: unknown) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* quota or private mode */ }
  },
};

export const loadFinds = () => store.get<Find[]>("pz.finds", []);
export const saveFinds = (f: Find[]) => store.set("pz.finds", f);

const DB = "pilz-photos", OS = "photos";
function db(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(OS);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  try {
    const d = await db();
    return await new Promise<T>((res, rej) => {
      const req = fn(d.transaction(OS, mode).objectStore(OS));
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
  } catch { return undefined; }
}
export const putPhoto = (id: string, b: Blob) => tx("readwrite", s => s.put(b, id));
export const getPhoto = (id: string) => tx<Blob>("readonly", s => s.get(id));
export const delPhoto = (id: string) => tx("readwrite", s => s.delete(id));

/** Downscale to max 1600px JPEG so uploads stay small on mobile data. */
export async function compress(file: Blob, max = 1600, quality = 0.82): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise<Blob>(res => c.toBlob(b => res(b || file), "image/jpeg", quality));
  } catch { return file; }
}

/** Thumbnail for grid / list / keys (tiles were slow with full 1600 px photos). 480 px short side: a ~160 CSS px tile
 *  on a 3x iPhone screen is ~480 device px, so it stays sharp; ~30-40 KB instead of ~300-500 KB. */
export const THUMB = 480;
export const thumbKey = (photoId: string, path: string | null) => `t:${path ?? photoId}`; // path changes per re-crop: never stale
export const thumbPath = (path: string) => path.replace(/\.jpg$/, "-t.jpg");
export async function makeThumb(src: Blob): Promise<Blob | null> {
  try {
    const bmp = await createImageBitmap(src);
    const k = Math.min(1, THUMB / Math.min(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    const g = c.getContext("2d")!; g.imageSmoothingQuality = "high";
    g.drawImage(bmp, 0, 0, c.width, c.height); bmp.close();
    return await new Promise<Blob | null>(res => c.toBlob(b => res(b), "image/jpeg", 0.8));
  } catch { return null; }
}

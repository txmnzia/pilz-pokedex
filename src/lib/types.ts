export type Lang = "fr" | "en" | "de";
export const LANGS: Lang[] = ["fr", "en", "de"];
export type Edibility = "edible" | "none" | "toxic" | "deadly";

export interface Label { qid: string; fr?: string; en?: string; de?: string }
export type MorphKey = "hymenium" | "cap" | "attachment" | "stipe" | "spores" | "ecology";

export interface Species {
  no: number | null;
  ex?: number;
  extra: boolean;
  inat: number;
  latin: string;
  wikidata?: string;
  names: Record<Lang, string>;
  edibility: Edibility | null;
  edibilityConflict?: boolean;
  edibilitySource: string[];
  edibilityOverride?: string;
  morph: Partial<Record<MorphKey, Label[]>>;
  text: Partial<Record<Lang, { intro: string; habitat: string; url: string }>>;
  season: { histogram: number[]; months: number[] };
  regions: { berlin: number; grenoble: number };
  lookalikes: number[];
  /** Off-dex species the photo model knows (v0.12.0): R number in order of first catch (0 = not caught yet). */
  rare?: number;
  wiki?: Partial<Record<Lang, string>>;
}

/** public/data/rares.json entry (scripts/scrape-rares.mjs). */
export interface RareEntry { inat: number; latin: string; names: Record<Lang, string>; nameSource: Record<Lang, string>; wiki?: Partial<Record<Lang, string>> }

export interface SpeciesFile {
  generatedAt: string;
  sources: Record<string, string>;
  species: Species[];
}

/** One photo of a find. id = IndexedDB key of the local blob (the cover keeps the find id, as before v0.9). */
export interface FindPhoto { id: string; path: string | null }

/** One photographed find. Local-first: mirrored to localStorage, synced to Supabase. */
export interface Find {
  id: string;
  species: number; // iNaturalist taxon id
  observed_on: string; // YYYY-MM-DD
  place: string;
  lat: number | null;
  lng: number | null;
  note: string;
  photo_path: string | null; // storage path of the cover once uploaded (kept for older app versions)
  photos?: FindPhoto[]; // all photos, cover first, max MAX_PHOTOS; absent on finds made before v0.9
  created_at: string;
  updated_at: string;
  deleted: boolean;
  synced?: boolean; // local only
}

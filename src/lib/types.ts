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
}

export interface SpeciesFile {
  generatedAt: string;
  sources: Record<string, string>;
  species: Species[];
}

/** One photographed find. Local-first: mirrored to localStorage, synced to Supabase. */
export interface Find {
  id: string;
  species: number; // iNaturalist taxon id
  observed_on: string; // YYYY-MM-DD
  place: string;
  lat: number | null;
  lng: number | null;
  note: string;
  photo_path: string | null; // storage path once uploaded
  created_at: string;
  updated_at: string;
  deleted: boolean;
  synced?: boolean; // local only
}

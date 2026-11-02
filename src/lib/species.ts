// Pure helpers over the scraped species data. No DOM, covered by tests.
import type { Lang, Species } from "./types";

export type Shape =
  | "amanita" | "bolete" | "funnel" | "morel" | "parasol" | "tuft" | "bracket" | "gilled"
  | "inkcap" | "puffball" | "stinkhorn" | "cage" | "starfish" | "hoof" | "rosette" | "ear" | "saddle" | "oyster";

// Species whose look differs from the rest of their genus (checked before the genus).
// Clathrus archeri (octopus stinkhorn) opens into 4 to 7 red arms, not a lattice ball like Clathrus ruber.
const SPECIES_SHAPE: Record<string, Shape> = { "Clathrus archeri": "starfish" };

// Illustration choice per genus where morphology data is missing or misleading.
const GENUS_SHAPE: Record<string, Shape> = {
  Clathrus: "cage", Phallus: "stinkhorn", Mutinus: "stinkhorn",
  Lycoperdon: "puffball", Calvatia: "puffball", Bovista: "puffball", Scleroderma: "puffball",
  Auricularia: "ear", Helvella: "saddle", Morchella: "morel", Gyromitra: "morel",
  Coprinus: "inkcap", Coprinopsis: "inkcap",
  Pleurotus: "oyster", Hohenbuehelia: "oyster", Schizophyllum: "oyster",
  Hypholoma: "tuft", Kuehneromyces: "tuft", Galerina: "tuft", Armillaria: "tuft",
  Macrolepiota: "parasol", Lepiota: "parasol", Chlorophyllum: "parasol",
  // tree polypores: thin shelves / one thick hoof / overlapping wavy tiers
  Trametes: "bracket", Bjerkandera: "bracket", Stereum: "bracket", Lenzites: "bracket", Hapalopilus: "bracket", Amylocystis: "bracket",
  Fomes: "hoof", Fomitopsis: "hoof", Phellinus: "hoof", Ganoderma: "hoof", Laricifomes: "hoof", Heterobasidion: "hoof",
  Ischnoderma: "hoof", Fistulina: "hoof",
  Laetiporus: "rosette", Meripilus: "rosette",
};
const Q = {
  pores: "Q19861549", gleba: "Q2034230", noCap: "Q19887965", offset: "Q14544541",
  funnel: "Q19887958", depressed: "Q19887955", conical: "Q19887954",
  ring: "Q14544582", ringVolva: "Q19887987", volva: "Q19887985",
};

export function shapeOf(sp: Pick<Species, "latin" | "morph">): Shape {
  if (SPECIES_SHAPE[sp.latin]) return SPECIES_SHAPE[sp.latin];
  const genus = sp.latin.split(" ")[0];
  if (GENUS_SHAPE[genus]) return GENUS_SHAPE[genus];
  const has = (k: keyof Species["morph"], q: string) => (sp.morph[k] || []).some(l => l.qid === q);
  if (has("hymenium", Q.gleba)) return "puffball";
  if (has("hymenium", Q.pores)) return has("cap", Q.noCap) || has("cap", Q.offset) || !sp.morph.stipe ? "bracket" : "bolete";
  if (has("cap", Q.funnel) || has("cap", Q.depressed)) return "funnel";
  if (has("stipe", Q.ringVolva) || has("stipe", Q.volva)) return "amanita";
  if (has("cap", Q.conical)) return "inkcap";
  return "gilled";
}

const MONTHS: Record<Lang, string[]> = {
  fr: ["JANV", "FÉVR", "MARS", "AVR", "MAI", "JUIN", "JUIL", "AOÛT", "SEPT", "OCT", "NOV", "DÉC"],
  en: ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"],
  de: ["JAN", "FEB", "MÄR", "APR", "MAI", "JUN", "JUL", "AUG", "SEP", "OKT", "NOV", "DEZ"],
};
/** [9,10,11] -> "SEP–NOV"; wraps around the year: [1,2,11,12] -> "NOV–FEB"; all 12 -> null (all year). */
export function seasonLabel(months: number[], lang: Lang = "en"): string | null {
  const M = MONTHS[lang];
  if (!months.length) return "";
  if (months.length === 12) return null;
  const set = new Set(months);
  const runs: [number, number][] = [];
  let start = months.find(m => !set.has(((m + 10) % 12) + 1)) ?? months[0]; // a month whose predecessor is absent
  for (let i = 0, m = start; i < 12; i++, m = (m % 12) + 1) {
    if (!set.has(m)) continue;
    const prev = ((m + 10) % 12) + 1;
    if (runs.length && runs[runs.length - 1][1] === prev) runs[runs.length - 1][1] = m;
    else runs.push([m, m]);
  }
  return runs.map(([a, b]) => (a === b ? M[a - 1] : `${M[a - 1]}–${M[b - 1]}`)).join(", ");
}

export const dexLabel = (sp: Pick<Species, "no" | "ex">) =>
  sp.no != null ? `No. ${String(sp.no).padStart(3, "0")}` : `EX-${String(sp.ex).padStart(2, "0")}`;
export const shortNo = (sp: Pick<Species, "no" | "ex">) =>
  sp.no != null ? String(sp.no).padStart(3, "0") : `EX${sp.ex}`;

/** Declared lookalikes plus reverse links (species that list this one), dangerous first. */
export function lookalikesOf(sp: Species, all: Species[]): Species[] {
  const byId = new Map(all.map(s => [s.inat, s]));
  const ids = new Set(sp.lookalikes);
  for (const s of all) if (s.lookalikes.includes(sp.inat)) ids.add(s.inat);
  ids.delete(sp.inat);
  const danger = { deadly: 0, toxic: 1, none: 3, edible: 4 } as const;
  return [...ids].map(id => byId.get(id)).filter((s): s is Species => !!s)
    .sort((a, b) => (a.edibility ? danger[a.edibility] : 2) - (b.edibility ? danger[b.edibility] : 2));
}

/** Text in the wanted language, else the first available, with the language it came from. */
export function textFor(sp: Species, lang: Lang) {
  for (const l of [lang, "en", "fr", "de"] as Lang[]) {
    const t = sp.text[l];
    if (t?.intro) return { ...t, lang: l };
  }
  return null;
}

/** Habitat sentence in the wanted language, else any language. */
export function habitatFor(sp: Species, lang: Lang) {
  for (const l of [lang, "en", "fr", "de"] as Lang[]) {
    const h = sp.text[l]?.habitat;
    if (h) return { text: h, lang: l };
  }
  return null;
}

export const labelIn = (l: { fr?: string; en?: string; de?: string }, lang: Lang) =>
  (l[lang] || l.en || l.fr || l.de || "").replace(/ (mushroom cap|stipe|hymenium attachment)$/, "");

/** Observations within 50 km below this are treated as "not really found there". */
export const REGION_MIN_OBS = 3;

/** A to Z by the name in the UI language (accents and case ignored). Returns a new array. */
export function sortByName<T extends Pick<Species, "names">>(list: readonly T[], lang: Lang): T[] {
  const c = new Intl.Collator(lang, { sensitivity: "base", numeric: true });
  return [...list].sort((a, b) => c.compare(a.names[lang], b.names[lang]));
}

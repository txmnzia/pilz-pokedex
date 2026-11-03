// Pure helpers over the scraped species data. No DOM, covered by tests.
import type { Find, Lang, RareEntry, Species } from "./types";

export type Shape =
  | "amanita" | "bolete" | "leccinum" | "suillus" | "gilled" | "russula" | "cortinarius" | "parasol" | "shaggy" | "bell" | "tuft" | "funnel" | "chanterelle" | "trumpet" | "hedgehog" | "morel" | "brain" | "saddle" | "pear" | "ball" | "earthball" | "stinkhorn" | "dogstink" | "cage" | "starfish" | "ear" | "jelly" | "cup" | "coral" | "cauliflower" | "icicles" | "nest" | "oyster" | "hoof" | "bracket" | "rosette" | "crust";

// Species whose look differs from the rest of their genus (checked before the genus).
// Clathrus archeri (octopus stinkhorn) opens into 4 to 7 red arms, not a lattice ball like Clathrus ruber.
// Craterellus tubaeformis (winter chanterelle) looks like a chanterelle, not like its black-trumpet genus mate.
// Collybia rivulosa / dealbata were Clitocybe until recently: funnel-shaped, unlike the blewit in the same genus now.
const SPECIES_SHAPE: Record<string, Shape> = {
  "Clathrus archeri": "starfish", "Craterellus tubaeformis": "chanterelle", "Craterellus lutescens": "chanterelle",
  "Collybia rivulosa": "funnel", "Collybia dealbata": "funnel",
  "Hygrocybe conica": "bell", // conical waxcap: a pointed bell, unlike the other waxcaps
};

// Illustration choice per genus where morphology data is missing or misleading.
const GENUS_SHAPE: Record<string, Shape> = {
  Amanita: "amanita",
  Boletus: "bolete", Imleria: "bolete", Neoboletus: "bolete", Suillellus: "bolete", Rubroboletus: "bolete", Caloboletus: "bolete", Tylopilus: "bolete", Xerocomellus: "bolete", Xerocomus: "bolete", Strobilomyces: "bolete", Chalciporus: "bolete", Lanmaoa: "bolete", Hortiboletus: "bolete", Aureoboletus: "bolete", Cyanoboletus: "bolete", Butyriboletus: "bolete", Hemileccinum: "bolete", Baorangia: "bolete", Porphyrellus: "bolete", Gyroporus: "bolete",
  Leccinum: "leccinum", Leccinellum: "leccinum",
  Suillus: "suillus",
  Agaricus: "gilled", Tricholoma: "gilled", Entoloma: "gilled", Pluteus: "gilled", Volvopluteus: "gilled", Calocybe: "gilled", Cuphophyllus: "gilled", Hygrocybe: "gilled", Hygrophorus: "gilled", Stropharia: "gilled", Marasmius: "gilled", Megacollybia: "gilled", Oudemansiella: "gilled", Laccaria: "gilled", Tricholomopsis: "gilled", Leucopaxillus: "gilled", Lepista: "gilled", Collybia: "gilled", Gymnopus: "gilled", Rhodocollybia: "gilled", Melanoleuca: "gilled", Lyophyllum: "gilled", Agrocybe: "gilled", Hypsizygus: "gilled",
  Russula: "russula",
  Cortinarius: "cortinarius", Inocybe: "cortinarius", Inosperma: "cortinarius", Hebeloma: "cortinarius",
  Macrolepiota: "parasol", Chlorophyllum: "parasol", Lepiota: "parasol", Echinoderma: "parasol", Leucoagaricus: "parasol", Cystolepiota: "parasol",
  Coprinus: "shaggy", Coprinopsis: "shaggy",
  Mycena: "bell", Leotia: "bell", Baeospora: "bell", Pholiotina: "bell", Conocybe: "bell", Bolbitius: "bell", Panaeolus: "bell", Mycetinis: "bell", Auriscalpium: "bell", Psilocybe: "bell", Deconica: "bell", Parasola: "bell", Hemimycena: "bell", Atheniella: "bell",
  Hypholoma: "tuft", Xeromphalina: "tuft", Kuehneromyces: "tuft", Armillaria: "tuft", Pholiota: "tuft", Coprinellus: "tuft", Galerina: "tuft", Gymnopilus: "tuft", Flammulina: "tuft", Desarmillaria: "tuft",
  Clitocybe: "funnel", Arrhenia: "funnel", Faerberia: "funnel", Infundibulicybe: "funnel", Lactarius: "funnel", Lactifluus: "funnel", Paxillus: "funnel", Tapinella: "funnel", Ampulloclitocybe: "funnel", Pseudoclitocybe: "funnel",
  Cantharellus: "chanterelle", Hygrophoropsis: "chanterelle", Omphalotus: "chanterelle", Pseudocraterellus: "chanterelle",
  Craterellus: "trumpet", Gomphus: "trumpet", Turbinellus: "trumpet",
  Hydnum: "hedgehog", Sarcodon: "hedgehog", Hydnellum: "hedgehog",
  Morchella: "morel", Verpa: "morel", Mitrophora: "morel",
  Gyromitra: "brain", Discina: "brain",
  Helvella: "saddle",
  Lycoperdon: "pear", Apioperdon: "pear",
  Calvatia: "ball", Bovista: "ball", Langermannia: "ball",
  Scleroderma: "earthball", Pisolithus: "earthball",
  Phallus: "stinkhorn",
  Mutinus: "dogstink",
  Clathrus: "cage",
  Auricularia: "ear",
  Tremella: "jelly", Naematelia: "jelly", Pseudohydnum: "jelly", Dacrymyces: "jelly", Exidia: "jelly",
  Aleuria: "cup", Peziza: "cup", Otidea: "cup", Sarcoscypha: "cup", Scutellinia: "cup", Tarzetta: "cup", Paragalactinia: "cup",
  Ramaria: "coral", Clavulina: "coral", Calocera: "coral", Clavaria: "coral", Clavulinopsis: "coral", Artomyces: "coral",
  Sparassis: "cauliflower",
  Hericium: "icicles",
  Cyathus: "nest", Crucibulum: "nest",
  Pleurotus: "oyster", Panus: "oyster", Panellus: "oyster", Phyllotopsis: "oyster", Schizophyllum: "oyster", Hohenbuehelia: "oyster", Crepidotus: "oyster", Lentinus: "oyster", Neolentinus: "oyster",
  Fomes: "hoof", Fomitopsis: "hoof", Phellinus: "hoof", Phellinopsis: "hoof", Porodaedalea: "hoof", Ganoderma: "hoof", Laricifomes: "hoof", Heterobasidion: "hoof", Ischnoderma: "hoof", Fistulina: "hoof", Inonotus: "hoof", Piptoporus: "hoof", Buglossoporus: "hoof",
  Trametes: "bracket", Bjerkandera: "bracket", Daedaleopsis: "bracket", Daedalea: "bracket", Cerioporus: "bracket", Polyporus: "bracket", Lenzites: "bracket", Hapalopilus: "bracket", Amylocystis: "bracket", Cerrena: "bracket", Trichaptum: "bracket", Gloeophyllum: "bracket", Postia: "bracket", Climacocystis: "bracket", Fuscoporia: "bracket",
  Laetiporus: "rosette", Meripilus: "rosette", Grifola: "rosette", Phaeolus: "rosette", Bondarzewia: "rosette",
  Stereum: "crust", Serpula: "crust", Amylostereum: "crust", Phlebia: "crust", Chondrostereum: "crust", Hymenochaete: "crust", Xylobolus: "crust",
  // v0.14.0: genera of the 61 model species added to the dex and the new rares
  Rickenella: "bell", Marasmiellus: "bell", Gliophorus: "bell",
  Sarcomyxa: "oyster",
  Lacrymaria: "gilled", Leratiomyces: "gilled", Tubaria: "gilled", Volvariella: "gilled",
  Picipes: "funnel",
  Astraeus: "starfish", Geastrum: "starfish",
  Neofavolus: "bracket", Climacodon: "bracket",
  Myxarium: "jelly", Phaeotremella: "jelly", Ascocoryne: "jelly",
  Pseudoinonotus: "hoof",
  Abortiporus: "rosette",
  Leucocoprinus: "parasol",
  Urnula: "cup", Bulgaria: "cup", Chlorociboria: "cup", Calycina: "cup",
  Battarrea: "stinkhorn",
  Irpex: "crust", Merulius: "crust", Kretzschmaria: "crust",
  Xylaria: "dogstink",
  Hypomyces: "bolete",
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
  if (has("hymenium", Q.gleba)) return "pear";
  if (has("hymenium", Q.pores)) return has("cap", Q.noCap) || has("cap", Q.offset) || !sp.morph.stipe ? "bracket" : "bolete";
  if (has("cap", Q.funnel) || has("cap", Q.depressed)) return "funnel";
  if (has("stipe", Q.ringVolva) || has("stipe", Q.volva)) return "amanita";
  if (has("cap", Q.conical)) return "bell";
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

export const dexLabel = (sp: Pick<Species, "no" | "ex" | "rare">) =>
  sp.rare != null ? (sp.rare ? `R-${String(sp.rare).padStart(2, "0")}` : "R") :
  sp.no != null ? `No. ${String(sp.no).padStart(3, "0")}` : `EX-${String(sp.ex).padStart(2, "0")}`;
export const shortNo = (sp: Pick<Species, "no" | "ex" | "rare">) =>
  sp.rare != null ? (sp.rare ? `R${String(sp.rare).padStart(2, "0")}` : "R") : sp.no != null ? String(sp.no).padStart(3, "0") : `EX${sp.ex}`;

/** Rares as minimal species (v0.12.0): name only, no data, edibility always unknown. Caught ones get R-01, R-02... in
 *  the order they were first added (created_at of their oldest live find), so numbers never shift. */
export function rareSpecies(rares: RareEntry[], finds: Pick<Find, "species" | "created_at" | "deleted">[]): Species[] {
  const first = new Map<number, string>();
  for (const f of finds) if (!f.deleted) { const c = first.get(f.species); if (!c || f.created_at < c) first.set(f.species, f.created_at); }
  const order = rares.filter(r => first.has(r.inat)).sort((a, b) => first.get(a.inat)!.localeCompare(first.get(b.inat)!) || a.latin.localeCompare(b.latin));
  const num = new Map(order.map((r, i) => [r.inat, i + 1]));
  return rares.map(r => ({
    no: null, extra: true, rare: num.get(r.inat) ?? 0, inat: r.inat, latin: r.latin, names: r.names, wiki: r.wiki,
    edibility: null, edibilitySource: [], morph: {}, text: {}, season: { histogram: new Array(12).fill(0), months: [] },
    regions: { berlin: 0, grenoble: 0 }, lookalikes: [],
  }));
}

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

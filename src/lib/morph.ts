// Short labels for the Wikidata morphology values (v0.11.0, Sam: one word per characteristic, like the edibility
// badges). Keyed by Wikidata QID so it works in every language. Written in capitals WITHOUT accents on purpose: the
// pixel font squashes accented capitals (see CLAUDE.md), umlauts too: German uses OE/UE/AE here.
// This is presentation vocabulary, not species data.
import type { Lang } from "./types";

type T = [fr: string, en: string, de: string];
const SHORT: Record<string, T> = {
  // spore print colours
  Q23444: ["BLANC", "WHITE", "WEISS"], Q47071: ["BRUN", "BROWN", "BRAUN"], Q19888352: ["OLIVE BRUN", "OLIVE BROWN", "OLIVBRAUN"],
  Q2730433: ["CREME", "CREAM", "CREME"], Q864152: ["OLIVE", "OLIVE", "OLIV"], Q943: ["JAUNE", "YELLOW", "GELB"],
  Q23445: ["NOIR", "BLACK", "SCHWARZ"], Q429220: ["ROSE", "PINK", "ROSA"], Q19888339: ["BRUN-NOIR", "DARK BROWN", "SCHWARZBRAUN"],
  Q194191: ["OCRE", "OCHRE", "OCKER"], Q1670336: ["FAUVE", "TAN", "LOHFARBEN"], Q2085487: ["CHAMOIS", "BUFF", "GELBBRAUN"],
  Q10859033: ["BORDEAUX", "BORDEAUX", "BORDEAUX"], Q19888373: ["VIOLET-NOIR", "PURPLE-BLACK", "PURPURSCHWARZ"],
  Q3133: ["VERT", "GREEN", "GRUEN"], Q2015138: ["SAUMON", "SALMON", "LACHS"],
  // cap
  Q14544535: ["CONVEXE", "CONVEX", "GEWOELBT"], Q19887957: ["PLAT", "FLAT", "FLACH"], Q19887965: ["AUCUN", "NONE", "OHNE"],
  Q62023127: ["BOMBE", "DOMED", "HALBKUGEL"], Q19887955: ["CREUSE", "DEPRESSED", "VERTIEFT"], Q19887954: ["CONIQUE", "CONICAL", "KEGELIG"],
  Q19887958: ["ENTONNOIR", "FUNNEL", "TRICHTER"], Q14544541: ["LATERAL", "OFFSET", "SEITLICH"], Q19887964: ["MAMELON", "UMBONATE", "GEBUCKELT"],
  Q19887961: ["OVOIDE", "OVATE", "EIFOERMIG"], Q19887953: ["CLOCHE", "BELL", "GLOCKIG"],
  // hymenium
  Q269345: ["LAMES", "GILLS", "LAMELLEN"], Q19861549: ["PORES", "PORES", "POREN"], Q19861550: ["LISSE", "SMOOTH", "GLATT"],
  Q2034230: ["GLEBA", "GLEBA", "GLEBA"], Q19861552: ["AIGUILLONS", "TEETH", "STACHELN"], Q19861551: ["PLIS", "RIDGES", "LEISTEN"],
  // stem
  Q14544581: ["NU", "BARE", "OHNE RING"], Q14544582: ["ANNEAU", "RING", "RING"], Q19887987: ["ANNEAU+VOLVE", "RING+VOLVA", "RING+VOLVA"],
  Q19887985: ["VOLVE", "VOLVA", "VOLVA"], Q19887988: ["CORTINE", "CORTINA", "CORTINA"], Q131915205: ["RETICULE", "NETTED", "GENETZT"],
  // ecology
  Q114750: ["SAPROPHYTE", "SAPROBE", "SAPROBIONT"], Q99974: ["MYCORHIZE", "MYCORRHIZA", "MYKORRHIZA"], Q186517: ["PARASITE", "PARASITE", "PARASIT"],
  Q357006: ["PREDATEUR", "PREDATOR", "RAEUBER"],
};
/** Real colour of the spore print, shown as a swatch (that is what you compare in the field). */
export const SPORE_COLOR: Record<string, string> = {
  Q23444: "#f4f1e6", Q47071: "#7a5230", Q19888352: "#6f6a3a", Q2730433: "#efe2bd", Q864152: "#7d7d3b", Q943: "#e8c84a",
  Q23445: "#1c1c1c", Q429220: "#e8a7a0", Q19888339: "#3e2a1c", Q194191: "#c9903a", Q1670336: "#c8a77a", Q2085487: "#d9b98c",
  Q10859033: "#6a1f2b", Q19888373: "#2e1c33", Q3133: "#5b8a3a", Q2015138: "#f0a080",
};
const LI: Record<Lang, number> = { fr: 0, en: 1, de: 2 };
const plain = (s: string) => s.normalize("NFD").replace(/[̀-̧́̂̈]/g, m => (m === "̈" ? m : "")).normalize("NFC").toUpperCase();

/** One short word for a morphology value; unknown values fall back to the Wikidata label (never dropped). */
export function shortMorph(l: { qid: string; fr?: string; en?: string; de?: string }, lang: Lang): string {
  const t = SHORT[l.qid];
  if (t) return t[LI[lang]];
  return plain(l[lang] || l.en || l.fr || l.de || l.qid);
}
export const knownMorph = (qid: string) => qid in SHORT;

// Scrapes the "rares": species the photo model knows (European labels) that are not in the Pilzdex data, so a find
// can be saved even off-dex (v0.12.0, Sam). Names only, from the same sources as the dex: iNaturalist localized
// common names, then Wikidata common names / labels; Latin when no source has a name. Lichens etc. are excluded
// (only Agaricomycetes + Pezizomycetes, like the dex). Nothing is hand-written.
// Usage: NODE_USE_ENV_PROXY=1 node scripts/scrape-rares.mjs   -> writes public/data/rares.json
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const UA = "pilz-pokedex/0.1 (https://github.com/txmnzia/pilz-pokedex)";
const CACHE = ".cache";
const LANGS = ["fr", "en", "de"];
const MUSHROOMS = [50814, 152032]; // Agaricomycetes, Pezizomycetes
// Sam (v0.14.0): also these visible forest fungi from other classes (jelly fungi, Xylaria, discos...); plant diseases
// (rusts, tar spot, Nectria) and lichens stay out.
const ALSO = new Set(["Calocera cornea", "Calocera viscosa", "Phaeotremella foliacea", "Xylaria hypoxylon", "Xylaria polymorpha",
  "Bulgaria inquinans", "Chlorociboria aeruginascens", "Ascocoryne sarcoides", "Calycina citrina", "Kretzschmaria deusta", "Hypomyces chrysospermus"]);
const last = {};
async function get(url) {
  const file = `${CACHE}/${createHash("sha1").update(url).digest("hex")}.json`;
  try { return JSON.parse(await readFile(file, "utf8")); } catch {}
  const host = new URL(url).host;
  for (let attempt = 0; attempt < 20; attempt++) {
    const wait = (last[host] || 0) + 1100 - Date.now();
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    last[host] = Date.now();
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
    if (res.status === 429 || res.status >= 500) { await new Promise(r => setTimeout(r, 3000 * (attempt + 1))); continue; }
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    const body = await res.json();
    await mkdir(CACHE, { recursive: true }); await writeFile(file, JSON.stringify(body));
    return body;
  }
  throw new Error(`gave up: ${url}`);
}
const qs = o => new URLSearchParams(o).toString();
// v0.15.2 (Sam): candidates = species the photo model (FungiTastic) knows that are not in the Pilzdex data, mushroom
// classes only (+ ALSO), with at least MIN_OBS research-grade observations in France + Germany ("common here").
// Every rare from an earlier list is kept (finds may point to it).
const MIN_OBS = 20;
const dexIds = new Set(JSON.parse(await readFile("public/data/species.json", "utf8")).species.map(s => s.inat));
const ftMap = JSON.parse(await readFile("data/model-maps/fungitastic.json", "utf8")); // model label -> iNat id
const modelIds = new Map();
for (const [label, id] of Object.entries(ftMap)) if (id && !dexIds.has(id)) (modelIds.get(id) ?? modelIds.set(id, []).get(id)).push(label);
const counts = new Map();
for (let page = 1; page < 40; page++) {
  const r = await get(`https://api.inaturalist.org/v1/observations/species_counts?${qs({ place_id: "6753,7207", taxon_id: 47170, quality_grade: "research", per_page: 500, page })}`);
  for (const x of r.results) counts.set(x.taxon.id, x);
  if (r.results.length < 500) break;
}
let previous = [];
try { previous = JSON.parse(await readFile("public/data/rares.json", "utf8")).rares; } catch {}
const keep = new Set(previous.map(e => e.inat));
const cands = [...new Set([...modelIds.keys(), ...keep])].filter(id => {
  if (dexIds.has(id)) return false;
  if (keep.has(id)) return true;
  const c = counts.get(id);
  if (!c) return false;
  return (ALSO.has(c.taxon.name) || c.taxon.ancestor_ids?.some(a => MUSHROOMS.includes(a))) && c.count >= MIN_OBS;
});
const out = [];
for (let i = 0; i < cands.length; i += 30) {
  const ids = cands.slice(i, i + 30);
  const by = {};
  for (const lang of LANGS) {
    const r = await get(`https://api.inaturalist.org/v1/taxa/${ids.join(",")}?${qs({ locale: lang, per_page: 30 })}`);
    for (const t of r.results) {
      const e = by[t.id] ??= { inat: t.id, latin: t.name, modelLatin: (modelIds.get(t.id) ?? [t.name]).join(" / "), obsFrDe: counts.get(t.id)?.count ?? 0, names: {}, nameSource: {} };
      const n = t.preferred_common_name;
      if (n) { e.names[lang] = n.charAt(0).toUpperCase() + n.slice(1); e.nameSource[lang] = "inaturalist"; }
    }
  }
  out.push(...Object.values(by));
  process.stdout.write(".");
}
// Wikidata: common names (P1843) and Wikipedia links, by iNat id
for (let i = 0; i < out.length; i += 50) {
  const part = out.slice(i, i + 50);
  const q = `SELECT ?inat ?cn ?site WHERE { VALUES ?inat { ${part.map(e => `"${e.inat}"`).join(" ")} } ?item wdt:P3151 ?inat .
    { ?item wdt:P1843 ?cn FILTER(lang(?cn) IN ("fr","en","de")) } UNION { ?site schema:about ?item ; schema:isPartOf ?w . VALUES ?w { <https://fr.wikipedia.org/> <https://en.wikipedia.org/> <https://de.wikipedia.org/> } } }`;
  const r = await get(`https://query.wikidata.org/sparql?${qs({ query: q, format: "json" })}`);
  for (const b of r.results.bindings) {
    const e = part.find(x => String(x.inat) === b.inat.value);
    if (b.cn) { const lang = b.cn["xml:lang"]; if (!e.names[lang]) { e.names[lang] = b.cn.value.charAt(0).toUpperCase() + b.cn.value.slice(1); e.nameSource[lang] = "wikidata"; } }
    if (b.site) { const u = new URL(b.site.value); (e.wiki ||= {})[u.host.split(".")[0]] = b.site.value; }
  }
}
for (const e of out) for (const lang of LANGS) if (!e.names[lang]) { e.names[lang] = e.latin; e.nameSource[lang] = "latin"; }
out.sort((a, b) => a.latin.localeCompare(b.latin));
await writeFile("public/data/rares.json", JSON.stringify({ generatedAt: new Date().toISOString(),
  sources: { list: `photo model labels (FungiTastic) minus the Pilzdex species, mushroom classes, >= ${MIN_OBS} research-grade observations in FR + DE; earlier rares kept`, names: "iNaturalist localized common names, then Wikidata P1843; Latin when none" },
  rares: out }, null, 1));
const cov = l => out.filter(e => e.nameSource[l] !== "latin").length;
console.log(`\n${out.length} rares (of ${cands.length} candidates); common names: fr ${cov("fr")}, en ${cov("en")}, de ${cov("de")}`);

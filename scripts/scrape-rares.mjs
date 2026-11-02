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
const labels = JSON.parse(await readFile("public/models/fungi-labels.json", "utf8"));
const dex = new Set(JSON.parse(await readFile("public/data/species.json", "utf8")).species.map(s => s.latin));
const cands = labels.filter(l => l.eu && !dex.has(l.latin));
const out = [];
for (const l of cands) {
  const r = await get(`https://api.inaturalist.org/v1/taxa?${qs({ q: l.latin, rank: "species", per_page: 5 })}`);
  let t = r.results.find(x => x.name === l.latin) ?? r.results.find(x => x.matched_term === l.latin);
  if (!t) { process.stdout.write("?"); continue; }
  if (!t.ancestor_ids?.some(a => MUSHROOMS.includes(a))) { process.stdout.write("x"); continue; } // lichens, moulds...
  const names = {}, nameSource = {};
  for (const lang of LANGS) {
    const lr = await get(`https://api.inaturalist.org/v1/taxa/${t.id}?${qs({ locale: lang })}`);
    const n = lr.results[0]?.preferred_common_name;
    if (n) { names[lang] = n.charAt(0).toUpperCase() + n.slice(1); nameSource[lang] = "inaturalist"; }
  }
  out.push({ inat: t.id, latin: l.latin, modelLatin: l.latin, names, nameSource });
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
  sources: { list: "photo model labels (species-classifiers fungi, European only) minus the Pilzdex species", names: "iNaturalist localized common names, then Wikidata P1843; Latin when none" },
  rares: out }, null, 1));
const cov = l => out.filter(e => e.nameSource[l] !== "latin").length;
console.log(`\n${out.length} rares (of ${cands.length} model labels not in the dex); common names: fr ${cov("fr")}, en ${cov("en")}, de ${cov("de")}`);

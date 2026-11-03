// Scrapes the Pilzdex species list from open sources. Nothing here is hand-written data.
//   Ranking, regions, season: iNaturalist (research-grade observations)
//   Names, edibility, morphology: Wikidata
//   Description, habitat, lookalikes: Wikipedia FR/EN/DE (CC BY-SA, source URL kept per entry)
// Usage: node scripts/scrape.mjs [--top 120] [--deadly-min 20] [--plan]   -> writes public/data/species.next.json
// Selection (issue #2): the current dex keeps its numbers 1..N, then every deadly species with >= DEADLY_MIN_OBS
// observations, then the rest by fame with edible species first in line (see selectDex), up to TOP.
// Then:  node scripts/check-data.mjs public/data/species.next.json && mv public/data/species.next.json public/data/species.json
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const arg = (k, d) => (process.argv.includes(k) ? Number(process.argv[process.argv.indexOf(k) + 1]) : d);
const TOP = arg("--top", 120);           // dex size (Sam, issue #2: ~120, absolute max 150)
const DEADLY_MIN_OBS = arg("--deadly-min", 1); // every deadly species observed in FR + DE gets in (issue #2: "all deadly ones")
const PLAN_ONLY = process.argv.includes("--plan"); // print the selection and stop (no enrichment)
const LANGS = ["fr", "en", "de"];
const UA = "pilz-pokedex/0.1 (https://github.com/txmnzia/pilz-pokedex)";
const CACHE = ".cache";
const PLACES = { DE: 7207, FR: 6753 };
const AREAS = { berlin: [52.52, 13.405], grenoble: [45.188, 5.724] }; // radius below
const RADIUS_KM = 50;
const TAXA = "50814,152032"; // Agaricomycetes, Pezizomycetes: mushroom-forming fungi, no lichens
const MAX_LOOKALIKES = 4;

// ---------- fetch with disk cache, per-host throttle, 429 backoff ----------
const last = {};
async function get(url, { text = false, encoding = "utf-8" } = {}) {
  const key = createHash("sha1").update(url).digest("hex");
  const file = `${CACHE}/${key}.json`;
  try { return JSON.parse(await readFile(file, "utf8")); } catch {}
  const h = new URL(url).host;
  const host = h.endsWith("wikipedia.org") ? "wikipedia" : h; // one shared budget for all wikis
  const gap = host === "wikipedia" ? 6000 : 1100; // Wikipedia answers 429 with ~50 s penalties below ~6 s
  for (let attempt = 0; attempt < 30; attempt++) {
    const wait = (last[host] || 0) + gap - Date.now();
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    last[host] = Date.now();
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
    if (res.status === 429 || res.status >= 500) {
      const ra = Number(res.headers.get("retry-after")) || 2 * 2 ** Math.min(attempt, 5);
      process.stdout.write(`[${res.status} ${host} wait ${ra}s]`);
      await new Promise(r => setTimeout(r, (ra + 1) * 1000));
      continue;
    }
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    const body = text ? new TextDecoder(encoding).decode(await res.arrayBuffer()) : await res.json();
    await mkdir(CACHE, { recursive: true });
    await writeFile(file, JSON.stringify(body));
    return body;
  }
  throw new Error(`gave up after retries: ${url}`);
}
const qs = o => new URLSearchParams(o).toString();
const inat = (path, params) => get(`https://api.inaturalist.org/v1/${path}?${qs(params)}`);
const sparql = q => get(`https://query.wikidata.org/sparql?${qs({ query: q, format: "json" })}`).then(r => r.results.bindings);
const wiki = (lang, params) => get(`https://${lang}.wikipedia.org/w/api.php?${qs({ format: "json", formatversion: 2, ...params })}`);
const chunk = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
const qid = uri => uri.split("/").pop();

// ---------- 1. ranking: research-grade observations in DE + FR ----------
async function ranking() {
  const total = new Map();
  for (const [cc, place] of Object.entries(PLACES)) {
    const r = await inat("observations/species_counts", { place_id: place, taxon_id: TAXA, quality_grade: "research", per_page: 500 });
    for (const { count, taxon } of r.results) {
      if (taxon.rank !== "species") continue;
      const e = total.get(taxon.id) || { inat: taxon.id, latin: taxon.name, obs: { DE: 0, FR: 0 } };
      e.obs[cc] = count;
      total.set(taxon.id, e);
    }
  }
  return [...total.values()].sort((a, b) => (b.obs.DE + b.obs.FR) - (a.obs.DE + a.obs.FR));
}

// ---------- 2. Wikidata: names, edibility, morphology, sitelinks ----------
const EDIBILITY = { // worst value wins
  Q19888591: "deadly",
  Q359511: "toxic", Q1169875: "toxic", Q19888579: "toxic",
  Q19888537: "caution",
  Q654236: "edible", Q19888517: "edible", Q62102033: "edible",
  Q4317894: "none",
};
const RANK = ["deadly", "toxic", "caution", "edible", "none"];
// human decisions for conflicting or missing Wikidata edibility, see data/edibility-overrides.json
const OVERRIDES = await readFile("data/edibility-overrides.json", "utf8").then(JSON.parse).catch(() => ({}));
const MORPH = { P783: "hymenium", P784: "cap", P785: "attachment", P786: "stipe", P787: "spores", P788: "ecology" };

// Wikidata P3151 can hold an iNat id that iNaturalist has since retired (taxon renamed): match on that old id
const wdKey = e => String(e.wdInat ?? e.inat);
// species in English Wikipedia's "Category:Deadly fungi" (filled in selectDex), a second deadly signal next to P789
let DEADLY_WIKI = new Set();

async function wikidata(entries) {
  const byInat = new Map(entries.map(e => [wdKey(e), e]));
  for (const part of chunk(entries, 40)) {
    const values = part.map(e => `"${wdKey(e)}"`).join(" ");
    const rows = await sparql(`SELECT ?item ?inat ?p ?v ?cn ?site WHERE {
      VALUES ?inat { ${values} } ?item wdt:P3151 ?inat .
      { VALUES ?p { wdt:P789 ${Object.keys(MORPH).map(p => "wdt:" + p).join(" ")} } ?item ?p ?v }
      UNION { ?item p:P1843 ?st . ?st ps:P1843 ?cn . MINUS { ?st wikibase:rank wikibase:DeprecatedRank } FILTER(lang(?cn) IN ("fr","en","de")) }
      UNION { ?site schema:about ?item ; schema:isPartOf ?w . VALUES ?w { <https://fr.wikipedia.org/> <https://en.wikipedia.org/> <https://de.wikipedia.org/> } }
    }`);
    for (const e of part) { e.claims = {}; e.commonNames = {}; e.sites = {}; }
    for (const r of rows) {
      const e = byInat.get(r.inat.value);
      e.wikidata = qid(r.item.value);
      e.claims ||= {}; e.commonNames ||= {}; e.sites ||= {};
      if (r.p) (e.claims[qid(r.p.value)] ||= new Set()).add(qid(r.v.value));
      if (r.cn) (e.commonNames[r.cn["xml:lang"]] ||= []).push(r.cn.value);
      if (r.site) { const u = new URL(r.site.value); e.sites[u.host.split(".")[0]] = { url: r.site.value, title: decodeURIComponent(u.pathname.slice(6)).replace(/_/g, " ") }; }
    }
  }
  // labels for every value QID used
  const vals = [...new Set(entries.flatMap(e => Object.values(e.claims || {}).flatMap(s => [...s])))];
  const labels = {};
  for (const part of chunk(vals, 100)) {
    const rows = await sparql(`SELECT ?v ?l WHERE { VALUES ?v { ${part.map(q => "wd:" + q).join(" ")} } ?v rdfs:label ?l FILTER(lang(?l) IN ("fr","en","de")) }`);
    for (const r of rows) (labels[qid(r.v.value)] ||= {})[r.l["xml:lang"]] = r.l.value;
  }
  for (const e of entries) {
    const c = e.claims || {};
    const eds = [...(c.P789 || [])].map(q => EDIBILITY[q]).filter(Boolean);
    if (DEADLY_WIKI.has(e.inat)) eds.push("deadly");
    // contradictory sources (edible + poisonous, edible + inedible) are not resolved by a rule: a human decides
    const edibleish = eds.includes("edible"), bad = eds.some(x => x === "toxic" || x === "deadly");
    e.edibilityConflict = (edibleish && (bad || eds.includes("none"))) || eds.includes("caution");
    e.edibility = e.edibilityConflict ? null : RANK.find(r => eds.includes(r)) || null;
    const o = OVERRIDES[e.latin];
    if (o) { e.edibility = o.edibility; e.edibilityOverride = o.reason; }
    e.edibilitySource = [...(c.P789 || [])].map(q => labels[q]?.en || q).concat(DEADLY_WIKI.has(e.inat) ? ["en.wikipedia Category:Deadly fungi"] : []);
    e.morph = {};
    for (const [p, k] of Object.entries(MORPH)) if (c[p]) e.morph[k] = [...c[p]].map(q => ({ qid: q, ...labels[q] }));
    delete e.claims;
  }
}

// iNaturalist localized common names, used when Wikidata has none
async function inatNames(e) {
  e.inatNames = {};
  for (const l of LANGS) {
    const r = await inat(`taxa/${e.inat}`, { locale: l });
    const n = r.results[0]?.preferred_common_name;
    if (n) e.inatNames[l] = n;
  }
}
function pickNames(e) {
  e.names = {}; e.nameSource = {};
  for (const l of LANGS) {
    const site = e.sites?.[l]?.title;
    const cands = [
      ["wikidata", e.commonNames?.[l]?.[0]],
      ["inaturalist", e.inatNames?.[l]],
      ["wikipedia", site && site !== e.latin ? site.replace(/ \(.*\)$/, "") : null],
    ];
    const [src, name] = cands.find(([, n]) => n) || ["latin", e.latin];
    e.names[l] = name.charAt(0).toUpperCase() + name.slice(1);
    e.nameSource[l] = src;
  }
}

// ---------- 3. Wikipedia: intro, habitat, lookalike links ----------
const HABITAT = { en: /habitat|ecology|distribution/i, fr: /habitat|écologie|répartition/i, de: /vorkommen|ökologie|verbreitung|standort/i };
const SIMILAR = { en: /similar|lookalike|look-alike|confus/i, fr: /confusion|similaires|proches|risque/i, de: /verwechs|ähnlich/i };
const sentences = (s, n) => (s.replace(/\s+/g, " ").replace(/\s+([,.;:])/g, "$1").trim().match(/[^.!?]+[.!?]+(\s|$)/g) || [s]).slice(0, n).join("").trim();

async function wikipedia(e) {
  e.text = {}; e.lookalikeTitles = [];
  for (const l of LANGS) {
    const site = e.sites?.[l]; if (!site) continue;
    const q = await wiki(l, { action: "query", prop: "extracts|revisions", explaintext: 1, exsectionformat: "wiki", rvprop: "content", rvslots: "main", redirects: 1, titles: site.title });
    if (!q?.query?.pages) continue; // Wikipedia sometimes answers an error instead of a page: skip that language
    const page = q.query.pages[0] || {};
    const full = page.extract || "";
    const parts = full.split(/\n(={2,})\s*(.+?)\s*\1\n/);
    const intro = sentences(parts[0].replace(/\(.*?\)/g, ""), 3);
    let habitat = "";
    for (let i = 1; i < parts.length; i += 3) if (HABITAT[l].test(parts[i + 1]) && parts[i + 2]?.trim()) { habitat = sentences(parts[i + 2], 2); break; }
    e.text[l] = { intro, habitat, url: site.url };
    // lookalikes: [[links]] inside "similar species" sections of the wikitext
    const wt = page.revisions?.[0]?.slots?.main?.content || "";
    const secs = wt.split(/^(={2,})\s*(.+?)\s*\1\s*$/m);
    for (let i = 1; i < secs.length; i += 3) {
      if (!SIMILAR[l].test(secs[i + 1])) continue;
      for (const m of (secs[i + 2] || "").matchAll(/\[\[([^\]|#]+)/g)) {
        const t = m[1].trim(); if (!t || t.includes(":")) continue;
        e.lookalikeTitles.push([l, t.charAt(0).toUpperCase() + t.slice(1)]);
      }
    }
  }
}

// resolve Wikipedia titles -> Wikidata species with an iNaturalist id
async function resolveLookalikes(entries) {
  const byLang = {};
  for (const e of entries) for (const [l, t] of e.lookalikeTitles) (byLang[l] ||= new Set()).add(t);
  const titleQ = {};
  for (const [l, set] of Object.entries(byLang)) for (const part of chunk([...set], 50)) {
    const r = await wiki(l, { action: "query", prop: "pageprops", ppprop: "wikibase_item", redirects: 1, titles: part.join("|") });
    const redir = Object.fromEntries((r.query.redirects || []).concat(r.query.normalized || []).map(x => [x.to, x.from]));
    for (const p of r.query.pages || []) if (p.pageprops?.wikibase_item) {
      let t = p.title; titleQ[`${l}:${t}`] = p.pageprops.wikibase_item;
      while (redir[t]) { t = redir[t]; titleQ[`${l}:${t}`] = p.pageprops.wikibase_item; }
    }
  }
  const qs_ = [...new Set(Object.values(titleQ))];
  const species = {};
  for (const part of chunk(qs_, 80)) {
    const rows = await sparql(`SELECT ?item ?inat ?name WHERE { VALUES ?item { ${part.map(q => "wd:" + q).join(" ")} }
      ?item wdt:P105 wd:Q7432 ; wdt:P3151 ?inat ; wdt:P225 ?name . }`);
    for (const r of rows) species[qid(r.item.value)] = { inat: Number(r.inat.value), latin: r.name.value };
  }
  for (const e of entries) {
    const seen = new Map();
    for (const [l, t] of e.lookalikeTitles) {
      const s = species[titleQ[`${l}:${t}`]];
      if (s && s.inat !== e.inat) { const v = seen.get(s.inat) || { ...s, langs: new Set() }; v.langs.add(l); seen.set(s.inat, v); }
    }
    e.lookalikeCandidates = [...seen.values()].map(v => ({ inat: v.inat, latin: v.latin, langs: v.langs.size }));
    delete e.lookalikeTitles;
  }
}

// ---------- 4. regions + season from iNaturalist ----------
async function regions(entries) {
  const ids = entries.map(e => e.inat);
  for (const e of entries) e.regions = { berlin: 0, grenoble: 0 };
  for (const [area, [lat, lng]] of Object.entries(AREAS)) for (const part of chunk(ids, 100)) {
    const r = await inat("observations/species_counts", { lat, lng, radius: RADIUS_KM, taxon_id: part.join(","), quality_grade: "research", per_page: 500 });
    for (const { count, taxon } of r.results) { const e = entries.find(x => x.inat === taxon.id); if (e) e.regions[area] = count; }
  }
}
async function season(e) {
  const r = await inat("observations/histogram", { taxon_id: e.inat, place_id: Object.values(PLACES).join(","), quality_grade: "research", interval: "month_of_year", date_field: "observed" });
  const h = Object.values(r.results.month_of_year);
  const max = Math.max(...h);
  e.season = { histogram: h, months: h.map((v, i) => (v >= max * 0.15 ? i + 1 : 0)).filter(Boolean) };
}

// ---------- main ----------
// ---------- mycodb.fr: tie-breaker only when Wikidata edibility conflicts or is missing ----------
const MYCODB = { "comestible": "edible", "bon comestible": "edible", "excellent comestible": "edible",
  "sans intérêt": "none", "non comestible": "none", "toxique": "toxic", "mortel": "deadly" };
async function mycodbEdibility(latin) {
  const [genre, espece] = latin.split(" ");
  const url = `https://www.mycodb.fr/fiche.php?${qs({ genre, espece })}`;
  const page = await get(url, { text: true, encoding: "latin1" });
  const m = page.match(/Comestibilit[\s\S]*?<\/div>\s*<p class="cdesc">([\s\S]*?)<\/p>/);
  if (!m) return null;
  const raw = m[1].replace(/<[^>]+>/g, "").trim();
  return { raw, edibility: MYCODB[raw.toLowerCase()] ?? null, url };
}
async function synonyms(qid) {
  const rows = await sparql(`SELECT ?n WHERE { wd:${qid} wdt:P1420 ?s . ?s wdt:P225 ?n . }`);
  return rows.map(r => r.n.value).filter(n => n.split(" ").length === 2);
}
async function mycodb(entries) {
  for (const e of entries.filter(x => !x.edibility && !x.edibilityOverride)) {
    const names = [e.latin, ...(e.wikidata ? await synonyms(e.wikidata) : [])];
    for (const n of names) {
      const r = await mycodbEdibility(n);
      if (!r) continue;
      e.edibilityMycodb = { name: n, value: r.raw, url: r.url };
      if (r.edibility) e.edibility = r.edibility;
      break;
    }
  }
}

// cheap part (Wikidata + mycodb, not throttled) and the slow part (iNat names, Wikipedia text, season, regions)
async function enrichCheap(entries) { await wikidata(entries); await mycodb(entries); }
async function enrichFull(entries) {
  for (const e of entries) { await inatNames(e); pickNames(e); await wikipedia(e); await season(e); process.stdout.write("."); }
  await regions(entries);
}
async function enrich(entries) { await enrichCheap(entries); await enrichFull(entries); }

// score = observations x number of Wikipedia language editions (fame, not seasonal)
async function fame(pool) {
  for (const part of chunk(pool, 60)) {
    const rows = await sparql(`SELECT ?inat ?n WHERE { VALUES ?inat { ${part.map(e => `"${wdKey(e)}"`).join(" ")} } ?item wdt:P3151 ?inat ; wikibase:sitelinks ?n . }`);
    for (const r of rows) { const e = part.find(x => wdKey(x) === r.inat.value); e.wikiLangs = Math.max(e.wikiLangs || 0, Number(r.n.value)); }
  }
  for (const e of pool) e.score = (e.obs.DE + e.obs.FR) * (e.wikiLangs || 0);
  return pool.sort((a, b) => b.score - a.score);
}
// Candidate pool: most observed species in FR + DE, plus every Wikidata deadly or edible species with an iNat id
// (rare deadly ones never reach the top of the observation counts).
async function wikidataByEdibility(qids) {
  const rows = await sparql(`SELECT DISTINCT ?inat ?name WHERE { VALUES ?e { ${qids.map(q => "wd:" + q).join(" ")} }
    ?item wdt:P789 ?e ; wdt:P3151 ?inat ; wdt:P105 wd:Q7432 ; wdt:P225 ?name . }`);
  return rows.map(r => ({ inat: Number(r.inat.value), latin: r.name.value }));
}
async function countsFor(ids) {
  const obs = new Map();
  for (const [cc, place] of Object.entries(PLACES)) for (const part of chunk(ids, 100)) {
    const r = await inat("observations/species_counts", { place_id: place, taxon_id: part.join(","), quality_grade: "research", per_page: 500 });
    for (const { count, taxon } of r.results) if (taxon.rank === "species") { const o = obs.get(taxon.id) || { DE: 0, FR: 0, latin: taxon.name }; o[cc] = count; obs.set(taxon.id, o); }
  }
  return obs;
}
// light edibility pass for the whole pool (same rules as wikidata(): worst wins, conflicts stay null)
async function poolEdibility(pool) {
  for (const part of chunk(pool, 80)) {
    const rows = await sparql(`SELECT ?inat ?v WHERE { VALUES ?inat { ${part.map(e => `"${wdKey(e)}"`).join(" ")} } ?item wdt:P3151 ?inat ; wdt:P789 ?v . }`);
    const by = {};
    for (const r of rows) (by[r.inat.value] ||= []).push(EDIBILITY[qid(r.v.value)]);
    for (const e of part) {
      const eds = (by[wdKey(e)] || []).filter(Boolean);
      if (DEADLY_WIKI.has(e.inat)) eds.push("deadly");
      const conflict = (eds.includes("edible") && eds.some(x => x === "toxic" || x === "deadly" || x === "none")) || eds.includes("caution");
      e.poolEdibility = OVERRIDES[e.latin]?.edibility ?? (conflict ? null : RANK.find(r => eds.includes(r)) || null);
    }
  }
}
// English Wikipedia "Category:Deadly fungi" -> Wikidata species with an iNat id
async function deadlyCategory() {
  const r = await wiki("en", { action: "query", list: "categorymembers", cmtitle: "Category:Deadly fungi", cmlimit: 500, cmtype: "page" });
  const titles = r.query.categorymembers.map(m => m.title);
  const out = [];
  for (const part of chunk(titles, 50)) {
    const q = await wiki("en", { action: "query", prop: "pageprops", ppprop: "wikibase_item", redirects: 1, titles: part.join("|") });
    const items = (q.query.pages || []).map(p => p.pageprops?.wikibase_item).filter(Boolean);
    if (!items.length) continue;
    const rows = await sparql(`SELECT ?inat ?name WHERE { VALUES ?item { ${items.map(x => "wd:" + x).join(" ")} } ?item wdt:P105 wd:Q7432 ; wdt:P3151 ?inat ; wdt:P225 ?name . }`);
    out.push(...rows.map(x => ({ inat: Number(x.inat.value), latin: x.name.value })));
  }
  return out;
}
// iNaturalist retires renamed taxa; follow them to the current id (counts live there), remember the old one for Wikidata
async function currentTaxa(list) {
  for (const part of chunk(list, 30)) {
    const t = await inat(`taxa/${part.map(e => e.inat).join(",")}`, {});
    for (const x of t.results) {
      const e = part.find(y => y.inat === x.id);
      if (e && !x.is_active && x.current_synonymous_taxon_ids?.length === 1) {
        const cur = await inat(`taxa/${x.current_synonymous_taxon_ids[0]}`, {});
        const c = cur.results[0];
        if (c?.rank === "species") { e.wdInat = e.inat; e.inat = c.id; e.latin = c.name; }
      }
    }
  }
  return list;
}
async function selectDex() {
  const top = (await ranking()).slice(0, 400);
  const deadlyCat = await currentTaxa(await deadlyCategory());
  DEADLY_WIKI = new Set(deadlyCat.map(e => e.inat));
  const extra = await currentTaxa([...await wikidataByEdibility(["Q19888591"]), ...await wikidataByEdibility(["Q654236", "Q19888517", "Q62102033"]), ...deadlyCat]);
  const known = new Set(top.map(e => e.inat));
  const add = extra.filter(e => !known.has(e.inat));
  const obs = await countsFor([...new Set(add.map(e => e.inat))]);
  const pool = [...top];
  for (const e of add) { const o = obs.get(e.inat); if (o && o.DE + o.FR > 0 && !pool.some(x => x.inat === e.inat)) pool.push({ inat: e.inat, ...(e.wdInat ? { wdInat: e.wdInat } : {}), latin: o.latin || e.latin, obs: { DE: o.DE, FR: o.FR } }); }
  await fame(pool);
  await poolEdibility(pool);
  // the current dex keeps its numbers (stable Pokedex numbers); new species are numbered after them
  const prev = await readFile("public/data/species.json", "utf8").then(JSON.parse).catch(() => ({ species: [] }));
  const keep = prev.species.filter(s => !s.extra).sort((a, b) => a.no - b.no).map(s => s.inat);
  const byId = new Map(pool.map(e => [e.inat, e]));
  const chosen = keep.map(id => byId.get(id) || { inat: id, latin: prev.species.find(s => s.inat === id).latin, obs: { DE: 0, FR: 0 } });
  const taken = new Set(keep);
  const n = e => e.obs.DE + e.obs.FR;
  const deadly = pool.filter(e => !taken.has(e.inat) && e.poolEdibility === "deadly" && n(e) >= DEADLY_MIN_OBS);
  deadly.forEach(e => taken.add(e.inat));
  const rest = pool.filter(e => !taken.has(e.inat) && e.score > 0);
  const slots = Math.max(0, TOP - chosen.length - deadly.length);
  // edible first in line: half the free slots go to the most famous edible species, the other half to the most
  // famous of everything left (edible or not), so famous toxic / inedible species still get in
  const edible = rest.filter(e => e.poolEdibility === "edible").slice(0, Math.ceil(slots / 2));
  edible.forEach(e => taken.add(e.inat));
  const famous = rest.filter(e => !taken.has(e.inat)).slice(0, slots - edible.length);
  const fresh = [...deadly, ...edible, ...famous].sort((a, b) => b.score - a.score);
  for (const e of [...deadly]) e.why = "deadly"; for (const e of edible) e.why = "edible"; for (const e of famous) e.why = "famous";
  for (const e of chosen) e.why = "kept";
  console.log(`pool ${pool.length} (top observed + Wikidata deadly/edible); kept ${chosen.length}, deadly ${deadly.length}, edible ${edible.length}, famous ${famous.length}`);
  return [...chosen, ...fresh];
}
// Sam (v0.14.0): every species the photo model knows that is observed in FR + DE belongs in the dex. They come
// after the existing numbers, by fame, so no number moves. Source: the current rares.json + model labels.
async function modelSpecies(taken) {
  const rares = await readFile("public/data/rares.json", "utf8").then(j => JSON.parse(j).rares).catch(() => []);
  const fresh = rares.filter(r => !taken.has(r.inat)).map(r => ({ inat: r.inat, latin: r.latin, obs: { DE: 0, FR: 0 } }));
  const obs = await countsFor(fresh.map(e => e.inat));
  for (const e of fresh) { const o = obs.get(e.inat); if (o) e.obs = { DE: o.DE, FR: o.FR }; }
  const seen = fresh.filter(e => e.obs.DE + e.obs.FR > 0);
  await fame(seen);
  seen.forEach(e => (e.why = "model"));
  console.log(`model species added: ${seen.length} (not observed in FR + DE, left as rares: ${fresh.length - seen.length})`);
  return seen.sort((a, b) => b.score - a.score);
}
const core0 = await selectDex();
const core = [...core0, ...(process.argv.includes("--no-model") ? [] : await modelSpecies(new Set(core0.map(e => e.inat))))];
core.forEach((e, i) => console.log(String(i + 1).padStart(3), e.why.padEnd(7), (e.poolEdibility || "-").padEnd(7), e.latin.padEnd(32), n4(e)));
function n4(e) { return `${e.obs.DE + e.obs.FR} obs x ${e.wikiLangs || 0} wiki`; }
if (PLAN_ONLY) process.exit(0);
await enrich(core);
await resolveLookalikes(core);

// lookalikes must be fungi actually present in Europe (Wikipedia links also hit trees and other continents)
async function keepEuropeanFungi(cands) {
  const ok = new Set();
  for (const part of chunk(cands, 30)) {
    const t = await inat(`taxa/${part.join(",")}`, {});
    const fungi = t.results.filter(x => x.iconic_taxon_name === "Fungi").map(x => x.id);
    if (!fungi.length) continue;
    const r = await inat("observations/species_counts", { place_id: 97391, taxon_id: fungi.join(","), quality_grade: "research", per_page: 500 });
    for (const { count, taxon } of r.results) if (count >= 10) ok.add(taxon.id);
  }
  return ok;
}
const allCands = [...new Set(core.flatMap(e => e.lookalikeCandidates.map(c => c.inat)))];
const european = await keepEuropeanFungi(allCands);
for (const e of core) e.lookalikeCandidates = e.lookalikeCandidates.filter(c => european.has(c.inat));

// extras: lookalikes outside the core list get their own pages
const coreIds = new Set(core.map(e => e.inat));
const extraMap = new Map();
for (const e of core) for (const c of e.lookalikeCandidates) if (!coreIds.has(c.inat)) extraMap.set(c.inat, { inat: c.inat, latin: c.latin, obs: { DE: 0, FR: 0 } });
const extras = [...extraMap.values()];
// edibility first (the lookalike cap ranks by danger), Wikipedia text only for the lookalikes actually kept
await enrichCheap(extras);
const all = [...core, ...extras];
const danger = { deadly: 0, toxic: 1, caution: 2, none: 3, edible: 4, null: 5 };
const byId = new Map(all.map(e => [e.inat, e]));
for (const e of core) {
  e.lookalikes = e.lookalikeCandidates
    .sort((a, b) => danger[byId.get(a.inat)?.edibility] - danger[byId.get(b.inat)?.edibility] || b.langs - a.langs)
    .slice(0, MAX_LOOKALIKES).map(c => c.inat);
}
// keep only extras actually referenced after the cap
const used = new Set(core.flatMap(e => e.lookalikes));
const keptExtras = extras.filter(e => used.has(e.inat));
console.log(`\nenriching ${keptExtras.length} lookalike-only species (of ${extras.length} candidates)`);
await enrichFull(keptExtras);
for (const e of keptExtras) e.lookalikes = core.filter(c => c.lookalikes.includes(e.inat)).map(c => c.inat); // link back

const out = {
  generatedAt: new Date().toISOString(),
  sources: {
    ranking: "iNaturalist research-grade observations (Germany + France, Agaricomycetes + Pezizomycetes) x number of Wikipedia language editions (Wikidata sitelinks)",
    regions: `iNaturalist research-grade observations within ${RADIUS_KM} km of Berlin / Grenoble`,
    names_edibility_morphology: "Wikidata (CC0); edibility conflicts resolved with mycodb.fr",
    text: "Wikipedia FR/EN/DE (CC BY-SA 4.0), see text.<lang>.url",
  },
  species: [...core.map((e, i) => ({ no: i + 1, extra: false, ...e })), ...keptExtras.map((e, i) => ({ no: null, ex: i + 1, extra: true, ...e }))]
    .map(({ lookalikeCandidates, commonNames, inatNames, sites, ...e }) => e),
};
await mkdir("public/data", { recursive: true });
await writeFile("public/data/species.next.json", JSON.stringify(out, null, 1));
console.log(`\nwrote public/data/species.next.json: ${core.length} core + ${keptExtras.length} lookalike-only`);

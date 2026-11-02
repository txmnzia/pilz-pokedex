// Validates scraped species data and prints what needs a human look.
// Exit code 1 on hard errors (broken structure), 0 otherwise. Review items are warnings.
// Usage: node scripts/check-data.mjs public/data/species.next.json
import { readFile } from "node:fs/promises";

const file = process.argv[2] || "public/data/species.json";
const { species } = JSON.parse(await readFile(file, "utf8"));
const LANGS = ["fr", "en", "de"];
const errors = [], review = [];
const ids = new Set(species.map(s => s.inat));

for (const s of species) {
  const tag = `${s.extra ? "EX" + s.ex : "#" + s.no} ${s.latin}`;
  if (!s.inat || !s.latin) errors.push(`${tag}: missing inat id or latin name`);
  for (const l of LANGS) if (!s.names?.[l]) errors.push(`${tag}: no ${l} name`);
  for (const l of LANGS) if (s.nameSource?.[l] === "latin") review.push(`${tag}: ${l} name fell back to Latin`);
  if (!s.edibility) review.push(`${tag}: edibility ${s.edibilityConflict ? "CONFLICT" : "missing"} on Wikidata (${s.edibilitySource?.join(", ") || "none"}), mycodb: ${s.edibilityMycodb?.value ?? "no page"}`);
  if (s.edibility === "caution") review.push(`${tag}: edibility "caution", decide edible or toxic`);
  for (const l of LANGS) if (!s.text?.[l]?.intro) review.push(`${tag}: no ${l} Wikipedia intro`);
  if (!LANGS.some(l => s.text?.[l]?.habitat)) review.push(`${tag}: no habitat text in any language`);
  if (!s.season?.months?.length) review.push(`${tag}: no season data`);
  for (const id of s.lookalikes || []) if (!ids.has(id)) errors.push(`${tag}: lookalike ${id} has no entry`);
}
const core = species.filter(s => !s.extra);
const nos = core.map(s => s.no).sort((a, b) => a - b);
if (nos.some((n, i) => n !== i + 1)) errors.push("core numbering is not 1..N");

// rares (v0.12.0): off-dex species the photo model knows, names only
try {
  const { rares } = JSON.parse(await readFile("public/data/rares.json", "utf8"));
  const dexIds = new Set(species.map(s => s.inat)), seen = new Set();
  for (const r of rares) {
    if (!r.inat || !r.latin) errors.push(`rare ${r.latin}: missing inat id or latin name`);
    if (dexIds.has(r.inat)) errors.push(`rare ${r.latin}: already in the Pilzdex data`);
    if (seen.has(r.inat)) errors.push(`rare ${r.latin}: duplicate`); seen.add(r.inat);
    for (const l of LANGS) if (!r.names?.[l]) errors.push(`rare ${r.latin}: no ${l} name`);
  }
  console.log(`${rares.length} rares; Latin fallback names: ${LANGS.map(l => `${l} ${rares.filter(r => r.nameSource?.[l] === "latin").length}`).join(", ")}`);
} catch (e) { if (e.code !== "ENOENT") errors.push(`rares.json: ${e.message}`); }
console.log(`${core.length} core, ${species.length - core.length} lookalike-only`);
console.log(`edibility: ${["edible", "none", "toxic", "deadly", "caution", null].map(e => `${e}=${species.filter(s => s.edibility === e).length}`).join(" ")}`);
if (review.length) console.log(`\nREVIEW (${review.length}):\n  ` + review.join("\n  "));
if (errors.length) { console.error(`\nERRORS (${errors.length}):\n  ` + errors.join("\n  ")); process.exit(1); }
console.log("\nstructure OK");

// Builds public/models/fungi-labels.json for the on-device photo identifier.
// Model: mlgraham/species-classifiers "fungi" (Apache-2.0), MobileNetV2 int8, 341 iNat2021 fungi species.
//   Source: https://github.com/mlgraham/species-classifiers  models/students/fungi/
//   fungi_int8.tflite sha256 273797691fabff2d1d7707fade66cc6d785541f9cb09060d3c6d6fe5bd42a47f
// Each label gets `eu`: true when iNaturalist has >= 50 research-grade observations in Europe, or it is in the dex.
// The app only considers eu classes (measured: top-1 67.7% -> 74.6% on 232 post-2023 European photos).
// Usage: NODE_USE_ENV_PROXY=1 node scripts/model-labels.mjs path/to/labels.txt
import { readFile, writeFile } from "node:fs/promises";

const labelsTxt = process.argv[2];
if (!labelsTxt) throw new Error("usage: node scripts/model-labels.mjs path/to/labels.txt");
const lines = (await readFile(labelsTxt, "utf8")).split("\n").filter(Boolean);
const dex = new Set(JSON.parse(await readFile("public/data/species.json", "utf8")).species.map(s => s.latin));
const counts = {};
for (let page = 1; page <= 6; page++) {
  const q = new URLSearchParams({ place_id: 97391, taxon_id: 47170, quality_grade: "research", per_page: 500, page });
  const r = await fetch(`https://api.inaturalist.org/v1/observations/species_counts?${q}`, { headers: { "User-Agent": "pilz-pokedex" } }).then(r => r.json());
  for (const x of r.results) counts[x.taxon.name] = x.count;
  if (r.results.length < 500) break;
  await new Promise(r => setTimeout(r, 1500));
}
const labels = lines.map(l => {
  const m = l.match(/^(.*?) \((.*)\)$/);
  const latin = m ? m[1] : l;
  return { latin, common: m ? m[2] : "", eu: (counts[latin] ?? 0) >= 50 || dex.has(latin) };
});
await writeFile("public/models/fungi-labels.json", JSON.stringify(labels));
console.log(`${labels.length} labels, ${labels.filter(l => l.eu).length} European`);

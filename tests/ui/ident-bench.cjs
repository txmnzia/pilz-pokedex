// In-browser measurement of the real identifier (src/lib/identify.ts, LiteRT.js wasm) on the golden set.
// Needs the dev server: npx vite --port 4194 (serves src/ and, via /@fs/, the golden images in .cache/golden/).
// Usage: node tests/ui/ident-bench.cjs [per-taxon=3]   -> .cache/eval/browser.json (resumable), then prints scores.
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "../..");
const per = Number(process.argv[2] || 3);
const G = JSON.parse(fs.readFileSync(`${ROOT}/data/golden.json`, "utf8")).photos;
const seen = {}; const photos = G.filter(p => (seen[p.inat] = (seen[p.inat] || 0) + 1) <= per);
const OUT = `${ROOT}/.cache/eval/browser.json`;
const done = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};
(async () => {
  const b = await chromium.launch(); const page = await b.newPage();
  await page.goto("http://localhost:4194/"); await page.waitForTimeout(1500);
  const todo = photos.filter(p => !done[p.photo]);
  let t0 = Date.now(), n = 0;
  for (const p of todo) {
    const r = await page.evaluate(async url => {
      const { identify } = await import("/src/lib/identify.ts");
      const blob = await (await fetch(url)).blob();
      const t = performance.now(); const id = await identify(blob);
      return { ms: performance.now() - t, g: id.guesses.slice(0, 10).map(x => [x.latin, +x.p.toFixed(5)]) };
    }, `/@fs${ROOT}/.cache/golden/${p.photo}.jpg`);
    done[p.photo] = r; n++;
    if (n % 25 === 0) { fs.writeFileSync(OUT, JSON.stringify(done)); console.log(`${n}/${todo.length} ${((Date.now() - t0) / n).toFixed(0)} ms/photo`); }
  }
  fs.writeFileSync(OUT, JSON.stringify(done)); await b.close();
  const rows = photos.filter(p => done[p.photo]);
  const t1 = rows.filter(p => done[p.photo].g[0]?.[0] === p.latin).length;
  const t3 = rows.filter(p => done[p.photo].g.slice(0, 3).some(g => g[0] === p.latin)).length;
  const ms = rows.map(p => done[p.photo].ms).sort((a, b) => a - b);
  console.log(`browser: ${rows.length} photos, top-1 ${(100 * t1 / rows.length).toFixed(1)}%, top-3 ${(100 * t3 / rows.length).toFixed(1)}%, median ${ms[ms.length >> 1].toFixed(0)} ms`);
})();

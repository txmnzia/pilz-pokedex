// Layout regression check (Playwright, not part of `npm test`). Run against a local preview:
//   npm run build && npx vite preview --port 4193 &   then   node tests/ui/fit-check.cjs [http://localhost:4193/]
// For iPhone 13, iPhone SE, Galaxy S22 (360x690), a 320px phone and desktop (1280x860), in fr/en/de, grid and list:
// filters on one line, badges at fixed widths, no clipped badge text, no tile header / row / number overflow,
// no horizontal page scroll, no page errors. Seeds 4 fake finds (no real data). Prints one JSON line per case.
const { chromium, devices } = require("playwright");
const URL = process.argv[2] || "http://localhost:4193/";
const data = require("../../public/data/species.json");
const ids = data.species.filter(s => !s.extra).slice(0, 4).map(s => s.inat);
const finds = ids.map((id, i) => ({ id: `00000000-0000-4000-8000-00000000000${i}`, species: id, observed_on: "2026-10-01", place: "", lat: null, lng: null, note: "", photo_path: null, created_at: "2026-10-01T10:00:00Z", updated_at: "2026-10-01T10:00:00Z", deleted: false, synced: true }));
const D = [["ip13", devices["iPhone 13"]], ["se", devices["iPhone SE"]], ["s22", { viewport: { width: 360, height: 690 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }], ["p320", { viewport: { width: 320, height: 640 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }], ["web", { viewport: { width: 1280, height: 860 } }]];
(async () => {
  const b = await chromium.launch(); const errs = []; let bad = 0;
  for (const [nm, opt] of D) for (const lang of ["fr", "en", "de"]) {
    const p = await b.newPage({ ...opt, locale: lang }); p.on("pageerror", e => errs.push(e.message));
    await p.addInitScript(f => localStorage.setItem("pz.finds", JSON.stringify(f)), finds);
    await p.goto(URL); await p.waitForTimeout(1200);
    if (await p.locator("text=/sans compte|without account|ohne Konto/i").count()) { await p.click("text=/sans compte|without account|ohne Konto/i"); await p.waitForTimeout(1000); }
    const m = () => p.evaluate(() => {
      const c = document.querySelector(".chips.one"); let fits = "none";
      if (c) { const r = c.getBoundingClientRect(); fits = [...c.children].every(x => { const q = x.getBoundingClientRect(); return q.width === 0 || (Math.abs(q.top - r.top) < 4 && q.right <= r.right + 1); }); }
      const ws = {}; document.querySelectorAll(".bdg").forEach(x => { if (!x.offsetParent) return; const k = [...x.classList].filter(c => !c.startsWith("t-")).join("."); (ws[k] ??= new Set()).add(Math.round(x.getBoundingClientRect().width)); });
      const clip = [...document.querySelectorAll(".bdg.w")].filter(x => x.offsetParent && x.scrollWidth > x.clientWidth + 1).map(x => x.textContent);
      const over = [...document.querySelectorAll(".tile .thead,.row,.row .num")].filter(x => x.scrollWidth > x.clientWidth + 1).length;
      return { fits, widths: Object.fromEntries(Object.entries(ws).map(([k, v]) => [k, [...v]])), clip, over, hscroll: document.documentElement.scrollWidth > innerWidth };
    });
    const ok = r => r.fits !== false && !r.clip.length && !r.over && !r.hscroll && Object.values(r.widths).every(v => v.length === 1);
    const g = await m(); if (!ok(g)) bad++; console.log(nm, lang, "grid", ok(g) ? "OK" : "FAIL", JSON.stringify(g));
    await p.click(".iconbtn"); await p.waitForTimeout(300); await p.click("text=/^(Liste|List)$/"); await p.waitForTimeout(200); await p.click(".iconbtn"); await p.waitForTimeout(400);
    const l = await m(); if (!ok(l)) bad++; console.log(nm, lang, "list", ok(l) ? "OK" : "FAIL", JSON.stringify(l));
    await p.close();
  }
  console.log(bad ? `${bad} FAILED` : "all OK", "page errors:", errs);
  await b.close(); process.exit(bad || errs.length ? 1 : 0);
})();

Load the txmnzia-conventions skill before editing. Then read `docs/PROJECT.md`: how Sam works, scraping method,
UX/UI decisions, core features and the backlog.

# Pilzdex (pilz-pokedex)

A Pokédex for the mushrooms Sam finds. Classic red handheld UI, mobile first. 181 species (v0.14.0: 120 chosen from real data + 61 the photo model knows), each with
lookalikes that get their own pages (EX-nn). Uncaught species show a black silhouette; caught ones show your photo.
FR/EN/DE. Vite + React + TS, Supabase (shared project, schema `pilz_pokedex`, bucket `pilz_pokedex`), magic-link auth,
local-first (works offline, syncs when signed in). Deployed to GitHub Pages from `main` via Actions.

## Commands
- `npm run dev` / `npm run build` / `npm test` / `npm run lint`
- `npm run check-data` validates `public/data/species.json`
- `npm run check-ui` layout regression check (Playwright) against `npx vite preview --port 4193`: filters on one line,
  fixed badge widths, no overflow, on 5 screen sizes x fr/en/de x grid/list
- `npm run scrape` regenerates data into `public/data/species.next.json` (needs network access to api.inaturalist.org,
  query.wikidata.org, *.wikipedia.org). Validate, then move over `species.json`. Responses are cached in `.cache/`.

## Map
| File | Role |
|---|---|
| `scripts/scrape.mjs` | Scraper: iNaturalist (ranking, regions, season), Wikidata (names, edibility, morphology), Wikipedia (text, lookalikes) |
| `scripts/scrape-rares.mjs` | Rares (v0.15.2): FungiTastic species not in the dex, mushroom classes (+ ALSO), >= 20 research-grade obs in FR+DE, earlier rares kept; FR/EN/DE names from iNat then Wikidata -> `public/data/rares.json`. Re-run `scripts/ft-labels.py` and `scripts/scrape-refs.py` after it |
| `scripts/scrape-refs.py` | Reference photos: up to 3 open-licence iNat photos per species/lookalike/rare, 480 px -> `public/refs/`, credits in `public/data/refs.json` |
| `scripts/check-data.mjs` | Data validation + review list (edibility conflicts, missing names) |
| `data/edibility-overrides.json` | Human decisions for conflicting/missing edibility, applied by the scraper (optional file) |
| `public/data/species.json` | Generated data, fetched at runtime (NetworkFirst in the SW, never precached) |
| `scripts/silhouettes.py` | Generates the 37 silhouette shapes (smooth splines) pasted into `Art.tsx` |
| `src/lib/species.ts` | Pure: silhouette shape (species override, then genus, then Wikidata morphology), season label, lookalikes, text fallback |
| `src/lib/finds.ts` | Pure: merge (never drops), soft delete, grouping |
| `src/lib/i18n.ts` | All UI strings FR/EN/DE |
| `src/lib/morph.ts` | Short badge words + spore colours for the Wikidata morphology values (by QID) |
| `src/lib/local.ts` | localStorage + IndexedDB photo store, image compression |
| `src/lib/sync.ts` | Supabase upload/upsert/pull, signed photo URLs, prefs pull/push |
| `src/lib/prefs.ts` | Pure-ish: language + grid/list prefs, local-first, newer `updated_at` wins per account |
| `src/lib/identify.ts` | On-device photo identifier: lazy LiteRT.js (wasm), Pillow-equivalent preprocessing, FungiTastic model in `public/models/` (v0.15.0) |
| `src/lib/exif.ts` | Pure: JPEG EXIF date taken + GPS for library imports (tests use `tests/fixtures/*.jpg`, fake data) |
| `src/lib/rank.ts`, `src/lib/resample.ts` | Pure: European-only ranking + confidence threshold; anti-aliased bilinear resize (matches Pillow, worth ~5 pts top-1) |
| `scripts/ft-labels.py`, `scripts/quantize-ft.py`, `scripts/copy-litert.mjs` | Model prep: `public/models/fungitastic-labels.json` (model labels renamed to the Pilzdex Latin when they are synonyms), copy wasm runtime to `public/litert/` (gitignored) |
| `scripts/golden.py`, `scripts/golden_lib.py` | Golden set: `data/golden.json` (3511 recent open-licence iNat photos, 10 per taxon, ids only), images re-downloaded to `.cache/golden/` with `--images` |
| `scripts/model-map.py`, `data/model-maps/` | Model label -> current iNat taxon id (synonyms, Latin genders, nominate varieties, ambiguity check); human decisions in `overrides.json` with a reason |
| `scripts/eval.py`, `scripts/bench_report.py`, `tests/ui/ident-bench.cjs` | Benchmark: score models on the golden set (`current`, `fungitastic`, `bioclip2`, `inat`), overview page `design/benchmark.html`; in-browser check of the real `identify()` (needs `npx vite --port 4194`) |
| `data/models/species-classifiers/` | The old model (v0.4 to v0.14), kept only to re-run the benchmark (`scripts/model-labels.mjs`, `fix-model-batch.py` belong to it) |
| `src/screens.tsx` | Login, Dex (grid/list), Entry (2 pages), Catch, Settings. Each screen sends its right-side part to `ctx.right` via a portal (`ToRight`) on the web |
| `src/components/RightPanel.tsx` | Web only (>= 900px): second Pokédex panel: LCD (portal target), 10 finds keys, yellow PREV/NEXT |
| `src/App.tsx` | State, hardware buttons (big yellow CATCH = photo picker, D-pad scrolls / steps species, B=back, PAGE), auth, sync, re-crop |
| `supabase/migrations/` | SQL to paste in the Supabase SQL editor (0001 finds + bucket, 0002 settings, 0003 photos column, 0004 sort pref) |
| `design/mockup.html` | Original UX mockup (mock data) |

## Web two-panel layout (>= 900px, v0.5.0)
Left = the device (dex grid only / species page 1 / catch photo); right panel = filters + progress / page 2 details +
finds list / catch form + suggestions / settings. Right panel top is measured to sit on the line under the left header
(`--rtop`), hinge stays inside both panels. PAGE pill hidden, D-pad OK does not flip pages. Phones are unchanged.
Design source: `design/mockup.html` (artifact https://claude.ai/artifact/U6nJ9KcsPvGqQFGh28YGdQ).

## Hard rules
- Author and committer `txmnzia <14270570+txmnzia@users.noreply.github.com>`; no Co-Authored-By / session / "Generated with" trailers.
- Work on a branch, then merge to `main` and push; deploy only from `main`.
- No secrets in the repo. Supabase URL/anon key are repo Variables. No real personal data in fixtures.
- Bump `version` in package.json on every user-visible change (shown in the device header).
- Tests + lint + check-data before merging.
- Species data is scraped, never hand-written. Human edibility decisions go in `data/edibility-overrides.json` with a reason.
- Finds: every mutation mirrors to localStorage; remote merges never drop local finds; deletes are soft.
- Photo identifier: suggestion only, user confirms; preselect only when p >= CONFIDENT (0.5). Model (v0.15.0, Sam): FungiTastic
  DINOv3 ViT-S/16, 2827 European fungi, int8 TFLite 24 MB (v0.15.1, Sam found 46 MB fp16 too heavy: `scripts/quantize-ft.py`,
  -0.3 pt top-1; int4 does not run in XNNPACK) (CacheFirst, downloaded on first identification), input 384
  float32 after Pillow-style resize of the short side to 439 + centre crop, logits -> softmax; labels that are synonyms of
  one Pilzdex species are summed. Chosen on the golden set (benchmark artifact https://claude.ai/artifact/GK4yGKL94CxvYUgpSM6HSm,
  1078 photos, 3 per taxon): old model 36% top-1 / 44% top-3, FungiTastic 59% / 72%, BioCLIP 2 73% / 89% (1.6 GB,
  too big for a phone), iNat online 70% / 85% (no GPS, API not open to third-party apps). Deadly photos announced as an
  edible species: 32% -> 3%. Knows 297 of the 360 app taxa (old: 175). Measured in Chromium through the real
  `identify()` (int8): 59.2% / 72.8%, ~0.6 s per photo (wasm, desktop); "Probably" (p >= 0.5) on 53% of photos, right 83.0%.
  Licences: DINOv3 License (copy shipped in `public/models/`) + FungiTastic data CC BY-NC-SA: private non-commercial
  use only. Re-measure (`scripts/eval.py`, `tests/ui/ident-bench.cjs`) after any preprocessing or model change.
- Catch: CATCH button / tapping an uncaught silhouette opens the photo input directly (no `capture`: the OS offers camera
  or library), then a square finger-only crop (react-easy-crop, no slider), then
  identification on the crop. From a species page it is silent unless `mismatch()` fires (top >= 0.5 and selected < 0.1:
  v0.15.0 measured 4.6% false alarms, catches 53% of mix-ups with any dex lookalike); from the list it suggests the top 3.
- Several photos per find (v0.9.0, issue #1): up to 4 (`MAX_PHOTOS`), first = cover, no cover label (Sam): drag the
  thumbnails to reorder (pointer events, iOS has no HTML drag on touch; tap without moving = crop; arrow keys move). `Find.photos` = [{id, path}];
  the cover keeps the find id as its IndexedDB key and `photo_path` mirrors it (old finds and old app versions keep
  working). Each photo is cropped and identified on its own, then `combineGuesses` takes the geometric mean (v0.15.0,
  photos of the same species from different observations: 59.5% top-1 with 1 photo, 67% with 2, 71% with 3). Without
  migration 0003 sync silently falls back to cover only. Species page = gallery of all photos (swipe on the photo or
  arrows; that swipe does not flip the page); finds list shows the extra photos, tap = re-crop that photo.
- Thumbnails (v0.10.1, Sam): grid, list, keys and finds list use a 480 px JPEG (`thumbUrlOf`), the species gallery the
  full photo. Made at save / re-crop, uploaded as `<path>-t.jpg` (no schema change), cached in IndexedDB under
  `t:<path or photo id>` (path changes per re-crop, so never stale). Photos uploaded before v0.10.1 get their thumbnail
  made once per device from the full photo.
- Re-crop: tapping a caught photo or a find's crop button re-crops the stored (already cropped) image; storage paths
  are versioned (`<user>/<find>-<updated_at ms>.jpg`) so other devices never see a cached old crop.

## iOS notes
- Phones: `html, body` background is the device red so Safari paints red behind the Dynamic Island and URL bar.
  iOS only (`@supports (-webkit-touch-callout: none)`; Android keeps 100dvh, its address bar does not overlay the page):
  like the eki app, `#root` is 100lvh (runs under the floating URL bar) and `#device` padding-bottom is
  `max(10px + safe-area, 100lvh - 100dvh - 10px)`: controls end ~17pt above the URL bar (iPhone: lvh 754, dvh 654, gap 27pt). `?debug=1` prints innerHeight / visualViewport / safe-area / #device rect.
- Caching is NETWORK FIRST (Sam's choice): index.html is not precached; navigations fetch from the network with
  `cache: no-store` and fall back to the last good copy only offline (4 s timeout). JS/CSS are hashed. The worker has
  `skipWaiting` + `clientsClaim` (without them new versions sat in 'waiting' forever: the root cause of stuck phones).
  Tested: new deploy visible on one normal reload; offline reload opens the dex with all 83 tiles.
- Service worker registered in `src/main.tsx` (not auto-injected): update check on load, on tab return, hourly.
  Backstop: `version.json` (emitted at build, never cached) is compared with the running version; if the server is
  newer and the worker has not taken over in 4 s, the app unregisters it, clears caches and navigates to `?v=<live>`
  (a plain reload was answered from Safari's HTTP cache, max-age 600); the `v` param is stripped on load. Once per version.
- Android check: Galaxy S22 simulation (360x690 Chrome tab, 360x780 app) in fr/de: no off-screen control, no horizontal
  overflow, tile names fit (only "Frühlings-Knollenblätterpilz" wraps mid-word).

## UX decisions (v0.6.0, Sam)
- Catch form: only the photo and the species. Date (EXIF or today) and GPS (EXIF or current position) are saved
  automatically and shown as one line; no place/note fields. Tap the photo = crop window with Cancel / Other photo / Use.
- Filters: All / Caught / Missing + the 4 edibility icons on ONE line on every screen size (measured to fit iPhone SE,
  iPhone 13, Galaxy S22 in fr/en/de; under 380px the icon chips lose their boxes).
- Edibility (v0.8.0, design/badges.html option C, artifact https://claude.ai/artifact/PQszbEioeKok55gZxnm5iW): Pokédex
  "type" badges, Gen 4 bevelled, FIXED widths (Sam: all the same length). `EdBadge` = word badge 60px (84px large on the
  species page), labels i18n `bEdible..bUnknown` max 7 chars (BLAND/FADE/FADE for no interest, ??? for unverified);
  `EdIcon` = glyph badge 24px (20px under 380px) with the 12x12 pixel glyph (fork, plate, !, skull, ?). Tiles + species
  page use the word, filters/progress/suggestions the glyph, list rows the word (glyph under 360px). List row (v0.8.1): number column 28px, gaps 6px, badge in a flex wrapper so it is centred with the ball. Colours: grass
  green, normal beige, red, dark, ??? teal. Measured: no overflow at 320/360/375/web in fr/en/de.
- Caught marker (option 2H): `CaughtBall`, glossy red/white capture ball when caught, a faint dashed "ghost" outline when
  not (must read as empty, not as a grey ball). List rows show it for every species; grid tiles only for caught ones
  (bottom-left of the picture).
- Silhouettes (v0.8.4, Sam): solid black, no light gaps. Pieces (cap, stem, ring, volva) are drawn as separate paths so
  overlaps never cancel. Only exception: the cage fungus lattice holes (without them it reads as a puffball).
  v0.10.0: 37 shapes, smooth curves only, one per growth form (design + photos: claude.ai/artifact/PQCc6WbH72kQyfdyWsqGe5),
  generated by `scripts/silhouettes.py`, picked by species override, then genus table, then morphology. Wood-dwellers
  are drawn without the log/trunk (Sam). Generic `gilled` is only for true plain caps; check new genera land elsewhere
  (v0.14.0 added genera for the 61 new species; Marasmius rotula/bulliardii = bell override).
- Buttons (v0.10.2, Sam, design/shadows.html option 2): ONE shadow logic for every hardware button (CATCH, BACK,
  burger, PAGE, d-pad, PREV/NEXT): light from the top left, crisp `3px 4px 0 rgba(80,0,4,.55)`; pressed = slides onto
  it. Disabled buttons never use opacity (it washed the ink border out): full border, dimmed fill.
- Controls spacing (v0.10.3, Sam): labels sit 10 px under their button (clear of the 4 px shadow); on the web the hidden
  PAGE pill is removed from the layout so CATCH / counter / BACK centre on the d-pad; wider gaps (20-24 px) on the web.
- Silhouette background: plain (Sam rolled back the v0.10.4 grid + Pokéball spotlight in v0.10.6; the options stay in
  design/grid.html). Do not re-add without asking.
- Pixel font (Press Start 2P) squashes accented capitals: write a plain E in labels drawn with it (PREC, DERNIERES,
  ATTRAPE !, Ecologie). German umlauts unchanged.
- Characteristics (v0.11.0, Sam, design/data.html option A): species page shows Sporée / Chapeau / Hyménium / Pied /
  Ecologie as one fixed-width badge each (`.mchip`, 124 px, 112 px under 380 px) with ONE short word, the first
  Wikidata value; spore print = real colour swatch. Words come from `src/lib/morph.ts` (keyed by QID, FR/EN/DE, capitals
  without accents/umlauts); a test fails if a new QID in the data has no short word. No stat bars (Sam declined).
- No text selection anywhere (v0.11.1, Sam): `* {user-select:none; -webkit-touch-callout:none}`, inputs/selects excepted.
- Rares (v0.12.0, Sam): a find can be an off-dex species, but ONLY one the photo model knows (v0.14.0: model species seen in FR+DE joined the dex as 121-181; v0.15.2, Sam "courantes en FR+DE": `rares.json` = 451, the 11 earlier ones (Aseroe rubra + 10 forest fungi) + every FungiTastic mushroom species with >= 20 research-grade obs in FR+DE (Russula sardonia had 61; a cut at 50 would give 223). Their reference photos are NOT hosted: refs.json `f` is a full iNat open-data URL (online only, silhouette offline); names
  scraped, Latin as fallback). Stored like any find (species = its iNat id, no schema change). Suggestions "hors
  Pilzdex" become clickable; the species menu has a "Raretés" group. Dex: section "Raretés" after the lookalikes,
  only caught ones, numbered R-01.. by first catch (`rareSpecies`). Page: photos + "Données non disponibles" + links
  (iNaturalist, Wikipedia); edibility always ???. Not counted in x/181.
- Compare before confirming (v0.13.0, Sam, artifact FVjK4vRPwvwKMifPhwEX2T): each suggestion shows a reference photo;
  tapping it opens a comparison (your photo | reference photos with arrows/swipe, spore/hymenium/stem badges,
  RETOUR / C'EST LUI). Tapping any photo opens it full screen. From a species page the "are you sure" alert shows
  both species' photos side by side. Photos are hosted by the app (`public/refs/`, 1019 photos for 360 taxa, ~38 MB, CacheFirst after first
  view, never precached); licences CC0 / BY / BY-SA / BY-NC / BY-NC-SA only (no ND: we resize). Credits ONLY in
  Settings (Sam), never on the comparison screen. 5 lookalikes have no open photo: silhouette instead. Re-run
  `scripts/scrape-refs.py` after any dex or rares change (cached, only new taxa are fetched).
  Full screen (v0.13.1, Sam: no downscaled photo when enlarged): shows the hosted copy, then swaps to the 1024 px
  version from iNaturalist's open-data bucket (`big` in refs.json) once loaded; offline it keeps the hosted copy.
  Hosting large versions was measured at ~490 MB (originals 1.5 GB), beyond GitHub Pages.
- Lookalikes (v0.8.2): same `DexTile` component as the dex grid (badge, picture, ball, fitted name); one tile look everywhere.
- Order (v0.10.5, Sam): a Settings pref `sort` = "no" (by dex number = popularity rank, DEFAULT) or "az" (A to Z in the
  UI language, `sortByName`); core and lookalikes, PREV/NEXT follow it. Synced per account like lang/mode (column added
  by migration 0004; without it the pref stays on the device, no error).

## Skills
| Skill | When |
|---|---|
| `release-checklist` | Anything shipping to main |

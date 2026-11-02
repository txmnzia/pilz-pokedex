Load the txmnzia-conventions skill before editing. Then read `docs/PROJECT.md`: how Sam works, scraping method,
UX/UI decisions, core features and the backlog.

# Pilzdex (pilz-pokedex)

A Pokédex for the mushrooms Sam finds. Classic red handheld UI, mobile first. 120 species (v0.10.0) chosen from real data, each with
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
| `src/lib/identify.ts` | On-device photo identifier: lazy LiteRT.js (wasm), Pillow-equivalent preprocessing, model in `public/models/` |
| `src/lib/exif.ts` | Pure: JPEG EXIF date taken + GPS for library imports (tests use `tests/fixtures/*.jpg`, fake data) |
| `src/lib/rank.ts`, `src/lib/resample.ts` | Pure: European-only ranking + confidence threshold; anti-aliased bilinear resize (matches Pillow, worth ~5 pts top-1) |
| `scripts/model-labels.mjs`, `scripts/fix-model-batch.py`, `scripts/copy-litert.mjs` | Model prep: European flags per label (iNat), fix dynamic batch for LiteRT.js, copy wasm runtime to `public/litert/` (gitignored) |
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
- Photo identifier: suggestion only, user confirms; preselect only when p >= CONFIDENT (0.5). Measured on 232 post-2023
  European iNat photos of 29 dex species in Chromium: top-1 74.6%, top-3 85.8%; "Probably" shown for 78%, right 84%.
  Re-measure after any preprocessing or model change (browser resize alone once cost 5 points).
- Catch: CATCH button / tapping an uncaught silhouette opens the photo input directly (no `capture`: the OS offers camera
  or library), then a square finger-only crop (react-easy-crop, no slider), then
  identification on the crop. From a species page it is silent unless `mismatch()` fires (top >= 0.5 and selected < 0.1:
  measured 7.3% false alarms, catches 70% of lookalike mix-ups); from the list it suggests the top 3.
- Several photos per find (v0.9.0, issue #1): up to 4 (`MAX_PHOTOS`), first = cover, no cover label (Sam): drag the
  thumbnails to reorder (pointer events, iOS has no HTML drag on touch; tap without moving = crop; arrow keys move). `Find.photos` = [{id, path}];
  the cover keeps the find id as its IndexedDB key and `photo_path` mirrors it (old finds and old app versions keep
  working). Each photo is cropped and identified on its own, then `combineGuesses` takes the geometric mean (measured
  on pairs of the same species: 74% -> 91% top-1 with 2 photos, 95% with 3; mean of p 89%, max 87%). Without
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
  are drawn without the log/trunk (Sam). Generic `gilled` is only for true plain caps; check new genera land elsewhere.
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
- Lookalikes (v0.8.2): same `DexTile` component as the dex grid (badge, picture, ball, fitted name); one tile look everywhere.
- Order (v0.10.5, Sam): a Settings pref `sort` = "no" (by dex number = popularity rank, DEFAULT) or "az" (A to Z in the
  UI language, `sortByName`); core and lookalikes, PREV/NEXT follow it. Synced per account like lang/mode (column added
  by migration 0004; without it the pref stays on the device, no error).

## Skills
| Skill | When |
|---|---|
| `release-checklist` | Anything shipping to main |

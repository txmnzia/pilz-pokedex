Load the txmnzia-conventions skill before editing.

# Pilzdex (pilz-pokedex)

A Pokédex for the mushrooms Sam finds. Classic red handheld UI, mobile first. 30 species ranked from real data, each with
lookalikes that get their own pages (EX-nn). Uncaught species show a black silhouette; caught ones show your photo.
FR/EN/DE. Vite + React + TS, Supabase (shared project, schema `pilz_pokedex`, bucket `pilz_pokedex`), magic-link auth,
local-first (works offline, syncs when signed in). Deployed to GitHub Pages from `main` via Actions.

## Commands
- `npm run dev` / `npm run build` / `npm test` / `npm run lint`
- `npm run check-data` validates `public/data/species.json`
- `npm run scrape` regenerates data into `public/data/species.next.json` (needs network access to api.inaturalist.org,
  query.wikidata.org, *.wikipedia.org). Validate, then move over `species.json`. Responses are cached in `.cache/`.

## Map
| File | Role |
|---|---|
| `scripts/scrape.mjs` | Scraper: iNaturalist (ranking, regions, season), Wikidata (names, edibility, morphology), Wikipedia (text, lookalikes) |
| `scripts/check-data.mjs` | Data validation + review list (edibility conflicts, missing names) |
| `data/edibility-overrides.json` | Human decisions for conflicting/missing edibility, applied by the scraper (optional file) |
| `public/data/species.json` | Generated data, fetched at runtime (NetworkFirst in the SW, never precached) |
| `src/lib/species.ts` | Pure: silhouette shape, season label, lookalikes, text fallback |
| `src/lib/finds.ts` | Pure: merge (never drops), soft delete, grouping |
| `src/lib/i18n.ts` | All UI strings FR/EN/DE |
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
| `supabase/migrations/` | SQL to paste in the Supabase SQL editor (0001 finds + bucket, 0002 settings) |
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
- Icons (v0.7.0, design/icons.html option 4H): edibility = "LED" lamps with a faint top-left shine and a white
  12x12 pixel glyph: edible fork+knife on green, no interest plate on grey, toxic ! on purple, deadly skull on dark,
  unverified ? on beige. One component: `EdIcon` in `src/components/Art.tsx`.
- Caught marker (option 2H): `CaughtBall`, glossy red/white capture ball when caught, a faint dashed "ghost" outline when
  not (must read as empty, not as a grey ball). List rows show it for every species; grid tiles only for caught ones
  (bottom-left of the picture).
- Order: always A to Z by the name in the UI language (`sortByName`), core and lookalike extras; PREV/NEXT follow it.
  Dex numbers stay rank-based, so they are not sequential in the list.

## Skills
| Skill | When |
|---|---|
| `release-checklist` | Anything shipping to main |

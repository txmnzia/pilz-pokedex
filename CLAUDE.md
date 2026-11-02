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
| `src/screens.tsx` | Login, Dex (grid/list), Entry (2 pages), Catch, Settings |
| `src/App.tsx` | State, hardware buttons (big yellow CATCH = photo picker, D-pad scrolls / steps species, B=back, PAGE), auth, sync, re-crop |
| `supabase/migrations/` | SQL to paste in the Supabase SQL editor (0001 finds + bucket, 0002 settings) |
| `design/mockup.html` | Original UX mockup (mock data) |

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
- Service worker registered in `src/main.tsx` (not auto-injected): update check on load, on tab return, hourly;
  a new version activates and reloads by itself (iOS kept v0.4.0 for several deploys before this).
  Backstop: `version.json` (emitted at build, never cached) is compared with the running version; if the server is
  newer and the worker has not taken over in 4 s, the app unregisters it, clears caches and navigates to `?v=<live>`
  (a plain reload was answered from Safari's HTTP cache, max-age 600); the `v` param is stripped on load. Once per version.
- Android check: Galaxy S22 simulation (360x690 Chrome tab, 360x780 app) in fr/de: no off-screen control, no horizontal
  overflow, tile names fit (only "Frühlings-Knollenblätterpilz" wraps mid-word).

## Next item (requested by Sam, not started)
Simplify the UX:
- Catch form: remove Note, Date and Place fields and the "Other photo" button. Keep GPS coordinates in memory.
  Tapping the photo re-opens the photo picker/crop to change it.
- Dex filters: All / Caught / Missing and the 4 edibility filters on a single line.
- Icons: edible must not be a check mark (confused with "caught"). Caught stays a small dot, but not red.
Open questions to ask Sam first (form): edible icon (fork & knife / leaf / plate), caught dot colour
(yellow like CATCH / ink / blue), keep the date saved automatically and shown in "My finds" or drop it.

## Skills
| Skill | When |
|---|---|
| `release-checklist` | Anything shipping to main |

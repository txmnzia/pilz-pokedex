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
| `src/lib/sync.ts` | Supabase upload/upsert/pull, signed photo URLs |
| `src/screens.tsx` | Login, Dex (grid/list), Entry (2 pages), Catch, Settings |
| `src/App.tsx` | State, hardware buttons (D-pad, A=catch, B=back, PAGE, LANG), auth, sync |
| `supabase/migrations/` | SQL to paste in the Supabase SQL editor |
| `design/mockup.html` | Original UX mockup (mock data) |

## Hard rules
- Author and committer `txmnzia <14270570+txmnzia@users.noreply.github.com>`; no Co-Authored-By / session / "Generated with" trailers.
- Work on a branch, then merge to `main` and push; deploy only from `main`.
- No secrets in the repo. Supabase URL/anon key are repo Variables. No real personal data in fixtures.
- Bump `version` in package.json on every user-visible change (shown in the device header).
- Tests + lint + check-data before merging.
- Species data is scraped, never hand-written. Human edibility decisions go in `data/edibility-overrides.json` with a reason.
- Finds: every mutation mirrors to localStorage; remote merges never drop local finds; deletes are soft.

## Skills
| Skill | When |
|---|---|
| `release-checklist` | Anything shipping to main |

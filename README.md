# Pilzdex

A Pokédex for the mushrooms I find around Berlin and Grenoble. Live: https://txmnzia.github.io/pilz-pokedex/

- 30 species ranked by iNaturalist research-grade observations in Germany + France × number of Wikipedia language editions
- Each species: FR/EN/DE names, edibility (edible / no interest / toxic / deadly, or unverified), season from observations,
  morphology, Berlin/Grenoble presence, Wikipedia text, and lookalikes that get their own page
- Catch: take a photo, pick the species, GPS + place + note. Local-first, synced to Supabase when signed in (magic link)
- Grid or list view, FR / EN / DE

**Not an identification guide. Never eat a mushroom based on this app.**

## Data
Regenerate with `npm run scrape` (writes `public/data/species.next.json`), check with
`node scripts/check-data.mjs public/data/species.next.json`, then move it over `public/data/species.json`.
Sources: iNaturalist API, Wikidata (CC0), Wikipedia FR/EN/DE (CC BY-SA 4.0, link kept per entry).

## Setup
1. Supabase SQL editor: run `supabase/migrations/0001_pilz_pokedex.sql`, then add `pilz_pokedex` to Settings > Data API > Exposed schemas.
2. Supabase Auth > URL configuration: add `https://txmnzia.github.io/pilz-pokedex/` to Redirect URLs.
3. Repo Settings > Secrets and variables > Actions > Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
4. Repo Settings > Pages > Source: GitHub Actions.

Dev: `npm i && npm run dev` (copy `.env.example` to `.env` for Supabase; without it the app runs local-only).

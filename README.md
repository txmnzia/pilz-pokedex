# Pilzdex

A Pokédex for the mushrooms I find around Berlin and Grenoble. Live: https://txmnzia.github.io/pilz-pokedex/

- 120 species (v0.10.0): the original 30, every deadly species observed in France or Germany (Wikidata + Wikipedia
  "Deadly fungi"), then edible and famous species ranked by iNaturalist observations in FR + DE × Wikipedia languages;
  plus 136 lookalikes with their own pages
- Each species: FR/EN/DE names, edibility (edible / no interest / toxic / deadly, or unverified), season from observations,
  morphology, Berlin/Grenoble presence, Wikipedia text, and lookalikes that get their own page
- Catch: one photo button (camera or library, chosen in the OS menu), crop and zoom on the mushroom, date + GPS from the
  photo when it is an older one. From a species page, a silent check warns only if the photo looks like another species. Local-first, synced to Supabase when signed in (magic link)
- Photo suggestions on the phone, offline, no account: MobileNetV2 fungi model (species-classifiers by M. Graham,
  Apache-2.0, iNaturalist 2021), European species only. Measured 74.6% top-1 / 85.8% top-3 on 232 recent photos. Suggestion only.
- Grid or list view, FR / EN / DE (set in Settings, kept per account)

**Not an identification guide. Never eat a mushroom based on this app.**

## Data
Regenerate with `npm run scrape` (writes `public/data/species.next.json`), check with
`node scripts/check-data.mjs public/data/species.next.json`, then move it over `public/data/species.json`.
Sources: iNaturalist API, Wikidata (CC0), Wikipedia FR/EN/DE (CC BY-SA 4.0, link kept per entry).

## Setup
1. Supabase SQL editor: run `supabase/migrations/0001_pilz_pokedex.sql` and `0002_settings.sql`, then add `pilz_pokedex` to Settings > Data API > Exposed schemas.
2. Supabase Auth > URL configuration: add `https://txmnzia.github.io/pilz-pokedex/` to Redirect URLs.
3. Repo Settings > Secrets and variables > Actions > Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
4. Repo Settings > Pages > Source: GitHub Actions.

Dev: `npm i && npm run dev` (copy `.env.example` to `.env` for Supabase; without it the app runs local-only).

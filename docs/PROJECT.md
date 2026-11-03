# Pilzdex: project handoff

Everything agreed with Sam so far, so the next session does not re-ask or re-litigate. `CLAUDE.md` is the short
operational version (map, hard rules, iOS notes); this file is the why, the decisions and the backlog.
State at writing: v0.16.0 (349 dex species incl. the former lookalikes, 451 rares; FungiTastic identifier), live at https://txmnzia.github.io/pilz-pokedex/ (deploy from `main` via Actions).

## 1. Working with Sam

- Get to the point, no praise, no sugar-coating. Never use dashes like "—" in prose.
- Ask questions only through the form tool (AskUserQuestion), never as open text. When proposing solutions, give
  2 to 4 options with trade-offs and a recommendation. Contradict Sam when a request is technically wrong.
- Sam writes in French or English; answer in the language of the message.
- Show before building when the change is visual and not obvious: render options (Playwright screenshot or an
  artifact page in `design/`), let Sam pick, then implement. Sam reacts to screenshots from his iPhone.
- Ship flow (no need to ask): branch `claude/...`, commit as `txmnzia <14270570+txmnzia@users.noreply.github.com>`
  (author AND committer, no trailers), lint + test + check-data, merge to `main`, push, wait for the Actions run to be
  green (`gh api repos/txmnzia/pilz-pokedex/actions/runs?per_page=1`), bump `version` in package.json on every
  user-visible change. Update CLAUDE.md / this file when behaviour or a decision changes.
- Verify visually before claiming done: `node tests/ui/fit-check.cjs` against `npx vite preview --port 4193`
  (Playwright is preinstalled), plus a screenshot of the changed screen. Kill servers with `fuser -k 4193/tcp`
  (never `pkill`, it killed the session shell once). The preview server dies when the session restarts.
- Sandbox network: txmnzia.github.io is blocked by the proxy (403), so the live page can't be fetched; check the
  Actions run (GitHub MCP `actions_list`) instead and ask Sam to look at the version in the header. Node scripts need
  `NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt`. static.inaturalist.org is blocked too (only the
  inaturalist-open-data S3 bucket works for photos). Run long scrapes detached: `setsid nohup ... & disown`.
- Do not change anything inside the device frame when fixing layout around Safari bars. Do not suggest clearing
  Safari website data (the apps share an origin). Sam dislikes red frames / red rings and anything overflowing.
- This is a private, personal tool. Pokédex homage (red handheld, type badges, capture ball) is fine.

## 2. Core features (what exists)

- 181 dex species (v0.14.0) + 168 lookalike-only species (EX-nn), each with its own page. Uncaught = black silhouette, caught =
  your latest photo with a capture ball in the corner.
- Species page (2 pages on phones, PAGE pill / swipe; on the web page 2 lives in the right panel): name, dex number,
  edibility badge, Latin name, Wikipedia intro (source link, CC BY-SA), season bars, morphology, Berlin / Grenoble
  presence, habitat text, lookalikes (same tiles as the dex), my finds (re-crop, delete with confirm).
- Catch: big yellow CATCH button or tapping an uncaught silhouette opens the OS photo picker (camera or library, no
  `capture` attribute), square finger-only crop, then on-device identification on the crop. Date and GPS are taken
  from EXIF, else today and current position, and shown on one line. Form = photo + species only.
- Several photos per catch (v0.9.0, issue #1): up to 4, each cropped, first = cover (no label: drag thumbnails to
  reorder, v0.9.1, Sam; tap = crop, arrow keys move),
  identification combines all photos (geometric mean). Species page 1 is a gallery of every photo of every find.
  Migration `0003_photos.sql` has been run in Supabase (Sam, 2026-11-02), so all photos sync.
- On-device identifier (LiteRT.js wasm, MobileNetV2 fungi model, Apache-2.0): suggestion only, European species only,
  preselect only when p >= 0.5. From a species page it stays silent unless the photo clearly looks like another species
  (`mismatch()`); from the list it suggests the top 3. Measured 74.6% top-1 / 85.8% top-3; re-measure after any
  preprocessing or model change.
- Local-first: finds in localStorage, photos in IndexedDB, works offline; magic-link login syncs to Supabase
  (schema `pilz_pokedex`, bucket `pilz_pokedex`). Merges never drop local finds, deletes are soft, photo paths are
  versioned so re-crops propagate. Language + grid/list prefs synced per account (newer wins).
- Rares (v0.12.0): off-dex species the photo model knows can be caught too (Raretés section, R-01.., name + photos,
  "Données non disponibles", edibility ???). Regenerate names with `node scripts/scrape-rares.mjs` after a dex re-scrape.
- Compare before confirming (v0.13.0): reference photos next to suggestions, comparison screen, full-screen photos,
  side-by-side "are you sure" alert. Refresh with `python3 scripts/scrape-refs.py` after a dex or rares re-scrape.
- Settings: language FR/EN/DE, grid/list, account, export JSON, restore backup, data credits, disclaimer.
- Web >= 900px: two-panel Pokédex (left device, right panel with filters/progress, page 2, catch form, settings,
  10 latest-finds keys, PREV/NEXT).
- Caching: network first, service worker with skipWaiting/clientsClaim, `version.json` backstop that force-reloads a
  stuck old version once.

## 3. How the mushrooms are scraped (never hand-written)

Script: `npm run scrape` (`scripts/scrape.mjs`) writes `public/data/species.next.json`; validate with
`node scripts/check-data.mjs public/data/species.next.json`, then move it over `public/data/species.json`.
Never overwrite production data in place. Responses are cached in `.cache/`. Needs network to api.inaturalist.org,
query.wikidata.org, *.wikipedia.org, www.mycodb.fr.

1. Candidate pool: iNaturalist research-grade species counts in Germany (place 7207) + France (6753), taxa
   Agaricomycetes + Pezizomycetes (mushroom-forming, no lichens).
2. Selection (v0.10.0, issue #2, Sam: FR + DE only, ~120, absolute max 150): the original 30 keep numbers 1-30; then
   every DEADLY species with >= 1 research-grade observation in FR + DE (sources: Wikidata P789 deadly + English
   Wikipedia "Category:Deadly fungi"; renamed iNat taxa are followed to their current id); then the free slots are
   split half and half: most famous EDIBLE species, then most famous of everything left. Fame = (obs DE + obs FR) x
   number of Wikipedia language editions. v0.14.0 (Sam): then every European species the photo model knows that is
   observed in FR + DE and is not already in the dex is appended (121-181, by fame); `--no-model` skips that step.
   Existing numbers never change. `node scripts/scrape.mjs --plan` prints the selection without scraping.
   Wikipedia rate-limits the sandbox hard (429 with ~50 s waits even at 1 request / 6 s): a full run takes hours;
   run it detached (`setsid nohup ... &`), everything is cached in `.cache/`. Node fetch needs
   `NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt` in the sandbox.
3. Names: Wikidata labels FR/EN/DE, fallback iNaturalist common names, last resort Latin (flagged for review).
4. Edibility: Wikidata P789, worst value wins (deadly > toxic > caution > edible > none). When Wikidata conflicts or
   is missing, mycodb.fr is the tie-breaker (also tried on Wikidata synonyms). Human decisions go in
   `data/edibility-overrides.json` WITH a reason. Current override: Gyromitra esculenta = deadly (Wikidata says
   "edible when cooked"). Still unknown, shown as "???": Oudemansiella mucida, Collybia nuda (Wikidata conflict),
   Laricifomes officinalis, Amylocystis lapponica, Dacrymyces chrysospermus, Hydnum umbilicatum, Stropharia caerulea,
   Mycena tintinnabulum.
5. Morphology: Wikidata P783 to P788 (hymenium, cap, attachment, stipe, spores, ecology).
6. Text: Wikipedia FR/EN/DE intro + habitat section (fallback to another language is labelled), source URL kept.
7. Lookalikes: links in Wikipedia "similar species / confusion / Verwechslung" sections, resolved to Wikidata
   species with an iNaturalist id, kept only if Fungi with >= 10 research-grade observations in Europe, max 4 per
   species. Lookalikes outside the dex become EX-nn entries with their own pages (scraped the same way).
8. Regions and season: iNaturalist observations within 50 km of Berlin and Grenoble; month histogram for the season.
   Observation counts are NOT shown in the UI (Sam removed them). Months are shown as names, not roman numerals.
9. Silhouette shape is the only per-species choice made in code (`shapeOf` in `src/lib/species.ts`): species
   override, then genus table, then Wikidata morphology. It is illustration, not data.

## 4. UX / UI principles and decisions (Sam's choices)

Visual language
- Classic red handheld Pokédex, LCD green screen, VT323 for text, Press Start 2P for labels. Mobile first.
- Silhouettes are solid black, no light gaps (pieces drawn as separate paths). Only the cage fungus keeps lattice
  holes. Tree polypores: `bracket` thin shelves (Trametes...), `hoof` (Fomes, Fomitopsis, Ganoderma...), `rosette`
  wavy tiers (Laetiporus, Meripilus); Clathrus archeri = `starfish`.
- Edibility = Pokédex "type" badges (Gen 4 bevelled, `design/badges.html` option C). All badges of a kind have the
  SAME width: word badge 60px (84px on the species page), glyph badge 24px (20px under 380px). Labels max 7 chars:
  EN EDIBLE / BLAND / TOXIC / DEADLY / ???; FR COMEST / FADE / TOXIQUE / MORTEL / ???; DE ESSBAR / FADE / GIFTIG /
  TÖDLICH / ???. Colours: grass green, normal beige, red (toxic is red, not purple), dark, teal for ???.
  Word badge on tiles, species page and list rows (glyph under 360px); glyph in filters, progress, suggestions.
- Caught marker: glossy red/white capture ball; uncaught in the list = faint dashed "ghost" ball (must read as empty,
  not as a grey ball). Grid: ball only on caught tiles, bottom-left of the photo.
- One tile look everywhere: lookalikes use the same `DexTile` as the dex grid (EX tiles keep the dashed border).

Layout
- Filters: All / Caught / Missing + 4 edibility glyphs on ONE line on every screen (iPhone SE, 13, Galaxy S22,
  320px, fr/en/de). Grid is 2 columns on phones; tile names auto-fit (15 to 11 px), never clipped.
- List row: number column 28px, 6px gaps, so names get the room; badge and ball vertically centred.
- Order: Settings > Tri: by number (popularity rank, default) or A to Z (v0.10.5, Sam); PREV/NEXT follow it.
  Needs migration `0004_sort.sql` to sync across devices.
- iOS: html/body red behind the Dynamic Island and URL bar, 100lvh layout, controls ~17pt above Safari's bar.
- Web: two panels nested on the same line, hinge inside both panels, right panel shadow, no PAGE pill.
- Language and grid/list live in Settings (burger), not on the main screen; the burger closes Settings again.
- CATCH is the most prominent control; its label must fit (no oversized "ATTRAPER").

Design artifacts (all in `design/`, published as claude.ai artifacts)
- `mockup.html`: original UX + web two-panel design (https://claude.ai/artifact/U6nJ9KcsPvGqQFGh28YGdQ)
- `icons.html`: earlier icon exploration (LED and ball options; superseded for edibility by badges)
- `badges.html`: type-badge options, option C chosen (https://claude.ai/artifact/PQszbEioeKok55gZxnm5iW)

## 5. Backlog / open points

Data
- [x] The 8 "???" species (list in section 3) stay "???" on purpose (Sam, 2026-11-02). Do not ask again; only revisit
      if a source (Wikidata, mycodb) starts giving a value after a re-scrape.
- [x] v0.15.0 (Sam, 2026-11-03): "recognition is often wrong, test alternatives, build a golden dataset". Golden set =
      3511 iNat photos (data/golden.json); benchmark of the old model, FungiTastic, BioCLIP 2 and iNat online
      (artifact https://claude.ai/artifact/GK4yGKL94CxvYUgpSM6HSm). Sam chose FungiTastic in the app (offline). Root cause
      of the old failures: the old model knew only 175 of the 360 app taxa (0% on the others) and announced 32% of
      deadly photos as an edible species. Do not re-litigate; next steps are below.
- [ ] FungiTastic knows 297 of the 360 app taxa; the 63 others (e.g. Cortinarius orellanus, Amanita verna, Mycena pura,
      Battarrea phalloides) can't be suggested. Options offered: own classifier on our 360 taxa (distil BioCLIP 2), or
      BioCLIP 2 / iNat online when there is a network.
- [ ] Sam's own photos for the golden set: Sam agreed to send them as attachments with their names; storage not
      decided yet (private Supabase bucket recommended; the repo is PUBLIC, never put them there).
- [x] v0.15.1 (Sam: 46 MB too heavy): int8 model, 24 MB, -0.3 pt, twice as fast (0.6 s per photo in desktop Chromium).
      Int4 does not run (XNNPACK). Not chosen yet: background download on Wi-Fi, old model as fallback.
- [ ] Measure on Sam's iPhone (download time, seconds per photo). LiteRT.js has a WebGPU accelerator to try if slow.
- [x] v0.15.2 (Sam could not add Russula sardonia): rares widened to FungiTastic mushroom species with >= 20 research-grade
      observations in FR+DE: 451 (was 11). Options offered: all ~2500 on the fly / common in FR+DE scraped (chosen) /
      all scraped / case by case. Their comparison photos load from iNaturalist (not hosted). 1286 known species seen
      in FR+DE at all; below 20 obs they stay non-addable.
- [x] v0.14.0 (Sam, 2026-11-03): "can the rares become normal species?" Answer chosen: the 61 model species seen in
      FR + DE joined the dex as 121-181 (Sam accepted going past the old 150 cap; the test now allows up to 200).
      Model labels outside the mushroom classes were offered and Sam took only the ~10 forest fungi, as rares
      (`ALSO` set in `scripts/scrape-rares.mjs`). Do not re-ask.
- [ ] New ??? species from v0.14.0 (kept ??? per Sam's rule): Crucibulum laeve, Trametes cinnabarina, Trametes betulina,
      Merulius tremellosus, Panaeolus foenisecii. Latin name shown as fallback: Pholiotina rugosa (fr), Panaeolus
      antillarum (fr, en).
- [ ] 5 lookalikes have no open-licence reference photo (silhouette instead): Paxillus rubicundulus, Lactarius
      semisanguifluus, Pholiota limonella, Leccinum piceinum, Clavulinopsis helvola.

UI
- [ ] Lookalike EX tiles: dashed border kept for consistency with the dex; Sam was offered solid borders on the
      species page (one-line change), no answer yet.
- [ ] Long names are truncated in list rows on iPhone 13 since the 60px word badge (Sam chose to keep the word).
- [ ] Badge text is 7px Press Start 2P: fine on retina, check legibility if a non-retina screen matters.
- [ ] Remaining silhouettes are generic per genus/morphology; refine any that Sam flags (same process: render options
      at tile and list size, Sam picks, species override or genus table).
- [ ] "Frühlings-Knollenblätterpilz" is the only tile name that breaks mid-word.

Code hygiene
- [ ] Dead CSS from earlier iterations: `.lk*` (old lookalike tiles), `.edpill*`, LED colour vars `--ed/--none/--tox/
      --dead`. Remove in one pass and re-run `tests/ui/fit-check.cjs`.
- [ ] `design/icons.html` still shows superseded LED options; mark it as historical or delete.

- [x] v0.16.0 (Sam): everything counts in one total "X attrapés" (no x/N); lookalikes numbered 182-349 in the dex.
      Options offered: lookalikes as dex 182-349 + "X attrapés" (chosen), separate counters, single total keeping
      EX numbers, rename only. Regions keep x/y; ask Sam if he wants them as plain counts too.

Sam's side (not code)
- [ ] Migration `supabase/migrations/0004_sort.sql` (sort pref sync): Sam never confirmed running it (0003 is run).
- [ ] Save the updated `add-db/` and `new-app/` skills from txmnzia/claude-skills into the Claude account.

## 6. Release checklist (short)

lint, `npm test`, `npm run check-data`, `npm run build`, `node tests/ui/fit-check.cjs` (all OK), screenshot of the
changed screen, version bumped, CLAUDE.md / this file updated, `git diff` scanned for tokens, merge to main, Actions
green. The `release-checklist` skill has the full list.

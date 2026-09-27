# Poster assets — provenance and pipeline

Every poster in `public/images/` came from two delivered archives. This file
records where they came from, what had to be reconciled to use them, and how to
rebuild them.

## Provenance

| Source | Contents | Layout as delivered |
| --- | --- | --- |
| `FanHubArtilligenceAssets.zip` | 2,264 images across anime, games, kpop, manga, tvshows + 5 `results.csv` | `images/<fandom>/by_genre_small/<genre>/<file>.jpg` |
| `fan-hub-images.zip` | 944 images across comic, movie | `images/<category>/<genre>/<file>.jpg` |

**These are not licensed artwork.** They were collected by scraping image search
results — the `results.csv` files carry the `query_used`, `matched_title` and
`score` columns that prove it. Film, comic and album artwork is copyrighted by
its respective owners. They are committed here because the team decided the
benefit of a demonstrable, fully-populated catalogue outweighed the risk for a
competition submission. **They are not redistributable**, and any release
outside the jury review should replace them through the licensed path that
`importCatalog.mjs` already supports.

The `results.csv` files are kept verbatim in `data/provenance/` so any individual
image can be traced back to the query that found it.

## What had to be reconciled

The delivered filenames matched the catalogue's slugs only **8%** of the time.
Four separate problems, all resolved in `scripts/importImages.mjs`:

1. **Separators and apostrophes.** Files are `snake_case`
   (`akame_ga_kill`); the catalogue slug is `kebab-case` (`akame-ga-kill`).
   Worse, the catalogue's `slugify` *deletes* an apostrophe, so `Wolf's Rain`
   becomes `wolfs-rain` while the scraper spelled it `wolf_s_rain` →
   `wolf-s-rain`. Comparing both sides with all non-alphanumerics removed
   ("loose key") collapses every one of these differences at once, and also
   matches `nu-est` to the slug for `NU'EST`.

2. **Genre or year baked into the filename.** `portal-puzzle`,
   `rocket-league-racing`, `god-of-war-2018`. These resolve by stripping a
   trailing token, but only when that token is a genre the fandom actually uses
   or a 4-digit year — never on a guess.

3. **Qualifiers left in the filename.** The image filenames were built from the
   *raw* list titles, so `13 Reasons Why (Mystery)` became
   `13_reasons_why_mystery.jpg` while the catalogue slug is `13-reasons-why`.
   The matcher is given the same qualifier vocabulary the title parser uses
   (`QUALIFIER_TOKENS` in `scripts/lib/catalogParse.mjs`), which is why tvshows
   reaches 100% coverage.

4. **PNG files named `.jpg`.** 21 files in the comic delivery are PNGs with a
   `.jpg` extension. Format is detected from the file's own header and the
   extension is corrected, so a strict static host serving `Content-Type:
   image/jpeg` cannot hand the browser PNG bytes.

Also handled: 21 `_dup` / `_dup_remove` scraper artefacts (stripped before
matching — note `bibi_zhou_dup_remove` names a title the importer deliberately
drops, so it correctly matches nothing), and 114 titles delivered twice with two
*different* images, where the first in sorted order is kept so the choice is
reproducible.

Three images are deliberately **not** attached, because no safe match exists:

| File | Why |
| --- | --- |
| `games/viva_pi_ata.jpg` | filename typo; catalogue slug is `viva-pinata` |
| `tvshows/90_day_fianc.jpg` | filename dropped the final `e` of *Fiancé* |
| `kpop/bibi_zhou_dup_remove.jpg` | names a title the importer drops on purpose |

## Manga is intentionally excluded

The delivery includes 394 **manga** images (shonen / shojo / seinen / josei) but
they match the `comics` fandom only **7%** — it is a different taxonomy, not a
different spelling. Zip B's `comic` set matches at 93% and is what the comics
fandom uses. Folding manga in would have meant inventing genre mappings, which
would mis-file titles, so it is left for a deliberate pass. The raw images are
untouched in the source archive.

## Rebuilding

```bash
# 1. extract both archives somewhere outside the repo
#    <staging>/zipA/images/...   and   <staging>/zipB/images/...

# 2. regenerate the tvshows source list from its provenance CSV
node scripts/buildTvshowsCatalog.mjs

# 3. copy + rename every image, writing src/data/posters.json
node scripts/importImages.mjs <staging>            # add --dry-run to preview

# 4. rebuild the catalogue and the seed SQL from that manifest
node scripts/buildCatalog.mjs
node scripts/importCatalog.mjs movies data/movies_by_genre.json movies/movies-with-posters.json
node scripts/importCatalog.mjs anime    data/anime_by_genre.json
node scripts/importCatalog.mjs games    data/games_by_genre.json
node scripts/importCatalog.mjs comics   data/comics_by_genre.json
node scripts/importCatalog.mjs kpop     data/kpop_by_genre.json
node scripts/importCatalog.mjs tvshows  data/tvshows_by_genre.json

# 5. prove the JSON, the SQL and the files on disk all agree
node scripts/verifyCatalog.mjs
```

`importImages.mjs` exits non-zero if any filename matches more than one
catalogue title, because that is the only failure mode that can attach the
*wrong* image to a title. Everything else is reported and left unattached.

## Coverage

2,696 of 2,934 titles (92%):

| Fandom | Posters | Titles | |
| --- | ---: | ---: | ---: |
| tvshows | 447 | 448 | 100% |
| movies | 507 | 513 | 99% |
| games | 556 | 575 | 97% |
| anime | 436 | 509 | 86% |
| kpop | 346 | 405 | 85% |
| comics | 404 | 484 | 83% |

The anime, kpop and comics shortfalls are almost entirely the phantom titles
where a genre word was typed into the title column of the source list
(`"Bleach Supernatural"`, `"Baccano! Thriller"`, `"A Silent Voice Romance"`) —
89 rows that duplicate a real title. Fixing those is tracked separately; merging
each into its base title would raise all three.

`data/poster-coverage.json` records this table so a regression is visible in a
diff.

## Aspect ratios are not uniform

The delivery mixes portrait posters, squares and 16:9 stills, so
`PosterThumb` crops everything to a fixed 2:3 with `object-cover`. A grid where
each tile keeps its own shape reads as broken. Per-image dimensions and ratio are
recorded in `src/data/posters.json` if a later pass wants to re-crop properly.

## Serving

`poster_path` in the database is a **URL path** (`/images/<fandom>/<slug>.<ext>`),
served by Vite from `public/`. It is not a filesystem path and not a full URL.
`scripts/verifyCatalog.mjs` resolves every one of them against `public/` and
fails if the file is absent — the check whose absence previously let all 513
movie rows carry a TMDB path for a download that never ran, while
`catalog.json` said `null` for the same titles and the verifier still reported
OK.

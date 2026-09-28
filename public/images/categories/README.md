# Category banners

One fandom photograph per category. Filenames are fixed and must match exactly —
they are listed in `src/lib/categoryBanners.ts`, not guessed from the slug, so
that a fandom whose name and slug differ (`k-pop` → `kpop.jpg`, `tv-shows` →
`tv-shows.jpg`) is unambiguous.

| File | Category | Route | Source in `Downloads` |
|---|---|---|---|
| `movies.jpg` | Movies | `/category/movies` | `Movies.jpeg` |
| `anime.jpg` | Anime | `/category/anime` | `AnimeHero.jpeg` |
| `gaming.jpg` | Gaming | `/category/gaming` | `gamesHero.jpeg` |
| `comics.jpg` | Comics | `/category/comics` | `Comic.jpeg` |
| `kpop.jpg` | K-Pop | `/category/k-pop` | `KoreanHero.jpeg` |
| `tv-shows.jpg` | TV Shows | `/category/tv-shows` | `TvHero.jpeg` |
| `cosplay.jpg` | Cosplay | `/category/cosplay` | `Cosplay.jpeg` |
| `manga.svg` | Manga | `/category/manga` | — **generated, not supplied** |

Seven are 1600×900 (one is 1600×901) JPEGs, ~2.2 MB together.

**`manga.svg` is drawn, not photographed.** Manga was the only category that
arrived without artwork, so rather than leave it as a bare gradient beside seven
photographs it is generated: manga visual language (panel grid, screentone
halftone, radiating speed lines) in the site palette, at the same 1600×900. It is
deliberately abstract — a generated illustration of a fictional character would
misrepresent the category, whereas a panel composition reads as "manga" without
claiming to be a specific title. It is the one `.svg` among the `.jpg` files and
that is expected, not an oversight.

To replace it with a real photograph, drop a 1600×900 JPEG at
`public/images/categories/manga.jpg` and point `CATEGORY_BANNERS.manga` at that
path in `src/lib/categoryBanners.ts`. The two are interchangeable — both are CSS
backgrounds, so either extension paints the same way.

## Refreshing them

`scripts/placeCategoryArt.mjs` copies the current files in and reports their
dimensions:

```powershell
node scripts\placeCategoryArt.mjs --apply
```

## Where each one shows up

- **The category page banner** — full-width, left-weighted scrim over the image so
  the title, blurb and count chips stay readable.
- **The "Categories" grid on the home page** — square tiles, image over the
  purple wash, with a bottom scrim behind the name chip.
- **The homepage hero carousel** — three of these are reused as slide backdrops
  (`anime`, `movies`, `gaming`), each with its call to action pointing at that
  category. Reused rather than duplicated so the homepage and the category it
  advertises cannot drift apart. Defined in `SLIDES` in `src/lib/mockData.ts`.

## A missing file is not a broken page

The images are CSS backgrounds, not `<img>` elements, so a path that fails to
load does not paint and the purple gradient underneath shows through instead.
All eight categories now have an entry in `CATEGORY_BANNERS`, so that fallback is
a safety net rather than a state you should ever see. Nothing to catch.

### Don't trust a 200 from the dev server

`vite dev` answers a request for a missing image with `index.html` rather than a
404 — HTTP 200, `Content-Type: text/html`, about 1 KB. A CSS background cannot
decode that, so it correctly does not paint and the gradient shows, which is the
behaviour you want. But checking by opening the URL, or with
`Invoke-WebRequest`, will convince you the image is there when it is not. Check
the `Content-Type` is `image/jpeg`, not just the status.

## If you add a new fandom

Add the slug and path to `CATEGORY_BANNERS` in `src/lib/categoryBanners.ts`. The
slug must match the one in `categories` in the database and the one the router
uses, or the page will not find its own artwork.

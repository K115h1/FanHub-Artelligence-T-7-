// buildCatalog.mjs, flattens the fandom JSON lists into one catalogue the
// frontend can browse.
//
// The database already holds these titles, but there is no API yet, so the
// admin panel needs the same data client-side. This generates
// src/data/catalog.json from the SAME source files that produced the SQL, so
// the panel and the database agree. When the API lands, this file and the SQL
// importer both become redundant.
//
// Title parsing lives in lib/catalogParse.mjs, shared with importCatalog.mjs.
//
// Usage: node scripts/buildCatalog.mjs

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { FANDOMS as FANDOM_MAP, parseTitle, slugify } from "./lib/catalogParse.mjs";

/** Emission order. Each entry mirrors one row of the shared FANDOMS table. */
const FANDOMS = [
  { key: "movies", file: "data/movies_by_genre.json" },
  { key: "anime", file: "data/anime_by_genre.json" },
  { key: "games", file: "data/games_by_genre.json" },
  { key: "comics", file: "data/comics_by_genre.json" },
  { key: "kpop", file: "data/kpop_by_genre.json" },
  { key: "tvshows", file: "data/tvshows_by_genre.json" },
].map((f) => ({ ...f, ...FANDOM_MAP[f.key] }));

const MANIFEST = "src/data/posters.json";

/**
 * Poster paths come from the image manifest, not from this script.
 *
 * The manifest is produced by buildImageManifest.mjs by matching the files in
 * public/images/ against these same slugs. It is optional: before the images
 * land there is nothing to point at, and a missing manifest should leave every
 * posterPath null rather than fail the build.
 */
function loadPosters() {
  if (!existsSync(MANIFEST)) {
    console.log(`  (no ${MANIFEST} yet — every posterPath stays null)`);
    return new Map();
  }
  const raw = JSON.parse(readFileSync(MANIFEST, "utf8"));
  // Keyed by fandom as well as slug: slugs are unique per fandom but not
  // across fandoms, a comic and a film can both be "django".
  return new Map(raw.map((p) => [`${p.fandom}|${p.slug}`, p]));
}

const posters = loadPosters();
const catalogue = [];
let dropped = 0;
let withPoster = 0;

for (const fandom of FANDOMS) {
  const byGenre = JSON.parse(readFileSync(fandom.file, "utf8"));
  // Per-fandom bucket list, so a qualifier only folds into a genre that
  // actually exists in this fandom.
  const realGenres = Object.keys(byGenre);
  const contents = new Map();

  for (const [genre, titles] of Object.entries(byGenre)) {
    for (const entry of titles) {
      const parsed = parseTitle(entry, realGenres, fandom.key);
      if (parsed.dropped) {
        dropped++;
        continue;
      }
      const slug = slugify(parsed.title);
      let row = contents.get(slug);
      if (!row) {
        row = { title: parsed.title, slug, releaseYear: null, genres: new Set() };
        contents.set(slug, row);
      }
      if (!row.releaseYear && parsed.year) row.releaseYear = Number(parsed.year);
      row.genres.add(genre);
      // The qualifier's own bucket is a genre too, e.g. "Spider-Man (Family)".
      if (parsed.genreHint) row.genres.add(parsed.genreHint);
    }
  }

  // Sort by slug and lay ids out in the fandom's own 1000-wide block, exactly
  // as importCatalog.mjs does, so a title's id here is its content_id in MySQL.
  const rows = [...contents.values()].sort((a, b) => a.slug.localeCompare(b.slug));
  rows.forEach((row, i) => {
    const poster = posters.get(`${fandom.key}|${row.slug}`);
    if (poster) withPoster++;
    catalogue.push({
      id: fandom.idBase + i + 1,
      title: row.title,
      slug: row.slug,
      fandom: fandom.key,
      categorySlug: fandom.categorySlug,
      contentType: fandom.type,
      releaseYear: row.releaseYear,
      genres: [...row.genres].sort(),
      posterPath: poster ? poster.path : null,
      synopsis: null,
      status: "released",
    });
  });
}

catalogue.sort((a, b) => a.id - b.id);

mkdirSync("src/data", { recursive: true });
const out = join("src/data", "catalog.json");
writeFileSync(out, JSON.stringify(catalogue), "utf8");

const perFandom = {};
for (const item of catalogue) perFandom[item.fandom] = (perFandom[item.fandom] ?? 0) + 1;

console.log(`Wrote ${out}`);
console.log(`  ${catalogue.length} titles, ${dropped} dropped as "dup remove"`);
console.log("  " + Object.entries(perFandom).map(([k, v]) => `${k} ${v}`).join(" | "));
console.log(`  ${withPoster}/${catalogue.length} have a poster`);

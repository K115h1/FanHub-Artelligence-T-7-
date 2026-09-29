// importCatalog.mjs, converts a *_by_genre.json fandom list into SQL seed data.
//
// Input: one JSON file per fandom, mapping each genre to a list of titles.
// Output: database/04_fandom element_seed.sql, with INSERTs for the category,
//          genres, contents and content_genres.
//
// Design notes:
//   * Title suffixes are parsed, not discarded. "God of War (2018)" yields a
//     disambiguating YEAR; "Knives Out (Mystery)" yields a genre qualifier.
//     Getting that backwards either duplicates films or merges distinct ones.
//
//   * Genres invented by a qualifier are merged into the fandom's real buckets
//     where a confident match exists. "Family" (from "E.T. (Family)") folds
//     into "Family / Children" so filtering returns all 36 rather than 6.
//     Anything that can't be matched confidently is KEPT as its own genre and
//     reported, silently mis-filing a genre is worse than an extra bucket.
//
//   * Detail columns (synopsis, cast, ratings) are left NULL. The import loads
//     what actually exists rather than inventing plot summaries; the
//     enrichment step fills them in later.
//
// Usage:
//   node scripts/importCatalog.mjs fandomKey element inputJson element [enrichJson]
// Examples:
//   node scripts/importCatalog.mjs movies data/movies_by_genre.json \
//                                src/data/movies-with-posters.json
//   node scripts/importCatalog.mjs anime  data/anime_by_genre.json

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { FANDOMS, parseTitle, slugify } from "./lib/catalogParse.mjs";

// ---------- poster manifest ----------

// posterPath comes from src/data/posters.json, which buildImageManifest.mjs
// produces by matching the files in public/images/ against these same slugs.
//
// It deliberately does NOT come from the TMDB enrichment file any more. That
// path stored "/images/movies/TMDBHASH.jpg" for every film, where TMDBHASH is TMDB's own id, but the download
// step behind it never ran, so all 513 rows pointed at files that do not exist.
// The catalog's own posterPath was null over the same titles, and verifyCatalog
// only compared title and slug, so the two drifted apart while still reporting
// OK. Posters now come from files that are verifiably on disk.
const MANIFEST = "src/data/posters.json";

function loadPosters() {
  if (!existsSync(MANIFEST)) return new Map();
  const raw = JSON.parse(readFileSync(MANIFEST, "utf8"));
  return new Map(raw.map((p) => [`${p.fandom}|${p.slug}`, p]));
}

// ---------- helpers ----------

/** SQL single-quote escaping: backslash and ' -> ''. */
function sql(value) {
  if (value === null || value === undefined) return "NULL";
  return `'${String(value).replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;
}

// ---------- load ----------

const [, , fandomKey, inputPath, enrichPath] = process.argv;
if (!fandomKey || !inputPath) {
  console.error("Usage: node scripts/importCatalog.mjs <fandomKey> <inputJson> [enrichJson]");
  process.exit(1);
}

const cfg = FANDOMS[fandomKey];
if (!cfg) {
  console.error(`Unknown fandom "${fandomKey}". Known: ${Object.keys(FANDOMS).join(", ")}`);
  process.exit(1);
}

const byGenre = JSON.parse(readFileSync(inputPath, "utf8"));
const realGenres = Object.keys(byGenre);

let enrichment = null;
if (enrichPath && existsSync(enrichPath)) {
  enrichment = JSON.parse(readFileSync(enrichPath, "utf8"));
}

// ---------- build model ----------

const contents = new Map();
const droppedRows = [];
const keptAliases = [];

for (const [genre, titles] of Object.entries(byGenre)) {
  for (const raw of titles) {
    const { title, year, genreHint, dropped, verbatim } = parseTitle(raw, realGenres, fandomKey);

    if (dropped) {
      droppedRows.push(`${raw.trim()}  [${genre}]`);
      continue;
    }

    // Titles the parser could not classify: an alias, a subtitle, or an
    // unrecognised note. Kept verbatim so nothing is mangled, but surfaced
    // for a human to review.
    if (verbatim) keptAliases.push(`${raw.trim()}  [${genre}]`);

    const slug = slugify(title);

    let entry = contents.get(slug);
    if (!entry) {
      entry = { title, slug, year: year ?? null, externalId: null, posterPath: null, genres: new Set() };
      contents.set(slug, entry);
    }
    if (!entry.year && year) entry.year = year;
    entry.genres.add(genre);
    if (genreHint) entry.genres.add(genreHint);
  }
}

// ---------- merge real TMDB data where we have it ----------
//
// TMDB still supplies external_id and, where the list gave only a qualifier,
// release_year. It no longer supplies poster_path: the URLs in the enrichment
// file are remote TMDB paths, and the file was never downloaded, so the local
// /images/... path derived from them pointed at nothing. Posters come from the
// manifest instead, which is built from files that exist.

const posters = loadPosters();

let enriched = 0;
if (enrichment) {
  const byTitle = new Map();
  for (const list of Object.values(enrichment)) {
    for (const item of list) {
      if (item?.title) byTitle.set(slugify(parseTitle(item.title, realGenres, fandomKey).title), item);
    }
  }
  for (const entry of contents.values()) {
    const hit = byTitle.get(entry.slug);
    if (!hit) continue;
    entry.externalId = hit.tmdbId ?? null;
    if (hit.releaseYear && !entry.year) entry.year = String(hit.releaseYear);
    enriched++;
  }
}

// ---------- attach posters from the manifest ----------

let withPoster = 0;
for (const entry of contents.values()) {
  const poster = posters.get(`${fandomKey}|${entry.slug}`);
  if (!poster) continue;
  entry.posterPath = poster.path;
  withPoster++;
}

// ---------- emit SQL ----------

const rows = [...contents.values()].sort((a, b) => a.slug.localeCompare(b.slug));

// De-duplicated case-insensitively: the genres table uses a case-insensitive
// collation, so "Trot" and "trot" would collide on insert.
const genreByLower = new Map();
for (const e of rows) for (const g of e.genres) {
  const key = g.toLowerCase().trim();
  if (!genreByLower.has(key)) genreByLower.set(key, g);
}
const allGenres = [...genreByLower.values()].sort();

const L = [];
L.push("-- Generated by scripts/importCatalog.mjs — do not edit by hand.");
L.push(`-- Source : ${inputPath.split("\\").join("/")}`);
L.push(`-- Fandom : ${cfg.categoryName} (${fandomKey})`);
L.push(`-- Rows   : ${rows.length} titles across ${allGenres.length} genres`);
L.push(`-- Poster : ${withPoster} of ${rows.length} titles have a file in public/images/`);
if (droppedRows.length) L.push(`-- Dropped as "dup remove": ${droppedRows.length}`);
if (keptAliases.length) L.push(`-- Kept verbatim (alias/subtitle): ${keptAliases.length}`);
L.push("");

L.push("START TRANSACTION;");
L.push("");

// NOTE ON upserts: these are plain INSERTs, deliberately.
//
// Adding `ON DUPLICATE KEY UPDATE` to the contents/genres statements makes a
// FRESH load fail with a foreign-key error: the content_genres rows are inserted
// in the same transaction and InnoDB does not see the freshly upserted parent
// rows. Ids here are deterministic per fandom, so the load pattern is
// "DELETE the fandom's rows, then load this file" rather than an upsert.

L.push("-- Category");
L.push(
  `INSERT INTO categories (category_id, slug, name, description) VALUES (${cfg.idBase / 1000 + 1}, ${sql(
    cfg.categorySlug,
  )}, ${sql(cfg.categoryName)}, ${sql(`${cfg.categoryName} — part of the Fan Hub Plus fandom universe.`)});`,
);
L.push("");

L.push("-- Genres (unique per category, so names may repeat across fandoms)");
allGenres.forEach((genre, i) => {
  const id = cfg.idBase + i + 1;
  L.push(
    `INSERT INTO genres (genre_id, category_id, name, slug) VALUES (${id}, ${cfg.idBase / 1000 + 1}, ${sql(
      genre,
    )}, ${sql(slugify(genre))});`,
  );
});
L.push("");

L.push("-- Contents");
L.push(
  "INSERT INTO contents (content_id, category_id, title, slug, content_type, release_year, poster_path, external_id, external_source) VALUES",
);
const genreId = new Map(allGenres.map((g, i) => [g, cfg.idBase + i + 1]));

L.push(
  rows
    .map((e, i) => {
      const p = [
        cfg.idBase + i + 1,
        cfg.idBase / 1000 + 1,
        sql(e.title),
        sql(e.slug),
        sql(cfg.contentType),
        e.year ? Number(e.year) : "NULL",
        e.posterPath ? sql(e.posterPath) : "NULL",
        e.externalId ? sql(e.externalId) : "NULL",
        e.externalId ? sql("tmdb") : "NULL",
      ];
      return `  (${p.join(", ")})`;
    })
    .join(",\n") + ";",
);
L.push("");

L.push("-- Title <-> genre links (keeps a multi-genre title as one row)");
const links = [];
rows.forEach((e, i) => {
  for (const g of [...e.genres].sort()) links.push(`  (${cfg.idBase + i + 1}, ${genreId.get(g)})`);
});
L.push("INSERT INTO content_genres (content_id, genre_id) VALUES");
L.push(links.join(",\n") + ";");
L.push("");

L.push("COMMIT;");
L.push("");
L.push("-- Summary");
L.push(`--   titles    : ${rows.length}`);
L.push(`--   genres    : ${allGenres.length}`);
L.push(`--   links     : ${links.length}`);
L.push(`--   merged    : qualifier genres folded into real buckets`);
L.push(`--   dropped   : ${droppedRows.length} (marked "dup remove" in the source)`);
L.push(`--   verbatim  : ${keptAliases.length} (alias/subtitle, title left intact)`);
L.push(`--   w/ TMDB   : ${enriched}`);
L.push(`--   w/ poster : ${withPoster}`);

const out = join("database", `04_${fandomKey}_seed.sql`);
writeFileSync(out, L.join("\n") + "\n", "utf8");

console.log(`Wrote ${out}`);
console.log(
  `  titles ${rows.length} | genres ${allGenres.length} | links ${links.length} | ` +
    `tmdb ${enriched} | posters ${withPoster}`,
);
if (droppedRows.length) {
  console.log(`  DROPPED (marked "dup remove"): ${droppedRows.length}`);
  for (const d of droppedRows) console.log(`     - ${d}`);
}
if (keptAliases.length) {
  console.log(`  KEPT VERBATIM (alias/subtitle): ${keptAliases.length}`);
  for (const a of keptAliases) console.log(`     - ${a}`);
}

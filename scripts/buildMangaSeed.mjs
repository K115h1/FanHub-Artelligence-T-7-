// buildMangaSeed.mjs — turns data/provenance/manga_results.csv into
// database/04_manga_seed.sql.
//
// Manga is the seventh fandom and the only one of the eight with a provenance
// CSV but no seed: the six catalogue imports came from data/*_by_genre.json,
// which has no manga equivalent. The CSV is the leftover record of an earlier
// scrape, and it is the only manga title list this repo has — 449 rows, 0 with
// a fetch error.
//
// Two things about that CSV are worth knowing before editing this:
//
//   * It is RFC-4180 quoted. Titles like `Kanojo, Okarishimasu` and
//     `Snow, Flower, and the Full Moon` contain commas, so a naive
//     split(",") shifts every field after the title and invents genres out of
//     title words — `It's My Turn!!"` and `Flower` both come from that. The
//     parser below is hand-rolled rather than a dependency because it is the
//     only CSV in the repo that needs quoting at all.
//   * Its `status` column ('downloaded' / 'no_match') describes whether an
//     IMAGE was found, not the content. It is deliberately not written to
//     contents.status; every row is a released series.
//
// Posters: all 394 image_path values point into public/images/manga/, which
// does not exist — the scrape recorded intended paths, not files on disk. The
// seed therefore leaves poster_path NULL, which is what the other five
// title-less fandoms already do and what ContentCard's accent-wash fallback is
// built for. Writing a path to a file that is not there is the dead-poster bug
// scripts/fixPosterPaths.mjs exists to repair, so it is not done here. Re-run
// with --posters once real covers land and the script will fill them in.
//
// Usage: node scripts/buildMangaSeed.mjs [--posters]

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { slugify } from "./lib/catalogParse.mjs";

const SOURCE = "data/provenance/manga_results.csv";
const OUT = "database/04_manga_seed.sql";

const CATEGORY_ID = 7;
const CATEGORY_SLUG = "manga";
const CATEGORY_NAME = "Manga";
const CATEGORY_DESC = "Japanese comics and their adaptations";
// Every fandom owns a 1000-wide id block keyed off its category_id, so manga
// is 7001+ and cannot collide with tv-shows (5001) or anything added later.
const ID_BASE = CATEGORY_ID * 1000;
const CONTENT_TYPE = "manga";

const withPosters = process.argv.includes("--posters");

/** RFC 4180: quoted fields, "" escapes a literal quote, newlines inside quotes. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') { quoted = true; continue; }
    if (ch === ",") { row.push(field); field = ""; continue; }
    if (ch === "\r") continue;
    if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; continue; }
    field += ch;
  }
  if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

// parseCsv keeps the header as its first row, so destructure it off the front
// rather than skipping a row.
const [header, ...body] = parseCsv(readFileSync(SOURCE, "utf8"));
const cols = header.map((c) => c.trim());
const records = body.map((r) => Object.fromEntries(cols.map((c, i) => [c, (r[i] ?? "").trim()])));

// ---------- genres ----------

// A row can carry more than one bucket, joined with ";". Split on that rather
// than on "," so a genre containing a slash ("Mystery / Thriller") survives.
const genreNames = new Set();
for (const rec of records) {
  for (const g of rec.genres.split(";").map((s) => s.trim()).filter(Boolean)) genreNames.add(g);
}
const genres = [...genreNames].sort((a, b) => a.localeCompare(b));
const genreId = new Map(genres.map((name, i) => [name, ID_BASE + 1 + i]));

// ---------- titles ----------

const seenSlugs = new Set();
const titles = [];
let droppedDupes = 0;

for (const rec of records) {
  const title = rec.title.trim();
  if (!title) continue;
  const slug = slugify(title);
  // contents.slug is unique per category, so a collision has to be dropped
  // rather than silently overwriting the earlier title.
  if (!slug || seenSlugs.has(slug)) { droppedDupes++; continue; }
  seenSlugs.add(slug);

  const rel = rec.image_path ? rec.image_path.replace(/\\/g, "/") : "";
  const onDisk = rel !== "" && existsSync(join("public", rel));

  titles.push({
    title,
    slug,
    genreNames: rec.genres.split(";").map((s) => s.trim()).filter(Boolean),
    poster: onDisk ? rel : null,
  });
}

// Sorted by slug so the id layout is stable across re-runs, which is how
// importCatalog.mjs and buildCatalog.mjs both keep content_id reproducible.
titles.sort((a, b) => a.slug.localeCompare(b.slug));
titles.forEach((t, i) => { t.id = ID_BASE + 1 + i; });

// ---------- emit ----------

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const withPoster = titles.filter((t) => t.poster).length;

const out = [];
out.push("-- Generated by scripts/buildMangaSeed.mjs - do not edit by hand.");
out.push(`-- Source : ${SOURCE}`);
out.push(`-- Fandom : ${CATEGORY_NAME} (${CATEGORY_SLUG})`);
out.push(`-- Rows   : ${titles.length} titles across ${genres.length} genres`);
out.push(`-- Poster : ${withPoster} of ${titles.length} titles have a file in public/images/`);
out.push("--");
out.push("-- poster_path is NULL for every row. The CSV records the image path the");
out.push("-- scrape intended, but public/images/manga/ does not exist, so every one of");
out.push("-- those paths is a 404. Cards fall back to the accent-wash state.");
out.push("-- Re-run with --posters once real covers are on disk.");
out.push("--");
out.push("-- Load with the other 04_* files, BEFORE 05_reference_data.sql: that file");
out.push("-- upserts all eight categories and 05 must not run first.");
out.push("");
out.push("START TRANSACTION;");
out.push("");
out.push("-- Category");
out.push("-- An upsert, unlike the plain INSERT the other 04_* files use. Those rely on");
out.push("-- 05_reference_data.sql not having run yet; this file has to survive being");
out.push("-- loaded into a database where 05 already created all eight categories,");
out.push("-- which is the normal state of an existing install. Same statement as 05's,");
out.push("-- so loading 04 before or after 05 both work.");
out.push(
  `INSERT INTO categories (category_id, slug, name, description) VALUES ` +
  `(${CATEGORY_ID}, ${q(CATEGORY_SLUG)}, ${q(CATEGORY_NAME)}, ${q(CATEGORY_DESC)}) ` +
  `ON DUPLICATE KEY UPDATE slug = VALUES(slug), name = VALUES(name), ` +
  `description = VALUES(description);`,
);
out.push("");
out.push("-- Genres");
for (const name of genres) {
  out.push(
    `INSERT INTO genres (genre_id, category_id, name, slug) VALUES ` +
    `(${genreId.get(name)}, ${CATEGORY_ID}, ${q(name)}, ${q(slugify(name))});`,
  );
}
out.push("");
out.push("-- Contents");
out.push(
  "INSERT INTO contents (content_id, category_id, title, slug, content_type, status, release_year, poster_path, external_id, external_source) VALUES",
);
const contentRows = titles.map(
  (t) =>
    `  (${t.id}, ${CATEGORY_ID}, ${q(t.title)}, ${q(t.slug)}, ${q(CONTENT_TYPE)}, 'released', NULL, ` +
    `${t.poster ? q("/" + t.poster) : "NULL"}, NULL, NULL)`,
);
// Every row but the last carries a trailing comma, and the statement itself
// needs its semicolon — omitting it runs the next INSERT on as a syntax error.
out.push(contentRows.join(",\n") + ";");
out.push("");
out.push("-- Content <-> genre");
out.push("INSERT INTO content_genres (content_id, genre_id) VALUES");
const links = [];
for (const t of titles) {
  for (const name of new Set(t.genreNames)) {
    const id = genreId.get(name);
    if (id !== undefined) links.push(`  (${t.id}, ${id})`);
  }
}
out.push(links.join(",\n") + ";");
out.push("");
out.push("COMMIT;");

writeFileSync(OUT, out.join("\n") + "\n", "utf8");

console.log(`Wrote ${OUT}`);
console.log(`  ${titles.length} titles, ${genres.length} genres, ${links.length} title/genre links`);
console.log(`  ids: content ${ID_BASE + 1}..${titles.at(-1).id}, genre ${ID_BASE + 1}..${ID_BASE + genres.length}`);
console.log(`  ${withPoster} of ${titles.length} have a poster on disk${withPosters ? " (--posters)" : ""}`);
if (droppedDupes) console.log(`  ${droppedDupes} dropped as duplicate slugs`);

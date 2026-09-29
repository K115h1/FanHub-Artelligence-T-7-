// verifyCatalog.mjs, proves src/data/catalog.json agrees with the seed SQL.
//
// The admin panel and the database must describe the same catalogue, otherwise
// the panel shows titles the database has never heard of. This parses the
// generated seed files and diffs them against the JSON the frontend ships.
//
// Usage: node scripts/verifyCatalog.mjs

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const SEEDS = [
  { file: "database/04_movies_seed.sql", categorySlug: "movies", fandom: "movies" },
  { file: "database/04_anime_seed.sql", categorySlug: "anime", fandom: "anime" },
  { file: "database/04_games_seed.sql", categorySlug: "gaming", fandom: "games" },
  { file: "database/04_comics_seed.sql", categorySlug: "comics", fandom: "comics" },
  { file: "database/04_kpop_seed.sql", categorySlug: "k-pop", fandom: "kpop" },
  { file: "database/04_tvshows_seed.sql", categorySlug: "tvshows", fandom: "tvshows" },
];

const catalogue = JSON.parse(readFileSync("src/data/catalog.json", "utf8"));
const fromJson = new Map(catalogue.map((row) => [row.id, row]));

/**
 * Pulls the contents rows out of one seed file as { id -> { slug, title, posterPath } }.
 *
 * Line-based on purpose. Slicing the file at the first ";" breaks on titles
 * that contain one, "Chaos;Head" and "Steins;Gate" are both in the games
 * seed, and silently truncates the comparison. The files put one row per
 * line, so read the contents block a line at a time instead.
 */
function parseSeed(file) {
  const lines = readFileSync(file, "utf8").split("\n");
  const rows = new Map();

  // Match the id, the quoted title/slug pair, and poster_path. Titles contain
  // commas and doubled apostrophes, so don't split the line on commas.
  const rowRe =
    /^\s*\(\s*(\d+)\s*,\s*\d+\s*,\s*'((?:[^']|'')*)'\s*,\s*'([^']*)'\s*,\s*'[^']*'\s*,\s*(?:NULL|\d+)\s*,\s*(NULL|'[^']*')/;

  let inContents = false;
  for (const line of lines) {
    if (!inContents) {
      if (/^INSERT INTO contents\b/.test(line)) inContents = true;
      continue;
    }
    if (/^INSERT INTO|^START TRANSACTION|^COMMIT/i.test(line)) break;

    const m = rowRe.exec(line);
    if (m) {
      const poster = m[4] === "NULL" ? null : m[4].slice(1, -1);
      rows.set(Number(m[1]), { title: m[2].replace(/''/g, "'"), slug: m[3], posterPath: poster });
    }
  }
  if (rows.size === 0) throw new Error(`no contents rows parsed from ${file}`);
  return rows;
}

/**
 * Every poster_path in the seeds must point at a file that is actually there.
 *
 * This is the check whose absence let the catalogue and the database disagree
 * while verifyCatalog still printed OK. All 513 movie rows carried
 * "/images/movies/HASH.jpg" for a download that never ran, while catalog.json
 * had posterPath null over the same titles, the comparison only looked at
 * title and slug, so the disagreement was invisible. A path in the database
 * that resolves to nothing is a broken image in the UI, so it is worth proving.
 *
 * The stored value is a URL path ("/images/..."), served by Vite out of
 * public/, so that is the directory the file has to exist under.
 */
function verifyPosterFiles(rows) {
  let missing = 0;
  for (const [id, row] of rows) {
    if (!row.posterPath) continue;
    const rel = join("public", row.posterPath.replace(/^\/+/, ""));
    if (!existsSync(rel)) {
      say(`  MISSING FILE id=${id} ${row.title} -> ${row.posterPath}`);
      missing++;
    }
  }
  return missing;
}

let problems = 0;
const say = (msg) => {
  console.log(msg);
};

for (const seed of SEEDS) {
  const sqlRows = parseSeed(seed.file);
  let mismatched = 0;
  let missing = 0;
  let posterMismatch = 0;

  for (const [id, sqlRow] of sqlRows) {
    const jsonRow = fromJson.get(id);
    if (!jsonRow) {
      say(`  MISSING in JSON: ${seed.file} id=${id} ${sqlRow.title}`);
      missing++;
      continue;
    }
    if (jsonRow.slug !== sqlRow.slug || jsonRow.title !== sqlRow.title) {
      say(
        `  MISMATCH id=${id}  SQL="${sqlRow.title}" (${sqlRow.slug})  ` +
          `JSON="${jsonRow.title}" (${jsonRow.slug})`,
      );
      mismatched++;
    }
    // Poster paths must agree too, or the admin panel shows artwork the
    // database will never serve.
    const sqlPoster = sqlRow.posterPath ?? null;
    const jsonPoster = jsonRow.posterPath ?? null;
    if (sqlPoster !== jsonPoster) {
      say(
        `  POSTER MISMATCH id=${id} ${sqlRow.title}  ` +
          `SQL=${sqlPoster ?? "NULL"}  JSON=${jsonPoster ?? "NULL"}`,
      );
      posterMismatch++;
    }
  }

  // Anything in the JSON for this category that the SQL never emitted.
  const extra = catalogue.filter(
    (row) => row.categorySlug === seed.categorySlug && !sqlRows.has(row.id),
  ).length;

  const missingFiles = verifyPosterFiles(sqlRows);
  const total = sqlRows.size;
  const withPoster = [...sqlRows.values()].filter((r) => r.posterPath).length;

  say(
    `${seed.file.padEnd(30)} ${String(total).padStart(5)} rows  ` +
      `missing=${missing}  mismatched=${mismatched}  extra-in-json=${extra}  ` +
      `poster-mismatch=${posterMismatch}  missing-files=${missingFiles}  ` +
      `posters=${withPoster}`,
  );
  problems += missing + mismatched + extra + posterMismatch + missingFiles;
}

say("");
say(problems === 0 ? "OK - catalog.json matches the seed SQL exactly." : `${problems} problem(s).`);
process.exit(problems === 0 ? 0 : 1);

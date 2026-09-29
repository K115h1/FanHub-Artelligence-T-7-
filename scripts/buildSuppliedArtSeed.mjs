// buildSuppliedArtSeed.mjs, rebuilds database/08_supplied_art_seed.sql from the
// artwork actually sitting in public/images/.
//
// WHY THIS EXISTS
//   merchandise_items and character_profiles were seeded from a generated SQL
//   file, and that file was deleted while scripts/importSuppliedArt.mjs was
//   rewritten to place images only. The images are still on disk (45 merch, 14
//   cosplay) but both tables were left empty, so /merchandise and the Costumes
//   strip on /category/cosplay had nothing to show.
//
//   Deriving the seed from the filesystem rather than from the original zips is
//   deliberate. A row whose image_path points at a file that is not there is the
//   dead-poster bug that scripts/fixPosterPaths.mjs exists to repair, and it
//   happened once already: every one of the 513 movie posters was a dead link
//   because the paths and the filenames were generated in two separate runs.
//   Reading the directory listing means the path in the SQL is the path that was
//   just confirmed to exist, so the two cannot drift.
//
//   scripts/importSuppliedArt.mjs is still the thing that fetches and places the
//   images. This is only the step that turns what landed on disk into rows.
//
// OUTPUT
//   Every statement is INSERT. SELECT. WHERE NOT EXISTS, so the file is
//   safe to re-run and safe to run against a database that already has rows.
//   It never deletes: a row that is in the database but not on disk is left
//   alone for a human to decide on, rather than silently disappearing.
//
// Usage: node scripts/buildSuppliedArtSeed.mjs [--check]

import { readdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { slugify } from "./lib/catalogParse.mjs";

const MERCH_DIR = "public/images/merchandise";
const CHAR_DIR = "public/images/characters/cosplay";
const OUT = "database/08_supplied_art_seed.sql";

const IMAGE = /\.(jpe?g|png|webp|avif)$/i;

// Folder name under public/images/merchandise -> categories.slug. The folders
// are already the category slugs, but going through a map means a folder called
// something else fails loudly here rather than producing a row that silently
// never matches a category.
const MERCH_CATEGORY = {
  anime: "anime",
  cosplay: "cosplay",
  "k-pop": "k-pop",
  manga: "manga",
  comics: "comics",
  movies: "movies",
  gaming: "gaming",
  "tv-shows": "tv-shows",
};

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

/**
 * Turns a slugified filename back into something readable.
 *
 * The images were saved with slugified names, so this is lossy in one direction
 * only: `anime-plushie-said.jpg` -> `Anime Plushie Said`, which is what a shop
 * listing wants. Where a filename is genuinely a placeholder (`anime-item-01`)
 * this cannot invent a better name, and it does not try — it capitalises what is
 * there and leaves the judgement to whoever captions the product later.
 */
function displayName(slug) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => (/^\d+$/.test(part) ? part : part[0].toUpperCase() + part.slice(1)))
    .join(" ");
}

function listImages(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && IMAGE.test(e.name))
    .map((e) => e.name.replace(IMAGE, ""))
    .sort();
}

// ---------- merchandise ----------

const merchRows = [];
const merchSlugs = new Set();

for (const folder of existsSync(MERCH_DIR) ? readdirSync(MERCH_DIR, { withFileTypes: true }) : []) {
  if (!folder.isDirectory()) continue;

  const category = MERCH_CATEGORY[folder.name];
  if (!category) {
    console.warn(`  skipping unknown merchandise folder: ${folder.name}`);
    continue;
  }

  for (const base of listImages(join(MERCH_DIR, folder.name))) {
    const slug = slugify(base);
    if (!slug) continue;
    // contents/merchandise slugs are unique, and two source files can slugify
    // to the same thing once punctuation is stripped. Keep the first and say so
    // rather than emitting a pair that collides on load.
    if (merchSlugs.has(slug)) {
      console.warn(`  duplicate merchandise slug, keeping the first: ${slug}`);
      continue;
    }
    merchSlugs.add(slug);
    merchRows.push({
      category,
      name: displayName(slug),
      slug,
      path: `/images/merchandise/${folder.name}/${slug}.jpg`,
    });
  }
}

// ---------- characters ----------

const charRows = [];
const charSlugs = new Set();

for (const base of listImages(CHAR_DIR)) {
  const slug = slugify(base);
  if (!slug) continue;
  if (charSlugs.has(slug)) {
    console.warn(`  duplicate character slug, keeping the first: ${slug}`);
    continue;
  }
  charSlugs.add(slug);
  charRows.push({
    category: "cosplay",
    name: displayName(slug),
    slug,
    path: `/images/characters/cosplay/${slug}.jpg`,
  });
}

if (process.argv.includes("--check")) {
  console.log(`${merchRows.length} merchandise rows, ${charRows.length} character rows`);
  console.log("(--check: nothing written)");
  process.exit(0);
}

// ---------- emit ----------

const out = [];
out.push("-- Generated by scripts/buildSuppliedArtSeed.mjs - do not edit by hand.");
out.push("-- Source: the image files present in public/images/, not the original zips.");
out.push(`-- Rows   : ${merchRows.length} merchandise_items, ${charRows.length} character_profiles`);
out.push("--");
out.push("-- Every image_path below points at a file this script just listed, so none of");
out.push("-- them can be a dead link. Regenerate after adding or removing artwork.");
out.push("--");
out.push("-- Idempotent: INSERT ... SELECT ... WHERE NOT EXISTS throughout, so re-running");
out.push("-- is a no-op rather than a duplicate-key error. Nothing is deleted.");
out.push("--");
out.push("-- Load AFTER 05_reference_data.sql - the category lookups need categories.");
out.push("");
out.push("START TRANSACTION;");

out.push("");
out.push("-- ---------- merchandise_items ----------");
for (const r of merchRows) {
  out.push(
    `INSERT INTO merchandise_items (category_id, name, slug, image_path, is_upcoming)\n` +
    `SELECT c.category_id, ${q(r.name)}, ${q(r.slug)}, ${q(r.path)}, 1\n` +
    `FROM categories c\n` +
    `WHERE c.slug = ${q(r.category)}\n` +
    `  AND NOT EXISTS (SELECT 1 FROM merchandise_items t WHERE t.slug = ${q(r.slug)});`,
  );
}

out.push("");
out.push("-- ---------- character_profiles ----------");
for (const r of charRows) {
  out.push(
    `INSERT INTO character_profiles (category_id, name, slug, image_path)\n` +
    `SELECT c.category_id, ${q(r.name)}, ${q(r.slug)}, ${q(r.path)}\n` +
    `FROM categories c\n` +
    `WHERE c.slug = ${q(r.category)}\n` +
    `  AND NOT EXISTS (SELECT 1 FROM character_profiles t WHERE t.slug = ${q(r.slug)});`,
  );
}

out.push("");
out.push("COMMIT;");

writeFileSync(OUT, out.join("\n") + "\n", "utf8");

const perCategory = {};
for (const r of merchRows) perCategory[r.category] = (perCategory[r.category] ?? 0) + 1;

console.log(`Wrote ${OUT}`);
console.log(`  ${merchRows.length} merchandise_items  (${Object.entries(perCategory).map(([k, v]) => `${k} ${v}`).join(", ")})`);
console.log(`  ${charRows.length} character_profiles  (cosplay)`);

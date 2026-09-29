// importImages.mjs, moves the delivered poster files into public/images/,
// named by catalog slug, and writes src/data/posters.json.
//
// The two delivered archives are laid out for browsing, not for serving:
//
//   zipA  images/fandom element/by_genre_small/genre element/file element.jpg
//   zipB  images/category element/genre element/file element.jpg
//
// Both use snake_case filenames, both repeat a title once per genre folder, and
// neither filename matches the catalogue's slug. Matching them exactly found
// only 8% of titles. Three separate differences had to be reconciled:
//
//   1. Separators.  wolf_s_rain  vs  the slug "wolfs-rain". The catalogue's
//      slugify DELETES an apostrophe ("Wolf's" -> "Wolfs"), while the scraper
//      spelled it out as its own _s_ token. So "wolf-s-rain" != "wolfs-rain".
//   2. Genre baked into the filename.  portal-puzzle, rocket-league-racing,
//      kino-s-journey-mystery, the scraper appended the folder name.
//   3. Year baked into the filename.  god-of-war-2018, dead-space-2023.
//
// All three fall out of one normalisation: compare slugs with every
// non-alphanumeric character removed ("loose key"). That turns wolf-s-rain and
// wolfs-rain into the same key, and nu-est into the same key as "NU'EST".
//
// Anything that still does not match is reported and left out rather than
// guessed at, and a poster is only attached when exactly one catalogue title
// matches, an ambiguous name is reported, never silently resolved.
//
// Usage:
//   node scripts/importImages.mjs stagingDir element [--dry-run]

import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, copyFileSync, existsSync, rmSync } from "node:fs";
import { join, basename, extname } from "node:path";
import { QUALIFIER_TOKENS } from "./lib/catalogParse.mjs";

const OUT_DIR = "public/images";
const MANIFEST = "src/data/posters.json";
const BASELINE = "data/poster-coverage.json";

// Source fandom -> catalogue fandom. "manga" is intentionally absent: its 394
// images are a different taxonomy (shonen / shojo / seinen / josei) and only 7%
// of them match the comics catalogue. Forcing them in would mis-file genres, so
// they stay out until that taxonomy is mapped on purpose.
const SOURCES = [
  { fandom: "anime", layout: "nested", dir: "zipA/images/anime" },
  { fandom: "games", layout: "nested", dir: "zipA/images/games" },
  { fandom: "kpop", layout: "nested", dir: "zipA/images/kpop" },
  { fandom: "tvshows", layout: "nested", dir: "zipA/images/tvshows" },
  { fandom: "comics", layout: "flat", dir: "zipB/images/comic" },
  { fandom: "movies", layout: "flat", dir: "zipB/images/movie" },
];

/** Loose key: lowercase, alphanumeric only. Collapses every separator difference. */
const loose = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

/**
 * Scrapers mark re-downloads by suffixing the filename. These are artefacts of
 * the collection run, not part of any title, so the suffix is always stripped.
 * "bibi_zhou_dup_remove" additionally names a title importCatalog drops
 * outright, so stripping its suffix cannot resurrect a deleted row, it simply
 * fails to match and is reported.
 */
const DUP_SUFFIX = /_dup(_remove)?$/;

/**
 * Real format and dimensions, read from the file's own header.
 *
 * The delivered zipB contains 21 PNGs saved with a.jpg extension, so trusting
 * the extension both misreports the type and hides the dimensions. Browsers
 * sniff content and would render them anyway, but a CDN or strict static host
 * that trusts Content-Type would serve them as image/jpeg and some refuse to
 * decode that. The extension is therefore corrected to match the bytes.
 *
 * Dimensions come from the SOF marker (JPEG) or the IHDR chunk (PNG). Pulling
 * in an image library for two integers per file is not worth the dependency.
 */
function probeImage(buf) {
  // PNG: 8-byte signature, then an IHDR chunk whose payload starts with w,h.
  if (buf.length > 24 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { format: "png", ext: ".png", width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  // GIF: logical screen descriptor holds w,h as little-endian uint16.
  if (buf.length > 10 && buf.slice(0, 3).toString("latin1") === "GIF") {
    return { format: "gif", ext: ".gif", width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
  }
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length - 9) {
      if (buf[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = buf[i + 1];
      // SOF0..SOF15, excluding DHT (C4), JPG (C8) and DAC (CC).
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { format: "jpeg", ext: ".jpg", height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
      }
      const len = buf.readUInt16BE(i + 2);
      if (len < 2) break;
      i += 2 + len;
    }
    return { format: "jpeg", ext: ".jpg", width: null, height: null };
  }
  return { format: "unknown", ext: ".bin", width: null, height: null };
}

/** Every.jpg under a directory, recursively, in a stable order. */
function walk(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (extname(entry.name).toLowerCase() === ".jpg") out.push(full);
  }
  // readdirSync order is filesystem-dependent. Sorting is what makes "which
  // copy of a duplicated title wins" reproducible across machines.
  return out.sort();
}

// ---------- load catalogue ----------

const catalog = JSON.parse(readFileSync("src/data/catalog.json", "utf8"));

// Loose key -> the catalogue slugs claiming it. Built per fandom because slugs
// are unique per fandom but not across fandoms (a comic and a film are both
// "django"), and because a collision inside one fandom is a real ambiguity.
const byFandom = new Map();
for (const row of catalog) {
  if (!byFandom.has(row.fandom)) byFandom.set(row.fandom, new Map());
  const m = byFandom.get(row.fandom);
  const k = loose(row.slug);
  if (!m.has(k)) m.set(k, []);
  m.get(k).push(row);
}

// Genre slugs per fandom, so a filename's trailing genre token can be told
// apart from a genuine second word of the title.
const genreSlugs = new Map();
for (const row of catalog) {
  if (!genreSlugs.has(row.fandom)) genreSlugs.set(row.fandom, new Set());
  for (const g of row.genres) genreSlugs.get(row.fandom).add(g.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
}

/**
 * Finds the one catalogue slug a delivered filename refers to.
 * Returns { slug, how } or { slug: null, how, candidates }.
 */
function resolve(fandom, filename) {
  const clean = basename(filename, extname(filename)).replace(DUP_SUFFIX, "");
  const index = byFandom.get(fandom);
  const key = loose(clean);

  // (1) Loose-key equality, covers the apostrophe and separator differences.
  const exact = index.get(key);
  if (exact?.length === 1) return { slug: exact[0].slug, how: "exact" };
  if (exact?.length > 1) return { slug: null, how: "ambiguous-exact", candidates: exact.map((r) => r.slug) };

  // (2) Trailing token that came from a qualifier, genre or year:
  //       portal-puzzle, god-of-war-2018, willow-tv, 13-reasons-why-mystery.
  //     Each case is only accepted when the remainder names exactly one real
  //     catalogue title, so this resolves the delivery's naming quirks without
  //     inventing matches, an unrecognised tail simply fails and is reported.
  // Up to three trailing tokens, because a qualifier can be a hyphenated
  // phrase: "bob_s_burgers_live_action_adj" ends in three.
  const parts = clean.replace(/_/g, "-").split("-");
  for (let take = 1; take <= 3 && take < parts.length; take++) {
    const base = parts.slice(0, parts.length - take).join("-");
    const tail = parts.slice(parts.length - take).join("-");
    if (!isKnownTail(tail, fandom)) continue;
    const hit = index.get(loose(base));
    if (hit?.length === 1) return { slug: hit[0].slug, how: "qualifier-suffix" };
    if (hit?.length > 1) return { slug: null, how: "ambiguous-tail", candidates: hit.map((r) => r.slug) };
  }

  return { slug: null, how: "unmatched" };
}

/**
 * Is this trailing token something the delivery could legitimately have
 * appended, a year, a genre, or a qualifier from the source list?
 *
 * Genres are matched by prefix as well as equality because the scraper often
 * shortened them: the games bucket "Party / Multiplayer Mini-Games" arrives as
 * "fall_guys_party". Requiring the prefix to identify exactly one genre stops
 * that from ever stripping a real word off a title.
 */
function isKnownTail(tail, fandom) {
  if (/^\d{4}$/.test(tail)) return true;
  if (QUALIFIER_TOKENS.has(tail)) return true;
  const genres = genreSlugs.get(fandom);
  if (!genres) return false;
  if (genres.has(tail)) return true;
  if (tail.length < 4) return false;
  const hits = [...genres].filter((g) => g.startsWith(tail));
  return hits.length === 1;
}

// ---------- walk the sources ----------

const staging = process.argv[2];
if (!staging) {
  console.error("Usage: node scripts/importImages.mjs <stagingDir> [--dry-run]");
  process.exit(1);
}
const dryRun = process.argv.includes("--dry-run");

// Collected first, then written, so a fandom that resolves to the same slug
// twice is reported rather than silently overwritten by whichever came last.
const picked = new Map(); // "fandom, slug" -> { src, how, fandom, slug }
const unresolved = [];
const ambiguous = [];
const divergent = [];
const stats = {
  exact: 0,
  "qualifier-suffix": 0,
  dupFiles: 0,
  identicalCopies: 0,
  divergentCopies: 0,
  mislabelled: 0,
};
const unrecognised = [];

for (const source of SOURCES) {
  const files = walk(join(staging, source.dir));
  if (files.length === 0) {
    console.warn(`  WARNING no files under ${source.dir}`);
    continue;
  }
  for (const file of files) {
    if (DUP_SUFFIX.test(basename(file, extname(file)))) stats.dupFiles++;

    const { slug, how, candidates } = resolve(source.fandom, file);
    if (!slug) {
      (how.startsWith("ambiguous") ? ambiguous : unresolved).push(
        `${source.fandom}  ${basename(file)}  [${how}${candidates ? ": " + candidates.join(" | ") : ""}]`,
      );
      continue;
    }
    stats[how]++;

    const key = `${source.fandom}|${slug}`;
    const prior = picked.get(key);
    if (prior) {
      // The same title arrived in more than one genre folder. That is normal, 
      // a series filed under Action and Supernatural is delivered twice, and
      // the scraper often picked a different photo each time. Keep the first in
      // sorted order so the choice is reproducible, and record the fact rather
      // than dropping the title or resolving it arbitrarily at random.
      if (prior.bytes === statSync(file).size) {
        stats.identicalCopies++;
      } else {
        stats.divergentCopies++;
        divergent.push(`${source.fandom}  ${basename(file)}  vs ${basename(prior.src)}  for "${slug}"`);
      }
      continue;
    }
    picked.set(key, { src: file, how, fandom: source.fandom, slug });
  }
}

// ---------- read dimensions, write files ----------

// Wipe the output first. A title that loses its poster between runs, because
// the source list was edited, or a file was deleted from the delivery, would
// otherwise leave an orphaned file behind that no manifest entry references,
// and nothing would ever clean it up.
if (!dryRun && existsSync(OUT_DIR)) {
  rmSync(OUT_DIR, { recursive: true, force: true });
}

const manifest = [];
let totalBytes = 0;

for (const entry of picked.values()) {
  const buf = readFileSync(entry.src);
  const info = probeImage(buf);
  if (info.format === "unknown") {
    unrecognised.push(`${entry.fandom}  ${basename(entry.src)}`);
  } else if (info.format !== "jpeg") {
    stats.mislabelled++;
  }
  const rel = `${entry.fandom}/${entry.slug}${info.ext}`;
  if (!dryRun) {
    const dest = join(OUT_DIR, entry.fandom);
    mkdirSync(dest, { recursive: true });
    copyFileSync(entry.src, join(dest, `${entry.slug}${info.ext}`));
  }
  totalBytes += buf.length;
  manifest.push({
    fandom: entry.fandom,
    slug: entry.slug,
    path: `/images/${rel}`,
    format: info.format,
    width: info.width,
    height: info.height,
    ratio: info.height ? Number((info.width / info.height).toFixed(3)) : null,
    bytes: buf.length,
    source: basename(entry.src),
    matchedBy: entry.how,
  });
}

manifest.sort((a, b) => (a.fandom + a.slug).localeCompare(b.fandom + b.slug));

if (!dryRun) {
  mkdirSync("src/data", { recursive: true });
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 0), "utf8");
}

// ---------- coverage + regression guard ----------

const covered = new Set(manifest.map((m) => `${m.fandom}|${m.slug}`));
const perFandom = {};
for (const row of catalog) {
  const f = row.fandom;
  perFandom[f] ??= { titles: 0, posters: 0 };
  perFandom[f].titles++;
  if (covered.has(`${f}|${row.slug}`)) perFandom[f].posters++;
}

// A file whose bytes are not a recognised image is a corrupt delivery and
// should be loud; a PNG that arrived named.jpg is merely mislabelled, and the
// extension has been corrected on the way in.
const formatTally = {};
for (const m of manifest) formatTally[m.format] = (formatTally[m.format] ?? 0) + 1;

console.log(`\n${dryRun ? "[dry run] " : ""}Matched ${manifest.length} posters  (${(totalBytes / 1048576).toFixed(0)} MB)`);
console.log(`  exact ${stats.exact} | qualifier/genre/year suffix ${stats["qualifier-suffix"]}`);
console.log(`  formats: ${Object.entries(formatTally).map(([k, v]) => `${v} ${k}`).join(", ")}`);
if (stats.mislabelled) console.log(`  ${stats.mislabelled} file(s) were PNGs named .jpg — extension corrected`);
console.log(`  ${stats.dupFiles} file(s) carried a _dup suffix (stripped before matching)`);
console.log(
  `  ${stats.identicalCopies} duplicate delivery(ies) byte-identical, ` +
    `${stats.divergentCopies} with a different image for the same title (first in sorted order kept)`,
);
console.log("\n  coverage by fandom");
for (const [f, c] of Object.entries(perFandom)) {
  const pct = c.titles ? ((100 * c.posters) / c.titles).toFixed(0) : "0";
  console.log(`    ${f.padEnd(9)} ${String(c.posters).padStart(4)}/${String(c.titles).padStart(4)}  ${pct}%`);
}

if (unrecognised.length) {
  console.log(`\n  UNREADABLE (${unrecognised.length}) — not a JPEG, PNG or GIF:`);
  for (const u of unrecognised) console.log(`     - ${u}`);
}
if (divergent.length) {
  console.log(`\n  DIVERGENT (${divergent.length}) — one title, two different images delivered:`);
  for (const d of divergent.slice(0, 12)) console.log(`     - ${d}`);
  if (divergent.length > 12) console.log(`     ... and ${divergent.length - 12} more`);
}
if (ambiguous.length) {
  console.log(`\n  AMBIGUOUS (${ambiguous.length}) — left unattached, needs a human:`);
  for (const a of ambiguous) console.log(`     - ${a}`);
}
if (unresolved.length) {
  console.log(`\n  UNRESOLVED (${unresolved.length}) — left unattached:`);
  for (const u of unresolved.slice(0, 40)) console.log(`     - ${u}`);
  if (unresolved.length > 40) console.log(`     ... and ${unresolved.length - 40} more`);
}

if (!dryRun) {
  writeFileSync(
    BASELINE,
    JSON.stringify({ titles: catalog.length, posters: manifest.length, perFandom }, null, 2) + "\n",
    "utf8",
  );
}

// Ambiguity is the only failure that can attach the WRONG image to a title, so
// it fails the run. A shortfall is not: titles legitimately have no poster.
if (ambiguous.length > 0) {
  console.error(`\nFAIL: ${ambiguous.length} ambiguous filename(s) — resolve these before committing.`);
  process.exit(1);
}

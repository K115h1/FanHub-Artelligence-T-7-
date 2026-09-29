// verifySynopsisChain.mjs — checks the synopsis data actually reaches MySQL.
//
// The failure this catches is silent. 07_synopsis_seed.sql is a file of UPDATEs,
// so a wrong slug, a missing category join or a stale 04_* seed all produce
// statements that run without error and change nothing. The frontend then shows
// "No description yet" on a page that looks correct.
//
// Four checks:
//   1. every fandom in catalog.json has at least as many 04_*_seed.sql rows
//   2. the synopsis file matches on slug AND category, because contents.slug is
//      unique per category rather than globally
//   3. every UPDATE targets a row that actually exists
//   4. the seed is COPYed into deploy/mysql/Dockerfile, in an order that works
//   5. the category slugs the JOIN uses are ones 05_reference_data.sql creates
//   6. every statement is inside the transaction and syntactically whole
//
// Each of those is a way the chain can be broken WITHOUT the load failing. An
// UPDATE that matches no row is not an error in MySQL, so a broken chain
// produces a working site that quietly shows "No description yet" everywhere.
//
// Usage: npm run synopsis:verify

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { FANDOMS } from "./lib/catalogParse.mjs";

const problems = [];
const note = (m) => problems.push(m);

const catalog = JSON.parse(readFileSync("src/data/catalog.json", "utf8"));
const synopses = JSON.parse(readFileSync("data/synopses.json", "utf8"));
const sql = readFileSync("database/07_synopsis_seed.sql", "utf8");

const CONTENT_TYPES = new Set(Object.values(FANDOMS).map((f) => f.contentType));

// ---- what the 04_* files insert -------------------------------------------

const seedPairs = new Set();
const seedCount = {};

for (const file of readdirSync("database").filter((f) => f.startsWith("04_"))) {
  const text = readFileSync(`database/${file}`, "utf8");

  const cat = text.match(/INSERT INTO categories \(category_id, slug, name, description\) VALUES \((\d+), '([a-z-]+)'/);
  if (!cat) { note(`${file}: cannot read its category slug`); continue; }
  const catSlug = cat[2];

  // Matched over the whole file, never a ';'-delimited block: titles such as
  // "Steins;Gate 0" contain a semicolon inside the quoted value, and splitting
  // on ';' truncates the block and undercounts by hundreds of rows.
  const rows = [...text.matchAll(/^\s*\(\d+, \d+, '((?:[^']|'')*)', '((?:[^']|'')*)', '([a-z_]+)'/gm)].filter(
    (m) => CONTENT_TYPES.has(m[3]),
  );

  const key = [...Object.entries(FANDOMS)].find(([, v]) => v.categorySlug === catSlug)?.[0] ?? catSlug;
  seedCount[key] = (seedCount[key] ?? 0) + rows.length;
  for (const m of rows) seedPairs.add(`${catSlug}|${m[2].replace(/''/g, "'")}`);
}

// ---- 1. every fandom agrees ----------------------------------------------
//
// A seed holding MORE rows than catalog.json is expected: dedupeCatalog.mjs
// merges trailing-genre near-duplicates in the catalogue, but the seeds come
// from the raw source lists and keep both. applySynopses.mjs gives the dropped
// slug its merged sibling's text, so the extra rows are not a gap.
//
// A seed holding FEWER rows is a real problem: a synopsis UPDATE targeted at a
// row that was never inserted, which is what the stale games seed did.

const catCount = {};
for (const r of catalog) catCount[r.fandom] = (catCount[r.fandom] ?? 0) + 1;

for (const [fandom] of Object.entries(FANDOMS)) {
  const c = catCount[fandom] ?? 0;
  const s = seedCount[fandom] ?? 0;
  if (c === 0) { note(`${fandom}: catalog.json has no rows`); continue; }
  if (s < c) note(`${fandom}: catalog.json has ${c} rows but 04_*_seed.sql has only ${s}`);
}

// ---- 2. category slugs in the synopsis file are real ----------------------

const dbSlugs = new Set([...seedPairs].map((p) => p.split("|")[0]));
const updateRe = /WHERE c\.slug = '((?:[^']|'')*)' AND g\.slug = '([^']*)'/g;

if (/WHERE slug = /.test(sql)) {
  note("07_synopsis_seed.sql matches on slug alone; contents.slug is unique per CATEGORY, so this clobbers cross-fandom rows");
}

const updates = [...sql.matchAll(updateRe)];
if (!updates.length) note("07_synopsis_seed.sql contains no category-scoped UPDATEs");

for (const m of updates) {
  if (!dbSlugs.has(m[2])) { note(`synopsis file targets category slug "${m[2]}", which no 04_* seed inserts`); break; }
}

// ---- 3. every UPDATE hits a row ------------------------------------------

let orphans = 0;
const orphanSample = [];
for (const m of updates) {
  if (!seedPairs.has(`${m[2]}|${m[1].replace(/''/g, "'")}`)) {
    orphans++;
    if (orphanSample.length < 6) orphanSample.push(`${m[2]}|${m[1]}`);
  }
}
if (orphans) note(`${orphans} UPDATEs match no row in any 04_* seed, e.g. ${orphanSample.join(", ")}`);

// ---- 4. the seed is copied into the image, in an order that works ----------

const dockerfile = "deploy/mysql/Dockerfile";
if (!existsSync(dockerfile)) {
  note(`${dockerfile} not found`);
} else {
  const copied = [...readFileSync(dockerfile, "utf8").matchAll(/COPY\s+\S+\s+\/docker-entrypoint-initdb\.d\/(\S+)/g)]
    .map((m) => m[1]);

  if (!copied.includes("07_synopsis_seed.sql")) {
    note("07_synopsis_seed.sql is not COPYed into deploy/mysql/Dockerfile, so a fresh database never loads it");
  } else {
    const at = (f) => copied.indexOf(f);
    const last04 = Math.max(...copied.filter((f) => f.startsWith("04_")).map(at));
    if (at("07_synopsis_seed.sql") < last04) {
      note("07_synopsis_seed.sql loads before the last 04_* seed, so its UPDATEs would match no rows");
    }

    // The image runs initdb in SORTED filename order regardless of the order the
    // COPY lines are written in, so the two have to agree.
    const sorted = [...copied].sort();
    if (JSON.stringify(sorted) !== JSON.stringify(copied)) {
      note("Dockerfile COPY lines are not in sorted order, and the image loads in sorted order");
    }
  }
}

// ---- 5. the category slugs the JOIN uses actually exist -------------------

// Bounded by the semicolon that ends the statement, NOT by an ON DUPLICATE KEY
// UPDATE clause: 05_reference_data.sql upserts user_roles first, so the first
// such clause on the page belongs to that statement.
const ref = readFileSync("database/05_reference_data.sql", "utf8");
const catStart = ref.indexOf("INSERT INTO categories");
const catEnd = ref.indexOf(";", catStart);
const available = new Set(
  [...ref.slice(catStart, catEnd).matchAll(/\(\d+,\s*'([a-z-]+)'/g)].map((m) => m[1]),
);

for (const m of updates) {
  if (!available.has(m[2])) { note(`synopsis file targets category "${m[2]}", which 05_reference_data.sql does not create`); break; }
}

// ---- 6. every statement is loadable ---------------------------------------

if (!/^START TRANSACTION;$/m.test(sql)) note("no START TRANSACTION");
if (!/^COMMIT;$/m.test(sql)) note("no COMMIT");

const body = sql.slice(sql.indexOf("START TRANSACTION;"), sql.indexOf("COMMIT;"));
const stmts = body.split("\n").filter((l) => l.trim().startsWith("UPDATE "));
const allStmts = sql.split("\n").filter((l) => l.trim().startsWith("UPDATE "));
if (stmts.length !== allStmts.length) {
  note(`${allStmts.length} UPDATEs but only ${stmts.length} are inside the transaction`);
}
for (const [i, s] of allStmts.entries()) {
  if (!s.trimEnd().endsWith(";")) note(`statement ${i + 1} does not end with a semicolon`);
  if ((s.match(/'/g) || []).length % 2 !== 0) note(`statement ${i + 1} has an unbalanced quote`);
  if (/\bNULL\s*,\s*c\.short_synopsis = NULL/.test(s)) note(`statement ${i + 1} blanks both columns`);
}

// ---- data integrity, independent of the database --------------------------

const catalogKeys = new Set(catalog.map((r) => `${r.fandom}|${r.slug}`));
const unknown = Object.keys(synopses).filter((k) => !catalogKeys.has(k));
if (unknown.length) note(`data/synopses.json has ${unknown.length} keys with no catalogue row`);

const written = catalog.filter((r) => r.synopsis);
const noShort = written.filter((r) => !r.shortSynopsis);
const tooLong = written.filter((r) => r.shortSynopsis.length > 300);
if (noShort.length) note(`${noShort.length} rows have a synopsis but no shortSynopsis`);
if (tooLong.length) note(`${tooLong.length} rows have a shortSynopsis over 300 characters`);

// ---- report ---------------------------------------------------------------

const withSyn = new Set(catalog.filter((r) => r.synopsis).map((r) => `${r.fandom}|${r.slug}`));
const reviewed = Object.keys(synopses).length;
if (withSyn.size !== reviewed) {
  note(`catalog.json has ${withSyn.size} rows with a synopsis but data/synopses.json has ${reviewed} entries`);
}

console.log(`catalog rows            : ${catalog.length}`);
console.log(`with a synopsis         : ${written.length}`);
console.log(`data/synopses.json      : ${reviewed}`);
console.log(`04_* seed rows          : ${[...seedPairs].length}`);
console.log(`synopsis UPDATE stmts   : ${updates.length}`);
console.log(`  matching a real row    : ${updates.length - orphans}`);
console.log(`  matching nothing       : ${orphans}`);

// A seed row that no UPDATE covers is the one gap a visitor can see: the detail
// page renders "No description yet". Measured against the SQL rather than
// catalog.json, because the merged duplicates are absent from the catalogue yet
// still filled in — reading it from catalog.json reports 92 phantom gaps.
const updated = new Set(updates.map((m) => `${m[2]}|${m[1].replace(/''/g, "'")}`));
const uncovered = [...seedPairs].filter((p) => !updated.has(p));
console.log(`seed rows w/o an UPDATE  : ${uncovered.length}`);
if (uncovered.length) console.log(`  e.g. ${uncovered.slice(0, 8).join(", ")}`);
if (uncovered.length > 60) {
  note(`${uncovered.length} of ${seedPairs.size} database rows have no synopsis; the pages will read "No description yet"`);
}

if (problems.length) {
  console.log(`\n${problems.length} problem(s):`);
  for (const p of problems) console.log(`  ${p}`);
  process.exit(1);
}
console.log("\nchain intact: data/synopses.json -> catalog.json -> 04_* + 07_* -> MySQL -> API -> frontend");

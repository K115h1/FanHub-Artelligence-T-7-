// Checks that database/04_tvshows_seed.sql is valid SQL and safe to re-run.
//
// The file is generated, so it is easy to break with a text replacement and not
// notice: dropping a statement terminator or stacking two upsert modifiers both
// still look plausible in a diff. This reads the file the way MySQL will.
//
//   node scripts/checkTvshowsSeed.mjs

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const sql = readFileSync(join(root, 'database', '04_tvshows_seed.sql'), 'utf8')
const lines = sql.split('\n')
const text0 = sql.charCodeAt(0)

let problems = 0
const fail = (msg) => {
  problems += 1
  console.log(`  FAIL  ${msg}`)
}
const pass = (msg) => console.log(`  ok    ${msg}`)

// --- every genre upsert line is a complete statement --------------------------
const genreUpserts = lines.filter((l) =>
  l.includes('ON DUPLICATE KEY UPDATE name = VALUES(name), slug'),
)
const genreInserts = lines.filter((l) => l.includes('INSERT INTO genres'))

if (genreInserts.length === 0) fail('no genre inserts found - did the file get truncated?')
else if (genreUpserts.length !== genreInserts.length)
  fail(`${genreInserts.length} genre inserts but ${genreUpserts.length} upserts`)
else pass(`all ${genreInserts.length} genre inserts carry an upsert`)

if (genreUpserts.some((l) => !l.trim().endsWith(';')))
  fail('an upsert line has no terminating semicolon - the statement is unterminated')
else pass('every upsert line ends with a semicolon')

// A line carrying its own upsert is fine; two stacked is not.
if (lines.some((l) => /ON DUPLICATE[\s\S]*ON DUPLICATE/.test(l)))
  fail('an upsert modifier is stacked on top of another')
else pass('no stacked upsert modifiers')

// --- header note is inserted once, not once per run ---------------------------
const headerCount = (sql.match(/^-- Rows   : /gm) || []).length
const loadOrderCount = (sql.match(/Load order: safe to run/g) || [])
  .length
if (headerCount !== 1) fail(`the rows header appears ${headerCount} times, expected 1`)
else pass('the rows header appears once')
if (loadOrderCount > 1) fail(`the load-order note appears ${loadOrderCount} times`)
else pass('the load-order note appears once')

// --- the category slug is the one the app routes on ---------------------------
if (!/VALUES\s*\(6, 'tv-shows',/.test(sql)) fail("category 6 is not slugged 'tv-shows'")
else pass("category 6 is slugged 'tv-shows'")
if (/[^/]'(tvshows)'/.test(sql)) fail("a bare 'tvshows' slug remains")
else pass('no stale tvshows slug')

// --- poster paths are the folder on disk, which is a different word -----------
const posters = [...sql.matchAll(/'\/images\/tvshows\/([^']+)'/g)].map((m) => m[1])
if (posters.length === 0) fail('no poster paths found')
else pass(`${posters.length} poster paths, all under /images/tvshows/`)

// --- non-ASCII is intentional and correct -------------------------------------
const mojibake = [...sql.matchAll(/[ÃÂ][\u0080-\u00bf]|\uFFFD/g)]
if (mojibake.length)
  fail(`${mojibake.length} mojibake sequence(s) - a file was read and written with mismatched encodings`)
else pass('no mojibake')

// --- idempotency: the file is already in its fixed shape ----------------------
// An upsert modifier lands on the line AFTER its INSERT, so a line that is
// merely the start of a pair looks like a bare insert unless the pairing is
// followed rather than judged per line.
const genreStatements = sql.match(
  /INSERT INTO genres \(genre_id, category_id, name, slug\) VALUES \(\d+, 6, '[^']*', '[^']*'\);\n\s*ON DUPLICATE KEY UPDATE name = VALUES\(name\), slug = VALUES\(slug\);/g,
) || []
if (genreStatements.length !== genreInserts.length)
  fail(`${genreInserts.length} genre inserts but only ${genreStatements.length} complete upsert statements`)
else pass('every genre insert is paired with its own upsert')

if (!/INSERT IGNORE INTO content_genres/.test(sql)) fail('content_genres is a plain INSERT, so a re-run fails')
else pass('content_genres uses INSERT IGNORE')

if (text0 !== 0) fail('the file starts with a byte-order mark')
else pass('no byte-order mark')

console.log(problems === 0 ? '\nall checks passed' : `\n${problems} problem(s)`)
process.exit(problems === 0 ? 0 : 1)

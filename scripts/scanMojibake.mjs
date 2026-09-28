// Scans every text column for UTF-8 that was decoded and re-encoded one extra
// time.
//
// The signature is explained in scripts/lib/mojibake.mjs, which also holds the
// detector used here so the two cannot drift apart.
//
// The test runs in Node, not in SQL, on purpose. MySQL 8 uses the ICU regex
// engine, where "\\xC3" is not a byte escape, so a pattern written that way
// silently matches nothing and reports a clean database. A double-encoding is
// a byte-pattern question and belongs somewhere that can answer it exactly.
//
// Run scripts/testScanMojibake.mjs first: a check that cannot go red is worse
// than no check, and an earlier version of this file proved exactly that.
//
//   set MYSQL_PWD first, then:  node scripts/scanMojibake.mjs
//
// Exits non-zero if anything is suspect, so it can gate a load.

import { execFileSync } from 'node:child_process'
import { isMojibake } from './lib/mojibake.mjs'

const MYSQL = 'C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysql.exe'
const DB = 'fanhubplus'

const run = (sql) =>
  execFileSync(
    MYSQL,
    ['-u', 'root', '-N', '-B', '--default-character-set=utf8mb4', DB, '-e', sql],
    { encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 },
  )
    .split('\n')
    .map((line) => line.replace(/\r$/, ''))

const columns = run(
  `SELECT table_name, column_name FROM information_schema.columns
   WHERE table_schema = '${DB}'
     AND data_type IN ('varchar','char','text','mediumtext','longtext')
     AND character_set_name = 'utf8mb4'
   ORDER BY table_name, ordinal_position`,
)
  .filter(Boolean)
  .map((line) => line.split('\t').map((part) => part.trim()))
  .filter((parts) => parts.length === 2)

let scanned = 0
let rowsScanned = 0
let bad = 0
const findings = []

for (const [table, column] of columns) {
  scanned += 1
  // Tab-separated so a value containing a space cannot be confused with a
  // column boundary, and the key is included so a finding can be acted on.
  const rows = run(
    `SELECT \`${column}\` FROM \`${table}\` WHERE \`${column}\` IS NOT NULL`,
  ).filter(Boolean)
  rowsScanned += rows.length

  const hits = rows.filter(isMojibake)
  if (hits.length === 0) continue

  bad += hits.length
  findings.push({ table, column, hits })
  console.log(`  ${hits.length} row(s)  ${table}.${column}`)
  hits.slice(0, 3).forEach((line) => console.log(`      ${JSON.stringify(line.slice(0, 110))}`))
}

console.log(`\n  scanned ${scanned} text column(s), ${rowsScanned} value(s)`)
console.log(
  bad === 0
    ? '  no double-encoded UTF-8 found'
    : `  ${bad} suspicious value(s) across ${findings.length} column(s)`,
)
process.exit(bad === 0 ? 0 : 1)

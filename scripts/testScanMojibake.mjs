// Proves scripts/scanMojibake.mjs can actually detect the corruption it claims
// to look for, against the live database.
//
// An earlier version of that scanner reported a clean database while matching
// nothing at all, because MySQL's ICU regex does not read "\\xC3" as a byte
// escape. A green check that cannot go red is worse than no check, so this
// plants a known-bad row, confirms it is caught, and removes it again.
//
//   set MYSQL_PWD first, then:  node scripts/testScanMojibake.mjs

import { execFileSync } from 'node:child_process'
import { isMojibake, damageOnce } from './lib/mojibake.mjs'

const MYSQL = 'C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysql.exe'
const DB = 'fanhubplus'

const sql = (statement) =>
  execFileSync(
    MYSQL,
    ['-u', 'root', '-N', '-B', '--default-character-set=utf8mb4', DB, '-e', statement],
    { encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 },
  )
    .split('\n')
    .map((line) => line.replace(/\r$/, ''))

let failures = 0
const check = (label, actual, expected) => {
  const ok = actual === expected
  if (!ok) failures += 1
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}`)
}

console.log('  correctly encoded values must NOT be flagged')
// Every one of these is really in the database, so a false positive here is not
// theoretical.
for (const good of [
  'Les Misérables',
  'Amélie',
  'Re:Zero − Starting Life in Another World',
  'The continent’s biggest weekend',
  'Pokémon',
  'Bohemian Rhapsody',
  'Spirited Away',
  'plain ascii title',
  '',
]) {
  check(`not flagged: ${JSON.stringify(good)}`, isMojibake(good), false)
}

console.log('\n  damaged values MUST be flagged')
// Only non-ASCII inputs: the damage only exists for them. Damaging pure ASCII
// is correctly a no-op, which is checked separately below.
for (const good of ['Amélie', 'Pokémon', '90 Day Fiancé', 'Re:Zero − Life']) {
  const latin1 = damageOnce(good, 'latin1')
  check(`latin1 damage on ${JSON.stringify(good)} -> ${JSON.stringify(latin1)}`, isMojibake(latin1), true)
  const cp1252 = damageOnce(good, 'cp1252')
  check(`cp1252 damage on ${JSON.stringify(good)} -> ${JSON.stringify(cp1252)}`, isMojibake(cp1252), true)
}
check(
  'damaging pure ascii is a no-op, not a false positive',
  isMojibake(damageOnce('Bohemian Rhapsody', 'latin1')),
  false,
)

console.log('\n  the specific shapes that were actually seen in this project')
for (const bad of [
  'AmÃ©lie', // é read as latin1
  'continentâ€™s', // ’ read as cp1252
  'â€œquotedâ€', // curly quotes via cp1252
  'FiancÃ©', // the exact damage the tv-shows seed carried
  'Re:Zero âˆ’ Life', // the other exact damage
  'bad\u0080control', // a C1 control, which no title contains
]) {
  check(`flagged: ${JSON.stringify(bad)}`, isMojibake(bad), true)
}

console.log('\n  against the live database')
// genres is small and easy to restore. genre_id is smallint unsigned and the
// seeds use up to 5016, so 9999 is free.
const GENRE_ID = 9999
const BAD = damageOnce('Amélie', 'latin1')
try {
  sql(
    `DELETE FROM content_genres WHERE genre_id = ${GENRE_ID};
     DELETE FROM genres WHERE genre_id = ${GENRE_ID};`,
  )
  sql(
    `INSERT INTO genres (genre_id, category_id, name, slug)
     VALUES (${GENRE_ID}, 1, '${BAD}', 'mojibake-probe');`,
  )

  const stored = sql(`SELECT name FROM genres WHERE genre_id = ${GENRE_ID};`)[0]
  check('the damaged value survived the round trip through MySQL', stored, BAD)
  check('the detector flags what MySQL actually holds', isMojibake(stored), true)

  // The same shape the scanner uses: read the column, filter. The probe is
  // identified by its genre_id, because the marker lives in the slug and only
  // the id and name are selected here.
  const rows = sql(`SELECT genre_id, name FROM genres WHERE category_id = 1;`)
  const flagged = rows.filter((line) => isMojibake(line))
  check('a column scan flags exactly one row', flagged.length, 1)
  check(
    'and it is the one holding the probe',
    flagged[0]?.startsWith(String(GENRE_ID)),
    true,
  )
} finally {
  sql(`DELETE FROM genres WHERE genre_id = ${GENRE_ID};`)
  const left = sql(`SELECT COUNT(*) FROM genres WHERE genre_id = ${GENRE_ID};`)[0]
  check('the probe row was cleaned up', left, '0')
}

console.log(
  failures === 0
    ? '\n  the scanner can go red - a clean result is now meaningful'
    : `\n  ${failures} failure(s)`,
)
process.exit(failures === 0 ? 0 : 1)

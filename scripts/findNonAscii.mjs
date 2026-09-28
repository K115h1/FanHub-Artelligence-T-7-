// Reports where a file has non-ASCII bytes, with context, so mojibake from a
// mis-encoded round trip is easy to find rather than guess at.
//
//   node scripts/findNonAscii.mjs database/04_tvshows_seed.sql

import { readFileSync } from 'node:fs'

const path = process.argv[2]
if (!path) {
  console.error('usage: node scripts/findNonAscii.mjs <file>')
  process.exit(1)
}

const text = readFileSync(path, 'utf8')
const lines = text.split('\n')

// A character that no seed file needs. Anything here is either a deliberate
// accent in a title or the residue of a mis-encoded write.
let shown = 0
lines.forEach((line, i) => {
  // eslint-disable-next-line no-control-regex
  const odd = [...line].filter((ch) => {
    const code = ch.codePointAt(0)
    return code > 0x7f
  })
  if (odd.length === 0) return
  shown += 1
  if (shown > 25) return
  const codes = odd.map((ch) => `U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`)
  console.log(`  L${i + 1}  ${line.trim().slice(0, 96)}`)
  console.log(`        ${codes.join(' ')}`)
})

console.log(`\n  ${shown} line(s) with non-ASCII out of ${lines.length}`)

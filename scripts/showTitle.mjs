// Prints the entries in a fandom JSON that contain a given substring, with the
// exact code points of anything non-ASCII, so a title can be compared against
// its source rather than eyeballed.
//
//   node scripts/showTitle.mjs data/tvshows_by_genre.json "Fianc"
//   node scripts/showTitle.mjs data/tvshows_by_genre.json "Re:Zero"

import { readFileSync } from 'node:fs'

const [path, needle] = process.argv.slice(2)
if (!path || !needle) {
  console.error('usage: node scripts/showTitle.mjs <json> <substring>')
  process.exit(1)
}

const data = JSON.parse(readFileSync(path, 'utf8'))

for (const [genre, titles] of Object.entries(data)) {
  if (!Array.isArray(titles)) continue
  for (const title of titles) {
    if (!String(title).toLowerCase().includes(needle.toLowerCase())) continue
    const odd = [...String(title)]
      .map((ch, i) => ({ ch, i }))
      .filter(({ ch }) => ch.codePointAt(0) > 0x7f)
    console.log(`  ${genre}  ${JSON.stringify(title)}`)
    if (odd.length) {
      console.log(
        `    ${odd
          .map(
            ({ ch, i }) =>
              `[${i}] U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`,
          )
          .join('  ')}`,
      )
    }
  }
}

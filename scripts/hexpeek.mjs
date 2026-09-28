// Hex-dumps the first bytes of a file and the bytes around a match, so a
// mis-encoded round trip can be diagnosed from the actual bytes rather than
// from how the characters render.
//
//   node scripts/hexpeek.mjs database/04_tvshows_seed.sql
//   node scripts/hexpeek.mjs database/04_tvshows_seed.sql "Day Fianc"

import { readFileSync } from 'node:fs'

const [path, needle] = process.argv.slice(2)
if (!path) {
  console.error('usage: node scripts/hexpeek.mjs <file> [substring]')
  process.exit(1)
}

const bytes = readFileSync(path)

const dump = (buf, label) => {
  const hex = [...buf].map((b) => b.toString(16).toUpperCase().padStart(2, '0'))
  console.log(`  ${label}`)
  for (let i = 0; i < hex.length; i += 16) {
    const row = hex.slice(i, i + 16)
    const ascii = row
      .map((h) => {
        const code = parseInt(h, 16)
        return code >= 0x20 && code < 0x7f ? String.fromCharCode(code) : '.'
      })
      .join('')
    console.log(`    ${i.toString(16).padStart(8, '0')}  ${row.join(' ').padEnd(47)}  ${ascii}`)
  }
}

dump(bytes.subarray(0, 48), 'first 48 bytes:')
console.log(
  `  first byte is ${bytes[0] === 0xef ? 'EF (BOM prefix present)' : `0x${bytes[0].toString(16)} (no BOM)`}`,
)

if (needle) {
  const text = bytes.toString('utf8')
  const at = text.indexOf(needle)
  if (at < 0) {
    console.log(`\n  "${needle}" not found`)
  } else {
    // Locate the same span in the raw bytes: the utf8 offset differs once a
    // BOM is present, so search the bytes directly instead.
    const needleBytes = Buffer.from(needle, 'utf8')
    const byteAt = bytes.indexOf(needleBytes)
    const start = Math.max(0, byteAt - 8)
    dump(bytes.subarray(start, byteAt + needleBytes.length + 24), `around "${needle}":`)
  }
}

// importSuppliedArt.mjs — places the supplied Merchandise and cosplay artwork.
//
//   node scripts/importSuppliedArt.mjs            # report only
//   node scripts/importSuppliedArt.mjs --apply    # write the image files
//
// PLACES IMAGES ONLY. This deliberately writes no seed SQL, no JSON under src/,
// and no database rows: the artwork is staged on disk, and nothing references it
// yet. Wiring it to the catalogue and the pages is a separate, later step.
//
// WHY THIS SCRIPT EXISTS
//   Two archives were delivered: Merchandise.zip (50 photos across Anime,
//   cosplay and K-Pop folders) and "cosplay pictures.zip" (22 cosplay photos).
//   Both are laid out for browsing a shop, not for serving, and neither is
//   usable as delivered:
//
//   1. MOJIBAKE AND EMOJI IN FILENAMES. Entries arrive as "#?????? #riyadh_.jpg"
//      and "Tasse d?mon slayer.jpg" — the accents and emoji were lost or never
//      decoded, and several names are only punctuation once that happens. Those
//      cannot become slugs, and cannot become readable product names either.
//
//   2. "download (14).jpg". Roughly a third of the entries carry no name at all.
//      There is no honest way to recover a product title from one, so those are
//      labelled by fandom and given a stable index, and the report says so.
//
//   3. BYTE-IDENTICAL DUPLICATES. "Hinata y naruto.jpg" and its (1)(2)(3) copies
//      are the same 217,501 bytes; "download (12)" through "(16)" are five copies
//      of one 206,535-byte file. Filenames imply variety that is not there, so
//      de-duplication is by SHA-256 of the CONTENT, never by filename. Without it
//      the shop would show the same photo five times under five "different" names.
//
// WHY A HAND-ROLLED ZIP READER
//   There is no zip library in node_modules, and this project has no image
//   library either (scripts/placeCategoryArt.mjs reads JPEG headers by hand for
//   the same reason). Zip is a simple enough container to read directly: find the
//   end-of-central-directory record, walk the central directory for sizes and
//   offsets, then inflate each entry with the zlib that ships with Node.
//   Windows' own extractor is not an option — several entries exceed the 260
//   character path limit outright.
//
// EVERYTHING IS REPORTED, NOTHING IS GUESSED
//   A name that cannot be cleaned into something readable is reported rather than
//   invented, and a photo is only attached to a row when the source name actually
//   supports one. This is the same rule scripts/importImages.mjs uses for posters:
//   report the unmatched, never silently resolve it.

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { inflateRawSync } from 'node:zlib'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const downloads = join(process.env.USERPROFILE || '', 'Downloads')
const apply = process.argv.includes('--apply')

const MERCH_OUT = join(root, 'public', 'images', 'merchandise')
const CHAR_OUT = join(root, 'public', 'images', 'characters', 'cosplay')

// ---------------------------------------------------------------- zip reading

/**
 * Read every file entry out of a zip, returning [{ name, data }].
 *
 * Sizes and offsets come from the central directory, not the local header: when
 * an entry was written with a trailing data descriptor the local header's size
 * fields are zero, and trusting them silently truncates the file.
 */
function readZip(path) {
  const buf = readFileSync(path)

  // End of central directory: 0x06054b50, scanned backwards because a comment
  // of up to 64KB may follow it.
  let eocd = -1
  for (let i = buf.length - 22; i >= 0 && i > buf.length - 22 - 0xffff; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break }
  }
  if (eocd === -1) throw new Error(`${path}: no end-of-central-directory record`)

  const total = buf.readUInt16LE(eocd + 10)
  let p = buf.readUInt32LE(eocd + 16)
  const out = []

  for (let n = 0; n < total; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error(`${path}: bad central directory at ${p}`)

    const method = buf.readUInt16LE(p + 10)
    const compSize = buf.readUInt32LE(p + 20)
    const nameLen = buf.readUInt16LE(p + 28)
    const extraLen = buf.readUInt16LE(p + 30)
    const commentLen = buf.readUInt16LE(p + 32)
    const localOffset = buf.readUInt32LE(p + 42)

    // Bit 11 says the name is UTF-8. It is nearly always set for archives off
    // Windows; when it is not, the bytes are CP437, and the Latin-1 read is a
    // better approximation than treating them as UTF-8.
    const utf8 = (buf.readUInt16LE(p + 8) & 0x800) !== 0
    const raw = buf.subarray(p + 46, p + 46 + nameLen)
    const name = utf8 ? raw.toString('utf8') : raw.toString('latin1')

    if (buf.readUInt32LE(localOffset) !== 0x04034b50) {
      throw new Error(`${path}: bad local header for ${name}`)
    }
    const lNameLen = buf.readUInt16LE(localOffset + 26)
    const lExtraLen = buf.readUInt16LE(localOffset + 28)
    const dataStart = localOffset + 30 + lNameLen + lExtraLen
    const rawData = buf.subarray(dataStart, dataStart + compSize)

    if (method === 0) out.push({ name, data: Buffer.from(rawData) })
    else if (method === 8) out.push({ name, data: inflateRawSync(rawData) })
    else throw new Error(`${path}: unsupported compression method ${method} for ${name}`)

    p += 46 + nameLen + extraLen + commentLen
  }
  return out
}

// ------------------------------------------------------------ name cleaning

/**
 * The worst thing a source filename can produce is a name made entirely of
 * punctuation. Anything that slugifies to fewer than two real words is reported
 * as unusable so it can be labelled by hand rather than shown as "###".
 *
 * Two things this has to get right, both of which it got wrong first:
 *
 *   - The extension is not a word. "download (10).jpg" contains the words
 *     "download" and "jpg", so counting words on the raw filename passed a name
 *     that carries no information at all, and every "download (N)" then
 *     slugified to the same "download" and overwrote its neighbours on disk.
 *   - "download" IS the word. It is a browser's placeholder, not a product.
 */
const PLACEHOLDER_WORDS = new Set(['download', 'image', 'images', 'photo', 'pic', 'untitled', 'default', 'img'])

function meaningful(filename) {
  const base = filename.replace(/\.[a-z0-9]+$/i, '').replace(/\s*\(\d+\)\s*$/, '')
  const words = base.toLowerCase().match(/[a-z]{3,}/g) ?? []
  if (words.length === 0) return false
  if (words.every((w) => PLACEHOLDER_WORDS.has(w))) return false
  return words.length >= 2 || words.some((w) => !PLACEHOLDER_WORDS.has(w))
}

/** "Hinata y naruto (2).jpg" -> "hinata-y-naruto" */
function cleanName(filename) {
  let base = filename.replace(/\.[a-z0-9]+$/i, '')
  // Strip the duplicate-suffix convention, but only the trailing "(n)".
  base = base.replace(/\s*\(\d+\)\s*$/, '').trim()
  // Emoji and non-Latin survive as junk; drop anything that is not a letter,
  // digit or space, then collapse to hyphens.
  const ascii = base
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return ascii.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70)
}

/** Title Case from a slug, for a display name. */
function titleCase(slug) {
  return slug
    .split('-')
    .filter(Boolean)
    // Scraped product titles run to a dozen words ("Our Jujutsu Kaisen Lookup
    // Figures Are Now Finally Available..."). Eight is enough to identify the
    // product in a card; the rest is the shop's SEO description, not its name.
    .slice(0, 8)
    .map((w) => (/^(tv|mv|bts|skz|eu|qa|tcg|iphone)$/i.test(w) ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))
    .join(' ')
}

const MERCH_FOLDERS = { Anime: 'anime', cosplay: 'cosplay', 'k pop': 'k-pop' }

const CATEGORY_NAMES = {
  anime: 'Anime',
  cosplay: 'Cosplay',
  'k-pop': 'K-Pop',
  manga: 'Manga',
  movies: 'Movies',
  gaming: 'Gaming',
  comics: 'Comics',
  'tv-shows': 'TV Shows',
}

// ------------------------------------------------------------------- collect

const seenHashes = new Map()
const usedSlugs = new Map()
const merchRows = []
const charRows = []
const skipped = []

function consider(kind, category, filename, data) {
  const hash = createHash('sha256').update(data).digest('hex').slice(0, 16)

  if (seenHashes.has(hash)) {
    skipped.push({ kind, category, filename, reason: 'duplicate content', of: seenHashes.get(hash) })
    return
  }

  let slug = cleanName(filename)
  let label = null
  let named = meaningful(filename)

  if (!named || !slug || slug.replace(/-/g, '').length < 4) {
    // "download (14).jpg" and the punctuation-only names. Counted per category
    // so the fallback label is stable across runs.
    const n = [...merchRows, ...charRows].filter((r) => r.category === category && !r.named).length + 1
    slug = `${category}-item-${String(n).padStart(2, '0')}`
    label = `${CATEGORY_NAMES[category] ?? category} Item ${String(n).padStart(2, '0')}`
    named = false
    skipped.push({ kind, category, filename, reason: 'no usable name in the source filename', fallback: label })
  }

  // Belt and braces on top of the placeholder check: two DIFFERENT photos whose
  // cleaned names collide would still write to one filename and the second would
  // silently replace the first. That is a data-loss bug, not a cosmetic one.
  const scope = `${kind}:${category}`
  usedSlugs.set(scope, usedSlugs.get(scope) ?? new Set())
  const taken = usedSlugs.get(scope)
  if (taken.has(slug)) {
    const original = slug
    let n = 2
    while (taken.has(`${original}-${n}`)) n++
    slug = `${original}-${n}`
    skipped.push({ kind, category, filename, reason: `name collides with "${original}"`, fallback: slug })
  }
  taken.add(slug)

  seenHashes.set(hash, filename)
  const ext = /\.png$/i.test(filename) ? 'png' : 'jpg'
  const rel = kind === 'merch'
    ? `/images/merchandise/${category}/${slug}.${ext}`
    : `/images/characters/${category}/${slug}.${ext}`

  const row = {
    kind, category, slug, name: label ?? titleCase(slug), rel, named,
    bytes: data.length, source: filename, data,
  }
  ;(kind === 'merch' ? merchRows : charRows).push(row)
}

// ---------------------------------------------------------------------- main

const sources = [
  { zip: join(downloads, 'Merchandise.zip'), kind: 'merch' },
  { zip: join(downloads, 'cosplay pictures.zip'), kind: 'char' },
]

for (const { zip, kind } of sources) {
  if (!existsSync(zip)) {
    console.error(`MISSING  ${zip}`)
    continue
  }
  const entries = readZip(zip)
  for (const { name, data } of entries) {
    if (!data.length) continue // directory marker
    const parts = name.split('/').filter(Boolean)
    if (parts.length < 2) continue

    if (kind === 'merch') {
      const folder = parts[1]
      const category = MERCH_FOLDERS[folder]
      if (!category) { skipped.push({ kind, category: folder, filename: name, reason: 'unrecognised folder' }); continue }
      consider('merch', category, parts[parts.length - 1], data)
    } else {
      // A flat folder of cosplay photographs; the folder is the category.
      consider('char', 'cosplay', parts[parts.length - 1], data)
    }
  }
}

// ------------------------------------------------------------------- report

console.log(`\nread ${merchRows.length} merchandise + ${charRows.length} cosplay images`)

const groups = new Map()
for (const r of [...merchRows, ...charRows]) {
  const key = `${r.kind}:${r.category}`
  if (!groups.has(key)) groups.set(key, [])
  groups.get(key).push(r)
}

console.log(`\nBY CATEGORY`)
for (const [key, list] of groups) {
  const unnamed = list.filter((r) => !r.named).length
  console.log(`  ${key.padEnd(18)} ${String(list.length).padStart(3)}  (${unnamed} needed a generated label)`)
}

console.log(`\nNAMES (slug -> display name)`)
for (const [key, list] of groups) {
  console.log(`  ${key}`)
  for (const r of list) {
    const flag = r.named ? ' ' : '*'
    console.log(`   ${flag} ${r.slug.padEnd(44)} ${r.name}`)
  }
}

console.log(`\nSKIPPED (${skipped.length})`)
for (const s of skipped) {
  const dup = s.reason === 'duplicate content'
  const tail = dup ? `same bytes as "${s.of}"` : `${s.reason}${s.fallback ? ` -> "${s.fallback}"` : ''}`
  console.log(`  ${dup ? 'dup' : '  - '} ${s.filename.length > 58 ? s.filename.slice(0, 55) + '...' : s.filename}  ${tail}`)
}

if (!apply) {
  console.log('\nreport only. re-run with --apply to write the image files.')
  process.exit(0)
}

// -------------------------------------------------------------------- write

let written = 0
for (const r of [...merchRows, ...charRows]) {
  const dest = join(root, 'public', ...r.rel.split('/').filter(Boolean))
  mkdirSync(dirname(dest), { recursive: true })
  // The bytes are the ones already in memory from the read pass, so --apply
  // does not decompress the archives a second time.
  writeFileSync(dest, r.data)
  written++
}
console.log(`\nwrote ${written} images under public/images/`)

// The manifest is PRINTED, not written into src/. Nothing under src/ references
// these images yet, and nothing in the database does either: the catalogue rows
// and the pages that would show them are deliberately not wired up. A JSON file
// in src/data would imply a connection that does not exist.
console.log(`\nMANIFEST (placed on disk, referenced by nothing yet)`)
for (const [key, list] of groups) {
  console.log(`  ${key}`)
  for (const r of list) console.log(`    ${r.rel}\t${r.name}`)
}
console.log(
  `\nNot linked to the database or the app, by request. To wire them up later:` +
  `\n  - add merchandise_items / character_profiles rows, resolving category by slug` +
  `\n  - build the Merchandise grid and the Characters page against /community/*`,
)

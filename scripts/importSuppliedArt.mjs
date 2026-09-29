// importSuppliedArt.mjs, places the supplied merchandise and character artwork.
//
//   node scripts/importSuppliedArt.mjs            # report only
//   node scripts/importSuppliedArt.mjs --apply    # write the image files
//   node scripts/importSuppliedArt.mjs --apply --seed   #...and the catalogue rows
//
// --apply places images only. Catalogue rows are opt-in via --seed, so
// refreshing artwork can never silently rewrite the database.
//
// THREE PROBLEMS WITH THE ARCHIVES AS DELIVERED, all handled here:
//
//   1. Filenames carry mojibake and emoji ("#?????? #riyadh_.jpg", "Tasse
//      d?mon slayer.jpg"), and a third carry no name at all ("download (14).jpg").
//      Unnameable entries get a stable index rather than an invented title, and
//      the report marks every one with "*".
//   2. Byte-identical duplicates are common: "Hinata y naruto.jpg" and its
//      (1)(2)(3) copies are the same 217,501 bytes. Deduped by SHA-256 of the
//      CONTENT, never by filename, or one photo appears five times under five
//      "different" names.
//   3. Folder names do not match category slugs ("Tv shows" is `tv-shows`).
//
// The zip reader is hand-rolled: no zip library is installed, and Windows' own
// extractor fails on entries that exceed the 260-character path limit.

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { inflateRawSync } from 'node:zlib'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const downloads = join(process.env.USERPROFILE || '', 'Downloads')
const apply = process.argv.includes('--apply')
// Emitting catalogue rows is separate from placing images, so refreshing the
// artwork can never quietly rewrite the database.
const seed = process.argv.includes('--seed')

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
  const base = filename.replace(IMAGE_EXT, '').replace(/\s*\(\d+\)\s*$/, '')
  const words = base.toLowerCase().match(/[a-z]{3,}/g) ?? []
  if (words.length === 0) return false
  if (words.every((w) => PLACEHOLDER_WORDS.has(w))) return false
  return words.length >= 2 || words.some((w) => !PLACEHOLDER_WORDS.has(w))
}

/** The only extensions these archives use. Anything else after a dot is a name. */
const IMAGE_EXT = /\.(jpe?g|png|gif|webp|bmp)$/i

/** "Hinata y naruto (2).jpg" -> "hinata-y-naruto" */
function cleanName(filename) {
  let base = filename.replace(IMAGE_EXT, '')
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

/**
 * The real image format, from the file's magic bytes.
 *
 * One delivered entry has no extension at all (`Monkey_D.Luffy`), so the name
 * cannot be trusted to say what the bytes are. JPEG and PNG are the only two the
 * archives contain, and both are unambiguous from the first few bytes.
 */
function detectExtension(data) {
  if (data[0] === 0xff && data[1] === 0xd8) return 'jpg'
  if (data[0] === 0x89 && data[1] === 0x50) return 'png'
  if (data[0] === 0x47 && data[1] === 0x49) return 'gif'
  return 'bin'
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

function consider(kind, category, filename, data, { group = null } = {}) {
  const hash = createHash('sha256').update(data).digest('hex').slice(0, 16)

  if (seenHashes.has(hash)) {
    skipped.push({ kind, category, filename, reason: 'duplicate content', of: seenHashes.get(hash) })
    return
  }

  let slug = cleanName(filename)
  let label = null
  // The source filename, not the group-prefixed one. `BTS download (7).jpg` is
  // still an unusable name; the group only rescues the LABEL, not the check.
  const sourceName = group ? filename.slice(group.length + 1) : filename
  let named = meaningful(sourceName)

  if (!named || !slug || slug.replace(/-/g, '').length < 4) {
    // Numbered within the group, not the whole fandom: a global counter gave
    // "bts-item-09" and "straykids-item-11" from the same K-pop folder, which
    // reads as if eleven came before nine.
    const bucket = group ?? category
    const n =
      [...merchRows, ...charRows].filter(
        (r) => !r.named && `${r.category}:${r.group ?? ''}` === `${category}:${group ?? ''}`,
      ).length + 1
    slug = `${bucket.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-item-${String(n).padStart(2, '0')}`
    const who = group ?? (CATEGORY_NAMES[category] ?? category)
    label = `${who} Item ${String(n).padStart(2, '0')}`
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
  // Trust the CONTENT over the extension. One delivered file is
  // `Monkey_D.Luffy` with no extension at all, and defaulting that to.jpg would
  // leave a JPEG named.jpg only by luck; sniffing the magic byte is the same
  // approach placeCategoryArt.mjs takes to read dimensions.
  const ext = detectExtension(data)
  const rel = kind === 'merch'
    ? `/images/merchandise/${category}/${slug}.${ext}`
    : `/images/characters/${category}/${slug}.${ext}`

  const row = {
    kind, category, group, slug, name: label ?? titleCase(slug), rel, named,
    bytes: data.length, source: filename, data,
  }
  ;(kind === 'merch' ? merchRows : charRows).push(row)
}

// ---------------------------------------------------------------------- main

// Source folder name -> category slug. None of these match their slug, which is
// the whole reason this is a table and not a cast: "Tv shows" is `tv-shows`,
// "Kpop" is `k-pop`, and "Gaming" happens to be right for once.
const CHAR_FOLDERS = {
  Anime: 'anime',
  Comics: 'comics',
  cosplay: 'cosplay',
  Gaming: 'gaming',
  Kpop: 'k-pop',
  Manga: 'manga',
  'Tv shows': 'tv-shows',
}

const sources = [
  { zip: join(downloads, 'Merchandise.zip'), kind: 'merch' },
  { zip: join(downloads, 'cosplay pictures.zip'), kind: 'char', flatCategory: 'cosplay' },
  { zip: join(downloads, 'Characters.zip'), kind: 'char' },
]

for (const { zip, kind, flatCategory } of sources) {
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
      const category = MERCH_FOLDERS[parts[1]]
      if (!category) {
        skipped.push({ kind, category: parts[1], filename: name, reason: 'unrecognised folder' })
        continue
      }
      consider('merch', category, parts[parts.length - 1], data)
      continue
    }

    if (flatCategory) {
      consider('char', flatCategory, parts[parts.length - 1], data)
      continue
    }

    // Characters.zip is Characters/fandom element[/band element/]file element. The K-pop folder
    // nests one level deeper per band (BTS, Blackpink, Twice, Straykids), and for
    // those the band name is the only naming information in the path, a file
    // called `download (7).jpg` under `Kpop/BTS/` is a BTS character, and without
    // passing the band through it would land as a nameless `k-pop-item-07`.
    const category = CHAR_FOLDERS[parts[1]]
    if (!category) {
      skipped.push({ kind, category: parts[1], filename: name, reason: 'unrecognised folder' })
      continue
    }
    const file = parts[parts.length - 1]
    const group = parts.length > 3 ? parts[2] : null
    consider('char', category, group ? `${group} ${file}` : file, data, { group })
  }
}

// ------------------------------------------------------------------- report

console.log(`\nread ${merchRows.length} merchandise + ${charRows.length} character images`)

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

// The manifest is printed rather than written into src/: a JSON file in
// src/data would imply a data dependency the pages do not have.
console.log(`\nMANIFEST`)
for (const [key, list] of groups) {
  console.log(`  ${key}`)
  for (const r of list) console.log(`    ${r.rel}\t${r.name}`)
}

// ------------------------------------------------------------------ seed (opt-in)

/**
 * Emit character_profiles rows. Opt-in via --seed, because --apply alone places
 * images and nothing else; a build that silently wrote catalogue rows would be
 * a surprise to anyone re-running it to refresh artwork.
 *
 * Categories resolve by SLUG through a subselect rather than a literal
 * category_id. That key is a surrogate that differs between a fresh database and
 * the live one, they already disagree about the TV Shows slug, so a hardcoded
 * id is a latent bug and a subselect is not.
 *
 * Re-running is safe: every statement is INSERT. WHERE NOT EXISTS on slug.
 */
if (!seed) {
  console.log(`\nNo catalogue rows written (pass --seed to emit database/09_characters_seed.sql).`)
  process.exit(0)
}

const q = (s) => String(s).replace(/'/g, "''")
const SEED_FILE = '09_characters_seed.sql'
const lines = [
  '-- Character profiles from the supplied artwork.',
  '-- Generated by scripts/importSuppliedArt.mjs --apply --seed. Do not hand-edit.',
  '-- Safe to re-run: every row is INSERT ... WHERE NOT EXISTS on slug.',
  '',
]

for (const r of charRows) {
  lines.push(
    `INSERT INTO character_profiles (category_id, name, slug, image_path)\n` +
    `SELECT c.category_id, '${q(r.name)}', '${q(r.slug)}', '${q(r.rel)}'\n` +
    `FROM categories c\n` +
    `WHERE c.slug = '${q(r.category)}'\n` +
    `  AND NOT EXISTS (SELECT 1 FROM character_profiles p WHERE p.slug = '${q(r.slug)}');`,
    '',
  )
}

writeFileSync(join(root, 'database', SEED_FILE), lines.join('\n'))
console.log(`\nwrote database/${SEED_FILE} (${charRows.length} character rows)`)
console.log(`merchandise: not seeded. The shop page is still the "coming soon" preview.`)

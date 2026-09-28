// Reports the pixel dimensions of a JPEG and copies category artwork into
// place.
//
// The dimensions are read from the SOF marker rather than with an image library,
// because this project has none and adding one to answer "how big is this file"
// would be the wrong trade. JPEGs start with SOI (FFD8) and carry their real
// size in a start-of-frame segment, which is enough to walk to.
//
//   node scripts/placeCategoryArt.mjs            # report only
//   node scripts/placeCategoryArt.mjs --apply    # copy into public/images/categories

import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const downloads = join(process.env.USERPROFILE || '', 'Downloads')
const outDir = join(root, 'public', 'images', 'categories')

const apply = process.argv.includes('--apply')

// Source name in Downloads -> the filename the app asks for. The keys are
// category slugs where the two happen to differ, so the mapping is written down
// rather than guessed: "k-pop" is served as kpop.jpg, and Downloads calls the
// Korean artwork KoreanHero.jpeg.
const PLACEMENT = [
  { slug: 'movies', from: 'Movies.jpeg', to: 'movies.jpg' },
  { slug: 'anime', from: 'AnimeHero.jpeg', to: 'anime.jpg' },
  { slug: 'gaming', from: 'gamesHero.jpeg', to: 'gaming.jpg' },
  { slug: 'comics', from: 'Comic.jpeg', to: 'comics.jpg' },
  { slug: 'k-pop', from: 'KoreanHero.jpeg', to: 'kpop.jpg' },
  { slug: 'tv-shows', from: 'TvHero.jpeg', to: 'tv-shows.jpg' },
  { slug: 'cosplay', from: 'Cosplay.jpeg', to: 'cosplay.jpg' },
]

/** Width and height from the first SOF marker. Null if it is not a JPEG. */
function jpegSize(buf) {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null

  let i = 2
  while (i < buf.length - 9) {
    if (buf[i] !== 0xff) {
      i += 1
      continue
    }
    const marker = buf[i + 1]

    // SOF0-SOF15, skipping the two markers that are not frame headers.
    const isSof =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc

    const length = (buf[i + 2] << 8) | buf[i + 3]
    if (isSof) {
      return {
        height: (buf[i + 5] << 8) | buf[i + 6],
        width: (buf[i + 7] << 8) | buf[i + 8],
      }
    }
    i += 2 + length
  }
  return null
}

if (!existsSync(downloads)) {
  console.error(`  no Downloads folder at ${downloads}`)
  process.exit(1)
}

const missing = []
console.log('  source                     ->  destination          size        ratio')
for (const item of PLACEMENT) {
  const src = join(downloads, item.from)
  if (!existsSync(src)) {
    missing.push(item.from)
    console.log(`  ${item.from.padEnd(26)} ->  ${item.to.padEnd(20)} MISSING`)
    continue
  }

  const size = jpegSize(readFileSync(src))
  const dims = size ? `${size.width}x${size.height}` : 'not a JPEG'
  const ratio = size ? (size.width / size.height).toFixed(2) : '?'

  if (apply) {
    mkdirSync(outDir, { recursive: true })
    copyFileSync(src, join(outDir, item.to))
  }
  console.log(
    `  ${item.from.padEnd(26)} ->  ${item.to.padEnd(20)} ${dims.padEnd(11)} ${ratio}`,
  )
}

// logo.jpeg is not a category. Reported so it is visibly accounted for rather
// than silently left behind in Downloads.
const logo = join(downloads, 'logo.jpeg')
if (existsSync(logo)) {
  const size = jpegSize(readFileSync(logo))
  console.log(
    `\n  logo.jpeg  ${size ? `${size.width}x${size.height}` : 'unknown'}  — not a category, not copied`,
  )
}

if (missing.length) {
  console.error(`\n  ${missing.length} source file(s) not found: ${missing.join(', ')}`)
  process.exit(1)
}
console.log(apply ? '\n  copied' : '\n  run again with --apply to copy')

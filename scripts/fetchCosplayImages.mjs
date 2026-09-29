// fetchCosplayImages.mjs, gives every cosplay article and event a photograph.
//
// WHY IMAGES ARE DOWNLOADED RATHER THAN LINKED
//   The project rule is no remote images, and CosplayCard renders 100 of these.
//   Pointing at the Pexels CDN would mean 100 third-party requests on every page
//   that shows a grid, and every card would show a broken image on a flaky
//   connection. So each file is fetched once and stored under public/images.
//
//   Pexels requires visible credit, which CosplayCard already renders
//   ("Photo by {photographer} on Pexels"). The photographer's Pexels profile URL
//   travels with the entry.
//
// SEARCH STRATEGY
//   Titles are guide text, not queries. "Foam Armor 101: Tools and Materials"
//   returns nothing useful; "cosplay armor" returns something. So each title is
//   reduced to its two or three most distinctive words, and a cosplay term is
//   appended when the title has none. Results are filtered to landscape, because
//   a portrait photo in a 16:9 card is a crop of somebody's elbow.
//
// RATE LIMIT
//   Pexels allows 200 requests an hour. This makes 100. --resume skips ids
//   already in the manifest, so a second run costs nothing.
//
//   node scripts/fetchCosplayImages.mjs            # report only
//   node scripts/fetchCosplayImages.mjs --apply    # download
//   node scripts/fetchCosplayImages.mjs --apply --resume
//
// The API key is PEXELS_API_KEY in.env.local, not a VITE_ variable, because a
// VITE_ variable would be inlined into the client bundle and readable by anyone.

import { readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public', 'images', 'cosplay')
const manifestPath = join(root, 'src', 'data', 'cosplay-images.json')

const apply = process.argv.includes('--apply')
const resume = process.argv.includes('--resume')
// Search Pexels and write the manifest, but do not download anything. This
// exists because the free tier allows 200 requests an hour and a search pass
// with query fallbacks can use most of them: searching once and downloading
// separately means a re-run costs zero requests.
const saveSearches = process.argv.includes('--save-searches')

// ---------- env ----------

/**
 * Minimal.env reader. Node 20+ has --env-file, but this has to run as a plain
 * `node script.mjs` from the repo root, and pulling in dotenv for four lines
 * would be the wrong dependency.
 */
function readEnv(file) {
  if (!existsSync(file)) return {}
  const out = {}
  for (const raw of readFileSync(file, 'utf8').split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq < 1) continue
    out[line.slice(0, eq).trim()] = line.slice(eq + 1).trim()
  }
  return out
}

const env = { ...readEnv(join(root, '.env.local')), ...readEnv(join(root, '.env')), ...process.env }
const KEY = env.PEXELS_API_KEY

if (!KEY) {
  console.error('  PEXELS_API_KEY is not set. Add it to .env.local — see .env.example.')
  process.exit(1)
}

// ---------- source data ----------

// The two source files are TypeScript modules, not JSON, so they cannot be
// require()d here. They are plain object literals, so the array body is read
// out of the text and evaluated. Deliberately narrow: if the shape of these
// files ever changes, this should fail loudly rather than silently yield [].
function readDataModule(file) {
  const text = readFileSync(file, 'utf8')
  const start = text.indexOf('[')
  const end = text.lastIndexOf(']')
  if (start < 0 || end < start) {
    throw new Error(`${file}: no array literal found`)
  }
  return new Function(`return ${text.slice(start, end + 1)}`)()
}

const sourceDir = process.env.COSPLAY_SOURCE_DIR
  || join(process.env.TEMP || process.env.TMP || root, 'opencode', 'cosplay')

const articles = readDataModule(join(sourceDir, 'cosplayArticles.ts'))
const events = readDataModule(join(sourceDir, 'cosplayEvents.ts'))

const items = [
  ...articles.map((a) => ({ id: a.id, title: a.title, kind: 'article' })),
  ...events.map((e) => ({ id: e.id, title: e.title, kind: 'event' })),
]

// ---------- query building ----------

const STOP = new Set([
  'how', 'to', 'the', 'a', 'an', 'for', 'of', 'and', 'with', 'your', 'you', 'is', 'it',
  'in', 'on', 'at', 'my', 'that', 'this', 'get', 'make', 'best', 'tips', 'guide',
  '101', 'explained', 'basics', 'essentials', 'like', 'from', 'by', 'or', 'vs',
  'first', 'timer', 'timers', 'beginner', 'beginners', 'every', 'any', 'all',
  'into', 'over', 'out', 'up', 'down', 'about', 'after', 'before', 'more',
])

/**
 * Reduces a title to a search Pexels can answer.
 *
 * Hyphens are split rather than dropped: "First-Timers" became the single token
 * "firsttimers", which matched nothing, and once split the "timers" half still
 * stops out. Only the longest distinctive words are kept, because a long word
 * carries more meaning to a photo search than a short one.
 */
function distinctiveWords(title) {
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/-/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w))

  return words
    .slice()
    .sort((a, b) => b.length - a.length)
    .slice(0, 3)
    .sort((a, b) => words.indexOf(a) - words.indexOf(b))
}

/**
 * Query candidates for a title, widest first.
 *
 * The first is the full distinctive set. The fallbacks exist because Pexels is a
 * photo search, not a concept search: "cosplay convention" has plenty of results
 * but they get reused across the grid, so each card also gets narrower and
 * broader attempts and the first unused photo wins.
 */
function buildQueries(title) {
  const words = distinctiveWords(title)
  const hasCosplayWord = words.some((w) => w === 'cosplay' || w === 'costume')

  const out = []
  if (hasCosplayWord) out.push(words.join(' '))
  else out.push(['cosplay', ...words].join(' '))

  // Broader: one strong word plus the topic.
  if (words[0]) out.push(['cosplay', words[0]].join(' '))
  // Broader still: just the fandom, which always returns something.
  out.push('cosplay')

  return [...new Set(out.filter(Boolean))]
}

// ---------- Pexels ----------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Search with backoff on 429.
 *
 * Pexels advertises 25,000 requests an hour, the header confirms it, but it
 * also enforces a much tighter burst limit, and a tight loop trips it after a
 * couple of hundred calls. A 429 here is therefore a rate-of-fire problem, not
 * a quota problem, so the answer is to slow down and retry rather than to stop.
 * Giving up on the first 429 is what left this script 13 entries short.
 */
async function search(query, attempt = 0) {
  const url = new URL('https://api.pexels.com/v1/search')
  url.searchParams.set('query', query)
  url.searchParams.set('per_page', '6')
  // Portrait photos crop badly into a 16:9 card.
  url.searchParams.set('orientation', 'landscape')
  url.searchParams.set('size', 'medium')

  const res = await fetch(url, { headers: { Authorization: KEY } })

  if (res.status === 429) {
    if (attempt >= 5) {
      throw new Error(`search "${query}" -> HTTP 429 after ${attempt} retries`)
    }
    // 1s, 2s, 4s, 8s, 16s, plus jitter so a batch does not resynchronise.
    const wait = 1000 * 2 ** attempt + Math.floor(Math.random() * 500)
    await sleep(wait)
    return search(query, attempt + 1)
  }

  if (!res.ok) throw new Error(`search "${query}" -> HTTP ${res.status}`)
  return (await res.json()).photos ?? []
}

/**
 * Picks one photo.
 *
 * `used` is the set of Pexels photo ids already claimed by another card. Without
 * it, every generic query returns the same top result and a 100-card grid ends
 * up showing about fifteen photographs, which looks like a bug even though
 * every card is technically correct. An unused photo is worth far more than a
 * marginally better aspect ratio, so reuse is only allowed once the unused
 * options are exhausted.
 */
function choose(photos, used) {
  if (photos.length === 0) return null

  const score = (p) => {
    const w = p.width || 0
    const h = p.height || 0
    const ratio = h ? w / h : 0
    let s = 0
    // 16:9 is the card. Reward getting close without punishing 3:2.
    if (ratio >= 1.5) s += 2
    if (ratio >= 1.6 && ratio <= 1.9) s += 2
    if (p.photographer && p.photographer_url) s += 1
    if (p.alt) s += 1
    return s
  }

  const usable = photos.filter((p) => p.src?.medium || p.src?.large)
  const byPreference = (a, b) => score(b) - score(a)

  const unused = usable.filter((p) => !used.has(p.id))
  if (unused.length > 0) return unused.sort(byPreference)[0]

  // Nothing new for this query. Reuse is better than an empty card, but the
  // caller retries with a wider query first, so this is the last resort.
  return usable.sort(byPreference)[0] ?? null
}

async function download(url, dest) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`download -> HTTP ${res.status}`)
  const bytes = Buffer.from(await res.arrayBuffer())
  if (bytes.length < 2000) throw new Error(`suspiciously small (${bytes.length} bytes)`)
  writeFileSync(dest, bytes)
  return bytes.length
}

// ---------- run ----------

let manifest = {}
if (existsSync(manifestPath)) {
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  } catch {
    console.log('  existing manifest is unreadable, starting fresh')
  }
}
if (!resume) manifest = {}

const todo = items.filter((i) => !manifest[i.id])
console.log(
  `  ${items.length} items, ${items.length - todo.length} cached, ${todo.length} to fetch\n`,
)

if (apply) mkdirSync(outDir, { recursive: true })

let ok = 0
let failed = 0
const problems = []
// Seeded from the manifest so a --resume run does not re-pick photos that are
// already claimed.
const used = new Set(Object.values(manifest).map((e) => e.pexelsId).filter(Boolean))

for (const item of todo) {
  const queries = buildQueries(item.title)
  let photo = null
  let queryUsed = null
  let lastError = null

  // Widen the query until something unused turns up.
  for (const query of queries) {
    try {
      const photos = await search(query)
      const candidate = choose(photos, used)
      if (candidate) {
        photo = candidate
        queryUsed = query
        break
      }
      lastError = new Error(`no results for "${query}"`)
    } catch (err) {
      lastError = err
    }
    await sleep(150)
  }

  if (!photo) {
    failed += 1
    const msg = lastError?.message ?? 'no usable photo'
    problems.push(`${item.id}: ${msg}`)
    console.log(`  ${item.id.padEnd(4)} ${item.kind.padEnd(7)} ${'FAILED'}  ${msg}`)
    await sleep(250)
    continue
  }

  const reused = used.has(photo.id)
  const relPath = `/images/cosplay/${item.id}.jpg`

  try {
    if (apply) {
      await download(photo.src.medium || photo.src.large, join(outDir, `${item.id}.jpg`))
    }
  } catch (err) {
    failed += 1
    problems.push(`${item.id}: ${err.message}`)
    console.log(`  ${item.id.padEnd(4)} ${item.kind.padEnd(7)} ${'DL FAIL'}  ${err.message}`)
    continue
  }

  used.add(photo.id)
  manifest[item.id] = {
    // Local, not the CDN, see the header. The CDN URL is kept alongside as
    // `remoteUrl` so the download pass needs no second search.
    imageUrl: relPath,
    photographer: photo.photographer || 'Unknown',
    photographerUrl: photo.photographer_url || photo.url,
    pexelsUrl: photo.url,
    // Kept for provenance and so a re-fetch needs no new search.
    pexelsId: photo.id,
    query: queryUsed,
  }
  // Stashed outside the manifest write for the download pass, and dropped before
  // the file is written: shipping a CDN URL in the client bundle is exactly what
  // downloading the file is meant to avoid.
  manifest[item.id].remoteUrl = photo.src.medium || photo.src.large
  ok += 1

  // A reuse is worth flagging: it means every query for this title was
  // exhausted, which is a hint the query needs work.
  console.log(
    `  ${item.id.padEnd(4)} ${item.kind.padEnd(7)} ${String(queryUsed).padEnd(26)} ${photo.width}x${photo.height}  ${photo.photographer.slice(0, 20)}${reused ? '  [reused]' : ''}`,
  )

  await sleep(250)
}

console.log(`\n  ${ok} fetched, ${failed} failed, ${Object.keys(manifest).length} total in manifest`)
console.log(`  ${used.size} distinct photographs across ${Object.keys(manifest).length} cards`)

if (failed) {
  console.log('\n  problems:')
  problems.forEach((p) => console.log(`    ${p}`))
  console.log('\n  re-run with --apply --resume to retry only the missing ones')
}

if (apply || saveSearches) {
  mkdirSync(dirname(manifestPath), { recursive: true })

  // `remoteUrl` is a working field for the download pass, not something the
  // browser should ever see: it is a Pexels CDN URL, and shipping one is exactly
  // what downloading the file is meant to avoid. It is merged into a side table
  // outside the repo and stripped from the committed manifest.
  const scratch = join(process.env.TEMP || process.env.TMP || root, 'opencode')
  mkdirSync(scratch, { recursive: true })
  const urlFile = join(scratch, 'cosplay-remote-urls.json')

  // Merged, not overwritten: a later pass must not discard URLs an earlier pass
  // found for ids this pass did not touch.
  const remoteUrls = existsSync(urlFile) ? JSON.parse(readFileSync(urlFile, 'utf8')) : {}
  for (const [id, entry] of Object.entries(manifest)) {
    if (entry.remoteUrl) remoteUrls[id] = entry.remoteUrl
    delete entry.remoteUrl
  }

  // Sorted so the file has a stable diff instead of reshuffling every run.
  const sorted = Object.fromEntries(
    Object.keys(manifest)
      .sort()
      .map((k) => [k, manifest[k]]),
  )
  writeFileSync(manifestPath, `${JSON.stringify(sorted, null, 2)}\n`, 'utf8')
  console.log(`\n  wrote src/data/cosplay-images.json (${Object.keys(sorted).length} entries)`)
  console.log(`  ${Object.keys(remoteUrls).length} download URLs cached outside the repo`)
}

if (apply) {
  // The download pass is separate from the search pass so a re-run costs no
  // Pexels requests. URLs come from the side table written above, not from the
  // committed manifest, which carries no CDN links.
  const scratch = join(process.env.TEMP || process.env.TMP || root, 'opencode')
  const urlFile = join(scratch, 'cosplay-remote-urls.json')
  const remoteUrls = existsSync(urlFile) ? JSON.parse(readFileSync(urlFile, 'utf8')) : {}

  let have = 0
  let got = 0
  let noUrl = 0
  for (const [id, entry] of Object.entries(manifest)) {
    // imageUrl is "/images/cosplay/ca1.jpg", a public-root path, so only the
    // leading slash comes off. Stripping "/images/" as well put the files in
    // public/ instead of public/images/.
    const dest = join(root, 'public', entry.imageUrl.replace(/^\//, ''))
    if (existsSync(dest)) {
      have += 1
      continue
    }
    const url = remoteUrls[id]
    if (!url) {
      noUrl += 1
      continue
    }
    try {
      mkdirSync(dirname(dest), { recursive: true })
      await download(url, dest)
      got += 1
    } catch (err) {
      console.log(`  download failed for ${id}: ${err.message}`)
    }
    await sleep(120)
  }
  const total = Object.keys(manifest).length
  console.log(`  ${have} already on disk, ${got} downloaded, ${total} total`)
  if (noUrl) console.log(`  ${noUrl} had no stored URL - re-run without --resume to search for them`)
} else if (!saveSearches) {
  console.log('\n  run again with --save-searches, then --apply --resume')
}

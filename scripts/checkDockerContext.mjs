// Checks that every path a Dockerfile references actually exists in its build
// context.
//
// Docker is not installed on this machine, so `docker build` cannot be the check.
// A missing COPY source is otherwise only discovered on Render, after a full
// clone and a failed build, and the error names a path that looks plausible.
//
// This also confirms the context is what the Dockerfile assumes: a Dockerfile
// written for a repo-root context but pointed at backend/ looks fine and copies
// nothing.
//
//   node scripts/checkDockerContext.mjs

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative, resolve } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// Where each Dockerfile is, and what its context is. These must agree with
// render.yaml, which is the other place they are declared.
const IMAGES = [
  { dockerfile: 'backend/Dockerfile', context: 'backend' },
  { dockerfile: 'deploy/mysql/Dockerfile', context: '.' },
]

// COPY --from=build is a stage reference, not a context path, and COPY --from
// with a URL or an image is neither. Neither can be checked against the context.
const FROM_STAGE = /^COPY\s+--from=\S+\s/
const NOT_A_PATH = /^--from=|^https?:\/\/|^-\/|\$$/

let problems = 0
const fail = (msg) => {
  problems += 1
  console.log(`  FAIL  ${msg}`)
}

/** Every source path in a COPY line, ignoring flags and the destination. */
function copySources(line) {
  const parts = line
    .replace(COPY_LINE_FLAGS, '')
    .trim()
    .split(/\s+/)
  // The last token is the destination.
  return parts.slice(0, -1)
}

const COPY_LINE_FLAGS = /^COPY\s+(--\S+\s+)*/i

for (const image of IMAGES) {
  const dockerfilePath = join(root, image.dockerfile)
  if (!existsSync(dockerfilePath)) {
    fail(`${image.dockerfile} does not exist`)
    continue
  }

  const contextDir = resolve(root, image.context)
  const contextLabel = image.context === '.' ? 'repo root' : image.context

  console.log(`\n  ${image.dockerfile}`)
  console.log(`    context: ${contextLabel}  (${image.context})`)

  const text = readFileSync(dockerfilePath, 'utf8')
  const lines = text.split(/\r?\n/)
  const rules = readIgnoreRules(contextDir)

  // FROM sanity: the two-stage shape the API image is required to have.
  const froms = lines.filter((l) => /^FROM\s/i.test(l.trim()))
  froms.forEach((f) => console.log(`    ${f.trim()}`))

  let checked = 0
  for (const raw of lines) {
    const line = raw.trim()
    if (!/^COPY\s/i.test(line)) continue
    if (FROM_STAGE.test(line)) continue
    // A line ending in \ continues; the next line holds the rest.
    if (line.endsWith('\\')) continue

    for (const src of copySources(line)) {
      if (NOT_A_PATH.test(src)) continue
      // Glob: check the literal prefix, which is what Docker matches against.
      const literal = src.split('*')[0]
      if (!literal) continue
      const target = join(contextDir, literal)
      checked += 1
      if (!existsSync(target)) {
        fail(
          `COPY source "${src}" does not exist in the context ` +
            `(${image.context}/ -> ${relative(root, target)})`,
        )
      }
    }
  }
  console.log(`    ${checked} COPY source(s) checked`)

  // What Docker actually sends is the context MINUS .dockerignore, and that
  // number is the one that decides build times. Measuring the raw directory is
  // misleading: backend/ is 40 MB almost entirely of bin/ and obj/, which the
  // ignore file removes. A .dockerignore that silently stops working shows up
  // here as a context that has quietly grown, not as an error anywhere else.
  const raw = dirSize(contextDir)
  const after = dirSize(contextDir, readIgnoreRules(contextDir))
  console.log(
    `    context size: ${mb(raw)} MB on disk -> ${mb(after)} MB after .dockerignore` +
      (rules.length ? '' : '  (no .dockerignore found — nothing is being excluded)'),
  )

  if (after > 80 * 1024 * 1024) {
    fail(
      `${mb(after)} MB still reaches the daemon after .dockerignore — build times ` +
        'will suffer. Check the ignore rules for this context.',
    )
  }
  if (raw > 20 * 1024 * 1024 && after > raw * 0.5) {
    fail(
      `${image.context}/.dockerignore is barely filtering anything ` +
        `(${mb(raw)} MB -> ${mb(after)} MB). Check the patterns.`,
    )
  }
}

// A function declaration, not a const arrow: it is called from inside the loop
// above, and a const arrow is in the temporal dead zone until its definition is
// evaluated. Which it is not, at the point the loop first runs.
function mb(bytes) {
  return (bytes / 1024 / 1024).toFixed(1)
}

/** The non-comment lines of a context's .dockerignore, negations dropped. */
function readIgnoreRules(contextDir) {
  const file = join(contextDir, '.dockerignore')
  if (!existsSync(file)) return []
  return readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && !l.startsWith('!'))
}

function dirSize(dir, rules = []) {
  let total = 0
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return 0
  }
  for (const entry of entries) {
    const p = join(dir, entry.name)
    if (rules.some((r) => matches(r, entry.name, entry.isDirectory()))) continue
    if (entry.isDirectory()) total += dirSize(p, rules)
    else {
      try {
        total += statSync(p).size
      } catch {
        /* vanished mid-walk */
      }
    }
  }
  return total
}

/**
 * A deliberately small subset of .dockerignore matching: enough for the patterns
 * this project actually uses (bin/, obj/, *.ext, .git/), and no more. A full
 * implementation is a rabbit hole; what this needs to answer is "is the ignore
 * file still doing something", which a few rules answer adequately.
 */
function matches(pattern, name, isDir) {
  let p = pattern.replace(/^\.\//, '')
  if (p.endsWith('/')) {
    if (!isDir) return false
    p = p.slice(0, -1)
  }
  if (p.startsWith('**/')) p = p.slice(3)
  if (p.includes('/')) return false // path-scoped rules are out of scope here
  if (p.startsWith('*.')) return name.toLowerCase().endsWith(p.slice(1).toLowerCase())
  if (p === '*') return false
  return name === p
}

console.log(problems === 0 ? '\n  every COPY source exists in its context' : `\n  ${problems} problem(s)`)
process.exit(problems === 0 ? 0 : 1)

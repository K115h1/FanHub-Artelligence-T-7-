// Confirms the committed tsconfig.app.json parses and that the removed keys are
// genuinely gone — as config keys, not as words inside a comment.
//
// This exists because a plain `Select-String baseUrl` reported the key as
// "still present" when the only match was a comment explaining why it was
// removed. Grepping a file for a word it mentions in prose is not evidence
// about its contents.
//
//   node scripts/checkTsconfig.mjs

import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

/** The file as git has it, which is what Render checks out. */
function fromGit(path) {
  return execFileSync('git', ['cat-file', '-p', `HEAD:${path}`], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
  })
}

/**
 * Strips JSONC comments that are not inside a string literal.
 *
 * Both forms, because this project's tsconfig uses both: `//` on the option I
 * removed, and `/* ... *\/` on the section headings the Vite scaffold generates
 * ("Bundler mode", "Linting"). A stripper that handles only one of them leaves
 * the file unparseable and reports it as invalid JSON, which is a misleading
 * diagnosis for a file that TypeScript reads perfectly well.
 */
function stripJsonComments(text) {
  let out = ''
  let inString = false
  let escaped = false
  let inBlock = false

  for (let i = 0; i < text.length; i += 1) {
    const c = text[i]
    const next = text[i + 1]

    if (inBlock) {
      if (c === '*' && next === '/') {
        inBlock = false
        i += 1
      } else if (c === '\n') {
        out += '\n'
      }
      continue
    }

    if (escaped) {
      out += c
      escaped = false
      continue
    }
    if (c === '\\' && inString) {
      out += c
      escaped = true
      continue
    }
    if (c === '"') {
      inString = !inString
      out += c
      continue
    }

    if (!inString && c === '/' && next === '/') {
      while (i < text.length && text[i] !== '\n') i += 1
      out += '\n'
      continue
    }
    if (!inString && c === '/' && next === '*') {
      inBlock = true
      i += 1
      continue
    }

    out += c
  }
  return out
}

const raw = fromGit('tsconfig.app.json')

let parsed
try {
  parsed = JSON.parse(stripJsonComments(raw))
} catch (err) {
  console.log(`  FAIL  tsconfig.app.json is not valid JSONC: ${err.message}`)
  process.exit(1)
}

const keys = Object.keys(parsed.compilerOptions ?? {})
console.log('  compilerOptions keys:')
for (const k of keys) console.log(`    ${k}`)

const problems = []

// baseUrl is removed in TypeScript 7. ignoreDeprecations only silences a
// deprecation, so it cannot rescue an option that no longer exists.
for (const gone of ['baseUrl', 'ignoreDeprecations']) {
  if (keys.includes(gone)) {
    problems.push(`${gone} is present — it was removed in TypeScript 7 and fails a clean build`)
  }
}

console.log('')
console.log(`  baseUrl removed            : ${!keys.includes('baseUrl')}`)
console.log(`  ignoreDeprecations removed : ${!keys.includes('ignoreDeprecations')}`)

if (problems.length) {
  console.log(`\n  ${problems.length} problem(s):`)
  problems.forEach((p) => console.log(`    - ${p}`))
  process.exit(1)
}
console.log("\n  tsconfig.app.json is valid and free of the removed options")

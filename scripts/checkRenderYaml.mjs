// Checks render.yaml for the mistakes that actually happen when writing one by
// hand, since the first deploy is the only time you find them.
//
//   node scripts/checkRenderYaml.mjs
//
// Deliberately not a full YAML parse: the project has no yaml dependency, and
// pulling one in to lint a 60-line file is the wrong trade. This catches the
// three things that bite, tab indentation, a health check that is not an HTTP
// path, and a service missing a key Render requires.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const text = readFileSync(join(root, 'render.yaml'), 'utf8')
const lines = text.split(/\r?\n/)

const problems = []
const fail = (msg) => problems.push(msg)

// --- formatting ---
lines.forEach((line, i) => {
  // YAML forbids tabs for indentation, and the error message is famously unhelpful.
  if (/^\t/.test(line)) fail(`L${i + 1}: tab indentation — YAML forbids it, use spaces`)
})

// --- shape ---
if (!/^services:/m.test(text)) fail('no top-level `services:` key')
if (/^databases:/m.test(text)) {
  fail('a `databases:` block is present — Render has no first-party MySQL, so it would create nothing')
}

const serviceStarts = lines.filter((l) => /^\s+- type:/.test(l))
if (serviceStarts.length === 0) fail('no services defined')

// --- per-service required keys ---
// Split on the "- type:" boundaries and check each block.
const blocks = []
let current = null
lines.forEach((line) => {
  if (/^\s+- type:/.test(line)) {
    current = [line]
    blocks.push(current)
  } else if (current) {
    current.push(line)
  }
})

for (const block of blocks) {
  const name = block.find((l) => /^\s+name:/.test(l))?.trim().replace('name:', '').trim()
  const label = name || 'unnamed service'

  for (const key of ['type', 'name', 'runtime', 'dockerfilePath', 'dockerContext']) {
    const pattern = key === 'type' ? /^\s+- type:/ : new RegExp(`^\\s+${key}:`)
    if (!block.some((l) => pattern.test(l))) fail(`${label}: missing \`${key}\``)
  }

  // A Docker service with no disk and no port is fine; a disk needs a mountPath.
  if (block.some((l) => /^\s+disk:/.test(l))) {
    if (!block.some((l) => /mountPath:/.test(l))) {
      fail(`${label}: has a disk but no mountPath — Render will reject it`)
    }
  }

  // healthCheckPath is an HTTP GET. A shell command there never passes, and
  // MySQL speaks no HTTP at all so it should simply be absent.
  const hc = block.find((l) => /healthCheckPath:/.test(l))
  if (hc) {
    const value = hc.trim().replace('healthCheckPath:', '').trim()
    if (!value.startsWith('/')) {
      fail(`${label}: healthCheckPath "${value}" is not an HTTP path`)
    }
  }

  if (block.some((l) => /plan: free/.test(l)) && block.some((l) => /^\s+disk:/.test(l))) {
    fail(`${label}: a disk on the free plan — Render does not provide disks on free`)
  }
}

// --- secrets ---
// A committed password is the one failure that cannot be undone by a redeploy.
for (const line of lines) {
  const m = /^(\s*(?:value|password|secret|key)):\s*(\S+)$/i.exec(line.trim())
  if (!m) continue
  const [, field, value] = m
  // Generated values and references are fine; a literal is not.
  if (/^(true|false|null|\$\{)/i.test(value)) continue
  if (/^(generateValue|fromService|sync)$/.test(value)) continue
  if (/^["']?https?:/.test(value)) continue
  if (/^\d+$/.test(value)) continue
  // Anything assigned to a key/password/secret field that is not a URL, a
  // boolean, a number or a reference.
  if (/KEY|SECRET|PASSWORD|PRIVATE/i.test(field) && !/envVarKey|generateValue/.test(line)) {
    fail(`possible committed secret: ${line.trim()}`)
  }
}

console.log(`  services: ${blocks.length}`)
for (const block of blocks) {
  // A trailing `# comment` is not part of the value, so strip it before printing.
  const value = (key) =>
    block
      .find((l) => new RegExp(`^\\s+${key}:`).test(l))
      ?.trim()
      .replace(`${key}:`, '')
      .split('#')[0]
      .trim()
  console.log(`    ${value('name')}  (${value('plan') ?? 'default plan'})`)
}

if (problems.length) {
  console.log(`\n  ${problems.length} problem(s):`)
  problems.forEach((p) => console.log(`    - ${p}`))
} else {
  console.log('\n  render.yaml looks deployable')
}
process.exit(problems.length ? 1 : 0)

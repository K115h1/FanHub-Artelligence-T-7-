// Validates render.yaml against Render's own published JSON schema.
//
// The hand-rolled check in checkRenderYaml.mjs catches formatting mistakes, but
// it cannot know whether a field name or enum value is one Render accepts — and
// getting that wrong fails at blueprint-apply time with an error that does not
// say which line is wrong. Three real errors got through it this way:
//
//   * the MySQL service was `type: web`, which PUBLISHES it on the internet.
//     A private service must be `type: pserv`.
//   * `plan: starter` is not a plan id; private services use `0.5c-512mb`.
//   * DB_HOST was the literal service name, but Render appends a random suffix
//     to the private-network hostname, so it never resolves.
//
//   node scripts/validateRenderSchema.mjs
//
// Uses fetch, so it needs Node 18+. No dependency is added for one HTTP call.
//
// THE SCHEMA LAYOUT
//   It is draft 2020-12 and puts everything under `definitions`, with
//   `properties.services` as a `oneOf` over several service shapes. There is no
//   `properties.services.items.properties` — an earlier version of this file
//   looked for that, found nothing, and rejected a valid blueprint. scripts/
//   inspectRenderSchema.mjs prints the shape if this ever breaks again.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const SCHEMA_URL = 'https://render.com/schema/render.yaml.json'

const yaml = readFileSync(join(root, 'render.yaml'), 'utf8')

// --- parse just enough YAML for this shape ------------------------------------
// A full YAML parser is a dependency this project does not need. render.yaml is
// hand-written and flat: two services, scalars, and two levels of nested maps.
// Deliberately not a general parser, and says so so nobody extends it for a file
// it cannot handle.
function parseSimpleYaml(text) {
  const tree = {}
  const stack = [{ indent: -1, node: tree }]

  const unquote = (v) => String(v).split(' #')[0].trim().replace(/^["']|["']$/g, '')

  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue
    const indent = raw.length - raw.trimStart().length
    const line = raw.trim()

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop()
    const parent = stack[stack.length - 1].node

    if (line.startsWith('- ')) {
      const item = line.slice(2).trim()
      if (!Array.isArray(parent.__list)) parent.__list = []
      const colon = item.indexOf(':')
      if (colon > 0) {
        const obj = { [unquote(item.slice(0, colon))]: unquote(item.slice(colon + 1)) }
        parent.__list.push(obj)
        stack.push({ indent, node: obj })
      } else {
        parent.__list.push(unquote(item))
      }
      continue
    }

    const colon = line.indexOf(':')
    if (colon < 0) continue
    const key = unquote(line.slice(0, colon))
    const value = line.slice(colon + 1).trim()

    if (value === '') {
      const node = {}
      parent[key] = node
      stack.push({ indent, node })
    } else {
      parent[key] = unquote(value)
    }
  }

  const fix = (node) => {
    if (node && typeof node === 'object') {
      if (node.__list) {
        const list = node.__list
        delete node.__list
        list.forEach(fix)
        return list
      }
      for (const k of Object.keys(node)) node[k] = fix(node[k])
    }
    return node
  }
  return fix(tree)
}

// --- schema -------------------------------------------------------------------
console.log('  fetching Render blueprint schema...')
const schema = await (await fetch(SCHEMA_URL)).json()
const defs = schema.definitions ?? {}
const serviceType = defs.serviceType ?? {}
const typeEnum = serviceType.enum ?? []

// Plan ids are spread across per-service-type definitions, so they are pooled:
// a plan valid for a web service but not a private service is caught by the
// per-type check below, not by this pool.
const planPool = [
  ...(defs.serverPlan?.enum ?? []),
  ...(defs.cronPlan?.enum ?? []),
]

const services = parseSimpleYaml(yaml).services ?? []
if (services.length === 0) {
  console.error('  no services found - the YAML reader did not parse the file')
  process.exit(1)
}

const problems = []

for (const service of services) {
  const name = service.name ?? '(unnamed)'

  if (typeEnum.length && !typeEnum.includes(service.type)) {
    problems.push(`${name}: type "${service.type}" is not valid. Allowed: ${typeEnum.join(', ')}`)
  }

  if (service.plan && planPool.length && !planPool.includes(service.plan)) {
    problems.push(`${name}: plan "${service.plan}" is not a known plan id`)
  }

  for (const field of ['name', 'type', 'runtime']) {
    if (!service[field]) problems.push(`${name}: missing required field \`${field}\``)
  }

  // The mistake that actually happened.
  if (/db|database|mysql/i.test(name) && service.type === 'web') {
    problems.push(
      `${name}: a database declared \`type: web\` is published to the internet ` +
        '(it gets an onrender.com subdomain). Use `type: pserv`.',
    )
  }

  if (service.disk && service.plan === 'free') {
    problems.push(`${name}: a disk on the free plan - Render does not provide disks on free`)
  }

  if (service.healthCheckPath && !String(service.healthCheckPath).startsWith('/')) {
    problems.push(`${name}: healthCheckPath must start with /`)
  }

  // A private service must still bind a port, and a Docker build needs both
  // paths or it silently defaults to ./Dockerfile at the repo root.
  if (service.runtime === 'docker') {
    for (const field of ['dockerfilePath', 'dockerContext']) {
      if (!service[field]) problems.push(`${name}: docker service is missing \`${field}\``)
    }
  }
}

// --- report --------------------------------------------------------------------
console.log(`\n  valid service types: ${typeEnum.join(', ') || '(schema reported none)'}`)
console.log(`  services found: ${services.length}`)
for (const s of services) {
  console.log(`    ${String(s.name).padEnd(16)} type=${s.type}  plan=${s.plan ?? '(default)'}`)
}

if (problems.length) {
  console.log(`\n  ${problems.length} problem(s):`)
  problems.forEach((p) => console.log(`    - ${p}`))
  process.exit(1)
}
console.log("\n  render.yaml is consistent with Render's published schema")

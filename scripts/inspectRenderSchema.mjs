// Prints the top-level shape of Render's published blueprint schema.
//
// Written after guessing at the JSON layout produced a validator that rejected a
// valid file: properties.services.items.properties was empty, so every field
// read as ABSENT and every enum as empty.
//
//   node scripts/inspectRenderSchema.mjs

const SCHEMA_URL = 'https://render.com/schema/render.yaml.json'
const s = await (await fetch(SCHEMA_URL)).json()

const show = (label, node) => {
  if (!node) {
    console.log(`  ${label}: absent`)
    return
  }
  if (Array.isArray(node)) {
    console.log(`  ${label}: array(${node.length})`)
    return
  }
  if (typeof node !== 'object') {
    console.log(`  ${label}: ${node}`)
    return
  }
  console.log(`  ${label}: { ${Object.keys(node).join(', ')} }`)
}

console.log('  top level:')
show('$schema', s['$schema'])
show('title', s.title)
show('type', s.type)
show('properties', s.properties)
show('$defs', s['$defs'])
show('definitions', s.definitions)

console.log('\n  services node:')
const services = s.properties?.services
show('services', services)
if (services) {
  show('  .type', services.type)
  show('  .items', services.items)
  const items = services.items
  if (items?.oneOf) console.log(`  .items.oneOf: ${items.oneOf.length} variants`)
  if (items?.$ref) console.log(`  .items.$ref: ${items.$ref}`)
  if (items?.anyOf) console.log(`  .items.anyOf: ${items.anyOf.length} variants`)
  if (items?.properties) show('  .items.properties', items.properties)
}

console.log('\n  if $defs/definitions exist, the first few:')
for (const bag of ['$defs', 'definitions']) {
  const defs = s[bag]
  if (!defs) continue
  const keys = Object.keys(defs)
  console.log(`  ${bag}: ${keys.length} entries -> ${keys.slice(0, 15).join(', ')}`)
  for (const k of keys.slice(0, 15)) {
    const d = defs[k]
    if (d?.properties?.type?.enum) {
      console.log(`    ${k}.type enum: ${d.properties.type.enum.join(', ')}`)
    }
  }
}

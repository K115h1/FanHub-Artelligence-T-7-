// mergeSynopses.mjs, folds a batch file into data/synopses.json.
//
// Usage: node scripts/mergeSynopses.mjs data/synopses.batchN.json
//
// Refuses to overwrite an existing key, so a re-run cannot silently discard
// reviewed text. Then validates shape: both fields present, shortSynopsis within
// the short_synopsis column width, and a key that matches no catalogue title.

import { readFileSync, writeFileSync, existsSync } from "node:fs";

const CATALOG = "src/data/catalog.json";
const MAIN = "data/synopses.json";
const SHORT_MAX = 300;

const batchPath = process.argv[2];
if (!batchPath || !existsSync(batchPath)) {
  console.error("usage: node scripts/mergeSynopses.mjs <batch.json>");
  process.exit(1);
}

const catalog = JSON.parse(readFileSync(CATALOG, "utf8"));
const catalogKeys = new Set(catalog.map((r) => `${r.fandom}|${r.slug}`));

const main = existsSync(MAIN) ? JSON.parse(readFileSync(MAIN, "utf8")) : {};
const batch = JSON.parse(readFileSync(batchPath, "utf8"));

const problems = [];

for (const [key, value] of Object.entries(batch)) {
  if (main[key]) problems.push(`duplicate key, would overwrite: ${key}`);
  if (!catalogKeys.has(key)) problems.push(`no such title in catalogue: ${key}`);

  // Only these two keys are valid. A near-miss like "ynopsis" or "symopsis"
  // is a typo that would otherwise be silently ignored, leaving a synopsis
  // looking absent rather than wrong.
  for (const field of Object.keys(value)) {
    if (field !== "synopsis" && field !== "shortSynopsis")
      problems.push(`unknown field "${field}": ${key}`);
  }

  if (!value.synopsis || !String(value.synopsis).trim()) problems.push(`empty synopsis: ${key}`);
  if (!value.shortSynopsis || !String(value.shortSynopsis).trim()) problems.push(`empty shortSynopsis: ${key}`);
  else if (String(value.shortSynopsis).length > SHORT_MAX)
    problems.push(`shortSynopsis ${String(value.shortSynopsis).length} chars (max ${SHORT_MAX}): ${key}`);

  // Cheap text hygiene: catches the class of typo that survives JSON parsing.
  for (const field of ["synopsis", "shortSynopsis"]) {
    const text = String(value[field] ?? "");
    if (/\s[,.]/.test(text)) problems.push(`space before punctuation in ${field}: ${key}`);
    if (/\b(\w) \1\b/.test(text)) problems.push(`repeated word in ${field}: ${key}`);
  }
}

if (problems.length) {
  console.error(`${problems.length} problem(s), nothing written:`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

const merged = { ...main, ...batch };
writeFileSync(MAIN, JSON.stringify(merged, null, 2) + "\n");
console.log(`added ${Object.keys(batch).length}, total ${Object.keys(merged).length}`);

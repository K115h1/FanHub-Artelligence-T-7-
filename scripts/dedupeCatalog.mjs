// dedupeCatalog.mjs, merges same-fandom near-duplicate titles.
//
// The importer turns a source list entry like "Bleach (Supernatural)" into its
// own row instead of merging the qualifier into the base title's genres, so one
// work ends up with two slugs and two cards.
//
// THE RULE: two rows are the same work when, in the same fandom, one title is
// the other plus a trailing genre name. "Bleach" / "Bleach Supernatural" merge.
// Nothing else does.
//
// That last clause is the whole point. Slug-based matching looked reasonable and
// is wrong, because plenty of real titles end in a word that is also a genre:
// God of War, JoJo's Bizarre Adventure, Digimon Adventure, The Fog of War,
// Aria the Animation, The Vault of Horror. Stripping "-war" off god-of-war
// invents a duplicate. So the comparison is on titles, and the extra word has
// to be an actual genre.
//
// This also keeps real sequels and separate works apart, because none of their
// trailing words is a genre: Dragon Ball Z, Overlord IV, Steins;Gate 0,
// Hellsing Ultimate, Macross Frontier, Clannad After Story, and the four
// "Season 2" rows.
//
// Cross-fandom overlap is never touched: Akira under movies and under anime are
// two different works.
//
// Dry run by default. Pass --write to apply.
//
// Usage:
//   node scripts/dedupeCatalog.mjs
//   node scripts/dedupeCatalog.mjs --write

import { readFileSync, writeFileSync } from "node:fs";

const CATALOG = "src/data/catalog.json";
const write = process.argv.includes("--write");

const catalog = JSON.parse(readFileSync(CATALOG, "utf8"));

const genreNames = new Set();
for (const row of catalog) for (const g of row.genres) genreNames.add(normalise(g));

/** A title with every non-alphanumeric character reduced to a single space. */
function normalise(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

const groups = new Map();
for (const a of catalog) {
  const na = normalise(a.title);
  for (const b of catalog) {
    if (a === b || a.fandom !== b.fandom) continue;
    const nb = normalise(b.title);
    if (!nb.startsWith(na + " ")) continue;
    // The remainder must itself be a genre name, and nothing else.
    const rest = nb.slice(na.length).trim();
    if (!genreNames.has(rest)) continue;
    const key = `${a.fandom}${na}`;
    if (!groups.has(key)) groups.set(key, { base: a, extras: [] });
    // Keep the extra row's own genre values, not the lowercased title
    // remainder, so merging cannot add "slice of life" beside "Slice of Life".
    groups.get(key).extras.push({ row: b, genre: rest });
  }
}

const plans = [...groups.values()].filter((g) => g.extras.length);
plans.sort(
  (x, y) =>
    x.base.fandom.localeCompare(y.base.fandom) || x.base.title.localeCompare(y.base.title),
);

console.log(`duplicate groups: ${plans.length}`);
console.log(`rows to remove:   ${plans.reduce((n, p) => n + p.extras.length, 0)}`);
console.log("");

for (const p of plans) {
  const merged = [...new Set([...p.base.genres, ...p.extras.flatMap((e) => e.row.genres)])];
  console.log(`${p.base.fandom}`);
  console.log(`  keep  ${p.base.slug.padEnd(38)} "${p.base.title}"`);
  for (const e of p.extras) console.log(`  drop  ${e.row.slug.padEnd(38)} "${e.row.title}"  (+${e.genre})`);
  console.log(`  genres  ${p.base.genres.join(", ") || "-"}  ->  ${merged.join(", ")}`);
  console.log("");
}

if (!plans.length) {
  console.log("nothing to do");
  process.exit(0);
}
if (!write) {
  console.log("dry run. re-run with --write to apply.");
  process.exit(0);
}

for (const p of plans) {
  p.base.genres = [...new Set([...p.base.genres, ...p.extras.flatMap((e) => e.row.genres)])];
}

const dropKeys = new Set(
  plans.flatMap((p) => p.extras.map((e) => `${e.row.fandom}|${e.row.slug}`)),
);
const kept = catalog.filter((r) => !dropKeys.has(`${r.fandom}|${r.slug}`));

writeFileSync(CATALOG, JSON.stringify(kept, null, 1));
console.log(`catalog: ${catalog.length} -> ${kept.length} rows`);

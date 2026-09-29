import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { scanComments, commentText } from './lib/commentScan.mjs';

const EXT = new Set(['.ts', '.tsx', '.mjs', '.cs', '.sql', '.md', '.html', '.css']);
const ROOTS = ['src', 'backend/src', 'scripts', 'database', 'docs'];

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === 'bin' || e.name === 'obj' || e.name === 'dist') continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (EXT.has(extname(e.name))) out.push(p);
  }
  return out;
}

const apply = process.argv.includes('--apply');
const files = ROOTS.flatMap((r) => walk(r));

const CHARS = {
  'em dash': /\u2014/g,
  'en dash': /\u2013/g,
  'less-than': /</g,
  'greater-than': />/g,
  'pipe': /\|/g,
};

let grand = 0;
const byFile = [];

for (const file of files) {
  const raw = readFileSync(file, 'utf8');
  const text = commentText(raw);
  const counts = {};
  for (const [name, re] of Object.entries(CHARS)) {
    const n = (text.match(re) ?? []).length;
    if (n > 0) counts[name] = n;
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total > 0) {
    byFile.push({ file, counts, total });
    grand += total;
  }
}

byFile.sort((a, b) => b.total - a.total);

console.log(`files with comments needing work: ${byFile.length} of ${files.length}`);
console.log(`total offending characters in comments: ${grand}\n`);

const totals = {};
for (const { counts } of byFile) {
  for (const [k, v] of Object.entries(counts)) totals[k] = (totals[k] ?? 0) + v;
}
console.log('by character:', totals, '\n');

console.log('top 20 files:');
for (const { file, total } of byFile.slice(0, 20)) {
  console.log(`  ${String(total).padStart(4)}  ${file}`);
}

if (apply) {
  console.log('\n--apply passed but this script is analysis only.');
}

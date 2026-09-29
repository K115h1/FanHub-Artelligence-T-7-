import { readdirSync, readFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { scanComments } from './lib/commentScan.mjs';

const EXT = new Set(['.ts', '.tsx', '.mjs', '.cs', '.sql', '.md', '.html', '.css']);
const ROOTS = ['src', 'backend/src', 'scripts', 'database', 'docs'];

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (['node_modules', 'bin', 'obj', 'dist'].includes(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (EXT.has(extname(e.name))) out.push(p);
  }
  return out;
}

const which = process.argv[2] ?? 'angles';
const re = which === 'angles' ? /[<>]/ : which === 'pipes' ? /\|/ : /\u2014|\u2013/;

let shown = 0;
const limit = Number(process.argv[3] ?? 40);
const seen = new Set();

for (const file of ROOTS.flatMap((r) => walk(r))) {
  const raw = readFileSync(file, 'utf8');
  for (const span of scanComments(raw)) {
    const body = raw.slice(span.start, span.end);
    if (!re.test(body)) continue;
    const lineNo = raw.slice(0, span.start).split('\n').length;
    const flat = body.replace(/\s+/g, ' ').trim().slice(0, 150);
    if (seen.has(flat)) continue;
    seen.add(flat);
    console.log(`${file}:${lineNo}  ${flat}`);
    shown++;
    if (shown >= limit) process.exit(0);
  }
}

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { scanComments } from './lib/commentScan.mjs';

const EXT = new Set(['.ts', '.tsx', '.mjs', '.cs', '.sql', '.md', '.html', '.css']);
const ROOTS = ['src', 'backend/src', 'scripts', 'database', 'docs'];
const APPLY = process.argv.includes('--apply');

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

// ---- helpers -------------------------------------------------------------

const XML_DOC = /^<\/?(param|typeparam|paramref|returns?|summary|remarks|value|exception|see|seealso|inheritdoc|c)(\s|\/|>)/i;

function capitalise(word) {
  return word.length ? word[0].toUpperCase() + word.slice(1) : word;
}

// Replaces an em or en dash. A dash before a capitalised word starts a new
// sentence, otherwise it is a comma break inside the current one.
function fixDash(line) {
  return line.replace(/[\u2014\u2013]\s*/g, (match, offset, whole) => {
    const after = whole.slice(offset + match.length);
    const nextChar = after.trimStart()[0] ?? '';
    const startsSentence = /[A-Z0-9]/.test(nextChar) || after.trimStart().startsWith('`');
    if (startsSentence) {
      const before = whole.slice(0, offset).replace(/\s+$/, '');
      const lead = whole.slice(0, offset).match(/\s*$/)[0];
      const sep = /[.!?)]$/.test(before) ? ' ' : '. ';
      return lead + sep;
    }
    const before = whole.slice(0, offset).replace(/\s+$/, '');
    const lead = whole.slice(0, offset).match(/\s*$/)[0];
    if (/[.!?)]$/.test(before)) return lead + ' ';
    return lead + ', ';
  });
}

const ELEMENT_WORDS = {
  img: 'img element',
  html: 'html element',
  body: 'body',
  main: 'main element',
  ul: 'ul element',
  li: 'li element',
  dl: 'dl element',
  dd: 'dd element',
  dt: 'dt element',
  article: 'article element',
  section: 'section element',
  nav: 'nav element',
  form: 'form element',
  select: 'select element',
  input: 'input element',
  button: 'button element',
  g: 'g element',
  svg: 'svg element',
  portal: 'portal',
};

function fixAngles(line) {
  let out = line;

  out = out.replace(/<-+\s*>?/g, 'to ');

  const quoted = [];
  out = out.replace(/"[^"\n]*"|`[^`\n]*`|'[^'\n]*'/g, (m) => {
    quoted.push(m);
    return `\u0000${quoted.length - 1}\u0000`;
  });

  out = out.replace(/<\/?([a-z][\w-]*)(\s+[^<>]*?)?\s*\/?>/g, (m, name, attrs) => {
    if (XML_DOC.test(m)) return m;
    const word = ELEMENT_WORDS[name.toLowerCase()] ?? `${name} element`;
    if (attrs) return `${word} (${attrs.trim()})`;
    return word;
  });

  out = out.replace(/<([A-Z][\w]*)>/g, (m, name) => (name === 'T' ? 'T' : `${name} component`));
  out = out.replace(/<SubmissionStatus, _>/g, 'a submission status and a cancellation token');

  out = out.replace(/\u0000(\d+)\u0000/g, (_, n) => quoted[Number(n)]);
  return out;
}

function fixPipes(line) {
  return line
    .replace(/\s*\|\s*/g, ', ')
    .replace(/,\s*,/g, ',')
    .replace(/\(\s*,/g, '(')
    .replace(/,\s*\)/g, ')');
}

function tidy(line) {
  return line
    .replace(/([.,!?])\s*\.\s+/g, '$1 ')
    .replace(/,\s*([.;:])/g, '$1')
    .replace(/\.\s+,/g, '.')
    .replace(/[ \t]+([.,;:)])/g, '$1');
}

// ---- run -----------------------------------------------------------------

const files = ROOTS.flatMap((r) => walk(r));
let touched = 0;
const changes = [];

for (const file of files) {
  const original = readFileSync(file, 'utf8');
  const spans = scanComments(original, { sql: extname(file) === '.sql' });
  if (spans.length === 0) continue;

  let result = '';
  let cursor = 0;
  let fileChanged = false;

  for (const span of spans) {
    result += original.slice(cursor, span.start);
    const body = original.slice(span.start, span.end);
    const isSql = extname(file) === '.sql';
    let next = body
      .split('\n')
      .map((l) => (isSql ? tidy(fixDash(l)) : tidy(fixPipes(fixAngles(fixDash(l))))))
      .join('\n');
    if (next !== body) fileChanged = true;
    result += next;
    cursor = span.end;
  }
  result += original.slice(cursor);

  if (fileChanged) {
    touched++;
    changes.push(file);
    if (APPLY) writeFileSync(file, result, 'utf8');
  }
}

console.log(APPLY ? 'APPLIED' : 'DRY RUN (pass --apply to write)');
console.log(`files changed: ${touched}`);
for (const f of changes) console.log(`  ${f}`);

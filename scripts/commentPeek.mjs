import { readFileSync } from 'node:fs';
import { scanComments } from './lib/commentScan.mjs';

const files = process.argv.slice(2);

for (const file of files) {
  const original = readFileSync(file, 'utf8');
  const spans = scanComments(original);
  let cursor = 0;
  let result = '';
  for (const span of spans) {
    result += original.slice(cursor, span.start);
    result += original.slice(span.start, span.end);
    cursor = span.end;
  }
  result += original.slice(cursor);
  console.log(`\n================ ${file} ================`);
  console.log(result.split('\n').slice(0, Number(process.env.LINES ?? 40)).join('\n'));
}

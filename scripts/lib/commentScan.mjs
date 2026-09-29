// Comment scanner. Locates every comment span in a source file without being
// fooled by strings, template literals, regex literals or JSX.
//
// Not a full parser. It tracks the lexical states that can hide a "//" or "/*"
// from us: single/double quoted strings, backtick templates (with ${} nesting),
// and regex literals. JSX text is the hard case and is approximated, which is
// safe here because the transform only ever rewrites inside comment spans.
export function scanComments(text, opts = {}) {
  const spans = [];
  const sqlMode = Boolean(opts.sql);
  let i = 0;
  let prevMeaningful = '';

  // Stack of template-literal brace depths, so a "//" inside ${. } is a
  // comment but a "//" inside the literal text of the template is not.
  const templateStack = [];

  const isIdentChar = (c) => /[A-Za-z0-9_$]/.test(c);

  while (i < text.length) {
    const c = text[i];
    const next = text[i + 1];

    // SQL line comment. Only for.sql, since "--" is a decrement elsewhere.
    if (sqlMode && c === '-' && next === '-') {
      const start = i;
      while (i < text.length && text[i] !== '\n') i++;
      spans.push({ start, end: i, kind: 'line' });
      continue;
    }

    // Line comment
    if (c === '/' && next === '/') {
      const start = i;
      while (i < text.length && text[i] !== '\n') i++;
      spans.push({ start, end: i, kind: 'line' });
      continue;
    }

    // Block comment
    if (c === '/' && next === '*') {
      const start = i;
      i += 2;
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++;
      i = Math.min(i + 2, text.length);
      spans.push({ start, end: i, kind: 'block' });
      continue;
    }

    // Template literal
    if (c === '`') {
      i++;
      while (i < text.length) {
        if (text[i] === '\\') { i += 2; continue; }
        if (text[i] === '`') { i++; break; }
        if (text[i] === '$' && text[i + 1] === '{') {
          // Recurse into the expression by simply continuing: the expression is
          // ordinary code and will be walked, and any comment inside it is
          // genuinely a comment.
          i += 2;
          let depth = 1;
          while (i < text.length && depth > 0) {
            if (text[i] === '{') depth++;
            else if (text[i] === '}') depth--;
            else if (text[i] === '"' || text[i] === "'" || text[i] === '`') {
              const q = text[i];
              i++;
              while (i < text.length && text[i] !== q) {
                if (text[i] === '\\') i++;
                i++;
              }
            }
            i++;
          }
          continue;
        }
        i++;
      }
      prevMeaningful = '`';
      continue;
    }

    // Quoted string
    if (c === '"' || c === "'") {
      const q = c;
      i++;
      while (i < text.length && text[i] !== q) {
        if (text[i] === '\\') i++;
        i++;
      }
      i++;
      prevMeaningful = '"';
      continue;
    }

    // Regex literal: only where a value is expected, so we do not mistake
    // division for a regex.
    if (c === '/' && !isIdentChar(prevMeaningful) && prevMeaningful !== ')') {
      let j = i + 1;
      let inClass = false;
      let ok = false;
      while (j < text.length) {
        if (text[j] === '\\') { j += 2; continue; }
        if (text[j] === '[') inClass = true;
        else if (text[j] === ']') inClass = false;
        else if (text[j] === '/' && !inClass) { ok = true; break; }
        else if (text[j] === '\n') break;
        j++;
      }
      if (ok) {
        i = j + 1;
        while (i < text.length && /[a-z]/.test(text[i])) i++;
        prevMeaningful = '/';
        continue;
      }
    }

    if (!/\s/.test(c)) prevMeaningful = c;
    i++;
  }

  return spans;
}

export function commentText(text) {
  return scanComments(text)
    .map((s) => text.slice(s.start, s.end))
    .join('\n');
}

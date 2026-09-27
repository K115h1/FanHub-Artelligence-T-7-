// buildTvshowsCatalog.mjs — generates data/tvshows_by_genre.json.
//
// The other five fandoms were transcribed by hand into data/*_by_genre.json.
// Television was not, but the scraper that produced the tvshows posters left a
// results.csv behind that is already exactly that shape: one row per title, a
// genre column, and a status column saying whether a poster was found. Rather
// than re-type 468 titles, this reads the CSV and emits the same JSON the other
// fandoms use, so the rest of the pipeline cannot tell television apart from
// any other fandom.
//
// Only status=downloaded rows are emitted. The no_match rows have no poster and,
// more importantly, include entries that are not television titles at all
// ("Jujutsu Kaisen", "Spy x Family") or are mangled scraper artefacts ("From").
//
// Usage:
//   node scripts/buildTvshowsCatalog.mjs <resultsCsv> [outJson]

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

/**
 * Minimal RFC 4180 CSV reader.
 *
 * Splitting on commas is not safe here: titles legitimately contain commas
 * ("Life (BBC)" aside, "Don't Look Up" and similar do appear) and the genre
 * column contains a slash rather than a delimiter, so a naive split would
 * either truncate a title or invent a column. This handles quotes and
 * doubled-quote escapes, which is all these files use.
 */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      // Swallow the \n of a \r\n pair rather than emitting an empty row.
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const [, , csvPath = "data/provenance/tvshows_results.csv", outPath = "data/tvshows_by_genre.json"] =
  process.argv;

const text = readFileSync(csvPath, "utf8").replace(/^﻿/, "");
const rows = parseCsv(text);
const header = rows.shift().map((h) => h.trim());
const col = (name) => {
  const i = header.indexOf(name);
  if (i === -1) throw new Error(`results.csv has no "${name}" column`);
  return i;
};

const C_TITLE = col("title");
const C_GENRE = col("genres");
const C_STATUS = col("status");

const byGenre = new Map();
const skipped = [];
let total = 0;

for (const row of rows) {
  if (row.length === 1 && row[0].trim() === "") continue; // trailing blank line
  total++;

  const title = (row[C_TITLE] ?? "").trim();
  const genre = (row[C_GENRE] ?? "").trim();
  const status = (row[C_STATUS] ?? "").trim();

  if (status !== "downloaded") {
    skipped.push(`${title}  (${status})`);
    continue;
  }
  if (!title || !genre) {
    skipped.push(`${title || "<blank>"}  (missing title or genre)`);
    continue;
  }

  if (!byGenre.has(genre)) byGenre.set(genre, []);
  byGenre.get(genre).push(title);
}

// Genre order follows the file, so regenerating is stable and the diff of a
// re-run is empty.
const out = {};
for (const [genre, titles] of byGenre) out[genre] = titles;

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n", "utf8");

const emitted = [...byGenre.values()].reduce((n, t) => n + t.length, 0);
console.log(`Wrote ${outPath}`);
console.log(`  ${Object.keys(out).length} genres, ${emitted} titles (from ${total} CSV rows)`);
console.log(`  skipped ${skipped.length}:`);
for (const s of skipped) console.log(`     - ${s}`);
